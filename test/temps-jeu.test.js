/* Durée de jeu : le helper pur ENGINE.formatDuree (HH:MM:SS) et l'accumulation
 * g.tempsEcoule dans le tick (qui se fige une fois l'Acte 1 déployé). */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

describe('formatDuree (HH:MM:SS)', () => {
  test('cas de référence : padding, heures, débordement, troncature', () => {
    const { ENGINE } = loadGame();
    expect(ENGINE.formatDuree(0)).toBe('00:00:00');
    expect(ENGINE.formatDuree(5)).toBe('00:00:05');       // padding des secondes
    expect(ENGINE.formatDuree(754)).toBe('00:12:34');      // 12 min 34 s
    expect(ENGINE.formatDuree(3661)).toBe('01:01:01');     // 1 h 01 min 01 s
    expect(ENGINE.formatDuree(360000)).toBe('100:00:00');  // 100 h : heures NON bornées
    expect(ENGINE.formatDuree(90.9)).toBe('00:01:30');     // partie fractionnaire tronquée
  });
});

describe('Accumulation de tempsEcoule', () => {
  test('part de 0 et s’incrémente de dt à chaque tick', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const g = nouvelEtat();
    expect(g.tempsEcoule).toBe(0);

    const dt = DATA.K.DT;
    for (let i = 0; i < 10; i++) { ENGINE.tick(g, dt); }
    expect(g.tempsEcoule).toBeCloseTo(10 * dt, 9);
  });

  test('se fige une fois l’Acte 1 déployé', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const g = nouvelEtat();
    ENGINE.tick(g, DATA.K.DT);
    const fige = g.tempsEcoule;
    expect(fige).toBeGreaterThan(0);

    g.deployed = true;
    ENGINE.tick(g, DATA.K.DT);
    ENGINE.tick(g, DATA.K.DT);
    expect(g.tempsEcoule).toBe(fige); // plus aucune accumulation après déploiement
  });
});

describe('Persistance de tempsEcoule', () => {
  test('survit à un aller-retour de sauvegarde', () => {
    const ctx = loadGame();
    const G = ctx.nouvelEtat();
    G.tempsEcoule = 754.5;
    expect(ctx.SAVE.sauver(G)).toBe(true);
    const G2 = ctx.SAVE.charger();
    expect(G2.tempsEcoule).toBeCloseTo(754.5, 9);
  });

  test('migration douce : vieille sauvegarde sans le champ → 0', () => {
    const ctx = loadGame();
    const G = ctx.nouvelEtat();
    delete G.tempsEcoule;                 // simule une sauvegarde antérieure au champ
    expect(ctx.SAVE.sauver(G)).toBe(true);
    const G2 = ctx.SAVE.charger();
    expect(G2.tempsEcoule).toBe(0);       // défaut de nouvelEtat() conservé par la fusion
  });
});
