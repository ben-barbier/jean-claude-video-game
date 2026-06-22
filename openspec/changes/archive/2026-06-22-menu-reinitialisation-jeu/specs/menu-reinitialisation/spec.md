## ADDED Requirements

### Requirement: Bouton discret d'accès au menu dans le terminal

Le terminal (`#journal-term`) SHALL afficher un **bouton discret** ancré dans son coin
**haut-droit**, permettant d'ouvrir le menu. Au repos, ce bouton MUST être **en transparence**
(faible opacité) pour ne pas perturber la lecture du journal. Il MUST devenir nettement lisible
**au survol** et **au focus clavier**. Le bouton MUST être accessible au clavier (élément
focalisable, activable par Entrée/Espace) et porter un libellé accessible explicite (p. ex.
« Menu »). Sa présence MUST être indépendante de l'état `G` (toujours disponible, y compris avant
l'installation de l'IA).

#### Scenario: Bouton estompé au repos

- **WHEN** le terminal est affiché et le menu est fermé
- **THEN** le bouton est visible dans le coin haut-droit du terminal avec une faible opacité

#### Scenario: Bouton lisible au survol ou au focus

- **WHEN** le joueur survole le bouton à la souris OU le focalise au clavier
- **THEN** le bouton devient nettement plus visible (opacité augmentée)

#### Scenario: Disponible dès le départ

- **WHEN** une nouvelle partie démarre, avant toute progression (`g.jcInstalled` faux)
- **THEN** le bouton du menu est présent et utilisable

### Requirement: Le menu prend la place du terminal

Activer le bouton SHALL **ouvrir un menu qui occupe l'emplacement du terminal** : le contenu
habituel (journal `#journal` et invite `#journal-prompt`) MUST être masqué et remplacé, **dans le
même cadre** `#journal-term`, par un panneau d'options. Le menu MUST proposer une action
**« Réinitialiser la partie »** et un moyen de **revenir au terminal** (fermer le menu) sans
effet destructeur. Fermer le menu MUST restaurer l'affichage du journal et de l'invite dans leur
état courant. Le changement d'affichage MUST déclencher le recalcul de la hauteur réservée sous le
terminal (`ajusterOffsetTerminal()`) afin qu'aucun contenu de la page ne soit masqué ni recouvert.

#### Scenario: Ouverture du menu

- **WHEN** le joueur active le bouton discret du terminal
- **THEN** le journal et l'invite sont masqués
- **AND** un panneau de menu apparaît dans le cadre du terminal, proposant « Réinitialiser la
  partie » et un moyen de revenir au terminal

#### Scenario: Retour au terminal

- **WHEN** le menu est ouvert et le joueur choisit de revenir au terminal (fermer le menu)
- **THEN** le panneau de menu disparaît
- **AND** le journal et l'invite réapparaissent dans leur état courant
- **AND** aucune progression n'a été modifiée

#### Scenario: L'offset du terminal reste cohérent

- **WHEN** l'ouverture ou la fermeture du menu modifie la hauteur du cadre du terminal
- **THEN** la hauteur réservée sous le terminal est recalculée (`ajusterOffsetTerminal()`) de sorte
  qu'aucun contenu de la page ne soit recouvert

### Requirement: Réinitialisation protégée par une confirmation native

Le bouton « Réinitialiser la partie » du menu SHALL n'avoir **aucun effet immédiat** : il MUST
d'abord ouvrir une **boîte de dialogue de confirmation native** (`window.confirm`) présentant
explicitement le caractère destructeur de l'action (toute progression sera perdue) avec deux issues
natives : **OK** (confirmer) et **Annuler**. La réinitialisation effective MUST n'avoir lieu **que**
si le joueur valide (OK), et MUST réutiliser la procédure existante `window.resetJeanClaude()`
(neutralisation de l'autosave et de la sauvegarde de fermeture, effacement du localStorage via
`SAVE.effacer()`, puis rechargement de la page). Choisir Annuler MUST laisser la partie **intacte**
(aucun effet). Ce mécanisme MUST être le même que celui déjà employé par le raccourci double-ÉCHAP.

#### Scenario: Valider réinitialise

- **WHEN** le joueur clique « Réinitialiser la partie » puis valide la confirmation native (OK)
- **THEN** `window.resetJeanClaude()` est invoqué (autosave neutralisé, localStorage effacé via
  `SAVE.effacer()`, page rechargée)
- **AND** la partie repart de zéro, comme à la première visite

#### Scenario: Annuler ne touche à rien

- **WHEN** le joueur clique « Réinitialiser la partie » puis choisit **Annuler** dans la confirmation
- **THEN** aucune réinitialisation n'a lieu, la progression et la sauvegarde restent intactes

#### Scenario: Le clic sur Réinitialiser n'efface rien tant que non validé

- **WHEN** le joueur clique « Réinitialiser la partie » mais n'a pas encore validé la confirmation
- **THEN** le localStorage n'a pas été effacé et la page n'a pas été rechargée
