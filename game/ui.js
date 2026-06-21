/* ui.js — Rendu DOM + câblage des contrôles + déblocage progressif (§4.4).
 * Seul fichier (avec main.js) à toucher le DOM. Lit l'état G, ne le modifie
 * que via les actions d'ENGINE. */

var UI = (function () {
  var g = null;          // référence vers l'état courant (posée par init)
  var rendreApresAction; // callback fourni par main : applique une action puis re-render
  var projSignature = ''; // pour ne reconstruire la liste de projets qu'au changement
  var premierRendu = true; // le tout 1er rendu ne « flashe » pas (sinon flash général au chargement)

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
  function montre(id, cond) {
    var e = $(id);
    if (!e) { return; }
    var apparait = cond && e.hidden;   // transition caché → visible (= élément révélé)
    e.hidden = !cond;
    if (apparait && !premierRendu) { flash(e); } // clignotement « apparition » façon Paperclips
  }
  // Brève animation de flash quand un élément se révèle en cours de jeu.
  function flash(e) {
    e.classList.remove('flash-new');
    void e.offsetWidth;                // reflow : autorise à rejouer l'animation si déjà jouée
    e.classList.add('flash-new');
    e.addEventListener('animationend', function onEnd() {
      e.classList.remove('flash-new');
      e.removeEventListener('animationend', onEnd);
    });
  }
  function actif(id, cond) { var e = $(id); if (e) { e.disabled = !cond; } }

  /* ── Câblage des contrôles ──────────────────────────────────── */
  function init(etat, doAction) {
    g = etat;
    rendreApresAction = doAction;

    $('btn-ecrire').addEventListener('click', function () { rendreApresAction(ENGINE.ecrireLigne); });
    $('btn-install-jc').addEventListener('click', function () { rendreApresAction(ENGINE.installerJC); });
    $('btn-agent').addEventListener('click', function () { rendreApresAction(ENGINE.acheterAgent); });
    $('btn-mega').addEventListener('click', function () { rendreApresAction(ENGINE.acheterMega); });
    $('btn-lot').addEventListener('click', function () {
      rendreApresAction(function (s) {
        // Le remerciement n'apparaît qu'à la TOUTE PREMIÈRE recharge (lotsAchetes passe à 1).
        if (ENGINE.acheterLot(s) && s.lotsAchetes === 1) { VOICE.event(s, 'achatLot'); }
      });
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
    function ajusterPrix(d) {
      g.prix = ENGINE.clamp(Math.round((g.prix + d) * 100) / 100, ENGINE.K.PRIX_MIN, ENGINE.K.PRIX_MAX);
      $('prix-slider').value = g.prix;
      render();
    }
    $('btn-prix-moins').addEventListener('click', function () { ajusterPrix(-0.01); });
    $('btn-prix-plus').addEventListener('click', function () { ajusterPrix(0.01); });
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
    var champs = [['ops', 'Ops'], ['crea', 'Créa'], ['yomi', 'Yomi'], ['eur', '€']];
    var parts = [];
    champs.forEach(function (ch) {
      if (c[ch[0]]) { parts.push(f(Math.ceil(c[ch[0]])) + ' ' + ch[1]); }
    });
    return parts.length ? parts.join(' + ') : 'gratuit';
  }
  var PROJETS_MAX = 5; // au plus 5 projets affichés à la fois (anti-encombrement)
  function construireProjets() {
    var cont = $('projets-list');
    cont.innerHTML = '';
    // Projets actuellement révélés et pas encore faits (les répétables restent éligibles).
    var visibles = DATA.PROJETS.filter(function (p) {
      var fait = !p.repeatable && g.projetsFaits[p.id];
      return !fait && (!p.show || p.show(g));
    });
    // Sélection ANTI-BLOCAGE des 5 affichés. Ordre de priorité :
    //   1) projets de progression (NON répétables) avant les répétables « bonus » :
    //      tout le chemin critique (déblocages, transition → AGI) est non répétable,
    //      donc jamais évincé de l'affichage par du grind répétable ;
    //   2) projets abordables avant ceux qu'on ne peut pas encore s'offrir ;
    //   3) ordre du catalogue.
    var idx = {}; DATA.PROJETS.forEach(function (p, i) { idx[p.id] = i; });
    visibles.sort(function (a, b) {
      var ra = a.repeatable ? 1 : 0, rb = b.repeatable ? 1 : 0;
      if (ra !== rb) { return ra - rb; }
      var aa = ENGINE.projetAchetable(g, a) ? 0 : 1, ab = ENGINE.projetAchetable(g, b) ? 0 : 1;
      if (aa !== ab) { return aa - ab; }
      return idx[a.id] - idx[b.id];
    });
    visibles.slice(0, PROJETS_MAX).forEach(function (p) {
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
    montre('projets-vide', visibles.length === 0);
  }

  /* ── Journal (terminal) — effet « machine à écrire » ─────────────
   * Les NOUVEAUX messages s'affichent caractère par caractère (vitesse
   * d'une saisie rapide), avec une pause de 0,5 s à chaque fin de phrase
   * (. ! ?) et à chaque changement de ligne. Au (re)chargement, l'historique
   * persisté s'affiche d'un coup (on ne retape pas le passé). */
  var TYPE_CHAR_MS = 23;     // ≈ 43 car./s : frappe rapide (1,5× plus vite qu'avant)
  var TYPE_PAUSE_MS = 500;   // fin de phrase (. ! ?) et changement de ligne
  var TYPE_FILE_MAX = 6;     // au-delà, on rattrape en affichant d'un coup (anti-retard)
  var SCROLL_SEUIL = 28;     // marge (px) sous laquelle on considère le journal « collé en bas »
  var typeFile = [];         // messages en attente de frappe (FIFO)
  var typeActif = false;
  var typeGen = 0;           // jeton : invalide les frappes en cours après un reset

  // Affichage INSTANTANÉ de tout le journal (lancement / rechargement / rattrapage).
  function rendreJournal() {
    var cont = $('journal');
    if (!cont || !g) { return; }
    typeGen++; typeFile = []; typeActif = false; // annule toute frappe en cours
    // Préserve la position de lecture : on ne recolle en bas que si l'utilisateur y était.
    var ancien = cont.scrollTop;
    var enBas = (cont.scrollHeight - ancien - cont.clientHeight) < SCROLL_SEUIL;
    cont.innerHTML = '';
    // Ordre chronologique (plus ancien en haut, plus récent en bas) : ressenti terminal.
    g.journal.slice(0, 50).reverse().forEach(function (e) {
      var p = document.createElement('p');
      p.textContent = '› ' + e.t;
      cont.appendChild(p);
    });
    cont.scrollTop = enBas ? cont.scrollHeight : ancien;
  }

  // Le journal n'est mis à jour qu'à l'arrivée d'un message : on tape le plus récent.
  function onLog() {
    if (!g || !g.journal.length) { return; }
    if (typeFile.length >= TYPE_FILE_MAX) { rendreJournal(); return; } // trop de retard → rattrape
    typeFile.push(g.journal[0].t);
    if (!typeActif) { typerProchain(); }
  }

  function typerProchain() {
    var cont = $('journal');
    if (!cont || !typeFile.length) { typeActif = false; return; }
    typeActif = true;
    var texte = '› ' + typeFile.shift();
    var p = document.createElement('p');
    cont.appendChild(p);
    while (cont.childNodes.length > 50) { cont.removeChild(cont.firstChild); }
    taperCar(cont, p, texte, 0, typeGen);
  }

  function taperCar(cont, p, texte, i, gen) {
    if (gen !== typeGen) { return; }   // un reset a eu lieu : on abandonne cette frappe
    if (i >= texte.length) {           // ligne finie → pause « changement de ligne »
      setTimeout(function () { if (gen === typeGen) { typerProchain(); } }, TYPE_PAUSE_MS);
      return;
    }
    var enBas = (cont.scrollHeight - cont.scrollTop - cont.clientHeight) < SCROLL_SEUIL;
    p.textContent = texte.slice(0, i + 1);
    if (enBas) { cont.scrollTop = cont.scrollHeight; }
    var ch = texte.charAt(i);
    var pause = (ch === '.' || ch === '!' || ch === '?' || ch === '\n');
    setTimeout(function () { taperCar(cont, p, texte, i + 1, gen); }, pause ? TYPE_PAUSE_MS : TYPE_CHAR_MS);
  }

  /* ── Rendu : un rendeur par panneau (SRP), orchestrés par render() ── */

  function renderTableauBord() {
    // Tableau de bord — révélé puis garni progressivement (façon Paperclips).
    montre('bloc-dashboard', g.seen.stock);
    montre('cell-stock', g.seen.stock);
    montre('cell-eur', g.seen.tresorerie);
    montre('cell-livrees', g.seen.stock);
    montre('cell-ventes', g.seen.stock);
    montre('cell-prod', g.seen.stock);
    txt('stat-eur', f(g.eur, 2));
    txt('stat-loc-livrees', big(Math.round(g.locLivrees)));
    txt('stat-loc-stock', big(Math.round(g.locStock)));
    txt('stat-prod', f(ENGINE.prodBruteParS(g) + g.prodManuelleParS, 1));
    txt('stat-ventes', f(g.ventesParS, 1));
    montre('cell-rentabilite', g.rentabiliteUnlocked);
    txt('stat-rentabilite', f(ENGINE.rentabiliteParS(g), 2));

    // Prompt du terminal : user@main avant l'IA, jean-claude@bac-a-sable après.
    txt('journal-host', g.jcInstalled ? 'jean-claude@bac-a-sable' : 'user@main');
    // Compteur de lignes écrites, en bas à droite (rien tant qu'aucune ligne).
    var nLignes = Math.floor(g.lignesProduites);
    txt('journal-rows', nLignes >= 1 ? (nLignes + (nLignes === 1 ? ' row' : ' rows')) : '');
  }

  function renderInstallJC() {
    montre('bloc-install-jc', g.seen.jcDispo && !g.jcInstalled);
    txt('install-cout', f(ENGINE.K.JC_INSTALL_COUT, 0));
    actif('btn-install-jc', g.eur >= ENGINE.K.JC_INSTALL_COUT);
  }

  function renderAgents() {
    montre('bloc-agents', g.seen.agents);
    // 0 agent → la ligne n'affiche QUE le bouton « Recruter un agent ».
    // ≥1 agent → « Agents : N [+1] — P € » (le bouton devient « +1 »).
    var aDesAgents = g.agents >= 1;
    montre('agents-recap', aDesAgents);
    montre('agents-cout-wrap', aDesAgents);
    txt('agents-count', f(g.agents));
    txt('agents-cout', big(ENGINE.coutAgent(g)));
    txt('btn-agent', aDesAgents ? '+1' : 'Recruter un agent');
    actif('btn-agent', g.eur >= ENGINE.coutAgent(g));

    montre('bloc-mega', g.megaUnlocked);
    txt('mega-count', f(g.megas));
    txt('mega-cout', big(ENGINE.coutMega(g)));
    actif('btn-mega', g.eur >= ENGINE.coutMega(g));
  }

  function renderTokens() {
    montre('bloc-tokens', g.seen.tokens);
    var tmax = Math.max(g.tokensMax || ENGINE.K.LOT_TOKENS, g.tokens);
    var tbar = $('tokens-bar'); if (tbar) { tbar.max = tmax; tbar.value = g.tokens; }
    txt('tokens-val', big(g.tokens));
    montre('bloc-achat-lot', g.seen.tokensAchat);
    txt('lot-prix', f(g.prixLot, 2));
    actif('btn-lot', g.eur >= g.prixLot);
  }

  function renderMarche() {
    montre('bloc-marche', g.seen.marche);
    txt('prix-val', f(g.prix, 2));
    txt('demande-val', f(ENGINE.demandeParS(g), 2));
    txt('qualite-val', f(ENGINE.qualite(g) * 100, 0));
    montre('bloc-hype', g.seen.hype);
    txt('hype-niveau', f(g.hypeNiveau));
    txt('hype-podcast', g.podcast ? '— podcast actif (+1 niveau effectif)' : '');
    txt('hype-cout', big(ENGINE.coutHype(g)));
    actif('btn-hype', g.eur >= ENGINE.coutHype(g));
  }

  function renderBourse() {
    montre('bloc-bourse', g.seen.bourse);
    txt('capital-val', big(g.capital));
    actif('btn-depot', g.eur >= 100);
    actif('btn-depot-max', g.eur > 0);
    actif('btn-retrait', g.capital >= 100);
    actif('btn-retrait-max', g.capital > 0);
  }

  function renderCerveau() {
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
  }

  function renderDette() {
    montre('bloc-dette', g.seen.dette);
    var dn = ENGINE.detteNorm(g);
    var dm = $('dette-meter'); if (dm) { dm.value = dn; }
    txt('dette-val', big(g.dette));
    txt('dette-norm', f(dn * 100, 0));
    txt('refacto-prod', f((1 - g.partRefacto) * 100, 0));
    txt('refacto-part', f(g.partRefacto * 100, 0));
    // Le bouton « Refactoriser (200 Ops) » n'apparaît qu'une fois l'unité Ops VISIBLE à
    // l'écran, c.-à-d. le panneau « Cerveau » révélé (seen.confiance) : sinon il référencerait
    // des Ops que le joueur ne voit nulle part (les Ops coulent en sous-main dès gpu≥1).
    // Le slider Production ↔ Refactoring, lui, reste affiché (il ne dépend pas des Ops).
    montre('bloc-refacto', g.seen.confiance);
    actif('btn-refacto', g.ops > 0);
  }

  function renderStrategie() {
    montre('bloc-strategie', g.seen.tournois);
    txt('yomi-val', f(g.yomi, 1));
    actif('btn-tournoi', g.ops >= ENGINE.K.TOURNOI_COUT_OPS);
  }

  function renderProjets() {
    montre('bloc-projets', g.seen.projets);
    txt('proj-ops', big(g.ops));
    txt('proj-crea', f(g.creativite, 0));
    txt('proj-yomi', f(g.yomi, 0));
    if (g.seen.projets) {
      var sig = signatureProjets();
      if (sig !== projSignature) { projSignature = sig; construireProjets(); }
    }
  }

  function renderTransitionFin() {
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

  /* ── Rendu complet : orchestre les rendeurs par panneau (ordre = affichage) ── */
  function render() {
    if (!g) { return; }
    renderTableauBord();
    renderInstallJC();
    renderAgents();
    renderTokens();
    renderMarche();
    renderBourse();
    renderCerveau();
    renderDette();
    renderStrategie();
    renderProjets();
    renderTransitionFin();
    premierRendu = false; // dès le 2e rendu, toute nouvelle révélation déclenche le flash
  }

  return { init: init, render: render, onLog: onLog };
})();
