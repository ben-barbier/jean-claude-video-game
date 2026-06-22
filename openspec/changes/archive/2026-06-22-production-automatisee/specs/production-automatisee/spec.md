## ADDED Requirements

### Requirement: Indicateur de production automatisée

Le tableau de bord SHALL afficher un indicateur de cadence intitulé **« Production automatisée »** qui reflète uniquement le débit automatique réel produit par l'IA (agents et Super Agents), exprimé en lignes par seconde. Cet indicateur MUST se baser sur `g.prodAutoParS` (débit auto réel, lissé et token-limité) et MUST NOT inclure le débit issu des clics manuels du joueur.

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

### Requirement: Visibilité liée à la phase d'automatisation

L'indicateur « Production automatisée » SHALL n'apparaître qu'une fois l'automatisation par l'IA débloquée (drapeau `g.seen.agents`, posé après l'installation de Jean-Claude), et non dès la première ligne écrite à la main. Le but est de ne jamais présenter une cadence « 0 lignes/s » trompeuse pendant la phase de développement purement manuelle.

#### Scenario: Caché pendant la phase de clic manuel

- **WHEN** le joueur a écrit des lignes à la main mais n'a pas encore installé Jean-Claude (`g.seen.agents` faux)
- **THEN** l'indicateur « Production automatisée » n'est pas affiché

#### Scenario: Visible après l'installation de l'IA

- **WHEN** Jean-Claude est installé et le déblocage `agents` est posé (`g.seen.agents` vrai)
- **THEN** l'indicateur « Production automatisée » devient visible dans le tableau de bord
