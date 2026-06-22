## Context

Le terminal (`#journal-term`, en haut de page) affiche le compteur de lignes via
`renderTableauBord()` (`game/ui.js:286-288`) à partir de `g.lignesProduites`. L'état `G`
(`nouvelEtat()`, `game/state.js`) ne contient **aucune notion de durée** : la boucle (`game/main.js`)
passe un `dt` (secondes) à `ENGINE.tick(g, dt)` à 10 Hz, mais ce `dt` n'est jamais cumulé. Plusieurs
champs accumulent déjà du temps en secondes via `dt` (`prixLotTimer`, `burstTimer`, `prodBurstTimer`)
— le pattern « `g.X += dt` dans un tick » est donc établi et éprouvé.

On veut un compteur de durée de jeu **persisté** et **affiché** dans le terminal, sans toucher à la
mécanique ni à l'équilibrage. La contrainte structurante du projet : `state`/`engine` restent **sans
DOM** (testables via `test/harness.js`), seul `ui.js`/`main.js` touchent le DOM.

## Goals / Non-Goals

**Goals:**

- Suivre la durée de jeu écoulée dans `G` (champ `tempsEcoule`, secondes), accumulée par l'engine.
- Persister cette durée avec la sauvegarde existante (aucune migration de format requise).
- Formater la durée en `HH:MM:SS` via un helper **pur**, donc testable hors navigateur.
- Afficher « `N rows (HH:MM:SS)` » dans `#journal-rows`, couplé au compteur de lignes.

**Non-Goals:**

- Aucune mécanique de gameplay, formule, palier ou constante d'équilibrage modifiée.
- Pas d'horloge « temps réel mur » : on mesure le **temps de simulation** (cumul des `dt`), cohérent
  avec les autres timers du jeu. Pas de gestion fine des onglets en arrière-plan (la boucle rAF gère
  déjà le rattrapage via l'accumulateur de `main.js`).
- Pas de nouvel élément DOM : `#journal-rows` existe déjà (`index.html:187`).
- Pas d'affichage de la durée hors du terminal (HUD dédié, écran de fin, etc.).

## Decisions

### 1. Où accumuler la durée — dans `tick`, après le garde `g.deployed`

`g.tempsEcoule += dt` est ajouté **dans `ENGINE.tick`** (`game/engine.js:269`), **après** la ligne
`if (g.deployed) return;`. Conséquences voulues :

- L'accumulation vit dans la couche **pure** (engine) → testable directement via `loadGame()`.
- Placée après le garde, la durée **se fige à la fin de l'Acte 1** (déploiement AGI) : on obtient un
  « temps de complétion » figé plutôt qu'un compteur qui continue après la fin.
- C'est une simple addition scalaire : **aucun appel à `Math.random()`**, donc **l'ordre des phases
  reste neutre** (la contrainte load-bearing de l'ordre des `random` est respectée).

*Alternative écartée* : accumuler dans `main.js` à partir du `dt` brut (temps réel mur). Rejeté car
`main.js` est la couche non testable, et on veut la même base de temps (simulation) que les autres
timers ; cela divergerait aussi du temps de jeu quand l'accumulateur plafonne (`ticks < 40`).

### 2. Le formatage est un helper pur exporté par l'`ENGINE`

`formatDuree(secondes)` → `"HH:MM:SS"` est ajouté dans `game/engine.js` et exposé sur l'objet
`ENGINE` (comme les autres formules), donc appelable depuis l'UI **et** depuis les tests. L'UI ne
fait **pas** le calcul elle-même : `renderTableauBord()` appelle `ENGINE.formatDuree(g.tempsEcoule)`.

Règles de formatage : `h = floor(s/3600)`, `m = floor((s%3600)/60)`, `sec = floor(s%60)` ; `m` et
`sec` sur 2 chiffres (`padStart`/équivalent) ; `h` sur **au moins** 2 chiffres mais **non borné**
(au-delà de 99 h → `100:00:00`, pas de troncature).

*Alternative écartée* : formater dans `ui.js` (près de `f`/`big`). Rejeté car non testable hors DOM ;
or le découpage `HH:MM:SS` (padding, débordement, troncature) mérite des tests unitaires.

### 3. L'affichage reste couplé au compteur de rows

Dans `renderTableauBord()`, la branche existante `nLignes >= 1` est étendue pour suffixer
`" (" + ENGINE.formatDuree(g.tempsEcoule) + ")"`. Quand `nLignes < 1`, le libellé reste vide
(inchangé). Le pluriel « row/rows » est préservé.

*Alternative écartée* : afficher la durée en permanence (même à 0 row). Rejeté : la formulation de la
demande (« ajoute **au nombre de rows** le temps ») couple les deux ; la première ligne apparaît dès
le premier clic, donc la durée devient visible immédiatement en pratique.

### 4. Persistance : aucune migration

`tempsEcoule` est un champ scalaire de `G` ; la sauvegarde sérialise `G` entier
(`JSON.stringify(copie)`, `game/state.js:118-120`). Les sauvegardes antérieures sans ce champ
chargeront `undefined` → la stratégie de chargement existante doit aboutir à `0` (à vérifier dans le
merge de `SAVE.charger` : si le merge part de `nouvelEtat()` puis applique la sauvegarde, le défaut
`0` est conservé pour les vieilles sauvegardes ; sinon, garantir le fallback `g.tempsEcoule || 0`).

## Risks / Trade-offs

- **Sauvegardes existantes sans `tempsEcoule`** → repartiraient de `0`. *Mitigation* : champ par
  défaut `0` dans `nouvelEtat()` et fallback `|| 0` côté lecture si le merge de `SAVE` n'écrase pas
  les défauts ; impact nul (juste un compteur d'affichage).
- **Temps de simulation ≠ temps réel mur** en onglet arrière-plan (l'accumulateur de `main.js`
  plafonne à 40 ticks/frame). *Mitigation* : c'est le comportement attendu (cohérent avec tous les
  autres timers du jeu) ; documenté en Non-Goal.
- **Débordement des heures** (parties très longues). *Mitigation* : `h` non borné (pas de `padStart`
  qui tronque), testé explicitement à 100 h.
- **Oubli du bump `version`** dans `index.html` → scripts en cache sur GitHub Pages. *Mitigation* :
  étape dédiée dans `tasks.md` (convention projet).
