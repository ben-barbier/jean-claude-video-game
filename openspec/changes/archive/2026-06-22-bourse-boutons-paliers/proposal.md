## Why

Le moteur d'investissement n'offre que deux pas de mouvement : « 100 € » et « tout ».
Dès que le capital dépasse quelques milliers d'euros, placer ou retirer une somme
intermédiaire devient pénible (100 clics pour 10 000 €) ou brutal (« tout » d'un coup).
On veut des paliers façon *Universal Paperclips* (×10) pour doser le mouvement sans friction.

## What Changes

- Remplacer les 4 boutons actuels de la bourse par **deux rangées de 5 boutons** :
  - **Placer** : `100 €` · `1K €` · `10K €` · `100K €` · `tout`
  - **Retirer** : `100 €` · `1K €` · `10K €` · `100K €` · `tout`
- Chaque bouton de palier dépose/retire le montant indiqué (plafonné par les liquidités
  disponibles côté `eur`, par le capital placé côté retrait). « tout » conserve le
  comportement actuel.
- L'activation visuelle de chaque bouton suit le seuil correspondant (un bouton « 10K € »
  reste inactif tant qu'on n'a pas 10 000 € à déplacer).
- Aucun changement de logique métier : `ENGINE.deposerBourse(g, montant)` et
  `ENGINE.retirerBourse(g, montant)` acceptent déjà un montant arbitraire.

## Capabilities

### New Capabilities
- `moteur-investissement` : comportement des commandes « Placer / Retirer » de la bourse
  (paliers de montants, plafonnement par liquidités/capital, état actif des boutons).

### Modified Capabilities
<!-- Aucune capacité existante avec des exigences modifiées. -->

## Impact

- `index.html` : remplacement du markup des 4 boutons par 2 rangées de 5 dans `#bloc-bourse` ;
  bump de `var version` (cache-busting GitHub Pages).
- `game/ui.js` : câblage des nouveaux boutons (event listeners) et mise à jour de leur état
  actif/inactif dans le `render()` de la bourse.
- `game/engine.js` : **inchangé** — `deposerBourse`/`retirerBourse` gèrent déjà un montant.
- Séparation par couches préservée : seuls `index.html` et `game/ui.js` (couche DOM) sont touchés.
