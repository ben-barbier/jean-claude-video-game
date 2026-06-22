# indicateur-ventes

## Purpose

Définit l'indicateur « Ventes » affiché dans le tableau de bord : ce qu'il mesure (le débit réel
de lignes écoulées par seconde), comment il est lissé (constante de temps fixe, indépendante du
pas de simulation `dt`, pour éviter une pointe `1/dt` sur une vente isolée), et la neutralité
économique de ce lissage (seule la valeur affichée `g.ventesParS` est concernée).

## Requirements

### Requirement: Indicateur de ventes du tableau de bord

Le tableau de bord SHALL afficher un indicateur intitulé **« Ventes »** qui reflète le débit réel de lignes écoulées (vendues) par seconde. Cet indicateur MUST se baser sur `g.ventesParS`, lissé par une **constante de temps fixe** (indépendante du pas de simulation `dt`), de sorte qu'une vente isolée — les ventes ne portant que sur des **lignes entières** — ne contribue que sa part réelle au débit, et non une pointe instantanée proportionnelle à `1/dt`.

#### Scenario: Pas de sursaut à bas régime

- **WHEN** le joueur possède un seul agent, ne clique pas, et le débit réel de ventes est faible (~0,4 ligne/s, les ventes survenant sporadiquement par lignes entières)
- **THEN** la valeur affichée de « Ventes » reste proche du débit réellement soutenu (de l'ordre de 0,4–0,5 ligne/s) et ne bondit pas à 3 ou 4
- **AND** la valeur moyenne affichée sur la durée correspond au débit réel de ventes

#### Scenario: La valeur converge vers le débit réel à régime établi

- **WHEN** les ventes s'écoulent à un débit soutenu `r` lignes/s
- **THEN** l'indicateur « Ventes » converge vers `r` (au lissage près), sans biais systématique vers le haut

#### Scenario: Régime nominal — 1 agent à 1 ligne/s affiche « 1 »

- **WHEN** un seul agent produit 1 ligne/s et la demande écoule 1 vente/s (tout le produit est vendu), sans clic
- **THEN** la valeur affichée de « Ventes » (`g.ventesParS` arrondie à l'entier) vaut **1** de façon stable
- **AND** elle n'affiche jamais 0 ni 2 ni un bond à 3–4 en régime établi (la valeur réelle oscille dans ~[0,9 ; 1,1] et arrondit toujours à 1)

#### Scenario: La valeur retombe à 0 quand les ventes cessent

- **WHEN** plus aucune ligne n'est écoulée (stock épuisé ou demande nulle)
- **THEN** l'indicateur « Ventes » converge vers 0

#### Scenario: Le lissage ne change pas l'économie

- **WHEN** le mode de lissage de l'indicateur change
- **THEN** les euros gagnés, le stock (`locStock`), les livraisons cumulées (`locLivrees`) et la demande accumulée (`demandeAcc`) sont identiques à ce qu'ils étaient : seule la valeur **affichée** `g.ventesParS` est concernée
