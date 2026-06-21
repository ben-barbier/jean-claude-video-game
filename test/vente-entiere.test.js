/* test/vente-entiere.test.js — On ne vend QUE des lignes entières.
 * La demande fractionnaire s'accumule : une demande de 0,5 ligne/s ne fait pas grimper la
 * trésorerie en continu, mais par paliers d'1 ligne (≈ toutes les 2 s). */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

describe('Vente par lignes entières', () => {
  test('locLivrees ne progresse que par entiers (jamais de fraction vendue)', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.locStock = 1000;          // stock abondant, aucune production → seules les ventes bougent
    G.prix = 0.6;
    for (let i = 0; i < 600; i++) {  // 60 s simulées
      ENGINE.tick(G, K.DT);
      expect(Number.isInteger(G.locLivrees)).toBe(true); // jamais une fraction de ligne vendue
    }
    expect(G.locLivrees).toBeGreaterThan(0);
  });

  test('demande ≈ 0,5 ligne/s : 1 vente entière ~toutes les 2 s (pas de fraction)', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.locStock = 1000;
    // Prix qui vise une demande de 0,5 ligne/s, quels que soient BASE_DEMANDE / ELASTICITE.
    G.prix = ENGINE.clamp(K.PRIX_REF * Math.pow(K.BASE_DEMANDE / 0.5, 1 / K.ELASTICITE), K.PRIX_MIN, K.PRIX_MAX);
    expect(ENGINE.demandeParS(G)).toBeCloseTo(0.5, 6);

    const avance = (sec) => { for (let i = 0; i < Math.round(sec / K.DT); i++) { ENGINE.tick(G, K.DT); } };
    avance(1.5);
    expect(G.locLivrees).toBe(0);   // avant ~2 s : rien vendu (la fraction ne se vend pas)
    avance(1.0);                    // total ~2,5 s
    expect(G.locLivrees).toBe(1);   // 1 ligne entière écoulée
    avance(7.5);                    // total ~10 s → ~5 lignes
    expect(G.locLivrees).toBeGreaterThanOrEqual(4);
    expect(G.locLivrees).toBeLessThanOrEqual(6);
  });

  test('stock fractionnaire < 1 : impossible de vendre', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.locStock = 0.9;     // moins d'une ligne entière en stock
    G.prix = 0.25;        // demande élevée
    for (let i = 0; i < 50; i++) { ENGINE.tick(G, K.DT); }
    expect(G.locLivrees).toBe(0);          // on ne vend pas 0,9 ligne
    expect(G.locStock).toBeCloseTo(0.9, 9); // le stock fractionnaire reste intact
  });
});
