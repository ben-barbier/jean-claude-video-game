/* test/projets-impact.test.js — Chaque projet expose son impact gameplay (affiché en carte).
 * Garde-fou : un nouveau projet sans impact casse ce test (au lieu d'une carte muette). */
import { test, expect } from 'bun:test';
import { loadGame } from './harness.js';

test('chaque projet a un impact (texte non vide) à afficher', () => {
  const { DATA } = loadGame();
  const sansImpact = DATA.PROJETS.filter(function (p) {
    return typeof p.impact !== 'string' || p.impact.trim().length === 0;
  }).map(function (p) { return p.id; });
  expect(sansImpact).toEqual([]); // tous les projets doivent décrire leur effet
});
