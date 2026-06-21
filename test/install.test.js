/* Verrouille le bug « Tokens & Agents révélés en début de partie alors que Jean-Claude
 * n'est pas installé ».
 *
 * Cause : l'état neuf démarre avec gpu/mem = 1 (« 1 CPU + 1 mémoire »). Un code d'amorçage
 * prenait alors une partie NEUVE (gpu > 0) pour une partie déjà « JC installé » et révélait
 * Tokens/Agents au démarrage ; en plus la boucle cognitive (gpu > 0) accumulait des Ops
 * avant l'installation. Ces tests exercent le VRAI moteur (majDeblocages/tick/SAVE.charger). */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

// Partie neuve ayant écrit `n` lignes à la main (n = 'seuil' → exactement JC_INSTALL_SEUIL),
// déblocages à jour. Renvoie le contexte chargé et l'état G.
function partieNeuve(n) {
  const ctx = loadGame();
  const G = ctx.nouvelEtat();
  const lignes = n === 'seuil' ? ctx.DATA.K.JC_INSTALL_SEUIL : n;
  for (let i = 0; i < lignes; i++) { ctx.ENGINE.ecrireLigne(G); }
  ctx.ENGINE.majDeblocages(G);
  return { ctx, G };
}

describe('Déblocage / installation de Jean-Claude', () => {
  test('partie neuve : Tokens et Agents restent cachés tant que JC n’est pas installé', () => {
    const { ctx, G } = partieNeuve(0);
    expect(G.jcInstalled).toBe(false);
    expect(G.gpu).toBe(1);             // dotation initiale 1 GPU / 1 Mémoire (pré-allouée)
    expect(G.mem).toBe(1);
    expect(G.seen.tokens).toBe(false); // bug si visible
    expect(G.seen.agents).toBe(false); // bug si visible
    expect(ctx.ENGINE.acheterAgent(G)).toBe(false); // recruter impossible avant install
  });

  test('20 lignes sans installer : bouton « Installer » révélé, Tokens/Agents toujours cachés', () => {
    const { G } = partieNeuve('seuil');
    expect(G.seen.jcDispo).toBe(true);
    expect(G.seen.tokens).toBe(false);
    expect(G.seen.agents).toBe(false);
  });

  test('aucune Op ne s’accumule avant l’installation (cerveau inactif malgré gpu=1)', () => {
    const { ctx, G } = partieNeuve(0);
    ctx.ENGINE.tick(G, ctx.DATA.K.DT);
    ctx.ENGINE.tick(G, ctx.DATA.K.DT);
    expect(G.ops).toBe(0);
  });

  test('après installation (≥20 lignes + 10 €) : Tokens et Agents sont révélés', () => {
    const { ctx, G } = partieNeuve('seuil');
    G.eur = Math.max(G.eur, ctx.DATA.K.JC_INSTALL_COUT);
    expect(ctx.ENGINE.installerJC(G)).toBe(true);
    ctx.ENGINE.majDeblocages(G);
    expect(G.seen.tokens).toBe(true);
    expect(G.seen.agents).toBe(true);
  });

  test('rechargement d’une partie non installée : tout reste caché', () => {
    const ctx = loadGame();
    expect(ctx.SAVE.charger()).toBeNull(); // aucune save → main.js retombe sur nouvelEtat
    const frais = ctx.nouvelEtat();
    frais.lignesProduites = 60; frais.locLivrees = 60; frais.eur = 30; // écrit/vendu, pas installé
    expect(ctx.SAVE.sauver(frais)).toBe(true);
    const recharge = ctx.SAVE.charger();
    expect(recharge.jcInstalled).toBe(false);
    ctx.ENGINE.majDeblocages(recharge);
    expect(recharge.seen.tokens).toBe(false);
    expect(recharge.seen.agents).toBe(false);
  });
});
