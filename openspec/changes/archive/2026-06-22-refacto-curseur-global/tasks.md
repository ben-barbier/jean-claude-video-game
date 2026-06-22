## 1. Constantes d'équilibrage (`game/data.js`)

- [x] 1.1 Ajouter `TAUX_REFACTO_PAR_LOC: 0.3` dans `DATA.K` (dette retirée par ligne-équivalent réécrite ; calé pour neutralité à `megas = 0` / mults de base).
- [x] 1.2 Retirer `TAUX_AGENT_REFACTO` de `DATA.K` (devenu sans objet) et vérifier qu'aucune autre référence ne subsiste (`grep -n TAUX_AGENT_REFACTO`).

## 2. Moteur (`game/engine.js`, sans DOM)

- [x] 2.1 `prodMegaParS` : appliquer le facteur `(1 - g.partRefacto)`, comme `prodAgentsParS`.
- [x] 2.2 `refactoCodingParS` : sommer la capacité agents + Super Agents pondérée par leur débit — `(agents*DEBIT_AGENT*agentDebit + megas*DEBIT_MEGA*megaDebit) * partRefacto` (gardes `partRefacto > 0 && dette > 0` ; contribution megas conditionnée à `megaUnlocked`).
- [x] 2.3 `tickRefacto` : retirer la dette via `refactoCodingParS(g) * TAUX_REFACTO_PAR_LOC * ratio * dt` ; remplacer le garde `g.agents > 0` par le seul `g.dette > 0` (la capacité peut venir des Super Agents).
- [x] 2.4 Vérifier que `consoTokensParS` / `rentabiliteParS` restent cohérents (ils dérivent de `refactoCodingParS`, désormais inclusif des Super Agents) et que l'ordre des phases de `tick()` est inchangé (aucun `Math.random()` ajouté/déplacé).

## 3. Interface (`game/ui.js` + `index.html`, DOM)

- [x] 3.1 `index.html` : renommer le libellé du curseur « Agents — Production … ↔ Refactoring … » en « IA — Production … ↔ Refactoring … » et mettre à jour l'`aria-label` du `range` (pilote agents **et** Super Agents).
- [x] 3.2 Vérifier que `renderDette()` (ui.js) affiche correctement les pourcentages (aucune logique à changer ; il lit déjà `g.partRefacto`).

## 4. Tests

- [x] 4.1 Ajouter un test de non-régression du soft-lock : à `partRefacto = 1`, avec des Super Agents (ex. `agents=1, megas=5`, tokens abondants, `dette` > 0), un `tick` réduit strictement la dette et `prodBruteParS` vaut 0.
- [x] 4.2 Ajouter un test : à `megas = 0` et mults de base, la dette retirée par tick est identique à l'ancien rythme (`agents * partRefacto * 0.3 * dt`).
- [x] 4.3 Vérifier que `test/refacto-tokens.test.js` reste vert (les cas `megas = 0` doivent passer inchangés).

## 5. Vérification & livraison

- [x] 5.1 `bun test` : toute la suite au vert.
- [x] 5.2 `node test/cadence.js` : rythme sans trou ≥ 2 min (le correctif ne doit pas casser la cadence) ; au besoin `bun run bench` pour les grands jalons.
- [x] 5.3 Bumper `var version` dans `index.html` (cache-busting GitHub Pages — `game/*.js` a changé).
- [x] 5.4 Mettre à jour `docs/specifications.md` si la mécanique refacto y est décrite (cohérence du curseur global), sinon noter qu'aucune mise à jour n'est nécessaire.
