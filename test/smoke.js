/* Banc d'essai hors navigateur : charge les modules sans DOM, rejoue l'économie
 * avec un "joueur" heuristique et vérifie l'absence d'erreurs / NaN + le rythme. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ctx = { Math, console, JSON, Number, Array, Object, isFinite, parseFloat };
vm.createContext(ctx);
['data.js', 'voice.js', 'state.js', 'engine.js'].forEach(function (f) {
  const code = fs.readFileSync(path.join(__dirname, '..', 'game', f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
});
const { ENGINE, DATA, VOICE } = ctx;
const K = DATA.K;

function fini(g) {
  return Object.keys(g).every(function (k) {
    const v = g[k];
    if (typeof v === 'number') { return isFinite(v); }
    return true;
  });
}

/* ── Tests unitaires rapides ───────────────────────────────────── */
let G = ctx.nouvelEtat();
const tk0 = G.tokens;
ENGINE.ecrireLigne(G);
console.assert(Math.abs(G.tokens - tk0) < 1e-9, 'écrire à la main est GRATUIT (0 token), got ' + G.tokens);
console.assert(G.locStock === 1 && G.lignesProduites === 1, 'le clic produit 1 ligne');
console.assert(ENGINE.acheterAgent(G) === false, 'pas d’agent avant d’installer Jean-Claude');

// la vente fait monter € sans toucher aux tokens
const tk = G.tokens;
ENGINE.tick(G, K.DT);
console.assert(G.eur > 0, 'la vente doit générer des €');
console.assert(Math.abs(G.tokens - tk) < 1e-9, 'la vente ne consomme pas de tokens');

/* ── Joueur heuristique sur 90 minutes simulées ────────────────── */
G = ctx.nouvelEtat();
const milestones = {};
const DUREE_S = 120 * 60;
const TICKS = DUREE_S / K.DT;
let clicsTotal = 0;

function jalon(nom, t) { if (!milestones[nom]) { milestones[nom] = Math.round(t); } }

for (let i = 0; i < TICKS; i++) {
  const t = i * K.DT;

  // Clics manuels uniquement pour amorcer (avant le 1er agent).
  var clique = (G.agents < 1); // clic manuel gratuit (amorçage avant l'IA)
  var manuel = clique ? 50 : 0; // ~5 clics/tick = 50 LOC/s
  if (!G.jcInstalled && G.lignesProduites >= K.JC_INSTALL_SEUIL) { ENGINE.installerJC(G); }

  // Prix optimal : on inverse la formule de demande pour viser une demande
  // un peu supérieure à la production (on écoule le stock au débit max).
  var prodS = Math.max(0.5, ENGINE.prodBruteParS(G) + manuel + 0.5);
  var cible = prodS * 1.15;
  var hq = ENGINE.multHype(G) * ENGINE.qualite(G) * (G.burstTimer > 0 ? K.BURST_MULT : 1);
  // demande = BASE × hq × (ref/prix)^elas = cible  ⇒  prix = ref × (BASE×hq/cible)^(1/elas)
  G.prix = ENGINE.clamp(
    K.PRIX_REF * Math.pow(K.BASE_DEMANDE * hq / cible, 1 / K.ELASTICITE),
    K.PRIX_MIN, K.PRIX_MAX);

  if (clique) { for (let c = 0; c < 5; c++) { ENGINE.ecrireLigne(G); clicsTotal++; } }

  // Racheter des tokens quand le stock devient bas.
  if (G.seen.tokensAchat && G.tokens < 300 && G.eur >= G.prixLot) {
    ENGINE.acheterLot(G);
  }

  // Hype en priorité (démultiplie la demande, donc débloque la croissance).
  if (G.seen.hype && G.eur > ENGINE.coutHype(G) * 1.5 && G.hypeNiveau < 14) {
    ENGINE.acheterHype(G);
  }

  // Recruter des agents — en gardant une réserve de cash pour les tokens
  // (sinon : rupture → plus d'income → soft-lock).
  var reserve = G.prixLot * 3;
  var debordement = G.locStock > 400;
  if (G.seen.agents && !debordement && G.eur > ENGINE.coutAgent(G) * 1.3 + reserve && G.agents < 120) {
    ENGINE.acheterAgent(G);
  }
  if (G.megaUnlocked && !debordement && G.eur > ENGINE.coutMega(G) * 1.3 + reserve && G.megas < 40) {
    ENGINE.acheterMega(G);
  }

  // Allouer la Confiance — seulement une fois le panneau révélé (comme l'UI réelle).
  if (G.seen.confiance) {
    while (G.confianceLibre > 0) {
      if (G.mem === 0 || G.gpu > G.mem * 2) { ENGINE.allouerConfiance(G, 'mem'); }
      else { ENGINE.allouerConfiance(G, 'gpu'); }
    }
  }

  // Refactoriser si la dette sature.
  if (ENGINE.detteNorm(G) > 0.55 && G.ops > K.REFACTO_LOT_OPS) { ENGINE.refactoriser(G); }
  // Et affecter une part des agents au refacto quand la dette monte.
  G.partRefacto = ENGINE.detteNorm(G) > 0.6 ? 0.4 : (ENGINE.detteNorm(G) > 0.4 ? 0.2 : 0);

  // Acheter tout projet abordable (ordre du catalogue), sauf le déploiement final.
  DATA.PROJETS.forEach(function (p) {
    if (p.id === 'agi') { return; } // on déclenche la fin séparément
    if (ENGINE.projetAchetable(G, p)) { ENGINE.acheterProjet(G, p.id); }
  });

  // Jouer des tournois si débloqués.
  if (G.tournoisUnlocked && G.ops >= K.TOURNOI_COUT_OPS) { ENGINE.jouerTournoi(G); }

  ENGINE.tick(G, K.DT);

  // Jalons
  if (G.locLivrees >= 1) { jalon('1re vente', t); }
  if (G.agents >= 1) { jalon('1er agent', t); }
  if (G.lotsAchetes >= 1) { jalon('1er lot tokens', t); }
  if (G.seen.confiance) { jalon('cerveau (1er palier)', t); }
  if (G.seen.projets) { jalon('projets', t); }
  if (G.seen.dette) { jalon('dette révélée', t); }
  if (G.creaUnlocked) { jalon('créativité', t); }
  if (G.megaUnlocked) { jalon('méga-agents', t); }
  if (G.bourseUnlocked) { jalon('bourse', t); }
  if (G.quantumUnlocked) { jalon('quantique', t); }
  if (G.tournoisUnlocked) { jalon('tournois (Yomi)', t); }
  if (G.projetsFaits.volition) { jalon('volition', t); }
  if (G.seen.agi) { jalon('AGI dispo', t); }

  console.assert(fini(G), 'NaN/Infini détecté au tick ' + i);
  if (!fini(G)) { break; }
}

// Tente le déploiement final
const deploye = ENGINE.deployer(G);

console.log('\n=== Jalons (minute:seconde simulés) ===');
Object.keys(milestones).forEach(function (k) {
  const s = milestones[k];
  console.log('  ' + String(Math.floor(s / 60)) + 'm' + String(s % 60).padStart(2, '0') + '  ' + k);
});

console.log('\n=== État final ===');
console.log('  €              ', Math.round(G.eur).toLocaleString('fr-FR'));
console.log('  LOC livrées    ', Math.round(G.locLivrees).toLocaleString('fr-FR'));
console.log('  agents/mégas   ', G.agents, '/', G.megas);
console.log('  GPU/Mém        ', G.gpu, '/', G.mem);
console.log('  Ops/plafond    ', Math.round(G.ops), '/', ENGINE.opsPlafond(G));
console.log('  Créativité     ', Math.round(G.creativite));
console.log('  Confiance tot. ', G.confianceTotale);
console.log('  dette_norm     ', (ENGINE.detteNorm(G) * 100).toFixed(0) + '%');
console.log('  projets faits  ', Object.keys(G.projetsFaits).length, '/', DATA.PROJETS.length);
console.log('  AGI découverte ', !!G.agiDiscovered, '| déployé:', G.deployed || deploye);
console.log('  Total clics sim', clicsTotal);
console.log('\nOK : aucune erreur runtime, économie finie (pas de NaN).');
