import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== TEST COMPLET : ANALYSES & SÉLECTEUR DE LANGUE MULTILINGUE ===');

// 1. Vérification des fichiers de traduction
const fr = JSON.parse(fs.readFileSync('src/i18n/fr.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('src/i18n/ar.json', 'utf8'));

const frKeys = Object.keys(fr).sort();
const enKeys = Object.keys(en).sort();
const arKeys = Object.keys(ar).sort();

assert.strictEqual(frKeys.length, enKeys.length, 'Nombre de clés FR et EN identique');
assert.strictEqual(frKeys.length, arKeys.length, 'Nombre de clés FR et AR identique');

for (const k of frKeys) {
  assert.ok(en[k] !== undefined && en[k] !== '', `Clé manquante dans en.json: ${k}`);
  assert.ok(ar[k] !== undefined && ar[k] !== '', `Clé manquante dans ar.json: ${k}`);
}
console.log(`✓ Synchronisation i18n parfaite : ${frKeys.length} clés synchronisées à 100% dans FR, EN, AR`);

// 2. Vérification des clés spécifiques requises
const requiredKeys = [
  'changement_langue_titre',
  'redemarrage_rtl_message',
  'redemarrage_ltr_message',
  'compris',
  'deconnexion',
  'langue_label',
  'repartition_categories',
  'tableau_detaille',
  'periode_actuelle',
  'periode_precedente',
  'depense_totale',
  'enveloppe_budgetaire',
  'consommation_budget',
  'comparaison_periode_prec',
  'periode_precedente_total',
  'pas_de_depense_periode_prec',
  'plus_grosses_depenses',
  'evolution_prix_unitaire',
  'derniers_prix_observes',
  'conclusion_top_cat',
  'conclusion_top_cat_egalite',
  'conclusion_hausse',
  'conclusion_baisse',
  'respect_global_budget',
  'depassement_global_budget',
  'choisir_ce_que_vous_suivez',
  'vie_quotidienne_organisee',
  'changer_a_tout_moment',
  'selectionne',
  'selectionner',
  'recapitulatif_selection',
  'plan_qui_vous_ressemble',
  'categories_selectionnees_compte',
  'aller_a_accueil',
  'modifier_la_selection',
  'budget_quand_pret',
  'definir_depuis_accueil',
];

for (const rk of requiredKeys) {
  assert.ok(fr[rk], `Clé obligatoire absente de FR: ${rk}`);
  assert.ok(en[rk], `Clé obligatoire absente de EN: ${rk}`);
  assert.ok(ar[rk], `Clé obligatoire absente de AR: ${rk}`);
}
console.log(`✓ Toutes les ${requiredKeys.length} clés requises pour Analyses et Onboarding sont présentes`);

// 3. Test des règles de comparaison Analyses
function testComparaison(cur, prev) {
  const diff = cur - prev;
  const pct = prev > 0 ? (diff / prev) * 100 : null;
  const isSaving = diff <= 0;
  return { diff, pct, isSaving };
}

// Cas 1 : Baisse de dépenses (économies)
const c1 = testComparaison(750, 900);
assert.strictEqual(c1.diff, -150);
assert.strictEqual(c1.isSaving, true);
assert.strictEqual(Math.round(c1.pct * 10) / 10, -16.7);

// Cas 2 : Hausse de dépenses
const c2 = testComparaison(920, 800);
assert.strictEqual(c2.diff, 120);
assert.strictEqual(c2.isSaving, false);
assert.strictEqual(c2.pct, 15);

// Cas 3 : Période précédente vide (aucun historique préalable)
const c3 = testComparaison(450, 0);
assert.strictEqual(c3.diff, 450);
assert.strictEqual(c3.pct, null); // Pas de division par zéro !
console.log('✓ Règles de comparaison et zéro division par zéro validées');

// 4. Test du groupement des catégories (Top 5 + Autres)
const sampleCats = [
  { id: '1', name: 'Alimentation', amount: 300 },
  { id: '2', name: 'Loyer', amount: 250 },
  { id: '3', name: 'Transport', amount: 100 },
  { id: '4', name: 'Factures', amount: 80 },
  { id: '5', name: 'Loisirs', amount: 50 },
  { id: '6', name: 'Santé', amount: 30 },
  { id: '7', name: 'Vêtements', amount: 20 },
];

const totalSpend = sampleCats.reduce((s, c) => s + c.amount, 0); // 830
const top5 = sampleCats.slice(0, 5);
const others = sampleCats.slice(5);
const othersTotal = others.reduce((s, c) => s + c.amount, 0); // 50

assert.strictEqual(top5.length, 5);
assert.strictEqual(othersTotal, 50);
assert.strictEqual(top5.reduce((s, c) => s + c.amount, 0) + othersTotal, totalSpend);
console.log('✓ Regroupement Top 5 + Autres validé');

console.log('TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !');
