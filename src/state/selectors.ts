// ============================================================
// FICHIER : src/state/selectors.ts
// RÔLE    : Fonctions pures de sélection, de calcul et de projection
//           dérivées à partir de l'état global Masrouf (DB).
//
// CONCEPTS CLÉS :
//   1. Sélecteurs purs sans effet de bord :
//      Toutes les fonctions prennent l'objet `DB` en premier argument
//      et renvoient des données calculées sans jamais modifier l'état.
//
//   2. Calculs budgétaires :
//      - `summarize` : calcule le montant total dépensé, le restant, le dépassement
//        et le statut ('healthy', 'warning', 'exceeded') pour un budget donné.
//      - `spentByCategory` : ventile les achats et dépenses d'une période par catégorie.
//
//   3. Suivi des prix et de l'inflation personnelle :
//      - `unitPrice` / `priceChange` : compare le prix unitaire d'un achat avec l'achat
//        précédent du même produit pour déterminer si le prix monte, baisse ou stagne.
//
//   4. Moteur de gamification et récompenses :
//      - `pointsFor` : calcule les points accumulés, les séries consécutives (streaks),
//        les paliers de badges ('Beginner', 'Saver', 'Expert') et l'historique des périodes.
// ============================================================

import { addDays, daysBetween, parseISO, todayISO, unitPrice } from '@/utils/format';
import type { Budget, DB, Expense, Product, Purchase, User } from './types';

/**
 * Vérifie si une date ISO (`YYYY-MM-DD`) est comprise dans un intervalle fermé `[start, end]`.
 */
export const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

/**
 * Retourne la liste chronologique (triée par date de début croissante) des budgets d'un utilisateur.
 * @param db Instantané de la base de données.
 * @param userId Identifiant de l'utilisateur.
 */
export function userBudgets(db: DB, userId: string): Budget[] {
  return db.budgets.filter((b) => b.userId === userId).sort((a, b) => (a.start < b.start ? -1 : 1));
}

/**
 * Recherche et retourne le budget en cours couvrant la date du jour (ou une date donnée).
 * Renvoie `null` si aucune période active n'est définie.
 * @param db Instantané de la base.
 * @param userId Identifiant de l'utilisateur.
 * @param today Date du jour au format ISO.
 */
export function currentBudget(db: DB, userId: string, today = todayISO()): Budget | null {
  return userBudgets(db, userId).find((b) => inRange(today, b.start, b.end)) ?? null;
}

/**
 * Retrouve un produit par son identifiant unique.
 */
export function productOf(db: DB, id?: string): Product | undefined {
  return db.products.find((p) => p.id === id);
}

/**
 * Retourne le nom d'une catégorie par son identifiant, ou 'Unknown' si non trouvée.
 */
export const categoryName = (db: DB, id: string) => db.categories.find((c) => c.id === id)?.name ?? 'Unknown';

/**
 * Retourne l'identifiant de la catégorie rattachée au produit acheté.
 */
export function purchaseCategory(db: DB, p: Purchase): string {
  return productOf(db, p.productId)?.categoryId ?? '';
}

/**
 * Interface unifiée d'une transaction financière (achat au détail ou dépense directe).
 * Permet d'alimenter les listes d'activités récentes, les filtres et les graphiques.
 */
export interface Txn {
  kind: 'purchase' | 'expense';
  id: string;
  date: string;
  amount: number;
  categoryId: string;
  title: string;
  detail: string;
}

/**
 * Construit et trie chronologiquement (de la plus récente à la plus ancienne)
 * toutes les transactions (achats et dépenses directes) d'un utilisateur donné.
 * @param db Instantané de la base.
 * @param userId Identifiant de l'utilisateur.
 */
export function userTxns(db: DB, userId: string): Txn[] {
  const out: Txn[] = [];
  for (const p of db.purchases.filter((x) => x.userId === userId)) {
    const prod = productOf(db, p.productId);
    out.push({
      kind: 'purchase',
      id: p.id,
      date: p.date,
      amount: p.price,
      categoryId: prod?.categoryId ?? '',
      title: `${prod?.name ?? 'Product'} · ${p.quantity} ${p.unit}`,
      detail: p.store,
    });
  }
  for (const e of db.expenses.filter((x) => x.userId === userId)) {
    out.push({
      kind: 'expense',
      id: e.id,
      date: e.date,
      amount: e.amount,
      categoryId: e.categoryId,
      title: categoryName(db, e.categoryId),
      detail: e.note,
    });
  }
  return out.sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
}

/**
 * Calcule la somme dépensée par catégorie entre deux dates données.
 * Le paramètre optionnel `excludeId` permet d'ignorer la transaction en cours de modification.
 * @param db Instantané de la base.
 * @param userId Identifiant de l'utilisateur.
 * @param start Date de début ISO.
 * @param end Date de fin ISO.
 * @param excludeId Identifiant d'une transaction à exclure des totaux.
 */
export function spentByCategory(db: DB, userId: string, start: string, end: string, excludeId?: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of userTxns(db, userId)) {
    if (t.id === excludeId || !inRange(t.date, start, end)) continue;
    out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount;
  }
  return out;
}

/**
 * Calcule le total général de dépenses à partir d'un dictionnaire de répartition par catégorie.
 */
export const totalSpent = (byCat: Record<string, number>) => Object.values(byCat).reduce((a, b) => a + b, 0);

/** Statut visuel de santé budgétaire */
export type BudgetStatus = 'healthy' | 'warning' | 'exceeded';

/**
 * Synthèse complète de la consommation d'un budget.
 */
export interface BudgetSummary {
  spent: number;
  total: number;
  left: number;
  over: number;
  pct: number;
  status: BudgetStatus;
  byCat: Record<string, number>;
}

/**
 * Synthétise l'état d'un budget de période :
 * - Dépenses totales réelles
 * - Pourcentage de consommation
 * - Reste à dépenser ou dépassement
 * - Statut visuel : 'healthy' (<80%), 'warning' (80%-100%), 'exceeded' (>100%)
 */
export function summarize(db: DB, userId: string, b: Budget): BudgetSummary {
  const byCat = spentByCategory(db, userId, b.start, b.end);
  const spent = totalSpent(byCat);
  const pct = b.total > 0 ? (spent / b.total) * 100 : 0;
  const status: BudgetStatus = spent > b.total ? 'exceeded' : pct >= 80 ? 'warning' : 'healthy';
  return {
    spent,
    total: b.total,
    left: Math.max(0, b.total - spent),
    over: Math.max(0, spent - b.total),
    pct,
    status,
    byCat,
  };
}

/**
 * Calcule la somme de toutes les enveloppes allouées aux catégories dans un budget.
 */
export const allocated = (b: { allocations: Record<string, number> }) => Object.values(b.allocations).reduce((a, c) => a + c, 0);

// ------------------------------------------------------------
// SUIVI DES PRODUITS ET ÉVOLUTION DES PRIX UNITAIRES
// ------------------------------------------------------------

/**
 * MISSION DE LA FONCTION : productPurchases
 *   Retourne la liste ordonnée et consolidée de tous les achats enregistrés pour un produit donné.
 * RÔLE DANS L'APPLICATION :
 *   Rassemble tous les tickets de caisse rattachés au produit ou à toute entrée partageant
 *   le même nom de produit (insensible à la casse et aux espaces).
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Alimente la courbe d'évolution du prix, le calcul de la variation (différence en DT et %),
 *   l'historique complet des achats et les totaux cumulés sur la fiche de détails et l'historique.
 */
export function productPurchases(db: DB, productId: string): Purchase[] {
  // Recherche du produit correspondant à l'identifiant demandé
  const prod = db.products.find((p) => p.id === productId);
  // Si le produit n'est pas trouvé dans la base
  if (!prod) {
    // Filtrage simple de secours sur l'identifiant exact
    return db.purchases
      .filter((p) => p.productId === productId)
      .sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1));
  }

  // Normalisation du nom de l'article pour comparaison insensible à la casse
  const normName = prod.name.trim().toLowerCase();
  // Recherche de tous les identifiants de produits partageant le même nom normalisé pour cet utilisateur
  const matchingProductIds = new Set(
    db.products
      .filter((p) => (p.userId === prod.userId || !p.userId) && p.name.trim().toLowerCase() === normName)
      .map((p) => p.id)
  );
  // Ajout garanti de l'identifiant passé en paramètre
  matchingProductIds.add(productId);

  // Extraction et tri chronologique de tous les achats correspondant à ce produit consolidé
  return db.purchases
    .filter((p) => matchingProductIds.has(p.productId))
    .sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1));
}

/**
 * Calcule le prix unitaire d'un achat (prix total / quantité).
 */
export const unitOf = (p: Purchase) => unitPrice(p.price, p.quantity);

/**
 * Évolution du prix : différence en dinars, pourcentage relatif et direction visuelle.
 */
export interface PriceChange {
  diff: number;
  pct: number;
  direction: 'down' | 'up' | 'same';
}

/**
 * Calcule l'écart et la direction d'évolution entre deux prix consécutifs.
 * @param previous Prix antérieur.
 * @param next Prix actuel.
 */
export function priceChange(previous: number, next: number): PriceChange {
  const diff = next - previous;
  const pct = previous > 0 ? (diff / previous) * 100 : 0;
  return {
    diff,
    pct,
    direction: Math.abs(diff) < 0.0005 ? 'same' : diff < 0 ? 'down' : 'up',
  };
}

/**
 * Retrouve l'achat antérieur le plus récent du même produit avec la même unité de mesure.
 * @param db Instantané de la base.
 * @param productId Identifiant du produit.
 * @param date Date de référence.
 * @param unit Unité de mesure (ex: 'kg', 'L', 'pc').
 * @param excludeId Identifiant d'achat à ignorer (ex: achat en cours d'édition).
 */
export function previousPurchase(db: DB, productId: string, date: string, unit: string, excludeId?: string): Purchase | null {
  const list = productPurchases(db, productId).filter((p) => p.id !== excludeId && p.unit === unit && p.date <= date);
  return list.length ? list[list.length - 1] : null;
}

// ------------------------------------------------------------
// ANALYSES ET VUES CALENDAIRES
// ------------------------------------------------------------

/**
 * Calcule la distribution des dépenses de l'utilisateur sur les 12 mois d'une année civile.
 * Retourne un tableau de 12 nombres représentant les dépenses mensuelles en DT.
 */
export function monthlySpend(db: DB, userId: string, year: number): number[] {
  const out = Array(12).fill(0) as number[];
  for (const t of userTxns(db, userId)) {
    const d = parseISO(t.date);
    if (d.getUTCFullYear() === year) out[d.getUTCMonth()] += t.amount;
  }
  return out;
}

/**
 * Trouve tous les budgets d'un utilisateur dont la période chevauche un intervalle donné.
 */
export function budgetsOverlapping(db: DB, userId: string, start: string, end: string): Budget[] {
  return userBudgets(db, userId).filter((b) => b.start <= end && b.end >= start);
}

/**
 * Calcule la fenêtre temporelle précédente de même durée qu'un budget donné
 * pour permettre la comparaison de consommation d'une période à l'autre.
 */
export function previousWindow(b: Budget): { start: string; end: string } {
  const len = daysBetween(b.start, b.end);
  return { start: addDays(b.start, -len), end: addDays(b.start, -1) };
}

// ------------------------------------------------------------
// MOTEUR DE GAMIFICATION : POINTS, SÉRIES ET BADGES
// ------------------------------------------------------------

/** Résultat d'une période clôturée */
export interface PeriodResult {
  budget: Budget;
  success: boolean;
  points: number;
  bonus: number;
}

/**
 * Calcule le bilan de gamification d'un utilisateur :
 * - Points cumulés sur chaque période respectée
 * - Série consécutive en cours (`streak`)
 * - Meilleure série historique (`best`)
 * - Niveau actuel ('Beginner', 'Saver', 'Expert')
 * - Prochain objectif et points requis
 * - Détail de chaque période passée
 * 
 * Règles appliquées :
 * - Période réussie (dépenses <= budget alloué) : +periodReward points, streak + 1.
 * - Tous les N succès consécutifs (streakLength) : +streakBonus points de fidélité.
 * - Période échouée (dépenses > budget alloué) : 0 point, streak réinitialisée à 0.
 */
export function pointsFor(db: DB, user: User, today = todayISO()) {
  const r = db.pointsRules;
  const ended = userBudgets(db, user.id).filter((b) => b.end < today);
  let total = 0, streak = 0, best = 0;
  const periods: PeriodResult[] = [];

  for (const b of ended) {
    const s = summarize(db, user.id, b);
    const success = s.spent <= b.total;
    let pts = 0, bonus = 0;
    if (success) {
      pts = r.periodReward;
      streak += 1;
      best = Math.max(best, streak);
      if (r.streakLength > 0 && streak % r.streakLength === 0) {
        bonus = r.streakBonus;
      }
    } else {
      streak = 0;
    }
    total += pts + bonus;
    periods.push({ budget: b, success, points: pts, bonus });
  }

  const level = total >= r.expertAt ? 'Expert' : total >= r.saverAt ? 'Saver' : 'Beginner';
  const next = level === 'Beginner' ? { name: 'Saver', at: r.saverAt } : level === 'Saver' ? { name: 'Expert', at: r.expertAt } : null;

  return { total, streak, best, level, next, periods };
}

export type { Expense };
