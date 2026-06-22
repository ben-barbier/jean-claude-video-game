## Why

Aujourd'hui, le seul moyen de repartir de zéro est le raccourci « double-ÉCHAP » (peu
découvrable) ou `window.resetJeanClaude()` en console (réservé au développement). Un joueur qui
veut recommencer sa partie n'a aucune affordance visible. On ajoute un point d'entrée discret,
toujours à portée de main dans le terminal, sans alourdir l'IHM ni casser l'esthétique « console ».

## What Changes

- Ajout d'un **bouton discret** (en transparence) dans le coin **haut-droit** du terminal
  (`#journal-term`). Au repos il est estompé ; il devient lisible au survol et au focus clavier.
- Au clic, ce bouton **ouvre un menu qui prend la place du terminal** : le contenu habituel
  (journal + prompt) est masqué et remplacé, dans le même cadre, par un panneau d'options.
- Le menu propose un bouton **« Réinitialiser la partie »** et un moyen de **revenir au terminal**
  (fermer le menu) sans rien réinitialiser.
- Le clic sur « Réinitialiser » ouvre une **boîte de dialogue de confirmation native**
  (`window.confirm`, OK / Annuler) qui vérifie le choix du joueur avant toute action destructive —
  même mécanisme que le double-ÉCHAP existant. La confirmation MUST réutiliser la réinitialisation
  existante (`window.resetJeanClaude()` : neutralise l'autosave et la sauvegarde de fermeture, efface
  le localStorage, recharge la page).
- Aucune nouvelle mécanique de jeu, aucune constante d'équilibrage, aucun changement d'état `G`.

## Capabilities

### New Capabilities
- `menu-reinitialisation`: bouton discret du terminal ouvrant un menu (en lieu et place du
  terminal) qui propose la réinitialisation de la partie, confirmée par une boîte de dialogue
  native (`window.confirm`).

### Modified Capabilities
<!-- Aucune : le comportement de réinitialisation existant est réutilisé tel quel, pas modifié. -->

## Impact

- `index.html` : balisage du bouton et du panneau de menu (dans `#journal-term`) + styles CSS
  (transparence au repos, état survol/focus, respect de `prefers-reduced-motion`). Bumper
  `var version` (cache-busting GitHub Pages).
- `game/main.js` (couche DOM, amorçage) : câblage des interactions au boot — ouvrir/fermer le menu,
  « Réinitialiser » → `window.confirm(...)` puis, si confirmé, `window.resetJeanClaude()` ; recalcul
  de l'offset du terminal via `ajusterOffsetTerminal()` quand le menu change la hauteur du cadre.
  Réutilise la logique de reset déjà présente (pas de duplication).
- **Hors périmètre** : `game/data.js`, `game/voice.js`, `game/state.js`, `game/engine.js` ne sont
  pas touchés (aucun DOM, aucune logique pure modifiée) → la testabilité par `vm` reste intacte.
