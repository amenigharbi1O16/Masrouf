/**
 * FICHIER : src/utils/budgetReevaluation.ts
 * MODULE : Moteur de Réévaluation Automatique des Allocations Budgétaires Mensuelles
 *
 * MISSION DU MODULE :
 * Calcule et réévalue automatiquement les pourcentages d'allocation par défaut pour chaque
 * catégorie au début de chaque mois ou à chaque nouvelle période sélectionnée :
 * 1. Analyse la consommation réelle de chaque catégorie durant le mois précédent pour l'utilisateur spécifique.
 * 2. Intègre TOUTES les catégories de l'utilisateur sans aucune exception (catégories proposées
 *    par défaut, choisies parmi les suggestions ou créées manuellement).
 * 3. Individualisation stricte : chaque profil et utilisateur évolue selon ses propres habitudes.
 * 4. Plafond absolu : la somme de toutes les allocations ne dépasse jamais 100 % du budget mensuel.
 * 5. Conservation immuable de l'historique : les périodes précédentes ne sont jamais altérées.
 * 6. Distinction nette entre pourcentages alloués prévus et pourcentages de consommation réelle.
 */

import type { DB } from '@/state/types';
import { getExactMonthBounds, prevMonthISO, todayISO } from './format';

export interface CategoryAllocationResult {
  categoryId: string;
  categoryName: string;
  kind: 'product' | 'expense';
  allocatedPercent: number; // Pourcentage prévu réévalué (somme <= 100%)
  allocatedAmount: number;  // Montant en DT
  previousMonthSpent: number; // Consommation réelle du mois précédent
  previousMonthPercent: number; // Pourcentage réel du mois précédent
  isCustom?: boolean;
}

export interface ReevaluationSummary {
  periodStart: string;
  periodEnd: string;
  previousMonthStart: string;
  previousMonthEnd: string;
  totalBudget: number;
  totalAllocatedPercent: number;
  totalAllocatedAmount: number;
  allocations: CategoryAllocationResult[];
}

/**
 * Calcule les bornes exactes du mois précédent à partir d'une date ISO de début (AAAA-MM-JJ).
 */
export function getPreviousMonthBounds(dateIso: string): { start: string; end: string; monthKey: string } {
  const { start } = getExactMonthBounds(dateIso);
  const parts = start.split('-');
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10); // 1 to 12

  if (m === 1) {
    y -= 1;
    m = 12;
  } else {
    m -= 1;
  }

  const prevMonthStr = `${y}-${String(m).padStart(2, '0')}`;
  return getExactMonthBounds(`${prevMonthStr}-01`);
}

/**
 * Calcule la consommation réelle d'un utilisateur par catégorie sur une période donnée.
 */
export function computeUserCategorySpending(
  db: DB,
  userId: string,
  start: string,
  end: string
): { spentByCategory: Record<string, number>; totalSpent: number } {
  const spentByCategory: Record<string, number> = {};
  let totalSpent = 0;

  // 1. Achats de produits de l'utilisateur sur la période
  const userPurchases = (db.purchases || []).filter(
    (p) => p.userId === userId && p.date >= start && p.date <= end
  );
  for (const pur of userPurchases) {
    const prod = (db.products || []).find((pr) => pr.id === pur.productId);
    const catId = prod?.categoryId;
    if (catId) {
      spentByCategory[catId] = (spentByCategory[catId] || 0) + pur.price;
      totalSpent += pur.price;
    }
  }

  // 2. Dépenses directes de l'utilisateur sur la période
  const userExpenses = (db.expenses || []).filter(
    (e) => e.userId === userId && e.date >= start && e.date <= end
  );
  for (const exp of userExpenses) {
    const catId = exp.categoryId;
    if (catId) {
      spentByCategory[catId] = (spentByCategory[catId] || 0) + exp.amount;
      totalSpent += exp.amount;
    }
  }

  return { spentByCategory, totalSpent };
}

/**
 * MISSION PRINCIPALE : Réévaluer automatiquement les allocations budgétaires d'un utilisateur.
 *
 * @param db Instantané de la base de données
 * @param userId Identifiant de l'utilisateur ou profil (Parent, Enfant, Normal)
 * @param periodStart Date de début de la nouvelle période (AAAA-MM-JJ)
 * @param periodEnd Date de fin de la nouvelle période (AAAA-MM-JJ)
 * @param totalBudget Montant global du budget mensuel assigné (en DT)
 * @param categoryIds Identifiants des catégories actives suivies par l'utilisateur
 */
export function computeAutomatedBudgetAllocations(
  db: DB,
  userId: string,
  periodStart: string,
  periodEnd: string,
  totalBudget: number,
  categoryIds?: string[]
): ReevaluationSummary {
  const user = db.users.find((u) => u.id === userId);
  const activeCatIds = categoryIds && categoryIds.length > 0
    ? categoryIds
    : (user?.categoryIds || []);

  const { start: prevStart, end: prevEnd } = getPreviousMonthBounds(periodStart);

  // 1. Calcul de la consommation réelle du mois précédent pour cet utilisateur
  const { spentByCategory: prevSpentMap, totalSpent: prevTotalSpent } =
    computeUserCategorySpending(db, userId, prevStart, prevEnd);

  // 2. Récupération de toutes les catégories concernées (sans exclusion)
  const userCategories = db.categories.filter((c) => activeCatIds.includes(c.id) && c.active);

  if (userCategories.length === 0) {
    return {
      periodStart,
      periodEnd,
      previousMonthStart: prevStart,
      previousMonthEnd: prevEnd,
      totalBudget,
      totalAllocatedPercent: 0,
      totalAllocatedAmount: 0,
      allocations: [],
    };
  }

  const rawAllocations: Array<{
    cat: typeof userCategories[0];
    prevSpent: number;
    prevPct: number;
    targetPct: number;
  }> = [];

  // 3. Détermination des pourcentages cibles selon qu'il y a eu des dépenses le mois précédent ou non
  if (prevTotalSpent > 0) {
    // Il y a eu une consommation réelle le mois passé : adaptation automatique
    for (const cat of userCategories) {
      const prevSpent = prevSpentMap[cat.id] || 0;
      const prevPct = Math.round((prevSpent / prevTotalSpent) * 100);

      // Si la catégorie a été consommée le mois dernier, son allocation reflète son poids réel
      // Si elle n'a pas été consommée, on lui conserve une part socle (default percent ou 2%)
      const defaultPct = db.defaultPercentages[cat.id] || 2;
      const targetPct = prevSpent > 0 ? (prevSpent / prevTotalSpent) * 100 : Math.min(defaultPct, 2);

      rawAllocations.push({
        cat,
        prevSpent,
        prevPct,
        targetPct,
      });
    }
  } else {
    // Premier mois ou aucune dépense le mois passé : utilisation des pourcentages par défaut
    for (const cat of userCategories) {
      const defaultPct = db.defaultPercentages[cat.id] || (cat.isCustom ? 5 : 5);
      rawAllocations.push({
        cat,
        prevSpent: 0,
        prevPct: 0,
        targetPct: defaultPct,
      });
    }
  }

  // 4. Normalisation proportionnelle pour garantir que le budget est intégralement réparti à 100%
  const sumRawTarget = rawAllocations.reduce((acc, item) => acc + item.targetPct, 0);
  const normalizedAllocations: CategoryAllocationResult[] = [];

  let accumulatedPercent = 0;
  let accumulatedAmount = 0;

  for (let i = 0; i < rawAllocations.length; i++) {
    const item = rawAllocations[i];
    const isLast = i === rawAllocations.length - 1;

    let finalPct = 0;
    let allocatedAmount = 0;

    if (isLast) {
      // La dernière catégorie absorbe les arrondis pour garantir exactement 100% et totalBudget au millime près
      finalPct = Math.max(0, 100 - accumulatedPercent);
      allocatedAmount = totalBudget > 0
        ? Math.max(0, Math.round((totalBudget - accumulatedAmount) * 1000) / 1000)
        : 0;
    } else {
      const weight = sumRawTarget > 0 ? item.targetPct / sumRawTarget : 1 / rawAllocations.length;
      finalPct = Math.round(weight * 100);
      allocatedAmount = totalBudget > 0
        ? Math.round(totalBudget * weight * 1000) / 1000
        : 0;
      accumulatedPercent += finalPct;
      accumulatedAmount += allocatedAmount;
    }

    normalizedAllocations.push({
      categoryId: item.cat.id,
      categoryName: item.cat.name,
      kind: item.cat.kind,
      allocatedPercent: finalPct,
      allocatedAmount,
      previousMonthSpent: item.prevSpent,
      previousMonthPercent: item.prevPct,
      isCustom: item.cat.isCustom,
    });
  }

  const totalAllocatedPercent = normalizedAllocations.reduce((acc, a) => acc + a.allocatedPercent, 0);
  const totalAllocatedAmount = normalizedAllocations.reduce((acc, a) => acc + a.allocatedAmount, 0);

  return {
    periodStart,
    periodEnd,
    previousMonthStart: prevStart,
    previousMonthEnd: prevEnd,
    totalBudget,
    totalAllocatedPercent,
    totalAllocatedAmount: Math.round(totalAllocatedAmount * 1000) / 1000,
    allocations: normalizedAllocations,
  };
}

/**
 * Valide qu'un dictionnaire d'allocations par catégorie ne dépasse pas 100% du budget.
 */
export function validateAllocationsCap(
  percentages: Record<string, number>
): { valid: boolean; totalPercent: number; excess: number } {
  const total = Object.values(percentages).reduce((sum, p) => sum + (Number(p) || 0), 0);
  const rounded = Math.round(total * 10) / 10;
  return {
    valid: rounded <= 100,
    totalPercent: rounded,
    excess: Math.max(0, rounded - 100),
  };
}
