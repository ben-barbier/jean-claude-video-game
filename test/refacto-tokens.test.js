/* test/refacto-tokens.test.js — Le refactoring AUTO des agents consomme des tokens.
 * Les agents affectés à l'entretien réécrivent du code → ils consomment des tokens comme
 * pour coder. À sec de tokens, le refacto auto ne peut plus réduire la dette. */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

function etatRefacto(nouvelEtat, tokens) {
  const G = nouvelEtat();
  G.jcInstalled = true;
  G.agents = 10;
  G.partRefacto = 1;   // 100 % refacto → production nulle, isole l'effet du refacto
  G.dette = 5000;
  G.tokens = tokens;
  return G;
}

describe('Refactoring auto : consomme des tokens', () => {
  test('avec des tokens, un tick de refacto baisse la dette ET les tokens', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const G = etatRefacto(nouvelEtat, 100000);
    const tk0 = G.tokens, dette0 = G.dette;
    ENGINE.tick(G, DATA.K.DT);
    expect(G.tokens).toBeLessThan(tk0);    // le refacto a coûté des tokens
    expect(G.dette).toBeLessThan(dette0);  // … et réduit la dette
  });

  test('à sec de tokens, le refacto auto ne réduit plus la dette', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const G = etatRefacto(nouvelEtat, 0);
    const dette0 = G.dette;
    ENGINE.tick(G, DATA.K.DT);
    expect(G.dette).toBe(dette0);          // sans tokens, aucun refacto
  });

  test('consoTokensParS compte les agents en refacto (au-delà de la seule production)', () => {
    const { nouvelEtat, ENGINE } = loadGame();
    const G = nouvelEtat();
    G.jcInstalled = true; G.agents = 10; G.dette = 5000;
    G.partRefacto = 0.5;   // 5 agents codent, 5 refactorisent
    const ctl = ENGINE.coutTokenLigne(G);
    const prodSeule = ENGINE.prodBruteParS(G) * ctl; // 5 lignes/s × ctl (production uniquement)
    const total = ENGINE.consoTokensParS(G);         // (5 prod + 5 refacto) × ctl
    expect(total).toBeGreaterThan(prodSeule * 1.5);  // le refacto ajoute une conso réelle
    expect(total).toBeCloseTo(ctl * 10, 6);          // les 10 agents consomment, quel que soit le split
  });
});
