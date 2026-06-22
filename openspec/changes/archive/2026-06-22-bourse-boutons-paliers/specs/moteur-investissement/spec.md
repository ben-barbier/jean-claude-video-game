## ADDED Requirements

### Requirement: Commandes de placement par paliers

Le moteur d'investissement SHALL proposer une rangée « Placer » de cinq boutons :
`100 €`, `1K €`, `10K €`, `100K €` et `tout`. Chaque bouton de palier SHALL transférer
le montant indiqué depuis les liquidités (`eur`) vers le capital placé (`capital`),
plafonné par les liquidités disponibles. Le bouton `tout` SHALL placer la totalité des
liquidités.

#### Scenario: Placer un palier intermédiaire
- **WHEN** le joueur dispose de 25 000 € de liquidités et clique sur `10K €` de la rangée « Placer »
- **THEN** 10 000 € passent de `eur` vers `capital` (liquidités 15 000 €, capital +10 000 €)

#### Scenario: Palier plafonné par les liquidités
- **WHEN** le joueur dispose de 3 000 € de liquidités et clique sur `10K €`
- **THEN** seuls les 3 000 € disponibles sont placés (le montant est plafonné, jamais à découvert)

#### Scenario: Tout placer
- **WHEN** le joueur clique sur `tout` de la rangée « Placer »
- **THEN** la totalité des liquidités passe dans le capital placé

### Requirement: Commandes de retrait par paliers

Le moteur d'investissement SHALL proposer une rangée « Retirer » de cinq boutons :
`100 €`, `1K €`, `10K €`, `100K €` et `tout`. Chaque bouton de palier SHALL transférer
le montant indiqué depuis le capital placé (`capital`) vers les liquidités (`eur`),
plafonné par le capital placé. Le bouton `tout` SHALL retirer la totalité du capital.

#### Scenario: Retirer un palier intermédiaire
- **WHEN** le joueur a 250 000 € de capital placé et clique sur `100K €` de la rangée « Retirer »
- **THEN** 100 000 € passent de `capital` vers `eur` (capital 150 000 €, liquidités +100 000 €)

#### Scenario: Palier plafonné par le capital
- **WHEN** le joueur a 500 € de capital placé et clique sur `1K €`
- **THEN** seuls les 500 € placés sont retirés (le montant est plafonné, jamais négatif)

#### Scenario: Tout retirer
- **WHEN** le joueur clique sur `tout` de la rangée « Retirer »
- **THEN** la totalité du capital placé revient dans les liquidités

### Requirement: État actif des boutons selon les seuils

Chaque bouton SHALL être actif uniquement quand le mouvement qu'il déclenche est utile.
Un bouton de palier « Placer » SHALL être actif tant que les liquidités atteignent au moins
son montant ; un bouton de palier « Retirer » SHALL être actif tant que le capital placé
atteint au moins son montant. Les boutons `tout` SHALL être actifs dès qu'il reste un
montant strictement positif à déplacer.

#### Scenario: Palier supérieur aux liquidités
- **WHEN** le joueur n'a que 5 000 € de liquidités
- **THEN** les boutons « Placer » `100 €` et `1K €` sont actifs, mais `10K €` et `100K €` sont inactifs

#### Scenario: Bourse vide
- **WHEN** le capital placé vaut 0 €
- **THEN** tous les boutons « Retirer » (paliers et `tout`) sont inactifs
