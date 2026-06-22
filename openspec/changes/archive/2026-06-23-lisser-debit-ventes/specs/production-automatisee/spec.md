## MODIFIED Requirements

### Requirement: Indicateur de production automatisée

Le tableau de bord SHALL afficher un indicateur de cadence intitulé **« Production automatisée »** qui reflète uniquement le débit automatique réel produit par l'IA (agents et Super Agents), exprimé en lignes par seconde. Cet indicateur MUST se baser sur `g.prodAutoParS` (débit auto réel, lissé et token-limité) et MUST NOT inclure le débit issu des clics manuels du joueur. Le lissage de `g.prodAutoParS` MUST utiliser une **constante de temps fixe** (indépendante du pas `dt`), de sorte qu'une ligne produite isolément à bas régime ne contribue que sa part réelle au débit (et non une pointe proportionnelle à `1/dt`).

#### Scenario: La valeur reflète le débit automatique seul

- **WHEN** l'IA produit du code via les agents (production automatique active) et qu'aucun clic n'est effectué
- **THEN** l'indicateur « Production automatisée » affiche la cadence automatique réelle (≈ débit nominal des agents), arrondie à l'entier

#### Scenario: Les clics n'affectent pas la valeur affichée

- **WHEN** le joueur clique sur « Écrire une ligne de code »
- **THEN** la valeur de « Production automatisée » reste inchangée (le clic n'y contribue pas)
- **AND** la ligne écrite est tout de même ajoutée au stock (`locStock`) et au cumul (`lignesProduites`)

#### Scenario: La valeur retombe en rupture de tokens

- **WHEN** la production automatique est interrompue faute de tokens disponibles
- **THEN** l'indicateur « Production automatisée » converge vers 0, reflétant la production réellement réalisée

#### Scenario: Pas de sursaut à bas régime

- **WHEN** la production automatique est faible (peu d'agents) et les lignes sont produites sporadiquement
- **THEN** l'indicateur « Production automatisée » reste proche du débit réellement soutenu et ne bondit pas bien au-dessus de celui-ci
