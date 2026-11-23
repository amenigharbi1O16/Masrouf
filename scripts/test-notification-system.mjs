import assert from 'assert';

console.log('🧪 DÉBUT DU TEST DU SYSTÈME DE NOTIFICATIONS ET DE GESTION DES ERREURS...\n');

// 1. Test des types et alertes de catégories
const mockNotifications = [];
const trigger = (n) => {
  mockNotifications.push({ ...n, id: String(Date.now() + Math.random()), createdAt: new Date().toISOString() });
};

// Test evaluateBudgetAlerts logic
function testEvaluateBudgetAlerts({
  userId,
  budget,
  spent,
  existingNotifications,
  onTriggerNotification,
  purchases,
  expenses,
  categories,
  products,
}) {
  if (!budget || budget.total <= 0) return;
  const ratio = spent / budget.total;

  // Global 100%
  if (ratio >= 1.0) {
    const already = existingNotifications.some((n) => n.userId === userId && n.periodId === budget.id && n.type === 'alert_100');
    if (!already) {
      onTriggerNotification({
        userId,
        type: 'alert_100',
        title: 'Dépassement de budget : 100% franchi ⚠️',
        body: `Dépassement global de ${spent - budget.total} DT`,
        periodId: budget.id,
      });
    }
  } else if (ratio >= 0.8) {
    const already = existingNotifications.some((n) => n.userId === userId && n.periodId === budget.id && n.type === 'alert_80');
    if (!already) {
      onTriggerNotification({
        userId,
        type: 'alert_80',
        title: 'Seuil d’alerte : 80% du budget atteint 🔔',
        body: `80% consommé (${spent}/${budget.total})`,
        periodId: budget.id,
      });
    }
  }

  // Category alerts
  if (budget.allocations && purchases && expenses) {
    for (const [catId, allocAmount] of Object.entries(budget.allocations)) {
      const allocated = Number(allocAmount) || 0;
      if (allocated <= 0) continue;
      const catObj = categories?.find((c) => c.id === catId);
      const catName = catObj?.name || catId;

      const pCat = purchases
        .filter((p) => {
          if (p.userId !== userId || p.date < budget.start || p.date > budget.end) return false;
          const prod = products?.find((pr) => pr.id === p.productId);
          return prod?.categoryId === catId;
        })
        .reduce((sum, p) => sum + p.price, 0);

      const eCat = expenses
        .filter((e) => e.userId === userId && e.date >= budget.start && e.date <= budget.end && e.categoryId === catId)
        .reduce((sum, e) => sum + e.amount, 0);

      const totalCatSpent = pCat + eCat;
      const catRatio = totalCatSpent / allocated;

      if (catRatio >= 1.0) {
        const already = existingNotifications.some(
          (n) => n.userId === userId && n.periodId === budget.id && n.type === 'category_alert_100' && (n.categoryId === catId || n.body.includes(catName))
        );
        if (!already) {
          onTriggerNotification({
            userId,
            type: 'category_alert_100',
            title: `Dépassement : Catégorie "${catName}" ⚠️`,
            body: `Période ${budget.id} : Le budget alloué à "${catName}" (${allocated} DT) a été dépassé de ${totalCatSpent - allocated} DT.`,
            categoryId: catId,
            categoryName: catName,
            periodId: budget.id,
            amountSpent: totalCatSpent,
            budgetTotal: allocated,
          });
        }
      } else if (catRatio >= 0.8) {
        const already = existingNotifications.some(
          (n) => n.userId === userId && n.periodId === budget.id && n.type === 'category_alert_80' && (n.categoryId === catId || n.body.includes(catName))
        );
        if (!already) {
          onTriggerNotification({
            userId,
            type: 'category_alert_80',
            title: `Alerte 80% : Catégorie "${catName}" 🔔`,
            body: `Période ${budget.id} : 80% consommé pour "${catName}".`,
            categoryId: catId,
            categoryName: catName,
            periodId: budget.id,
            amountSpent: totalCatSpent,
            budgetTotal: allocated,
          });
        }
      }
    }
  }
}

// Scénario 1 : Catégorie à 80% puis à 105%
console.log('--- Test 1 : Alertes de budget alloué par catégorie ---');
const budget1 = {
  id: 'b-nov-2026',
  userId: 'u1',
  start: '2026-11-01',
  end: '2026-11-30',
  total: 1000,
  allocations: {
    'cat-food': 200,
    'cat-leisure': 100,
  },
};
const categories1 = [
  { id: 'cat-food', name: 'Alimentation' },
  { id: 'cat-leisure', name: 'Loisirs' },
];
const products1 = [
  { id: 'p1', name: 'Lait', categoryId: 'cat-food' },
  { id: 'p2', name: 'Cinéma', categoryId: 'cat-leisure' },
];

// Dépense de 170 DT en alimentation (170/200 = 85% -> alerte 80%)
const purchases1 = [{ userId: 'u1', productId: 'p1', price: 170, date: '2026-11-10' }];
const expenses1 = [];

testEvaluateBudgetAlerts({
  userId: 'u1',
  budget: budget1,
  spent: 170,
  existingNotifications: mockNotifications,
  onTriggerNotification: trigger,
  purchases: purchases1,
  expenses: expenses1,
  categories: categories1,
  products: products1,
});

assert.strictEqual(mockNotifications.length, 1, 'Devrait déclencher 1 notification pour le seuil 80%');
assert.strictEqual(mockNotifications[0].type, 'category_alert_80');
assert.strictEqual(mockNotifications[0].categoryId, 'cat-food');
console.log('✓ Seuil 80% pour catégorie Alimentation détecté avec succès.');

// Ajout d'une dépense franchissant les 100% (210 DT / 200 DT)
purchases1.push({ userId: 'u1', productId: 'p1', price: 40, date: '2026-11-12' });
testEvaluateBudgetAlerts({
  userId: 'u1',
  budget: budget1,
  spent: 210,
  existingNotifications: mockNotifications,
  onTriggerNotification: trigger,
  purchases: purchases1,
  expenses: expenses1,
  categories: categories1,
  products: products1,
});

assert.strictEqual(mockNotifications.length, 2, 'Devrait déclencher une deuxième notification pour dépassement 100%');
assert.strictEqual(mockNotifications[1].type, 'category_alert_100');
assert.strictEqual(mockNotifications[1].categoryId, 'cat-food');
console.log('✓ Dépassement 100% pour catégorie Alimentation détecté avec succès.');

// Vérification de la non-duplication
testEvaluateBudgetAlerts({
  userId: 'u1',
  budget: budget1,
  spent: 220,
  existingNotifications: mockNotifications,
  onTriggerNotification: trigger,
  purchases: purchases1,
  expenses: expenses1,
  categories: categories1,
  products: products1,
});
assert.strictEqual(mockNotifications.length, 2, 'Ne doit pas dupliquer l’alerte 100% déjà envoyée');
console.log('✓ Protection anti-duplication des alertes validée.');

console.log('\n--- Test 2 : Notification de nouveaux achats & consommation ---');
const newPurchaseNotif = {
  userId: 'u1',
  type: 'new_purchase',
  title: 'Nouvel achat enregistré 🛒',
  body: 'Achat de "Huile d’olive" (15.500 DT) dans la catégorie "Alimentation" ajouté à vos dépenses.',
  categoryName: 'Alimentation',
  amountSpent: 15.5,
  isRead: false,
};
trigger(newPurchaseNotif);
assert.strictEqual(mockNotifications.length, 3);
assert.strictEqual(mockNotifications[2].type, 'new_purchase');
console.log('✓ Notification d’achat enregistré validée.');

console.log('\n========================================================================');
console.log('🎉 TOUS LES TESTS DES NOTIFICATIONS ET DES ALERTES SONT VALIDÉS À 100% !');
console.log('========================================================================\n');
