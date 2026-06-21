/* test/price-elasticite.test.js — Verrou de non-régression sur l'IMPACT DU PRIX.
 *
 * Calibrage « façon Universal Paperclips » : le prix doit rester un LEVIER FORT.
 * Le revenu durable vaut min(demande(prix), production) × prix. Dans le régime
 * limité par la demande (surproduction), revenu ∝ prix^(1−ELASTICITE) : il faut
 * ELASTICITE nettement > 1 pour qu'un mauvais prix soit lourdement pénalisé et qu'un
 * OPTIMUM intérieur existe (sweet spot à chercher). Si l'élasticité retombe vers 1,
 * le revenu redevient plat et ces tests cassent. Cf. test/price-impact.js (diagnostic). */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

// Revenu durable (€/s) à état figé, pour un prix donné.
function revenuDurable(ENGINE, G, prix, production) {
  G.prix = prix;
  return Math.min(ENGINE.demandeParS(G), production) * prix;
}

// Balaye tout le curseur de prix et renvoie l'optimum + le revenu au prix « catastrophe ».
function balayage(ENGINE, K, G) {
  const production = ENGINE.prodBruteParS(G);
  let revOpt = 0, prixOpt = 0;
  for (let p = K.PRIX_MIN; p <= K.PRIX_MAX + 1e-9; p += 0.01) {
    const r = revenuDurable(ENGINE, G, p, production);
    if (r > revOpt) { revOpt = r; prixOpt = p; }
  }
  return { revOpt, prixOpt, revPlafond: revenuDurable(ENGINE, G, K.PRIX_MAX, production) };
}

describe('Impact du prix (calibrage Paperclips)', () => {
  test('fin de partie (surproduction) : bien tarifer rapporte ≫ que sur-tarifer', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true; G.megaUnlocked = true;
    G.agents = 60; G.megas = 3;   // ~360 LOC/s — la production écrase la demande
    G.hypeNiveau = 7; G.dette = 4000;

    const { revOpt, prixOpt, revPlafond } = balayage(ENGINE, K, G);
    // Le prix est un VRAI levier : l'optimum écrase le pire réglage (×40 attendu à ELAST 2.0 ;
    // seuil large à ×5 pour rester robuste aux re-tunings, mais casse si ELASTICITE → 1).
    expect(revOpt / revPlafond).toBeGreaterThan(5);
    // …et l'optimum n'est PAS au plafond : « monter le prix » n'est pas toujours bon (sweet spot).
    expect(prixOpt).toBeLessThan(K.PRIX_MAX);
  });

  test('milieu de partie : le prix reste un levier net', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.agents = 10; G.hypeNiveau = 3; G.dette = 300;   // ~10 LOC/s

    const { revOpt, prixOpt, revPlafond } = balayage(ENGINE, K, G);
    expect(revOpt / revPlafond).toBeGreaterThan(3);
    expect(prixOpt).toBeLessThan(K.PRIX_MAX);
  });
});
