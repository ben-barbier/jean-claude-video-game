/* Sauvegarde localStorage : verrouille le correctif du bug de fusion (projetsFaits/
 * projetsAchats survivent à un aller-retour), la migration douce (champ neuf absent) et
 * l'absorption d'une sauvegarde corrompue (typage défensif). */
import { test, expect, describe } from 'bun:test';
import { loadGame, CLE } from './harness.js';

describe('Sauvegarde localStorage', () => {
  test('aller-retour d’une partie avancée : tout est préservé, exploit fermé', () => {
    const ctx = loadGame();
    const G = ctx.nouvelEtat();
    G.eur = 12345.6;
    G.projetsFaits = { auto1: true, serieA: true, debloquerCrea: true };
    G.projetsAchats = { corrigerBug: 3, grandRefactor: 2 };
    G.mult.agentDebit = 1.25;
    G.mult.tokenCost = 0.5;
    G.seen.confiance = true;
    G.creaUnlocked = true;
    G.confianceTotale = 7;
    G.journal = [{ t: 'bonjour' }, { t: 'au revoir' }];

    expect(ctx.SAVE.sauver(G)).toBe(true);
    const G2 = ctx.SAVE.charger();
    expect(G2).not.toBeNull();
    expect(G2.projetsFaits).toEqual({ auto1: true, serieA: true, debloquerCrea: true });
    expect(G2.projetsAchats).toEqual({ corrigerBug: 3, grandRefactor: 2 });
    expect(G2.eur).toBeCloseTo(12345.6, 9);
    expect(G2.mult.agentDebit).toBe(1.25);
    expect(G2.mult.tokenCost).toBe(0.5);
    expect(G2.seen.confiance).toBe(true);
    expect(G2.creaUnlocked).toBe(true);
    expect(Array.isArray(G2.journal)).toBe(true);
    expect(G2.journal.length).toBe(2);
    // Anti-exploit : un projet non répétable déjà fait n'est pas re-achetable après reload.
    expect(ctx.ENGINE.projetAchetable(G2, ctx.DATA.byId.serieA)).toBe(false);
  });

  test('migration douce : un champ ajouté après la sauvegarde reprend sa valeur par défaut', () => {
    const ctx = loadGame();
    ctx.SAVE.sauver(ctx.nouvelEtat());
    const partielle = JSON.parse(ctx.store[CLE]);
    delete partielle.prodBurstTimer; // simule une vieille save sans le nouveau champ
    ctx.store[CLE] = JSON.stringify(partielle);
    const G2 = ctx.SAVE.charger();
    expect(typeof G2.prodBurstTimer).toBe('number');
  });

  test('sauvegarde corrompue : l’état est réparé et le moteur tourne sans planter', () => {
    const ctx = loadGame();
    ctx.store[CLE] = JSON.stringify({
      mult: null,            // tenterait de casser g.mult.*
      journal: 'oops',       // mauvais type
      eur: 'beaucoup',       // mauvais type
      prix: null,            // null interdit
      projetsFaits: { x: true },
    });
    const G3 = ctx.SAVE.charger();
    expect(G3.mult && typeof G3.mult === 'object').toBe(true);
    expect(Array.isArray(G3.journal)).toBe(true);
    expect(typeof G3.eur).toBe('number');
    expect(typeof G3.prix).toBe('number');
    expect(G3.projetsFaits.x).toBe(true);
    expect(() => ctx.ENGINE.tick(G3, ctx.DATA.K.DT)).not.toThrow();
  });
});
