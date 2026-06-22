## 1. État : champ de durée

- [x] 1.1 Ajouter `tempsEcoule: 0` dans `nouvelEtat()` (`game/state.js`), avec un commentaire
  (durée de jeu écoulée en secondes, cumul, persisté).
- [x] 1.2 Vérifier que la fusion défensive de `SAVE.charger` (`game/state.js`, part de
  `nouvelEtat()`) conserve bien le défaut `0` pour les vieilles sauvegardes sans le champ — aucun
  fallback supplémentaire ne doit être nécessaire.

## 2. Engine : accumulation + helper de formatage (couche pure)

- [x] 2.1 Dans `ENGINE.tick` (`game/engine.js`), ajouter `g.tempsEcoule += dt;` **après** le garde
  `if (g.deployed) return;` et **sans** réordonner les phases ni ajouter d'appel à `Math.random()`.
- [x] 2.2 Implémenter le helper pur `formatDuree(secondes)` → `"HH:MM:SS"` : `h = floor(s/3600)`,
  `m = floor((s%3600)/60)`, `sec = floor(s%60)` ; `m`/`sec` sur 2 chiffres ; `h` sur au moins 2
  chiffres mais **non borné** (pas de troncature au-delà de 99 h).
- [x] 2.3 Exposer `formatDuree` sur l'objet `ENGINE` (et dans `module.exports`) pour qu'il soit
  appelable depuis l'UI et les tests.

## 3. UI : affichage dans le terminal

- [x] 3.1 Dans `renderTableauBord()` (`game/ui.js:286-288`), étendre la branche `nLignes >= 1` du
  libellé `#journal-rows` pour suffixer `" (" + ENGINE.formatDuree(g.tempsEcoule) + ")"`, en
  conservant le pluriel « row/rows » et la branche vide pour `nLignes < 1`.
- [x] 3.2 Confirmer qu'aucun nouvel élément DOM n'est requis (`#journal-rows` existe déjà,
  `index.html:187`).

## 4. Cache-busting

- [x] 4.1 Bumper `var version` dans `index.html` (un `game/*.js` change → cache GitHub Pages).

## 5. Tests & vérification

- [x] 5.1 Ajouter un test du helper pur `formatDuree` : cas `0` → `00:00:00`, `5` → `00:00:05`,
  `754` → `00:12:34`, `3661` → `01:01:01`, `360000` → `100:00:00`, `90.9` → `00:01:30`.
- [x] 5.2 Ajouter un test de l'accumulation : après `ENGINE.tick(g, dt)` répété, `g.tempsEcoule`
  vaut la somme des `dt` ; et après passage de `g.deployed` à vrai, `g.tempsEcoule` n'augmente plus.
- [x] 5.3 `bun test` au vert.
- [x] 5.4 `node test/cadence.js` : rythme inchangé (trou max ≥ 2 min préservé) — équilibrage neutre.
- [x] 5.5 Vérification manuelle : ouvrir `index.html`, produire ≥ 1 ligne, constater
  « `N rows (HH:MM:SS)` » qui s'incrémente dans le terminal ; recharger et vérifier la persistance.
