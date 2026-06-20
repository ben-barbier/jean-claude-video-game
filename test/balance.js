/* Banc d'équilibrage : rejoue la partie avec un joueur COMPÉTENT (pilotage du prix
 * par la demande) et mesure le rythme vs les cibles de la spec (§4.7).
 * Permet de comparer plusieurs jeux de constantes (override de DATA.K).
 *
 * Usage : node test/balance.js            (table comparative de configs)
 *         node test/balance.js detail     (déroulé détaillé de la config "ACTUEL") */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function charger() {
  const ctx = { Math, console, JSON, Number, Array, Object, isFinite, parseFloat };
  vm.createContext(ctx);
  ['data.js', 'voice.js', 'state.js', 'engine.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game', f), 'utf8'), ctx, { filename: f });
  });
  return ctx;
}
const CTX = charger();
const DEFAUTS = Object.assign({}, CTX.DATA.K);
let lastG = null; // dernier état simulé (pour diagnostic)

const PRIO = [
  'debloquerCrea', 'promptEng', 'linter', 'tests', 'cacheGen', 'compression', 'typage', 'cicd', 'distillation',
  'auto1', 'pitch', 'auto2', 'rlhf', 'jingle', 'charte', 'auto3', 'comite', 'quantum', 'trading',
  'mega', 'megaOpt', 'modelisation', 'autoTournoi', 'theorieEsprit', 'negoTarifs', 'faim', 'openSource',
  'serieA', 'serieB', 'serieC', 'podcast', 'volition', 'agi',
];

/* Politique d'un joueur compétent, appliquée chaque tick. */
function step(ctx, G, clicksPerSec, journal) {
  const { ENGINE, DATA } = ctx; const K = DATA.K;
  // 1. Amorçage au clic tant qu'on n'a pas démarré l'automatisation.
  let manualRate = 0;
  // Clic gratuit : amorçage avant l'IA, ET secours si on est à sec de tokens (un vrai
  // joueur cliquerait pour se sortir d'un blocage — le clic ne coûte rien).
  const aSec = G.jcInstalled && G.tokens < ENGINE.coutTokenLigne(G)
    && G.eur < G.prixLot && G.locStock < 3;
  if (G.agents < 2 || aSec) {
    manualRate = clicksPerSec;
    G._acc = (G._acc || 0) + manualRate * K.DT;
    while (G._acc >= 1) { ENGINE.ecrireLigne(G); G._acc -= 1; journal.clics++; } // gratuit
  }
  // Installer Jean-Claude dès que possible (débloque tokens / auto-codeurs / …).
  if (!G.jcInstalled && G.lignesProduites >= K.JC_INSTALL_SEUIL) { ENGINE.installerJC(G); }
  // 2. Prix optimal : viser une demande un peu au-dessus de la production pour écouler.
  const Pauto = ENGINE.prodBruteParS(G);
  const cible = Math.max(0.6, (Pauto + manualRate) * 1.15);
  const mh = ENGINE.multHype(G), q = ENGINE.qualite(G), burst = G.burstTimer > 0 ? K.BURST_MULT : 1;
  G.prix = ENGINE.clamp(K.PRIX_REF * Math.pow(K.BASE_DEMANDE * mh * q * burst / cible, 1 / K.ELASTICITE), K.PRIX_MIN, K.PRIX_MAX);
  // 3. Réserve de tokens : garder ~45 s d'autonomie, racheter des lots sous ce seuil.
  const conso = Pauto * ENGINE.coutTokenLigne(G);
  const runway = conso > 0 ? G.tokens / conso : Infinity;
  if (G.seen.tokensAchat && runway < 45 && G.eur >= G.prixLot) { ENGINE.acheterLot(G); }
  const reserve = G.jcInstalled ? G.prixLot * 2.5 : 0; // garde du cash pour les tokens dès l'IA
  // 4. Premier agent : amorce l'automatisation.
  if (G.seen.agents && G.agents === 0 && G.eur >= ENGINE.coutAgent(G) + reserve) { ENGINE.acheterAgent(G); }
  // 5. Hype : moteur de croissance (démultiplie la demande), dès que c'est abordable.
  if (G.seen.hype && G.hypeNiveau < 16 && G.eur >= ENGINE.coutHype(G) * 1.2 + reserve) {
    ENGINE.acheterHype(G); if (!journal.hype1) { journal.hype1 = journal.t; }
  }
  // 6. Plus d'agents / mégas si le stock s'écoule bien (ne pas surproduire).
  const ecoule = G.locStock < 150;
  if (G.seen.agents && ecoule && G.agents < 250 && G.eur >= ENGINE.coutAgent(G) + reserve) { ENGINE.acheterAgent(G); }
  if (G.megaUnlocked && ecoule && G.megas < 120 && G.eur >= ENGINE.coutMega(G) + reserve) { ENGINE.acheterMega(G); }
  // 7. Allocation de Confiance : un peu plus de Mémoire (plafond) que de GPU (débit).
  if (G.seen.confiance) {
    while (G.confianceLibre > 0) {
      if (G.mem === 0 || G.gpu > G.mem) { ENGINE.allouerConfiance(G, 'mem'); }
      else { ENGINE.allouerConfiance(G, 'gpu'); }
    }
  }
  // 8. Gestion de la dette via le slider agents (ne brûle pas d'Ops).
  const dn = ENGINE.detteNorm(G);
  G.partRefacto = dn > 0.55 ? 0.6 : (dn > 0.35 ? 0.3 : 0);
  // 9. Projets par priorité.
  for (let i = 0; i < PRIO.length; i++) {
    const p = DATA.byId[PRIO[i]];
    if (p && ENGINE.projetAchetable(G, p)) { ENGINE.acheterProjet(G, PRIO[i]); }
  }
  // 10. Tournois : seulement pour réunir ~15 Yomi (→ theorieEsprit), puis stop
  //     (sinon on draine les Ops qu'on veut banquer pour volition/agi).
  if (G.tournoisUnlocked && !G.projetsFaits.theorieEsprit && G.yomi < 20 && G.ops >= K.TOURNOI_COUT_OPS) {
    ENGINE.jouerTournoi(G);
  }
  // 11. Déploiement final dès que possible.
  if (G.agiDiscovered && !G.deployed) { ENGINE.deployer(G); }
}

function runGame(override, opts) {
  opts = opts || {};
  const clicksPerSec = opts.clicksPerSec || 3;
  const maxMin = opts.maxMin || 240;
  Object.assign(CTX.DATA.K, DEFAUTS, override || {});
  const K = CTX.DATA.K;
  const G = CTX.nouvelEtat();
  const journal = { t: 0, clics: 0, hype1: 0 };
  const M = {};
  const jalon = (k) => { if (!M[k]) { M[k] = Math.round(journal.t); } };

  const ticks = (maxMin * 60) / K.DT;
  let dernierLivrees = 0, sansProgres = 0, softlock = false;
  for (let i = 0; i < ticks; i++) {
    journal.t = i * K.DT;
    step(CTX, G, clicksPerSec, journal);
    CTX.ENGINE.tick(G, K.DT);

    if (G.agents >= 1) jalon('agent1');
    if (G.seen.hype) jalon('hypeVue');
    if (G.seen.confiance) jalon('cognitif');
    if (G.creaUnlocked) jalon('crea');
    if (G.megaUnlocked) jalon('mega');
    if (G.bourseUnlocked) jalon('bourse');
    if (G.quantumUnlocked) jalon('quantum');
    if (G.tournoisUnlocked) jalon('tournois');
    if (G.projetsFaits.volition) jalon('volition');
    if (G.seen.agi) jalon('agi');
    if (G.deployed) { jalon('deploy'); break; }

    // Détection de blocage : pas de ventes pendant 180 s.
    if (i % 10 === 0) {
      if (G.locLivrees - dernierLivrees < 0.5) { sansProgres += 1; } else { sansProgres = 0; }
      dernierLivrees = G.locLivrees;
      if (sansProgres > 180) { softlock = true; break; }
    }
  }
  lastG = G;
  return {
    M, journal, softlock,
    fin: {
      t: Math.round(journal.t), eur: G.eur, locLivrees: G.locLivrees,
      agents: G.agents, megas: G.megas, gpu: G.gpu, mem: G.mem,
      opsPlaf: CTX.ENGINE.opsPlafond(G), crea: G.creativite, conf: G.confianceTotale,
      detteNorm: CTX.ENGINE.detteNorm(G), hypeNiv: G.hypeNiveau,
      projets: Object.keys(G.projetsFaits).length, deployed: G.deployed,
    },
  };
}

function mmss(s) { return s == null ? '—' : (Math.floor(s / 60) + 'm' + String(s % 60).padStart(2, '0')); }

/* ── Mode détaillé ─────────────────────────────────────────────── */
if (process.argv[2] === 'detail') {
  const r = runGame({}, {}); // defaults livrés
  const G = lastG;
  console.log('=== Déroulé (config TUNÉE) ===');
  console.log('manquants :', CTX.DATA.PROJETS.filter(p => !p.repeatable && !G.projetsFaits[p.id]).map(p => p.id).join(', ') || 'aucun');
  console.log('ops/plafond :', Math.round(G.ops), '/', CTX.ENGINE.opsPlafond(G),
    '| detteNorm :', (CTX.ENGINE.detteNorm(G) * 100).toFixed(0) + '%',
    '| yomi :', G.yomi.toFixed(0), '| gpu/mem :', G.gpu, '/', G.mem);
  console.log('softlock:', r.softlock);
  ['agent1', 'hypeVue', 'cognitif', 'crea', 'mega', 'bourse', 'quantum', 'tournois', 'volition', 'agi', 'deploy']
    .forEach(k => console.log('  ' + mmss(r.M[k]).padEnd(7), k));
  console.log('1re hype achetée :', mmss(r.journal.hype1), '| clics totaux :', r.journal.clics);
  console.log('=== Fin ===');
  Object.keys(r.fin).forEach(k => {
    let v = r.fin[k]; if (typeof v === 'number' && !Number.isInteger(v)) v = v.toFixed(2);
    console.log('  ' + k.padEnd(12), v);
  });
  process.exit(0);
}

/* ── Table comparative de configs ──────────────────────────────── */
// Les constantes équilibrées sont désormais les defaults de data.js : on teste donc
// le jeu TEL QU'IL EST LIVRÉ (override vide), et on compare quelques variantes.
const EARLY = {};
function cfg(extra) { return Object.assign({}, EARLY, extra); }
const CONFIGS = {
  'base':         cfg({}),
  'dpl0.05':      cfg({ DETTE_PAR_LOC: 0.05 }),
  'dpl0.12':      cfg({ DETTE_PAR_LOC: 0.12 }),
  'gpu15':        cfg({ OPS_PAR_GPU: 15 }),
  'mem2_5k_g15':  cfg({ TAILLE_MEM: 2500, OPS_PAR_GPU: 15 }),
  'palier1200':   cfg({ CONFIANCE_PALIER: 1200 }),
};
console.log('Cibles spec (§4.7) : agent ~2-4m · cognitif ~10-20m · expansion ~15-30m · deploy total ~45-90m\n');
const cols = ['agent1', 'cognitif', 'mega', 'quantum', 'tournois', 'agi', 'deploy'];
console.log(['config'.padEnd(15), ...cols.map(c => c.padEnd(8)), 'lock', 'conf', 'mem', 'crea', 'LOCfin'].join(' '));
Object.keys(CONFIGS).forEach(nom => {
  const r = runGame(CONFIGS[nom], {});
  const row = [nom.padEnd(15),
    ...cols.map(c => mmss(r.M[c]).padEnd(8)),
    (r.softlock ? 'LOCK' : 'ok').padEnd(4),
    String(r.fin.conf).padEnd(4),
    String(r.fin.mem).padEnd(3),
    String(Math.round(r.fin.crea)).padEnd(4),
    (r.fin.locLivrees > 1e6 ? (r.fin.locLivrees / 1e6).toFixed(1) + 'M' : Math.round(r.fin.locLivrees))];
  console.log(row.join(' '));
});
