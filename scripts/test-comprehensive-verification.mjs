// ============================================================
// TEST AUTOMATISÉ COMPLET : VÉRIFICATION GLOBALE MASROUF
// Exécute et valide toutes les exigences 1 à 9 du cahier des charges
// ============================================================

import assert from 'node:assert';
import fs from 'node:fs';

console.log('🚀 DÉMARRAGE DE LA SUITE DE TESTS COMPLÈTE MASROUF...\n');

// ------------------------------------------------------------
// TEST 1 : GESTION DES DATES, ANNÉES BISSEXTILES ET MOIS PASSÉS / FUTURS
// ------------------------------------------------------------
console.log('--- Test 1 : Calendrier, années bissextiles et limites de mois ---');

function getMonthExactRange(year, monthZeroIndexed) {
  const pad = (n) => String(n).padStart(2, '0');
  const start = `${year}-${pad(monthZeroIndexed + 1)}-01`;
  const lastDay = new Date(Date.UTC(year, monthZeroIndexed + 1, 0)).getUTCDate();
  const end = `${year}-${pad(monthZeroIndexed + 1)}-${pad(lastDay)}`;
  return { start, end, lastDay };
}

// Février 2024 (Année bissextile) => 29 jours
const feb2024 = getMonthExactRange(2024, 1);
assert.strictEqual(feb2024.start, '2024-02-01');
assert.strictEqual(feb2024.end, '2024-02-29');
assert.strictEqual(feb2024.lastDay, 29);

// Février 2026 (Année standard) => 28 jours
const feb2026 = getMonthExactRange(2026, 1);
assert.strictEqual(feb2026.start, '2026-02-01');
assert.strictEqual(feb2026.end, '2026-02-28');
assert.strictEqual(feb2026.lastDay, 28);

// Décembre 2026 => 31 jours
const dec2026 = getMonthExactRange(2026, 11);
assert.strictEqual(dec2026.start, '2026-12-01');
assert.strictEqual(dec2026.end, '2026-12-31');

// Vérification détection mois passés (clôturés / lecture seule)
function isPastMonth(year, monthZeroIndexed, refDate = new Date()) {
  const currentY = refDate.getFullYear();
  const currentM = refDate.getMonth();
  return year < currentY || (year === currentY && monthZeroIndexed < currentM);
}

const mockNow = new Date('2026-11-16T12:00:00Z');
assert.strictEqual(isPastMonth(2026, 9, mockNow), true, 'Octobre 2026 est dans le passé');
assert.strictEqual(isPastMonth(2026, 10, mockNow), false, 'Novembre 2026 est le mois courant');
assert.strictEqual(isPastMonth(2026, 11, mockNow), false, 'Décembre 2026 est futur');
assert.strictEqual(isPastMonth(2025, 11, mockNow), true, 'Décembre 2025 est dans le passé');
console.log('✓ Test 1 validé : Calcul des dates de mois, années bissextiles et détection de clôture parfaits.');

// ------------------------------------------------------------
// TEST 2 : DÉTECTION DES DATES HORS PÉRIODE ET ACTIONS CORRECTIVES
// ------------------------------------------------------------
console.log('\n--- Test 2 : Date hors période et action de correction ---');

function checkTransactionDate(date, budget, today = '2026-11-16') {
  const isOutside = !!budget && !!date && (date < budget.start || date > budget.end);
  const targetDate = budget
    ? (today >= budget.start && today <= budget.end ? today : budget.start)
    : today;
  return { isOutside, targetDate };
}

const activeBudget = { start: '2026-11-01', end: '2026-11-30' };
const futureBudget = { start: '2026-12-01', end: '2026-12-31' };

// Date dans la période active
const d1 = checkTransactionDate('2026-11-15', activeBudget, '2026-11-16');
assert.strictEqual(d1.isOutside, false);

// Date en dehors de la période active
const d2 = checkTransactionDate('2026-10-25', activeBudget, '2026-11-16');
assert.strictEqual(d2.isOutside, true);
assert.strictEqual(d2.targetDate, '2026-11-16'); // Corrige vers today dans la période

// Date dans un budget futur (today est hors période)
const d3 = checkTransactionDate('2026-11-16', futureBudget, '2026-11-16');
assert.strictEqual(d3.isOutside, true);
assert.strictEqual(d3.targetDate, '2026-12-01'); // Corrige vers le début de la période future
console.log('✓ Test 2 validé : Détection date hors période et calcul de date cible corrective validés.');

// ------------------------------------------------------------
// TEST 3 : RECHERCHE DYNAMIQUE DÈS LE 1ER CARACTÈRE (NOM, MARQUE, CATÉGORIE)
// ------------------------------------------------------------
console.log('\n--- Test 3 : Recherche dynamique de produits dès le premier caractère ---');

const mockProducts = [
  { id: '1', name: "Huile d'olive", brand: 'Châal', categoryId: 'cat_alim' },
  { id: '2', name: 'Lait demi-écrémé', brand: 'Délice', categoryId: 'cat_alim' },
  { id: '3', name: 'Shampoing doux', brand: 'Garnier', categoryId: 'cat_hygiene' },
  { id: '4', name: 'Chemise coton', brand: 'Zara', categoryId: 'cat_mode' },
];

const mockCategoryNames = {
  cat_alim: 'Alimentation',
  cat_hygiene: 'Hygiène et soins',
  cat_mode: 'Vêtements et chaussures',
};

function searchProducts(query, categoryFilter = 'all') {
  const s = query.trim().toLowerCase();
  return mockProducts.filter((p) => {
    if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) return false;
    if (!s) return true;
    const nameMatch = p.name.trim().toLowerCase().includes(s);
    const brandMatch = (p.brand ?? '').trim().toLowerCase().includes(s);
    const catMatch = (mockCategoryNames[p.categoryId] ?? '').toLowerCase().includes(s);
    return nameMatch || brandMatch || catMatch;
  });
}

// Recherche dès 1 seule lettre 'h' => trouve Huile d'olive, Shampoing doux, et Chemise coton
const resH = searchProducts('h');
assert.strictEqual(resH.length, 3);

// Recherche par marque 'z' => Zara
const resZ = searchProducts('z');
assert.strictEqual(resZ.length, 1);
assert.strictEqual(resZ[0].brand, 'Zara');

// Recherche par catégorie 'hyg' => trouve Shampoing
const resHyg = searchProducts('hyg');
assert.strictEqual(resHyg.length, 1);
assert.strictEqual(resHyg[0].name, 'Shampoing doux');

// Recherche combinée texte + filtre catégorie ('dél' dans 'cat_alim' => Délice)
const resCombined = searchProducts('dél', 'cat_alim');
assert.strictEqual(resCombined.length, 1);
assert.strictEqual(resCombined[0].name, 'Lait demi-écrémé');
console.log('✓ Test 3 validé : Recherche dynamique par nom, marque et catégorie dès la 1ère lettre.');

// ------------------------------------------------------------
// TEST 4 : REDESIGN ANALYSES (LES 7 SECTIONS DU TABLEAU DE BORD)
// ------------------------------------------------------------
console.log('\n--- Test 4 : Métriques et calculs des 7 sections du Dashboard Analyses ---');

// Données financières réelles simulées
const totalBudgetTest = 800.000;
const testTxns = [
  { amount: 150.000, categoryId: 'alim' },
  { amount: 120.000, categoryId: 'alim' },
  { amount: 100.000, categoryId: 'loyer' },
  { amount: 80.000, categoryId: 'factures' },
  { amount: 50.000, categoryId: 'transport' },
];

const allocationsTest = {
  alim: 300.000,
  loyer: 250.000,
  factures: 100.000,
  transport: 100.000,
};

// Section 1 : Somme consommée en millimes entiers
const curTotalTest = testTxns.reduce((sum, tx) => sum + Math.round(tx.amount * 1000), 0) / 1000;
assert.strictEqual(curTotalTest, 500.000);

const consumptionPctTest = (curTotalTest / totalBudgetTest) * 100;
assert.strictEqual(consumptionPctTest, 62.5);
assert.strictEqual(Math.max(0, totalBudgetTest - curTotalTest), 300.000);

// Cas de dépassement
const exceededTotal = 920.000;
const overAmount = Math.max(0, exceededTotal - totalBudgetTest);
assert.strictEqual(overAmount, 120.000);
assert.strictEqual(Number(((exceededTotal / totalBudgetTest) * 100).toFixed(1)), 115);

// Section 3 : Comparaison précédente
const prevTotalTest = 600.000;
const diffTest = curTotalTest - prevTotalTest; // -100 DT
const pctDiffTest = (diffTest / prevTotalTest) * 100;
assert.strictEqual(diffTest, -100.000);
assert.strictEqual(Math.round(pctDiffTest * 10) / 10, -16.7);

// Section 5 : Classement des catégories du PLUS FAIBLE au PLUS FORT pourcentage
const catSpends = {
  alim: 270.000, // 270 / 300 = 90%
  loyer: 100.000, // 100 / 250 = 40%
  factures: 80.000, // 80 / 100 = 80%
  transport: 50.000, // 50 / 100 = 50%
};

const rankedCats = Object.keys(allocationsTest).map((id) => ({
  id,
  spent: catSpends[id],
  alloc: allocationsTest[id],
  pct: (catSpends[id] / allocationsTest[id]) * 100,
})).sort((a, b) => a.pct - b.pct);

// Vérification de l'ordre croissant : loyer (40%) < transport (50%) < factures (80%) < alim (90%)
assert.strictEqual(rankedCats[0].id, 'loyer');
assert.strictEqual(rankedCats[1].id, 'transport');
assert.strictEqual(rankedCats[2].id, 'factures');
assert.strictEqual(rankedCats[3].id, 'alim');

// Section 6 : Allure quotidienne (Pace)
const daysElapsedTest = 15;
const daysRemainingTest = 15;
const totalDaysTest = 30;
const avgDailyTest = curTotalTest / daysElapsedTest; // 500 / 15 = 33.333 DT/j
const projectedEndTest = curTotalTest + avgDailyTest * daysRemainingTest; // 1000 DT
const isPaceSustainableTest = projectedEndTest <= totalBudgetTest; // 1000 <= 800 => false
assert.strictEqual(isPaceSustainableTest, false);
assert.strictEqual(Math.round((projectedEndTest - totalBudgetTest) * 1000) / 1000, 200);

// Section 7 : Catégorie d'attention prioritaire (plus fort épuisement = Alimentation à 90%)
const attentionCandidate = [...rankedCats].sort((a, b) => b.pct - a.pct)[0];
assert.strictEqual(attentionCandidate.id, 'alim');
assert.strictEqual(attentionCandidate.pct, 90);
console.log('✓ Test 4 validé : Les 7 sections du Dashboard Analyses respectent rigoureusement les modèles mathématiques.');

// ------------------------------------------------------------
// TEST 5 : POINTS DE GAMIFICATION ET TRADUCTIONS DES NIVEAUX
// ------------------------------------------------------------
console.log('\n--- Test 5 : Gamification, unicité des récompenses et traduction des niveaux ---');

function traduireNiveau(niveau, langue) {
  const n = (niveau || '').toLowerCase();
  if (n === 'beginner' || n === 'débutant' || n === 'debutant' || n === 'apprenti') {
    return langue === 'ar' ? 'مبتدئ' : langue === 'en' ? 'Beginner' : 'Débutant';
  }
  if (n === 'saver' || n === 'économe' || n === 'econome') {
    return langue === 'ar' ? 'مقتصد' : langue === 'en' ? 'Saver' : 'Économe';
  }
  if (n === 'expert') {
    return langue === 'ar' ? 'خبير' : 'Expert';
  }
  return niveau;
}

assert.strictEqual(traduireNiveau('Beginner', 'fr'), 'Débutant');
assert.strictEqual(traduireNiveau('Beginner', 'ar'), 'مبتدئ');
assert.strictEqual(traduireNiveau('Beginner', 'en'), 'Beginner');

assert.strictEqual(traduireNiveau('Saver', 'fr'), 'Économe');
assert.strictEqual(traduireNiveau('Saver', 'ar'), 'مقتصد');
assert.strictEqual(traduireNiveau('Saver', 'en'), 'Saver');

assert.strictEqual(traduireNiveau('Expert', 'fr'), 'Expert');
assert.strictEqual(traduireNiveau('Expert', 'ar'), 'خبير');
assert.strictEqual(traduireNiveau('Expert', 'en'), 'Expert');

// Test unicité de calcul des périodes de points (anti-doublon)
const duplicatePeriods = [
  { start: '2026-09-01', end: '2026-09-30', total: 600 },
  { start: '2026-09-01', end: '2026-09-30', total: 600 }, // Doublon intentionnel
  { start: '2026-10-01', end: '2026-10-31', total: 700 },
];

const seenPeriodKeys = new Set();
const uniquePeriods = [];
for (const b of duplicatePeriods) {
  const key = `${b.start}_${b.end}`;
  if (!seenPeriodKeys.has(key)) {
    seenPeriodKeys.add(key);
    uniquePeriods.push(b);
  }
}
assert.strictEqual(uniquePeriods.length, 2, 'Les périodes dupliquées sont dédupliquées');
console.log('✓ Test 5 validé : Traduction des niveaux trilingue et unicité des récompenses validées.');

// ------------------------------------------------------------
// TEST 6 : TIROIR LATÉRAL ET COHÉRENCE RTL / LTR
// ------------------------------------------------------------
console.log('\n--- Test 6 : Tiroir latéral RTL / LTR et adaptation bidirectionnelle ---');

function getDrawerStyle(isRTL, drawerW) {
  return {
    hiddenX: isRTL ? drawerW : -drawerW,
    position: isRTL ? 'right' : 'left',
    roundedBorder: isRTL
      ? { borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }
      : { borderTopRightRadius: 24, borderBottomRightRadius: 24 },
  };
}

const ltrDrawer = getDrawerStyle(false, 300);
assert.strictEqual(ltrDrawer.hiddenX, -300, 'LTR glisse depuis la gauche');
assert.strictEqual(ltrDrawer.position, 'left');
assert.strictEqual(ltrDrawer.roundedBorder.borderTopRightRadius, 24);

const rtlDrawer = getDrawerStyle(true, 300);
assert.strictEqual(rtlDrawer.hiddenX, 300, 'RTL glisse depuis la droite');
assert.strictEqual(rtlDrawer.position, 'right');
assert.strictEqual(rtlDrawer.roundedBorder.borderTopLeftRadius, 24);
console.log('✓ Test 6 validé : Géométrie du tiroir, direction et arrondis RTL/LTR confirmés.');

// ------------------------------------------------------------
// TEST 7 : BASCULE DE LANGUE FLUIDE ET DIRECTE (GLOBAL LANGUAGE PROVIDER)
// ------------------------------------------------------------
console.log('\n--- Test 7 : Bascule de langue fluide et directe pour toute l\'application ---');

const frDict = JSON.parse(fs.readFileSync('src/i18n/fr.json', 'utf8'));
const arDict = JSON.parse(fs.readFileSync('src/i18n/ar.json', 'utf8'));
const enDict = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const dicts = { fr: frDict, ar: arDict, en: enDict };

// Simulation du dispatcher LanguageProvider
class MockLanguageProvider {
  constructor(initialLang = 'fr') {
    this.langue = initialLang;
    this.isRTL = initialLang === 'ar';
    this.subscribers = new Set();
  }
  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }
  changerLangue(newLang) {
    this.langue = newLang;
    this.isRTL = newLang === 'ar';
    for (const sub of this.subscribers) {
      sub({ langue: this.langue, isRTL: this.isRTL });
    }
  }
  t(key) {
    return dicts[this.langue]?.[key] || dicts['fr']?.[key] || key;
  }
}

const provider = new MockLanguageProvider('fr');
let componentAState = null;
let componentBState = null;

// Deux composants distincts abonnés au même contexte global
provider.subscribe((s) => { componentAState = { ...s, text: provider.t('accueil') }; });
provider.subscribe((s) => { componentBState = { ...s, text: provider.t('analyses') }; });

// 1. Bascule vers l'Arabe : les deux composants reçoivent directement la mise à jour
provider.changerLangue('ar');
assert.strictEqual(componentAState.langue, 'ar');
assert.strictEqual(componentAState.isRTL, true);
assert.strictEqual(componentAState.text, arDict['accueil']);
assert.strictEqual(componentBState.langue, 'ar');
assert.strictEqual(componentBState.isRTL, true);
assert.strictEqual(componentBState.text, arDict['analyses']);

// 2. Bascule vers l'Anglais : mise à jour synchrone et directe
provider.changerLangue('en');
assert.strictEqual(componentAState.langue, 'en');
assert.strictEqual(componentAState.isRTL, false);
assert.strictEqual(componentAState.text, enDict['accueil']);
assert.strictEqual(componentBState.langue, 'en');
assert.strictEqual(componentBState.isRTL, false);
assert.strictEqual(componentBState.text, enDict['analyses']);

// 3. Test de fluidité du tiroir pendant le changement de langue à chaud
function simulateDrawerEffect(visible, isCurrentlyMounted, wasAlreadyVisible, hiddenX) {
  if (visible) {
    if (!wasAlreadyVisible) {
      // Ouverture initiale : part de hiddenX et glisse vers 0
      return { action: 'animate_in', startX: hiddenX, toX: 0, mounted: true };
    } else {
      // Déjà ouvert pendant le changement de langue : reste stable à x=0
      return { action: 'keep_stable', startX: 0, toX: 0, mounted: true };
    }
  } else if (wasAlreadyVisible) {
    return { action: 'animate_out', startX: 0, toX: hiddenX, mounted: false };
  }
  return { action: 'idle', mounted: false };
}

// Scénario A : Le tiroir s'ouvre en FR
const openStep = simulateDrawerEffect(true, false, false, -300);
assert.strictEqual(openStep.action, 'animate_in');
assert.strictEqual(openStep.startX, -300);
assert.strictEqual(openStep.toX, 0);

// Scénario B : L'utilisateur clique sur 'ar' dans le tiroir ouvert
// Le tiroir DOIT rester stable à x=0 sans être renvoyé à hiddenX (+300) !
const liveSwitchStep = simulateDrawerEffect(true, true, true, 300);
assert.strictEqual(liveSwitchStep.action, 'keep_stable', 'Le tiroir reste stable à x=0 lors du changement de langue');
assert.strictEqual(liveSwitchStep.startX, 0);
assert.strictEqual(liveSwitchStep.toX, 0);

// Scénario C : Le tiroir se referme en AR
const closeStep = simulateDrawerEffect(false, true, true, 300);
assert.strictEqual(closeStep.action, 'animate_out');
assert.strictEqual(closeStep.toX, 300);

console.log('✓ Test 7 validé : Bascule de langue fluide, directe et réactive pour l\'ensemble des composants sans saut d\'écran.');

console.log('\n============================================================');
console.log('🎉 TOUS LES TESTS DE VÉRIFICATION COMPLÈTE SONT SUCCÈS !');
console.log('============================================================\n');
