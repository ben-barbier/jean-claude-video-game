## 1. État (state.js)

- [x] 1.1 Retirer le champ `prodManuelleParS` de `nouvelEtat()` dans `game/state.js`
- [x] 1.2 Retirer le champ `clicsAcc` de `nouvelEtat()` (vérifier qu'aucun commentaire alentour ne reste orphelin)

## 2. Moteur (engine.js)

- [x] 2.1 Dans `ecrireLigne`, supprimer la ligne `g.clicsAcc += 1;` (et son commentaire) ; conserver les effets sur `locStock`, `lignesProduites` et `dette`
- [x] 2.2 Dans `tickDebitsManuels`, supprimer le calcul de `tauxManuel` et la mise à jour de `g.prodManuelleParS` (`lissageEMA` + remise à zéro de `clicsAcc`) ; conserver `g.tokensMax = Math.max(g.tokensMax, g.tokens);`
- [x] 2.3 Vérifier que `tickProduction` reste inchangé (la mise à jour de `g.prodAutoParS` à la fin est conservée)

## 3. Affichage (ui.js)

- [x] 3.1 Dans `renderTableauBord`, remplacer `txt('stat-prod', f(g.prodAutoParS + g.prodManuelleParS, 0))` par `txt('stat-prod', f(g.prodAutoParS, 0))`
- [x] 3.2 Remplacer `montre('cell-prod', g.seen.stock)` par `montre('cell-prod', g.seen.agents)`

## 4. Markup & libellé (index.html)

- [x] 4.1 Renommer le libellé de `#cell-prod` de « Production » en « Production automatisée »
- [x] 4.2 Bumper `var version = 'N'` (cache-busting GitHub Pages) suite aux modifs des `game/*.js`

## 5. Constantes & commentaires (data.js)

- [x] 5.1 Mettre à jour le commentaire de `K.EXP_SMOOTH` pour ne plus mentionner « prod manuelle » (ne reste que « ventes »)

## 6. Vérification

- [x] 6.1 `grep -rn "prodManuelleParS\|clicsAcc" game/` ne retourne plus aucune occurrence dans le code
- [x] 6.2 `bun test` au vert (notamment `test/production-rupture.test.js`)
- [x] 6.3 `node test/cadence.js` : rythme sans trou ≥ 2 min (pas de régression de cadence)
- [x] 6.4 Ouvrir `index.html` : avant l'installation de JC, le bloc « Production automatisée » est absent ; après, il affiche le débit IA, stable, et insensible aux clics ; il retombe vers 0 en rupture de tokens
