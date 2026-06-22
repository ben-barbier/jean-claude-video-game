## Context

Les débits affichés au tableau de bord (« Ventes », « Production automatisée ») sont lissés dans `engine.js` par :

```js
g.ventesParS   = lissageEMA(g.ventesParS,   dt > 0 ? ventes / dt   : 0, K.EXP_SMOOTH); // tickVente
g.prodAutoParS = lissageEMA(g.prodAutoParS, dt > 0 ? prodTotal / dt : 0, K.EXP_SMOOTH); // tickProduction
```

avec `lissageEMA(val, cible, f) = val + (cible - val) * f` et `K.EXP_SMOOTH = 0,3`, à 10 Hz (`dt = 0,1 s`).

Deux défauts se combinent à **bas régime** (un agent, pas de clic) :

1. **`count / dt` amplifie une vente quantifiée.** On ne vend que des lignes **entières** : à 0,4 ligne/s réelle, une vente survient ≈ une fois toutes les 2,5 s, soit `ventes = 1` dans un tick de 0,1 s → cible instantanée `1/0,1 = 10/s`.
2. **Le facteur EMA est par-tick et trop réactif.** Sa constante de temps effective vaut `dt / f = 0,1 / 0,3 ≈ 0,33 s` ; elle laisse passer ≈ 30 % de la pointe de 10 → `ventesParS ≈ 3`.

Simulation (60 s, débit réel 0,4 ligne/s) : **pic affiché = 3,00** (arrondi « 3 », voire « 4 »), moyenne = 0,39. L'indicateur ment d'un facteur ~8 en crête. Le même mécanisme touche `prodAutoParS`, masqué seulement parce que la production est en général plus soutenue.

Contraintes : `engine.js`/`state.js`/`data.js` restent **sans DOM** (testables via `vm`) ; toute constante d'équilibrage va dans `DATA.K` ; l'économie (euros, stock, demande) ne doit pas bouger — seul l'affichage change.

## Goals / Non-Goals

**Goals :**
- Que l'indicateur « Ventes » colle au débit **réel** soutenu, sans bond à 3–4 à bas régime.
- Appliquer le même correctif à « Production automatisée » (défaut identique, latent).
- Garder la propriété « retombe à 0 » en rupture, et la justesse à régime établi.
- Lissage **indépendant du pas `dt`** (robuste si la cadence de la boucle change).

**Non-Goals :**
- Changer l'économie (prix, demande, stock, euros) ou la mécanique de vente par lignes entières.
- Toucher la visibilité/le déblocage des indicateurs (`g.seen.*`).
- Refondre l'affichage du tableau de bord (la précision d'affichage de `stat-ventes` est une option mineure, cf. Décision 3).

## Decisions

### Décision 1 — Lissage à constante de temps fixe (EMA à facteur dépendant du pas)

> **Implémentation finale** (révisée pendant l'apply) : on garde la même EMA `lissageEMA(val, cible, α)` que l'original, mais avec un facteur **dépendant du pas** `α = 1 − e^(−dt/τ)` (helper `facteurDebit(dt)`), au lieu du facteur constant `EXP_SMOOTH = 0,3`. La cible reste le débit instantané `count/dt`.

```js
function facteurDebit(dt) { return dt > 0 ? 1 - Math.exp(-dt / K.DEBIT_TAU) : 0; }
// tickVente :
g.ventesParS   = lissageEMA(g.ventesParS,   dt > 0 ? ventes / dt   : 0, facteurDebit(dt));
// tickProduction :
g.prodAutoParS = lissageEMA(g.prodAutoParS, dt > 0 ? prodTotal / dt : 0, facteurDebit(dt));
```

Propriétés (démontrées + vérifiées sur le moteur réel) :
- **Pic par ligne isolée** = `α · (1/dt) = (1 − e^(−dt/τ))/dt ≈ 1/τ`, **borné et indépendant de `dt`** (l'ancien `EXP_SMOOTH/dt = 3` causait le bond ; ici ≈ 0,25). C'est ce qui tue le sursaut.
- **Sans biais** : à régime soutenu `r`, la cible `count/dt` vaut `r` en moyenne → l'EMA converge **exactement** vers `r` (mesuré : prod 20/s → 19,999 ; 1 ligne/s → 1,000).
- À l'arrêt des ventes : la cible tombe à 0 → `ventesParS → 0` (décroissance en `e^(−dt/τ)`).

**Pourquoi pas l'accumulateur à fuite** (`acc = acc·e^(−dt/τ) + count ; rate = acc/τ`), envisagé en premier : mêmes vertus anti-sursaut, mais il introduit un **biais de discrétisation** `+dt/(2τ) ≈ +1,25 %` (mesuré : 20/s → 20,25 ; 1/s → 1,0125). Négligeable pour l'affichage entier, mais l'EMA pas-aware est *exacte* et, surtout, **ne nécessite aucun nouveau champ d'état** (elle lisse directement `g.ventesParS`) → diff plus petit, aucune migration de save.

Vérifié par simulation (débit réel 0,4 ligne/s) :

| τ | pic affiché | moyenne affichée |
|---|---|---|
| ancien EMA 0,3 | **3,00** | 0,39 |
| 3 s | 0,59 | 0,38 |
| **4 s** | **0,54** | 0,37 |
| 5 s | 0,51 | 0,36 |

**Choix : `K.DEBIT_TAU = 4` s** — bon compromis « anti-sursaut / réactivité ». À ajuster si l'indicateur paraît trop mou à haut régime.

**Alternatives écartées :**
- *Baisser `EXP_SMOOTH`* (facteur constant, ex. 0,05) : atténue mais ne supprime pas la dépendance au pas, et la pointe reste `f·(1/dt)` ; fragile si `dt` change. Fixer la constante de temps **en secondes** (α = 1−e^(−dt/τ)) est la bonne formulation — c'est la solution retenue.
- *Accumulateur à fuite* (`acc·e^(−dt/τ)+count`) : même lissage mais biais de discrétisation +1,25 % et nécessite un champ d'état → cf. Décision 1.
- *Fenêtre glissante à tampon circulaire* (compter les ventes des N dernières secondes) : exact et sans dépassement, mais ajoute un tableau d'historique dans l'état (sérialisation `SAVE`, complexité). L'EMA pas-aware donne le même lissage **sans aucun champ d'état**.
- *Afficher `min(demandeParS, prodAutoParS)` comme proxy lisse* : lisse mais ne reflète plus l'écoulement **réel** (rupture de stock, lignes entières) — contredit l'intention « débit réel ».

### Décision 2 — Champs d'état et constante

- `state.js` (`nouvelEtat()`) : **inchangé**. L'EMA pas-aware lisse directement `g.ventesParS` / `g.prodAutoParS` → aucun champ d'accumulateur, **aucune migration de save**.
- `data.js` : `K.DEBIT_TAU = 4`. `K.EXP_SMOOTH` n'était plus utilisé que pour ces deux débits → **supprimé** (`tickPrixLot` utilise `LOT_REVERSION`, pas `EXP_SMOOTH`).
- `engine.js` : helper `facteurDebit(dt)` à côté de `lissageEMA` ; les deux lignes de débit l'utilisent comme facteur. Aucun autre site touché. `lissageEMA` reste utilisé par `tickPrixLot` → conservé.

### Décision 3 — Précision d'affichage (optionnelle)

**Critère d'acceptation acté** : `f(x, 0)` (= `toLocaleString` avec `maximumFractionDigits: 0`) **arrondit** au plus proche (ne tronque pas). Donc à **1 ligne/s + 1 vente/s**, `g.ventesParS` oscille dans ~[0,90 ; 1,13] (moy. 1,01) et arrondit à **« 1 » de façon stable** — c'est l'attendu explicite du joueur, satisfait sans changer l'affichage. (À l'inverse, l'ancien lissage affichait « 3 » même à 1 ligne/s.)

Reste le cas **sub-1 ligne/s** (un seul agent à ~0,4/s) : l'arrondi entier affiche « 0 ». C'est **honnête** (on vend < 0,5/s) mais peut sembler figé. Option : afficher 1 décimale sous un seuil (comme `demande-val` qui utilise 2 décimales). À trancher à l'implémentation ; hors périmètre strict du bug (le bug, c'est le sursaut, pas l'arrondi). N'affecte que `ui.js` (DOM).

## Risks / Trade-offs

- [Réactivité réduite à haut régime] → `τ = 4 s` ralentit la montée de l'indicateur quand on embauche des agents (montée sur ~4 s, ~10·τ = 40 s pour atteindre 0). Acceptable pour un débit « lissé » ; ajustable via `K.DEBIT_TAU`. A imposé d'allonger les fenêtres de `test/production-rupture.test.js` (l'ancienne EMA convergeait en < 2 s).
- [Pas de champ d'état → pas de migration] → l'EMA pas-aware lisse `g.ventesParS`/`g.prodAutoParS` en place ; une vieille save reprend simplement le lissage là où elle s'est arrêtée. Aucun risque de save.
- [Régression silencieuse de `EXP_SMOOTH`] → constante supprimée et test ciblé ajouté (`test/debit-lissage.test.js`) ; `bun test` au vert (40 tests).
- [Ordre des phases] → on ne change ni l'ordre des phases ni aucun appel à `Math.random()` (seul `Math.exp`, déterministe, est ajouté) : déterminisme bench/cadence intact (cadence : trou max 1m15s, 0 trou ≥ 2 min).

## Migration Plan

1. Ajouter `K.DEBIT_TAU = 4` et supprimer `K.EXP_SMOOTH` (devenu mort).
2. Helper `facteurDebit(dt)` + basculer `tickVente` / `tickProduction` sur `lissageEMA(..., facteurDebit(dt))`.
3. Bumper `var version` dans `index.html` (39 → 40).
4. `bun test` au vert (+ `test/debit-lissage.test.js`) ; `node test/cadence.js` inchangé.
5. Rollback trivial : restaurer le facteur `K.EXP_SMOOTH` constant dans les deux lignes (purement local, aucune donnée migrée, aucun champ d'état à défaire).

## Open Questions

- `τ = 4 s` est-il la bonne valeur ressentie, ou préfère-t-on 3 s (plus vif) ? — à valider en jouant. (Aux deux valeurs, le critère « 1 ligne/s ⇒ affiche 1 » reste vérifié : l'oscillation arrondit toujours à 1.)
- Faut-il améliorer la précision d'affichage de `stat-ventes` pour le cas sub-1 ligne/s (Décision 3) dans cette même change, ou la laisser pour une change UI dédiée ? (Le critère ≥ 1 ligne/s est déjà satisfait par l'arrondi.)
