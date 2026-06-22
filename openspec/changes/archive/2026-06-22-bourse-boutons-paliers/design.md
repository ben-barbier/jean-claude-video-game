## Context

Le bloc `#bloc-bourse` (`index.html`) expose aujourd'hui 4 boutons câblés dans `game/ui.js` :
`btn-depot` (Placer 100 €), `btn-depot-max` (Tout placer), `btn-retrait` (Retirer 100 €),
`btn-retrait-max` (Tout retirer). La logique métier vit dans `game/engine.js` :
`deposerBourse(g, montant)` et `retirerBourse(g, montant)` acceptent **déjà** un montant
arbitraire et le plafonnent (`Math.min(montant, g.eur)` / `Math.min(montant, g.capital)`).
Le changement est donc purement présentation : passer de 2 pas à 5 paliers par rangée.

Contraintes : JS vanilla, aucun build/dépendance ; seuls `index.html` et `game/ui.js` touchent
le DOM ; `engine` reste sans DOM et inchangé ; bump de `var version` obligatoire (cache GitHub Pages).

## Goals / Non-Goals

**Goals:**
- Deux rangées « Placer » / « Retirer » de 5 boutons : `100 €`, `1K €`, `10K €`, `100K €`, `tout`.
- État actif de chaque bouton calé sur le seuil correspondant (liquidités pour Placer, capital pour Retirer).
- Réutiliser tel quel `ENGINE.deposerBourse` / `ENGINE.retirerBourse` (aucune nouvelle action moteur).

**Non-Goals:**
- Pas de modification de l'équilibrage ni du rendement de la bourse (rythme inchangé → `cadence.js` neutre).
- Pas de palier configurable par le joueur, ni de saisie libre de montant.
- Pas de changement des autres panneaux.

## Decisions

- **Liste des paliers en présentation, pas dans `DATA.K`.** Les montants `[100, 1000, 10000, 100000]`
  sont des dénominations d'affichage, pas des constantes d'équilibrage (elles n'influent pas sur
  le rythme mesuré par `cadence.js`/`balance.js`). On les garde dans une petite table locale à
  `game/ui.js` (couche DOM), à côté du câblage. Alternative écartée : les mettre dans `DATA.K`,
  ce qui mélangerait du presentation-tuning avec les vraies constantes de balance.
- **Génération du markup vs statique.** On écrit les 10 boutons en dur dans `index.html` (ids
  explicites), cohérent avec le style du reste du fichier (boutons listés un par un). Le câblage
  et l'état actif côté `ui.js`, eux, bouclent sur la table de paliers pour éviter la répétition.
  Alternative écartée : générer le markup en JS — inutile ici et moins lisible dans un fichier
  statique sans build.
- **Convention d'ids.** Paliers : `btn-depot-100`, `btn-depot-1k`, `btn-depot-10k`, `btn-depot-100k`,
  `btn-depot-max` (idem `btn-retrait-*`). Cela conserve `*-max` existant et rend la boucle de
  câblage triviale (suffixe ↔ montant).
- **État actif.** Bouton de palier « Placer » actif si `g.eur >= montant` ; « Retirer » actif si
  `g.capital >= montant` ; `*-max` actif si la source est `> 0`. Reprend la sémantique des `actif()`
  déjà présents (`btn-depot` actif à `eur >= 100`).
- **Libellés.** `1K €`, `10K €`, `100K €` (format court demandé), `tout` pour les boutons max,
  préfixés visuellement par « Placer&nbsp;: » / « Retirer&nbsp;: » dans chaque rangée.

## Risks / Trade-offs

- [Oubli du bump `version`] → les nouveaux boutons resteraient invisibles en prod (cache) :
  étape explicite dans `tasks.md`, vérifiable dans `index.html`.
- [Désynchro libellé ↔ montant si on duplique à la main] → la table unique de paliers dans
  `ui.js` pilote câblage + état actif ; seuls les libellés statiques d'`index.html` restent à
  garder cohérents (revue visuelle).
- [Absence de test DOM] → `engine` n'étant pas modifié, `bun test` reste vert ; on couvre la
  non-régression métier en vérifiant que `deposerBourse`/`retirerBourse` plafonnent déjà
  correctement (tests existants ou à confirmer), et la partie DOM par essai manuel dans le navigateur.
