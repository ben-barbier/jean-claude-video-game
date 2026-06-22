## Why

L'indicateur « Production » du tableau de bord additionne le débit automatique (agents/IA) et le débit manuel des clics (`prodAutoParS + prodManuelleParS`). Comme chaque clic injecte un pic dans une moyenne glissante, la valeur sautille en permanence et ne reflète pas une cadence réelle exploitable. Le joueur ne peut pas lire d'un coup d'œil « combien mon IA produit ».

## What Changes

- Le tableau de bord n'affiche plus que le **débit automatique réel** (`g.prodAutoParS`) ; les clics ne sont plus comptés dans cette valeur.
- Le libellé « Production » devient **« Production automatisée »**.
- L'indicateur n'apparaît qu'à partir de la phase IA (déblocage `seen.agents`), au lieu de la 1re ligne écrite (`seen.stock`) — afin de ne jamais afficher un « 0 » trompeur pendant la phase de clic purement manuelle.
- Suppression de la machinerie de débit manuel devenue inutile : champs `prodManuelleParS` et `clicsAcc` de l'état, et la partie « débit manuel » de `tickDebitsManuels` (la mise à jour de `tokensMax` est conservée). Les clics continuent d'alimenter `locStock` / `lignesProduites` et la dette — seul leur affichage en tant que « débit » disparaît.
- Le lissage EMA (`K.EXP_SMOOTH = 0.3`) est **conservé tel quel** : une fois les clics retirés, le mouvement résiduel ne reflète que des événements réels (ruptures de tokens, bursts) — c'est du signal, pas du bruit.
- Bump de `version` dans `index.html` (cache-busting GitHub Pages).

## Capabilities

### New Capabilities
- `production-automatisee`: l'indicateur de cadence de production du tableau de bord — ce qu'il mesure (débit IA réel, hors clics), comment il se comporte (lissé, retombe en rupture de tokens) et quand il devient visible.

### Modified Capabilities
<!-- Aucune : openspec/specs/ est vide, aucune capability existante à modifier. -->

## Impact

- `game/state.js` : retrait des champs `prodManuelleParS` et `clicsAcc` de `nouvelEtat()` (compatible avec la fusion de sauvegarde, qui n'itère que les clés de l'état neuf).
- `game/engine.js` : `tickDebitsManuels()` simplifié (suppression du calcul de débit manuel, conservation de `tokensMax`) ; `ecrireLigne()` n'incrémente plus `clicsAcc`.
- `game/ui.js` : `renderTableauBord()` affiche `g.prodAutoParS` seul et conditionne `cell-prod` à `g.seen.agents`.
- `index.html` : libellé « Production automatisée » + bump de `version`.
- `game/data.js` : mise à jour du commentaire de `EXP_SMOOTH` (ne mentionne plus « prod manuelle »).
- Tests : `test/production-rupture.test.js` reste vert (il ne porte que sur `prodAutoParS`). Aucun impact balance/cadence attendu (les clics produisent toujours les mêmes lignes).
