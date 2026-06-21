/* test/tokens-achat.test.js — Achat de tokens en masse (boutons +1K / +10K / +100K).
 * acheterLots(g, n) achète n lots d'un coup au prix courant, tout ou rien. */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

describe('Achat de tokens en masse', () => {
  test('acheterLots(n) débite n × prixLot et ajoute n lots de tokens', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.eur = 100000;
    const prix = G.prixLot, tok0 = G.tokens, lots0 = G.lotsAchetes;
    const n = ENGINE.acheterLots(G, 10);
    expect(n).toBe(10);
    expect(G.tokens).toBe(tok0 + 10 * K.LOT_TOKENS);
    expect(G.eur).toBeCloseTo(100000 - 10 * prix, 6);
    expect(G.lotsAchetes).toBe(lots0 + 10); // dérive la cible du prix d'autant
  });

  test('tout ou rien : fonds insuffisants pour la fournée → 0 acheté', () => {
    const { nouvelEtat, ENGINE } = loadGame();
    const G = nouvelEtat();
    G.eur = G.prixLot * 5; // de quoi payer 5 lots, mais pas 10
    const tok0 = G.tokens, eur0 = G.eur, lots0 = G.lotsAchetes;
    const n = ENGINE.acheterLots(G, 10);
    expect(n).toBe(0);
    expect(G.tokens).toBe(tok0);
    expect(G.eur).toBe(eur0);
    expect(G.lotsAchetes).toBe(lots0);
  });
});
