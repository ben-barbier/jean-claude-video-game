## 1. Markup (index.html)

- [x] 1.1 Dans `#bloc-bourse`, remplacer le `<p>` des 4 boutons par deux rangées.
- [x] 1.2 Rangée « Placer&nbsp;: » avec `btn-depot-100` (100 €), `btn-depot-1k` (1K €), `btn-depot-10k` (10K €), `btn-depot-100k` (100K €), `btn-depot-max` (tout).
- [x] 1.3 Rangée « Retirer&nbsp;: » avec `btn-retrait-100` (100 €), `btn-retrait-1k` (1K €), `btn-retrait-10k` (10K €), `btn-retrait-100k` (100K €), `btn-retrait-max` (tout).
- [x] 1.4 Bumper `var version` (cache-busting GitHub Pages).

## 2. Câblage et état actif (game/ui.js)

- [x] 2.1 Définir la table locale des paliers `[{suffixe:'100', montant:100}, {suffixe:'1k', montant:1000}, {suffixe:'10k', montant:10000}, {suffixe:'100k', montant:100000}]`.
- [x] 2.2 Remplacer les listeners `btn-depot`/`btn-retrait` : boucler sur les paliers pour câbler `btn-depot-<suffixe>` → `ENGINE.deposerBourse(s, montant)` et `btn-retrait-<suffixe>` → `ENGINE.retirerBourse(s, montant)`.
- [x] 2.3 Conserver `btn-depot-max` → `deposerBourse(s, s.eur)` et `btn-retrait-max` → `retirerBourse(s, s.capital)`.
- [x] 2.4 Dans le `render()` de la bourse, remplacer les `actif()` : pour chaque palier, `actif('btn-depot-<suffixe>', g.eur >= montant)` et `actif('btn-retrait-<suffixe>', g.capital >= montant)` ; garder `btn-depot-max` (`g.eur > 0`) et `btn-retrait-max` (`g.capital > 0`).

## 3. Vérification

- [x] 3.1 `bun test` au vert (engine inchangé, aucune régression métier). → 26 pass / 0 fail.
- [x] 3.2 `node test/cadence.js` : aucun trou de rythme nouveau (≥ 2 min), équilibrage neutre. → plus gros trou 1m18s, 0 trou ≥ 2 min.
- [x] 3.3 Essai navigateur : placer/retirer chaque palier, plafonnement correct, activation/désactivation des boutons selon liquidités et capital. → Confirmé par le joueur (essai manuel OK) ; cohérent avec la vérif statique ids markup ↔ ui.js et le plafonnement engine.
