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
navigateur.

## Tests

```sh
node test/smoke.js        # 120 min de jeu simulé : garde-fou runtime / NaN / déblocages
node test/progression.js  # parcourt tout le graphe de R&D : les 38 projets + bascule Acte 2
```

## Équilibrage

Les valeurs de `DATA.K` (dans `game/data.js`) reprennent les constantes de référence du
§4.7 et sont **toutes ajustables en playtest** — c'est le levier principal pour régler le
rythme. Voir les notes de la spec et les jalons affichés par `test/smoke.js`.
