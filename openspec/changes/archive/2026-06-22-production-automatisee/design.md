## Context

Le tableau de bord affiche aujourd'hui une cellule « Production » dont la valeur est
`f(g.prodAutoParS + g.prodManuelleParS, 0)` (`game/ui.js:264`). Deux débits lissés par EMA
y sont additionnés :

- `g.prodAutoParS` — débit automatique réel des agents/Super Agents, token-limité (retombe à 0
  en rupture de tokens), mis à jour dans `tickProduction` (`engine.js:149`).
- `g.prodManuelleParS` — débit manuel issu des clics, dérivé de `g.clicsAcc` dans
  `tickDebitsManuels` (`engine.js:252-255`).

Chaque clic (`ecrireLigne`, `engine.js:334-343`) incrémente `g.clicsAcc`. Comme le pas de boucle
est `DT = 0,1 s`, un seul clic se traduit par un pic instantané de `tauxManuel = 10/s` injecté
dans l'EMA (`K.EXP_SMOOTH = 0.3`). C'est la cause dominante du « sautillement » : la valeur
affichée mélange une cadence automatique stable et des impulsions de clics.

La cellule devient visible dès la 1re ligne écrite (`montre('cell-prod', g.seen.stock)`,
`ui.js:260` ; `seen.stock` posé à la 1re ligne, `engine.js:306-307`), donc bien avant que la
moindre production automatique n'existe.

Contraintes du projet : `G` est l'unique source de vérité ; `data/voice/state/engine` sans DOM ;
invariant `confianceTotale = confianceLibre + gpu + mem` ; `index.html var version` à bumper à
chaque modif d'un `game/*.js` ; `bun test` au vert et cadence sans trou ≥ 2 min.

## Goals / Non-Goals

**Goals:**
- Afficher une cadence de production **lisible et fiable** : le seul débit de l'IA.
- Renommer l'indicateur en « Production automatisée » pour qu'il dise ce qu'il mesure.
- Éviter tout affichage trompeur (pas de « 0 lignes/s » pendant la phase de clic manuel).
- Retirer le code mort qui en découle (débit manuel) sans casser les sauvegardes ni la balance.

**Non-Goals:**
- Ne PAS modifier l'équilibrage : les clics produisent toujours autant de lignes, de stock et de
  dette (`ecrireLigne` conserve son effet sur `locStock`, `lignesProduites`, `dette`).
- Ne PAS sur-lisser ni masquer les ruptures de tokens / bursts : `K.EXP_SMOOTH` reste à 0,3.
- Ne PAS introduire un second indicateur « production manuelle » à côté du bouton (hors périmètre).
- Ne PAS toucher au débit de ventes (`g.ventesParS`), qui continue d'utiliser l'EMA.

## Decisions

### D1 — Afficher `g.prodAutoParS` seul, pas le débit nominal

`renderTableauBord` passe de `f(g.prodAutoParS + g.prodManuelleParS, 0)` à `f(g.prodAutoParS, 0)`.

On garde le débit **réel** (`prodAutoParS`, token-limité, lissé) plutôt que le débit **nominal**
(`prodBruteParS(g)`, parfaitement constant entre deux achats). Rationale : le nominal serait
« stable » mais malhonnête — il afficherait la pleine cadence pendant une rupture de tokens où
rien n'est produit. Une fois les clics retirés, `prodAutoParS` est déjà plat entre deux
événements ; son mouvement résiduel (ruptures, bursts) est du signal utile au joueur.
Le test `test/production-rupture.test.js` (qui vérifie déjà ce comportement) reste vert.

### D2 — Conditionner la visibilité sur `g.seen.agents`

`montre('cell-prod', g.seen.stock)` devient `montre('cell-prod', g.seen.agents)`.

`seen.agents` est posé juste après l'installation de Jean-Claude (`engine.js:320`), c.-à-d. au
moment où la production automatique commence à exister. Avant cela, le joueur ne voit que le
compteur de stock et clique — afficher une cadence automatique à 0 serait déroutant. Alternative
écartée : garder `seen.stock` et afficher « — » tant que `prodAutoParS == 0` → plus de cas
particuliers dans l'UI pour un gain nul.

### D3 — Supprimer la machinerie de débit manuel

- `state.js` : retrait des champs `prodManuelleParS` et `clicsAcc` de `nouvelEtat()`.
- `engine.js` : `ecrireLigne` n'incrémente plus `g.clicsAcc` ; `tickDebitsManuels` perd le calcul
  de `g.prodManuelleParS` et de `tauxManuel`, mais **conserve** la mise à jour
  `g.tokensMax = Math.max(g.tokensMax, g.tokens)` (seule responsabilité restante de la fonction —
  on la garde sous ce nom, ou on la fond dans une phase existante au choix de l'implémentation).
- `data.js` : commentaire de `EXP_SMOOTH` mis à jour (ne mentionne plus « prod manuelle »).

Rationale : une fois la valeur retirée de l'affichage, ces champs deviennent du code mort
write-only. CLAUDE.md privilégie le code propre. Alternative écartée : laisser les champs en place
« au cas où » → dette inutile.

### D4 — Compatibilité des sauvegardes

Aucune migration explicite nécessaire. `SAVE.fusion` (`state.js:145-162`) n'itère que les clés
**présentes dans l'état neuf** ; retirer `prodManuelleParS`/`clicsAcc` de `nouvelEtat()` les fait
simplement ignorer si une vieille sauvegarde les contient. Bump de `version` dans `index.html`
pour le cache-busting GitHub Pages (convention projet).

## Risks / Trade-offs

- **[Affichage « vide » avant l'IA mal perçu]** Le joueur ne voit aucune cadence pendant la phase
  manuelle → Mitigation : c'est voulu (D2) et cohérent avec l'arc *Paperclips* ; le compteur de
  stock reste visible et progresse à chaque clic.
- **[La valeur retombe à 0 en rupture de tokens]** Peut surprendre → c'est le comportement
  attendu et déjà testé (`production-rupture.test.js`) ; il informe d'une vraie rupture.
- **[Régression de balance]** Risque faible : `ecrireLigne` conserve tous ses effets de jeu ;
  seul un compteur d'affichage est retiré → vérifier `bun test` et `node test/cadence.js`.
- **[Référence orpheline à un champ supprimé]** Un grep `prodManuelleParS`/`clicsAcc` doit être
  vide après coup (hors changelog/specs) → étape de vérification dans les tâches.

## Migration Plan

1. Modifier `state.js`, `engine.js`, `ui.js`, `index.html`, `data.js`.
2. Bumper `version` dans `index.html`.
3. `bun test` (dont `production-rupture.test.js`) + `node test/cadence.js` au vert.
4. Déploiement statique automatique sur push `main` (GitHub Pages).
5. Rollback : revert du commit (changement isolé, sans schéma de save modifié de façon bloquante).

## Open Questions

- Aucune. Les choix par défaut (débit réel, visibilité `seen.agents`, suppression du code manuel)
  sont arrêtés ci-dessus ; à confirmer par l'utilisateur si désaccord.
