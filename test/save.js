/* Test de sauvegarde : verrouille le correctif du bug critique de fusion.
 * Vérifie que projetsFaits/projetsAchats survivent à un aller-retour save→load,
 * et qu'une sauvegarde corrompue ne casse pas l'état (typage défensif). */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

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
['data.js', 'voice.js', 'state.js', 'engine.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game', f), 'utf8'), ctx, { filename: f });
});
const { SAVE } = ctx;
const CLE = 'jeanclaude_save_v1';

let ok = true;
function check(cond, msg) { if (!cond) { ok = false; console.log('  ✗ ÉCHEC: ' + msg); } else { console.log('  ✓ ' + msg); } }

/* ── 1. Aller-retour d'une partie avancée ─────────────────────── */
let G = ctx.nouvelEtat();
G.eur = 12345.6;
G.projetsFaits = { auto1: true, serieA: true, debloquerCrea: true };
G.projetsAchats = { corrigerBug: 3, grandRefactor: 2 };
G.mult.agentDebit = 1.25;
G.mult.tokenCost = 0.5;
G.seen.confiance = true;
G.creaUnlocked = true;
G.confianceTotale = 7;
G.journal = [{ t: 'bonjour' }, { t: 'au revoir' }];

check(SAVE.sauver(G) === true, 'sauvegarde réussie');
const G2 = SAVE.charger();
check(G2 !== null, 'chargement réussi');
check(G2.projetsFaits.auto1 === true && G2.projetsFaits.serieA === true && G2.projetsFaits.debloquerCrea === true,
  'projetsFaits préservé (était vidé avant le correctif)');
check(G2.projetsAchats.corrigerBug === 3 && G2.projetsAchats.grandRefactor === 2,
  'projetsAchats préservé (compteurs de répétables)');
check(Math.abs(G2.eur - 12345.6) < 1e-9, 'eur préservé');
check(G2.mult.agentDebit === 1.25 && G2.mult.tokenCost === 0.5, 'multiplicateurs préservés (clés fixes)');
check(G2.seen.confiance === true && G2.creaUnlocked === true, 'drapeaux préservés');
check(Array.isArray(G2.journal) && G2.journal.length === 2, 'journal préservé (tableau)');

// Anti-exploit : un projet non répétable déjà fait ne doit pas être re-achetable après reload.
check(ctx.ENGINE.projetAchetable(G2, ctx.DATA.byId.serieA) === false,
  'serieA non re-achetable après reload (exploit fermé)');

/* ── 2. Migration douce : champ ajouté après la sauvegarde ─────── */
const partielle = JSON.parse(store[CLE]);
delete partielle.prodBurstTimer; // simule une vieille save sans le nouveau champ
store[CLE] = JSON.stringify(partielle);
const G2b = SAVE.charger();
check(typeof G2b.prodBurstTimer === 'number', 'champ neuf absent de la save → valeur par défaut conservée');

/* ── 3. Sauvegarde corrompue : ne doit pas casser le moteur ───── */
store[CLE] = JSON.stringify({
  mult: null,            // tenterait de casser g.mult.*
  journal: 'oops',       // mauvais type
  eur: 'beaucoup',       // mauvais type
  prix: null,            // null interdit
  projetsFaits: { x: true },
});
const G3 = SAVE.charger();
check(G3.mult && typeof G3.mult === 'object', 'mult=null rejeté → objet par défaut conservé');
check(Array.isArray(G3.journal), 'journal de mauvais type rejeté → tableau conservé');
check(typeof G3.eur === 'number', 'eur de mauvais type rejeté → nombre conservé');
check(typeof G3.prix === 'number', 'prix=null rejeté → nombre conservé');
check(G3.projetsFaits.x === true, 'dict dynamique valide copié malgré le reste corrompu');
// le moteur doit tourner sur cet état réparé sans planter
try { ctx.ENGINE.tick(G3, ctx.DATA.K.DT); check(true, 'tick OK sur état réparé'); }
catch (e) { check(false, 'tick a planté sur état réparé: ' + e.message); }

console.log('\n' + (ok ? 'OK : sauvegarde robuste, exploit fermé, corruption absorbée.' : 'ÉCHECS détectés.'));
process.exit(ok ? 0 : 1);
