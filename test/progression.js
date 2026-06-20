/* Test de graphe : prouve que tout le graphe de déblocage s'exécute sans erreur.
 * On force les ressources et on parcourt les dépendances jusqu'au déploiement,
 * en achetant chaque projet dès qu'il devient visible (show) et abordable. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ctx = { Math, console, JSON, Number, Array, Object, isFinite, parseFloat };
vm.createContext(ctx);
['data.js', 'voice.js', 'state.js', 'engine.js'].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'game', f), 'utf8'), ctx, { filename: f });
});
const { ENGINE, DATA } = ctx;

let G = ctx.nouvelEtat();

// Conditions de progression non liées aux projets : on simule une partie avancée.
function doper() {
  G.locLivrees = 200000;          // au-delà du dernier palier de Confiance utile
  G.confianceTotale = 30;
  G.confianceLibre = 0;
  G.gpu = 50; G.mem = 50;
  G.ops = 1e9; G.creativite = 1e6; G.yomi = 1e6; G.eur = 1e9;
  G.agents = 10;                  // pour que auto1 (show: agents>=1) apparaisse
  G.paliersConfiance = 7;
  G.dette = 2000;                 // pour Le Grand Refactor (show: dette>800)
  // Drapeaux normalement posés par majDeblocages() au fil des ticks :
  G.seen.tokensAchat = true; G.seen.hype = true; G.seen.agents = true;
  G.seen.confiance = true; G.seen.projets = true; G.seen.dette = true;
}

const achetes = [];
let pass = 0, progres = true;
while (progres && pass < 50) {
  pass++; progres = false;
  doper();
  DATA.PROJETS.forEach(function (p) {
    if (p.id === 'agi' || p.id === 'deploy') { return; }
    if (!p.repeatable && G.projetsFaits[p.id]) { return; }
    if (typeof p.show === 'function' && !p.show(G)) { return; }
    const avant = G.projetsFaits[p.id];
    if (ENGINE.acheterProjet(G, p.id)) {
      if (!p.repeatable && !avant) { achetes.push(p.id); progres = true; }
    }
  });
}

// Vérifie que chaque projet non répétable a bien pu être acheté.
const manquants = DATA.PROJETS
  .filter(function (p) { return !p.repeatable && p.id !== 'agi'; })
  .filter(function (p) { return !G.projetsFaits[p.id]; })
  .map(function (p) { return p.id; });

// Puis la découverte de l'AGI et le déploiement final.
doper();
const agiOk = ENGINE.acheterProjet(G, 'agi');
const deployOk = ENGINE.deployer(G);

// Effets attendus de quelques projets (vérifie que effet() agit) :
console.log('=== Effets cumulés des projets ===');
console.log('  mult.agentDebit   ', G.mult.agentDebit.toFixed(2), '(auto1/2/3 ⇒ 1,25×1,5×1,75 = 3,28)');
console.log('  mult.tokenCost    ', G.mult.tokenCost.toFixed(3), '(< 1, efficacité)');
console.log('  mult.hypeEffect   ', G.mult.hypeEffect.toFixed(2), '(> 1)');
console.log('  mult.detteParLigne', G.mult.detteParLigne.toFixed(3));
console.log('  mult.detteAccum   ', G.mult.detteAccum.toFixed(3));
console.log('  drapeaux          ',
  'mega=' + G.megaUnlocked, 'crea=' + G.creaUnlocked, 'bourse=' + G.bourseUnlocked,
  'quantum=' + G.quantumUnlocked, 'tournois=' + G.tournoisUnlocked);

console.log('\n=== Résultat ===');
console.log('  projets non répétables achetés :', achetes.length);
console.log('  manquants (hors agi) :', manquants.length ? manquants.join(', ') : 'aucun');
console.log('  AGI découverte :', agiOk, '| déploiement :', deployOk);

let ok = true;
function check(cond, msg) { if (!cond) { ok = false; console.log('  ✗ ÉCHEC: ' + msg); } }
check(manquants.length === 0, 'des projets ne sont jamais devenus achetables: ' + manquants.join(', '));
check(agiOk, 'la découverte de l’AGI a échoué');
check(deployOk, 'le déploiement final a échoué');
check(G.deployed === true, 'l’état déployé n’est pas posé');
check(G.mult.agentDebit > 3.2 && G.mult.agentDebit < 3.3, 'cumul agentDebit inattendu (attendu 3,28)');
check(G.mult.tokenCost < 1, 'tokenCost devrait être < 1');

console.log('\n' + (ok ? 'OK : tout le graphe de déblocage s’exécute jusqu’à l’Acte 2.'
                        : 'ÉCHECS détectés (voir ci-dessus).'));
process.exit(ok ? 0 : 1);
