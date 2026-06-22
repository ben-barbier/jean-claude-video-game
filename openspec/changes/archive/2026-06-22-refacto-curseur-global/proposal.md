## Why

Dès que le joueur achète des **Super Agents**, la dette technique devient **impossible à
résorber**, même avec 100 % des agents affectés à la refacto : un soft-lock silencieux. La cause
est une asymétrie dans `engine.js` :

1. Le curseur refacto (`g.partRefacto`) ne freine **que** les agents normaux (`prodAgentsParS`
   contient `(1 - partRefacto)`), alors que la production des Super Agents (`prodMegaParS`)
   **ignore le curseur** et tourne toujours à plein régime (100 LOC/s chacun → de la dette).
2. Seuls les agents normaux refactorisent (`refactoCodingParS`/`tickRefacto` ne lisent que
   `g.agents`) ; les Super Agents ne réduisent **jamais** la dette.

Mesuré (60 s simulées, 100 % refacto, tokens illimités) : 1 Super Agent injecte ~20 dette/s qu'il
faudrait ~67 agents à 100 % refacto pour seulement compenser. C'est en contradiction avec
l'intention déjà écrite dans le code (`SF_AUTO` : « agents ET Super Agents, même qualité ») :
les deux types de main-d'œuvre sont censés être symétriques, mais le pilotage ne l'est pas.

## What Changes

- Le curseur refacto devient un **levier global** sur toute la main-d'œuvre IA (agents
  **et** Super Agents), au lieu de ne piloter que les agents normaux.
  - La production des Super Agents est **freinée par le curseur** : `prodMegaParS` se voit
    appliquer le facteur `(1 - partRefacto)`, comme les agents.
  - Les Super Agents **participent à la refacto** : la dette retirée par seconde devient
    proportionnelle à la **capacité de réécriture détournée** (agents + Super Agents,
    pondérée par leur débit respectif `DEBIT_AGENT`/`DEBIT_MEGA`), et non plus au seul
    nombre d'agents.
- **Garantie de design** : à 100 % refacto, **toute** la production cesse et **toute** la
  capacité de code relit l'existant → la dette est **toujours** réductible, quel que soit le
  ratio agents / Super Agents. Plus aucun soft-lock de dette possible par construction.
- Nouvelle constante d'équilibrage `TAUX_REFACTO_PAR_LOC` (dette retirée par ligne-équivalent
  réécrite) remplaçant `TAUX_AGENT_REFACTO` (qui n'avait de sens que « par agent »), calée pour
  conserver le comportement actuel à megas = 0.
- L'aide/le libellé du curseur refacto dans l'UI reflète qu'il pilote l'ensemble de la flotte.

## Capabilities

### New Capabilities

- `repartition-refacto`: répartition de la capacité de code automatique de l'IA (agents +
  Super Agents) entre **production** et **refactoring**, pilotée par un curseur unique ; et
  l'invariant qui en découle (à 100 % refacto, la dette est toujours résorbable).

### Modified Capabilities

<!-- Aucune : la spec `production-automatisee` ne décrit que l'indicateur d'affichage, dont
     l'énoncé (« reflète le débit auto réel ») reste vrai. Seule la valeur sous-jacente change
     (à 100 % refacto, la prod auto tombe à 0 pour TOUTE la flotte), ce qui est cohérent. -->

## Impact

- **`game/engine.js`** (logique pure, sans DOM) : `prodMegaParS` (facteur `(1 - partRefacto)`),
  `refactoCodingParS` + `tickRefacto` (capacité de refacto = agents + Super Agents pondérés par
  débit), retrait des usages de `TAUX_AGENT_REFACTO`.
- **`game/data.js`** (constantes pures) : ajout de `TAUX_REFACTO_PAR_LOC`, retrait de
  `TAUX_AGENT_REFACTO`.
- **`game/ui.js`** (DOM) : libellé/aide du curseur refacto.
- **`index.html`** : bump `var version` (cache-busting GitHub Pages) car `game/*.js` change.
- **`test/`** : `refacto-tokens.test.js` (cas existants restent valides à megas = 0) + nouveau
  test couvrant la non-régression du soft-lock (dette baisse à 100 % refacto avec Super Agents).
- Équilibrage : à vérifier via `bun test` (vert) et `node test/cadence.js` (rythme sans trou
  ≥ 2 min) — la valeur de `TAUX_REFACTO_PAR_LOC` est calée pour neutralité à megas = 0.
