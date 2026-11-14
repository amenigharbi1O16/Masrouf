export type Role = 'user' | 'admin';
export type CategoryKind = 'product' | 'expense';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  onboarded: boolean;
  categoryIds: string[];
  celebratedBudgetIds: string[];
  createdAt: string;
  langue?: string;
}
export interface Category { id: string; name: string; kind: CategoryKind; active: boolean }
export interface Budget {
  id: string;
  userId: string;
  start: string; // YYYY-MM-DD
  end: string;
  total: number;
  allocations: Record<string, number>; // categoryId -> amount
}
export interface Product {
  id: string;
  userId: string;
  name: string;
  brand: string;
  categoryId: string;
  unit: string;
  photo?: string;
}
export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  price: number; // total price paid
  quantity: number;
  unit: string;
  store: string;
  date: string;
}
export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  amount: number;
  note: string;
  date: string;
}
export interface CategoryType { kind: CategoryKind; label: string; description: string }
export interface PointsRules {
  periodReward: number;
  streakLength: number;
  streakBonus: number;
  saverAt: number;
  expertAt: number;
}
export interface AppSettings { allowRegistration: boolean }

export interface DB {
  users: User[];
  categories: Category[];
  categoryTypes: CategoryType[];
  defaultPercentages: Record<string, number>;
  pointsRules: PointsRules;
  settings: AppSettings;
  budgets: Budget[];
  products: Product[];
  purchases: Purchase[];
  expenses: Expense[];
  sessionUserId: string | null;
}

export interface Result { ok: boolean; error?: string }
