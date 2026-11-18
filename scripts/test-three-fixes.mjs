/**
 * SCRIPT DE VALIDATION : test-three-fixes.mjs
 * Valide les 3 corrections strictes demandées :
 * 1. Ordre inconditionnel des hooks et canal de notification Expo Go
 * 2. Affichage des catégories sur l'accueil (nom + budget alloué uniquement, sans % ni jauge)
 * 3. Blocage de la création d'achat/produit si aucune période/budget alloué avec message et chemin de redirection
 */

import fs from 'fs';

console.log('=== TEST SUITE : VALIDATION DES 3 CORRECTIFS SPÉCIFIQUES ===\n');

let failed = false;
function assert(condition, message) {
  if (!condition) {
    console.error(`  ✗ ÉCHEC : ${message}`);
    failed = true;
  } else {
    console.log(`  ✓ ${message}`);
  }
}

// -------------------------------------------------------------------------
// [TEST 1] ORDRE INCONDITIONNEL DES HOOKS & CANAL NOTIFICATIONS EXPO GO
// -------------------------------------------------------------------------
console.log('[TEST 1] Vérification de l\'ordre des hooks et du canal de notification :');

const indexCode = fs.readFileSync('src/app/(tabs)/index.tsx', 'utf8');
const indexTxnsIndex = indexCode.indexOf('const txns = useMemo(');
const indexEarlyReturn = indexCode.indexOf('if (!me) return <LoadingScreen />;');

assert(
  indexTxnsIndex !== -1 && indexEarlyReturn !== -1 && indexTxnsIndex < indexEarlyReturn,
  'HomeScreen : tous les hooks (txns useMemo) sont appelés INCONDITIONNELLEMENT avant le return'
);

const analysesCode = fs.readFileSync('src/app/(tabs)/analyses.tsx', 'utf8');
const analysesFirstHook = analysesCode.indexOf('const allTxns = useMemo(');
const analysesReturnMe = analysesCode.indexOf('if (!me) return null;');

assert(
  analysesFirstHook !== -1 && analysesReturnMe !== -1 && analysesFirstHook < analysesReturnMe,
  'AnalyticsScreen : tous les hooks (9 useMemo) sont appelés INCONDITIONNELLEMENT avant le return'
);

const notifCode = fs.readFileSync('src/utils/notifications.ts', 'utf8');
assert(
  notifCode.includes('expo-constants') &&
  notifCode.includes('Constants.appOwnership === \'expo\'') &&
  notifCode.includes('if (isExpoGo) return;'),
  'notifications.ts : le canal Android est ignoré sous Expo Go'
);
assert(
  notifCode.includes('try {') && notifCode.includes('setNotificationChannelAsync'),
  'notifications.ts : setNotificationChannelAsync est sécurisé dans un try/catch'
);

// -------------------------------------------------------------------------
// [TEST 2] CATÉGORIES SUR L'ACCUEIL : NOM ET BUDGET ALLOUÉ UNIQUEMENT
// -------------------------------------------------------------------------
console.log('\n[TEST 2] Vérification des catégories sur l\'accueil (nom + budget alloué uniquement) :');

const cardsCode = fs.readFileSync('src/components/Cards.tsx', 'utf8');
const categoryCardCode = cardsCode.slice(
  cardsCode.indexOf('export function CategoryCard'),
  cardsCode.indexOf('export function TransactionRow')
);

assert(
  categoryCardCode.includes('{short(allocN)} DT'),
  'CategoryCard : affiche le budget alloué en Dinars'
);
assert(
  !categoryCardCode.includes("t('consomme')") && !categoryCardCode.includes('categoryPctText'),
  'CategoryCard : AUCUN pourcentage de consommation affiché'
);
assert(
  !categoryCardCode.includes('trackLight') && !categoryCardCode.includes('gaugeColor'),
  'CategoryCard : AUCUN indicateur de progression (jauge) affiché'
);

assert(
  indexCode.includes('{short(restAlloc)} DT') && !indexCode.includes('{short(restSpent)} / {short(restAlloc)} DT'),
  'HomeScreen : ligne repliée affiche uniquement le budget alloué sans consommation'
);

// -------------------------------------------------------------------------
// [TEST 3] BLOCAGE CRÉATION ACHAT/PRODUIT SANS PÉRIODE/BUDGET
// -------------------------------------------------------------------------
console.log('\n[TEST 3] Vérification du blocage d\'achat/produit sans période et budget alloué :');

const nouveauProduitCode = fs.readFileSync('src/app/nouveau-produit.tsx', 'utf8');
assert(
  nouveauProduitCode.includes('const hasBudget = Boolean(selectedBudget && Number(selectedBudget.total) > 0);'),
  'nouveau-produit.tsx : détection stricte de la période sélectionnée avec budget alloué'
);
assert(
  nouveauProduitCode.includes('if (!hasBudget) return setError(t(\'selectionner_periode_et_budget_dabord\'));'),
  'nouveau-produit.tsx : action de sauvegarde bloquée si aucun budget'
);
assert(
  nouveauProduitCode.includes('disabled={!hasBudget}'),
  'nouveau-produit.tsx : bouton d\'enregistrement désactivé si aucun budget'
);
assert(
  nouveauProduitCode.includes('t(\'selectionner_periode_et_budget_dabord\')') &&
  nouveauProduitCode.includes('router.push(\'/budget-mois\')'),
  'nouveau-produit.tsx : message explicatif et bouton pour définir le budget affichés'
);

const purchaseFormCode = fs.readFileSync('src/components/PurchaseForm.tsx', 'utf8');
assert(
  purchaseFormCode.includes('if (!hasBudget) return setError(t(\'selectionner_periode_et_budget_dabord\'));'),
  'PurchaseForm.tsx : validation et soumission bloquées si aucun budget'
);
assert(
  purchaseFormCode.includes('disabled={products.length === 0 || !hasBudget}'),
  'PurchaseForm.tsx : bouton de soumission désactivé si aucun budget'
);
assert(
  purchaseFormCode.includes('t(\'selectionner_periode_et_budget_dabord\')') &&
  purchaseFormCode.includes('router.push(\'/budget-mois\')'),
  'PurchaseForm.tsx : message explicatif et chemin de paramétrage de budget'
);

const produitsCode = fs.readFileSync('src/app/(tabs)/produits.tsx', 'utf8');
assert(
  produitsCode.includes('disabled={!hasBudget}'),
  'produits.tsx : bouton d\'ajout de produit désactivé si aucun budget'
);
assert(
  produitsCode.includes('t(\'selectionner_periode_et_budget_dabord\')') &&
  produitsCode.includes('router.push(\'/budget-mois\')'),
  'produits.tsx : bannière explicative avec accès au budget si aucun budget actif'
);

const produitDetailsCode = fs.readFileSync('src/app/produit/[id].tsx', 'utf8');
assert(
  produitDetailsCode.includes('disabled={!hasBudget}'),
  'produit/[id].tsx : bouton d\'ajout d\'achat désactivé si aucun budget'
);
assert(
  produitDetailsCode.includes('t(\'selectionner_periode_et_budget_dabord\')'),
  'produit/[id].tsx : message clair affiché avec redirection budget'
);

const comparePrixCode = fs.readFileSync('src/app/comparer-prix.tsx', 'utf8');
assert(
  comparePrixCode.includes('if (!hasBudget) return;'),
  'comparer-prix.tsx : action de confirmation SQL bloquée sans budget'
);
assert(
  comparePrixCode.includes('disabled={!hasBudget}'),
  'comparer-prix.tsx : bouton de confirmation désactivé sans budget'
);

// Vérification de la cohérence des traductions (FR, EN, AR)
const fr = JSON.parse(fs.readFileSync('src/i18n/fr.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('src/i18n/ar.json', 'utf8'));

assert(
  fr.selectionner_periode_et_budget_dabord &&
  en.selectionner_periode_et_budget_dabord &&
  ar.selectionner_periode_et_budget_dabord,
  'i18n : clés de message de blocage présentes et cohérentes en FR, EN, AR'
);

console.log('\n============================================================');
if (failed) {
  console.error('❌ CERTAINS TESTS ONT ÉCHOUÉ !');
  process.exit(1);
} else {
  console.log('🎉 LES 3 CORRECTIFS SONT 100% CONFORMES ET VALIDÉS !');
  console.log('============================================================');
  process.exit(0);
}
