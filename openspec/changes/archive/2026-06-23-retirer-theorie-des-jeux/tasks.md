## 1. État (`game/state.js`)

- [x] 1.1 Retirer `yomi: 0` de `nouvelEtat()`
- [x] 1.2 Retirer `yomiGain: 1` du dictionnaire `mult`
- [x] 1.3 Retirer `autoTournoi: false` de l'état
- [x] 1.4 Retirer `tournois: false` du dictionnaire `seen`
- [x] 1.5 Retirer le drapeau `tournoisUnlocked` de l'état
- [x] 1.6 Vérifier qu'aucune migration n'est requise (la fusion `SAVE` n'itère que sur les clés de l'état neuf : les champs supprimés d'une vieille save sont ignorés)

## 2. Données et équilibrage (`game/data.js`)

- [x] 2.1 Retirer le projet `modelisation` (« Modélisation stratégique ») de `PROJETS`
- [x] 2.2 Retirer le projet `theorieEsprit` (« Théorie de l'esprit ») de `PROJETS`
- [x] 2.3 Retirer le projet `autoTournoi` (« Auto-tournoi ») de `PROJETS`
- [x] 2.4 Retirer ces 3 identifiants de la liste `ORDRE` d'affichage des projets
- [x] 2.5 Retirer les entrées d'impacts de `modelisation`, `theorieEsprit` et `autoTournoi`
- [x] 2.6 Retirer les constantes `K.YOMI_PASSIF`, `K.TOURNOI_COUT_OPS`, `K.TOURNOI_GAIN`
- [x] 2.7 Vérifier que le catalogue compte bien 37 projets (40 − 3) et que `theorieEsprit` n'est plus référencé nulle part dans `data.js`

## 3. Moteur (`game/engine.js`)

- [x] 3.1 Retirer la fonction `tickYomi` et son appel dans `tick()` (vérifier que l'ORDRE des phases restantes — et donc des `Math.random()` — est inchangé)
- [x] 3.2 Retirer la fonction `jouerTournoi` et son entrée dans l'objet exporté `ENGINE`
- [x] 3.3 Retirer le champ `yomi` de `couvre()` et `debiter()`
- [x] 3.4 Retirer la clé `yomi` du résultat de `coutProjet()`
- [x] 3.5 Confirmer que l'invariant `confianceTotale = confianceLibre + gpu + mem` n'est pas affecté

## 4. Interface (`game/ui.js` + `index.html`)

- [x] 4.1 Retirer `renderStrategie()` et son appel dans la fonction de rendu globale
- [x] 4.2 Retirer l'entrée `['yomi', 'Yomi']` du tableau de champs de `libelleCout()`
- [x] 4.3 Retirer l'affichage `txt('proj-yomi', …)` du rendu du panneau Projets
- [x] 4.4 Retirer le `<fieldset id="bloc-strategie">` (titre « Stratégie — Théorie des jeux », `#yomi-val`, `#btn-tournoi`) de `index.html`
- [x] 4.5 Retirer l'affichage du Yomi (`#proj-yomi`) du panneau Projets dans `index.html`
- [x] 4.6 Bumper `var version` dans `index.html` (cache-busting GitHub Pages)

## 5. Outils de diagnostic et tests

- [x] 5.1 `test/progression.test.js` : retirer la ligne `G.yomi = 1e6` (dopant)
- [x] 5.2 `test/smoke.test.js` : retirer le bloc qui appelle `jouerTournoi`
- [x] 5.3 `test/balance.js` : retirer le bloc tournoi, l'affichage de `G.yomi` et le jalon `tournois` des listes de suivi
- [x] 5.4 `test/cadence.js` : retirer le bloc tournoi et le jalon `tournois` de la liste `SEEN`
- [x] 5.5 Recherche globale `grep -riE "yomi|tournoi|theorieEsprit|modelisation|theorie des jeux"` (hors `openspec/`) → zéro occurrence résiduelle dans `game/`, `test/`, `index.html` (inclut la correction de l'easter egg Konami dans `game/main.js`)

## 6. Documentation de référence (`docs/specifications.md`)

- [x] 6.1 Retirer Yomi du tableau des ressources (§4.1) et des cibles de rythme (§4.7)
- [x] 6.2 Retirer les tournois/théorie des jeux du graphe de déblocage et des sections projets (§4.6)
- [x] 6.3 Retirer/ajuster la mention de la théorie des jeux et du Yomi dans l'esquisse d'Acte 2

## 7. Vérification

- [x] 7.1 `bun test` au vert (40 pass / 0 fail, 15 fichiers)
- [x] 7.2 `node test/cadence.js` : plus gros trou 1m3s, **0 trou ≥ 2 min** (deploy 23m37) → aucun ajustement de `K` nécessaire
- [x] 7.3 `bun run bench` : tous les jalons atteints, `lock = ok` (aucun soft-lock), AGI atteignable sur toutes les configs (base : deploy 23m17)
- [x] 7.4 Vérifié par proxy (pas de navigateur interactif disponible) : syntaxe des 5 `game/*.js` OK, tous les `id` DOM référencés par `ui.js`/`main.js` existent dans `index.html` (aucun `$()` pendant), et `smoke.test.js` simule une partie complète jusqu'au deploy sans erreur
