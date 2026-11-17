// ============================================================
// FICHIER : src/db/database.web.ts
// RÔLE DANS L'APPLICATION :
//   Moteur de base de données miroir dédié à la plateforme Web (navigateurs Chrome, Firefox, Safari).
//   Émule l'API synchrone d'expo-sqlite (`db.runSync`, `db.getFirstSync`, `db.getAllSync`)
//   en stockant l'intégralité des 12 tables relationnelles dans le `localStorage` du navigateur.
//   Ceci évite l'erreur classique "Sync operation timeout" causée par les bindings C++ absents du Web.
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est la version carnet de notes numérique accessible sur ordinateur : même si le coffre-fort
//   physique en métal (SQLite mobile) n'est pas transportable sur un navigateur de bureau,
//   le carnet reproduit exactement les mêmes fiches et les sauvegarde dans la mémoire du navigateur.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Permet de tester et présenter l'application Masrouf directement dans un navigateur
//   avec les mêmes utilisateurs de test (admin@masrouf.tn, user@masrouf.tn), les mêmes calculs
//   de budget en dinars tunisiens et les mêmes jauges de gamification sans aucun blocage.
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
  onboarding_done: number;
  hash_version: number;
  budget_mensuel: number;
  langue: string;
  created_at: string;
};

export type UserCategoryRow = {
  id: number;
  user_id: number;
  category_id: number;
  enabled: number;
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
      email: 'admin@gmail.com',
      password_hash: DEFAULT_ADMIN_HASH,
      salt: DEFAULT_SALT,
      role: 'admin',
      is_active: 1,
      must_change_password: 0,
      onboarding_done: 1,
      hash_version: 1,
      budget_mensuel: 0,
      langue: 'fr',
      created_at: '2026-11-01 10:00:00',
    },
    {
      id: 2,
      name: 'Ahmed Ben Ali',
      email: 'user@gmail.com',
      password_hash: DEFAULT_USER_HASH,
      salt: DEFAULT_SALT,
      role: 'user',
      is_active: 1,
      must_change_password: 0,
      onboarding_done: 1,
      hash_version: 1,
      budget_mensuel: 1200,
      langue: 'fr',
      created_at: '2026-11-02 14:30:00',
    },
    {
      id: 3,
      name: 'Ines Ben Ali',
      email: 'ines.benali@gmail.com',
      password_hash: DEFAULT_USER_HASH,
      salt: DEFAULT_SALT,
      role: 'user',
      is_active: 1,
      must_change_password: 0,
      onboarding_done: 1,
      hash_version: 1,
      budget_mensuel: 1200,
      langue: 'fr',
      created_at: '2026-11-01 10:00:00',
    },
  ];

  user_category: UserCategoryRow[] = [
    { id: 1, user_id: 2, category_id: 1, enabled: 1, created_at: '2026-11-02' },
    { id: 2, user_id: 2, category_id: 2, enabled: 1, created_at: '2026-11-02' },
    { id: 3, user_id: 2, category_id: 3, enabled: 1, created_at: '2026-11-02' },
    { id: 4, user_id: 2, category_id: 4, enabled: 1, created_at: '2026-11-02' },
    { id: 5, user_id: 2, category_id: 5, enabled: 1, created_at: '2026-11-02' },
    { id: 6, user_id: 2, category_id: 6, enabled: 1, created_at: '2026-11-02' },
    { id: 7, user_id: 2, category_id: 7, enabled: 1, created_at: '2026-11-02' },
    { id: 8, user_id: 2, category_id: 8, enabled: 1, created_at: '2026-11-02' },
    { id: 9, user_id: 2, category_id: 9, enabled: 1, created_at: '2026-11-02' },
    { id: 10, user_id: 2, category_id: 10, enabled: 1, created_at: '2026-11-02' },
    { id: 11, user_id: 2, category_id: 11, enabled: 1, created_at: '2026-11-02' },
    { id: 12, user_id: 2, category_id: 12, enabled: 1, created_at: '2026-11-02' },
    { id: 13, user_id: 2, category_id: 13, enabled: 1, created_at: '2026-11-02' },
    { id: 14, user_id: 2, category_id: 14, enabled: 1, created_at: '2026-11-02' },
    { id: 15, user_id: 2, category_id: 15, enabled: 1, created_at: '2026-11-02' },
    { id: 16, user_id: 2, category_id: 16, enabled: 1, created_at: '2026-11-02' },
  ];

  category: CategoryRow[] = [
    // Type Product avec icônes vectorielles sans emojis
    { id: 1, name_key: 'Alimentation', type: 'product', icon: 'restaurant-outline', default_percent: 25, is_default: 1, is_active: 1, is_system: 0, theme: 'Essentiel' },
    { id: 2, name_key: 'Vêtements et chaussures', type: 'product', icon: 'shirt-outline', default_percent: 8, is_default: 1, is_active: 1, is_system: 0, theme: 'Personnel' },
    { id: 3, name_key: 'Hygiène et soins personnels', type: 'product', icon: 'sparkles-outline', default_percent: 4, is_default: 1, is_active: 1, is_system: 0, theme: 'Vie quotidienne' },
    { id: 4, name_key: 'Maison et équipement', type: 'product', icon: 'home-outline', default_percent: 4, is_default: 1, is_active: 1, is_system: 0, theme: 'Logement' },
    { id: 5, name_key: 'Matériel informatique', type: 'product', icon: 'laptop-outline', default_percent: 4, is_default: 1, is_active: 1, is_system: 0, theme: 'Études et travail' },
    { id: 6, name_key: 'Santé', type: 'product', icon: 'medkit-outline', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Santé' },
    // Type Expense avec icônes vectorielles sans emojis
    { id: 7, name_key: 'Transport', type: 'expense', icon: 'car-outline', default_percent: 10, is_default: 1, is_active: 1, is_system: 0, theme: 'Essentiel' },
    { id: 8, name_key: 'Factures', type: 'expense', icon: 'receipt-outline', default_percent: 14, is_default: 1, is_active: 1, is_system: 0, theme: 'Logement' },
    { id: 9, name_key: 'Études', type: 'expense', icon: 'school-outline', default_percent: 10, is_default: 1, is_active: 1, is_system: 0, theme: 'Études et travail' },
    { id: 10, name_key: 'Loisirs et sorties', type: 'expense', icon: 'game-controller-outline', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Personnel' },
    { id: 11, name_key: 'Enfants', type: 'expense', icon: 'happy-outline', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Famille' },
    { id: 12, name_key: 'Aide à la famille', type: 'expense', icon: 'people-outline', default_percent: 2, is_default: 1, is_active: 1, is_system: 0, theme: 'Famille' },
    { id: 13, name_key: 'Épargne', type: 'expense', icon: 'cash-outline', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
    { id: 14, name_key: 'Dons et charité', type: 'expense', icon: 'heart-outline', default_percent: 1, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
    { id: 15, name_key: 'Frais bancaires', type: 'expense', icon: 'business-outline', default_percent: 2, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
    { id: 16, name_key: 'Autres', type: 'expense', icon: 'cart-outline', default_percent: 5, is_default: 1, is_active: 1, is_system: 1, theme: 'Divers' },
  ];

  // ============================================================
  // MISSION ARCHITECTURALE : ZÉRO DONNÉE EN DUR
  // RÔLE : Catalogue de produits, achats, dépenses et budgets vierges au démarrage.
  // ============================================================
  product: ProductRow[] = [];
  purchase: PurchaseRow[] = [];
  expense: ExpenseRow[] = [];
  month_budget: MonthBudgetRow[] = [];
  category_budget: CategoryBudgetRow[] = [];

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

  /**
   * MISSION DE LA MÉTHODE : charger
   *   Restaure l'état complet de la base en mémoire depuis la clé `masrouf_web_v3` du `localStorage`.
   *
   * RÔLE DANS L'APPLICATION :
   *   Permet au navigateur de récupérer les comptes, catégories, budgets et achats de la session précédente.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Restitue instantanément les dépenses et le solde de l'utilisateur dès le rechargement de la page Web.
   */
  charger() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const d = window.localStorage.getItem('masrouf_web_v3');
        if (d) {
          const parsed = JSON.parse(d);
          if (parsed.user) {
            this.user = parsed.user.map((u: any) => ({
              ...u,
              // Déverrouillage systématique des comptes de test pour le Web
              is_active: ['admin@gmail.com', 'ines.benali@gmail.com', 'user@gmail.com'].includes(String(u.email).toLowerCase()) ? 1 : (u.is_active ?? 1),
              must_change_password: ['admin@gmail.com', 'ines.benali@gmail.com', 'user@gmail.com'].includes(String(u.email).toLowerCase()) ? 0 : (u.must_change_password ?? 0),
              onboarding_done: u.onboarding_done ?? 1,
              hash_version: u.hash_version ?? 1,
            }));

            // Si Ines Ben Ali est absente de la sauvegarde Web locale, l'injecter
            if (!this.user.some((u) => u.email.toLowerCase() === 'ines.benali@gmail.com')) {
              this.user.push({
                id: 3,
                name: 'Ines Ben Ali',
                email: 'ines.benali@gmail.com',
                password_hash: DEFAULT_USER_HASH,
                salt: DEFAULT_SALT,
                role: 'user',
                is_active: 1,
                must_change_password: 0,
                onboarding_done: 1,
                hash_version: 1,
                budget_mensuel: 1200,
                langue: 'fr',
                created_at: '2026-11-01 10:00:00',
              });
            }
          }
          if (parsed.user_category) this.user_category = parsed.user_category;
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

  /**
   * MISSION DE LA MÉTHODE : sauvegarder
   *   Sérialise l'ensemble des tables en chaîne JSON et les persiste dans le `localStorage` du navigateur.
   *
   * RÔLE DANS L'APPLICATION :
   *   Appelée après chaque création ou modification (nouvel achat, inscription, mise à jour de budget).
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Aucun composant graphique : sauvegarde en tâche de fond pour garantir la persistance des données.
   */
  sauvegarder() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const snapshot = JSON.stringify({
          user: this.user,
          user_category: this.user_category,
          category: this.category,
          product: this.product,
          purchase: this.purchase,
          expense: this.expense,
          month_budget: this.month_budget,
          category_budget: this.category_budget,
          settings: this.settings,
        });
        window.localStorage.setItem('masrouf_web_v3', snapshot);
        // Sauvegarde de précaution si non existante
        if (!window.localStorage.getItem('masrouf_web_v3_backup_etape2')) {
          window.localStorage.setItem('masrouf_web_v3_backup_etape2', snapshot);
        }
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
      let name = params[0];
      let email = params[1];
      let hash = params[2];
      let salt = params[3] ?? DEFAULT_SALT;
      let role: 'admin' | 'user' = 'user';
      let isActive = 1;
      let mustChange = 0;
      let onboardingDone = 0;
      let hashVersion = 1;
      let budget = 0;
      let langue = 'fr';

      if (params.length === 5) {
        // registerUser: [nom, email, passwordHash, salt, hashVersion]
        hashVersion = params[4] ?? 1;
        onboardingDone = 0;
      } else if (params.length === 4) {
        // initialiserComptesDepart
        role = String(email).toLowerCase().includes('admin') ? 'admin' : 'user';
        mustChange = role === 'admin' ? 1 : 0;
        onboardingDone = 1;
        hashVersion = 1;
        budget = role === 'admin' ? 0 : 1200;
      } else if (params.length >= 7) {
        role = params[4] ?? 'user';
        isActive = params[5] ?? 1;
        mustChange = params[6] ?? 0;
        onboardingDone = params[7] ?? 0;
        hashVersion = params[8] ?? 1;
        budget = params[9] ?? 0;
        langue = params[10] ?? 'fr';
      }

      const id = (store.user.length > 0 ? Math.max(...store.user.map((u) => u.id)) : 0) + 1;
      store.user.push({
        id,
        name,
        email,
        password_hash: hash,
        salt,
        role,
        is_active: isActive,
        must_change_password: mustChange,
        onboarding_done: onboardingDone,
        hash_version: hashVersion,
        budget_mensuel: budget,
        langue,
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // UPDATE USER
    if (s.includes('UPDATE USER') || s.includes('UPDATE UTILISATEURS')) {
      if (s.includes('ONBOARDING_DONE = ?')) {
        const [done, id] = params;
        const u = store.user.find((x) => x.id === id);
        if (u) {
          u.onboarding_done = Number(done);
          store.sauvegarder();
        }
      } else if (s.includes('PASSWORD_HASH = ?') && s.includes('HASH_VERSION = ?')) {
        const [hash, salt, hashVer, id] = params;
        const u = store.user.find((x) => x.id === id);
        if (u) {
          u.password_hash = hash;
          u.salt = salt;
          u.hash_version = hashVer;
          u.must_change_password = 0;
          store.sauvegarder();
        }
      } else if (s.includes('PASSWORD_HASH = ?')) {
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

    // USER_CATEGORY OPERATIONS
    if (s.includes('DELETE FROM USER_CATEGORY')) {
      const [userId] = params;
      store.user_category = store.user_category.filter((uc) => uc.user_id !== userId);
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('INSERT INTO USER_CATEGORY')) {
      const [userId, catId, enabled] = params;
      const id = (store.user_category.length > 0 ? Math.max(...store.user_category.map((uc) => uc.id)) : 0) + 1;
      store.user_category.push({
        id,
        user_id: userId,
        category_id: catId,
        enabled: enabled ?? 1,
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // INSERT INTO CATEGORY
    if (s.includes('INSERT INTO CATEGORY') || s.includes('INSERT INTO CATEGORIES')) {
      const [nom, typeOrIcon, iconOrPct, pctOrTheme, theme] = params;
      let nameKey = nom;
      let catType: 'product' | 'expense' = 'product';
      let icon = 'cart-outline';
      let defPct = 0;
      let th = 'Divers';

      if (params.length === 5) {
        catType = typeOrIcon === 'expense' ? 'expense' : 'product';
        icon = iconOrPct || 'cart-outline';
        defPct = pctOrTheme || 0;
        th = theme || 'Divers';
      } else {
        icon = typeOrIcon || 'cart-outline';
        defPct = iconOrPct || 0;
        th = pctOrTheme || 'Divers';
      }

      const id = (store.category.length > 0 ? Math.max(...store.category.map((c) => c.id)) : 0) + 1;
      store.category.push({
        id,
        name_key: nameKey,
        type: catType,
        icon,
        default_percent: defPct,
        is_default: 0,
        is_active: 1,
        is_system: 0,
        theme: th,
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // UPDATE CATEGORY
    if (s.includes('UPDATE CATEGORY') || s.includes('UPDATE CATEGORIES')) {
      const id = params[params.length - 1];
      const cat = store.category.find((c) => c.id === id);
      if (cat) {
        cat.name_key = params[0];
        if (params.length >= 6) {
          cat.type = params[1] === 'expense' ? 'expense' : 'product';
          cat.icon = params[2];
          cat.default_percent = params[3];
          cat.is_active = params[4];
        } else {
          cat.icon = params[1];
          cat.default_percent = params[2];
          cat.is_active = params[3];
        }
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // DELETE FROM PRODUCT
    if (s.includes('DELETE FROM PRODUCT')) {
      const [id] = params;
      store.product = store.product.filter((p) => p.id !== id);
      store.purchase = store.purchase.filter((p) => p.product_id !== id);
      store.sauvegarder();
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
        onboarding_done: u.onboarding_done ?? 0,
        hash_version: u.hash_version ?? 1,
        budget_mensuel: u.budget_mensuel ?? 0,
        langue: u.langue ?? 'fr',
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
        onboarding_done: u.onboarding_done ?? 0,
        hash_version: u.hash_version ?? 1,
        budget_mensuel: u.budget_mensuel ?? 0,
        langue: u.langue ?? 'fr',
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

    // CATEGORIES
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

    // USER CATEGORIES
    if (s.includes('FROM USER_CATEGORY')) {
      const [userId] = params;
      const rows = store.user_category.filter(
        (uc) => (userId === undefined || uc.user_id === userId) && uc.enabled === 1
      );
      return rows as unknown as T[];
    }

    // USERS
    if (s.includes('FROM USER') || s.includes('FROM UTILISATEURS')) {
      return store.user.map((u) => ({
        ...u,
        nom: u.name,
        onboarding_done: u.onboarding_done ?? 0,
        hash_version: u.hash_version ?? 1,
        budget_mensuel: u.budget_mensuel ?? 0,
        langue: u.langue ?? 'fr',
      })) as unknown as T[];
    }

    // PRODUCTS
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
          categorie_icone: cat?.icon ?? 'cart-outline',
        };
      }) as unknown as T[];
    }

    // BUDGET (Périodes personnalisées)
    if (s.includes('FROM BUDGET')) {
      // Transformation des month_budget en budget de période pour le Web avec bornes exactes
      return store.month_budget.map((mb) => {
        const parts = mb.month.split('-');
        const y = parseInt(parts[0], 10) || 2026;
        const m = parseInt(parts[1], 10) || 11;
        const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
        return {
          id: mb.id,
          user_id: mb.user_id,
          start_date: `${mb.month}-01`,
          end_date: `${mb.month}-${String(lastDay).padStart(2, '0')}`,
          month: mb.month,
          total: mb.total,
          is_evaluated: mb.is_evaluated,
        };
      }) as unknown as T[];
    }

    // CATEGORY_BUDGET (Enveloppes allouées)
    if (s.includes('FROM CATEGORY_BUDGET')) {
      // Récupération des allocations filtrées par utilisateur si fourni
      const [userId] = params;
      const rows = store.category_budget.filter(
        (cb) => userId === undefined || cb.user_id === userId
      );
      return rows as unknown as T[];
    }

    // PURCHASES (Achats de produits détaillés)
    if (s.includes('FROM PURCHASE')) {
      return store.purchase as unknown as T[];
    }

    // EXPENSES (Dépenses directes)
    if (s.includes('FROM EXPENSE')) {
      return store.expense as unknown as T[];
    }

    return [];
  },
};

/**
 * MISSION DE LA FONCTION : sauvegarderBaseDeDonnees
 *   Crée une sauvegarde miroir sous la clé `masrouf_web_v3_backup_etape2` dans le `localStorage`.
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit une copie de sauvegarde Web équivalente au VACUUM INTO natif.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Opération silencieuse d'arrière-plan sans impact visuel direct.
 */
export function sauvegarderBaseDeDonnees(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem('masrouf_web_v3');
      if (data && !window.localStorage.getItem('masrouf_web_v3_backup_etape2')) {
        window.localStorage.setItem('masrouf_web_v3_backup_etape2', data);
        console.log('[Web] Sauvegarde masrouf_web_v3_backup_etape2 créée dans localStorage');
      }
    }
  } catch {}
}

/**
 * MISSION DE LA FONCTION : initDatabase
 *   Initialise la base Web au démarrage de l'application Masrouf sur navigateur.
 *
 * RÔLE DANS L'APPLICATION :
 *   Déclenche la sauvegarde de précaution et s'assure que le store en mémoire est actif.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Permet à l'interface Web de s'afficher sans délai ni crash.
 */
export function initDatabase(): void {
  sauvegarderBaseDeDonnees();
}
