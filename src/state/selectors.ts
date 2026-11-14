import { addDays, daysBetween, parseISO, todayISO, unitPrice } from '@/utils/format';
import type { Budget, DB, Expense, Product, Purchase, User } from './types';

export const inRange = (date: string, start: string, end: string) => date >= start && date <= end;

export function userBudgets(db: DB, userId: string): Budget[] {
  return db.budgets.filter((b) => b.userId === userId).sort((a, b) => (a.start < b.start ? -1 : 1));
}

/** Budget covering today (or null). */
export function currentBudget(db: DB, userId: string, today = todayISO()): Budget | null {
  return userBudgets(db, userId).find((b) => inRange(today, b.start, b.end)) ?? null;
}

export function productOf(db: DB, id?: string): Product | undefined {
  return db.products.find((p) => p.id === id);
}
export const categoryName = (db: DB, id: string) => db.categories.find((c) => c.id === id)?.name ?? 'Unknown';

export function purchaseCategory(db: DB, p: Purchase): string {
  return productOf(db, p.productId)?.categoryId ?? '';
}

export interface Txn {
  kind: 'purchase' | 'expense';
  id: string;
  date: string;
  amount: number;
  categoryId: string;
  title: string;
  detail: string;
}

export function userTxns(db: DB, userId: string): Txn[] {
  const out: Txn[] = [];
  for (const p of db.purchases.filter((x) => x.userId === userId)) {
    const prod = productOf(db, p.productId);
    out.push({ kind: 'purchase', id: p.id, date: p.date, amount: p.price, categoryId: prod?.categoryId ?? '', title: `${prod?.name ?? 'Product'} · ${p.quantity} ${p.unit}`, detail: p.store });
  }
  for (const e of db.expenses.filter((x) => x.userId === userId)) {
    out.push({ kind: 'expense', id: e.id, date: e.date, amount: e.amount, categoryId: e.categoryId, title: categoryName(db, e.categoryId), detail: e.note });
  }
  return out.sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1));
}

/** Spending per category between two dates. excludeId lets us ignore a transaction being edited. */
export function spentByCategory(db: DB, userId: string, start: string, end: string, excludeId?: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of userTxns(db, userId)) {
    if (t.id === excludeId || !inRange(t.date, start, end)) continue;
    out[t.categoryId] = (out[t.categoryId] ?? 0) + t.amount;
  }
  return out;
}
export const totalSpent = (byCat: Record<string, number>) => Object.values(byCat).reduce((a, b) => a + b, 0);

export type BudgetStatus = 'healthy' | 'warning' | 'exceeded';
export interface BudgetSummary {
  spent: number; total: number; left: number; over: number; pct: number; status: BudgetStatus;
  byCat: Record<string, number>;
}
export function summarize(db: DB, userId: string, b: Budget): BudgetSummary {
  const byCat = spentByCategory(db, userId, b.start, b.end);
  const spent = totalSpent(byCat);
  const pct = b.total > 0 ? (spent / b.total) * 100 : 0;
  const status: BudgetStatus = spent > b.total ? 'exceeded' : pct >= 80 ? 'warning' : 'healthy';
  return { spent, total: b.total, left: Math.max(0, b.total - spent), over: Math.max(0, spent - b.total), pct, status, byCat };
}

export const allocated = (b: { allocations: Record<string, number> }) => Object.values(b.allocations).reduce((a, c) => a + c, 0);

// ---------- products & prices ----------
export function productPurchases(db: DB, productId: string): Purchase[] {
  return db.purchases.filter((p) => p.productId === productId).sort((a, b) => (a.date === b.date ? (a.id < b.id ? -1 : 1) : a.date < b.date ? -1 : 1));
}
export const unitOf = (p: Purchase) => unitPrice(p.price, p.quantity);

export interface PriceChange { diff: number; pct: number; direction: 'down' | 'up' | 'same' }
export function priceChange(previous: number, next: number): PriceChange {
  const diff = next - previous;
  const pct = previous > 0 ? (diff / previous) * 100 : 0;
  return { diff, pct, direction: Math.abs(diff) < 0.0005 ? 'same' : diff < 0 ? 'down' : 'up' };
}

/** Latest earlier purchase of the same product with the same unit. */
export function previousPurchase(db: DB, productId: string, date: string, unit: string, excludeId?: string): Purchase | null {
  const list = productPurchases(db, productId).filter((p) => p.id !== excludeId && p.unit === unit && p.date <= date);
  return list.length ? list[list.length - 1] : null;
}

// ---------- calendar & analytics ----------
export function monthlySpend(db: DB, userId: string, year: number): number[] {
  const out = Array(12).fill(0) as number[];
  for (const t of userTxns(db, userId)) {
    const d = parseISO(t.date);
    if (d.getUTCFullYear() === year) out[d.getUTCMonth()] += t.amount;
  }
  return out;
}

export function budgetsOverlapping(db: DB, userId: string, start: string, end: string): Budget[] {
  return userBudgets(db, userId).filter((b) => b.start <= end && b.end >= start);
}

export function previousWindow(b: Budget): { start: string; end: string } {
  const len = daysBetween(b.start, b.end);
  return { start: addDays(b.start, -len), end: addDays(b.start, -1) };
}

// ---------- points ----------
export interface PeriodResult { budget: Budget; success: boolean; points: number; bonus: number }
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
      pts = r.periodReward; streak += 1; best = Math.max(best, streak);
      if (r.streakLength > 0 && streak % r.streakLength === 0) bonus = r.streakBonus;
    } else streak = 0;
    total += pts + bonus;
    periods.push({ budget: b, success, points: pts, bonus });
  }
  const level = total >= r.expertAt ? 'Expert' : total >= r.saverAt ? 'Saver' : 'Beginner';
  const next = level === 'Beginner' ? { name: 'Saver', at: r.saverAt } : level === 'Saver' ? { name: 'Expert', at: r.expertAt } : null;
  return { total, streak, best, level, next, periods };
}
export type { Expense };
