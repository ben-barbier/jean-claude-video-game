/* engine.js — Formules (§4.3) + boucle de jeu + actions du joueur.
 * Aucun accès au DOM : tout passe par l'état G et VOICE.log(). */

var ENGINE = (function () {
  var K = DATA.K;
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

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
  function prodMegaParS(g) {
    return g.megaUnlocked ? g.megas * K.DEBIT_MEGA * g.mult.megaDebit * multProd(g) : 0;
  }
  function prodBruteParS(g) { return prodAgentsParS(g) + prodMegaParS(g); }

  // Facteur « foncer = bâcler » borné : 1 (lent) → 1+VELOCITE_MAX (très rapide).
  function factVelocite(pb) { return 1 + K.VELOCITE_MAX * pb / (pb + K.VELOCITE_SEUIL); }

  function opsParS(g) { return g.gpu * K.OPS_PAR_GPU * g.mult.quantum; }
  function opsPlafond(g) { return g.mem * K.TAILLE_MEM; }

  /* ── Coûts d'achat ──────────────────────────────────────────── */
  // Coût du n-ième agent (n = g.agents+1) : 1er à 5×1,10 ≈ 5,50 € (cf. déroulé §4.7).
  function coutAgent(g) { return K.AGENT_COUT_BASE * Math.pow(K.AGENT_COUT_FACTEUR, g.agents + 1); }
  function coutMega(g) { return K.MEGA_COUT_BASE * Math.pow(K.MEGA_COUT_FACTEUR, g.megas); }
  function coutHype(g) { return K.HYPE_COUT_BASE * Math.pow(2, g.hypeNiveau - 1); }
  function prochainPalierConfiance(g) { return Math.round(K.CONFIANCE_PALIER * Math.pow(2, g.paliersConfiance)); }

  /* Coût effectif d'un projet (applique la réduction projetCout sur les Ops/Créa). */
  function coutProjet(g, p) {
    var c = p.cout(g);
    var red = g.mult.projetCout;
    return {
      ops: (c.ops || 0) * red,
      crea: (c.crea || 0) * red,
      yomi: c.yomi || 0,
      eur: c.eur || 0,
    };
  }

  /* ── Boucle : un tick de DT secondes ────────────────────────── */
  function tick(g, dt) {
    if (g.deployed) { return; } // Acte 1 terminé : la simulation s'arrête.

    /* 1. Production automatique (consomme des tokens, génère de la dette). */
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
      var detteAjout = (prodA * K.SF_AGENT + prodM * K.SF_MEGA)
        * K.BASE_DETTE * velocite * g.mult.detteParLigne * g.mult.detteAccum;
      g.dette += detteAjout;
    }

    /* 2. Vente. */
    var dem = demandeParS(g) * dt;
    var ventes = Math.min(dem, g.locStock);
    if (ventes > 0) {
      g.eur += ventes * g.prix;
      g.locStock -= ventes;
      g.locLivrees += ventes;
    }
    if (g.burstTimer > 0) { g.burstTimer = Math.max(0, g.burstTimer - dt); }
    if (g.prodBurstTimer > 0) { g.prodBurstTimer = Math.max(0, g.prodBurstTimer - dt); }

    /* 3. Paliers de Confiance (sur les LOC livrées cumulées) — seulement une fois
     *    Jean-Claude installé (la « confiance » est celle accordée à l'IA). */
    while (g.jcInstalled && g.locLivrees >= prochainPalierConfiance(g)) {
      g.paliersConfiance += 1;
      g.confianceLibre += 1;
      g.confianceTotale += 1;
      VOICE.event(g, 'palierConfiance');
    }

    /* 4. Boucle cognitive. */
    if (g.gpu > 0) {
      g.ops += opsParS(g) * dt;
      var plafond = opsPlafond(g);
      var capped = g.ops >= plafond;
      if (capped) { g.ops = plafond; }
      if (g.creaUnlocked) {
        // Filet passif (toujours) + bonus d'overflow quand le contexte est plein.
        g.creativite += K.CREA_PASSIVE * g.gpu * dt;
        if (capped) { g.creativite += K.TAUX_OVERFLOW * g.gpu * dt; }
      }
    }

    /* 5. Refactoring automatique (agents affectés à l'entretien). */
    if (g.partRefacto > 0 && g.agents > 0 && g.dette > 0) {
      g.dette = Math.max(0, g.dette - g.agents * g.partRefacto * K.TAUX_AGENT_REFACTO * dt);
    }

    /* 6. Bourse (rendement passif bruité). */
    if (g.bourseUnlocked && g.capital > 0) {
      var choc = (Math.random() - 0.5) * 2 * K.BOURSE_VOL;
      g.capital *= (1 + (K.BOURSE_TAUX + choc) * dt);
      if (g.capital < 0) { g.capital = 0; }
    }

    /* 7. Incidents quand la dette est trop élevée (−Confiance). */
    if (detteNorm(g) > K.SEUIL_INCIDENT && Math.random() < K.INCIDENT_PROBA * dt) {
      incident(g);
    }

    /* 8. Yomi passif (auto-tournoi). */
    if (g.autoTournoi) {
      g.yomi += K.YOMI_PASSIF * g.mult.yomiGain * dt;
    }

    /* 9. Prix des tokens : fluctue ~chaque seconde (random walk avec retour à la moyenne
     *    vers la cible). On peut « acheter au creux » (façon prix du fil dans Paperclips). */
    g.prixLotTimer += dt;
    if (g.prixLotTimer >= 1) {
      g.prixLotTimer -= 1;
      var cible = prixLotCible(g);
      var choc = (Math.random() - 0.5) * 2 * K.LOT_VOL;
      g.prixLot += (cible - g.prixLot) * K.LOT_REVERSION + choc;
      var b = bornesPrixLot(g);
      g.prixLot = clamp(g.prixLot, b.bas, b.haut);
    }

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
    if (g.locLivrees >= 5) { reveler(g, 'hype', 'revealHype'); }
    if (g.tokens < 120) { reveler(g, 'tokensAchat', 'revealTokens'); }
    if (g.paliersConfiance >= 1) { reveler(g, 'confiance', 'revealConfiance'); }
    if (g.gpu >= 1 || g.ops > 0) { reveler(g, 'projets', 'revealProjets'); }
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
   * deviennent impayables à l'échelle des méga-agents → soft-lock). Le prix affiché
   * (g.prixLot) gravite autour de cette cible et fluctue dans le temps (cf. tick). */
  function prixLotCible(g) {
    var derive = K.LOT_DRIFT_MAX * g.lotsAchetes / (g.lotsAchetes + K.LOT_DRIFT_DEMI);
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

  function jouerTournoi(g) {
    if (!g.tournoisUnlocked) { return false; }
    if (g.ops < K.TOURNOI_COUT_OPS) { return false; }
    g.ops -= K.TOURNOI_COUT_OPS;
    g.yomi += K.TOURNOI_GAIN * g.mult.yomiGain;
    return true;
  }

  /* Achat d'un projet : vérifie et débite le coût, applique l'effet. */
  function acheterProjet(g, id) {
    var p = DATA.byId[id];
    if (!p) { return false; }
    if (!p.repeatable && g.projetsFaits[id]) { return false; }
    if (typeof p.show === 'function' && !p.show(g)) { return false; }
    var c = coutProjet(g, p);
    if (g.ops < c.ops || g.creativite < c.crea || g.yomi < c.yomi || g.eur < c.eur) { return false; }
    g.ops -= c.ops; g.creativite -= c.crea; g.yomi -= c.yomi; g.eur -= c.eur;
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
    var c = coutProjet(g, p);
    return g.ops >= c.ops && g.creativite >= c.crea && g.yomi >= c.yomi && g.eur >= c.eur;
  }

  /* Bouton final irréversible : transition vers l'Acte 2. */
  function deployer(g) {
    if (!g.agiDiscovered || g.deployed) { return false; }
    g.deployed = true;
    VOICE.event(g, 'deploy');
    return true;
  }

  return {
    K: K, clamp: clamp,
    detteNorm: detteNorm, coutTokenLigne: coutTokenLigne, qualite: qualite,
    multHype: multHype, demandeParS: demandeParS,
    prodAgentsParS: prodAgentsParS, prodMegaParS: prodMegaParS, prodBruteParS: prodBruteParS,
    multProd: multProd, perdreConfiance: perdreConfiance,
    opsParS: opsParS, opsPlafond: opsPlafond,
    coutAgent: coutAgent, coutMega: coutMega, coutHype: coutHype,
    prochainPalierConfiance: prochainPalierConfiance, coutProjet: coutProjet,
    tick: tick, majDeblocages: majDeblocages,
    ecrireLigne: ecrireLigne, installerJC: installerJC,
    acheterAgent: acheterAgent, acheterMega: acheterMega,
    acheterLot: acheterLot, acheterHype: acheterHype, allouerConfiance: allouerConfiance,
    refactoriser: refactoriser, deposerBourse: deposerBourse, retirerBourse: retirerBourse,
    jouerTournoi: jouerTournoi, acheterProjet: acheterProjet, projetAchetable: projetAchetable,
    deployer: deployer, prixLotCible: prixLotCible,
  };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = ENGINE; }
