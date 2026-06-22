/* test/refacto-flotte.test.js — Le curseur refacto pilote TOUTE la flotte IA (agents + Super Agents).
 * Non-régression du soft-lock : à 100 % refacto, plus aucune production et la dette est toujours
 * résorbable, quel que soit le ratio agents / Super Agents. Et neutralité à megas=0. */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

describe('Refacto global : agents + Super Agents', () => {
  test('100 % refacto avec une flotte dominée par les Super Agents : prod = 0 et dette ↓', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.megaUnlocked = true;
    G.agents = 1;
    G.megas = 5;            // flotte dominée par les Super Agents (l'ancien soft-lock)
    G.partRefacto = 1;      // 100 % refacto
    G.dette = 3000;
    G.tokens = 1e9;         // tokens abondants : on isole la mécanique de dette

    // À 100 % refacto, AUCUNE production (ni agents ni Super Agents) → aucune dette générée.
    expect(ENGINE.prodBruteParS(G)).toBe(0);

    const dette0 = G.dette;
    ENGINE.tick(G, DATA.K.DT);
    expect(G.dette).toBeLessThan(dette0);  // la dette diminue strictement (plus de soft-lock)
  });

  test('les Super Agents contribuent à la capacité de refacto', () => {
    const { nouvelEtat, ENGINE } = loadGame();
    const G = nouvelEtat();
    G.jcInstalled = true; G.megaUnlocked = true;
    G.agents = 2; G.megas = 3; G.partRefacto = 1; G.dette = 5000;
    // capacité = agents×DEBIT_AGENT + megas×DEBIT_MEGA = 2×1 + 3×100 = 302 lignes-équiv/s
    expect(ENGINE.refactoCodingParS(G)).toBeCloseTo(302, 6);
  });

  test('neutralité à megas=0 / mults de base : même rythme de refacto qu’avant', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.agents = 10; G.megas = 0; G.partRefacto = 1; // pas de Super Agent, mults de base
    G.dette = 2000; G.tokens = 1e9;

    const dette0 = G.dette;
    ENGINE.tick(G, DATA.K.DT);
    // Ancien comportement : dette -= agents × partRefacto × 0,3 (ex-TAUX_AGENT_REFACTO) × dt.
    const attendu = G.agents * 1 * 0.3 * DATA.K.DT;
    expect(dette0 - G.dette).toBeCloseTo(attendu, 9);
  });
});
