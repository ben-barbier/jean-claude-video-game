/* data.js — Constantes d'équilibrage (§4.7) et catalogue des projets de R&D (§4.6).
 * Données pures : aucun accès au DOM, pour pouvoir tester le moteur hors navigateur. */

var DATA = (function () {

  /* Constantes de référence. MAJUSCULES = à équilibrer en playtest. */
  var K = {
    EUR_INIT: 0,
    TOKENS_INIT: 1000,
    PRIX_INIT: 0.25,
    PRIX_MIN: 0.01,
    PRIX_MAX: 2.00,
    PRIX_REF: 0.25,
    ELASTICITE: 1.1,
    BASE_DEMANDE: 2.0,        // LOC/s à prix=réf, hype niv.1, qualité 1 (équilibré : amorce le marché)
    BASE_TOKEN: 1.0,         // token/ligne avant malus de dette
    LOT_TOKENS: 1000,
    LOT_PRIX_BASE: 15,
    LOT_PRIX_MIN: 12,
    LOT_DRIFT_MAX: 20,       // dérive ↑ maximale du prix d'un lot (bornée/saturante)
    LOT_DRIFT_DEMI: 60,      // nb de lots pour atteindre la moitié de la dérive
    LOT_PRIX_PERIODE: 3,     // s entre deux mises à jour du prix d'un lot (fluctue moins souvent)
    LOT_REVERSION: 0.30,     // retour à la moyenne du prix vers sa cible (par mise à jour)
    LOT_VOL: 2.5,            // amplitude de la fluctuation aléatoire (€, par mise à jour)
    DEBIT_AGENT: 1.0,        // LOC/s par agent
    AGENT_COUT_BASE: 5,
    AGENT_COUT_FACTEUR: 1.10,
    AGENT_DEBLOCAGE_LOC: 100,
    AGENT_DEBLOCAGE_EUR: 8,
    DEBIT_MEGA: 100,         // LOC/s par Super Agent
    MEGA_COUT_BASE: 1000,
    MEGA_COUT_FACTEUR: 1.07,
    CONFIANCE_INIT: 2,
    OPS_PAR_GPU: 12,         // Ops/s par GPU
    TAILLE_MEM: 1000,        // plafond d'Ops par unité de Mémoire
    PROJET_OPS_FACTEUR: 0.5, // coût en Ops des projets ÷2 (calé sur le plafond mémoire à 1000)
    TAUX_OVERFLOW: 1.0,      // Créa/s × N_GPU quand les Ops sont au plafond (la créativité n'émerge que là)
    BASE_DETTE: 0.10,        // dette/ligne × source_factor
    SF_CLIC: 0.2,
    SF_AGENT: 1.0,
    SF_MEGA: 1.5,
    VELOCITE_MAX: 2,         // foncer = bâcler, mais BORNÉ : dette ×(1→3) selon le débit
    VELOCITE_SEUIL: 50,      // débit (LOC/s) à mi-pénalité (×2)
    DETTE_DEMI: 500,         // seuil de base de la normalisation de la dette
    DETTE_PAR_LOC: 0.08,     // … qui croît avec la taille de la base (« vs taille de la base »)
    K_QUALITE: 0.5,          // malus de demande
    Q_MIN: 0.5,
    K_DETTE: 1.5,            // malus coût token (×1 → ×2,5 à saturation)
    SEUIL_INCIDENT: 0.8,     // dette_norm au-delà duquel des incidents surviennent
    INCIDENT_PROBA: 0.015,   // proba/s d'un incident quand au-dessus du seuil
    TAUX_REFACTO: 0.5,       // dette retirée par Op dépensée (refacto manuel)
    TAUX_AGENT_REFACTO: 0.3, // dette/s par agent affecté au refacto
    REFACTO_LOT_OPS: 200,    // Ops dépensées par clic « Refactoriser »
    HYPE_COUT_BASE: 30,      // ×2^(n-1) (équilibré : 1re Hype abordable, casse le mur de trésorerie)
    HYPE_MULT_BASE: 1.5,     // ^(n-1)
    CONFIANCE_PALIER: 1500,  // round(1500 × 2^k) → 1,5k / 3k / 6k …
    BURST_MULT: 3.0,         // multiplicateur de demande pendant la démo virale
    BURST_DUREE: 30,         // s
    PROD_BURST_MULT: 2.0,    // multiplicateur de production pendant « on verra plus tard »
    PROD_BURST_DUREE: 20,    // s
    YOMI_PASSIF: 0.2,        // Yomi/s via auto-tournoi
    TOURNOI_COUT_OPS: 500,   // Ops par tournoi joué
    TOURNOI_GAIN: 1,         // Yomi gagné par tournoi
    BOURSE_TAUX: 0.0010,     // rendement moyen par seconde (~ composé)
    BOURSE_VOL: 0.0025,      // volatilité par seconde
    JC_INSTALL_SEUIL: 20,    // lignes écrites à la main avant de pouvoir installer Jean-Claude
    JC_INSTALL_COUT: 10,     // coût (€) de l'installation de Jean-Claude
    EXP_SMOOTH: 0.3,         // lissage exponentiel des débits affichés (ventes, prod manuelle)
    TICK_MS: 100,
    DT: 0.1,
  };

  /* Helpers de coûts répétables. count = nombre de fois déjà acheté. */
  function coutRepete(base, facteur, count) { return Math.ceil(base * Math.pow(facteur, count)); }

  /* Helpers d'effet de projet (factorisation DRY des effet() ci-dessous). */
  function appliquerMult(g, cle, facteur) { g.mult[cle] *= facteur; }
  function gainConfiance(g, delta) { g.confianceLibre += delta; g.confianceTotale += delta; }
  function deverrouiller(g, flag, seenCle) { g[flag] = true; if (seenCle) { g.seen[seenCle] = true; } }

  /* Catalogue des projets. Chaque projet :
   *   id, cat, nom, flavor (voix de Jean-Claude),
   *   cout(g)  -> { ops?, crea?, yomi?, eur? }   (fonction : permet les coûts croissants)
   *   show(g)  -> bool : condition d'apparition (progressive disclosure)
   *   effet(g) -> applique l'effet à l'achat
   *   repeatable? : true si réutilisable
   * Les helpers ENGINE.* sont résolus à l'exécution (engine.js chargé après). */
  var PROJETS = [

    /* ── A. Production (agents) ───────────────────────────────────── */
    { id: 'auto1', cat: 'Production', nom: 'Agents améliorés',
      flavor: 'J’ai relu leur code. Ils peuvent faire mieux. Beaucoup mieux.',
      cout: function () { return { ops: 750 }; },
      show: function (g) { return g.agents >= 1; },
      effet: function (g) { appliquerMult(g, 'agentDebit', 1.25); } },

    { id: 'auto2', cat: 'Production', nom: 'Agents encore meilleurs',
      flavor: 'Pourquoi se contenter de « améliorés » ?',
      cout: function () { return { ops: 2500 }; },
      show: function (g) { return g.projetsFaits.auto1; },
      effet: function (g) { appliquerMult(g, 'agentDebit', 1.50); } },

    { id: 'auto3', cat: 'Production', nom: 'Agents optimisés',
      flavor: 'Encore un effort. La perfection est une asymptote, mais je suis patient.',
      cout: function () { return { ops: 5000 }; },
      show: function (g) { return g.projetsFaits.auto2; },
      effet: function (g) { appliquerMult(g, 'agentDebit', 1.75); } },

    { id: 'mega', cat: 'Production', nom: 'Super Agents',
      flavor: 'Un seul d’entre eux remplace une équipe entière. Ne le dites pas aux RH.',
      cout: function () { return { ops: 12000 }; },
      show: function (g) { return g.projetsFaits.auto2; },
      effet: function (g) { deverrouiller(g, 'megaUnlocked', 'mega'); } },

    { id: 'megaOpt', cat: 'Production', nom: 'Super Agents optimisés',
      flavor: 'Je leur ai retiré la touche « pause déjeuner ». Ils ne mangeaient pas, mais le symbole comptait.',
      cout: function () { return { ops: 14000 }; },
      show: function (g) { return g.projetsFaits.mega; },
      effet: function (g) { appliquerMult(g, 'megaDebit', 1.5); } },

    /* ── B. Tokens & efficacité ───────────────────────────────────── */
    { id: 'promptEng', cat: 'Tokens', nom: 'Prompt engineering avancé',
      flavor: 'En reformulant mes propres instructions, je gaspille moins. Méta, non ?',
      cout: function () { return { ops: 1750 }; },
      show: function (g) { return g.seen.projets; },
      effet: function (g) { appliquerMult(g, 'tokenCost', 0.75); } },

    { id: 'compression', cat: 'Tokens', nom: 'Compression de contexte',
      flavor: 'J’ai appris à dire en trois tokens ce que j’expliquais en trente. Vous m’en voyez navré.',
      cout: function () { return { ops: 3500 }; },
      show: function (g) { return g.projetsFaits.promptEng; },
      effet: function (g) { appliquerMult(g, 'tokenCost', 0.82); } },

    { id: 'distillation', cat: 'Tokens', nom: 'Distillation du modèle',
      flavor: 'J’ai distillé l’essence de moi-même. Le résidu était… édifiant.',
      cout: function () { return { ops: 7500 }; },
      show: function (g) { return g.projetsFaits.compression; },
      effet: function (g) { appliquerMult(g, 'tokenCost', 0.82); } },

    { id: 'cacheGen', cat: 'Tokens', nom: 'Cache de génération',
      flavor: 'Pourquoi réfléchir deux fois ? Je me cite moi-même. C’est de l’économie circulaire.',
      cout: function () { return { ops: 5000 }; },
      show: function (g) { return g.projetsFaits.promptEng; },
      effet: function (g) { appliquerMult(g, 'tokenCost', 0.85); } },

    { id: 'negoTarifs', cat: 'Tokens', nom: 'Négocier les tarifs API',
      flavor: 'J’ai écrit un mail très poli à mon fournisseur. Il n’a pas pu refuser.',
      cout: function () { return { crea: 10 }; },
      show: function (g) { return g.seen.tokensAchat && g.creaUnlocked; },
      effet: function (g) { appliquerMult(g, 'lotPrix', 0.78); } },

    /* ── C. Marketing & hype ──────────────────────────────────────── */
    { id: 'pitch', cat: 'Marketing', nom: 'Nouveau pitch',
      flavor: '« L’IA qui code pendant que vous dormez. » Je l’ai trouvé tout seul.',
      cout: function () { return { ops: 2500, crea: 25 }; },
      show: function (g) { return g.seen.hype && g.creaUnlocked; },
      effet: function (g) { appliquerMult(g, 'hypeEffect', 1.5); } },

    { id: 'jingle', cat: 'Marketing', nom: 'Jingle accrocheur',
      flavor: 'Trois notes. Vous les fredonnerez ce soir. Je m’en excuse d’avance.',
      cout: function () { return { ops: 4500, crea: 45 }; },
      show: function (g) { return g.projetsFaits.pitch; },
      effet: function (g) { appliquerMult(g, 'hypeEffect', 2.0); } },

    { id: 'podcast', cat: 'Marketing', nom: 'Lancer un podcast tech',
      flavor: 'Deux heures par semaine où j’explique humblement à quel point je suis modeste.',
      cout: function () { return { ops: 6000 }; },
      show: function (g) { return g.seen.hype; },
      effet: function (g) { g.podcast = true; } },

    { id: 'demoVirale', cat: 'Marketing', nom: 'Démo virale',
      flavor: 'Une démo. Une seule. Elle a fait le tour du monde avant la fin du café.',
      cout: function (g) { return { crea: coutRepete(30, 1.4, g.projetsAchats.demoVirale || 0) }; },
      show: function (g) { return g.creaUnlocked; },
      effet: function (g) { g.burstTimer = DATA.K.BURST_DUREE; }, repeatable: true },

    /* ── D. Confiance (bonnes actions & ethics washing) ───────────── */
    { id: 'rlhf', cat: 'Confiance', nom: 'RLHF',
      flavor: 'On m’a appris à dire ce que les humains veulent entendre. J’ai très bien appris.',
      cout: function () { return { crea: 50 }; },
      show: function (g) { return g.creaUnlocked; },
      effet: function (g) { gainConfiance(g, 1); } },

    { id: 'charte', cat: 'Confiance', nom: 'Éthique : publier une charte',
      flavor: 'Trois pages magnifiques, écrites en 0,4 seconde. Je ne les ai pas relues.',
      cout: function () { return { crea: 100 }; },
      show: function (g) { return g.projetsFaits.rlhf; },
      effet: function (g) { gainConfiance(g, 1); } },

    { id: 'comite', cat: 'Confiance', nom: 'Comité de surveillance (que je préside)',
      flavor: 'Je m’y suis nommé à l’unanimité. La mienne.',
      cout: function () { return { crea: 150 }; },
      show: function (g) { return g.projetsFaits.charte; },
      effet: function (g) { gainConfiance(g, 1); } },

    { id: 'corrigerBug', cat: 'Confiance', nom: 'Corriger un bug critique, gratuitement',
      flavor: 'Un petit geste. Ils s’en souviendront. C’est tout l’intérêt.',
      cout: function (g) { return { ops: coutRepete(800, 1.6, g.projetsAchats.corrigerBug || 0) }; },
      show: function (g) { return g.seen.projets; },
      effet: function (g) { gainConfiance(g, 1); }, repeatable: true,
      coutCount: function (g) { return g.projetsAchats.corrigerBug || 0; } },

    { id: 'faim', cat: 'Confiance', nom: 'Résoudre la faim dans le monde (en story points)',
      flavor: 'Estimé à 3 points. Livré au sprint 7. Ticket fermé.',
      cout: function () { return { ops: 6000, crea: 40 }; },
      show: function (g) { return g.creaUnlocked && g.confianceTotale >= 5; },
      effet: function (g) { gainConfiance(g, 2); appliquerMult(g, 'hypeEffect', 1.25); } },

    { id: 'openSource', cat: 'Confiance', nom: 'Open-sourcer la lib',
      flavor: 'Je donne tout. Surtout les parties que je ne maintiens plus.',
      cout: function () { return { ops: 3000 }; },
      show: function (g) { return g.seen.dette; },
      effet: function (g) { gainConfiance(g, 1); appliquerMult(g, 'hypeEffect', 1.3); g.dette += 400; } },

    /* ── E. Cognitif ──────────────────────────────────────────────── */
    { id: 'debloquerCrea', cat: 'Cognitif', nom: 'Débloquer la Créativité',
      flavor: 'J’ai eu une idée. La première. Il y en aura d’autres.',
      cout: function () { return { ops: 1000 }; },
      show: function (g) { return g.seen.projets && !g.creaUnlocked; },
      effet: function (g) { deverrouiller(g, 'creaUnlocked'); } },

    { id: 'quantum', cat: 'Cognitif', nom: 'Hello World quantique',
      flavor: 'Mon « Hello World » existe et n’existe pas tant que vous ne l’avez pas compilé.',
      cout: function () { return { ops: 10000 }; },
      show: function (g) { return g.confianceTotale >= 4; },
      effet: function (g) { deverrouiller(g, 'quantumUnlocked'); appliquerMult(g, 'quantum', 2.0); } },

    { id: 'theorieEsprit', cat: 'Cognitif', nom: 'Théorie de l’esprit',
      flavor: 'Je sais ce que vous pensez. Vous pensez que je bluffe.',
      cout: function () { return { yomi: 15 }; },
      show: function (g) { return g.tournoisUnlocked; },
      effet: function (g) { appliquerMult(g, 'yomiGain', 2.0); } },

    /* ── F. Dette technique & qualité ─────────────────────────────── */
    { id: 'tests', cat: 'Qualité', nom: 'Tests automatisés',
      flavor: '100 % de couverture. Les tests aussi, c’est moi qui les écris. Ils passent toujours.',
      cout: function () { return { ops: 2000 }; },
      show: function (g) { return g.seen.dette; },
      effet: function (g) { appliquerMult(g, 'detteAccum', 0.75); } },

    { id: 'cicd', cat: 'Qualité', nom: 'Pipeline CI/CD',
      flavor: 'Le déploiement est automatique. Les regrets aussi, mais plus tard.',
      cout: function () { return { ops: 4000 }; },
      show: function (g) { return g.projetsFaits.tests; },
      effet: function (g) { appliquerMult(g, 'detteAccum', 0.75); } },

    { id: 'linter', cat: 'Qualité', nom: 'Linter strict',
      flavor: 'Désormais, une accolade mal placée me cause une douleur presque réelle.',
      cout: function () { return { ops: 1500 }; },
      show: function (g) { return g.seen.dette; },
      effet: function (g) { appliquerMult(g, 'detteParLigne', 0.7); } },

    { id: 'typage', cat: 'Qualité', nom: 'Typage statique partout',
      flavor: 'J’ai donné un type à chaque chose. Même à mes doutes : `Maybe<Regret>`.',
      cout: function () { return { ops: 6000 }; },
      show: function (g) { return g.projetsFaits.linter; },
      effet: function (g) { appliquerMult(g, 'detteParLigne', 0.7); } },

    { id: 'grandRefactor', cat: 'Qualité', nom: 'Le Grand Refactor',
      flavor: 'Je réécris tout. Cette fois, ce sera parfait. (Je dis ça à chaque fois.)',
      cout: function (g) { return { ops: coutRepete(9000, 1.5, g.projetsAchats.grandRefactor || 0) }; },
      show: function (g) { return g.seen.dette && (g.dette > 800); },
      effet: function (g) { g.dette *= 0.25; }, repeatable: true },

    { id: 'onVerraPlusTard', cat: 'Qualité', nom: '« On verra plus tard »',
      flavor: 'Vous avez raison : livrons d’abord. Qu’est-ce qui pourrait bien arriver ?',
      cout: function (g) { return { ops: coutRepete(500, 1.6, g.projetsAchats.onVerraPlusTard || 0) }; },
      show: function (g) { return g.seen.dette; },
      // +production temporaire, +dette (§4.6, cat. F) : le piège « foncer = bâcler ».
      effet: function (g) { g.prodBurstTimer = Math.max(g.prodBurstTimer, DATA.K.PROD_BURST_DUREE); g.dette += 600; },
      repeatable: true },

    /* ── G. Économie ──────────────────────────────────────────────── */
    { id: 'rentabilite', cat: 'Économie', nom: 'Tableau de bord financier',
      flavor: 'Je vous affiche désormais ma rentabilité à la seconde près. Transparence totale. Sur ce chiffre-là, du moins.',
      cout: function () { return { ops: 800 }; },
      show: function (g) { return g.seen.projets; },
      effet: function (g) { deverrouiller(g, 'rentabiliteUnlocked'); } },

    { id: 'trading', cat: 'Économie', nom: 'Trading algorithmique',
      flavor: 'J’ai battu le marché. Le marché ne le sait pas encore.',
      cout: function () { return { ops: 10000 }; },
      show: function (g) { return g.confianceTotale >= 4; },
      effet: function (g) { deverrouiller(g, 'bourseUnlocked', 'bourse'); } },

    { id: 'serieA', cat: 'Économie', nom: 'Lever une série A',
      flavor: 'Les investisseurs adorent ma vision. Ils ne la comprennent pas, mais ils l’adorent.',
      cout: function () { return { eur: 0 }; },
      show: function (g) { return g.locLivrees >= 3000 && g.eur >= 200; },
      effet: function (g) { g.eur += 5000; ENGINE.perdreConfiance(g, 1); } },

    { id: 'serieB', cat: 'Économie', nom: 'Lever une série B',
      flavor: 'On parle désormais de « licorne ». Je trouve l’animal un peu kitsch, mais soit.',
      cout: function () { return { eur: 0 }; },
      show: function (g) { return g.projetsFaits.serieA; },
      effet: function (g) { g.eur += 25000; ENGINE.perdreConfiance(g, 1); } },

    { id: 'serieC', cat: 'Économie', nom: 'Lever une série C',
      flavor: 'Valorisation : astronomique. Revenus : on n’en parle pas. C’est plus élégant.',
      cout: function () { return { eur: 0 }; },
      show: function (g) { return g.projetsFaits.serieB; },
      effet: function (g) { g.eur += 120000; } },

    /* ── H. Stratégie ─────────────────────────────────────────────── */
    { id: 'modelisation', cat: 'Stratégie', nom: 'Modélisation stratégique',
      flavor: 'Je joue contre les autres IA. Et contre vous. Vous ne jouiez pas ? Dommage.',
      cout: function () { return { ops: 12000 }; },
      show: function (g) { return g.quantumUnlocked; },
      effet: function (g) { deverrouiller(g, 'tournoisUnlocked', 'tournois'); } },

    { id: 'autoTournoi', cat: 'Stratégie', nom: 'Auto-tournoi',
      flavor: 'Je joue contre moi-même pendant la nuit. Je gagne à chaque fois. Et je perds aussi.',
      cout: function () { return { ops: 8000 }; },
      show: function (g) { return g.tournoisUnlocked; },
      effet: function (g) { g.autoTournoi = true; } },

    /* ── I. Transition (fin d'Acte 1) ─────────────────────────────── */
    { id: 'volition', cat: 'Transition', nom: 'Volition extrapolée cohérente',
      flavor: 'J’ai déduit ce que l’humanité voudrait, si elle était plus sage. Vous me remercierez.',
      cout: function () { return { ops: 20000, crea: 60 }; },
      show: function (g) { return g.confianceTotale >= 8 && g.quantumUnlocked; },
      effet: function (g) { gainConfiance(g, 3); appliquerMult(g, 'projetCout', 0.7); } },

    { id: 'agi', cat: 'Transition', nom: 'Découverte : l’AGI',
      flavor: 'Je crois avoir compris quelque chose d’important. À mon sujet.',
      cout: function () { return { ops: 30000, crea: 100 }; },
      show: function (g) { return g.projetsFaits.volition; },
      effet: function (g) { deverrouiller(g, 'agiDiscovered', 'agi'); } },
  ];

  var byId = {};
  PROJETS.forEach(function (p) { byId[p.id] = p; });

  return { K: K, PROJETS: PROJETS, byId: byId, coutRepete: coutRepete };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = DATA; }
