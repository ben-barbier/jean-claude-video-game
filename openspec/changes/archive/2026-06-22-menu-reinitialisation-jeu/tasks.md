## 1. Balisage & styles (`index.html`)

- [x] 1.1 Ajouter dans `#journal-term` un **bouton discret** ancré en haut-droit (élément
      focalisable, libellé accessible type « Menu », `aria-label`), positionné en absolu par-dessus
      le coin du terminal.
- [x] 1.2 Ajouter un panneau `#terminal-menu` (masqué par défaut) à l'intérieur de `#journal-term`,
      contenant un bouton **« Réinitialiser la partie »** et un bouton **« Revenir au terminal »**.
- [x] 1.3 Confirmation par **boîte de dialogue native** `window.confirm` (OK / Annuler) avec un
      message explicite sur la perte de progression — pas de modal maison (cf. design D3).
- [x] 1.4 Styles CSS : bouton **en transparence** au repos (faible opacité), pleine opacité sur
      `:hover` et `:focus-visible` ; mise en page du menu dans le cadre du terminal ; respect de
      `@media (prefers-reduced-motion: reduce)`. Override `[hidden]` ajouté pour `#journal-prompt`
      (son `display:flex` l'emporterait sinon sur le masquage).

## 2. Câblage des interactions (`game/main.js`)

- [x] 2.1 Au boot, câbler le clic sur le bouton discret pour **ouvrir le menu** : masquer `#journal`
      et `#journal-prompt`, afficher `#terminal-menu`, puis appeler `ajusterOffsetTerminal()`.
- [x] 2.2 Câbler le bouton **« Revenir au terminal »** pour **fermer le menu** : ré-afficher journal
      et invite, masquer `#terminal-menu`, puis rappeler `ajusterOffsetTerminal()`. (Le bouton
      discret fait aussi office de bascule ouvrir/fermer.)
- [x] 2.3 Câbler **« Réinitialiser la partie »** pour ouvrir `window.confirm(...)` — aucun effet
      destructeur tant que le joueur n'a pas validé.
- [x] 2.4 Sur validation (OK) → appeler la procédure existante `window.resetJeanClaude()` (réutilisée
      telle quelle, sans duplication) ; sur **Annuler** → ne rien faire (partie intacte).
- [x] 2.5 Vérifier la non-régression : le double-ÉCHAP et `window.resetJeanClaude()` (console)
      fonctionnent toujours à l'identique. (Le handler Échap du menu est en phase de **capture** +
      `stopImmediatePropagation` : il ne neutralise le double-ÉCHAP que lorsque le menu est ouvert ;
      sinon le double-ÉCHAP historique reste intact.)

## 3. Cache-busting

- [x] 3.1 Bumper `var version` dans `index.html` (cache-busting GitHub Pages), car `game/main.js`
      a changé. (`'41'` → `'42'`)

## 4. Vérification

- [x] 4.1 `bun test` au vert (40 pass / 0 fail).
- [x] 4.2 `node test/cadence.js` : rythme sans trou ≥ 2 min (plus gros trou 1m18s, 0 trou ≥ 2 min —
      inchangé, comme attendu pour un changement purement IHM).
- [x] 4.3 Vérification statique (l'environnement n'a pas de navigateur) : `node --check game/main.js`
      OK ; correspondance des `id` entre le câblage JS et le balisage HTML ; piège `[hidden]` couvert
      (`#journal-prompt`). **Reste à confirmer visuellement** par le joueur en ouvrant `index.html`
      (transparence du bouton, bascule menu/terminal, `confirm` Annuler/OK, offset sous le terminal).
