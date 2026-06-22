/* Débordement du contexte → Créativité : la réplique de PREMIER débordement ne se joue
 * qu'une seule fois (drapeau g.seen.premierOverflow), et seulement si la Créativité est
 * débloquée et le contexte saturé (Ops au plafond). */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

describe('Premier débordement de contexte', () => {
  test('au 1er contexte saturé : drapeau posé + réplique unique', () => {
    const { nouvelEtat, ENGINE, VOICE, DATA } = loadGame();
    const g = nouvelEtat();
    g.jcInstalled = true;     // la boucle cognitive ne tourne qu'IA installée
    g.creaUnlocked = true;    // Créativité débloquée
    g.ops = ENGINE.opsPlafond(g); // contexte saturé (Ops au plafond), GPU = dotation initiale (1)
    const msg = VOICE.MSG.premierOverflow[0];

    expect(g.seen.premierOverflow).toBe(false);

    ENGINE.tick(g, DATA.K.DT);
    expect(g.seen.premierOverflow).toBe(true);
    expect(g.journal.filter((e) => e.t === msg).length).toBe(1);

    // Débordements suivants : aucune nouvelle réplique de premier débordement.
    ENGINE.tick(g, DATA.K.DT);
    ENGINE.tick(g, DATA.K.DT);
    expect(g.journal.filter((e) => e.t === msg).length).toBe(1);
  });

  test('pas de débordement si la Créativité n’est pas débloquée', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const g = nouvelEtat();
    g.jcInstalled = true;
    g.creaUnlocked = false;
    g.ops = ENGINE.opsPlafond(g);

    ENGINE.tick(g, DATA.K.DT);
    expect(g.seen.premierOverflow).toBe(false);
  });
});
