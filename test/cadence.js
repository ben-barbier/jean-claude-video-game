/* Sonde de CADENCE (pacing « à la Paperclips ») : rejoue la partie avec le joueur compétent
 * de balance.js et horodate CHAQUE événement de progression (projet acheté, panneau révélé,
 * 1er agent/super-agent, etc.). Mesure les TROUS entre événements consécutifs — un grand trou
 * = temps mort = anti-fun. Sert à viser une cadence régulière de nouveautés.
 *
 * Usage : node test/cadence.js            (timeline + plus gros trous, config livrée)
 *         node test/cadence.js <maxMin>   (borne de durée, défaut 120) */
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
const { ENGINE, DATA } = CTX;
const K = DATA.K;
// Override de constantes pour l'expérimentation : K_OVERRIDE='{"CONFIANCE_PALIER_FACTEUR":1.7}' node test/cadence.js
if (process.env.K_OVERRIDE) { Object.assign(K, JSON.parse(process.env.K_OVERRIDE)); }

// Mêmes priorités de projets que balance.js (joueur compétent).
const PRIO = [
  'debloquerCrea', 'rentabilite', 'promptEng', 'linter', 'tests', 'cacheGen', 'compression', 'typage', 'cicd', 'distillation',
  'auto1', 'pitch', 'auto2', 'rlhf', 'jingle', 'charte', 'auto3', 'comite', 'quantum', 'trading',
  'mega', 'megaOpt', 'memoireLT', 'modelisation', 'autoTournoi', 'theorieEsprit', 'negoTarifs', 'faim', 'climat', 'openSource',
  'serieA', 'serieB', 'serieC', 'podcast', 'volition', 'agi',
];

function step(G, clicksPerSec, journal) {
  let manualRate = 0;
  const aSec = G.jcInstalled && G.tokens < ENGINE.coutTokenLigne(G) && G.eur < G.prixLot && G.locStock < 3;
  if (G.agents < 2 || aSec) {
    manualRate = clicksPerSec;
    G._acc = (G._acc || 0) + manualRate * K.DT;
    while (G._acc >= 1) { ENGINE.ecrireLigne(G); G._acc -= 1; journal.clics++; }
  }
  if (!G.jcInstalled && G.lignesProduites >= K.JC_INSTALL_SEUIL) { ENGINE.installerJC(G); }
  const Pauto = ENGINE.prodBruteParS(G);
  const cible = Math.max(0.6, (Pauto + manualRate) * 1.15);
  const mh = ENGINE.multHype(G), q = ENGINE.qualite(G), burst = G.burstTimer > 0 ? K.BURST_MULT : 1;
  G.prix = ENGINE.clamp(K.PRIX_REF * Math.pow(K.BASE_DEMANDE * mh * q * burst / cible, 1 / K.ELASTICITE), K.PRIX_MIN, K.PRIX_MAX);
  const conso = Pauto * ENGINE.coutTokenLigne(G);
  const runway = conso > 0 ? G.tokens / conso : Infinity;
  if (G.seen.tokensAchat && runway < 45 && G.eur >= G.prixLot) { ENGINE.acheterLot(G); }
  const reserve = G.jcInstalled ? G.prixLot * 2.5 : 0;
  if (G.seen.agents && G.agents === 0 && G.eur >= ENGINE.coutAgent(G) + reserve) { ENGINE.acheterAgent(G); }
  // Hype = meilleur ROI early (multiplie la demande) : un joueur compétent l'achète dès
  // qu'il peut, en gardant juste un lot de tokens de marge (pas toute la réserve).
  if (G.seen.hype && G.hypeNiveau < 16 && G.eur >= ENGINE.coutHype(G) * 1.2 + (G.jcInstalled ? G.prixLot : 0)) {
    ENGINE.acheterHype(G); if (!journal.hype1) { journal.hype1 = journal.t; }
  }
  const ecoule = G.locStock < 150;
  if (G.seen.agents && ecoule && G.agents < 250 && G.eur >= ENGINE.coutAgent(G) + reserve) { ENGINE.acheterAgent(G); }
  if (G.megaUnlocked && ecoule && G.megas < 120 && G.eur >= ENGINE.coutMega(G) + reserve) { ENGINE.acheterMega(G); }
  if (G.seen.confiance) {
    while (G.confianceLibre > 0) {
      if (G.mem === 0 || G.gpu > G.mem) { ENGINE.allouerConfiance(G, 'mem'); }
      else { ENGINE.allouerConfiance(G, 'gpu'); }
    }
  }
  const dn = ENGINE.detteNorm(G);
  G.partRefacto = dn > 0.55 ? 0.6 : (dn > 0.35 ? 0.3 : 0);
  for (let i = 0; i < PRIO.length; i++) {
    const p = DATA.byId[PRIO[i]];
    if (p && ENGINE.projetAchetable(G, p)) { ENGINE.acheterProjet(G, PRIO[i]); }
  }
  if (G.tournoisUnlocked && !G.projetsFaits.theorieEsprit && G.yomi < 20 && G.ops >= K.TOURNOI_COUT_OPS) {
    ENGINE.jouerTournoi(G);
  }
  if (G.agiDiscovered && !G.deployed) { ENGINE.deployer(G); }
}

const maxMin = parseFloat(process.argv[2]) || 120;
const G = CTX.nouvelEtat();
const journal = { t: 0, clics: 0, hype1: 0 };

// Panneaux révélés à suivre (en plus des projets achetés).
const SEEN = ['stock', 'marche', 'tresorerie', 'jcDispo', 'tokens', 'tokensAchat', 'hype', 'agents', 'confiance', 'projets', 'dette', 'bourse', 'mega', 'tournois', 'agi'];
const events = [];
let prevProjets = 0;
const prevSeen = {};
let prevAgents = 0, prevMegas = 0, prevInstalled = false, prevPaliers = 0;

const ticks = (maxMin * 60) / K.DT;
for (let i = 0; i < ticks; i++) {
  journal.t = i * K.DT;
  step(G, 3, journal);
  ENGINE.tick(G, K.DT);
  const t = Math.round(journal.t);

  if (!prevInstalled && G.jcInstalled) { events.push([t, 'install Jean-Claude']); prevInstalled = true; }
  if (G.paliersConfiance > prevPaliers) {
    for (let k = prevPaliers + 1; k <= G.paliersConfiance; k++) { events.push([t, 'Confiance palier ' + k + ' (+1 pt)']); }
    prevPaliers = G.paliersConfiance;
  }
  if (prevAgents === 0 && G.agents >= 1) { events.push([t, '1er agent']); }
  if (prevMegas === 0 && G.megas >= 1) { events.push([t, '1er Super Agent']); }
  prevAgents = G.agents; prevMegas = G.megas;
  SEEN.forEach(function (s) { if (G.seen[s] && !prevSeen[s]) { prevSeen[s] = true; events.push([t, 'panneau: ' + s]); } });
  const np = Object.keys(G.projetsFaits).length;
  if (np > prevProjets) {
    // Retrouve le(s) projet(s) nouvellement faits.
    Object.keys(G.projetsFaits).forEach(function (id) {
      if (!events._p) { events._p = {}; }
      if (!events._p[id]) { events._p[id] = true; events.push([t, 'projet: ' + id]); }
    });
    prevProjets = np;
  }
  if (G.deployed) { events.push([t, '*** DEPLOY ***']); break; }
}

// Timeline + analyse des trous.
console.log('=== Timeline des événements de progression (joueur compétent) ===');
let prevT = 0, maxGap = 0, maxGapWhere = '';
const gaps = [];
events.forEach(function (e, idx) {
  const gap = e[0] - prevT;
  gaps.push(gap);
  const flag = gap >= 120 ? '   <<< TROU ' + Math.floor(gap / 60) + 'm' + (gap % 60) + 's' : '';
  console.log('  ' + (Math.floor(e[0] / 60) + 'm' + String(e[0] % 60).padStart(2, '0')).padEnd(7) +
    ' (+' + String(gap).padStart(4) + 's) ' + e[1] + flag);
  if (gap > maxGap && idx > 0) { maxGap = gap; maxGapWhere = events[idx - 1][1] + ' → ' + e[1]; }
  prevT = e[0];
});

const finT = events.length ? events[events.length - 1][0] : 0;
const actifs = gaps.filter(function (g) { return g > 0; });
const moy = actifs.length ? actifs.reduce(function (a, b) { return a + b; }, 0) / actifs.length : 0;
const grosTrous = gaps.filter(function (g) { return g >= 120; }).length;
console.log('\n=== Cadence ===');
console.log('  événements          :', events.length, '| durée totale :', Math.floor(finT / 60) + 'm' + String(finT % 60).padStart(2, '0'));
console.log('  trou moyen entre evts:', moy.toFixed(0) + 's');
console.log('  plus gros trou       :', Math.floor(maxGap / 60) + 'm' + (maxGap % 60) + 's  (' + maxGapWhere + ')');
console.log('  trous >= 2 min       :', grosTrous, '(cible Paperclips : ~0 en jeu actif)');
console.log('  clics totaux         :', journal.clics, '| 1re hype :', Math.floor(journal.hype1 / 60) + 'm' + String(Math.round(journal.hype1) % 60).padStart(2, '0'));
console.log('  état final           : Créa', Math.round(G.creativite), '| Conf', G.confianceTotale,
  '| gpu/mem', G.gpu + '/' + G.mem, '| Ops', Math.round(G.ops) + '/' + ENGINE.opsPlafond(G),
  '| detteNorm', (ENGINE.detteNorm(G) * 100).toFixed(0) + '%',
  '| projets', Object.keys(G.projetsFaits).length + '/' + DATA.PROJETS.filter(function (p) { return !p.repeatable; }).length);
