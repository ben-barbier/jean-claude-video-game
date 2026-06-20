/* state.js — Forme de l'état du jeu (§4.1) + sauvegarde localStorage (§1).
 * G est l'unique source de vérité. Aucun accès au DOM ici. */

function nouvelEtat() {
  var K = DATA.K;
  return {
    /* ── Ressources ─────────────────────────────────────────── */
    eur: K.EUR_INIT,
    tokens: K.TOKENS_INIT,
    locStock: 0,            // lignes produites non vendues
    locLivrees: 0,          // cumul vendu → score + paliers de Confiance
    confianceLibre: K.CONFIANCE_INIT,  // points à allouer
    confianceTotale: K.CONFIANCE_INIT, // cumul (libre + alloué) pour les déblocages
    gpu: 0,
    mem: 0,
    ops: 0,
    creativite: 0,
    dette: 0,
    yomi: 0,
    capital: 0,            // épargne placée en bourse

    /* ── Bâtiments / automatisations ────────────────────────── */
    agents: 0,
    megas: 0,

    /* ── Rôle : on est un DEV qui, à terme, installe l'IA ───── */
    jcInstalled: false,    // Jean-Claude installé (débloque tokens, auto-codeurs, etc.)
    lignesProduites: 0,    // cumul de lignes produites (déclencheur d'installation)

    /* ── Réglages pilotés par le joueur ─────────────────────── */
    prix: K.PRIX_INIT,
    partRefacto: 0,        // 0 → 1 : part des agents affectée au refactoring
    hypeNiveau: 1,         // mult = HYPE_MULT_BASE^(niveau-1)

    /* ── Marché des tokens ──────────────────────────────────── */
    lotsAchetes: 0,
    prixLot: K.LOT_PRIX_BASE,
    prixLotTimer: 0,       // cadence de fluctuation du prix des tokens (~1 s)

    /* ── Multiplicateurs (modifiés par les projets) ─────────── */
    mult: {
      agentDebit: 1,
      megaDebit: 1,
      tokenCost: 1,
      lotPrix: 1,
      hypeEffect: 1,
      detteAccum: 1,       // taux d'accumulation (tests, CI/CD)
      detteParLigne: 1,    // dette par ligne (linter, typage)
      quantum: 1,          // boost d'Ops
      yomiGain: 1,
      projetCout: 1,       // réduction du coût des projets
    },

    /* ── Drapeaux de déblocage (via projets / progression) ──── */
    creaUnlocked: false,
    megaUnlocked: false,
    bourseUnlocked: false,
    quantumUnlocked: false,
    tournoisUnlocked: false,
    agiDiscovered: false,
    deployed: false,       // Acte 2 enclenché (irréversible)
    podcast: false,        // hype passive
    autoTournoi: false,    // Yomi passif

    /* ── Projets ────────────────────────────────────────────── */
    projetsFaits: {},      // id -> true
    projetsAchats: {},     // id -> nb d'achats (répétables)

    /* ── Déblocage progressif de l'interface (§4.4) ─────────── */
    seen: {
      stock: false,        // 1re ligne écrite → tableau de bord
      marche: false,       // … → panneau marché / vente
      tresorerie: false,   // 1re vente → €
      jcDispo: false,      // 20 lignes → bouton « Installer Jean-Claude »
      tokens: false,       // JC installé → jauge de tokens (budget de l'IA)
      tokensAchat: false,
      hype: false,
      agents: false,
      confiance: false,
      projets: false,
      dette: false,
      bourse: false,
      mega: false,
      tournois: false,
      agi: false,
    },

    /* ── Divers ─────────────────────────────────────────────── */
    paliersConfiance: 0,   // nb de paliers de LOC déjà franchis
    burstTimer: 0,         // s restantes de burst de demande (démo virale)
    prodBurstTimer: 0,     // s restantes de burst de production (« on verra plus tard »)
    ruptureSignalee: false,// pour ne logguer la 1ère rupture qu'une fois
    journal: [],           // lignes de log (les plus récentes en tête)
    version: 1,
  };
}

/* ── Sauvegarde / chargement localStorage ───────────────────── */
var SAVE = (function () {
  var CLE = 'jeanclaude_save_v1';

  function disponible() {
    try { return typeof localStorage !== 'undefined'; } catch (e) { return false; }
  }

  function sauver(g) {
    if (!disponible()) { return false; }
    try {
      // On ne persiste pas le journal entier pour rester léger.
      var copie = JSON.parse(JSON.stringify(g));
      copie.journal = g.journal.slice(0, 30);
      localStorage.setItem(CLE, JSON.stringify(copie));
      return true;
    } catch (e) { return false; }
  }

  function charger() {
    if (!disponible()) { return null; }
    try {
      var brut = localStorage.getItem(CLE);
      if (!brut) { return null; }
      var sauv = JSON.parse(brut);
      // Fusion défensive : on repart d'un état neuf et on écrase avec la sauvegarde,
      // pour récupérer les champs ajoutés après la sauvegarde (migrations douces).
      var base = nouvelEtat();
      return fusion(base, sauv);
    } catch (e) { return null; }
  }

  /* Fusion récursive : conserve la structure de `base` (état neuf), applique les
   * valeurs de `sauv` avec contrôle de type. Distingue :
   *  - objets à clés fixes non vides (mult, seen) → fusion récursive (migrations douces) ;
   *  - dictionnaires dynamiques vides dans l'état neuf (projetsFaits, projetsAchats)
   *    → copie intégrale (sinon ils seraient vidés, cf. bug de progression/exploit) ;
   *  - tableaux → remplacés si la save fournit bien un tableau ;
   *  - primitives → copiées seulement si le type concorde (rejette null/objets corrompus). */
  function fusion(base, sauv) {
    if (sauv == null || typeof sauv !== 'object') { return base; }
    Object.keys(base).forEach(function (cle) {
      if (!(cle in sauv)) { return; }
      var v = sauv[cle];
      var b = base[cle];
      if (b && typeof b === 'object' && !Array.isArray(b)) {
        if (!v || typeof v !== 'object' || Array.isArray(v)) { return; }
        if (Object.keys(b).length > 0) { fusion(b, v); }   // clés fixes : récursion
        else { base[cle] = v; }                            // dict dynamique : copie intégrale
      } else if (Array.isArray(b)) {
        if (Array.isArray(v)) { base[cle] = v; }
      } else {
        if (v !== null && typeof v === typeof b) { base[cle] = v; }
      }
    });
    return base;
  }

  function effacer() {
    if (!disponible()) { return; }
    try { localStorage.removeItem(CLE); } catch (e) { /* ignore */ }
  }

  return { sauver: sauver, charger: charger, effacer: effacer };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { nouvelEtat: nouvelEtat, SAVE: SAVE };
}
