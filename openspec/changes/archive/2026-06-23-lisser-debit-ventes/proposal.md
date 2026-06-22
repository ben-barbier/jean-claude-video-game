## Why

Avec un seul agent et **sans cliquer**, l'indicateur « Ventes » du tableau de bord bondit visuellement jusqu'à 3–4 alors que le débit réel de ventes est inférieur à 0,5 ligne/s. C'est perturbant et trompeur : le joueur croit vendre 4 lignes/s alors qu'il en vend ~0,4.

La cause est mécanique (vérifiée par simulation) : on ne vend que des **lignes entières**, donc à bas régime une vente survient sporadiquement (1 ligne dans un tick de 0,1 s). Le débit affiché vaut `lissageEMA(ventesParS, ventes/dt, 0,3)` : diviser 1 ligne par `dt = 0,1 s` injecte une pointe instantanée de 10/s que le lissage à facteur 0,3 (trop réactif, et dépendant du pas) laisse passer à ≈ 3. Le même défaut latent existe sur l'indicateur « Production automatisée » (`prodAutoParS`), seulement masqué à haut débit.

## What Changes

- Remplacer, pour les débits **affichés** « Ventes » et « Production automatisée », le lissage EMA par-tick (`EXP_SMOOTH = 0,3`, dépendant du pas et amplifié par `count/dt`) par un **lissage à constante de temps fixe** (accumulateur à fuite exponentielle) : une vente isolée ne dépose que sa contribution réelle au débit (≈ 1/τ), au lieu d'une pointe à `1/dt`.
- Résultat (vérifié par simulation, τ ≈ 4 s) : à débit réel 0,4 ligne/s, le pic affiché tombe de **3,00 à 0,54** et la moyenne reste juste (~0,4) ; plus aucun « bond jusque 4 ».
- Ajouter la constante de temps dans `DATA.K` (ex. `DEBIT_TAU`), conformément à la règle « toute constante d'équilibrage vit dans K ».
- Conserver le comportement attendu : l'indicateur retombe bien à 0 en rupture de tokens / d'écoulement, reflète le débit **réel** (hors clics pour la production), et reste cohérent à haut régime.
- Aucun impact sur l'économie : seuls les indicateurs **affichés** (`ventesParS`, `prodAutoParS`) changent de mode de lissage ; les euros, le stock et la demande ne sont pas touchés.

## Capabilities

### New Capabilities
- `indicateur-ventes`: l'indicateur « Ventes » du tableau de bord — ce qu'il mesure (débit réel de lignes écoulées), et la garantie qu'il ne sursaute jamais durablement au-dessus du débit réellement soutenu, y compris à bas régime (un seul agent, sans clic, ventes quantifiées en lignes entières).

### Modified Capabilities
- `production-automatisee`: même correctif de lissage appliqué à l'indicateur « Production automatisée » — ajout de la garantie « ne sursaute pas au-dessus du débit automatique réel » à bas régime, sans changer ce qu'il mesure ni sa visibilité.

## Impact

- `game/data.js` : nouvelle constante `K.DEBIT_TAU` (constante de temps du lissage) ; `K.EXP_SMOOTH` devenu mort → **supprimé**.
- `game/engine.js` : helper `facteurDebit(dt) = 1−e^(−dt/τ)` ; `tickVente` et `tickProduction` lissent `ventesParS` / `prodAutoParS` via `lissageEMA(..., facteurDebit(dt))` au lieu du facteur constant `EXP_SMOOTH`. **Aucun accès au DOM** (couche testable préservée).
- `game/state.js` : **inchangé** (l'EMA lisse en place → aucun champ d'état, aucune migration de save).
- `game/ui.js` : **inchangé** (lit toujours `g.ventesParS` / `g.prodAutoParS`) ; précision d'affichage de `stat-ventes` à revoir éventuellement pour le cas sub-1 ligne/s (optionnel, non fait).
- `index.html` : `var version` bumpé 39 → 40 (cache-busting GitHub Pages).
- `test/debit-lissage.test.js` : nouveau test (non-sursaut bas régime, régime nominal « affiche 1 », retombe à 0, neutralité éco). `test/production-rupture.test.js` : fenêtres allongées (constante de temps 4 s).
- Vérifications : `bun test` au vert (40 tests) ; `node test/cadence.js` inchangé (trou max 1m15s, 0 trou ≥ 2 min).
