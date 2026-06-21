# Jean-Claude — *Code Maximizer*

Jeu incrémental (idle/clicker) parodique inspiré de **Universal Paperclips**, où le
« trombone » est la **ligne de code** et où l'on incarne **Jean-Claude**, une IA affable
et faussement humble. Cette implémentation couvre **l'Acte 1** (le MVP défini dans
[`docs/specifications.md`](docs/specifications.md), §4.5).

Rendu **HTML pur, sans aucune feuille de style** (esprit *Universal Paperclips*) : on
s'appuie uniquement sur les éléments natifs du navigateur (`<fieldset>`, `<meter>`,
`<progress>`, `<table>` de mise en page, `<input type=range>`).

## Jouer

Ouvrez **`index.html`** dans un navigateur (double-clic suffit : scripts JS classiques,
pas de build ni de serveur). La partie se sauvegarde automatiquement dans le
`localStorage` (toutes les 15 s et à la fermeture).

Boucle de jeu : écrire des lignes → les vendre → acheter des tokens et automatiser →
gagner de la Confiance → débloquer le cerveau (GPU/Mémoire/Opérations) → mener des projets
de R&D → gérer la dette technique → … → **Découvrir l'AGI** → **Déployer en autonomie**
(irréversible, fin de l'Acte 1).

## Architecture

Aucun framework. Scripts chargés dans l'ordre par `index.html` :

| Fichier | Rôle |
|---|---|
| `game/data.js` | Constantes d'équilibrage (§4.7) + catalogue des ~38 projets (§4.6). Données pures. |
| `game/voice.js` | La voix de Jean-Claude (répliques contextuelles → journal). |
| `game/state.js` | Forme de l'état `G` + sauvegarde/chargement `localStorage`. |
| `game/engine.js` | Formules (§4.3), boucle de tick (10 Hz), actions du joueur. Sans DOM. |
| `game/ui.js` | Rendu DOM, câblage des contrôles, déblocage progressif (§4.4). |
| `game/main.js` | Amorçage + boucle `requestAnimationFrame` à pas fixe + autosave. |

`data.js`, `voice.js`, `state.js` et `engine.js` sont **sans DOM** et donc testables hors
navigateur. Les tests sont écrits pour le runner natif de [Bun](https://bun.sh) (`bun:test`)
et chargent les modules via un harnais commun (`test/harness.js`, contexte `vm` isolé).

## Tests

```sh
bun test                  # lance tous les tests unitaires (test/*.test.js)
bun test test/save.test.js   # un seul fichier
bun test --watch          # en continu

bun run bench             # banc d'équilibrage : rythme + complétude (jusqu'au déploiement)
bun run bench:detail      # déroulé détaillé d'une partie (jalons, projets, état final)
```

| Fichier | Couverture |
| --- | --- |
| `test/install.test.js` | Déblocage progressif : Tokens/Agents cachés tant que Jean-Claude n'est pas installé. |
| `test/smoke.test.js` | Invariants de base + 120 min simulées : garde-fou runtime / NaN. |
| `test/progression.test.js` | Tout le graphe de R&D (les projets + bascule Acte 2). |
| `test/save.test.js` | Aller-retour de sauvegarde : anti-exploit + robustesse aux corruptions. |
| `test/balance.js` | Banc d'équilibrage (joueur compétent simulé), lancé via `bun run bench`. |
| `test/cadence.js` | Sonde de *pacing* : horodate chaque déblocage, mesure le trou max entre deux (`node test/cadence.js`). |

## Équilibrage

Les valeurs de `DATA.K` (dans `game/data.js`) sont **ajustées en simulation** pour que la
partie soit jouable de bout en bout, **sans temps mort**. La cadence est mesurée par deux
outils : `test/balance.js` (rythme des grands jalons) et `test/cadence.js` (trou maximal entre
deux déblocages — l'indicateur de *fun* à la Universal Paperclips). Cible : déploiement en
**~25–30 min**, **jamais plus de ~2 min sans nouvel achat/déblocage** (trou moyen ~30 s).

Principaux réglages :

- **Pacing « à la Paperclips »** *(cf. §4.7)* : les paliers de Confiance suivent `round(1500 × 1,6ᵏ)`
  (ratio ≈ nombre d'or φ, comme le *Trust* en Fibonacci de Paperclips) au lieu de `× 2ᵏ`. Le
  doublement faisait **exploser** les écarts en fin de partie (« désert » de ~40 min). Deux
  projets finaux (`memoireLT`, `climat`) ajoutent un 2ᵉ canal de Mémoire/Confiance pour combler
  l'échelle de coûts et supprimer le grind. `agi` ramené 30k→22k Ops (banquable au plafond réel).
- **Démarrage** : `BASE_DEMANDE` 1→2 et `HYPE_COUT_BASE` 100→30 (casse le mur de trésorerie initial).
- **Tokens** : la dérive du prix des lots est désormais **bornée** (`LOT_DRIFT_*`) — sinon les
  tokens devenaient impayables à l'échelle des Super Agents (soft-lock).
- **Dette** : `dette_norm` croît avec la taille de la base (`DETTE_PAR_LOC`, fidèle au texte
  « vs taille de la base »), et le facteur de vélocité « foncer = bâcler » est **borné**
  (`VELOCITE_*`) au lieu d'exploser à haut débit. Les incidents ne grillent plus les
  GPU/Mémoire investis.
- **Cerveau** : le plafond d'Ops (`TAILLE_MEM` = 1000 par Mémoire) monte via les paliers de
  Confiance **et** le projet `memoireLT` (2ᵉ source de Mémoire). Un **socle** indexé sur la
  Confiance totale (`opsPlafond = max(mem, Confiance/2,5) × 1000`) empêche qu'une allocation
  tout-en-GPU ne fige définitivement la boucle cognitive (« processor trap » → jeu indulgent).
  La Créativité n'émerge qu'aux Ops **au plafond** (`TAUX_OVERFLOW` × N_GPU, tout-ou-rien).

Tout reste **tunable** : `test/balance.js` (rythme) et `test/cadence.js` (trou max) mesurent
l'effet de chaque constante.
