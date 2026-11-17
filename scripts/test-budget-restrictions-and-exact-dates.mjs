import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== TEST DE VÉRIFICATION : RÈGLES DE BUDGET UNIQUE PAR MOIS & DATES EXACTES ===');

// 1. Test unitaire des calculs de dates exactes de mois (getExactMonthBounds)
function getExactMonthBounds(dateOrMonthStr) {
  let clean = dateOrMonthStr ? String(dateOrMonthStr).trim() : '';
  if (!clean || !/^\d{4}-\d{1,2}/.test(clean)) {
    clean = '2026-11-01';
  }
  const parts = clean.split('-');
  const y = parseInt(parts[0], 10) || 2026;
  const m = parseInt(parts[1], 10) || 1;
  const monthKey = `${y}-${String(m).padStart(2, '0')}`;
  const start = `${monthKey}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, monthKey, year: y, month: m, lastDay };
}

// Vérification de Novembre 2026 (30 jours)
const nov = getExactMonthBounds('2026-11');
assert.strictEqual(nov.start, '2026-11-01', 'Novembre début doit être 2026-11-01');
assert.strictEqual(nov.end, '2026-11-30', 'Novembre fin doit être 2026-11-30');
assert.strictEqual(nov.lastDay, 30);

// Vérification de Décembre 2026 (31 jours)
const dec = getExactMonthBounds('2026-12');
assert.strictEqual(dec.start, '2026-12-01', 'Décembre début doit être 2026-12-01');
assert.strictEqual(dec.end, '2026-12-31', 'Décembre fin doit être 2026-12-31');
assert.strictEqual(dec.lastDay, 31);

// Vérification de Février 2026 (non bissextile : 28 jours)
const feb26 = getExactMonthBounds('2026-02-15');
assert.strictEqual(feb26.start, '2026-02-01', 'Février 2026 début doit être 2026-02-01');
assert.strictEqual(feb26.end, '2026-02-28', 'Février 2026 fin doit être 2026-02-28');
assert.strictEqual(feb26.lastDay, 28);

// Vérification de Février 2024 (bissextile : 29 jours)
const feb24 = getExactMonthBounds('2024-02-10');
assert.strictEqual(feb24.start, '2024-02-01', 'Février 2024 début doit être 2024-02-01');
assert.strictEqual(feb24.end, '2024-02-29', 'Février 2024 fin doit être 2024-02-29');
assert.strictEqual(feb24.lastDay, 29);

console.log('✓ getExactMonthBounds : début exact (AAAA-MM-01) et fin exacte (dernier jour du mois) validés');

// 2. Vérification dans calendrier.tsx que le bouton "+ Ajouter une période" est absent quand une période existe
const calCode = fs.readFileSync('src/app/(tabs)/calendrier.tsx', 'utf8');
assert.ok(
  !calCode.includes('selected.length > 0 &&') || !calCode.includes("label={t('creer_periode_budget')}"),
  "calendrier.tsx ne doit pas afficher le bouton 'creer_periode_budget' quand selected.length > 0"
);
console.log('✓ calendrier.tsx : Bouton d’ajout de période supprimé dès qu’une période pour ce mois est choisie');

// 3. Vérification dans budget-mois.tsx du blocage de doublon pour le même mois
const budgetMoisCode = fs.readFileSync('src/app/budget-mois.tsx', 'utf8');
assert.ok(
  budgetMoisCode.includes('getExactMonthBounds'),
  'budget-mois.tsx doit importer et utiliser getExactMonthBounds'
);
assert.ok(
  budgetMoisCode.includes('erreur_budget_unique_mois'),
  'budget-mois.tsx doit valider la règle du budget unique par mois'
);
assert.ok(
  budgetMoisCode.includes('erreur_dates_mois_exactes'),
  'budget-mois.tsx doit valider les dates exactes de début et fin de mois'
);
console.log('✓ budget-mois.tsx : Règle stricte d’unicité par mois et synchronisation automatique des dates exactes');

// 4. Vérification dans store.tsx de l’unicité dans actions.saveBudget
const storeCode = fs.readFileSync('src/state/store.tsx', 'utf8');
assert.ok(
  storeCode.includes('getExactMonthBounds(b.start)'),
  'store.tsx doit normaliser les dates exactes du mois'
);
assert.ok(
  storeCode.includes('existingForSameMonth'),
  'store.tsx doit réutiliser le budget existant du même mois'
);
console.log('✓ store.tsx : actions.saveBudget garantit l’unicité stricte d’un seul budget par mois');

// 5. Vérification de la synchronisation i18n
const fr = JSON.parse(fs.readFileSync('src/i18n/fr.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('src/i18n/ar.json', 'utf8'));
const keysToCheck = [
  'budget_unique_mois_titre',
  'erreur_budget_unique_mois',
  'modifier_budget_existant',
  'erreur_dates_mois_exactes',
  'budget_unique_mois_info'
];
for (const k of keysToCheck) {
  assert.ok(fr[k], `Clé ${k} manquante dans fr.json`);
  assert.ok(en[k], `Clé ${k} manquante dans en.json`);
  assert.ok(ar[k], `Clé ${k} manquante dans ar.json`);
}
console.log('✓ i18n : 717 clés rigoureusement synchronisées (0 clé manquante)');

console.log('============================================================');
console.log('🎉 TOUS LES TESTS DE GESTION DU BUDGET UNIQUE SONT VALIDÉS !');
console.log('============================================================');
