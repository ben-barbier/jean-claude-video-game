## Why

La mécanique « Théorie des jeux » (panneau Stratégie, tournois, et sa ressource dédiée le **Yomi**)
est sous-exploitée dans le chapitre 1 : c'est une boucle isolée, branchée tard (phase Expansion),
qui n'alimente rien d'autre que son unique upgrade (`theorieEsprit`) et que le joueur peut ignorer
sans conséquence pour atteindre l'AGI. Elle ajoute une ressource de plus à comprendre pour un
gain de gameplay nul. On la retire **complètement** pour resserrer l'Acte 1 sur ses boucles fortes
(LOC → Confiance → Ops/Créativité, bourse, refacto, Super Agents).

## What Changes

- **BREAKING (sauvegardes)** : suppression de la ressource **Yomi** de l'état `G` (`g.yomi`,
  `g.mult.yomiGain`, `g.autoTournoi`, `g.seen.tournois`, `g.tournoisUnlocked`). Les anciennes
  sauvegardes contenant ces champs se chargent toujours (la fusion défensive de `SAVE` les ignore),
  mais ces champs disparaissent de l'état et ne sont plus persistés.
- Suppression des **trois projets de R&D** de théorie des jeux : `modelisation`
  (« Modélisation stratégique », porte d'entrée des tournois), `theorieEsprit` (« Théorie de
  l'esprit », ×2 gain de Yomi) et `autoTournoi` (« Auto-tournoi », Yomi passif). Le compteur passe
  de 40 à 37 projets.
- Suppression de la mécanique moteur : phase `tickYomi` de la boucle, action `jouerTournoi`,
  constantes `K.YOMI_PASSIF`, `K.TOURNOI_COUT_OPS`, `K.TOURNOI_GAIN`, et la prise en charge du
  champ `yomi` dans les coûts (`couvre`, `debiter`, `coutProjet`, libellé de coût).
- Suppression de l'UI : panneau `#bloc-strategie` (titre « Stratégie — Théorie des jeux », compteur
  Yomi, bouton « Jouer un tournoi »), `renderStrategie()`, et l'affichage du Yomi dans le panneau Projets.
- Mise à jour des **outils de diagnostic et tests** qui pilotent ou mesurent le Yomi
  (`balance.js`, `cadence.js`, `smoke.test.js`, `progression.test.js`) pour qu'ils ne le référencent plus.
- Préservation garantie : aucun trou de rythme (`node test/cadence.js` ≥ 2 min sans trou), pas de
  soft-lock, l'AGI reste atteignable, et l'invariant `confianceTotale = confianceLibre + gpu + mem`
  est inchangé (le Yomi n'en faisait jamais partie).
- Mise à jour de la spec de référence `docs/specifications.md` pour retirer Yomi/tournois/théorie
  des jeux du tableau des ressources, du graphe de déblocage, des cibles de rythme et de l'esquisse
  d'Acte 2.

## Capabilities

### New Capabilities
- `retrait-theorie-des-jeux`: contrat de l'absence totale de la théorie des jeux dans le chapitre 1 —
  garantit qu'aucune ressource Yomi, aucun panneau Stratégie, aucun tournoi ni projet de R&D associé
  n'existe plus, tout en préservant la progression de l'Acte 1 (pas de trou de rythme, pas de
  soft-lock, AGI atteignable) et la tolérance des anciennes sauvegardes.

### Modified Capabilities
<!-- Aucune capability existante ne couvre la théorie des jeux : retrait pur, aucune spec à modifier. -->

## Impact

- `game/state.js` : retrait de `yomi`, `mult.yomiGain`, `autoTournoi`, `seen.tournois`,
  `tournoisUnlocked` de `nouvelEtat()`. La fusion `SAVE` reste tolérante aux anciens champs.
- `game/data.js` : retrait des 3 projets (`modelisation`, `theorieEsprit`, `autoTournoi`) de
  `PROJETS`, de leurs entrées d'`ORDRE` et d'impacts, et des constantes `K.YOMI_PASSIF`,
  `K.TOURNOI_COUT_OPS`, `K.TOURNOI_GAIN`.
- `game/engine.js` : retrait de `tickYomi` (et de son appel dans `tick()` — l'ORDRE des phases
  restantes et donc des `Math.random()` est préservé), de `jouerTournoi` (et de son export), et
  du champ `yomi` dans `couvre`, `debiter`, `coutProjet`. **Aucun accès DOM** (couche testable préservée).
- `game/ui.js` : retrait de `renderStrategie()` (et de son appel), du champ `['yomi','Yomi']` dans
  le libellé de coût, et de l'affichage `proj-yomi`.
- `index.html` : retrait du `<fieldset id="bloc-strategie">` et de l'affichage Yomi du panneau
  Projets ; bumper `var version` (cache-busting GitHub Pages, des `game/*.js` changent).
- `test/progression.test.js`, `test/smoke.test.js`, `test/balance.js`, `test/cadence.js` : retrait
  des références à `yomi`, `jouerTournoi`, `tournoisUnlocked`, `theorieEsprit` et du jalon `tournois`.
- `docs/specifications.md` : retrait des mentions Yomi / tournois / théorie des jeux.
- Vérifications : `bun test` au vert ; `node test/cadence.js` sans trou ≥ 2 min après retrait.
