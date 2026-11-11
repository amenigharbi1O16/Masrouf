// ============================================================
// FICHIER : src/db/database.web.ts
// RÔLE    : Moteur de base de données miroir dédié au Web (Navigateur).
//           Remplace les appels natifs C++ d'expo-sqlite pour éviter
//           l'erreur "Sync operation timeout".
//
// CONFORMITÉ ÉTAPE 1 :
//   - Reproduit exactement le schéma relationnel SQLite avec les tables
//     au singulier : user, category (type 'product' | 'expense'),
//     product, purchase, expense, month_budget, category_budget, etc.
//   - Persistance automatique dans localStorage.
// ============================================================

export const DEFAULT_SALT = '11112222333344445555666677778888';
export const DEFAULT_ADMIN_HASH =
  '11112222333344445555666677778888:60f3d9f2c7bf6bbd6e6263a454cf9a5d4c0cfd7342a7e5e04ad25be69b1d492b';
export const DEFAULT_USER_HASH =
  '11112222333344445555666677778888:e6f2daa877de06e7f3d664fb9d340962466508050464c33f8649876bc10a43aa';

export type UserRow = {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  salt: string;
  role: 'admin' | 'user';
  is_active: number;
  must_change_password: number;
  budget_mensuel: number;
  langue: string;
  created_at: string;
};

export type CategoryRow = {
  id: number;
  name_key: string;
  type: 'product' | 'expense';
  icon: string;
  default_percent: number;
  is_default: number;
  is_active: number;
  is_system: number;
  theme: string;
};

export type ProductRow = {
  id: number;
  user_id: number;
  name: string;
  brand: string;
  category_id: number;
  photo_path: string;
  unit: string;
  created_at: string;
};

export type PurchaseRow = {
  id: number;
  user_id: number;
  product_id: number;
  category_id: number;
  price: number;
  quantity: number;
  unit: string;
  store: string;
  date: string;
  month: string;
  notes: string;
  created_at: string;
};

export type ExpenseRow = {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  label: string;
  date: string;
  month: string;
  notes: string;
  created_at: string;
};

export type MonthBudgetRow = {
  id: number;
  user_id: number;
  month: string;
  total: number;
  is_evaluated: number;
  created_at: string;
};

export type CategoryBudgetRow = {
  id: number;
  user_id: number;
  month: string;
  category_id: number;
  amount: number;
  percent: number;
  created_at: string;
};

export type SettingsRow = {
  id: number;
  points_per_category: number;
  points_monthly_bonus: number;
  points_streak_bonus: number;
  threshold_beginner: number;
  threshold_saver: number;
  threshold_expert: number;
};

class WebDatabaseStore {
  user: UserRow[] = [
    {
      id: 1,
      name: 'Administrateur',
      email: 'admin@masrouf.tn',
      password_hash: DEFAULT_ADMIN_HASH,
      salt: DEFAULT_SALT,
      role: 'admin',
      is_active: 1,
      must_change_password: 1,
      budget_mensuel: 0,
      langue: 'fr',
      created_at: '2026-11-01 10:00:00',
    },
    {
      id: 2,
      name: 'Ahmed Ben Ali',
      email: 'user@masrouf.tn',
      password_hash: DEFAULT_USER_HASH,
      salt: DEFAULT_SALT,
      role: 'user',
      is_active: 1,
      must_change_password: 0,
      budget_mensuel: 1200,
      langue: 'fr',
      created_at: '2026-11-02 14:30:00',
    },
  ];

  category: CategoryRow[] = [
    // Type Product
    { id: 1, name_key: 'Alimentation', type: 'product', icon: '🍞', default_percent: 25, is_default: 1, is_active: 1, is_system: 0, theme: 'Essentiel' },
    { id: 2, name_key: 'Vêtements et chaussures', type: 'product', icon: '👕', default_percent: 8, is_default: 1, is_active: 1, is_system: 0, theme: 'Personnel' },
    { id: 3, name_key: 'Hygiène et soins personnels', type: 'product', icon: '🧼', default_percent: 4, is_default: 1, is_active: 1, is_system: 0, theme: 'Vie quotidienne' },
    { id: 4, name_key: 'Maison et équipement', type: 'product', icon: '🛋️', default_percent: 4, is_default: 1, is_active: 1, is_system: 0, theme: 'Logement' },
    { id: 5, name_key: 'Matériel informatique', type: 'product', icon: '💻', default_percent: 4, is_default: 1, is_active: 1, is_system: 0, theme: 'Études et travail' },
    { id: 6, name_key: 'Santé', type: 'product', icon: '💊', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Santé' },
    // Type Expense
    { id: 7, name_key: 'Transport', type: 'expense', icon: '🚗', default_percent: 10, is_default: 1, is_active: 1, is_system: 0, theme: 'Essentiel' },
    { id: 8, name_key: 'Factures', type: 'expense', icon: '🧾', default_percent: 14, is_default: 1, is_active: 1, is_system: 0, theme: 'Logement' },
    { id: 9, name_key: 'Études', type: 'expense', icon: '📚', default_percent: 10, is_default: 1, is_active: 1, is_system: 0, theme: 'Études et travail' },
    { id: 10, name_key: 'Loisirs et sorties', type: 'expense', icon: '🎮', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Personnel' },
    { id: 11, name_key: 'Enfants', type: 'expense', icon: '👶', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Famille' },
    { id: 12, name_key: 'Aide à la famille', type: 'expense', icon: '🤝', default_percent: 2, is_default: 1, is_active: 1, is_system: 0, theme: 'Famille' },
    { id: 13, name_key: 'Épargne', type: 'expense', icon: '💰', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
    { id: 14, name_key: 'Dons et charité', type: 'expense', icon: '🤲', default_percent: 1, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
    { id: 15, name_key: 'Frais bancaires', type: 'expense', icon: '🏦', default_percent: 2, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
    { id: 16, name_key: 'Autres', type: 'expense', icon: '📦', default_percent: 5, is_default: 1, is_active: 1, is_system: 1, theme: 'Divers' },
  ];

  product: ProductRow[] = [
    { id: 1, user_id: 2, name: 'Lait demi-écrémé', brand: 'Délice', category_id: 1, photo_path: '', unit: 'L', created_at: '2026-11-02' },
  ];

  purchase: PurchaseRow[] = [
    { id: 1, user_id: 2, product_id: 1, category_id: 1, price: 1.85, quantity: 2, unit: 'L', store: 'Carrefour', date: '2026-11-10', month: '2026-11', notes: '', created_at: '2026-11-10' },
  ];

  expense: ExpenseRow[] = [
    { id: 1, user_id: 2, category_id: 7, amount: 25.0, label: 'Taxi & Déplacement', date: '2026-11-09', month: '2026-11', notes: '', created_at: '2026-11-09' },
  ];

  month_budget: MonthBudgetRow[] = [
    { id: 1, user_id: 2, month: '2026-11', total: 800, is_evaluated: 0, created_at: '2026-11-01' },
  ];

  category_budget: CategoryBudgetRow[] = [
    { id: 1, user_id: 2, month: '2026-11', category_id: 1, amount: 200, percent: 25, created_at: '2026-11-01' },
    { id: 2, user_id: 2, month: '2026-11', category_id: 7, amount: 80, percent: 10, created_at: '2026-11-01' },
  ];

  settings: SettingsRow = {
    id: 1,
    points_per_category: 10,
    points_monthly_bonus: 50,
    points_streak_bonus: 20,
    threshold_beginner: 0,
    threshold_saver: 100,
    threshold_expert: 300,
  };

  constructor() {
    this.charger();
  }

  charger() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const d = window.localStorage.getItem('masrouf_web_v3');
        if (d) {
          const parsed = JSON.parse(d);
          if (parsed.user) this.user = parsed.user;
          if (parsed.category) this.category = parsed.category;
          if (parsed.product) this.product = parsed.product;
          if (parsed.purchase) this.purchase = parsed.purchase;
          if (parsed.expense) this.expense = parsed.expense;
          if (parsed.month_budget) this.month_budget = parsed.month_budget;
          if (parsed.category_budget) this.category_budget = parsed.category_budget;
          if (parsed.settings) this.settings = parsed.settings;
        }
      }
    } catch {}
  }

  sauvegarder() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'masrouf_web_v3',
          JSON.stringify({
            user: this.user,
            category: this.category,
            product: this.product,
            purchase: this.purchase,
            expense: this.expense,
            month_budget: this.month_budget,
            category_budget: this.category_budget,
            settings: this.settings,
          })
        );
      }
    } catch {}
  }
}

const store = new WebDatabaseStore();

export const db = {
  execSync: (_sql: string) => {},

  runSync: (sql: string, params: any[] = []): { lastInsertRowId: number; changes: number } => {
    const s = sql.toUpperCase();

    // INSERT INTO USER
    if (s.includes('INSERT INTO USER') || s.includes('INSERT INTO UTILISATEURS')) {
      const [name, email, hash, salt, role, isActive, mustChange, budget, langue] = params;
      const id = (store.user.length > 0 ? Math.max(...store.user.map((u) => u.id)) : 0) + 1;
      store.user.push({
        id,
        name,
        email,
        password_hash: hash,
        salt: salt ?? DEFAULT_SALT,
        role: role ?? 'user',
        is_active: isActive ?? 1,
        must_change_password: mustChange ?? 0,
        budget_mensuel: budget ?? 0,
        langue: langue ?? 'fr',
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // UPDATE USER
    if (s.includes('UPDATE USER') || s.includes('UPDATE UTILISATEURS')) {
      if (s.includes('PASSWORD_HASH = ?')) {
        const [hash, id] = params;
        const u = store.user.find((x) => x.id === id);
        if (u) {
          u.password_hash = hash;
          u.must_change_password = s.includes('MUST_CHANGE_PASSWORD = 1') ? 1 : 0;
          store.sauvegarder();
        }
      } else if (s.includes('IS_ACTIVE = ?')) {
        const [active, id] = params;
        const u = store.user.find((x) => x.id === id);
        if (u) {
          u.is_active = active;
          store.sauvegarder();
        }
      } else if (s.includes('BUDGET_MENSUEL = ?')) {
        const [budget, id] = params;
        const u = store.user.find((x) => x.id === id);
        if (u) {
          u.budget_mensuel = budget;
          store.sauvegarder();
        }
      } else if (s.includes('LANGUE = ?')) {
        const [langue, id] = params;
        const u = store.user.find((x) => x.id === id);
        if (u) {
          u.langue = langue;
          store.sauvegarder();
        }
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // DELETE FROM USER
    if (s.includes('DELETE FROM USER')) {
      const [id] = params;
      store.user = store.user.filter((u) => u.id !== id);
      store.purchase = store.purchase.filter((p) => p.user_id !== id);
      store.expense = store.expense.filter((e) => e.user_id !== id);
      store.product = store.product.filter((p) => p.user_id !== id);
      store.month_budget = store.month_budget.filter((b) => b.user_id !== id);
      store.category_budget = store.category_budget.filter((b) => b.user_id !== id);
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // INSERT INTO PURCHASE
    if (s.includes('INSERT INTO PURCHASE')) {
      const [userId, prodId, catId, price, qte, unit, storeName, date, month, notes] = params;
      const id = (store.purchase.length > 0 ? Math.max(...store.purchase.map((p) => p.id)) : 0) + 1;
      store.purchase.push({
        id,
        user_id: userId,
        product_id: prodId,
        category_id: catId,
        price,
        quantity: qte ?? 1,
        unit: unit ?? 'pièce',
        store: storeName ?? 'Non précisé',
        date: date ?? new Date().toISOString().split('T')[0],
        month,
        notes: notes ?? '',
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // INSERT INTO EXPENSE
    if (s.includes('INSERT INTO EXPENSE')) {
      const [userId, catId, amount, label, date, month, notes] = params;
      const id = (store.expense.length > 0 ? Math.max(...store.expense.map((e) => e.id)) : 0) + 1;
      store.expense.push({
        id,
        user_id: userId,
        category_id: catId,
        amount,
        label,
        date: date ?? new Date().toISOString().split('T')[0],
        month,
        notes: notes ?? '',
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    store.sauvegarder();
    return { lastInsertRowId: 0, changes: 1 };
  },

  getFirstSync: <T>(sql: string, params: any[] = []): T | null => {
    const s = sql.toUpperCase();

    // SELECT BY EMAIL FROM USER
    if (s.includes('FROM USER WHERE EMAIL = ?') || s.includes('FROM UTILISATEURS WHERE EMAIL = ?')) {
      const [email] = params;
      const u = store.user.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
      if (!u) return null;
      return {
        ...u,
        nom: u.name,
        budget_mensuel: 0,
        langue: 'fr',
      } as unknown as T;
    }

    // SELECT BY ID FROM USER
    if (s.includes('FROM USER WHERE ID = ?') || s.includes('FROM UTILISATEURS WHERE ID = ?')) {
      const [id] = params;
      const u = store.user.find((x) => x.id === id);
      if (!u) return null;
      return {
        ...u,
        nom: u.name,
        budget_mensuel: 0,
        langue: 'fr',
      } as unknown as T;
    }

    // COUNT ACTIVE ADMINS
    if (s.includes('ROLE = \'ADMIN\' AND IS_ACTIVE = 1')) {
      const count = store.user.filter((u) => u.role === 'admin' && u.is_active === 1).length;
      return { cnt: count } as unknown as T;
    }

    // SETTINGS
    if (s.includes('FROM SETTINGS')) {
      return store.settings as unknown as T;
    }

    return null;
  },

  getAllSync: <T>(sql: string, params: any[] = []): T[] => {
    const s = sql.toUpperCase();

    if (s.includes('FROM CATEGORY') || s.includes('FROM CATEGORIES')) {
      return store.category.map((c) => ({
        ...c,
        nom: c.name_key,
        icone: c.icon,
        pourcentage_defaut: c.default_percent,
        est_defaut: c.is_default,
        est_visible: c.is_active,
        est_systeme: c.is_system,
      })) as unknown as T[];
    }

    if (s.includes('FROM USER') || s.includes('FROM UTILISATEURS')) {
      return store.user.map((u) => ({
        ...u,
        nom: u.name,
        budget_mensuel: 0,
        langue: 'fr',
      })) as unknown as T[];
    }

    if (s.includes('FROM PRODUCT') || s.includes('FROM PRODUITS')) {
      return store.product.map((p) => {
        const cat = store.category.find((c) => c.id === p.category_id);
        return {
          ...p,
          nom: p.name,
          marque: p.brand,
          unite: p.unit,
          photo_uri: p.photo_path,
          categorie_nom: cat?.name_key ?? 'Autres',
          categorie_icone: cat?.icon ?? '📦',
        };
      }) as unknown as T[];
    }

    return [];
  },
};

export function initDatabase(): void {}
