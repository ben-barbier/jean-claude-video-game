/* test/debit-lissage.test.js — Lissage des débits affichés (« Ventes », « Production automatisée »).
 *
 * On ne vend que des lignes ENTIÈRES : à bas régime une vente isolée tombe dans un seul tick.
 * L'ancien lissage (EMA de `ventes/dt`) injectait une pointe à 1/dt et faisait BONDIR l'indicateur
 * jusqu'à 3–4 alors que le débit réel était < 0,5 ligne/s. Le correctif (accumulateur à fuite à
 * constante de temps DEBIT_TAU) dépose 1/τ par ligne → l'indicateur colle au débit réel.
 * Cf. openspec/changes/lisser-debit-ventes. */
import { test, expect, describe } from 'bun:test';
import { loadGame } from './harness.js';

// Règle le prix pour viser une demande cible (en lignes/s), indépendamment de BASE_DEMANDE/ELASTICITE.
function prixPourDemande(ENGINE, K, cible) {
  return ENGINE.clamp(K.PRIX_REF * Math.pow(K.BASE_DEMANDE / cible, 1 / K.ELASTICITE), K.PRIX_MIN, K.PRIX_MAX);
}

describe('Lissage des débits affichés', () => {
  test('régime nominal : 1 agent à 1 ligne/s + 1 vente/s → l’indicateur affiche « 1 » (jamais 0 ni 2)', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.agents = 1;                 // production nominale = 1,0 ligne/s
    G.tokens = 1e9;               // tokens abondants → jamais de rupture
    G.mult.detteParLigne = 0;     // pas de dette → qualité=1 (demande stable) et coût token bas (prod stable)
    G.locStock = 5;               // petit tampon : la vente est limitée par la DEMANDE, pas le stock
    G.prix = prixPourDemande(ENGINE, K, 1.0);
    expect(ENGINE.demandeParS(G)).toBeCloseTo(1.0, 6);
    expect(ENGINE.prodBruteParS(G)).toBeCloseTo(1.0, 6);

    // 30 s de stabilisation, puis on vérifie chaque pas sur les 30 s suivantes.
    for (let i = 0; i < 300; i++) { ENGINE.tick(G, K.DT); }
    for (let i = 0; i < 300; i++) {
      ENGINE.tick(G, K.DT);
      expect(Math.round(G.ventesParS)).toBe(1);     // critère d'acceptation : on voit « 1 »
      expect(Math.round(G.prodAutoParS)).toBe(1);
      expect(G.ventesParS).toBeGreaterThan(0.85);   // la valeur réelle oscille dans ~[0,9 ; 1,13]
      expect(G.ventesParS).toBeLessThan(1.15);
    }
  });

  test('bas régime ~0,4 ligne/s : pas de sursaut (l’indicateur ne bondit plus à 3–4)', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.agents = 0;                 // pas de production : stock abondant fixe, seules les ventes bougent
    G.locStock = 1e6;
    G.mult.detteParLigne = 0;
    G.prix = prixPourDemande(ENGINE, K, 0.4);
    expect(ENGINE.demandeParS(G)).toBeCloseTo(0.4, 6);

    let vMax = 0, somme = 0, n = 0;
    for (let i = 0; i < 600; i++) {
      ENGINE.tick(G, K.DT);
      if (i >= 100) { vMax = Math.max(vMax, G.ventesParS); somme += G.ventesParS; n++; }
    }
    expect(vMax).toBeLessThan(1.0);                 // plus aucune pointe à 3–4
    expect(somme / n).toBeCloseTo(0.4, 1);          // la moyenne reste fidèle au débit réel
  });

  test('les ventes cessent → l’indicateur converge vers 0', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.agents = 0;
    G.locStock = 1e6;
    G.mult.detteParLigne = 0;
    G.prix = prixPourDemande(ENGINE, K, 2.0);
    for (let i = 0; i < 200; i++) { ENGINE.tick(G, K.DT); }
    expect(G.ventesParS).toBeGreaterThan(1);        // un débit est bien établi
    G.locStock = 0;                                 // plus de stock → plus aucune vente
    for (let i = 0; i < 400; i++) { ENGINE.tick(G, K.DT); } // 40 s = 10·τ
    expect(G.ventesParS).toBeLessThan(0.01);        // décroissance exponentielle vers 0
  });

  test('neutralité économique : le lissage ne touche que l’affichage (eur = ventes entières × prix)', () => {
    const { nouvelEtat, ENGINE, DATA } = loadGame();
    const K = DATA.K;
    const G = nouvelEtat();
    G.jcInstalled = true;
    G.agents = 1;
    G.tokens = 1e9;
    G.mult.detteParLigne = 0;
    G.locStock = 5;
    G.prix = prixPourDemande(ENGINE, K, 1.0);
    for (let i = 0; i < 600; i++) { ENGINE.tick(G, K.DT); }
    expect(Number.isInteger(G.locLivrees)).toBe(true);          // on ne vend que des lignes entières
    expect(G.eur).toBeCloseTo(G.locLivrees * G.prix, 6);        // recette = ventes entières × prix, intacte
    expect(G.locLivrees).toBeGreaterThan(0);
  });
});
