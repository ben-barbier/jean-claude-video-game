## ADDED Requirements

### Requirement: L'état suit la durée de jeu écoulée

Le jeu SHALL maintenir dans `G` un champ `tempsEcoule` représentant la **durée de jeu écoulée en
secondes** (cumul). Ce champ MUST être initialisé à `0` par `nouvelEtat()` et MUST être incrémenté
de `dt` à chaque tick de simulation par l'`ENGINE` (logique pure, sans DOM). Comme tout l'état `G`,
il MUST être persisté par la sauvegarde existante (la durée survit donc à un rechargement de page).
L'ordre des phases du tick MUST rester inchangé et aucun appel supplémentaire à `Math.random()` ne
MUST être introduit.

#### Scenario: Champ initialisé à zéro

- **WHEN** une nouvelle partie démarre (`nouvelEtat()`)
- **THEN** `g.tempsEcoule` vaut `0`

#### Scenario: La durée s'accumule avec le temps simulé

- **WHEN** `ENGINE.tick(g, dt)` est appelé avec `dt` secondes alors que la partie est en cours
- **THEN** `g.tempsEcoule` augmente de `dt`

#### Scenario: La durée se fige une fois l'Acte 1 terminé

- **WHEN** `ENGINE.tick(g, dt)` est appelé alors que `g.deployed` est vrai (AGI déployée)
- **THEN** `g.tempsEcoule` n'augmente plus (la durée reste figée à la valeur de fin de partie)

### Requirement: La durée est formatée en `HH:MM:SS` par un helper pur

L'`ENGINE` SHALL exposer un helper **pur** (sans DOM, testable hors navigateur) qui convertit une
durée en secondes en chaîne `HH:MM:SS`. Les **minutes** et **secondes** MUST être affichées sur
exactement 2 chiffres (zéro de tête). Les **heures** MUST être affichées sur au moins 2 chiffres et
MUST pouvoir déborder au-delà de `99` (p. ex. `123:45:06`) sans troncature. Les secondes affichées
MUST être un entier (partie fractionnaire tronquée).

#### Scenario: Durée nulle

- **WHEN** on formate `0` seconde
- **THEN** le résultat est `00:00:00`

#### Scenario: Moins d'une minute (padding des secondes)

- **WHEN** on formate `5` secondes
- **THEN** le résultat est `00:00:05`

#### Scenario: Minutes et secondes

- **WHEN** on formate `754` secondes (12 min 34 s)
- **THEN** le résultat est `00:12:34`

#### Scenario: Heures, minutes, secondes

- **WHEN** on formate `3661` secondes (1 h 01 min 01 s)
- **THEN** le résultat est `01:01:01`

#### Scenario: Débordement au-delà de 99 heures

- **WHEN** on formate `360000` secondes (100 h)
- **THEN** le résultat est `100:00:00`

#### Scenario: Partie fractionnaire tronquée

- **WHEN** on formate `90.9` secondes
- **THEN** le résultat est `00:01:30`

### Requirement: Le terminal affiche la durée à côté du compteur de lignes

L'IHM du terminal SHALL afficher la durée de jeu **entre parenthèses** au format `HH:MM:SS`, accolée
au compteur de lignes existant, dans `#journal-rows` : « `N rows (HH:MM:SS)` ». L'affichage de la
durée MUST rester couplé à celui des rows — tant que `g.lignesProduites < 1`, le libellé reste vide
(comportement actuel conservé). La durée affichée MUST provenir du helper pur de l'`ENGINE` appliqué
à `g.tempsEcoule` (l'IHM ne recalcule pas le formatage).

#### Scenario: Au moins une ligne produite → rows + durée

- **WHEN** `Math.floor(g.lignesProduites) >= 1`
- **THEN** `#journal-rows` affiche le nombre de lignes suivi de la durée entre parenthèses, p. ex.
  « `1234 rows (00:12:34)` »
- **AND** la durée affichée est `ENGINE.formatDuree(g.tempsEcoule)`

#### Scenario: Singulier conservé

- **WHEN** `Math.floor(g.lignesProduites) === 1`
- **THEN** `#journal-rows` utilise le singulier « row » suivi de la durée, p. ex. « `1 row (00:00:03)` »

#### Scenario: Aucune ligne produite → libellé vide

- **WHEN** `Math.floor(g.lignesProduites) < 1`
- **THEN** `#journal-rows` reste vide (ni rows ni durée)
