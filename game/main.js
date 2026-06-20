/* main.js — Amorçage, boucle de jeu à 10 Hz (§4.7) et sauvegarde automatique. */

(function () {
  var K = DATA.K;

  // Charge la partie sauvegardée, sinon en démarre une nouvelle.
  var G = SAVE.charger();
  var nouvellePartie = false;
  if (!G) { G = nouvelEtat(); nouvellePartie = true; }
  window.G = G; // pratique pour déboguer dans la console

  // Applique une action du joueur puis rafraîchit l'affichage immédiatement.
  function rendreApresAction(fn) { fn(G); UI.render(); }

  UI.init(G, rendreApresAction);
  if (nouvellePartie) { VOICE.event(G, 'bienvenue'); }
  ENGINE.majDeblocages(G);
  UI.render();

  // Boucle à pas fixe (DT) avec accumulateur, pilotée par requestAnimationFrame.
  var last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  var acc = 0;
  var depuisSave = 0;

  function frame(now) {
    var dt = (now - last) / 1000;
    last = now;
    acc += dt;
    if (acc > 2) { acc = 2; } // borne le rattrapage (onglet en arrière-plan)

    var ticks = 0;
    while (acc >= K.DT && ticks < 40) {
      ENGINE.tick(G, K.DT);
      acc -= K.DT;
      ticks++;
    }

    depuisSave += dt;
    if (depuisSave >= 15) { SAVE.sauver(G); depuisSave = 0; }

    UI.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Sauvegarde de courtoisie à la fermeture.
  window.addEventListener('beforeunload', function () { SAVE.sauver(G); });

  // Reset discret (hors interface) : à taper dans la console du navigateur.
  window.resetJeanClaude = function () { SAVE.effacer(); window.location.reload(); };

  // Double-ÉCHAP (< 800 ms) : proposer de réinitialiser la partie (retour première visite).
  var dernierEchap = 0;
  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.keyCode !== 27) { return; }
    var t = Date.now(); // horloge absolue : pas de faux positif au tout début de la page
    if (t - dernierEchap < 800) {
      dernierEchap = 0;
      if (window.confirm('Réinitialiser la partie ? Toute progression sera perdue — vous repartirez de zéro, comme à votre première visite.')) {
        window.resetJeanClaude();
      }
    } else {
      dernierEchap = t;
    }
  });
})();
