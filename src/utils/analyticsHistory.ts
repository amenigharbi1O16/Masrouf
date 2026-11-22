/**
 * FICHIER : src/utils/analyticsHistory.ts
 * RÔLE    : Génération et calcul des données historiques réelles sur 6 mois
 *           pour le graphique de comparaison mensuelle "Pill Bar Chart"
 *           adapté aux trois profils : Parent, Enfant et Utilisateur normal.
 */

import type { DB } from '@/state/types';
import { monthShort, monthShortLocale } from './format';

export interface PillBarChartItem {
  key: string; // ex: "2026-11"
  label: string; // ex: "nov. 2026"
  shortLabel: string; // ex: "Nov" / "Juin"
  start: string; // ex: "2026-11-01"
  end: string; // ex: "2026-11-30"
  spent: number; // Montant total dépensé
  allocated: number; // Montant alloué (budget)
  remaining: number; // Reste disponible
  pct: number; // Taux de consommation (%)
  isCurrent: boolean; // Période active courante
}

/**
 * Génère la liste chronologique des 6 derniers mois civils se terminant au mois de référence.
 */
export function generatePast6Months(
  endMonthKey: string,
  lang: 'fr' | 'ar' | 'en' = 'fr'
): { key: string; label: string; shortLabel: string; start: string; end: string }[] {
  const list: {
    key: string;
    label: string;
    shortLabel: string;
    start: string;
    end: string;
  }[] = [];

  const [curYear, curMonth] = endMonthKey.split('-').map(Number);

  for (let i = 0; i < 6; i++) {
    const d = new Date(curYear, curMonth - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const lastDay = new Date(y, m, 0).getDate();
    const start = `${key}-01`;
    const end = `${key}-${String(lastDay).padStart(2, '0')}`;

    const monthIdx = d.getMonth();
    let shortLabel = '';
    if (lang === 'en') {
      shortLabel = monthShort(monthIdx);
    } else if (lang === 'ar') {
      shortLabel = monthShortLocale(monthIdx, 'ar');
    } else {
      const frShort = monthShortLocale(monthIdx, 'fr').replace('.', '');
      shortLabel = frShort.charAt(0).toUpperCase() + frShort.slice(1);
    }

    let label = key;
    try {
      const monthFormatter = new Intl.DateTimeFormat(
        lang === 'ar' ? 'ar-TN' : lang === 'en' ? 'en-US' : 'fr-FR',
        { month: 'short', year: 'numeric' }
      );
      label = monthFormatter.format(d);
    } catch {
      label = key;
    }

    list.push({ key, label, shortLabel, start, end });
  }

  return list.reverse();
}

/**
 * PROFIL PARENT : Historique consolidé des dépenses globales du parent sur 6 mois
 * Inclut : Achats de produits + Dépenses directes + Montants alloués / transférés aux enfants
 */
export function getParentTotalMonthlyHistory(
  db: DB,
  parentId: string,
  endMonthKey: string,
  lang: 'fr' | 'ar' | 'en' = 'fr'
): PillBarChartItem[] {
  const months = generatePast6Months(endMonthKey, lang);

  return months.map((m) => {
    // 1. Dépenses directes du parent
    const parentExpenses = db.expenses.filter(
      (e) => e.userId === parentId && e.date >= m.start && e.date <= m.end
    );
    const expSum = parentExpenses.reduce((s, e) => s + e.amount, 0);

    // 2. Achats de produits du parent
    const purSum = db.purchases
      .filter((p) => p.userId === parentId && p.date >= m.start && p.date <= m.end)
      .reduce((s, p) => s + p.price, 0);

    // 3. Allocations et transferts aux enfants dans cette période
    const allocs = db.allocations.filter(
      (a) => a.parentId === parentId && a.date >= m.start && a.date <= m.end
    );
    // Évite tout double comptage si l'allocation a déjà généré une dépense parente dans SQLite
    const orphanAllocs = allocs.filter(
      (a) =>
        !parentExpenses.some(
          (e) => Math.abs(e.amount - a.amount) < 0.001 && e.date === a.date
        )
    );
    const orphanAllocSum = orphanAllocs.reduce((s, a) => s + a.amount, 0);

    // Total dépensé unique consolidé du parent
    const spent = expSum + purSum + orphanAllocSum;

    // Budget global du parent / foyer pour le mois
    const b = db.budgets.find(
      (bg) => bg.userId === parentId && bg.start.slice(0, 7) === m.key
    );
    const fb = db.familyBudgets.find(
      (f) => f.parentId === parentId && (f.month === m.key || f.start === m.start)
    );
    const allocated = b?.total || fb?.totalBudget || fb?.total || 0;
    const remaining = Math.max(0, allocated - spent);
    const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

    return {
      key: m.key,
      label: m.label,
      shortLabel: m.shortLabel,
      start: m.start,
      end: m.end,
      spent,
      allocated,
      remaining,
      pct,
      isCurrent: m.key === endMonthKey,
    };
  });
}

/**
 * PROFIL ENFANT : Historique personnel de consommation d'un enfant sur 6 mois
 * Basé sur son budget personnel alloué et ses achats/dépenses réels
 */
export function getChildMonthlyHistory(
  db: DB,
  childId: string,
  endMonthKey: string,
  lang: 'fr' | 'ar' | 'en' = 'fr'
): PillBarChartItem[] {
  const months = generatePast6Months(endMonthKey, lang);
  const child = db.users.find((u) => u.id === childId);

  return months.map((m) => {
    // 1. Dépenses directes de l'enfant
    const expSum = db.expenses
      .filter((e) => e.userId === childId && e.date >= m.start && e.date <= m.end)
      .reduce((s, e) => s + e.amount, 0);

    // 2. Achats personnels de l'enfant
    const purSum = db.purchases
      .filter((p) => p.userId === childId && p.date >= m.start && p.date <= m.end)
      .reduce((s, p) => s + p.price, 0);

    const spent = expSum + purSum;

    // 3. Budget alloué pour ce mois
    const b = db.budgets.find(
      (bg) => bg.userId === childId && bg.start.slice(0, 7) === m.key
    );
    const allocs = db.allocations
      .filter((a) => a.childId === childId && a.date >= m.start && a.date <= m.end)
      .reduce((s, a) => s + a.amount, 0);

    let allocated = b?.total || allocs;
    if (allocated === 0 && m.key === endMonthKey && child) {
      allocated = child.allocatedTotal || child.balance || 0;
    }

    const remaining = Math.max(0, allocated - spent);
    const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

    return {
      key: m.key,
      label: m.label,
      shortLabel: m.shortLabel,
      start: m.start,
      end: m.end,
      spent,
      allocated,
      remaining,
      pct,
      isCurrent: m.key === endMonthKey,
    };
  });
}

/**
 * PROFIL UTILISATEUR NORMAL : Historique personnel de consommation sur 6 mois
 * Basé sur les achats, dépenses et budget personnel du compte individuel
 */
export function getUserMonthlyHistory(
  db: DB,
  userId: string,
  endMonthKey: string,
  lang: 'fr' | 'ar' | 'en' = 'fr'
): PillBarChartItem[] {
  const months = generatePast6Months(endMonthKey, lang);

  return months.map((m) => {
    // 1. Dépenses directes
    const expSum = db.expenses
      .filter((e) => e.userId === userId && e.date >= m.start && e.date <= m.end)
      .reduce((s, e) => s + e.amount, 0);

    // 2. Achats de produits
    const purSum = db.purchases
      .filter((p) => p.userId === userId && p.date >= m.start && p.date <= m.end)
      .reduce((s, p) => s + p.price, 0);

    const spent = expSum + purSum;

    // 3. Budget mensuel personnel
    const b = db.budgets.find(
      (bg) => bg.userId === userId && bg.start.slice(0, 7) === m.key
    );
    const allocated = b?.total || 0;
    const remaining = Math.max(0, allocated - spent);
    const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

    return {
      key: m.key,
      label: m.label,
      shortLabel: m.shortLabel,
      start: m.start,
      end: m.end,
      spent,
      allocated,
      remaining,
      pct,
      isCurrent: m.key === endMonthKey,
    };
  });
}
