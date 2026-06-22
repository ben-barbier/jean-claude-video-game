## Why

La **Créativité** est entièrement implémentée mais **muette** : `tickCognition` (`game/engine.js`)
la fait couler quand le pool d'Opérations atteint son plafond (`capped`), au taux
`TAUX_OVERFLOW × gpu`. Or à l'écran, rien ne raconte ce lien :

1. La barre d'Ops (`#ops-bar`, `index.html`) se remplit jusqu'au bord… et **rien ne change** au
   moment précis où la Créativité commence à émerger. Le moment-héros (saturation → débordement)
   passe inaperçu.
2. Le mot **« contexte »** — pivot de la narration retenue — **n'apparaît jamais** dans l'IHM, qui
   ne parle que d'« Opérations ». La voix de Jean-Claude évoquera un concept que l'écran ne nomme pas.
3. Le flavor du projet `debloquerCrea` (`game/data.js`) annonce l'**événement**
   (« J'ai eu une idée. La première. ») mais pas le **mécanisme**.

Conséquence : le joueur accumule de la Créativité **par accident**, sans comprendre le levier
(garder le contexte saturé). On corrige cela côté **présentation** et **narration**, sans toucher
à la mécanique.

## What Changes

- **Recadrer la barre d'Ops comme la fenêtre de contexte** : libellé `Contexte (Opérations)` pour
  que le mot « contexte » soit visible et raccorde l'IHM à la voix de l'IA.
- **Signaler la saturation** : un badge `● SATURÉ` apparaît dès que `g.ops` atteint le plafond
  (`g.ops >= opsPlafond(g)`), et disparaît en dessous.
- **Faire découler la Créativité du débordement** : le débit `▲ +X /s` (avec
  `X = K.TAUX_OVERFLOW × g.gpu`) et le sous-texte « le contexte déborde → des idées émergent »
  ne s'affichent **que** pendant la saturation. Hors saturation : état « en veille — contexte non
  saturé », sans débit. C'est cet affichage conditionnel qui **enseigne le levier**.
- **Recadrage narratif en deux temps (cadrage « contexte saturé »)** :
  - Le flavor de `debloquerCrea` passe en **anticipation** (la promesse) : l'IA pressent que le
    surplus d'un contexte saturé « dérive » vers quelque chose.
  - Une **réplique au tout premier débordement** (la confirmation, en direct) marque l'instant où le
    contexte sature pour la première fois et explicite l'émergence (abstraction → idée).
- **Aucune mécanique de jeu / équilibrage modifiée** : l'affichage (`capped`, débit) est **dérivé de
  `G`** via l'`ENGINE` existant (`opsPlafond`, `K.TAUX_OVERFLOW`). La seule logique ajoutée est une
  **instrumentation narrative minime** — un drapeau `g.seen.premierOverflow` et un déclenchement
  vocal dans `tickCognition` (sans réordonner les phases du tick), ni formule ni constante touchée.

## Capabilities

### New Capabilities

- `lisibilite-creativite`: l'IHM de la boucle cognitive rend **visible et compréhensible** le lien
  « contexte saturé → Créativité » — elle nomme le contexte, signale l'état de saturation, et fait
  apparaître le débit de Créativité uniquement pendant le débordement ; la narration adopte le même
  cadrage.

### Modified Capabilities

<!-- Aucune. La mécanique de Créativité (engine) est inchangée ; on ajoute une couche de lisibilité
     et un recadrage de texte. -->

## Impact

- **`index.html`** (DOM) : dans `#bloc-cognitif`, recadrer le libellé de la barre d'Ops et ajouter
  les éléments d'état (badge saturation, débit de Créativité, sous-texte). Bump `var version`
  (cache-busting GitHub Pages) car `game/*.js` change.
- **`game/ui.js`** (DOM) : `renderCerveau()` calcule `capped = g.ops >= ENGINE.opsPlafond(g)` et
  pilote badge / débit (`ENGINE.K.TAUX_OVERFLOW × g.gpu`) / sous-texte. Réutilise les helpers
  existants (`txt`, `montre`/`actif`, `f`, `big`).
- **`game/data.js`** (texte, sans DOM) : flavor de `debloquerCrea` recadré en **anticipation**.
- **`game/state.js`** (état, sans DOM) : nouveau drapeau `seen.premierOverflow` dans `nouvelEtat()`.
- **`game/engine.js`** (logique pure, sans DOM) : dans `tickCognition`, au premier débordement après
  déblocage, poser le drapeau et déclencher `VOICE.event(g, 'premierOverflow')` (ordre des phases
  inchangé).
- **`game/voice.js`** (texte, sans DOM) : entrée `MSG.premierOverflow`.
- **`docs/specifications.md`** : aligner §3.4 (et §4.3 au besoin) sur le cadrage retenu.
- **`test/`** : un test couvre le déclenchement **unique** de `premierOverflow` (drapeau posé +
  entrée journal au premier `capped`, pas de re-déclenchement) ; `bun test` doit rester au vert.
- Équilibrage : **neutre** (aucune constante ni formule de gameplay modifiée) — à confirmer via
  `bun test` (vert) et `node test/cadence.js` (rythme sans trou ≥ 2 min, inchangé).
