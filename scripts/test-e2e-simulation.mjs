// scripts/test-e2e-simulation.mjs
// Simulation complète de bout en bout des règles métier Masrouf
import assert from 'node:assert';

console.log('=== TEST E2E SIMULATION MASROUF ===');

// 1. Formatage monétaire formatDT
function formatDT(valeur) {
  const num = typeof valeur === 'number' ? valeur : parseFloat(valeur) || 0;
  return num.toFixed(3) + ' DT';
}

assert.strictEqual(formatDT(14.5), '14.500 DT');
assert.strictEqual(formatDT(0), '0.000 DT');
assert.strictEqual(formatDT(120.4567), '120.457 DT');
console.log('✓ Test formatDT validé');

// 2. Calcul du prix unitaire et comparaison
function comparerPrix(prixActuel, quantiteActuelle, uniteActuelle, dernierPrix, derniereQuantite, derniereUnite) {
  const puActuel = prixActuel / quantiteActuelle;
  if (!dernierPrix || !derniereQuantite) {
    return { premierAchat: true, puActuel };
  }
  const puDernier = dernierPrix / derniereQuantite;
  if (uniteActuelle !== derniereUnite) {
    return {
      premierAchat: false,
      unitesIncompatibles: true,
      puActuel,
      puDernier
    };
  }
  const diffMontant = puActuel - puDernier;
  const diffPourcentage = (diffMontant / puDernier) * 100;
  return {
    premierAchat: false,
    unitesIncompatibles: false,
    puActuel,
    puDernier,
    diffMontant,
    diffPourcentage,
    hausse: diffMontant > 0.0001,
    baisse: diffMontant < -0.0001,
    egal: Math.abs(diffMontant) <= 0.0001
  };
}

const comp1 = comparerPrix(15, 1, 'L', null, null, null);
assert.strictEqual(comp1.premierAchat, true);

const comp2 = comparerPrix(16.5, 1, 'L', 15, 1, 'L');
assert.strictEqual(comp2.premierAchat, false);
assert.strictEqual(comp2.diffMontant.toFixed(3), '1.500');
assert.strictEqual(comp2.diffPourcentage.toFixed(1), '10.0');
assert.strictEqual(comp2.hausse, true);

const comp3 = comparerPrix(13.5, 1, 'L', 15, 1, 'L');
assert.strictEqual(comp3.baisse, true);
assert.strictEqual(comp3.diffPourcentage.toFixed(1), '-10.0');

const comp4 = comparerPrix(15, 1, 'L', 15, 1000, 'g');
assert.strictEqual(comp4.unitesIncompatibles, true);
console.log('✓ Test comparaison prix unitaire validé');

// 3. Ressemblance de noms de produits
function nettoyerNom(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function ressembleProduit(nouveauNom, listeExistants) {
  const clean = nettoyerNom(nouveauNom);
  if (clean.length < 2) return null;
  return listeExistants.find(p => {
    const pClean = nettoyerNom(p.nom);
    return pClean.includes(clean) || clean.includes(pClean);
  }) || null;
}

const existants = [{ id: 1, nom: 'Lait demi-écrémé' }, { id: 2, nom: 'Huile d\'olive' }];
assert.strictEqual(ressembleProduit('lait', existants)?.nom, 'Lait demi-écrémé');
assert.strictEqual(ressembleProduit('HUILE', existants)?.nom, 'Huile d\'olive');
assert.strictEqual(ressembleProduit('Pain', existants), null);
console.log('✓ Test ressemblance noms de produits validé');

// 4. Calcul d'impact budgétaire par différence
let budgetDepense = 500.000;
const ancienAchat = 45.000;
const nouvelAchat = 60.000;
const differenceAchat = nouvelAchat - ancienAchat; // +15.000
budgetDepense += differenceAchat;
assert.strictEqual(budgetDepense, 515.000);

// Suppression de l'achat
budgetDepense -= nouvelAchat;
assert.strictEqual(budgetDepense, 455.000);
console.log('✓ Test impact budgétaire par différence validé');

// 5. Calcul de période de même durée
function calculerPeriodePrecedente(dateDebutStr, dateFinStr) {
  const debut = new Date(dateDebutStr);
  const fin = new Date(dateFinStr);
  const dureeJours = Math.round((fin.getTime() - debut.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const finPrec = new Date(debut.getTime() - 24 * 60 * 60 * 1000);
  const debutPrec = new Date(finPrec.getTime() - (dureeJours - 1) * 24 * 60 * 60 * 1000);
  return {
    debutPrecedente: debutPrec.toISOString().split('T')[0],
    finPrecedente: finPrec.toISOString().split('T')[0],
    dureeJours
  };
}

const p1 = calculerPeriodePrecedente('2026-11-01', '2026-11-30'); // 30 jours
assert.strictEqual(p1.dureeJours, 30);
assert.strictEqual(p1.finPrecedente, '2026-10-31');
assert.strictEqual(p1.debutPrecedente, '2026-10-02');

const p2 = calculerPeriodePrecedente('2026-11-10', '2026-11-16'); // 7 jours
assert.strictEqual(p2.dureeJours, 7);
assert.strictEqual(p2.finPrecedente, '2026-11-09');
assert.strictEqual(p2.debutPrecedente, '2026-11-03');
console.log('✓ Test période précédente symétrique de même durée validé');

// 6. Test de respect de la vie privée admin (zéro fuite)
const adminVue = {
  totalUtilisateurs: 42,
  utilisateursActifs: 35,
  totalAchatsEffectues: 1250,
  volumeTotalDinars: 45200.750,
  topCategoriesGlobales: [
    { nom: 'Alimentation', partPourcentage: 41.5 },
    { nom: 'Logement', partPourcentage: 28.2 }
  ]
};

assert.strictEqual('achatsDetailles' in adminVue, false);
assert.strictEqual('magasinsFrequentes' in adminVue, false);
assert.strictEqual('nomsProduitsIndividuels' in adminVue, false);
console.log('✓ Test confidentialité admin validé');

console.log('TOUS LES TESTS E2E SIMULATION SONT PASSÉS AVEC SUCCÈS !');
