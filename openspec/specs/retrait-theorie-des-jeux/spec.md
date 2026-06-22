# retrait-theorie-des-jeux

## Purpose

Garantit l'absence totale de la mécanique « théorie des jeux » et de son unité, le **Yomi**, dans
le chapitre 1 (Acte 1) : aucune ressource Yomi, aucun panneau Stratégie, aucun tournoi ni projet de
R&D associé. Sert de garde-fou anti-régression (rien ne doit réintroduire ces éléments) tout en
documentant que la progression de l'Acte 1 reste intacte (pas de trou de rythme, pas de soft-lock,
AGI atteignable) et que les anciennes sauvegardes restent tolérées.

## Requirements

### Requirement: Aucune ressource Yomi dans l'état du jeu

L'état `G` produit par `nouvelEtat()` SHALL NE PAS contenir de ressource Yomi ni ses dérivés :
ni `g.yomi`, ni le multiplicateur `g.mult.yomiGain`, ni les drapeaux `g.autoTournoi`,
`g.seen.tournois`, `g.tournoisUnlocked`. Aucune phase de la boucle, aucune action et aucun coût
de projet NE SHALL lire ou écrire un champ `yomi`. L'invariant
`confianceTotale = confianceLibre + gpu + mem` SHALL rester inchangé (le Yomi n'en faisait pas partie).

#### Scenario: État neuf sans Yomi
- **WHEN** on crée un état neuf via `nouvelEtat()`
- **THEN** `g.yomi`, `g.mult.yomiGain`, `g.autoTournoi`, `g.seen.tournois` et `g.tournoisUnlocked` sont tous `undefined`

#### Scenario: Coût de projet sans champ Yomi
- **WHEN** on calcule le coût d'un projet quelconque via `coutProjet(g, p)`
- **THEN** l'objet de coût retourné ne comporte aucune clé `yomi`

#### Scenario: Invariant de Confiance préservé
- **WHEN** on fait tourner la boucle `tick` sur un état neuf pendant plusieurs minutes simulées
- **THEN** à chaque pas, `confianceTotale === confianceLibre + gpu + mem` reste vrai

### Requirement: Aucun panneau Stratégie ni tournoi

Le jeu NE SHALL PAS exposer de mécanique de tournois de théorie des jeux. Le moteur NE SHALL
contenir ni la phase `tickYomi`, ni l'action `jouerTournoi` (ni son export). L'interface NE SHALL
contenir ni le panneau `#bloc-strategie` (titre « Stratégie — Théorie des jeux », compteur Yomi,
bouton « Jouer un tournoi »), ni la fonction `renderStrategie()`, ni l'affichage `proj-yomi` du
panneau Projets, ni l'entrée `Yomi` dans le libellé de coût des projets.

#### Scenario: Pas d'action tournoi dans le moteur
- **WHEN** on inspecte l'objet `ENGINE` exporté
- **THEN** ni `jouerTournoi` ni `tickYomi` n'y sont définis

#### Scenario: Pas de panneau Stratégie dans le DOM
- **WHEN** on charge `index.html`
- **THEN** aucun élément `#bloc-strategie`, `#yomi-val`, `#btn-tournoi` ni `#proj-yomi` n'existe

### Requirement: Aucun projet de R&D de théorie des jeux

Le catalogue `DATA.PROJETS` NE SHALL PAS contenir les projets `modelisation`
(« Modélisation stratégique »), `theorieEsprit` (« Théorie de l'esprit ») ni `autoTournoi`
(« Auto-tournoi »). Ces identifiants NE SHALL apparaître ni dans l'`ORDRE` d'affichage, ni dans la
table des impacts, ni dans aucune constante de `DATA.K` dédiée (`YOMI_PASSIF`, `TOURNOI_COUT_OPS`,
`TOURNOI_GAIN`).

#### Scenario: Projets retirés du catalogue
- **WHEN** on parcourt `DATA.PROJETS`
- **THEN** aucun projet n'a pour `id` `modelisation`, `theorieEsprit` ou `autoTournoi`

#### Scenario: Constantes de tournoi retirées
- **WHEN** on inspecte `DATA.K`
- **THEN** `YOMI_PASSIF`, `TOURNOI_COUT_OPS` et `TOURNOI_GAIN` sont tous `undefined`

### Requirement: Progression de l'Acte 1 préservée après retrait

Le retrait NE SHALL PAS dégrader la jouabilité de l'Acte 1. Tous les projets restants (hors AGI)
SHALL demeurer achetables, l'AGI SHALL rester atteignable, et le rythme de déblocage mesuré par
`node test/cadence.js` SHALL conserver un trou maximal entre deux déblocages inférieur à 2 minutes.

#### Scenario: Tous les projets restants achetables
- **WHEN** on exécute la suite `bun test` après retrait
- **THEN** le test de progression confirme que chaque projet restant (hors AGI) est achetable, sans référence au Yomi

#### Scenario: Rythme sans trou
- **WHEN** on exécute `node test/cadence.js`
- **THEN** le trou maximal rapporté entre deux déblocages reste sous le seuil de 2 minutes

### Requirement: Tolérance des anciennes sauvegardes

Le chargement d'une sauvegarde produite par une version antérieure SHALL réussir sans erreur, même
si elle contient `yomi`, `mult.yomiGain`, `autoTournoi`, `seen.tournois`, `tournoisUnlocked` ou le
projet `theorieEsprit` dans `projetsFaits`. La fusion défensive de `SAVE` SHALL ignorer
silencieusement les champs disparus, et ceux-ci NE SHALL PAS être réintroduits dans l'état ni persistés.

#### Scenario: Charger une save contenant du Yomi
- **WHEN** on charge une sauvegarde dont l'objet contient `yomi: 1200` et `tournoisUnlocked: true`
- **THEN** le chargement réussit sans erreur et l'état résultant ne contient ni `yomi` ni `tournoisUnlocked`
