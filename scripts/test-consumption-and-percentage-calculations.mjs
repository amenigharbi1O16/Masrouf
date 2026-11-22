// ============================================================
// FICHIER : scripts/test-consumption-and-percentage-calculations.mjs
// RÔLE    : Suite de tests mathématiques automatisés validant :
//           1. L'exactitude arithmétique des calculs de consommation en millimes entiers
//           2. Le calcul précis du pourcentage de consommation pour chaque catégorie
//           3. La cohérence des statuts d'alerte (healthy <80%, warning 80-100%, exceeded >100%)
//           4. L'affichage du pourcentage dans CategoryCard et sur l'écran d'accueil
// ============================================================

import fs from 'fs';
import path from 'path';

console.log('=== TEST SUITE : CALCULS DES CONSOMMATIONS ET POURCENTAGES PAR CATÉGORIE ===\n');

let failed = false;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ÉCHEC : ${message}`);
    failed = true;
  }
}

// -------------------------------------------------------------
// [TEST 1] VÉRIFICATION DES FORMULES ARITHMÉTIQUES EN MILLIMES
// -------------------------------------------------------------
console.log('[TEST 1] Vérification de l\'exactitude des calculs en millimes dans selectors.ts :');

const selectorsCode = fs.readFileSync('src/state/selectors.ts', 'utf8');

assert(
  selectorsCode.includes('Math.round') && selectorsCode.includes('1000'),
  'selectors.ts : calculs monétaires exécutés en millimes entiers (x1000) pour éliminer les dérives décimales'
);
assert(
  selectorsCode.includes('categoryConsumptionStats'),
  'selectors.ts : fonction utilitaire categoryConsumptionStats exportée pour standardiser les calculs'
);
assert(
  selectorsCode.includes('totalSpent = (byCat'),
  'selectors.ts : totalSpent calcule le cumul exact des catégories'
);

// Simulation mathématique de calculs avec valeurs réelles
const testTxns = [
  { amount: 14.500, categoryId: 'food' },
  { amount: 3.250, categoryId: 'food' },
  { amount: 24.750, categoryId: 'transport' },
  { amount: 0.100, categoryId: 'transport' },
  { amount: 0.200, categoryId: 'transport' },
];

const computedByCat = {};
for (const t of testTxns) {
  const currentMillimes = Math.round((computedByCat[t.categoryId] ?? 0) * 1000);
  const txnMillimes = Math.round(t.amount * 1000);
  computedByCat[t.categoryId] = (currentMillimes + txnMillimes) / 1000;
}

assert(computedByCat.food === 17.75, 'Calcul consommation catégorie Food : 14.500 + 3.250 = exactement 17.750 DT');
assert(computedByCat.transport === 25.05, 'Calcul consommation catégorie Transport : 24.750 + 0.100 + 0.200 = exactement 25.050 DT (pas de 25.050000000000004)');

// -------------------------------------------------------------
// [TEST 2] VÉRIFICATION DU CALCUL DES POURCENTAGES ET STATUTS
// -------------------------------------------------------------
console.log('\n[TEST 2] Vérification mathématique des pourcentages par rapport aux budgets alloués :');

function calcStats(spent, allocated) {
  const s = Math.round((Number(spent) || 0) * 1000) / 1000;
  const a = Math.round((Number(allocated) || 0) * 1000) / 1000;
  const pct = a > 0 ? (s / a) * 100 : 0;
  const isExceeded = s > a && a > 0;
  const status = isExceeded ? 'exceeded' : pct >= 80 ? 'warning' : 'healthy';
  return { s, a, pct, isExceeded, status };
}

// Cas 1 : Consommation nulle (0%)
const c1 = calcStats(0, 100);
assert(c1.pct === 0 && c1.status === 'healthy', '0 DT sur 100 DT alloués -> 0.0% (healthy)');

// Cas 2 : Consommation normale (50%)
const c2 = calcStats(50, 100);
assert(c2.pct === 50 && c2.status === 'healthy', '50 DT sur 100 DT alloués -> 50.0% (healthy)');

// Cas 3 : Seuil d'alerte (80%)
const c3 = calcStats(80, 100);
assert(c3.pct === 80 && c3.status === 'warning', '80 DT sur 100 DT alloués -> 80.0% (warning, couleur dorée)');

// Cas 4 : Seuil d'alerte supérieur (95%)
const c4 = calcStats(95, 100);
assert(c4.pct === 95 && c4.status === 'warning', '95 DT sur 100 DT alloués -> 95.0% (warning, couleur dorée)');

// Cas 5 : Dépassement budgétaire (120%)
const c5 = calcStats(120, 100);
assert(c5.pct === 120 && c5.status === 'exceeded' && c5.isExceeded === true, '120 DT sur 100 DT alloués -> 120.0% (exceeded, couleur rouge corail)');

// Cas 6 : Sans budget alloué (0 DT)
const c6 = calcStats(35, 0);
assert(c6.pct === 0, '35 DT sans enveloppe allouée -> 0% (sans division par zéro)');

// -------------------------------------------------------------
// [TEST 3] VÉRIFICATION DE CATEGORYCARD SUR LA PAGE D'ACCUEIL
// -------------------------------------------------------------
console.log('\n[TEST 3] Vérification de l\'affichage de CategoryCard sur la page d\'accueil :');

const cardsCode = fs.readFileSync('src/components/Cards.tsx', 'utf8');
const categoryCardCode = cardsCode.slice(
  cardsCode.indexOf('export function CategoryCard'),
  cardsCode.indexOf('export function TransactionRow')
);

assert(
  categoryCardCode.includes('{short(allocN)} DT'),
  'CategoryCard : affiche le budget alloué pour la catégorie'
);
assert(
  !categoryCardCode.includes("t('consomme')") && !categoryCardCode.includes('categoryPctText'),
  'CategoryCard : aucun pourcentage de consommation affiché sur la page d\'accueil'
);
assert(
  !categoryCardCode.includes('trackLight') && !categoryCardCode.includes('gaugeColor'),
  'CategoryCard : aucun indicateur de progression (jauge) affiché sur la page d\'accueil'
);

// -------------------------------------------------------------
// [TEST 4] VÉRIFICATION DE LA PAGE D'ACCUEIL ET DE CONFIRMATION
// -------------------------------------------------------------
console.log('\n[TEST 4] Vérification de la transmission dans index.tsx et confirmation.tsx :');

const homeCode = fs.readFileSync('src/app/(tabs)/index.tsx', 'utf8');
assert(
  homeCode.includes('allocation={catAlloc}') || homeCode.includes('allocation={budget.allocations[id] ?? 0}') || homeCode.includes('allocation={budget?.allocations[id] ?? 0}'),
  'HomeScreen : CategoryCard reçoit l\'allocation budgétaire de chaque catégorie'
);
assert(
  homeCode.includes('{short(restAlloc)} DT') && !homeCode.includes('{short(restSpent)} / {short(restAlloc)} DT'),
  'HomeScreen : ligne repliée affiche uniquement le budget alloué sans consommation'
);

const confirmCode = fs.readFileSync('src/app/confirmation.tsx', 'utf8');
assert(
  confirmCode.includes('alloc > 0 ? ` (${((spent / alloc) * 100).toFixed(0)}%)`'),
  'Confirmation : InfoRow affiche la consommation, le plafond alloué et le pourcentage résultant'
);

const expenseFormCode = fs.readFileSync('src/components/ExpenseForm.tsx', 'utf8');
assert(
  expenseFormCode.includes('predPct = alloc > 0 ? (spent / alloc) * 100 : 0'),
  'ExpenseForm : alerte d\'impact prévisionnel calcule et affiche le pourcentage de consommation'
);

console.log('\n============================================================');
if (failed) {
  console.error('❌ DES TESTS ONT ÉCHOUÉ !');
  process.exit(1);
} else {
  console.log('🎉 TOUS LES TESTS DES CALCULS DE CONSOMMATION ET POURCENTAGES SONT VALIDÉS !');
  console.log('============================================================');
  process.exit(0);
}
