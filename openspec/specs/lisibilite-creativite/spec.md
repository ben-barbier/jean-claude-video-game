# lisibilite-creativite Specification

## Purpose
TBD - created by archiving change explicabilite-creativite. Update Purpose after archive.
## Requirements
### Requirement: La barre d'Opérations est présentée comme la fenêtre de contexte

L'IHM du panneau cognitif SHALL présenter la barre d'Opérations comme la **fenêtre de contexte** de
l'IA : le mot « contexte » MUST apparaître à l'écran à côté de cette barre, afin que la narration
(qui parle de « contexte saturé ») renvoie à un élément visible et nommé.

#### Scenario: Le mot « contexte » est affiché près de la barre d'Ops

- **WHEN** le panneau cognitif est visible (`g.seen.confiance`)
- **THEN** le libellé de la barre d'Opérations contient le mot « contexte » (p. ex.
  « Contexte (Opérations) »)

### Requirement: L'état de saturation du contexte est signalé visuellement

Quand le pool d'Opérations atteint son plafond, l'IHM SHALL afficher un indicateur de **saturation**
distinct ; en dessous du plafond, cet indicateur MUST être absent. La condition de saturation
utilisée par l'IHM MUST être identique à celle de l'engine : `g.ops >= opsPlafond(g)`.

#### Scenario: Pool d'Ops au plafond → indicateur de saturation

- **WHEN** `g.ops >= ENGINE.opsPlafond(g)`
- **THEN** un badge de saturation (p. ex. « ● SATURÉ ») est affiché à côté de la barre de contexte

#### Scenario: Pool d'Ops sous le plafond → pas d'indicateur

- **WHEN** `g.ops < ENGINE.opsPlafond(g)`
- **THEN** aucun badge de saturation n'est affiché

### Requirement: Le débit de Créativité n'est visible que pendant le débordement

L'IHM SHALL afficher le **débit** de Créativité (lignes par seconde gagnées par débordement)
**uniquement** lorsque le contexte est saturé ET la Créativité débloquée. Ce débit MUST valoir
`K.TAUX_OVERFLOW × g.gpu` (la formule exacte appliquée par `tickCognition`). Hors saturation, l'IHM
MUST indiquer un état de **veille** explicite, sans débit. Tant que la Créativité n'est pas
débloquée (`g.creaUnlocked` faux), l'ensemble de la ligne Créativité MUST rester masqué
(comportement existant conservé).

#### Scenario: Saturé et Créativité débloquée → débit visible

- **WHEN** `g.creaUnlocked` est vrai ET `g.ops >= ENGINE.opsPlafond(g)`
- **THEN** l'IHM affiche le débit de Créativité égal à `ENGINE.K.TAUX_OVERFLOW × g.gpu` par seconde
- **AND** un sous-texte signale le débordement (p. ex. « le contexte déborde → des idées émergent »)

#### Scenario: Non saturé → veille, aucun débit

- **WHEN** `g.creaUnlocked` est vrai ET `g.ops < ENGINE.opsPlafond(g)`
- **THEN** aucun débit de Créativité n'est affiché
- **AND** un état de veille est indiqué (p. ex. « en veille — contexte non saturé »)

#### Scenario: Créativité non débloquée → ligne masquée

- **WHEN** `g.creaUnlocked` est faux
- **THEN** la ligne Créativité (valeur, débit et sous-texte) reste masquée

### Requirement: La narration adopte le cadrage « contexte saturé » en deux temps

La narration de la Créativité SHALL expliquer son **mécanisme** selon le cadrage « contexte saturé »,
en deux temps : une **anticipation** au déblocage, puis une **confirmation** au premier débordement
réel. Le texte ne MUST PAS se limiter à annoncer l'événement sans en évoquer la cause (contexte
saturé → surplus → idées).

#### Scenario: Flavor de `debloquerCrea` au déblocage (anticipation)

- **WHEN** le joueur achète le projet `debloquerCrea`
- **THEN** le message journalisé **anticipe** le mécanisme (un contexte qui sature, dont le surplus
  « dérive » vers quelque chose), sans affirmer que le débordement a déjà eu lieu

### Requirement: Une réplique marque le premier débordement du contexte

Le jeu SHALL jouer **une seule fois** une réplique vocale au tout premier instant où le contexte
sature (`g.ops >= opsPlafond(g)`) alors que la Créativité est débloquée, confirmant l'émergence de
la Créativité par débordement. La réplique MUST être déclenchée une seule fois par partie (drapeau
`g.seen.premierOverflow`) et ne MUST PAS se re-déclencher aux débordements suivants.

#### Scenario: Premier débordement après déblocage

- **WHEN** `g.creaUnlocked` est vrai et que `g.ops` atteint `opsPlafond(g)` pour la première fois
- **THEN** `g.seen.premierOverflow` passe à vrai
- **AND** une réplique confirmant le débordement (cadrage « contexte saturé ») est ajoutée au journal

#### Scenario: Débordements suivants — pas de répétition

- **WHEN** le contexte sature à nouveau alors que `g.seen.premierOverflow` est déjà vrai
- **THEN** aucune nouvelle réplique de premier débordement n'est jouée

