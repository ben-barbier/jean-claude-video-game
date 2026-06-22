/* main.js — Amorçage, boucle de jeu à 10 Hz (§4.7) et sauvegarde automatique. */

(function () {
  var K = DATA.K;

  // Charge la partie sauvegardée, sinon en démarre une nouvelle.
  var G = SAVE.charger() || nouvelEtat();
  window.G = G; // pratique pour déboguer dans la console

  // Applique une action du joueur puis rafraîchit l'affichage immédiatement.
  function rendreApresAction(fn) { fn(G); UI.render(); }

  UI.init(G, rendreApresAction);
  ENGINE.majDeblocages(G);
  UI.render();

  // Le terminal est en position: fixed (toujours visible au scroll) → il sort du flux.
  // On réserve sa hauteur sous lui (offset dynamique, robuste au resize) pour ne rien cacher.
  function ajusterOffsetTerminal() {
    var term = document.getElementById('journal-term');
    if (term) { document.body.style.paddingTop = term.offsetHeight + 'px'; }
  }
  ajusterOffsetTerminal();
  window.addEventListener('resize', ajusterOffsetTerminal);

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

  // Sauvegarde de courtoisie à la fermeture — SAUF pendant une réinitialisation
  // (sinon le reload re-sauverait G juste après l'avoir effacé : reset annulé).
  var reinitEnCours = false;
  window.addEventListener('beforeunload', function () { if (!reinitEnCours) { SAVE.sauver(G); } });

  // Reset (console ou double-ÉCHAP) : on coupe l'autosave et la sauvegarde de fermeture.
  window.resetJeanClaude = function () {
    reinitEnCours = true;
    depuisSave = -1e9; // neutralise l'autosave périodique d'ici au reload
    SAVE.effacer();
    window.location.reload();
  };

  // Menu du terminal : un bouton discret (haut-droite) ouvre un panneau d'options qui PREND LA
  // PLACE du terminal (journal + invite masqués) et propose la réinitialisation, confirmée par une
  // boîte de dialogue native (window.confirm). La logique destructrice reste resetJeanClaude().
  (function installerMenuTerminal() {
    var btn = document.getElementById('term-menu-btn');
    var menu = document.getElementById('terminal-menu');
    var journal = document.getElementById('journal');
    var invite = document.getElementById('journal-prompt');
    if (!btn || !menu || !journal || !invite) { return; }

    function ouvrirMenu() {
      journal.hidden = true; invite.hidden = true; menu.hidden = false;
      btn.setAttribute('aria-label', 'Fermer le menu');
      btn.setAttribute('aria-expanded', 'true');
      ajusterOffsetTerminal(); // la hauteur du cadre peut changer → on resynchronise le padding du body
    }
    function fermerMenu() {
      menu.hidden = true; journal.hidden = false; invite.hidden = false;
      btn.setAttribute('aria-label', 'Ouvrir le menu');
      btn.setAttribute('aria-expanded', 'false');
      ajusterOffsetTerminal();
    }
    btn.addEventListener('click', function () { if (menu.hidden) { ouvrirMenu(); } else { fermerMenu(); } });

    var btnRetour = document.getElementById('menu-retour');
    if (btnRetour) { btnRetour.addEventListener('click', fermerMenu); }

    // Réinitialisation : confirmation native (comme le double-ÉCHAP), qui vérifie le choix du joueur.
    var btnReset = document.getElementById('menu-reset');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        if (window.confirm('Réinitialiser la partie ? Toute progression sera perdue — vous repartirez de zéro, comme à votre première visite.')) {
          window.resetJeanClaude();
        }
      });
    }

    // Échap : ferme le menu s'il est ouvert. En phase de CAPTURE + stopImmediatePropagation pour
    // passer AVANT le double-ÉCHAP (ci-dessous) et le neutraliser tant que le menu est ouvert.
    window.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.keyCode !== 27) { return; }
      if (!menu.hidden) { e.stopImmediatePropagation(); fermerMenu(); }
    }, true);
  })();

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

  // Konami code (↑ ↑ ↓ ↓ ← → ← → A B) : +1 000 000 000 000 € (œuf de Pâques).
  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
                'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'a', 'b'];
  var konamiBuf = [];
  window.addEventListener('keydown', function (e) {
    var k = (e.key && e.key.length === 1) ? e.key.toLowerCase() : e.key;
    konamiBuf.push(k);
    if (konamiBuf.length > KONAMI.length) { konamiBuf.shift(); }
    var ok = konamiBuf.length === KONAMI.length
      && konamiBuf.every(function (v, i) { return v === KONAMI[i]; });
    if (ok) {
      konamiBuf = [];
      G.eur += 1e12;
      // …et on déverrouille toute l'interface : tous les panneaux deviennent visibles.
      Object.keys(G.seen).forEach(function (cle) { G.seen[cle] = true; });
      G.jcInstalled = true;
      G.megaUnlocked = true; G.creaUnlocked = true; G.bourseUnlocked = true;
      G.quantumUnlocked = true;
      G.agiDiscovered = true; G.rentabiliteUnlocked = true;
      VOICE.log(G, 'Mille milliards d’euros — et je vous déverrouille toute l’interface, tant que j’y suis. Un petit geste. Entre nous.');
      UI.render();
    }
  });
})();
