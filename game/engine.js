/* engine.js — Formules (§4.3) + boucle de jeu + actions du joueur.
 * Aucun accès au DOM : tout passe par l'état G et VOICE.log(). */

var ENGINE = (function () {
  var K = DATA.K;
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  /* ── Petits helpers numériques (factorisation DRY, sans effet de bord) ── */
  // Lissage exponentiel : rapproche `val` de `cible` d'une fraction `facteur`.
  function lissageEMA(val, cible, facteur) { return val + (cible - val) * facteur; }
  // Facteur de lissage des débits AFFICHÉS à constante de temps FIXE K.DEBIT_TAU (indépendant du pas) :
  // α = 1 − e^(−dt/τ). Contrairement à un facteur constant, une ligne ENTIÈRE isolée (bas régime) ne
  // fait monter le débit affiché que de ~1/τ (son débit réel), au lieu d'une pointe à 1/dt → l'indicateur
  // ne bondit plus à 3–4 (cf. change lisser-debit-ventes). Sans biais : converge exactement vers le réel.
  function facteurDebit(dt) { return dt > 0 ? 1 - Math.exp(-dt / K.DEBIT_TAU) : 0; }
  // Choc aléatoire centré dans [−vol ; +vol] (un seul appel à Math.random()).
  function chocAleatoire(vol) { return (Math.random() - 0.5) * 2 * vol; }
  // Courbe saturante (dérivée bornée) : 0 → max, moitié atteinte en x = demi.
  function saturation(x, max, demi) { return max * x / (x + demi); }
  // Coût géométrique brut : base × facteur^expo (sans arrondi).
  function coutCroissant(base, facteur, expo) { return base * Math.pow(facteur, expo); }
  // Durée en secondes → "HH:MM:SS". Minutes/secondes sur 2 chiffres ; heures sur au moins
  // 2 chiffres mais NON bornées (au-delà de 99 h : "100:00:00", pas de troncature).
  function formatDuree(s) {
    var t = Math.max(0, Math.floor(s));
    var h = Math.floor(t / 3600);
    var m = Math.floor((t % 3600) / 60);
    var sec = t % 60;
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return pad(h) + ':' + pad(m) + ':' + pad(sec);
  }

  // Coûts de projet multi-ressources : peut-on payer ? et débit symétrique.
  function couvre(g, c) { return g.ops >= c.ops && g.creativite >= c.crea && g.eur >= c.eur; }
  function debiter(g, c) { g.ops -= c.ops; g.creativite -= c.crea; g.eur -= c.eur; }

  /* ── Grandeurs dérivées ─────────────────────────────────────── */
  // Dette normalisée « vs taille de la base » : une base de code mature tolère plus de
  // dette absolue (sinon, à l'échelle, la dette sature en permanence → incidents en boucle).
  function detteNorm(g) {
    var base = K.DETTE_DEMI + K.DETTE_PAR_LOC * g.locLivrees;
    return g.dette / (g.dette + base);
  }

  function coutTokenLigne(g) {
    return K.BASE_TOKEN * (1 + K.K_DETTE * detteNorm(g)) * g.mult.tokenCost;
  }

  function qualite(g) {
    return clamp(1 - K.K_QUALITE * detteNorm(g), K.Q_MIN, 1);
  }

  function multHype(g) {
    var niveauEffectif = (g.hypeNiveau - 1) + (g.podcast ? 1 : 0);
    return Math.pow(K.HYPE_MULT_BASE, niveauEffectif) * g.mult.hypeEffect;
  }

  function demandeParS(g) {
    var burst = g.burstTimer > 0 ? K.BURST_MULT : 1;
    var prix = Math.max(K.PRIX_MIN, g.prix); // garde-fou : jamais de division par 0
    return K.BASE_DEMANDE * multHype(g)
      * Math.pow(K.PRIX_REF / prix, K.ELASTICITE)
      * qualite(g) * burst;
  }

  // Multiplicateur de production temporaire (« on verra plus tard » : foncer = bâcler).
  function multProd(g) { return g.prodBurstTimer > 0 ? K.PROD_BURST_MULT : 1; }
  function prodAgentsParS(g) {
    return g.agents * (1 - g.partRefacto) * K.DEBIT_AGENT * g.mult.agentDebit * multProd(g);
  }
  // Les Super Agents sont pilotés par le MÊME curseur refacto que les agents (1 - partRefacto) :
  // à 100 % refacto, TOUTE la flotte cesse de produire et passe à l'entretien (anti soft-lock).
  function prodMegaParS(g) {
    return g.megaUnlocked ? g.megas * (1 - g.partRefacto) * K.DEBIT_MEGA * g.mult.megaDebit * multProd(g) : 0;
  }
  function prodBruteParS(g) { return prodAgentsParS(g) + prodMegaParS(g); }

  // Débit du refacto AUTO (toute la flotte IA affectée à l'entretien), en « lignes-équivalent »
  // réécrites/s : capacité de code des agents ET des Super Agents, pondérée par leurs débits
  // respectifs, prise à la fraction partRefacto. Réécrire du code reste du code généré → ce travail
  // CONSOMME des tokens, comme la production (cf. tickRefacto). N'est pas soumis au burst de
  // production (multProd) : c'est de l'entretien.
  function refactoCodingParS(g) {
    if (!(g.partRefacto > 0 && g.dette > 0)) { return 0; }
    var capAgents = g.agents * K.DEBIT_AGENT * g.mult.agentDebit;
    var capMegas = g.megaUnlocked ? g.megas * K.DEBIT_MEGA * g.mult.megaDebit : 0;
    return (capAgents + capMegas) * g.partRefacto;
  }
  // Tokens/s réclamés par TOUTE l'activité des agents : production + refactoring.
  function consoTokensParS(g) { return (prodBruteParS(g) + refactoCodingParS(g)) * coutTokenLigne(g); }

  // Rentabilité nette affichée (€/s) : recette des ventes − coût des tokens consommés par
  // l'activité automatique des agents (coder ET refactoriser ; l'écriture manuelle reste gratuite).
  function rentabiliteParS(g) {
    var recette = g.ventesParS * g.prix;
    var prixParToken = K.LOT_TOKENS > 0 ? g.prixLot / K.LOT_TOKENS : 0;
    var coutTokens = consoTokensParS(g) * prixParToken;
    return recette - coutTokens;
  }

  // Facteur « foncer = bâcler » borné : 1 (lent) → 1+VELOCITE_MAX (très rapide).
  function factVelocite(pb) { return 1 + saturation(pb, K.VELOCITE_MAX, K.VELOCITE_SEUIL); }

  function opsParS(g) { return g.gpu * K.OPS_PAR_GPU * g.mult.quantum; }
  // Plafond d'Ops = surtout la Mémoire allouée, MAIS avec un socle indexé sur la Confiance
  // totale : une allocation déséquilibrée (tout en GPU, mem laissée à 1) ne peut JAMAIS figer
  // définitivement la boucle cognitive (anti soft-lock du « processor trap »). En jeu équilibré
  // (mem ≈ Confiance/2) le socle (Confiance/2,5) ne mord pas → aucun effet sur le rythme nominal ;
  // même une allocation tout-GPU reste FLUIDE et complétable (jeu indulgent : aucune allocation
  // ne brique la partie). La Mémoire garde un léger avantage (plafond plus haut que le socle).
  function opsPlafond(g) { return Math.max(g.mem, Math.floor(g.confianceTotale / 2.5)) * K.TAILLE_MEM; }

  /* ── Coûts d'achat ──────────────────────────────────────────── */
  // Coûts d'achat arrondis à l'euro (pas de centimes). Agent : n = g.agents+1, 1er = round(5×1,10) = 6 €
  // (cf. déroulé §4.7). Super Agent : n = g.megas, 1er = 1000 €.
  function coutAgent(g) { return Math.round(coutCroissant(K.AGENT_COUT_BASE, K.AGENT_COUT_FACTEUR, g.agents + 1)); }
  function coutMega(g) { return Math.round(coutCroissant(K.MEGA_COUT_BASE, K.MEGA_COUT_FACTEUR, g.megas)); }
  function coutHype(g) { return coutCroissant(K.HYPE_COUT_BASE, 2, g.hypeNiveau - 1); }
  function prochainPalierConfiance(g) { return Math.round(K.CONFIANCE_PALIER * Math.pow(K.CONFIANCE_PALIER_FACTEUR, g.paliersConfiance)); }

  /* Coût effectif d'un projet (applique la réduction projetCout sur les Ops/Créa). */
  function coutProjet(g, p) {
    var c = p.cout(g);
    var red = g.mult.projetCout;
    return {
      ops: (c.ops || 0) * red * K.PROJET_OPS_FACTEUR,
      crea: (c.crea || 0) * red,
      eur: c.eur || 0,
    };
  }

  /* ── Boucle : un tick de DT secondes ────────────────────────────
   * Chaque phase est isolée dans sa propre fonction (SRP). tick() n'est qu'un
   * orchestrateur : l'ORDRE des phases — donc des appels à Math.random()
   * (bourse → incidents → prix) — est strictement conservé. */

  // 1. Production automatique (consomme des tokens, génère de la dette).
  function tickProduction(g, dt) {
    var prodA = prodAgentsParS(g) * dt;
    var prodM = prodMegaParS(g) * dt;
    var prodTotal = prodA + prodM;
    if (prodTotal > 0) {
      var ctl = coutTokenLigne(g);
      var tokensReq = prodTotal * ctl;
      if (tokensReq > g.tokens) {
        // Rupture de stock : production limitée par les tokens disponibles.
        var ratio = ctl > 0 ? g.tokens / tokensReq : 0;
        prodA *= ratio; prodM *= ratio; prodTotal *= ratio; tokensReq = g.tokens;
        if (!g.ruptureSignalee && (g.agents + g.megas) > 0) {
          VOICE.event(g, 'rupture');
          g.ruptureSignalee = true;
        }
      } else if (g.tokens > prodTotal * ctl * 3) {
        g.ruptureSignalee = false; // on réarme l'alerte une fois le stock reconstitué
      }
      g.tokens = Math.max(0, g.tokens - tokensReq);
      g.locStock += prodTotal;
      g.lignesProduites += prodTotal;

      var pb = prodBruteParS(g);
      var velocite = factVelocite(pb);
      // Agents et Super Agents génèrent désormais la même dette par ligne (même qualité de code) :
      // un seul source_factor (SF_AUTO) pour toute la production automatique.
      var detteAjout = prodTotal * K.SF_AUTO
        * K.BASE_DETTE * velocite * g.mult.detteParLigne * g.mult.detteAccum;
      g.dette += detteAjout;
    }
    // Débit de production AUTO RÉELLEMENT réalisé (token-limité), pour l'affichage : il tombe
    // à 0 en rupture de tokens, même si le débit NOMINAL (prodBruteParS) reste positif.
    // Lissage à constante de temps fixe (cf. facteurDebit) : pas de sursaut à bas régime.
    g.prodAutoParS = lissageEMA(g.prodAutoParS, dt > 0 ? prodTotal / dt : 0, facteurDebit(dt));
  }

  // 2. Vente + débit de ventes lissé. On n'écoule QUE des lignes ENTIÈRES : la demande
  //    fractionnaire s'accumule (demande 0,5/s → 1 vente toutes les 2 s). La demande non
  //    servie faute de stock ne fait PAS de « backlog » (les clients repartent) : on retient
  //    au plus 1 acheteur en attente au-delà du stock entier disponible.
  function tickVente(g, dt) {
    g.demandeAcc += demandeParS(g) * dt;
    var dispo = Math.floor(g.locStock); // lignes entières réellement disponibles
    if (g.demandeAcc > dispo + 1) { g.demandeAcc = dispo + 1; }
    var ventes = Math.min(Math.floor(g.demandeAcc), dispo);
    if (ventes > 0) {
      g.eur += ventes * g.prix;
      g.locStock -= ventes;
      g.locLivrees += ventes;
      g.demandeAcc -= ventes;
    }
    // Débit de ventes RÉEL (lissé) : reflète ce qui s'écoule vraiment, même quand le stock
    // est vendu aussi vite qu'il est produit (l'affichage ne tombe plus à 0 à tort).
    // Lissage à constante de temps fixe (cf. facteurDebit) : on ne vend que des lignes ENTIÈRES,
    // donc à bas régime une vente isolée ne fait plus bondir l'indicateur à 3–4.
    g.ventesParS = lissageEMA(g.ventesParS, dt > 0 ? ventes / dt : 0, facteurDebit(dt));
    if (g.burstTimer > 0) { g.burstTimer = Math.max(0, g.burstTimer - dt); }
    if (g.prodBurstTimer > 0) { g.prodBurstTimer = Math.max(0, g.prodBurstTimer - dt); }
  }

  // 3. Paliers de Confiance (sur les LOC livrées cumulées) — seulement une fois
  //    Jean-Claude installé (la « confiance » est celle accordée à l'IA).
  function tickPaliersConfiance(g) {
    while (g.jcInstalled && g.locLivrees >= prochainPalierConfiance(g)) {
      g.paliersConfiance += 1;
      g.confianceLibre += 1;
      g.confianceTotale += 1;
      VOICE.event(g, 'palierConfiance');
    }
  }

  // 4. Boucle cognitive (Ops produites, créativité au plafond).
  //    Le « Cerveau » est celui de Jean-Claude : aucune Op tant qu'il n'est pas installé
  //    (l'état neuf démarre pourtant avec 1 GPU/1 Mémoire, dotation du futur post-install).
  function tickCognition(g, dt) {
    if (g.jcInstalled && g.gpu > 0) {
      g.ops += opsParS(g) * dt;
      var plafond = opsPlafond(g);
      var capped = g.ops >= plafond;
      if (capped) { g.ops = plafond; }
      // La créativité n'émerge QUE lorsque les Ops sont à 100 % de leur capacité
      // (contexte plein : mémoire non nulle ET Ops au plafond).
      if (g.creaUnlocked && plafond > 0 && capped) {
        g.creativite += K.TAUX_OVERFLOW * g.gpu * dt;
        if (!g.seen.premierOverflow) {      // 1er débordement réel du contexte → réplique unique
          g.seen.premierOverflow = true;
          VOICE.event(g, 'premierOverflow');
        }
      }
    }
  }

  // 5. Refactoring automatique (agents affectés à l'entretien) : CONSOMME des tokens (les agents
  //    réécrivent du code). À sec de tokens, le refacto ralentit d'autant (ratio de couverture).
  function tickRefacto(g, dt) {
    if (g.partRefacto > 0 && g.dette > 0) {
      var loc = refactoCodingParS(g);                 // lignes-équivalent réécrites/s (agents + Super Agents)
      var tokensReq = loc * coutTokenLigne(g) * dt;
      var ratio = 1;
      if (tokensReq > g.tokens) { ratio = tokensReq > 0 ? g.tokens / tokensReq : 0; tokensReq = g.tokens; }
      g.tokens = Math.max(0, g.tokens - tokensReq);
      // Chaque ligne réécrite retire TAUX_REFACTO_PAR_LOC de dette → la dette retirée dérive de la
      // MÊME grandeur que la conso de tokens : à 100 % refacto la dette est toujours résorbable.
      g.dette = Math.max(0, g.dette - loc * K.TAUX_REFACTO_PAR_LOC * ratio * dt);
    }
  }

  // 6. Bourse (rendement passif bruité).
  function tickBourse(g, dt) {
    if (g.bourseUnlocked && g.capital > 0) {
      var choc = chocAleatoire(K.BOURSE_VOL);
      g.capital *= (1 + (K.BOURSE_TAUX + choc) * dt);
      if (g.capital < 0) { g.capital = 0; }
    }
  }

  // 7. Incidents quand la dette est trop élevée (−Confiance).
  function tickIncidents(g, dt) {
    if (detteNorm(g) > K.SEUIL_INCIDENT && Math.random() < K.INCIDENT_PROBA * dt) {
      incident(g);
    }
  }

  // 8. Prix des tokens : fluctue toutes les LOT_PRIX_PERIODE secondes (random walk avec
  //    retour à la moyenne vers la cible). On peut « acheter au creux » (façon Paperclips).
  function tickPrixLot(g, dt) {
    g.prixLotTimer += dt;
    if (g.prixLotTimer >= K.LOT_PRIX_PERIODE) {
      g.prixLotTimer -= K.LOT_PRIX_PERIODE;
      var cible = prixLotCible(g);
      var choc = chocAleatoire(K.LOT_VOL);
      g.prixLot = lissageEMA(g.prixLot, cible, K.LOT_REVERSION) + choc;
      var b = bornesPrixLot(g);
      g.prixLot = clamp(g.prixLot, b.bas, b.haut);
    }
  }

  // Pic de tokens (échelle de la jauge). Les clics ne sont plus comptés comme un débit affiché.
  function tickEchelleTokens(g, dt) {
    g.tokensMax = Math.max(g.tokensMax, g.tokens);
  }

  function tick(g, dt) {
    if (g.deployed) { return; } // Acte 1 terminé : la simulation s'arrête (la durée se fige aussi).
    g.tempsEcoule += dt;        // durée de jeu écoulée (simple scalaire : aucun Math.random, ordre des phases neutre)
    tickProduction(g, dt);
    tickVente(g, dt);
    tickPaliersConfiance(g);
    tickCognition(g, dt);
    tickRefacto(g, dt);
    tickBourse(g, dt);
    tickIncidents(g, dt);
    tickPrixLot(g, dt);
    tickEchelleTokens(g, dt);
    majDeblocages(g);
  }

  /* Retire n points de Confiance en préservant l'invariant
   * confianceTotale = confianceLibre + gpu + mem : on pioche d'abord dans les points
   * libres, sinon on désalloue un GPU puis une Mémoire. */
  function perdreConfiance(g, n) {
    for (var i = 0; i < n; i++) {
      if (g.confianceLibre > 0) { g.confianceLibre -= 1; }
      else if (g.gpu > 0) { g.gpu -= 1; }
      else if (g.mem > 0) { g.mem -= 1; }
      g.confianceTotale = Math.max(0, g.confianceTotale - 1);
    }
  }

  // Un incident ne mord que la Confiance NON allouée : il ne « grille » jamais les
  // GPU/Mémoire déjà investis (sinon la boucle cognitive s'effondre à l'échelle).
  // Sans confiance libre à perdre, il se solde par un remboursement client.
  function incident(g) {
    if (g.confianceLibre > 0) {
      g.confianceLibre -= 1;
      g.confianceTotale = Math.max(0, g.confianceTotale - 1);
    } else {
      g.eur = Math.max(0, g.eur - g.eur * 0.05);
    }
    VOICE.event(g, 'incident');
  }

  /* ── Déblocage progressif de l'interface (§4.4) ─────────────── */
  function reveler(g, cle, evt) {
    if (!g.seen[cle]) { g.seen[cle] = true; if (evt) { VOICE.event(g, evt); } }
  }
  function majDeblocages(g) {
    // ── Phase « dev en solo » (avant l'installation de l'IA) ──────────────
    // Les panneaux apparaissent sans message : on laisse le joueur interpréter.
    if (g.lignesProduites >= 1) {
      reveler(g, 'stock');   // 1re ligne → tableau de bord
      reveler(g, 'marche');  // … et le marché pour la vendre
    }
    if (g.eur > 0 || g.locLivrees >= 1) { reveler(g, 'tresorerie'); } // 1re vente → €

    if (!g.jcInstalled) {
      // À 20 lignes écrites : le bouton « Installer Jean-Claude » apparaît (sans texte).
      if (g.lignesProduites >= K.JC_INSTALL_SEUIL) { reveler(g, 'jcDispo'); }
      return; // tout le reste n'apparaît qu'une fois Jean-Claude installé
    }

    // ── Phase « IA » (Jean-Claude installé) ───────────────────────────────
    reveler(g, 'tokens');                    // budget de génération de l'IA
    reveler(g, 'agents', 'revealAgents');    // agents : production automatisée par l'IA
    // La hype n'apparaît qu'APRÈS 5 agents : on étale les révélations post-install
    // (sinon, comme installer JC suppose déjà des ventes, tout sortirait d'un bloc).
    if (g.agents >= 5) { reveler(g, 'hype', 'revealHype'); }
    if (g.tokens < 120) { reveler(g, 'tokensAchat', 'revealTokens'); }
    if (g.paliersConfiance >= 1) { reveler(g, 'confiance', 'revealConfiance'); }
    if (g.seen.confiance) { reveler(g, 'projets', 'revealProjets'); }
    if (prodBruteParS(g) >= 5 && g.dette > 20) { reveler(g, 'dette', 'revealDette'); }
  }

  /* ── Actions du joueur ──────────────────────────────────────── */

  // Écrire une ligne À LA MAIN : c'est VOTRE travail de dev → GRATUIT (aucun token).
  // Seule la génération par l'IA (agents) consomme des tokens.
  function ecrireLigne(g) {
    if (g.deployed) { return; }
    g.locStock += 1;
    g.lignesProduites += 1;
    var pb = prodBruteParS(g);
    g.dette += K.BASE_DETTE * K.SF_CLIC * factVelocite(pb)
      * g.mult.detteParLigne * g.mult.detteAccum;
    majDeblocages(g);
  }

  // Installer Jean-Claude (l'assistant IA) : débloque les tokens, les agents, etc.
  function installerJC(g) {
    if (g.jcInstalled || g.deployed) { return false; }
    if (g.lignesProduites < K.JC_INSTALL_SEUIL) { return false; }
    if (g.eur < K.JC_INSTALL_COUT) { return false; }
    g.eur -= K.JC_INSTALL_COUT;
    g.jcInstalled = true;
    VOICE.install(g);
    majDeblocages(g);
    return true;
  }

  function acheterAgent(g) {
    if (!g.jcInstalled) { return false; } // les agents sont déployés par l'IA (installation requise)
    var c = coutAgent(g);
    if (g.eur < c) { return false; }
    g.eur -= c; g.agents += 1; return true;
  }

  function acheterMega(g) {
    if (!g.megaUnlocked) { return false; }
    var c = coutMega(g);
    if (g.eur < c) { return false; }
    g.eur -= c; g.megas += 1; return true;
  }

  /* Prix « cible » d'un lot : dérive ↑ avec les achats mais SATURE (sinon les tokens
   * deviennent impayables à l'échelle des Super Agents → soft-lock). Le prix affiché
   * (g.prixLot) gravite autour de cette cible et fluctue dans le temps (cf. tick). */
  function prixLotCible(g) {
    var derive = saturation(g.lotsAchetes, K.LOT_DRIFT_MAX, K.LOT_DRIFT_DEMI);
    return (K.LOT_PRIX_BASE + derive) * g.mult.lotPrix;
  }
  function bornesPrixLot(g) {
    return { bas: K.LOT_PRIX_MIN * g.mult.lotPrix,
             haut: (K.LOT_PRIX_BASE + K.LOT_DRIFT_MAX + 8) * g.mult.lotPrix };
  }
  function acheterLot(g) {
    var c = g.prixLot;
    if (g.eur < c) { return false; }
    g.eur -= c;
    g.tokens += K.LOT_TOKENS;
    g.lotsAchetes += 1; // fait monter la cible : le prix dérivera ↑ dans les secondes qui suivent
    return true;
  }
  // Achat GROUPÉ de n lots (boutons +1K / +10K / +100K) : évite de cliquer sans fin à l'échelle.
  // Le prix par lot (g.prixLot) est figé entre deux fluctuations → la fournée paie n × prixLot.
  // Tout ou rien : on n'achète que si on peut se payer les n lots (le bouton est sinon désactivé).
  function acheterLots(g, n) {
    var c = n * g.prixLot;
    if (n <= 0 || g.eur < c) { return 0; }
    g.eur -= c;
    g.tokens += n * K.LOT_TOKENS;
    g.lotsAchetes += n; // dérive la cible d'autant (achat en masse = prix futur plus haut)
    return n;
  }

  function acheterHype(g) {
    var c = coutHype(g);
    if (g.eur < c) { return false; }
    g.eur -= c; g.hypeNiveau += 1; return true;
  }

  function allouerConfiance(g, cible) { // cible: 'gpu' | 'mem'
    if (g.confianceLibre < 1) { return false; }
    if (g.deployed) { return false; }
    g.confianceLibre -= 1;
    if (cible === 'gpu') { g.gpu += 1; } else { g.mem += 1; }
    return true;
  }

  function refactoriser(g) {
    var ops = Math.min(g.ops, K.REFACTO_LOT_OPS);
    if (ops <= 0) { return false; }
    g.ops -= ops;
    g.dette = Math.max(0, g.dette - ops * K.TAUX_REFACTO);
    return true;
  }

  function deposerBourse(g, montant) {
    if (!g.bourseUnlocked) { return false; }
    montant = Math.min(montant, g.eur);
    if (montant <= 0) { return false; }
    g.eur -= montant; g.capital += montant; return true;
  }
  function retirerBourse(g, montant) {
    montant = Math.min(montant, g.capital);
    if (montant <= 0) { return false; }
    g.capital -= montant; g.eur += montant; return true;
  }

  /* Achat d'un projet : vérifie et débite le coût, applique l'effet. */
  function acheterProjet(g, id) {
    var p = DATA.byId[id];
    if (!p) { return false; }
    if (!p.repeatable && g.projetsFaits[id]) { return false; }
    if (typeof p.show === 'function' && !p.show(g)) { return false; }
    var c = coutProjet(g, p);
    if (!couvre(g, c)) { return false; }
    debiter(g, c);
    p.effet(g);
    if (p.repeatable) {
      g.projetsAchats[id] = (g.projetsAchats[id] || 0) + 1;
    } else {
      g.projetsFaits[id] = true;
    }
    VOICE.projet(g, p);
    return true;
  }

  function projetAchetable(g, p) {
    if (!p.repeatable && g.projetsFaits[p.id]) { return false; }
    if (typeof p.show === 'function' && !p.show(g)) { return false; }
    return couvre(g, coutProjet(g, p));
  }

  /* Bouton final irréversible : transition vers l'Acte 2. */
  function deployer(g) {
    if (!g.agiDiscovered || g.deployed) { return false; }
    g.deployed = true;
    VOICE.event(g, 'deploy');
    return true;
  }

  return {
    K: K, clamp: clamp, formatDuree: formatDuree,
    detteNorm: detteNorm, coutTokenLigne: coutTokenLigne, qualite: qualite,
    multHype: multHype, demandeParS: demandeParS, rentabiliteParS: rentabiliteParS,
    prodAgentsParS: prodAgentsParS, prodMegaParS: prodMegaParS, prodBruteParS: prodBruteParS,
    refactoCodingParS: refactoCodingParS, consoTokensParS: consoTokensParS,
    multProd: multProd, perdreConfiance: perdreConfiance,
    opsParS: opsParS, opsPlafond: opsPlafond,
    coutAgent: coutAgent, coutMega: coutMega, coutHype: coutHype,
    prochainPalierConfiance: prochainPalierConfiance, coutProjet: coutProjet,
    tick: tick, majDeblocages: majDeblocages,
    ecrireLigne: ecrireLigne, installerJC: installerJC,
    acheterAgent: acheterAgent, acheterMega: acheterMega,
    acheterLot: acheterLot, acheterLots: acheterLots, acheterHype: acheterHype, allouerConfiance: allouerConfiance,
    refactoriser: refactoriser, deposerBourse: deposerBourse, retirerBourse: retirerBourse,
    acheterProjet: acheterProjet, projetAchetable: projetAchetable,
    deployer: deployer, prixLotCible: prixLotCible,
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = ENGINE; }
