## 1. Markup (index.html)

- [x] 1.1 Dans `#bloc-cognitif`, recadrer le libellé de la barre d'Ops : `Opérations :` →
  `Contexte (Opérations)`, suivi d'un `<span id="ops-etat">` (vide par défaut) pour le badge
  `● SATURÉ`.
- [x] 1.2 Sur la ligne `#bloc-crea`, ajouter `<span id="crea-debit">` (le `▲ +X /s`) et
  `<span id="crea-etat">` (le sous-texte « le contexte déborde… » / « en veille… »).
- [x] 1.3 Bumper `var version` (cache-busting GitHub Pages). → `36` → `37`.

## 2. Affichage (game/ui.js)

- [x] 2.1 Dans `renderCerveau()`, calculer `var plaf = ENGINE.opsPlafond(g);` et
  `var capped = plaf > 0 && g.ops >= plaf;` (même condition que `tickCognition`).
- [x] 2.2 Piloter `#ops-etat` : `● SATURÉ` si `capped`, sinon chaîne vide.
- [x] 2.3 Piloter `#crea-debit` : si `capped`, afficher
  `▲ +<f(ENGINE.K.TAUX_OVERFLOW * g.gpu, 0)> /s` ; sinon chaîne vide.
- [x] 2.4 Piloter `#crea-etat` : `le contexte déborde → des idées émergent` si `capped`, sinon
  `en veille — contexte non saturé`.
- [x] 2.5 `#crea-debit`/`#crea-etat` restent masqués tant que `g.creaUnlocked` est faux : ils sont
  enfants de `#bloc-crea`, déjà piloté par `montre('bloc-crea', g.creaUnlocked)`.

## 3. Narration (game/data.js)

- [x] 3.1 Remplacer le `flavor` du projet `debloquerCrea` par la version **anticipation**
  (voir `design.md` → Decisions).

## 4. Documentation (docs/specifications.md)

- [x] 4.1 Aligner §3.4 (et §4.3) sur le cadrage « contexte saturé » et l'affichage conditionnel du
  débit + la réplique unique de 1er débordement.

## 5. Réplique au premier débordement (game/state.js, game/engine.js, game/voice.js)

- [x] 5.1 Ajouter `seen.premierOverflow: false` dans `nouvelEtat()` (`game/state.js`).
- [x] 5.2 Dans `tickCognition` (`game/engine.js`), quand `capped` ET `g.creaUnlocked` ET
  `!g.seen.premierOverflow`, poser le drapeau et appeler `VOICE.event(g, 'premierOverflow')` — sans
  réordonner les phases du tick.
- [x] 5.3 Ajouter l'entrée `MSG.premierOverflow` dans `game/voice.js` (ton affable & faussement
  humble) : voir `design.md` → Decisions.

## 6. Vérification

- [x] 6.1 Nouveau test `test/creativite-overflow.test.js` (via `test/harness.js`) : au premier
  `capped` avec Créativité débloquée, `seen.premierOverflow` passe à `true` et une entrée est ajoutée
  au journal ; aucun re-déclenchement ensuite ; et aucun débordement si `creaUnlocked` est faux.
- [x] 6.2 `bun test` au vert. → 31 pass / 0 fail (dont les 2 nouveaux cas).
- [x] 6.3 `node test/cadence.js` : rythme **inchangé**. → plus gros trou 1m21s, 0 trou ≥ 2 min.
- [ ] 6.4 Essai navigateur : remplir la barre de contexte → vérifier l'apparition du badge
  `● SATURÉ`, du débit `▲ +X /s` et du sous-texte ; vérifier la bascule en « en veille » quand on
  dépense des Ops (projets) et que le pool repasse sous le plafond ; vérifier que la réplique de
  premier débordement n'apparaît **qu'une fois**. _(Vérif statique faite : ids markup ↔ ui.js
  concordants, formule du débit = `K.TAUX_OVERFLOW × gpu` identique à l'engine ; confirmation
  visuelle à faire dans le navigateur.)_
