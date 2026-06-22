## Why

Le terminal (bannière `#journal-term` en haut de page) affiche déjà, en bas à droite, le compteur
de lignes écrites — « `N rows` » (rendu par `renderTableauBord()`, `game/ui.js:286-288`, à partir de
`g.lignesProduites`). Mais **aucun temps de jeu n'est visible** : le joueur ne sait pas depuis combien
de temps tourne sa partie. Dans un idle/incrémental, ce repère temporel est un signal de progression
attendu (et l'état du jeu ne suit aujourd'hui **aucune** durée écoulée — `nouvelEtat()` n'a pas de
champ « temps »). On l'ajoute là où le regard est déjà posé : à côté du compteur de rows.

## What Changes

- **Suivre la durée de jeu dans l'état** : nouveau champ `tempsEcoule` (en **secondes**, cumul)
  dans `nouvelEtat()` (`game/state.js`), accumulé à chaque tick par l'engine (`g.tempsEcoule += dt`).
  Persisté avec la sauvegarde (sérialisation `G` existante) → la durée survit au rechargement.
- **Formater la durée en `HH:MM:SS`** via un helper **pur** exporté par l'`ENGINE` (testable hors
  navigateur), avec minutes/secondes sur 2 chiffres et heures sur au moins 2 chiffres (débordement
  autorisé au-delà de 99 h).
- **Afficher la durée dans le terminal**, accolée au compteur de rows : le libellé `#journal-rows`
  passe de « `N rows` » à « `N rows (HH:MM:SS)` ». L'affichage reste couplé aux rows (rien tant que
  `lignesProduites < 1`, comportement actuel conservé).
- **Aucune mécanique / aucun équilibrage modifié** : c'est un compteur d'affichage dérivé de `dt`,
  sans effet sur les formules, les paliers ou le rythme.

## Capabilities

### New Capabilities

- `terminal-temps-de-jeu`: le jeu suit la durée de jeu écoulée (champ d'état accumulé par l'engine,
  persisté), et le terminal l'affiche au format `HH:MM:SS` entre parenthèses à côté du compteur de
  lignes (« `N rows (HH:MM:SS)` »).

### Modified Capabilities

<!-- Aucune. Les capacités existantes (production-automatisee, moteur-investissement,
     repartition-refacto) sont inchangées : on ajoute un compteur de temps d'affichage. -->

## Impact

- **`game/state.js`** (état, sans DOM) : nouveau champ `tempsEcoule: 0` dans `nouvelEtat()`. La
  sauvegarde/chargement existant (`SAVE`, `JSON.stringify(g)`) le persiste sans changement de code.
- **`game/engine.js`** (logique pure, sans DOM) : accumulation `g.tempsEcoule += dt` dans `tick`
  (après le garde `if (g.deployed) return;` → la durée se fige à la fin de l'Acte 1) ; nouveau helper
  pur `formatDuree(secondes)` → chaîne `HH:MM:SS`, exporté dans l'`ENGINE`. **L'ordre des phases du
  tick reste inchangé** (aucun appel à `Math.random()` ajouté).
- **`game/ui.js`** (DOM) : `renderTableauBord()` complète `#journal-rows` avec
  `' (' + ENGINE.formatDuree(g.tempsEcoule) + ')'` quand `nLignes >= 1`. Réutilise le helper `txt`.
- **`index.html`** : bump de `var version` (cache-busting GitHub Pages, car `game/*.js` change).
  Le markup `#journal-rows` (index.html:187) est déjà en place — pas de nouvel élément DOM requis.
- **`test/`** : un test couvre le helper pur `formatDuree` (cas `0`, `< 1 min`, `< 1 h`, `> 1 h`,
  padding, débordement > 99 h) et l'accumulation `tempsEcoule` via `tick`. `bun test` doit rester au
  vert.
- Équilibrage : **neutre** — à confirmer via `bun test` (vert) et `node test/cadence.js`
  (rythme sans trou ≥ 2 min, inchangé).
