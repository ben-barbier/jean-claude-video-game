## Context

Le curseur refacto (`g.partRefacto`) est aujourd'hui câblé sur les seuls **agents normaux** :

- `prodAgentsParS = g.agents * (1 - g.partRefacto) * DEBIT_AGENT * agentDebit * multProd` — freiné.
- `prodMegaParS  = g.megas * DEBIT_MEGA * megaDebit * multProd` — **pas de facteur `partRefacto`**.
- `refactoCodingParS` (conso tokens du refacto) et `tickRefacto` (retrait de dette) ne lisent que
  `g.agents` ; `tickRefacto` retire `g.agents * partRefacto * TAUX_AGENT_REFACTO` dette/s.

Conséquence (mesurée par sonde, 60 s, 100 % refacto, tokens illimités) : 1 Super Agent ajoute
~20 dette/s, qu'il faudrait ~67 agents à 100 % refacto pour seulement compenser. Dès qu'on possède
des Super Agents, la dette devient non résorbable → soft-lock silencieux.

Contraintes du projet : `data/engine` restent **sans DOM** (testables via `vm`) ; toute constante
d'équilibrage vit dans `DATA.K` ; l'**ordre des phases** de `tick()` est load-bearing (il fixe
l'ordre des appels à `Math.random()`). La refacto et la production n'appellent pas `Math.random()`
→ aucune réorganisation de phases nécessaire.

## Goals / Non-Goals

**Goals :**
- Faire du curseur refacto un levier **global** sur toute la capacité de code de l'IA (agents +
  Super Agents), de façon que 100 % refacto stoppe TOUTE production et applique TOUTE la capacité
  à réduire la dette.
- Modèle mathématique **unifié** : une même grandeur (lignes-équivalent réécrites/s) pilote à la
  fois la conso de tokens du refacto ET la dette retirée — chaque ligne réécrite retire une
  quantité fixe de dette.
- Neutralité à `megas = 0` et multiplicateurs de base : rythme de refacto inchangé vs aujourd'hui.

**Non-Goals :**
- Pas de refonte de l'économie (prix, demande, hype, paliers de Confiance).
- Pas de nouveau panneau ni de nouvelle ressource ; on réutilise le curseur existant.
- Pas de garde-fou « plafond de dette » ou autre béquille d'UI : la garantie anti-soft-lock est
  **mécanique** (à 100 % refacto, prod = 0 et dette strictement décroissante).

## Decisions

### D1 — Le curseur freine aussi les Super Agents

`prodMegaParS` reçoit le facteur `(1 - g.partRefacto)`, exactement comme `prodAgentsParS` :

```js
function prodMegaParS(g) {
  return g.megaUnlocked
    ? g.megas * (1 - g.partRefacto) * K.DEBIT_MEGA * g.mult.megaDebit * multProd(g) : 0;
}
```

*Alternative écartée :* laisser les Super Agents produire à fond mais leur faire « s'auto-relire »
(option B de la discussion). Rejetée : le curseur resterait partiel et non intuitif, et l'on ne
pourrait toujours pas rediriger toute la flotte vers l'entretien.

### D2 — Capacité de réécriture unifiée (agents + Super Agents)

On définit la capacité de code détournée vers le refacto comme la somme des **débits de
production** que chaque unité fournirait si elle codait, pondérée par `partRefacto` :

```js
function refactoCodingParS(g) {
  if (!(g.partRefacto > 0 && g.dette > 0)) return 0;
  var capAgents = g.agents * K.DEBIT_AGENT * g.mult.agentDebit;
  var capMegas  = g.megaUnlocked ? g.megas * K.DEBIT_MEGA * g.mult.megaDebit : 0;
  return (capAgents + capMegas) * g.partRefacto;   // lignes-équivalent réécrites / s
}
```

Cette même grandeur sert (inchangé) au coût en tokens via `consoTokensParS`.

### D3 — La dette retirée est proportionnelle aux lignes réécrites

`tickRefacto` retire la dette proportionnellement à `refactoCodingParS` (et non plus au seul
nombre d'agents), via une nouvelle constante `TAUX_REFACTO_PAR_LOC` :

```js
function tickRefacto(g, dt) {
  if (g.partRefacto > 0 && g.dette > 0) {
    var loc = refactoCodingParS(g);            // lignes-équivalent réécrites / s
    var tokensReq = loc * coutTokenLigne(g) * dt;
    var ratio = 1;
    if (tokensReq > g.tokens) { ratio = tokensReq > 0 ? g.tokens / tokensReq : 0; tokensReq = g.tokens; }
    g.tokens = Math.max(0, g.tokens - tokensReq);
    g.dette  = Math.max(0, g.dette - loc * K.TAUX_REFACTO_PAR_LOC * ratio * dt);
  }
}
```

Le garde `g.agents > 0` est remplacé par `g.dette > 0` seul, puisque la capacité peut désormais
venir des Super Agents même sans agents normaux.

### D4 — Calibration de `TAUX_REFACTO_PAR_LOC`

Pour la neutralité à `megas = 0` et `agentDebit = 1` : dette retirée/s = `agents * partRefacto *
DEBIT_AGENT * TAUX_REFACTO_PAR_LOC`. Avec `DEBIT_AGENT = 1`, on retrouve l'ancien
`agents * partRefacto * TAUX_AGENT_REFACTO` (= 0,3) en posant **`TAUX_REFACTO_PAR_LOC = 0.3`**.
On **retire** `TAUX_AGENT_REFACTO` (devenu sans objet). `TAUX_REFACTO` (refacto manuel par Ops)
reste inchangé.

*Effet voulu, borné :* avec des projets d'amélioration d'agents (`agentDebit > 1`), le refacto par
agents devient proportionnellement plus efficace — « les mêmes lignes, mieux réécrites » — ce qui
est cohérent et reste plafonné par la dette disponible.

### D5 — UI : le curseur pilote « l'IA », plus seulement « les agents »

Dans `index.html`, le libellé passe de « Agents — Production X % ↔ Refactoring Y % » à
« IA — Production X % ↔ Refactoring Y % » (et l'`aria-label` du `range`). `ui.js` est inchangé
côté logique : il lit/écrit déjà `g.partRefacto` et n'affiche que des pourcentages.

## Risks / Trade-offs

- **[Refacto soudain bien plus puissante avec Super Agents]** → c'est l'objectif (anti-soft-lock).
  Le risque d'« annuler la dette trop facilement » est borné : à 100 % refacto la production (donc
  le revenu) tombe à 0, c'est un arbitrage coûteux ; et le refacto consomme des tokens. À vérifier
  par `node test/cadence.js` (rythme sans trou ≥ 2 min) et `bun run bench`.
- **[Coût en tokens du refacto plus élevé à l'échelle des Super Agents]** → cohérent (réécrire 100
  LOC/s coûte autant que les produire) ; le ratio de couverture token-limité s'applique déjà.
- **[Divergence conso-tokens vs dette-retirée selon les mults]** → écartée : le modèle unifié (D2 +
  D3) fait dériver les deux de la **même** grandeur `refactoCodingParS`, donc ils restent cohérents.
- **[Changement de l'indicateur « Production automatisée » à 100 % refacto]** → à 100 % refacto il
  affiche désormais 0 pour toute la flotte (au lieu de la prod des megas) : c'est le comportement
  correct attendu par la spec `production-automatisee` (« débit auto réel »).

## Migration Plan

- Aucune migration de sauvegarde : `DATA.K` n'est pas persisté ; `g.partRefacto`, `g.megas` et les
  `mult.*` existent déjà dans l'état et restent compatibles. Une partie en cours bénéficie du fix
  au prochain chargement (après bump de `version` → cache-busting).
- Déploiement : statique via GitHub Pages au push `main`. Rollback = revert du commit.

## Open Questions

- Faut-il afficher l'**impact net sur la dette** (dette/s = production − refacto) près du curseur
  pour rendre l'arbitrage lisible ? Hors périmètre de ce correctif ; à arbitrer séparément si le
  playtest montre que l'effet du curseur reste opaque.
