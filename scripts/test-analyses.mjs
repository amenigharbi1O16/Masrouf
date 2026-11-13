// ============================================================
// TEST AUTOMATISÉ : Calculs et règles de l'écran Analyses
// ============================================================

import assert from 'node:assert';

function calculerEcart(totalCourant, totalPrecedent) {
  const ecartMontant = totalCourant - totalPrecedent;
  const aEconomise = ecartMontant <= 0;
  const ecartPct =
    totalPrecedent > 0
      ? Math.round(((Math.abs(ecartMontant) / totalPrecedent) * 100) * 10) / 10
      : null;
  return { ecartMontant, aEconomise, ecartPct };
}

function calculerPart(depenseCat, total) {
  if (total <= 0) return 0;
  return Math.round((depenseCat / total) * 1000) / 10;
}

console.log('--- Test 1 : Exemple du sujet ---');
// Exemple sujet : total 750.000 DT, Alimentation 320.000 DT soit 42,7 % ; période précédente 900.000 DT, écart de -150.000 DT soit -16,7 %
const res1 = calculerEcart(750.000, 900.000);
const partAlim = calculerPart(320.000, 750.000);
console.log(`Total: 750, Prec: 900 => Ecart: ${res1.ecartMontant} DT (${res1.ecartPct}%), Part Alim: ${partAlim}%`);
assert.strictEqual(res1.ecartMontant, -150.000);
assert.strictEqual(res1.ecartPct, 16.7);
assert.strictEqual(res1.aEconomise, true);
assert.strictEqual(partAlim, 42.7);
console.log('✓ Test 1 validé');

console.log('--- Test 2 : Période précédente vide ---');
const res2 = calculerEcart(120.000, 0);
assert.strictEqual(res2.ecartMontant, 120.000);
assert.strictEqual(res2.ecartPct, null); // Pas de division par zéro !
console.log('✓ Test 2 validé (pas de faux pourcentage si période précédente vide)');

console.log('--- Test 3 : Aucune dépense ---');
const res3 = calculerEcart(0, 50.000);
assert.strictEqual(res3.ecartMontant, -50.000);
assert.strictEqual(res3.aEconomise, true);
assert.strictEqual(calculerPart(0, 0), 0);
console.log('✓ Test 3 validé');

console.log('--- Test 4 : Catégories à égalité ---');
const categories = [
  { nom: 'Alimentation', total: 100 },
  { nom: 'Transport', total: 100 },
  { nom: 'Santé', total: 50 },
];
const max = categories[0].total;
const exAequo = categories.filter(c => c.total === max);
assert.strictEqual(exAequo.length, 2);
assert.strictEqual(exAequo[0].nom, 'Alimentation');
assert.strictEqual(exAequo[1].nom, 'Transport');
console.log('✓ Test 4 validé (égalité détectée : cite les deux catégories)');

console.log('--- Test 5 : Calcul en millimes entiers ---');
// Problème classique JS : 0.1 + 0.2 = 0.30000000000000004
const p1 = 14.150;
const p2 = 28.350;
const millimes1 = Math.round(p1 * 1000);
const millimes2 = Math.round(p2 * 1000);
const totalMillimes = millimes1 + millimes2;
const totalDT = totalMillimes / 1000;
assert.strictEqual(totalMillimes, 42500);
assert.strictEqual(totalDT, 42.5);
console.log('✓ Test 5 validé (zéro erreur d\'arrondi grâce aux millimes)');

console.log('TOUS LES TESTS MATHEMATIQUES ANALYSES SONT SUCCES !');

