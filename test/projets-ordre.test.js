/* test/projets-ordre.test.js — L'ORDRE de sortie des projets est complet et sans doublon.
 * C'est la source unique de l'ordre d'affichage (IHM) ; il doit lister EXACTEMENT les projets. */
import { test, expect } from 'bun:test';
import { loadGame } from './harness.js';

test('DATA.ORDRE liste exactement tous les projets (aucun oubli, aucun doublon)', () => {
  const { DATA } = loadGame();
  expect(DATA.ORDRE.length).toBe(DATA.PROJETS.length);            // bon compte (pas de doublon/oubli)
  const ids = DATA.PROJETS.map(function (p) { return p.id; }).sort();
  const ordre = DATA.ORDRE.slice().sort();
  expect(ordre).toEqual(ids);                                     // même ensemble d'ids
});
