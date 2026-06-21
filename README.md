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

## Équilibrage

Les valeurs de `DATA.K` (dans `game/data.js`) partent des constantes de référence du §4.7,
**ajustées en simulation** (`test/balance.js`) pour que la partie soit jouable de bout en
bout : une partie complète mène au déploiement en ~70 min (cible spec 45-90 min), sans
soft-lock. Principaux réglages par rapport aux valeurs brutes du §4.7 :

- **Démarrage** : `BASE_DEMANDE` 1→2 et `HYPE_COUT_BASE` 100→30 (casse le mur de trésorerie initial).
- **Tokens** : la dérive du prix des lots est désormais **bornée** (`LOT_DRIFT_*`) — sinon les
  tokens devenaient impayables à l'échelle des Super Agents (soft-lock).
- **Dette** : `dette_norm` croît avec la taille de la base (`DETTE_PAR_LOC`, fidèle au texte
  « vs taille de la base »), et le facteur de vélocité « foncer = bâcler » est **borné**
  (`VELOCITE_*`) au lieu d'exploser à haut débit. Les incidents ne grillent plus les
  GPU/Mémoire investis.
- **Cerveau** : `TAILLE_MEM` 1000→2000 (rend les gros projets atteignables) et un filet passif
  de Créativité (`CREA_PASSIVE`) en plus du bonus d'overflow, pour débloquer les projets gated
  par la Créa.

Tout reste **tunable** : `test/balance.js` mesure l'effet de chaque constante.
