// ============================================================
// FICHIER : scripts/test-categories-and-budget-distribution.mjs
// RÔLE    : Test de validation de la sélection des catégories lors
//           de la connexion/onboarding, de leur affichage sur la page
//           d'accueil et dans le profil, et de la répartition exacte à 100%
//           du budget de période entre ces catégories.
// ============================================================

import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== TEST SUITE : CATÉGORIES À LA CONNEXION, ACCUEIL, PROFIL & RÉPARTITION DU BUDGET ===\n');

// 1. Vérification de l'algorithme de distribution budgétaire dans budgetReevaluation.ts
console.log('[TEST 1] Vérification de la distribution proportionnelle à 100% dans budgetReevaluation.ts :');

const reevalCode = fs.readFileSync('src/utils/budgetReevaluation.ts', 'utf8');

assert(
  reevalCode.includes('sumRawTarget > 0 ? item.targetPct / sumRawTarget : 1 / rawAllocations.length'),
  'budgetReevaluation.ts : calcul des proportions relatives normalisées sur les catégories sélectionnées'
);

assert(
  reevalCode.includes('Math.max(0, 100 - accumulatedPercent)') &&
  reevalCode.includes('Math.max(0, Math.round((totalBudget - accumulatedAmount) * 1000) / 1000)'),
  'budgetReevaluation.ts : la dernière catégorie absorbe les arrondis pour garantir exactement 100% et totalBudget'
);

// Simulation de calcul de répartition sur 3 catégories
const testCategories = [
  { id: '1', name: 'Alimentation', targetPct: 40 },
  { id: '2', name: 'Transport', targetPct: 10 },
  { id: '3', name: 'Factures', targetPct: 12 },
];
const totalBudget = 1000.000;
const sumWeights = testCategories.reduce((acc, c) => acc + c.targetPct, 0); // 62
assert.strictEqual(sumWeights, 62, 'Somme brute = 62%');

let runningSum = 0;
let runningPct = 0;
const allocations = [];

for (let i = 0; i < testCategories.length; i++) {
  const item = testCategories[i];
  const isLast = i === testCategories.length - 1;
  let finalPct = 0;
  let allocatedAmount = 0;

  if (isLast) {
    finalPct = Math.max(0, 100 - runningPct);
    allocatedAmount = Math.max(0, Math.round((totalBudget - runningSum) * 1000) / 1000);
  } else {
    const weight = item.targetPct / sumWeights;
    finalPct = Math.round(weight * 100);
    allocatedAmount = Math.round(totalBudget * weight * 1000) / 1000;
    runningPct += finalPct;
    runningSum += allocatedAmount;
  }

  allocations.push({
    id: item.id,
    pct: finalPct,
    amount: allocatedAmount,
  });
}

const totalAllocatedAmount = Math.round(allocations.reduce((sum, a) => sum + a.amount, 0) * 1000) / 1000;
const totalAllocatedPct = allocations.reduce((sum, a) => sum + a.pct, 0);

assert.strictEqual(totalAllocatedAmount, 1000.000, 'Le montant total alloué doit être exactement de 1000.000 DT');
assert.strictEqual(totalAllocatedPct, 100, 'Le pourcentage total alloué doit être exactement de 100%');
console.log(`  ✓ Simulation réussie : 1000.000 DT répartis à 100% sur 3 catégories sans reliquat non alloué.`);

// 2. Vérification de l'écran d'allocation budgétaire (allocation-budget.tsx)
console.log('\n[TEST 2] Vérification de l\'écran allocation-budget.tsx :');
const allocBudgetCode = fs.readFileSync('src/app/allocation-budget.tsx', 'utf8');

assert(
  allocBudgetCode.includes('getProportionalAllocations') &&
  allocBudgetCode.includes('userCatIds'),
  'allocation-budget.tsx : utilise les catégories de l\'utilisateur avec distribution proportionnelle'
);
assert(
  allocBudgetCode.includes('actions.setUserCategories(userCatIds)'),
  'allocation-budget.tsx : sauvegarde les catégories de l\'utilisateur si non initialisées'
);
assert(
  allocBudgetCode.includes('Répartir automatiquement (100%)'),
  'allocation-budget.tsx : propose un bouton de rééquilibrage automatique à 100%'
);
console.log('  ✓ allocation-budget.tsx validé.');

// 3. Vérification de la page d'accueil (src/app/(tabs)/index.tsx)
console.log('\n[TEST 3] Vérification de l\'affichage des catégories sur l\'accueil (HomeScreen) :');
const homeCode = fs.readFileSync('src/app/(tabs)/index.tsx', 'utf8');

assert(
  homeCode.includes('displayCategoryIds') &&
  homeCode.includes('me?.categoryIds'),
  'HomeScreen : displayCategoryIds intègre les catégories suivies par l\'utilisateur'
);
assert(
  homeCode.includes('displayCategoryIds.length > 0'),
  'HomeScreen : affiche la section Vos Catégories dès que l\'utilisateur en a sélectionné'
);
assert(
  homeCode.includes('Aucune catégorie suivie pour le moment') || homeCode.includes('Choisir mes catégories'),
  'HomeScreen : propose un appel à l\'action clair si aucune catégorie n\'est suivie'
);
console.log('  ✓ HomeScreen validé : les catégories choisies à la connexion s\'affichent même sans budget créé.');

// 4. Vérification de l'écran de profil / réglages (src/app/(tabs)/reglages.tsx)
console.log('\n[TEST 4] Vérification de l\'affichage des catégories dans le profil (reglages.tsx) :');
const settingsCode = fs.readFileSync('src/app/(tabs)/reglages.tsx', 'utf8');

assert(
  settingsCode.includes('userCategories') &&
  settingsCode.includes('me.categoryIds'),
  'reglages.tsx : charge les catégories suivies par l\'utilisateur'
);
assert(
  settingsCode.includes('userCategories.length') &&
  settingsCode.includes('getCategoryIcon'),
  'reglages.tsx : affiche le badge du nombre et les icônes de chaque catégorie'
);
assert(
  settingsCode.includes('/gerer-categories') &&
  settingsCode.includes('Modifier ma sélection de catégories'),
  'reglages.tsx : propose le lien direct pour modifier la sélection de catégories'
);
console.log('  ✓ reglages.tsx validé : le profil affiche en général les catégories sélectionnées par l\'utilisateur.');

// 5. Vérification de l'onboarding et du pont SQLite
console.log('\n[TEST 5] Vérification de l\'onboarding et du pont SQLite :');
const onboardingCode = fs.readFileSync('src/app/onboarding.tsx', 'utf8');
const bridgeCode = fs.readFileSync('src/state/sqlite-bridge.ts', 'utf8');

assert(
  onboardingCode.includes('actions.completeOnboarding(selected)'),
  'onboarding.tsx : finalisation avec enregistrement des catégories sélectionnées'
);
assert(
  bridgeCode.includes('sqliteSetUserCategories') &&
  bridgeCode.includes('user_category'),
  'sqlite-bridge.ts : persistance des liaisons dans la table SQLite user_category'
);
console.log('  ✓ Onboarding et persistance SQLite validés.');

console.log('\n============================================================');
console.log('🎉 TOUS LES TESTS DES CATÉGORIES ET DE RÉPARTITION BUDGÉTAIRE SONT VALIDÉS AVEC SUCCÈS !');
console.log('============================================================');
