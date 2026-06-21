/* test/harness.js — Chargeur de test partagé (Bun & Node).
 *
 * Les fichiers game/*.js sont des scripts « navigateur » à variables globales
 * (`var DATA = …`, `var ENGINE = …`) qui se référencent mutuellement. On les charge
 * donc dans un contexte vm isolé où ces `var` deviennent des globales partagées,
 * avec un faux localStorage en mémoire pour exercer la sauvegarde.
 *
 * loadGame() renvoie le contexte (DATA, ENGINE, SAVE, VOICE, nouvelEtat, …) plus son
 * `store` (l'objet derrière le faux localStorage). Chaque appel crée un contexte NEUF
 * et isolé : un test ne fuit jamais d'état vers un autre. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const GAME_DIR = path.join(__dirname, '..', 'game');
// Ordre = ordre de chargement des <script> dans index.html (ui.js/main.js touchent le DOM).
const FICHIERS = ['data.js', 'voice.js', 'state.js', 'engine.js'];
const CLE = 'jeanclaude_save_v1';

function loadGame() {
  const store = {};
  const ctx = {
    Math, console, JSON, Number, Array, Object, isFinite, parseFloat,
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { store[k] = String(v); },
      removeItem: function (k) { delete store[k]; },
    },
  };
  vm.createContext(ctx);
  FICHIERS.forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(GAME_DIR, f), 'utf8'), ctx, { filename: f });
  });
  ctx.store = store; // accès direct au localStorage simulé (tests de sauvegarde)
  return ctx;
}

module.exports = { loadGame: loadGame, CLE: CLE };
