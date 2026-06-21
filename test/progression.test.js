/* Graphe de déblocage : prouve que tout le graphe de projets s'exécute sans erreur jusqu'au
 * déploiement (Acte 2). On force les ressources et on achète chaque projet dès qu'il devient
 * visible (show) et abordable, en plusieurs passes, puis on déclenche l'AGI et la bascule. */
import { test, expect } from 'bun:test';
import { loadGame } from './harness.js';

test('tout le graphe de déblocage s’exécute jusqu’à l’Acte 2', () => {
  const { nouvelEtat, ENGINE, DATA } = loadGame();
  const G = nouvelEtat();

  // Conditions de progression non liées aux projets : on simule une partie très avancée.
  function doper() {
    G.jcInstalled = true;
    G.lignesProduites = 200000;
    G.locLivrees = 200000;          // au-delà du dernier palier de Confiance utile
    G.confianceTotale = 30;
    G.confianceLibre = 0;
    G.gpu = 50; G.mem = 50;
    G.ops = 1e9; G.creativite = 1e6; G.yomi = 1e6; G.eur = 1e9;
    G.agents = 10;                  // pour que auto1 (show: agents>=1) apparaisse
    G.paliersConfiance = 7;
    G.dette = 2000;                 // pour Le Grand Refactor (show: dette>800)
    G.seen.tokensAchat = true; G.seen.hype = true; G.seen.agents = true;
    G.seen.confiance = true; G.seen.projets = true; G.seen.dette = true;
  }

  const achetes = [];
  let pass = 0, progres = true;
  while (progres && pass < 50) {
    pass++; progres = false;
    doper();
    DATA.PROJETS.forEach((p) => {
      if (p.id === 'agi' || p.id === 'deploy') { return; }
      if (!p.repeatable && G.projetsFaits[p.id]) { return; }
      if (typeof p.show === 'function' && !p.show(G)) { return; }
      const avant = G.projetsFaits[p.id];
      if (ENGINE.acheterProjet(G, p.id)) {
        if (!p.repeatable && !avant) { achetes.push(p.id); progres = true; }
      }
    });
  }

  // Chaque projet non répétable (hors agi) a bien pu être acheté.
  const manquants = DATA.PROJETS
    .filter((p) => !p.repeatable && p.id !== 'agi')
    .filter((p) => !G.projetsFaits[p.id])
    .map((p) => p.id);

  // Puis la découverte de l'AGI et le déploiement final.
  doper();
  const agiOk = ENGINE.acheterProjet(G, 'agi');
  const deployOk = ENGINE.deployer(G);

  expect(manquants).toEqual([]);
  expect(agiOk).toBe(true);
  expect(deployOk).toBe(true);
  expect(G.deployed).toBe(true);
  // Effets cumulés attendus (vérifie que effet() agit) : auto1/2/3 ⇒ 1,25×1,5×1,75 = 3,28.
  expect(G.mult.agentDebit).toBeGreaterThan(3.2);
  expect(G.mult.agentDebit).toBeLessThan(3.3);
  expect(G.mult.tokenCost).toBeLessThan(1);
});
