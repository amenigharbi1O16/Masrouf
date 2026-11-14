import { db, initDatabase } from '@/db/database';
import type { AppSettings, Budget, Category, CategoryType, DB, Expense, PointsRules, Product, Purchase, User } from './types';
import { hashPassword } from '@/utils/security';
import { todayISO, uid } from '@/utils/format';

export async function loadDBFromSQLite(): Promise<DB> {
  // Initialise les tables et migrations SQLite locales
  try {
    initDatabase();
  } catch (err) {
    console.warn('initDatabase notice:', err);
  }

  // 1. Catégories
  let catRows = db.getAllSync<{
    id: number;
    name_key: string;
    type: string;
    icon: string;
    default_percent: number;
    is_active: number;
  }>('SELECT id, name_key, type, icon, default_percent, is_active FROM category');

  // Si la table category est vide, on injecte les catégories de la maquette Figma
  if (catRows.length === 0) {
    const SEED_CATS = [
      ['food', 'Food', 'product', '🥦', 33],
      ['clothing', 'Clothing and shoes', 'product', '👕', 4],
      ['personal-care', 'Personal care', 'product', '🧴', 4],
      ['home', 'Home and equipment', 'product', '🛋️', 5],
      ['computer', 'Computer equipment', 'product', '💻', 3],
      ['health', 'Health and medicines', 'product', '💊', 5],
      ['transport', 'Transport', 'expense', '🚗', 10],
      ['bills', 'Bills', 'expense', '🧾', 14],
      ['education', 'Education', 'expense', '🎓', 4],
      ['entertainment', 'Entertainment', 'expense', '🎟️', 5],
      ['children', 'Children', 'expense', '🧸', 3],
      ['family', 'Family support', 'expense', '🤝', 3],
      ['savings', 'Savings', 'expense', '💰', 4],
      ['donations', 'Donations', 'expense', '❤️', 1],
      ['bank-fees', 'Bank fees', 'expense', '🏦', 1],
      ['other', 'Other', 'expense', '📦', 1],
    ] as const;

    for (const [idKey, name, type, icon, defPct] of SEED_CATS) {
      db.runSync(
        'INSERT OR IGNORE INTO category (name_key, type, icon, default_percent, is_default, is_active) VALUES (?, ?, ?, ?, 1, 1)',
        [name, type, icon, defPct]
      );
    }

    catRows = db.getAllSync('SELECT id, name_key, type, icon, default_percent, is_active FROM category');
  }

  const categories: Category[] = catRows.map((r) => ({
    id: String(r.id),
    name: r.name_key,
    kind: r.type as 'product' | 'expense',
    active: r.is_active === 1,
  }));

  const defaultPercentages = Object.fromEntries(
    catRows.map((r) => [String(r.id), r.default_percent || 0])
  );

  // 2. Utilisateurs
  let userRows = db.getAllSync<{
    id: number;
    name: string;
    email: string;
    password_hash: string;
    role: string;
    is_active: number;
    must_change_password: number;
    onboarding_done: number;
    created_at: string;
    langue: string;
  }>('SELECT id, name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue FROM user');

  if (userRows.length === 0) {
    const adminPw = await hashPassword('Admin2026');
    const userPw = await hashPassword('Masrouf2026');
    db.runSync(
      'INSERT INTO user (name, email, password_hash, role, is_active, onboarding_done) VALUES (?, ?, ?, ?, 1, 1)',
      ['Administrator', 'admin@masrouf.tn', adminPw, 'admin']
    );
    db.runSync(
      'INSERT INTO user (name, email, password_hash, role, is_active, onboarding_done) VALUES (?, ?, ?, ?, 1, 1)',
      ['Ines Ben Ali', 'ines.benali@email.tn', userPw, 'user']
    );
    db.runSync(
      'INSERT INTO user (name, email, password_hash, role, is_active, onboarding_done) VALUES (?, ?, ?, ?, 1, 1)',
      ['Utilisateur Test', 'user@masrouf.tn', userPw, 'user']
    );
    userRows = db.getAllSync('SELECT id, name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue FROM user');
  }

  const users: User[] = userRows.map((u) => {
    // Récupérer les catégories actives de l'utilisateur
    const uCatRows = db.getAllSync<{ category_id: number }>(
      'SELECT category_id FROM user_category WHERE user_id = ? AND enabled = 1',
      [u.id]
    );
    return {
      id: String(u.id),
      name: u.name,
      email: u.email,
      passwordHash: u.password_hash,
      role: (u.role === 'admin' ? 'admin' : 'user'),
      active: u.is_active === 1,
      mustChangePassword: u.must_change_password === 1,
      onboarded: u.onboarding_done === 1,
      categoryIds: uCatRows.map((c) => String(c.category_id)),
      celebratedBudgetIds: [],
      createdAt: u.created_at || todayISO(),
      langue: u.langue || 'fr',
    };
  });

  // 3. Budgets
  let budgets: Budget[] = [];
  try {
    const budgetRows = db.getAllSync<{
      id: number;
      user_id: number;
      start_date?: string;
      end_date?: string;
      month?: string;
      total: number;
    }>('SELECT * FROM budget');

    for (const b of budgetRows) {
      const start = b.start_date || (b.month ? `${b.month}-01` : todayISO());
      const end = b.end_date || (b.month ? `${b.month}-28` : todayISO());
      const allocRows = db.getAllSync<{ category_id: number; amount: number }>(
        'SELECT category_id, amount FROM category_budget WHERE user_id = ?',
        [b.user_id]
      );
      const allocations: Record<string, number> = {};
      for (const a of allocRows) {
        allocations[String(a.category_id)] = a.amount;
      }
      budgets.push({
        id: String(b.id),
        userId: String(b.user_id),
        start,
        end,
        total: b.total,
        allocations,
      });
    }
  } catch {
    // Si la table budget n'a pas encore de lignes
  }

  // 4. Produits
  let products: Product[] = [];
  try {
    const prodRows = db.getAllSync<{
      id: number;
      name: string;
      brand?: string;
      category_id: number;
      unit?: string;
      photo_path?: string;
      created_by?: number;
      user_id?: number;
    }>('SELECT * FROM product');

    products = prodRows.map((p) => ({
      id: String(p.id),
      userId: String(p.created_by || p.user_id || 1),
      name: p.name,
      brand: p.brand || '',
      categoryId: String(p.category_id),
      unit: p.unit || 'pc',
      photo: p.photo_path || undefined,
    }));
  } catch {}

  // 5. Achats (Purchases)
  let purchases: Purchase[] = [];
  try {
    const purchRows = db.getAllSync<{
      id: number;
      user_id: number;
      product_id: number;
      price: number;
      quantity: number;
      unit?: string;
      store?: string;
      date: string;
    }>('SELECT * FROM purchase');

    purchases = purchRows.map((pu) => ({
      id: String(pu.id),
      userId: String(pu.user_id),
      productId: String(pu.product_id),
      price: pu.price,
      quantity: pu.quantity || 1,
      unit: pu.unit || 'pc',
      store: pu.store || 'Magasin',
      date: pu.date || todayISO(),
    }));
  } catch {}

  // 6. Dépenses (Expenses)
  let expenses: Expense[] = [];
  try {
    const expRows = db.getAllSync<{
      id: number;
      user_id: number;
      category_id: number;
      amount: number;
      label?: string;
      notes?: string;
      date: string;
    }>('SELECT * FROM expense');

    expenses = expRows.map((ex) => ({
      id: String(ex.id),
      userId: String(ex.user_id),
      categoryId: String(ex.category_id),
      amount: ex.amount,
      note: ex.label || ex.notes || '',
      date: ex.date || todayISO(),
    }));
  } catch {}

  // 7. Règles de points & paramètres
  let pointsRules: PointsRules = {
    periodReward: 100,
    streakLength: 3,
    streakBonus: 50,
    saverAt: 300,
    expertAt: 1000,
  };

  try {
    const sRows = db.getAllSync<{
      points_per_period?: number;
      points_streak_bonus?: number;
      streak_length?: number;
      threshold_saver?: number;
      threshold_expert?: number;
    }>('SELECT * FROM settings LIMIT 1');
    if (sRows.length > 0 && sRows[0]) {
      const s = sRows[0];
      pointsRules = {
        periodReward: s.points_per_period ?? 100,
        streakLength: s.streak_length ?? 3,
        streakBonus: s.points_streak_bonus ?? 50,
        saverAt: s.threshold_saver ?? 300,
        expertAt: s.threshold_expert ?? 1000,
      };
    }
  } catch {}

  const categoryTypes: CategoryType[] = [
    { kind: 'product', label: 'Products', description: 'Articles achetés au quotidien avec suivi du prix unitaire.' },
    { kind: 'expense', label: 'Expenses', description: 'Dépenses courantes sans produit spécifique.' },
  ];

  return {
    users,
    categories,
    categoryTypes,
    defaultPercentages,
    pointsRules,
    settings: { allowRegistration: true },
    budgets,
    products,
    purchases,
    expenses,
    sessionUserId: null,
  };
}

// ------------------------------------------------------------
// OPÉRATIONS D'ÉCRITURE SQLITE SYNCHRONES (ZÉRO DONNÉES EN DUR)
// ------------------------------------------------------------

export function sqliteAddUser(user: User): void {
  try {
    db.runSync(
      'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [user.name, user.email, user.passwordHash, user.role, user.active ? 1 : 0, user.mustChangePassword ? 1 : 0, user.onboarded ? 1 : 0, user.createdAt]
    );
  } catch (e) {
    console.warn('sqliteAddUser error:', e);
  }
}

export function sqliteUpdateUser(id: string, patch: Partial<User>): void {
  try {
    const numId = Number(id);
    if (patch.name !== undefined) {
      db.runSync('UPDATE user SET name = ? WHERE id = ?', [patch.name, numId]);
    }
    if (patch.passwordHash !== undefined) {
      db.runSync('UPDATE user SET password_hash = ? WHERE id = ?', [patch.passwordHash, numId]);
    }
    if (patch.active !== undefined) {
      db.runSync('UPDATE user SET is_active = ? WHERE id = ?', [patch.active ? 1 : 0, numId]);
    }
    if (patch.mustChangePassword !== undefined) {
      db.runSync('UPDATE user SET must_change_password = ? WHERE id = ?', [patch.mustChangePassword ? 1 : 0, numId]);
    }
    if (patch.onboarded !== undefined) {
      db.runSync('UPDATE user SET onboarding_done = ? WHERE id = ?', [patch.onboarded ? 1 : 0, numId]);
    }
  } catch (e) {
    console.warn('sqliteUpdateUser error:', e);
  }
}

export function sqliteSetUserCategories(userId: string, categoryIds: string[]): void {
  try {
    const numUserId = Number(userId);
    db.runSync('DELETE FROM user_category WHERE user_id = ?', [numUserId]);
    for (const catId of categoryIds) {
      const numCatId = Number(catId);
      if (numCatId > 0) {
        db.runSync(
          'INSERT OR IGNORE INTO user_category (user_id, category_id, enabled) VALUES (?, ?, 1)',
          [numUserId, numCatId]
        );
      }
    }
  } catch (e) {
    console.warn('sqliteSetUserCategories error:', e);
  }
}

export function sqliteSaveBudget(budget: Budget): void {
  try {
    const numUserId = Number(budget.userId);
    const month = budget.start.substring(0, 7);

    // 1. Table budget (périodes personnalisées)
    try {
      db.runSync(
        'INSERT OR REPLACE INTO budget (id, user_id, start_date, end_date, total) VALUES (?, ?, ?, ?, ?)',
        [Number(budget.id) || null, numUserId, budget.start, budget.end, budget.total]
      );
    } catch {}

    // 2. Table month_budget (mensuel)
    try {
      db.runSync(
        'INSERT OR REPLACE INTO month_budget (user_id, month, total) VALUES (?, ?, ?)',
        [numUserId, month, budget.total]
      );
    } catch {}

    // 3. Enveloppes par catégorie
    for (const [catIdStr, montant] of Object.entries(budget.allocations)) {
      const numCatId = Number(catIdStr);
      if (numCatId > 0) {
        db.runSync(
          'INSERT OR REPLACE INTO category_budget (user_id, month, category_id, amount) VALUES (?, ?, ?, ?)',
          [numUserId, month, numCatId, montant]
        );
      }
    }
  } catch (e) {
    console.warn('sqliteSaveBudget error:', e);
  }
}

export function sqliteAddProduct(product: Product): void {
  try {
    db.runSync(
      'INSERT INTO product (name, brand, category_id, unit, photo_path, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [product.name, product.brand, Number(product.categoryId) || 1, product.unit, product.photo || '', Number(product.userId) || 1]
    );
  } catch (e) {
    console.warn('sqliteAddProduct error:', e);
  }
}

export function sqliteUpdateProduct(id: string, patch: Partial<Product>): void {
  try {
    const numId = Number(id);
    if (patch.name !== undefined) {
      db.runSync('UPDATE product SET name = ? WHERE id = ?', [patch.name, numId]);
    }
    if (patch.brand !== undefined) {
      db.runSync('UPDATE product SET brand = ? WHERE id = ?', [patch.brand, numId]);
    }
    if (patch.categoryId !== undefined) {
      db.runSync('UPDATE product SET category_id = ? WHERE id = ?', [Number(patch.categoryId) || 1, numId]);
    }
    if (patch.unit !== undefined) {
      db.runSync('UPDATE product SET unit = ? WHERE id = ?', [patch.unit, numId]);
    }
    if (patch.photo !== undefined) {
      db.runSync('UPDATE product SET photo_path = ? WHERE id = ?', [patch.photo || '', numId]);
    }
  } catch (e) {
    console.warn('sqliteUpdateProduct error:', e);
  }
}

export function sqliteAddPurchase(purchase: Purchase): void {
  try {
    const month = purchase.date.substring(0, 7);
    db.runSync(
      'INSERT INTO purchase (product_id, user_id, store, quantity, unit, price, date, month) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [Number(purchase.productId) || 1, Number(purchase.userId) || 1, purchase.store, purchase.quantity, purchase.unit, purchase.price, purchase.date, month]
    );
  } catch (e) {
    console.warn('sqliteAddPurchase error:', e);
  }
}

export function sqliteUpdatePurchase(id: string, patch: Partial<Purchase>): void {
  try {
    const numId = Number(id);
    if (patch.price !== undefined) {
      db.runSync('UPDATE purchase SET price = ? WHERE id = ?', [patch.price, numId]);
    }
    if (patch.quantity !== undefined) {
      db.runSync('UPDATE purchase SET quantity = ? WHERE id = ?', [patch.quantity, numId]);
    }
    if (patch.store !== undefined) {
      db.runSync('UPDATE purchase SET store = ? WHERE id = ?', [patch.store, numId]);
    }
    if (patch.date !== undefined) {
      db.runSync('UPDATE purchase SET date = ?, month = ? WHERE id = ?', [patch.date, patch.date.substring(0, 7), numId]);
    }
  } catch (e) {
    console.warn('sqliteUpdatePurchase error:', e);
  }
}

export function sqliteAddExpense(expense: Expense): void {
  try {
    const month = expense.date.substring(0, 7);
    db.runSync(
      'INSERT INTO expense (user_id, category_id, amount, label, date, month) VALUES (?, ?, ?, ?, ?, ?)',
      [Number(expense.userId) || 1, Number(expense.categoryId) || 1, expense.amount, expense.note, expense.date, month]
    );
  } catch (e) {
    console.warn('sqliteAddExpense error:', e);
  }
}

export function sqliteUpdateExpense(id: string, patch: Partial<Expense>): void {
  try {
    const numId = Number(id);
    if (patch.amount !== undefined) {
      db.runSync('UPDATE expense SET amount = ? WHERE id = ?', [patch.amount, numId]);
    }
    if (patch.note !== undefined) {
      db.runSync('UPDATE expense SET label = ? WHERE id = ?', [patch.note, numId]);
    }
    if (patch.date !== undefined) {
      db.runSync('UPDATE expense SET date = ?, month = ? WHERE id = ?', [patch.date, patch.date.substring(0, 7), numId]);
    }
  } catch (e) {
    console.warn('sqliteUpdateExpense error:', e);
  }
}

export function sqliteAddCategory(cat: Category): void {
  try {
    db.runSync(
      'INSERT INTO category (name_key, type, icon, is_active) VALUES (?, ?, ?, ?)',
      [cat.name, cat.kind, '📦', cat.active ? 1 : 0]
    );
  } catch (e) {
    console.warn('sqliteAddCategory error:', e);
  }
}

export function sqliteUpdateCategory(id: string, patch: Partial<Category>): void {
  try {
    const numId = Number(id);
    if (patch.name !== undefined) {
      db.runSync('UPDATE category SET name_key = ? WHERE id = ?', [patch.name, numId]);
    }
    if (patch.active !== undefined) {
      db.runSync('UPDATE category SET is_active = ? WHERE id = ?', [patch.active ? 1 : 0, numId]);
    }
  } catch (e) {
    console.warn('sqliteUpdateCategory error:', e);
  }
}
