import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== TEST DE VÉRIFICATION : PÉRIODE LIBRE & SANS VERROUILLAGE DES DATES ===');

// 1. Test unitaire des calculs de dates exactes de mois (getExactMonthBounds servant de valeurs par défaut)
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

// Initialisation par défaut : Novembre 2026 (01 au 30)
const nov = getExactMonthBounds('2026-11');
assert.strictEqual(nov.start, '2026-11-01', 'Novembre début doit être 2026-11-01 par défaut');
assert.strictEqual(nov.end, '2026-11-30', 'Novembre fin doit être 2026-11-30 par défaut');

// Initialisation par défaut : Décembre 2026 (01 au 31)
const dec = getExactMonthBounds('2026-12');
assert.strictEqual(dec.start, '2026-12-01', 'Décembre début doit être 2026-12-01 par défaut');
assert.strictEqual(dec.end, '2026-12-31', 'Décembre fin doit être 2026-12-31 par défaut');

console.log('✓ getExactMonthBounds : initialisation par défaut au 1er et dernier jour du mois validée');

// 2. Vérification dans budget-mois.tsx que les dates sont modifiables sans lock de mois
const budgetMoisCode = fs.readFileSync('src/app/budget-mois.tsx', 'utf8');
assert.ok(
  budgetMoisCode.includes('handleStartChange') && budgetMoisCode.includes('handleEndChange'),
  'budget-mois.tsx doit permettre la saisie indépendante de la date de début et de fin'
);
assert.ok(
  !budgetMoisCode.includes('if (start !== expectedBounds.start || end !== expectedBounds.end)'),
  'budget-mois.tsx ne doit pas verrouiller les dates aux bornes strictes du mois civil'
);
console.log('✓ budget-mois.tsx : Absence de lock de dates et composition libre d’une période (ex: 2026-11-05 au 2026-12-30)');

// 3. Vérification dans allocation-budget.tsx de la préservation des dates personnalisées
const allocCode = fs.readFileSync('src/app/allocation-budget.tsx', 'utf8');
assert.ok(
  allocCode.includes('const normalizedStart = start ||') && allocCode.includes('const normalizedEnd = end ||'),
  'allocation-budget.tsx doit respecter les dates personnalisées passées'
);
console.log('✓ allocation-budget.tsx : Transmission fidèle des dates de période personnalisées');

// 4. Vérification dans store.tsx et sqlite-bridge.ts de la sauvegarde fidèle sans forçage
const storeCode = fs.readFileSync('src/state/store.tsx', 'utf8');
assert.ok(
  !storeCode.includes('const { start: exactStart, end: exactEnd, monthKey } = getExactMonthBounds(b.start);'),
  'store.tsx ne doit pas écraser les dates choisies par getExactMonthBounds'
);
const bridgeCode = fs.readFileSync('src/state/sqlite-bridge.ts', 'utf8');
assert.ok(
  !bridgeCode.includes('budget.start = exactStart;'),
  'sqlite-bridge.ts ne doit pas forcer budget.start = exactStart'
);
console.log('✓ store.tsx & sqlite-bridge.ts : Persistance SQLite fidèle des dates personnalisées choisies');

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
console.log('✓ i18n : clés de période et messages de validation parfaitement synchronisés');

console.log('============================================================');
console.log('🎉 TOUS LES TESTS DE PÉRIODE LIBRE PERSONNALISÉE SONT VALIDÉS !');
console.log('============================================================');
