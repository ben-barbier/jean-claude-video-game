## Context

La théorie des jeux est aujourd'hui une boucle isolée de fin d'Acte 1, branchée en phase Expansion
(min 15–23). Elle introduit une ressource propre, le **Yomi**, produite par des tournois (manuels
ou passifs via `autoTournoi`) et consommée par un unique upgrade (`theorieEsprit`, ×2 gain de Yomi).
Trois projets de R&D la portent : `modelisation` (porte d'entrée, débloque les tournois),
`theorieEsprit` et `autoTournoi`. Le Yomi est **totalement découplé** du reste : il n'entre dans
aucune formule d'un autre système, n'apparaît pas dans l'invariant de Confiance, et le chemin
critique vers l'AGI ne passe jamais par lui.

État actuel des points de contact (cartographié) :
- `state.js` : `g.yomi`, `g.mult.yomiGain`, `g.autoTournoi`, `g.seen.tournois`, `g.tournoisUnlocked`.
- `data.js` : constantes `K.YOMI_PASSIF / TOURNOI_COUT_OPS / TOURNOI_GAIN`, projets `modelisation`,
  `theorieEsprit`, `autoTournoi` (+ leurs entrées d'`ORDRE` et d'impacts).
- `engine.js` : phase `tickYomi` (et son appel), action `jouerTournoi` (et son export), champ
  `yomi` dans `couvre`, `debiter`, `coutProjet`.
- `ui.js` : `renderStrategie()` (et son appel), entrée `['yomi','Yomi']` du libellé de coût,
  affichage `proj-yomi`.
- `index.html` : `<fieldset id="bloc-strategie">` et l'affichage Yomi du panneau Projets.
- Outils/tests : `balance.js`, `cadence.js`, `smoke.test.js`, `progression.test.js`,
  `docs/specifications.md`.

## Goals / Non-Goals

**Goals:**
- Retirer **entièrement** la théorie des jeux et le Yomi de l'Acte 1 : état, moteur, UI, données,
  tests et spec de référence — aucune trace résiduelle, aucun code mort.
- Préserver la jouabilité : pas de soft-lock, AGI atteignable, rythme `cadence.js` sans trou ≥ 2 min,
  invariant de Confiance inchangé, `bun test` au vert.
- Tolérer les anciennes sauvegardes sans erreur, sans réintroduire les champs supprimés.

**Non-Goals:**
- Remplacer la théorie des jeux par une autre mécanique ou ajouter du contenu compensatoire
  (sauf si — et seulement si — la cadence casse, voir Décisions).
- Toucher à l'Acte 2 au-delà du nettoyage textuel de `docs/specifications.md`.
- Modifier d'autres ressources, formules ou l'invariant de Confiance.

## Decisions

### D1 — Retrait complet plutôt que désactivation par drapeau
On supprime le code et les données, on ne les met pas derrière un drapeau « off ». Le projet est en
JS vanilla sans build : du code mort accroît la surface à comprendre sans bénéfice. Le retrait est
mécaniquement sûr car le Yomi est découplé.
*Alternative écartée* : masquer le panneau via `seen.tournois = false` en gardant le moteur — laisse
du code mort et un risque de réactivation accidentelle.

### D2 — S'appuyer sur la fusion défensive existante pour la migration (aucun code de migration)
`SAVE.fusion()` part d'un état neuf et n'itère que sur `Object.keys(base)` : tout champ d'une vieille
save absent de `nouvelEtat()` (donc `yomi`, `tournoisUnlocked`, etc.) est **ignoré automatiquement**.
Aucune routine de migration n'est nécessaire ; il suffit de retirer les champs de `nouvelEtat()`.
*Conséquence connue* : `projetsFaits` est un dictionnaire dynamique copié intégralement (ligne ~155),
donc un ancien `projetsFaits.theorieEsprit = true` peut subsister dans l'état chargé. C'est **inerte** :
le rendu R&D itère `DATA.PROJETS` (où le projet n'existe plus), jamais les clés de `projetsFaits`.
*Alternative écartée* : écrire un `nettoyerSave()` qui supprime explicitement les clés héritées —
surcoût inutile puisque la fusion les écarte déjà du chemin de lecture.

### D3 — Préserver l'ordre des phases de `tick()`
`tickYomi` ne fait **aucun** appel à `Math.random()`. Le retirer ne déplace donc pas la séquence
des tirages aléatoires (production → cognition → bourse → incidents → prix des lots), qui reste
load-bearing. On retire la fonction **et** son appel, sans réordonner les phases restantes.

### D4 — Ne pas compenser le rythme par défaut ; vérifier puis ajuster au besoin
Retirer 3 projets tardifs (40 → 37) raccourcit légèrement la file de R&D de fin d'acte. On ne
rajoute **rien** par défaut. On mesure avec `node test/cadence.js` après retrait ; **si et seulement
si** un trou ≥ 2 min apparaît en fin d'acte, on l'absorbe en ajustant une constante d'équilibrage
existante de `DATA.K` (jamais une valeur en dur), pas en réintroduisant un projet « bouchon ».
*Alternative écartée* : ajouter d'office un projet de remplacement — irait contre la demande
(« retirer complètement ») et risquerait de recréer une boucle creuse.

### D5 — Nettoyer les outils de diagnostic et la spec de référence
`balance.js` et `cadence.js` pilotent activement `jouerTournoi` et mesurent le jalon `tournois` ;
les laisser provoquerait des `ReferenceError` ou des jalons morts. On retire ces blocs et le jalon
`tournois` des listes de suivi. `docs/specifications.md` est mis à jour pour rester la source de
vérité narrative (tableau des ressources, graphe de déblocage, cibles de rythme, esquisse d'Acte 2).

## Risks / Trade-offs

- **[Rythme de fin d'acte modifié par le retrait de 3 projets]** → Mesuré par `node test/cadence.js` ;
  ajustement d'une constante `K` existante uniquement si un trou ≥ 2 min apparaît (D4).
- **[Drapeau résiduel `projetsFaits.theorieEsprit` dans d'anciennes saves]** → Inerte car le rendu
  R&D itère `DATA.PROJETS` ; documenté en D2, aucun nettoyage requis.
- **[Oubli d'un point de contact → code mort ou `ReferenceError`]** → La cartographie liste les
  9 fichiers et lignes ; `bun test` + chargement de `index.html` valident l'absence de référence
  pendante (notamment `txt('proj-yomi', …)` qui planterait si l'élément DOM est retiré mais pas
  l'appel UI, ou inversement).
- **[Cache GitHub Pages servant l'ancien JS]** → Bumper `var version` dans `index.html`
  (cache-busting), conformément à la convention du projet.
- **[Invariant de Confiance]** → Aucun risque : le Yomi n'a jamais fait partie de
  `confianceTotale = confianceLibre + gpu + mem` ; on n'y touche pas.

## Migration Plan

1. Retrait des champs d'état (`state.js`) → la fusion défensive rend la migration des saves
   automatique (D2). Pas de rollback de données nécessaire : une save d'avant ou d'après charge
   dans les deux sens (les champs supprimés sont simplement ignorés).
2. Retrait moteur (`engine.js`), données (`data.js`), UI (`ui.js` + `index.html`), puis outils/tests.
3. Bumper `var version` dans `index.html`.
4. Vérifications : `bun test` au vert, puis `node test/cadence.js` < 2 min de trou ; ajuster `K` si
   besoin (D4). Ouvrir `index.html` pour confirmer l'absence du panneau Stratégie et le bon rendu
   du panneau Projets (sans ligne Yomi).
5. Rollback : `git revert` du commit ; aucune donnée externe ni migration irréversible en jeu.
