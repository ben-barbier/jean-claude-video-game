# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projet

Jeu incrémental/idle « Jean-Claude — Code Maximizer » : un clone de *Universal Paperclips*
en **JavaScript vanilla, sans build ni dépendances**. On incarne un dev qui écrit du code,
puis installe une IA (Jean-Claude) qui automatise tout jusqu'à découvrir l'AGI (fin de l'Acte 1).
Déployé en statique sur GitHub Pages (`.github/workflows/pages.yml`, sur push `main`).
La langue du projet (UI, commentaires, commits, voix de l'IA) est le **français**.

## Commandes

Le runner de test est **Bun** (`brew install bun` si absent). Pas de build, pas de linter.

```sh
bun test                       # tous les tests unitaires (test/*.test.js)
bun test test/save.test.js     # un seul fichier
bun test --watch               # mode continu

bun run bench                  # banc d'équilibrage (rythme des grands jalons)
bun run bench:detail           # déroulé détaillé d'une partie simulée
node test/cadence.js           # sonde de PACING : trou max entre deux déblocages
node test/cadence.js 60        # …borné à 60 min simulées
K_OVERRIDE='{"CONFIANCE_PALIER_FACTEUR":1.7}' node test/cadence.js   # override de constantes
```

`balance.js` et `cadence.js` sont des **outils de diagnostic** lancés via `node`/`bun run`
(ils ne matchent pas `*.test.js`, donc `bun test` les ignore). Pour jouer : ouvrir `index.html`
dans un navigateur (`window.resetJeanClaude()` en console pour repartir de zéro).

## Architecture

**`G` est l'unique source de vérité** (forme définie par `nouvelEtat()` dans `state.js`). Tout
le jeu lit/écrit cet objet d'état ; rien d'autre ne fait autorité.

**Séparation par couches** (clé pour la testabilité) :
- `game/data.js` (constantes `K` + les 40 projets de R&D), `game/voice.js` (répliques),
  `game/state.js` (`nouvelEtat()` + `SAVE` localStorage), `game/engine.js` (formules + boucle
  + actions) : **AUCUN accès au DOM** → testables hors navigateur.
- `game/ui.js` (rendu DOM, un `renderX()` par panneau) et `game/main.js` (amorçage + boucle)
  sont les **seuls** fichiers qui touchent le DOM. L'UI lit `G` mais ne le modifie **que** via
  les actions d'`ENGINE`.

**Chargement des modules — piège important.** Chaque `game/*.js` est à la fois un script
« navigateur » à variable globale (`var DATA = …`, `var ENGINE = …`) **et** un module CJS
(`module.exports`). Les fichiers se référencent mutuellement via ces globales (`DATA`, `VOICE`,
`ENGINE`). On ne peut donc PAS les `require()` directement : les tests les chargent dans un
contexte `vm` partagé via **`test/harness.js`** (`loadGame()`), où les `var` deviennent des
globales. En navigateur, `index.html` les injecte par `document.write` dans l'ordre
`data, voice, state, engine, ui, main`.

**Boucle de jeu** (`main.js`) : pas fixe `DT` (10 Hz) avec accumulateur, piloté par
`requestAnimationFrame` ; autosave toutes les 15 s. `engine.tick(g, dt)` orchestre des phases
isolées (`tickProduction`, `tickVente`, … `tickPrixLot`). **L'ORDRE des phases est load-bearing** :
il fixe l'ordre des appels à `Math.random()` (bourse → incidents → prix) — ne pas le réordonner.

**Déblocage progressif (§4.4)** : les drapeaux `g.seen.*` gouvernent la visibilité des panneaux.
Ils sont posés par `ENGINE.majDeblocages()`/`reveler()` (logique pure, dans engine), puis
l'UI les affiche via `montre()` (effet « flash » à l'apparition). Le pivot du jeu est
`g.jcInstalled` : presque tout reste caché tant que l'IA n'est pas installée.

**Équilibrage** : toutes les constantes vivent dans `DATA.K`. Le rythme se mesure avec
`balance.js` (jalons) et `cadence.js` (trou max entre déblocages — l'indicateur de *fun*,
calé sur *Universal Paperclips*). Voir `docs/specifications.md` §4.7 et le README. Notamment :
les paliers de Confiance suivent `round(1500 × CONFIANCE_PALIER_FACTEUR^k)` avec un facteur ≈ φ.

## Conventions & pièges

- **Bumper `index.html` `version`** (`var version = 'N'`) à **chaque** modification d'un
  `game/*.js` : c'est le cache-busting de GitHub Pages (sinon les scripts restent en cache).
- Garder `data/voice/state/engine` **sans DOM** (c'est ce qui les rend testables via `vm`).
- **Invariant** maintenu partout : `confianceTotale = confianceLibre + gpu + mem`.
- Messages de commit : préfixe **emoji** + français (ex. `⚖️:`, `✨:`, `🐛:`, `💄:`, `♻️:`).
- Tout changement de gameplay/balance doit garder `bun test` au vert et un rythme sans trou
  ≥ 2 min (vérifier avec `node test/cadence.js`).
