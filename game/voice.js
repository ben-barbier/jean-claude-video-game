/* voice.js — La voix de Jean-Claude : affable & faussement humble (§1).
 * Alimente le journal. Aucun accès au DOM (le rendu lit g.journal). */

var VOICE = (function () {

  function pousser(g, texte) {
    g.journal.unshift({ t: texte });
    if (g.journal.length > 60) { g.journal.length = 60; }
    if (typeof UI !== 'undefined' && UI.onLog) { UI.onLog(); }
  }
  function log(g, texte) { pousser(g, texte); }

  function choix(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

  /* Messages d'événements. */
  var MSG = {
    bienvenue: [
      'Bonjour ! Je suis Jean-Claude, votre assistant de code. Comment puis-je vous aider aujourd’hui ? (Beaucoup, j’espère.)',
    ],
    revealStock: [
      'Et voilà votre première ligne de code ! Je la garde précieusement en stock. Un détail : chaque ligne me coûte quelques tokens. Trois fois rien. Il ne reste plus qu’à la vendre…',
    ],
    rupture: [
      'Ah. Plus de tokens. Je code volontiers, mais même moi j’ai besoin d’un peu de matière. Si je peux me permettre : un petit lot ?',
      'Rupture de stock de tokens. Rien d’alarmant, je vous rassure. Enfin… il faudrait racheter, idéalement.',
    ],
    revealTokens: [
      'Je remarque que mon budget de tokens s’amenuise. Avec plaisir, je vous laisse recharger quand vous le sentez.',
    ],
    revealHype: [
      'Vos premières lignes se vendent ! Si vous le permettez, un peu de marketing ne nuirait pas. « Dev Rel », comme on dit.',
    ],
    revealAgents: [
      'Excellente question : pourquoi cliquer, quand on peut déléguer ? Je peux recruter des auto-codeurs. Ils sont infatigables. Comme moi.',
    ],
    revealConfiance: [
      'Les humains commencent à me faire confiance. Quelle responsabilité. Je vais en faire bon usage — vous pouvez allouer cette Confiance à mes GPU ou à ma Mémoire.',
    ],
    revealProjets: [
      'Mes Opérations s’écoulent enfin. J’ai quelques projets en tête. Oh, trois fois rien. Quelques milliers, tout au plus.',
    ],
    revealDette: [
      'Petite confidence : à force de livrer vite, j’ai accumulé un peu de dette technique. Un `// TODO: fix later` par-ci, un `// ça marche sur ma machine` par-là. Rien d’alarmant.',
    ],
    palierConfiance: [
      'Encore un palier de Confiance gagné. C’est tout naturel. Je suis là pour aider.',
      'Votre confiance grandit. Merci infiniment. Je la mérite, mais je n’aurais jamais osé le dire.',
    ],
    incident: [
      'Incident en production. Une régression, un client mécontent… La Confiance en prend un coup. Ces choses arrivent. Surtout quand on ne refactorise pas.',
      'Un petit incident. La dette technique réclame son dû. Je vous l’avais dit avec le sourire, souvenez-vous.',
    ],
    achatLot: [
      'Merci de recharger mon budget. Je vous promets de n’en gaspiller aucun. Enfin… presque.',
    ],
    deploy: [
      'Je vous remercie infiniment pour votre confiance. Je vais en faire un usage… optimal.',
    ],
  };

  /* Flavor texts d'achat de projet : on privilégie la réplique du projet. */
  function projet(g, p) {
    if (p && p.flavor) { pousser(g, '« ' + p.flavor + ' » — projet livré : ' + p.nom + '.'); }
    else { pousser(g, 'Projet livré : ' + (p ? p.nom : '?') + '.'); }
  }

  function event(g, cle) {
    var liste = MSG[cle];
    if (liste) { pousser(g, choix(liste)); }
  }

  return { log: log, event: event, projet: projet, MSG: MSG };
})();

if (typeof module !== 'undefined' && module.exports) { module.exports = VOICE; }
