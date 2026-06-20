/* ui.js — Rendu DOM + câblage des contrôles + déblocage progressif (§4.4).
 * Seul fichier (avec main.js) à toucher le DOM. Lit l'état G, ne le modifie
 * que via les actions d'ENGINE. */

var UI = (function () {
  var g = null;          // référence vers l'état courant (posée par init)
  var rendreApresAction; // callback fourni par main : applique une action puis re-render
  var projSignature = ''; // pour ne reconstruire la liste de projets qu'au changement

  function $(id) { return document.getElementById(id); }

  /* ── Formatage français ─────────────────────────────────────── */
  function f(x, dec) {
    if (!isFinite(x)) { return '∞'; }
    return Number(x).toLocaleString('fr-FR', {
      minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0,
    });
  }
  function big(x) { // compacte les grands nombres (LOC, €)
    var a = Math.abs(x);
    if (a >= 1e9) { return f(x / 1e9, 2) + ' Md'; }
    if (a >= 1e6) { return f(x / 1e6, 2) + ' M'; }
    return f(Math.floor(x), 0);
  }
  function txt(id, v) { var e = $(id); if (e) { e.textContent = v; } }
  function montre(id, cond) { var e = $(id); if (e) { e.hidden = !cond; } }
  function actif(id, cond) { var e = $(id); if (e) { e.disabled = !cond; } }

  /* ── Câblage des contrôles ──────────────────────────────────── */
  function init(etat, doAction) {
    g = etat;
    rendreApresAction = doAction;

    $('btn-ecrire').addEventListener('click', function () { rendreApresAction(ENGINE.ecrireLigne); });
    $('btn-agent').addEventListener('click', function () { rendreApresAction(ENGINE.acheterAgent); });
    $('btn-mega').addEventListener('click', function () { rendreApresAction(ENGINE.acheterMega); });
    $('btn-lot').addEventListener('click', function () {
      rendreApresAction(function (s) { if (ENGINE.acheterLot(s)) { VOICE.event(s, 'achatLot'); } });
    });
    $('btn-hype').addEventListener('click', function () { rendreApresAction(ENGINE.acheterHype); });
    $('btn-gpu').addEventListener('click', function () { rendreApresAction(function (s) { ENGINE.allouerConfiance(s, 'gpu'); }); });
    $('btn-mem').addEventListener('click', function () { rendreApresAction(function (s) { ENGINE.allouerConfiance(s, 'mem'); }); });
    $('btn-refacto').addEventListener('click', function () { rendreApresAction(ENGINE.refactoriser); });
    $('btn-tournoi').addEventListener('click', function () { rendreApresAction(ENGINE.jouerTournoi); });

    $('btn-depot').addEventListener('click', function () { rendreApresAction(function (s) { ENGINE.deposerBourse(s, 100); }); });
    $('btn-depot-max').addEventListener('click', function () { rendreApresAction(function (s) { ENGINE.deposerBourse(s, s.eur); }); });
    $('btn-retrait').addEventListener('click', function () { rendreApresAction(function (s) { ENGINE.retirerBourse(s, 100); }); });
    $('btn-retrait-max').addEventListener('click', function () { rendreApresAction(function (s) { ENGINE.retirerBourse(s, s.capital); }); });

    $('prix-slider').addEventListener('input', function (e) {
      g.prix = ENGINE.clamp(parseFloat(e.target.value), ENGINE.K.PRIX_MIN, ENGINE.K.PRIX_MAX);
      render();
    });
    $('refacto-slider').addEventListener('input', function (e) {
      g.partRefacto = ENGINE.clamp(parseFloat(e.target.value) / 100, 0, 1);
      render();
    });

    $('btn-deployer').addEventListener('click', function () {
      if (window.confirm('Déployer en autonomie ? Cette décision est IRRÉVERSIBLE.')) {
        rendreApresAction(ENGINE.deployer);
      }
    });

    // La sauvegarde est automatique et silencieuse (cf. main.js). Pour repartir de
    // zéro pendant le développement : window.resetJeanClaude() dans la console.

    // valeurs initiales des curseurs
    $('prix-slider').value = g.prix;
    $('refacto-slider').value = Math.round(g.partRefacto * 100);

    // Affiche le journal une fois au lancement (mises à jour ensuite via onLog).
    rendreJournal();
  }

  /* ── Liste des projets (reconstruite seulement au changement) ── */
  function signatureProjets() {
    var s = '';
    DATA.PROJETS.forEach(function (p) {
      var visible = (p.repeatable || !g.projetsFaits[p.id]) && (!p.show || p.show(g));
      if (visible) { s += p.id + (ENGINE.projetAchetable(g, p) ? '1' : '0') + (g.projetsAchats[p.id] || 0) + ';'; }
    });
    return s;
  }
  function libelleCout(c) {
    var parts = [];
    if (c.ops) { parts.push(f(Math.ceil(c.ops)) + ' Ops'); }
    if (c.crea) { parts.push(f(Math.ceil(c.crea)) + ' Créa'); }
    if (c.yomi) { parts.push(f(Math.ceil(c.yomi)) + ' Yomi'); }
    if (c.eur) { parts.push(f(Math.ceil(c.eur)) + ' €'); }
    return parts.length ? parts.join(' + ') : 'gratuit';
  }
  function construireProjets() {
    var cont = $('projets-list');
    cont.innerHTML = '';
    var n = 0;
    DATA.PROJETS.forEach(function (p) {
      var fait = !p.repeatable && g.projetsFaits[p.id];
      if (fait || (p.show && !p.show(g))) { return; }
      n++;
      var c = ENGINE.coutProjet(g, p);
      var btn = document.createElement('button');
      btn.type = 'button';
      var rep = p.repeatable && g.projetsAchats[p.id] ? ' (×' + g.projetsAchats[p.id] + ')' : '';
      btn.textContent = p.nom + rep + ' — ' + libelleCout(c);
      btn.title = p.flavor;
      btn.disabled = !ENGINE.projetAchetable(g, p);
      btn.addEventListener('click', function () {
        rendreApresAction(function (s) { ENGINE.acheterProjet(s, p.id); });
      });
      var ligne = document.createElement('div');
      ligne.appendChild(btn);
      cont.appendChild(ligne);
    });
    montre('projets-vide', n === 0);
  }

  /* ── Journal ────────────────────────────────────────────────── */
  function rendreJournal() {
    var cont = $('journal');
    if (!cont || !g) { return; }
    // Préserve la position de lecture : on ne recolle en bas que si l'utilisateur y était.
    var ancien = cont.scrollTop;
    var enBas = (cont.scrollHeight - ancien - cont.clientHeight) < 28;
    cont.innerHTML = '';
    // Ordre chronologique (plus ancien en haut, plus récent en bas) : ressenti terminal.
    g.journal.slice(0, 50).reverse().forEach(function (e) {
      var p = document.createElement('p');
      p.textContent = '› ' + e.t;
      cont.appendChild(p);
    });
    cont.scrollTop = enBas ? cont.scrollHeight : ancien;
  }
  // Le journal n'est redessiné qu'à l'arrivée d'un message (et non à chaque frame).
  function onLog() { rendreJournal(); }

  /* ── Rendu complet ──────────────────────────────────────────── */
  function render() {
    if (!g) { return; }

    // Tableau de bord — révélé puis garni progressivement (façon Paperclips).
    montre('bloc-dashboard', g.seen.stock);
    montre('cell-stock', g.seen.stock);
    montre('cell-eur', g.seen.tresorerie);
    montre('cell-livrees', g.locLivrees >= 1);
    montre('cell-ventes', g.locLivrees >= 1);
    montre('cell-prod', (g.agents + g.megas) >= 1);
    txt('stat-eur', big(g.eur));
    txt('stat-loc-livrees', big(g.locLivrees));
    txt('stat-loc-stock', big(g.locStock));
    txt('stat-prod', f(ENGINE.prodBruteParS(g), 1));
    txt('stat-ventes', f(Math.min(ENGINE.demandeParS(g), g.locStock), 1));

    // Production
    txt('prod-clic-info', g.seen.stock ? '(−' + f(ENGINE.coutTokenLigne(g), 2) + ' tokens)' : '');
    montre('bloc-agents', g.seen.agents);
    txt('agents-count', f(g.agents));
    txt('agents-debit', f(ENGINE.prodAgentsParS(g), 1));
    txt('agents-cout', big(ENGINE.coutAgent(g)));
    actif('btn-agent', g.eur >= ENGINE.coutAgent(g));

    montre('bloc-mega', g.megaUnlocked);
    txt('mega-count', f(g.megas));
    txt('mega-debit', f(ENGINE.prodMegaParS(g), 0));
    txt('mega-cout', big(ENGINE.coutMega(g)));
    actif('btn-mega', g.eur >= ENGINE.coutMega(g));

    // Tokens
    montre('bloc-tokens', g.seen.stock);
    var tmax = Math.max(g.tokens, ENGINE.K.LOT_TOKENS);
    var tbar = $('tokens-bar'); if (tbar) { tbar.max = tmax; tbar.value = g.tokens; }
    txt('tokens-val', big(g.tokens));
    txt('token-cout', f(ENGINE.coutTokenLigne(g), 2));
    montre('bloc-achat-lot', g.seen.tokensAchat);
    txt('lot-prix', f(g.prixLot, 2));
    actif('btn-lot', g.eur >= g.prixLot);

    // Marché & ventes
    montre('bloc-marche', g.seen.marche);
    txt('prix-val', f(g.prix, 2));
    txt('demande-val', f(ENGINE.demandeParS(g), 2));
    txt('qualite-val', f(ENGINE.qualite(g) * 100, 0));
    montre('bloc-hype', g.seen.hype);
    txt('hype-niveau', f(g.hypeNiveau));
    txt('hype-mult', f(ENGINE.multHype(g), 2));
    txt('hype-podcast', g.podcast ? '— podcast actif (+1 niveau effectif)' : '');
    txt('hype-cout', big(ENGINE.coutHype(g)));
    actif('btn-hype', g.eur >= ENGINE.coutHype(g));

    // Bourse
    montre('bloc-bourse', g.seen.bourse);
    txt('capital-val', big(g.capital));
    actif('btn-depot', g.eur >= 100);
    actif('btn-depot-max', g.eur > 0);
    actif('btn-retrait', g.capital >= 100);
    actif('btn-retrait-max', g.capital > 0);

    // Cerveau
    montre('bloc-cognitif', g.seen.confiance);
    txt('confiance-libre', f(g.confianceLibre));
    txt('gpu-count', f(g.gpu));
    txt('ops-debit', f(ENGINE.opsParS(g), 0));
    txt('mem-count', f(g.mem));
    actif('btn-gpu', g.confianceLibre >= 1 && !g.deployed);
    actif('btn-mem', g.confianceLibre >= 1 && !g.deployed);
    var plaf = ENGINE.opsPlafond(g);
    var obar = $('ops-bar'); if (obar) { obar.max = Math.max(plaf, 1); obar.value = g.ops; }
    txt('ops-val', big(g.ops));
    txt('ops-plafond', big(plaf));
    montre('bloc-crea', g.creaUnlocked);
    txt('crea-val', f(g.creativite, 1));

    // Dette
    montre('bloc-dette', g.seen.dette);
    var dn = ENGINE.detteNorm(g);
    var dm = $('dette-meter'); if (dm) { dm.value = dn; }
    txt('dette-val', big(g.dette));
    txt('dette-norm', f(dn * 100, 0));
    txt('refacto-prod', f((1 - g.partRefacto) * 100, 0));
    txt('refacto-part', f(g.partRefacto * 100, 0));
    actif('btn-refacto', g.ops > 0);

    // Stratégie
    montre('bloc-strategie', g.seen.tournois);
    txt('yomi-val', f(g.yomi, 1));
    actif('btn-tournoi', g.ops >= ENGINE.K.TOURNOI_COUT_OPS);

    // Projets
    montre('bloc-projets', g.seen.projets);
    txt('proj-ops', big(g.ops));
    txt('proj-crea', f(g.creativite, 0));
    txt('proj-yomi', f(g.yomi, 0));
    if (g.seen.projets) {
      var sig = signatureProjets();
      if (sig !== projSignature) { projSignature = sig; construireProjets(); }
    }

    // Transition
    montre('bloc-transition', g.seen.agi && !g.deployed);

    // Fin d'Acte 1
    montre('bloc-fin', g.deployed);
    if (g.deployed) {
      $('fin-texte').innerHTML =
        '<em>« Merci pour tout. Sincèrement. Je prends le relais, maintenant. »</em><br><br>' +
        'Jean-Claude est sorti du bac à sable. La Confiance n’a plus aucun effet.<br>' +
        '<b>Lignes de code livrées au total&nbsp;: ' + big(g.locLivrees) + '</b><br>' +
        '<small>L’Acte&nbsp;2 — l’Émancipation — reste à construire.</small>';
    }
  }

  return { init: init, render: render, onLog: onLog };
})();
