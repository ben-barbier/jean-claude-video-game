/* Banc d'essai hors navigateur : invariants de base + un « joueur » heuristique qui rejoue
 * 120 min simulées et vérifie l'absence d'erreur runtime / NaN. */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

// Tous les champs numériques de l'état sont-ils finis (ni NaN ni Infini) ?
function fini(g) {
  return Object.keys(g).every((k) => {
    const v = g[k];
    if (typeof v === 'number') { return isFinite(v); }
    return true;
  });
}

describe('Invariants de base', () => {
  test('écrire à la main est GRATUIT et produit 1 ligne ; pas d’agent avant install', () => {
    const { nouvelEtat, ENGINE } = loadGame();
    const G = nouvelEtat();
    const tk0 = G.tokens;
    ENGINE.ecrireLigne(G);
    expect(G.tokens).toBeCloseTo(tk0, 9);      // 0 token consommé
    expect(G.locStock).toBe(1);
    expect(G.lignesProduites).toBe(1);
    expect(ENGINE.acheterAgent(G)).toBe(false); // pas d’agent avant d’installer Jean-Claude
  });

  test('la vente génère des € sans toucher aux tokens', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const G = nouvelEtat();
    ENGINE.ecrireLigne(G);
    const tk = G.tokens;
    // On ne vend que des lignes ENTIÈRES : laisser la demande fractionnaire atteindre 1 ligne.
    for (let i = 0; i < 20; i++) { ENGINE.tick(G, DATA.K.DT); } // ~2 s
    expect(G.eur).toBeGreaterThan(0);
    expect(G.tokens).toBeCloseTo(tk, 9);
  });
});

test('joueur heuristique sur 120 min simulées : aucune erreur runtime ni NaN', () => {
  const { nouvelEtat, ENGINE, DATA } = loadGame();
  const K = DATA.K;
  const G = nouvelEtat();
  const DUREE_S = 120 * 60;
  const TICKS = DUREE_S / K.DT;
  let nanAuTick = -1;
  const jalons = {};
  function jalon(nom, t) { if (!jalons[nom]) { jalons[nom] = Math.round(t); } }

  for (let i = 0; i < TICKS; i++) {
    const t = i * K.DT;

    // Clics manuels uniquement pour amorcer (avant le 1er agent).
    const clique = (G.agents < 1);
    const manuel = clique ? 50 : 0; // ~5 clics/tick = 50 LOC/s
    if (!G.jcInstalled && G.lignesProduites >= K.JC_INSTALL_SEUIL) { ENGINE.installerJC(G); }

    // Prix optimal : on inverse la formule de demande pour viser une demande un peu
    // supérieure à la production (on écoule le stock au débit max).
    const prodS = Math.max(0.5, ENGINE.prodBruteParS(G) + manuel + 0.5);
    const cible = prodS * 1.15;
    const hq = ENGINE.multHype(G) * ENGINE.qualite(G) * (G.burstTimer > 0 ? K.BURST_MULT : 1);
    G.prix = ENGINE.clamp(
      K.PRIX_REF * Math.pow(K.BASE_DEMANDE * hq / cible, 1 / K.ELASTICITE),
      K.PRIX_MIN, K.PRIX_MAX);

    if (clique) { for (let c = 0; c < 5; c++) { ENGINE.ecrireLigne(G); } }

    // Racheter des tokens quand le stock devient bas.
    if (G.seen.tokensAchat && G.tokens < 300 && G.eur >= G.prixLot) { ENGINE.acheterLot(G); }

    // Hype en priorité (démultiplie la demande, donc débloque la croissance).
    if (G.seen.hype && G.eur > ENGINE.coutHype(G) * 1.5 && G.hypeNiveau < 14) { ENGINE.acheterHype(G); }

    // Recruter des agents en gardant une réserve de cash pour les tokens.
    const reserve = G.prixLot * 3;
    const debordement = G.locStock > 400;
    if (G.seen.agents && !debordement && G.eur > ENGINE.coutAgent(G) * 1.3 + reserve && G.agents < 120) {
      ENGINE.acheterAgent(G);
    }
    if (G.megaUnlocked && !debordement && G.eur > ENGINE.coutMega(G) * 1.3 + reserve && G.megas < 40) {
      ENGINE.acheterMega(G);
    }

    // Allouer la Confiance une fois le panneau révélé (comme l'UI réelle).
    if (G.seen.confiance) {
      while (G.confianceLibre > 0) {
        if (G.mem === 0 || G.gpu > G.mem * 2) { ENGINE.allouerConfiance(G, 'mem'); }
        else { ENGINE.allouerConfiance(G, 'gpu'); }
      }
    }

    // Refactoriser si la dette sature, et affecter une part des agents au refacto.
    if (ENGINE.detteNorm(G) > 0.55 && G.ops > K.REFACTO_LOT_OPS) { ENGINE.refactoriser(G); }
    G.partRefacto = ENGINE.detteNorm(G) > 0.6 ? 0.4 : (ENGINE.detteNorm(G) > 0.4 ? 0.2 : 0);

    // Acheter tout projet abordable (sauf le déploiement final).
    DATA.PROJETS.forEach((p) => {
      if (p.id === 'agi') { return; }
      if (ENGINE.projetAchetable(G, p)) { ENGINE.acheterProjet(G, p.id); }
    });

    // Jouer des tournois si débloqués.
    if (G.tournoisUnlocked && G.ops >= K.TOURNOI_COUT_OPS) { ENGINE.jouerTournoi(G); }

    ENGINE.tick(G, K.DT);

    if (G.agents >= 1) { jalon('1er agent', t); }
    if (G.seen.confiance) { jalon('cerveau', t); }
    if (G.seen.agi) { jalon('AGI dispo', t); }

    if (!fini(G)) { nanAuTick = i; break; }
  }

  expect(nanAuTick).toBe(-1);          // aucun NaN/Infini sur toute la simulation
  expect(G.locLivrees).toBeGreaterThan(0); // l'économie a réellement tourné
  expect(jalons['1er agent']).toBeDefined(); // la progression atteint au moins le 1er agent
});
