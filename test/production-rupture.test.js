/* test/production-rupture.test.js — Le débit de production AFFICHÉ est la production RÉELLE.
 * En rupture de tokens, la production automatique est nulle (la génération est bloquée), donc
 * le débit affiché (g.prodAutoParS) doit retomber à 0 — même si le débit NOMINAL reste positif. */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

describe('Production affichée = production réelle (token-limitée)', () => {
  test('sans tokens (et sans clic), le débit auto retombe à ~0', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.agents = 20;             // débit NOMINAL positif…
    G.tokens = 0;              // … mais plus aucun token → production réelle nulle
    G.prodAutoParS = 50;       // valeur d'affichage héritée d'avant la rupture
    expect(ENGINE.prodBruteParS(G)).toBeGreaterThan(0); // le nominal, lui, reste positif

    const stock0 = G.locStock;
    for (let i = 0; i < 40; i++) { ENGINE.tick(G, K.DT); } // ~4 s
    expect(G.prodAutoParS).toBeLessThan(0.01); // l'affichage retombe à ~0
    expect(G.locStock).toBeCloseTo(stock0, 6); // et rien n'a réellement été produit
  });

  test('avec des tokens, le débit auto reflète la production réelle', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.agents = 20;
    G.tokens = 1e9;            // tokens en abondance → pas de rupture
    for (let i = 0; i < 60; i++) { ENGINE.tick(G, K.DT); } // laisse l'EMA converger
    expect(G.prodAutoParS).toBeCloseTo(ENGINE.prodBruteParS(G), 1); // ≈ débit nominal
  });
});
