## ADDED Requirements

### Requirement: Curseur unique de répartition production / refacto

Le curseur de refacto (`g.partRefacto`, fraction de 0 à 1) SHALL répartir l'intégralité de la
capacité de code automatique de l'IA — agents normaux **et** Super Agents — entre la
**production** de nouvelles lignes et le **refactoring** de l'existant. La fraction `partRefacto`
MUST s'appliquer de façon identique aux deux types de main-d'œuvre : aucune partie de la flotte ne
peut échapper au curseur.

#### Scenario: Le curseur freine aussi les Super Agents

- **WHEN** le joueur possède des Super Agents et règle le curseur refacto sur une valeur `r`
- **THEN** la production des Super Agents (`prodMegaParS`) est multipliée par `(1 − r)`, exactement
  comme celle des agents normaux
- **AND** à `r = 1` (100 % refacto), la production des Super Agents est nulle

#### Scenario: Les Super Agents participent au refactoring

- **WHEN** le curseur refacto est sur `r > 0` et qu'il reste de la dette
- **THEN** la dette retirée par seconde tient compte de la capacité de réécriture des Super Agents
  (pondérée par leur débit `DEBIT_MEGA`), et pas seulement de celle des agents normaux

### Requirement: Refacto proportionnelle à la capacité de réécriture détournée

La dette retirée par seconde SHALL être proportionnelle à la **capacité de réécriture détournée**
vers le refacto, définie comme `(agents × DEBIT_AGENT + megas × DEBIT_MEGA) × partRefacto`,
multipliée par la constante d'équilibrage `TAUX_REFACTO_PAR_LOC` (dette retirée par
ligne-équivalent réécrite). Un Super Agent en refacto MUST donc réduire la dette à un rythme
proportionnel à son débit de code (≈ `DEBIT_MEGA / DEBIT_AGENT` fois celui d'un agent).

Comme le refacto reste un travail de code automatique, il CONTINUE de consommer des tokens : à sec
de tokens, le refacto ralentit du même ratio de couverture que la production (comportement
existant conservé).

#### Scenario: Neutralité en l'absence de Super Agents

- **WHEN** le joueur n'a aucun Super Agent (`megas = 0`) et des multiplicateurs de production de
  base (aucun projet d'amélioration d'agents acheté)
- **THEN** la dette retirée par seconde est identique au comportement d'avant ce changement
  (la refacto par agents conserve le même rythme effectif)
- **AND** une fois des projets d'amélioration d'agents achetés, le refacto par agents devient
  proportionnellement plus efficace (mêmes lignes mieux réécrites), effet voulu et borné

#### Scenario: Un Super Agent en refacto réduit la dette

- **WHEN** le joueur possède au moins un Super Agent, règle le curseur sur 100 % refacto, dispose
  de tokens, et la dette est strictement positive
- **THEN** la dette diminue à un rythme dominé par la capacité des Super Agents, et non plafonnée
  par le seul nombre d'agents normaux

### Requirement: Aucun soft-lock de dette possible

À 100 % refacto (`partRefacto = 1`), la production automatique totale SHALL être nulle et la dette
MUST être strictement décroissante tant qu'elle est positive et que des tokens sont disponibles —
quel que soit le ratio entre agents normaux et Super Agents. Il MUST être impossible de se
retrouver avec une dette qui augmente alors que toute la flotte est affectée au refacto.

#### Scenario: 100 % refacto avec une flotte dominée par les Super Agents

- **WHEN** le joueur possède beaucoup de Super Agents (et peu ou pas d'agents normaux), règle le
  curseur sur 100 % refacto et dispose de tokens
- **THEN** la production tombe à 0 (aucune nouvelle dette générée)
- **AND** la dette diminue strictement à chaque tick (jusqu'à 0)

#### Scenario: À sec de tokens, le refacto s'interrompt sans générer de dette

- **WHEN** le curseur est sur 100 % refacto mais qu'il n'y a plus de tokens
- **THEN** la dette reste constante (le refacto ne peut pas s'effectuer faute de tokens)
- **AND** aucune nouvelle dette n'est générée (la production est nulle à 100 % refacto)
