/* Sonde JETABLE : quantifie l'IMPACT DU PRIX sur le revenu durable (€/s).
 * Revenu durable = min(demande(prix), production) × prix.
 * On balaie le prix sur tout le slider [PRIX_MIN, PRIX_MAX] pour 3 états types,
 * sous plusieurs valeurs d'ELASTICITE, et on mesure :
 *   - prix* optimal et revenu max,
 *   - ratio max/min sur le slider (= « à quel point le prix compte »),
 *   - revenu au prix par défaut (0,25) vs à l'optimum.
 * Usage : node test/price-impact.js */
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
const { ENGINE, DATA, nouvelEtat } = CTX;
const K = DATA.K;

// États types (production fixée via agents/megas ; hype/dette modulent demande/qualité).
const ETATS = [
  { nom: 'early  (manuel ~3/s, hype1)', agents: 0, megas: 0, hype: 1, dette: 0, prodManuelle: 3 },
  { nom: 'mid    (10 agents, hype3)',   agents: 10, megas: 0, hype: 3, dette: 300, prodManuelle: 0 },
  { nom: 'late   (60 ag+3 mega, hype7)', agents: 60, megas: 3, hype: 7, dette: 4000, prodManuelle: 0 },
];
const ELAS = [1.1, 1.5, 2.0, 2.5, 3.0];

function prod(etat, g) { return ENGINE.prodBruteParS(g) + (etat.prodManuelle || 0); }

function analyse(etat, elas) {
  K.ELASTICITE = elas;
  const g = nouvelEtat();
  g.jcInstalled = true;
  g.agents = etat.agents; g.megas = etat.megas;
  g.megaUnlocked = etat.megas > 0;
  g.hypeNiveau = etat.hype; g.dette = etat.dette;
  const P = prod(etat, g);
  let best = { rev: -1, prix: 0, dem: 0 };
  let lo = Infinity, hi = -Infinity;
  let revRef = 0, revMin = 0, revMax = 0;
  for (let p = K.PRIX_MIN; p <= K.PRIX_MAX + 1e-9; p += 0.01) {
    g.prix = p;
    const dem = ENGINE.demandeParS(g);
    const ventes = Math.min(dem, P);
    const rev = ventes * p;
    if (rev > best.rev) best = { rev, prix: p, dem };
    if (rev < lo) lo = rev;
    if (rev > hi) hi = rev;
    if (Math.abs(p - 0.25) < 0.005) revRef = rev;
    if (Math.abs(p - K.PRIX_MIN) < 0.005) revMin = rev;
    if (Math.abs(p - K.PRIX_MAX) < 0.005) revMax = rev;
  }
  return { P, best, lo, hi, revRef, revMin, revMax };
}

console.log('Revenu durable €/s = min(demande(prix), production) × prix — balayage prix ∈ [0,01 ; 2,00]\n');
ETATS.forEach(function (etat) {
  const g0 = nouvelEtat(); g0.jcInstalled = true; g0.agents = etat.agents; g0.megas = etat.megas; g0.megaUnlocked = etat.megas > 0;
  console.log('### ' + etat.nom + '  | production ≈ ' + prod(etat, g0).toFixed(1) + ' LOC/s');
  console.log('  ELAST | prix*  rev*    | rev@0,25  rev@min  rev@max | spread(max/min) | gain prix*/0,25');
  ELAS.forEach(function (elas) {
    const r = analyse(etat, elas);
    const spread = r.lo > 0 ? (r.hi / r.lo) : Infinity;
    const gain = r.revRef > 0 ? (r.best.rev / r.revRef) : Infinity;
    console.log('  ' + elas.toFixed(1) + '   | ' +
      r.best.prix.toFixed(2).padStart(5) + ' ' + r.best.rev.toFixed(2).padStart(6) + '  | ' +
      r.revRef.toFixed(2).padStart(7) + '  ' + r.revMin.toFixed(2).padStart(6) + '  ' + r.revMax.toFixed(2).padStart(6) + ' | ' +
      ('×' + spread.toFixed(1)).padStart(13) + '   | ' + ('×' + gain.toFixed(2)).padStart(8));
  });
  console.log('');
});
K.ELASTICITE = 1.1;
