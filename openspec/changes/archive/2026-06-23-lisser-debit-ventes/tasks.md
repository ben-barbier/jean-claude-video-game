## 1. Constante d'équilibrage et état

- [x] 1.1 Ajouter `DEBIT_TAU: 4` dans `DATA.K` (`game/data.js`), avec commentaire : constante de temps (s) du lissage des débits affichés (Ventes, Production automatisée).
- [x] 1.2 ~~Mettre à jour le commentaire de `K.EXP_SMOOTH`~~ → **Correctif** : `EXP_SMOOTH` n'était plus utilisé nulle part (`tickPrixLot` utilise `LOT_REVERSION`, pas `EXP_SMOOTH`). Conformément au design (« le laisser s'il sert ailleurs, sinon le supprimer »), constante **supprimée** de `DATA.K`.
- [x] 1.3 ~~Ajouter `ventesDebitAcc`/`prodDebitAcc` dans `nouvelEtat()`~~ → **Non nécessaire** : l'implémentation finale (EMA pas-aware, cf. 2.x) lisse directement `g.ventesParS`/`g.prodAutoParS`, sans champ d'accumulateur. Avantage : **aucune migration de save**. `state.js` inchangé.

## 2. Moteur — lissage à constante de temps fixe (game/engine.js, sans DOM)

> **Décision d'implémentation** : on garde `lissageEMA` mais avec un facteur **dépendant du pas** `α = 1 − e^(−dt/τ)` (helper `facteurDebit(dt)`), au lieu d'un accumulateur à fuite. Mêmes propriétés anti-sursaut (pic ≈ 1/τ par ligne isolée) **et sans biais** : converge exactement vers le débit réel (l'accumulateur introduisait un biais +dt/2τ ≈ +1,25 %). Bonus : pas de champ d'état (cf. 1.3).

- [x] 2.1 Dans `tickProduction` : `g.prodAutoParS = lissageEMA(g.prodAutoParS, dt>0 ? prodTotal/dt : 0, facteurDebit(dt));`
- [x] 2.2 Dans `tickVente` : `g.ventesParS = lissageEMA(g.ventesParS, dt>0 ? ventes/dt : 0, facteurDebit(dt));` + helper `facteurDebit(dt) = dt>0 ? 1 - Math.exp(-dt/K.DEBIT_TAU) : 0` posé à côté de `lissageEMA`.
- [x] 2.3 Vérifié : `lissageEMA` reste utilisé par `tickPrixLot` (non supprimé) et plus aucun site n'utilise `EXP_SMOOTH` (constante retirée).
- [x] 2.4 Confirmé : seul `Math.exp` (déterministe) ajouté, aucun `Math.random()` ajouté/retiré, ordre des phases inchangé (déterminisme bench/cadence préservé).

## 3. Tests

- [x] 3.1 `test/debit-lissage.test.js` (via `loadGame()`) : bas régime ~0,4 ligne/s, sans clic → `max(g.ventesParS) < 1,0` (plus de sursaut) et moyenne ≈ 0,4. **Mesuré : max 0,538, moy 0,402.**
- [x] 3.1b Régime nominal (critère d'acceptation) : 1 agent à 1 ligne/s + 1 vente/s ; après 30 s de stabilisation, `Math.round(g.ventesParS) === 1` ET `Math.round(g.prodAutoParS) === 1` à chaque pas (300 pas). **Mesuré : ventesParS ∈ [0,902 ; 1,130], 0 écart ; prodAutoParS ≈ 1,01.**
- [x] 3.2 Assertion « retombe à 0 » : après `locStock = 0` (plus aucune vente), `g.ventesParS < 0,01` au bout de 40 s (10·τ). **Mesuré : 2,11 → 9,6e-5.**
- [x] 3.3 Neutralité économique : `g.eur === g.locLivrees × g.prix` (recette des ventes entières intacte) et `locLivrees` entier — le lissage ne touche que l'affichage.
- [x] 3.4 `bun test` au vert (40 tests, 15 fichiers). A nécessité d'adapter `test/production-rupture.test.js` (constante de temps 4 s → laisser 10·τ pour décroître/converger, au lieu des ~6 s de l'ancienne EMA quasi-instantanée).

## 4. UI & affichage (optionnel — Décision 3 du design)

- [ ] 4.1 (Optionnel, NON fait) Améliorer la précision de `stat-ventes` dans `game/ui.js` (1 décimale sous un seuil) pour le cas **sub-1 ligne/s** (arrondit à « 0 »). Hors périmètre du bug ; le critère ≥ 1 ligne/s est déjà satisfait par l'arrondi. **En attente d'arbitrage joueur.**

## 5. Cache-busting & vérifications finales

- [x] 5.1 Bumper `var version` dans `index.html` (39 → 40) — cache-busting GitHub Pages.
- [x] 5.2 `node test/cadence.js` : plus gros trou **1m15s**, trous ≥ 2 min = **0** (inchangé, l'économie ne bouge pas).
- [ ] 5.3 Vérification manuelle en navigateur (à faire par le joueur) : avec un seul agent et sans cliquer, l'indicateur « Ventes » ne bondit plus à 3–4 et reflète le débit réel.
