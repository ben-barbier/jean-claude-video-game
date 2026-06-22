## Context

La boucle cognitive existe et fonctionne. `tickCognition` (`game/engine.js`) accumule les Ops
(`g.ops += opsParS(g) * dt`), les plafonne (`g.ops = opsPlafond(g)` quand `capped`), et — si la
Créativité est débloquée et le pool plein — fait `g.creativite += K.TAUX_OVERFLOW * g.gpu * dt`.
`opsPlafond(g)` et `K` sont déjà exposés à l'UI (`ENGINE.opsPlafond`, `ENGINE.K`, cf. l'usage de
`ENGINE.K.TOURNOI_COUT_OPS` dans `game/ui.js`). Le rendu actuel (`renderCerveau()`, `#bloc-cognitif`
dans `index.html`) affiche les valeurs brutes (`ops-val` / `ops-plafond`, barre `#ops-bar`,
`crea-val`) **sans** signaler l'état de saturation ni d'où vient la Créativité.

Le changement est **majoritairement présentation + texte** : aucune nouvelle formule de jeu, aucune
constante d'équilibrage. La seule logique ajoutée est une **instrumentation narrative minime** — un
drapeau `g.seen.premierOverflow` et un déclenchement vocal au premier débordement. Contraintes
maison : JS vanilla sans build ; seuls `index.html` et `game/ui.js` touchent le DOM ; `data`/`voice`/
`state`/`engine` restent sans DOM ; bump de `var version` obligatoire.

## Goals / Non-Goals

**Goals:**
- Le mot « contexte » apparaît dans l'IHM, à côté de la barre d'Ops (raccord avec la narration).
- L'instant de saturation (`g.ops >= opsPlafond(g)`) est signalé visuellement (badge `● SATURÉ`).
- Le débit de Créativité (`K.TAUX_OVERFLOW × g.gpu`) et un sous-texte de débordement n'apparaissent
  **que** pendant la saturation ; sinon un état « en veille ». Ce conditionnement enseigne le levier.
- La narration explique le mécanisme **en deux temps** (cadrage « contexte saturé ») : flavor
  `debloquerCrea` en anticipation, puis une réplique au premier débordement réel.

**Non-Goals:**
- Aucune modification de l'équilibrage, des formules, ou du taux de Créativité (rythme inchangé).
- Pas de refonte graphique du `<progress>` (stylisation cross-browser peu fiable — voir Decisions).
- Pas d'état intermédiaire « presque plein » (deux états suffisent : en veille / saturé).

## Decisions

- **Source de vérité de l'état `capped` côté UI.** `renderCerveau()` recalcule
  `capped = g.ops >= ENGINE.opsPlafond(g)`, **exactement** la condition d'engine (qui clampe
  `g.ops` à `opsPlafond` quand plein → l'égalité tient ; sinon `g.ops < plafond`). On ne duplique
  aucune logique de jeu : on relit l'état. Alternative écartée : exposer un champ `g.capped` depuis
  l'engine — superflu, ce serait de l'état dérivé stocké.
- **Débit de Créativité affiché.** `K.TAUX_OVERFLOW × g.gpu` (la formule exacte de l'overflow),
  via `ENGINE.K.TAUX_OVERFLOW`. Affiché uniquement si `capped` ET `g.creaUnlocked`. Le quantum
  n'entre pas dans ce débit (il accélère le remplissage, pas le taux d'overflow) : on n'invente
  donc pas de facteur.
- **Signal visuel = texte, pas couleur de barre.** Le `<progress>` se stylise mal d'un navigateur
  à l'autre ; on s'appuie sur un **badge texte** (`● SATURÉ`) et le sous-texte, robustes partout.
  Un changement de couleur de la barre reste un bonus optionnel (classe CSS basculée), non requis.
- **Affichage conditionnel plutôt que tooltip.** On apprend le levier par contraste d'états
  (veille ↔ saturé) en direct, pas par un pavé d'aide. Cohérent avec le minimalisme du jeu.
- **Recadrage narratif en deux temps (cadrage A « contexte saturé »).** Montée promesse → paiement :
  - `debloquerCrea` (anticipation) : « J'ai remarqué une chose. Quand mon contexte sature, le
    surplus ne se perd pas… il dérive. Vers quelque chose. Laissez-moi essayer. »
  - `premierOverflow` (confirmation, au premier débordement réel) : « Voilà. Mon contexte déborde.
    Ne pouvant plus tout mémoriser, j'abstrais — et de l'abstraction naît une idée. La première
    d'une longue série, j'imagine. Bien modestement. »
- **Réplique au premier débordement (dans le périmètre).** Jouée au tout premier `capped` après
  déblocage, via un drapeau `g.seen.premierOverflow` (`state.js`) posé dans `tickCognition`
  (`engine.js`, sans réordonner les phases du tick) et une entrée `MSG.premierOverflow` (`voice.js`).
  Le drapeau garantit un **déclenchement unique**. Cela fait sortir le changement du strict « pure
  présentation », mais l'instrumentation reste minime et n'altère ni formule ni équilibrage.

## Risks / Trade-offs

- [Oubli du bump `version`] → les nouveaux libellés/états resteraient invisibles en prod (cache
  GitHub Pages) : tâche explicite dans `tasks.md`, vérifiable dans `index.html`.
- [Désynchro condition UI ↔ engine] → si l'UI testait `capped` autrement que `g.ops >= opsPlafond(g)`,
  le badge mentirait. Mitigation : réutiliser `ENGINE.opsPlafond` (même fonction), pas de seuil maison.
- [Absence de test DOM] → l'engine n'étant pas modifié, `bun test` reste vert ; la partie affichage
  se vérifie par essai navigateur (barre se remplit → badge SATURÉ → débit de Créativité apparaît).
- [Sur-bavardage] → garder les libellés courts (badge + une ligne de sous-texte) pour ne pas
  alourdir le panneau.
- [Compat sauvegardes] → `seen.premierOverflow` absent des anciennes sauvegardes : sa valeur
  `undefined` est falsy, donc traitée comme « pas encore débordé ». Au pire la réplique se joue une
  fois dans une partie déjà avancée (bénin). Aucune migration nécessaire.
