## Context

Le terminal (`#journal-term`) est une bannière `position: fixed` en haut de page, contenant le
journal (`#journal`) et l'invite (`#journal-prompt`). Sa hauteur est réservée sous lui par
`ajusterOffsetTerminal()` (main.js), qui pose `body.style.paddingTop = term.offsetHeight`.

La réinitialisation existe déjà : `window.resetJeanClaude()` (main.js) pose `reinitEnCours = true`
(pour neutraliser la sauvegarde de fermeture `beforeunload`), met `depuisSave` très négatif (coupe
l'autosave périodique), appelle `SAVE.effacer()` puis `window.location.reload()`. Elle est
aujourd'hui déclenchée par un double-ÉCHAP confirmé via `window.confirm`, ou à la main en console.

Ce changement est **purement IHM** : exposer cette procédure existante derrière une affordance
visible (bouton discret → menu → confirmation native `window.confirm`), sans aucune nouvelle
mécanique de jeu ni modification de l'état `G`.

## Goals / Non-Goals

**Goals:**
- Un point d'entrée **découvrable mais discret** vers la réinitialisation, intégré au terminal.
- **Zéro régression** : le double-ÉCHAP et `window.resetJeanClaude()` continuent de fonctionner.
- **Réutiliser** la procédure de reset existante — aucune duplication de la logique destructrice.
- Respecter la séparation par couches : `data/voice/state/engine` restent sans DOM, donc intouchés.
- Accessibilité de base : bouton focalisable au clavier, activable Entrée/Espace ; menu fermable par
  Échap ; respect de `prefers-reduced-motion` (la confirmation native gère sa propre accessibilité).

**Non-Goals:**
- Pas d'autres entrées de menu (paramètres, sauvegarde manuelle, export…) : seul le reset est visé.
- Pas de changement d'équilibrage, pas de nouvelle constante `DATA.K`, pas de champ `G` nouveau.
- Pas de remplacement du double-ÉCHAP ni de sa `window.confirm` (ils restent en place).
- Pas de persistance de l'état « menu ouvert » (état purement éphémère de l'IHM, non sauvegardé).

## Decisions

### D1 — Le balisage statique vit dans `index.html`, le câblage dans `game/main.js`

Le bouton et le panneau de menu sont du **balisage statique** (ils ne dépendent pas de `G`) → ils
vont dans `index.html`, à l'intérieur de `#journal-term`. Le **câblage** des interactions
(ouvrir/fermer le menu, « Réinitialiser » → `window.confirm` → `resetJeanClaude()`) est posé **une
fois au boot** dans `game/main.js`, à côté du code de reset existant.

*Pourquoi main.js et pas ui.js ?* `ui.js` expose un `renderX()` par panneau, **piloté par `G`** ;
or ce menu n'est pas un panneau dérivé de l'état (il ne se redessine pas à chaque tick). main.js
détient déjà `resetJeanClaude()` (variable locale via la fermeture) **et** `ajusterOffsetTerminal()`
— y câbler le menu réutilise les deux directement, sans exposer de nouvelles globales ni dupliquer
la logique. *Alternative écartée :* un `renderMenu()` dans ui.js appelé à chaque render — inutile
(état non dérivé de `G`) et coûteux (re-rendu 60 fps d'un panneau statique).

### D2 — Le menu remplace le terminal par **bascule de visibilité dans le même cadre**

À l'ouverture : on masque `#journal` + `#journal-prompt` et on affiche un panneau `#terminal-menu`
**à l'intérieur de `#journal-term`** ; à la fermeture, l'inverse. Le menu occupe ainsi exactement
l'emplacement du terminal (même bannière fixée, même style console), conformément à « prend la place
du terminal ». On appelle `ajusterOffsetTerminal()` après chaque bascule, car la hauteur du cadre
peut changer → le `padding-top` du body suit, rien n'est recouvert.

*Alternative écartée :* un overlay plein écran indépendant — ça ne « prend pas la place du
terminal » et duplique la gestion de l'offset.

### D3 — Confirmation par `window.confirm` natif (pas de modal maison)

La confirmation est la **boîte de dialogue native** `window.confirm(...)` (OK / Annuler) — le même
mécanisme que le double-ÉCHAP existant. Le reset n'est **jamais** déclenché par le seul clic
« Réinitialiser » : il faut valider (OK) ; Annuler laisse la partie intacte.

*Pourquoi le natif plutôt qu'une modal maison ?* Une modal DOM stylée ajoute du balisage, du CSS
(overlay, focus-trap, gestion Échap, `prefers-reduced-motion`) et des pièges de masquage
(`[hidden]` battu par `display:flex`) pour un bénéfice purement cosmétique. `window.confirm` est
**léger, déjà éprouvé dans ce jeu** (double-ÉCHAP), bloquant par nature (impossible de réinitialiser
sans répondre) et cohérent. La logique destructrice reste la fonction existante (pas de
duplication). *Alternative écartée :* modal maison — rejetée pour sa complexité au regard du gain.

### D4 — Discrétion par opacité, lisibilité au survol/focus

Le bouton est rendu discret via une **faible opacité** au repos, portée à pleine opacité sur
`:hover` et `:focus-visible`. C'est un levier CSS simple, sans JS, qui respecte la demande « bouton
discret en transparence » tout en gardant l'accessibilité (focus clavier visible).

### D5 — Interaction avec l'effet « machine à écrire » du journal

Le typewriter (`taperCar`/`typeFile` dans ui.js) continue d'écrire dans `#journal` même masqué : à
la réouverture du terminal, le journal est simplement re-révélé dans son état courant. Aucune
synchronisation spéciale n'est requise — masquer un conteneur n'interrompt pas les `setTimeout`.

## Risks / Trade-offs

- **[Saut de hauteur du cadre à l'ouverture/fermeture]** → on rappelle `ajusterOffsetTerminal()`
  après chaque bascule pour garder le `padding-top` du body cohérent.
- **[Reset accidentel]** → double garde-fou : le clic « Réinitialiser » n'a aucun effet propre, seule
  la validation (OK) de `window.confirm` déclenche `resetJeanClaude()` ; Annuler ne fait rien.
- **[Régression du flux de reset existant]** → on **réutilise** `window.resetJeanClaude()` sans la
  modifier ; double-ÉCHAP et appel console restent inchangés (couverts par `bun test` + smoke
  manuel).
- **[Oubli du cache-busting]** → tâche dédiée « bumper `var version` » dès qu'un `game/*.js` change.
- **[Accessibilité incomplète]** → bouton focalisable + libellé accessible, menu fermable au clavier
  (Échap) ; la confirmation native gère sa propre accessibilité ; animations soumises à
  `prefers-reduced-motion`.

## Migration Plan

Changement additif et purement front statique : aucun schéma de données, aucune migration de
sauvegarde. Déploiement par push `main` (GitHub Pages). Rollback = revert du commit (le balisage et
le câblage sont isolés ; le reste du jeu est inchangé).

## Open Questions

- Aucune bloquante. (Le wording exact du bouton/menu et le détail visuel seront calés à
  l'implémentation, sans impact sur les exigences.)
