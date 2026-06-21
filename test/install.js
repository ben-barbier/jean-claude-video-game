/* Test de déblocage / installation : verrouille le bug « tokens & agents révélés en début
 * de partie alors que Jean-Claude n'est pas installé ».
 *
 * Cause : l'état neuf démarre avec gpu/mem = 1 (commit « 1 CPU + 1 mémoire »). Un code
 * d'amorçage prenait alors une partie NEUVE (gpu > 0) pour une partie déjà « JC installé »
 * et révélait tokens/agents au démarrage ; de plus la boucle cognitive (gpu > 0) accumulait
 * des Ops avant l'installation.
 *
 * Ce test exerce le VRAI code (nouvelEtat + ENGINE.majDeblocages/tick + SAVE.charger avec
 * un faux localStorage), pas une copie de la logique — c'est le chaînon que les autres
 * tests ne couvraient pas. */
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
const { ENGINE, SAVE, DATA } = ctx;
const K = DATA.K;
const CLE = 'jeanclaude_save_v1';

let ok = true;
function check(cond, msg) { if (!cond) { ok = false; console.log('  ✗ ÉCHEC: ' + msg); } else { console.log('  ✓ ' + msg); } }

/* ── A. Partie NEUVE : rien d'« IA » n'est révélé tant que JC n'est pas installé ── */
let G = ctx.nouvelEtat();
ENGINE.majDeblocages(G);
check(G.jcInstalled === false, 'partie neuve : Jean-Claude non installé');
check(G.gpu === 1 && G.mem === 1, 'partie neuve : dotation initiale 1 GPU / 1 Mémoire (pré-allouée)');
check(G.seen.tokens === false, 'partie neuve : panneau Tokens CACHÉ (bug si visible)');
check(G.seen.agents === false, 'partie neuve : panneau Agents CACHÉ (bug si visible)');
check(ENGINE.acheterAgent(G) === false, 'partie neuve : recruter un agent impossible avant install');

/* ── B. 20 lignes écrites SANS installer : le bouton « Installer » apparaît, pas le reste ── */
for (let i = 0; i < K.JC_INSTALL_SEUIL; i++) { ENGINE.ecrireLigne(G); }
ENGINE.majDeblocages(G);
check(G.seen.jcDispo === true, '20 lignes : bouton « Installer Jean-Claude » révélé');
check(G.seen.tokens === false && G.seen.agents === false,
  '20 lignes (sans install) : tokens/agents toujours cachés');

/* ── C. Aucune Op ne s'accumule avant l'installation (verrouille le gating de tickCognition) ── */
let H = ctx.nouvelEtat();
ENGINE.tick(H, K.DT);
ENGINE.tick(H, K.DT);
check(H.ops === 0, 'aucune Op accumulée avant l’installation de Jean-Claude (gpu=1 mais cerveau inactif)');

/* ── D. Après installation : tokens + agents sont révélés ───────── */
G.eur = Math.max(G.eur, K.JC_INSTALL_COUT);
check(ENGINE.installerJC(G) === true, 'installation de Jean-Claude réussie (≥20 lignes + 10 €)');
ENGINE.majDeblocages(G);
check(G.seen.tokens === true, 'après install : panneau Tokens révélé');
check(G.seen.agents === true, 'après install : panneau Agents révélé');

/* ── E. Aller-retour de sauvegarde : une partie non installée le reste au rechargement ──
 * (Aucune migration de sauvegarde : projet en phase de dev. charger() = simple fusion.) */
delete store[CLE];
check(SAVE.charger() === null, 'aucune save : charger() renvoie null (→ partie neuve)');

let frais = ctx.nouvelEtat();
frais.lignesProduites = 60; frais.locLivrees = 60; frais.eur = 30; // a écrit/vendu, mais pas installé JC
check(SAVE.sauver(frais) === true, 'sauvegarde d’une partie non installée');
let recharge = SAVE.charger();
check(recharge.jcInstalled === false, 'rechargement : Jean-Claude toujours non installé');
ENGINE.majDeblocages(recharge);
check(recharge.seen.tokens === false && recharge.seen.agents === false,
  'rechargement d’une partie non installée : tokens/agents toujours cachés');

console.log('\n' + (ok ? 'OK : tokens/agents restent cachés avant l’installation (au démarrage et au rechargement).'
                        : 'ÉCHECS détectés (voir ci-dessus).'));
process.exit(ok ? 0 : 1);
