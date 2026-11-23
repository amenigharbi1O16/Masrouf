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
  /** Nom complet de l'utilisateur affiché dans l'interface */
  name: string;
  /** Adresse e-mail unique servant d'identifiant de connexion */
  email: string;
  /** Empreinte SHA-256 salée pour l'authentification sécurisée */
  password_hash: string;
  /** Sel cryptographique aléatoire de 32 caractères hexadécimaux */
  salt: string;
  /** Rôle applicatif : privilèges complets (admin) ou gestion personnelle (user) ou familial */
  role: 'admin' | 'user' | 'child' | 'parent';
  /** Statut du compte : 1 = actif, 0 = désactivé/suspendu */
  is_active: number;
  /** Indicateur de mot de passe temporaire à renouveler obligatoirement */
  must_change_password: number;
  /** Statut d'achèvement de l'onboarding initial (catégories et budget) */
  onboarding_done: number;
  /** Version de l'algorithme de hachage cryptographique */
  hash_version: number;
  /** Enveloppe budgétaire mensuelle par défaut en Dinars Tunisiens (DT) */
  budget_mensuel: number;
  /** Préférence de langue d'affichage de l'interface (fr, ar, en) */
  langue: string;
  parent_id?: string | null;
  family_id?: string | null;
  account_type?: string | null;
  balance?: number;
  allocated_total?: number;
  family_name?: string | null;
  created_at: string;
};

export type UserCategoryRow = {
  id: number;
  /** Clé étrangère reliant l'enregistrement à son propriétaire (table user) */
  user_id: number;
  /** Clé étrangère reliant l'opération à sa catégorie d'imputation */
  category_id: number;
  /** Statut d'activation de la catégorie pour cet utilisateur (1 = visible) */
  enabled: number;
  created_at: string;
};

export type CategoryRow = {
  id: number;
  /** Clé normalisée du libellé de catégorie utilisée pour la traduction i18n */
  name_key: string;
  /** Typologie : catégorie à produits physiques ou dépenses forfaitaires directes */
  type: 'product' | 'expense';
  /** Nom de l'icône vectorielle Ionicons affichée sur la carte de catégorie */
  icon: string;
  /** Pourcentage recommandé par défaut lors de la répartition budgétaire */
  default_percent: number;
  /** Indique si la catégorie fait partie du panier standard de départ */
  is_default: number;
  /** Statut du compte : 1 = actif, 0 = désactivé/suspendu */
  is_active: number;
  /** Catégorie système protégée ne pouvant être supprimée par l'admin */
  is_system: number;
  /** Thème de regroupement visuel (Essentiel, Vie quotidienne, Logement, etc.) */
  theme: string;
  user_id?: number | null;
  description?: string | null;
  color?: string | null;
  is_custom?: number;
  scope?: 'personal' | 'family';
  created_at?: string;
};

export type ProductRow = {
  id: number;
  /** Clé étrangère reliant l'enregistrement à son propriétaire (table user) */
  user_id: number;
  /** Nom complet de l'utilisateur affiché dans l'interface */
  name: string;
  /** Marque commerciale ou fabricant du produit */
  brand: string;
  /** Clé étrangère reliant l'opération à sa catégorie d'imputation */
  category_id: number;
  /** Chemin du fichier image ou photo associé au produit */
  photo_path: string;
  /** Unité de mesure physique (L, kg, g, pc, mL) */
  unit: string;
  created_at: string;
};

export type PurchaseRow = {
  id: number;
  /** Clé étrangère reliant l'enregistrement à son propriétaire (table user) */
  user_id: number;
  /** Référence du produit physique acheté (table product) */
  product_id: number;
  /** Clé étrangère reliant l'opération à sa catégorie d'imputation */
  category_id: number;
  /** Montant en Dinars Tunisiens (DT) payé lors de la transaction */
  price: number;
  /** Quantité achetée selon l'unité de mesure associée */
  quantity: number;
  /** Unité de mesure physique (L, kg, g, pc, mL) */
  unit: string;
  /** Enseigne commerciale ou magasin où l'achat a été effectué */
  store: string;
  /** Date calendaire de l'opération au format standard ISO YYYY-MM-DD */
  date: string;
  /** Mois calendaire d'imputation budgétaire au format YYYY-MM */
  month: string;
  /** Commentaire ou observation textuelle optionnelle saisie par l'utilisateur */
  notes: string;
  created_at: string;
};

export type ExpenseRow = {
  id: number;
  /** Clé étrangère reliant l'enregistrement à son propriétaire (table user) */
  user_id: number;
  /** Clé étrangère reliant l'opération à sa catégorie d'imputation */
  category_id: number;
  /** Montant financier de l'opération en Dinars Tunisiens (DT) */
  amount: number;
  /** Libellé descriptif de la dépense (ex: Facture STEG, Loyer) */
  label: string;
  /** Date calendaire de l'opération au format standard ISO YYYY-MM-DD */
  date: string;
  /** Mois calendaire d'imputation budgétaire au format YYYY-MM */
  month: string;
  /** Commentaire ou observation textuelle optionnelle saisie par l'utilisateur */
  notes: string;
  created_at: string;
};

export type MonthBudgetRow = {
  id: number;
  /** Clé étrangère reliant l'enregistrement à son propriétaire (table user) */
  user_id: number;
  /** Mois calendaire d'imputation budgétaire au format YYYY-MM */
  month: string;
  /** Plafond global total alloué pour l'ensemble de la période en DT */
  total: number;
  /** Drapeau indiquant si la période a été clôturée et évaluée pour les points */
  is_evaluated: number;
  created_at: string;
};

export type CategoryBudgetRow = {
  id: number;
  /** Clé étrangère reliant l'enregistrement à son propriétaire (table user) */
  user_id: number;
  /** Mois calendaire d'imputation budgétaire au format YYYY-MM */
  month: string;
  /** Clé étrangère reliant l'opération à sa catégorie d'imputation */
  category_id: number;
  /** Montant financier de l'opération en Dinars Tunisiens (DT) */
  amount: number;
  /** Pourcentage de l'enveloppe globale alloué à cette catégorie */
  percent: number;
  created_at: string;
};

export type SettingsRow = {
  id: number;
  /** Nombre de points attribués pour chaque catégorie respectée sans dépassement */
  points_per_category: number;
  /** Bonus de points pour respect du budget global sur l'ensemble du mois */
  points_monthly_bonus: number;
  /** Bonus accordé pour la régularité et les séries de mois vertueux consécutifs */
  points_streak_bonus: number;
  /** Seuil de points requis pour l'obtention du niveau Débutant */
  threshold_beginner: number;
  /** Seuil de points requis pour l'obtention du niveau Économe */
  threshold_saver: number;
  /** Seuil de points requis pour l'obtention du niveau Expert */
  threshold_expert: number;
};

export const DEFAULT_CATEGORIES: CategoryRow[] = [
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
  { id: 11, name_key: 'Enfant', type: 'expense', icon: 'happy-outline', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Famille' },
  { id: 12, name_key: 'Aide à la famille', type: 'expense', icon: 'people-outline', default_percent: 2, is_default: 1, is_active: 1, is_system: 0, theme: 'Famille' },
  { id: 13, name_key: 'Épargne', type: 'expense', icon: 'cash-outline', default_percent: 5, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
  { id: 14, name_key: 'Dons et charité', type: 'expense', icon: 'heart-outline', default_percent: 1, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
  { id: 15, name_key: 'Frais bancaires', type: 'expense', icon: 'business-outline', default_percent: 2, is_default: 1, is_active: 1, is_system: 0, theme: 'Argent' },
  { id: 16, name_key: 'Autres', type: 'expense', icon: 'cart-outline', default_percent: 5, is_default: 1, is_active: 1, is_system: 1, theme: 'Divers' },
];

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

  category: CategoryRow[] = DEFAULT_CATEGORIES.map((c) => ({ ...c }));

  // ============================================================
  // MISSION ARCHITECTURALE : ZÉRO DONNÉE EN DUR
  // RÔLE : Catalogue de produits, achats, dépenses et budgets vierges au démarrage.
  // ============================================================
  product: ProductRow[] = [];
  purchase: PurchaseRow[] = [];
  expense: ExpenseRow[] = [];
  month_budget: MonthBudgetRow[] = [];
  category_budget: CategoryBudgetRow[] = [];
  budget: any[] = [];
  envelope: any[] = [];
  family_fund: any[] = [];
  family_allocation: any[] = [];
  money_request: any[] = [];
  family_budget: any[] = [];
  notification: any[] = [];

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
          if (parsed.category && Array.isArray(parsed.category)) {
            const defaults = DEFAULT_CATEGORIES;
            this.category = (parsed.category as CategoryRow[]).map((c: any, index: number) => {
              const defaultMatch = defaults.find((d) => d.id === c.id || String(d.id) === String(c.id));
              let nameKey = c.name_key ?? c.name ?? c.nom;
              if (typeof nameKey !== 'string' || !nameKey.trim() || !isNaN(Number(nameKey))) {
                nameKey = defaultMatch?.name_key || `Catégorie ${c.id || index + 1}`;
              }
              return {
                ...c,
                name_key: nameKey,
                type: c.type === 'expense' ? 'expense' : (defaultMatch ? defaultMatch.type : (c.type || 'product')),
                is_active: c.is_active === 0 ? 0 : 1,
              };
            });
          }
          if (parsed.product) this.product = parsed.product;
          if (parsed.purchase) this.purchase = parsed.purchase;
          if (parsed.expense) this.expense = parsed.expense;
          if (parsed.month_budget) this.month_budget = parsed.month_budget;
          if (parsed.category_budget) this.category_budget = parsed.category_budget;
          if (parsed.budget) this.budget = parsed.budget;
          if (parsed.envelope) this.envelope = parsed.envelope;
          if (parsed.family_fund) this.family_fund = parsed.family_fund;
          if (parsed.family_allocation) this.family_allocation = parsed.family_allocation;
          if (parsed.money_request) this.money_request = parsed.money_request;
          if (parsed.family_budget) this.family_budget = parsed.family_budget;
          if (parsed.notification) this.notification = parsed.notification;
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
          budget: this.budget,
          envelope: this.envelope,
          family_fund: this.family_fund,
          family_allocation: this.family_allocation,
          money_request: this.money_request,
          family_budget: this.family_budget,
          notification: this.notification,
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
    // Simulation SQL : Insertion d'un nouvel utilisateur lors de l'inscription ou initialisation
    if (s.includes('INSERT INTO USER') || s.includes('INSERT INTO UTILISATEURS')) {
      let name = params[0];
      let email = params[1];
      let hash = params[2];
      let salt = params[3] ?? DEFAULT_SALT;
      let role: 'admin' | 'user' | 'child' | 'parent' = 'user';
      let isActive = 1;
      let mustChange = 0;
      let onboardingDone = 0;
      let hashVersion = 1;
      let budget = 0;
      let langue = 'fr';
      let parentId: string | null = null;
      let familyId: string | null = null;
      let accountType: string = 'personal';
      let balance = 0;
      let allocatedTotal = 0;
      let familyName: string | null = null;

      if (params.length === 15) {
        // sqliteAddUser: [name, email, passwordHash, role, is_active, must_change_password, onboarding_done, created_at, langue, parent_id, family_id, account_type, balance, allocated_total, family_name]
        role = params[3] as any;
        isActive = params[4] ?? 1;
        mustChange = params[5] ?? 0;
        onboardingDone = params[6] ?? 0;
        langue = params[8] || 'fr';
        parentId = params[9] || null;
        familyId = params[10] || null;
        accountType = params[11] || (role === 'admin' ? 'family' : role === 'child' ? 'child' : 'personal');
        balance = Number(params[12]) || 0;
        allocatedTotal = Number(params[13]) || 0;
        familyName = params[14] || null;
      } else if (params.length === 9) {
        role = params[3] as any;
        isActive = params[4] ?? 1;
        mustChange = params[5] ?? 0;
        onboardingDone = params[6] ?? 0;
        langue = params[8] || 'fr';
        accountType = role === 'admin' ? 'family' : role === 'child' ? 'child' : 'personal';
      } else if (params.length === 5) {
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
        accountType = role === 'admin' ? 'family' : 'personal';
      } else if (params.length >= 7) {
        role = (params[3] === 'child' || params[3] === 'parent' || params[3] === 'admin') ? params[3] : (params[4] ?? 'user');
        isActive = params[5] ?? 1;
        mustChange = params[6] ?? 0;
        onboardingDone = params[7] ?? 0;
        hashVersion = params[8] ?? 1;
        budget = params[9] ?? 0;
        langue = params[10] ?? 'fr';
        accountType = role === 'admin' ? 'family' : role === 'child' ? 'child' : 'personal';
      }

      const id = (store.user.length > 0 ? Math.max(...store.user.map((u) => u.id)) : 0) + 1;
      // Ajout du nouvel utilisateur dans le tableau en mémoire
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
        parent_id: parentId,
        family_id: familyId,
        account_type: accountType,
        balance,
        allocated_total: allocatedTotal,
        family_name: familyName,
        created_at: new Date().toISOString(),
      });
      // Sauvegarde immédiate dans le localStorage pour garantir la persistance web
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // UPDATE USER
    // Simulation SQL : Mises à jour des champs de profil, mot de passe ou préférences utilisateur
    if (s.includes('UPDATE USER') || s.includes('UPDATE UTILISATEURS')) {
      const id = params[params.length - 1];
      const u = store.user.find((x) => x.id === id || String(x.id) === String(id));
      if (u) {
        if (s.includes('NAME = ?')) u.name = params[0];
        if (s.includes('EMAIL = ?')) u.email = params[0];
        if (s.includes('ROLE = ?')) u.role = params[0];
        if (s.includes('ACCOUNT_TYPE = ?')) u.account_type = params[0];
        if (s.includes('BALANCE = ?')) u.balance = Number(params[0]) || 0;
        if (s.includes('ALLOCATED_TOTAL = ?')) u.allocated_total = Number(params[0]) || 0;
        if (s.includes('FAMILY_NAME = ?')) u.family_name = params[0];
        if (s.includes('PARENT_ID = ?')) u.parent_id = params[0];
        if (s.includes('FAMILY_ID = ?')) u.family_id = params[0];
        if (s.includes('ONBOARDING_DONE = ?')) u.onboarding_done = Number(params[0]);
        if (s.includes('PASSWORD_HASH = ?')) {
          u.password_hash = params[0];
          if (s.includes('HASH_VERSION = ?')) {
            u.salt = params[1];
            u.hash_version = params[2];
            u.must_change_password = 0;
          } else {
            u.must_change_password = s.includes('MUST_CHANGE_PASSWORD = 1') ? 1 : 0;
          }
        }
        if (s.includes('IS_ACTIVE = ?')) u.is_active = Number(params[0]);
        if (s.includes('MUST_CHANGE_PASSWORD = ?')) u.must_change_password = Number(params[0]);
        if (s.includes('BUDGET_MENSUEL = ?')) u.budget_mensuel = Number(params[0]) || 0;
        if (s.includes('LANGUE = ?')) u.langue = params[0];
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // USER_CATEGORY OPERATIONS
    // Simulation SQL : Réinitialisation des associations de catégories pour un utilisateur
    if (s.includes('DELETE FROM USER_CATEGORY')) {
      const [userId] = params;
      store.user_category = store.user_category.filter((uc) => uc.user_id !== userId && String(uc.user_id) !== String(userId));
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // Simulation SQL : Activation d'une catégorie pour un utilisateur (supporte INSERT, INSERT OR IGNORE, INSERT OR REPLACE)
    if (s.includes('USER_CATEGORY') && (s.includes('INSERT') || s.includes('REPLACE'))) {
      const [userId, catId, enabled] = params;
      const numUserId = Number(userId) || 1;
      const numCatId = Number(catId) || 1;
      const exists = store.user_category.some((uc) => uc.user_id === numUserId && uc.category_id === numCatId);
      if (!exists) {
        const id = (store.user_category.length > 0 ? Math.max(...store.user_category.map((uc) => uc.id)) : 0) + 1;
        store.user_category.push({
          id,
          user_id: numUserId,
          category_id: numCatId,
          enabled: enabled ?? 1,
          created_at: new Date().toISOString(),
        });
        store.sauvegarder();
        return { lastInsertRowId: id, changes: 1 };
      }
      return { lastInsertRowId: 0, changes: 0 };
    }

    // INSERT INTO CATEGORY
    // Simulation SQL : Création d'une nouvelle catégorie dans le catalogue universel
    if (s.includes('INSERT INTO CATEGORY') || s.includes('INSERT OR IGNORE INTO CATEGORY') || s.includes('INSERT INTO CATEGORIES')) {
      let nameKey = String(params[0] ?? 'Catégorie').trim();
      if (!nameKey || !isNaN(Number(nameKey))) {
        nameKey = 'Catégorie';
      }

      // Respecter la clause OR IGNORE si la catégorie existe déjà
      if (s.includes('OR IGNORE') && store.category.some((c) => String(c.name_key).toLowerCase() === nameKey.toLowerCase())) {
        return { lastInsertRowId: 0, changes: 0 };
      }

      let catType: 'product' | 'expense' = 'product';
      let icon = 'cart-outline';
      let defPct = 0;
      let isActive = 1;
      let userId: number | null = null;
      let description: string | null = null;
      let color: string | null = null;
      let isCustom = 0;
      let scope: 'personal' | 'family' = 'personal';
      let th = 'Divers';

      if (s.includes('USER_ID') || params.length === 9) {
        // Signature: (name_key, type, icon, is_active, user_id, description, color, is_custom, scope)
        catType = params[1] === 'expense' ? 'expense' : 'product';
        icon = String(params[2] || 'cart-outline');
        isActive = Number(params[3]) ? 1 : 0;
        userId = params[4] ? Number(params[4]) : null;
        description = params[5] ? String(params[5]) : null;
        color = params[6] ? String(params[6]) : null;
        isCustom = Number(params[7]) ? 1 : 0;
        scope = params[8] === 'family' ? 'family' : 'personal';
      } else if (params.length === 5) {
        catType = params[1] === 'expense' ? 'expense' : 'product';
        icon = String(params[2] || 'cart-outline');
        defPct = Number(params[3]) || 0;
        th = params[4] ? String(params[4]) : 'Divers';
      } else if (params.length >= 4) {
        catType = params[1] === 'expense' ? 'expense' : 'product';
        icon = String(params[2] || 'cart-outline');
        defPct = Number(params[3]) || 0;
        isActive = params[5] !== undefined ? (Number(params[5]) ? 1 : 0) : 1;
        th = params[7] ? String(params[7]) : (params[4] ? String(params[4]) : 'Divers');
      }

      const id = (store.category.length > 0 ? Math.max(...store.category.map((c) => c.id)) : 0) + 1;
      // Ajout de la nouvelle catégorie dans le catalogue en mémoire
      store.category.push({
        id,
        name_key: nameKey,
        type: catType,
        icon,
        default_percent: defPct,
        is_default: 0,
        is_active: isActive,
        is_system: 0,
        theme: th,
        user_id: userId,
        description,
        color,
        is_custom: isCustom,
        scope,
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // UPDATE CATEGORY
    // Simulation SQL : Modification des propriétés d'une catégorie existante
    if (s.includes('UPDATE CATEGORY') || s.includes('UPDATE CATEGORIES')) {
      const id = params[params.length - 1];
      let cat = store.category.find((c) => c.id === id || String(c.id) === String(id));
      if (!cat && typeof id === 'string') {
        cat = store.category.find((c) => String(c.name_key).toLowerCase() === id.toLowerCase());
      }
      if (cat) {
        if (s.includes('SET IS_ACTIVE = ?')) {
          cat.is_active = Number(params[0]) ? 1 : 0;
        } else if (s.includes('SET DESCRIPTION = ?')) {
          cat.description = params[0] ? String(params[0]) : null;
        } else if (s.includes('SET COLOR = ?')) {
          cat.color = params[0] ? String(params[0]) : null;
        } else if (s.includes('SET NAME_KEY = ?')) {
          if (typeof params[0] === 'string' && params[0].trim()) {
            cat.name_key = params[0].trim();
          }
        } else if (s.includes('DEFAULT_PERCENT = ?') && s.includes('TYPE = ?')) {
          cat.default_percent = Number(params[0]) || 0;
          cat.is_default = 1;
          if (params[1]) cat.type = params[1] === 'expense' ? 'expense' : 'product';
        } else if (s.includes("TYPE = 'PRODUCT'")) {
          cat.type = 'product';
          if (params[0]) cat.theme = String(params[0]);
        } else if (s.includes("TYPE = 'EXPENSE'")) {
          cat.type = 'expense';
          cat.is_system = Number(params[0]) || 0;
          if (params[1]) cat.theme = String(params[1]);
        } else {
          // Mise à jour multi-colonnes standard
          if (typeof params[0] === 'string' && isNaN(Number(params[0])) && params[0].trim()) {
            cat.name_key = params[0].trim();
          }
          if (params.length >= 5) {
            cat.type = params[1] === 'expense' ? 'expense' : 'product';
            cat.icon = params[2] ?? cat.icon;
            cat.default_percent = Number(params[3]) || cat.default_percent;
            cat.is_active = Number(params[4]) ?? cat.is_active;
          }
        }
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // DELETE FROM CATEGORY
    if (s.includes('DELETE FROM CATEGORY')) {
      const [id] = params;
      store.category = store.category.filter((c) => c.id !== id && String(c.id) !== String(id));
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // PRODUCT OPERATIONS
    if (s.includes('INSERT INTO PRODUCT')) {
      const [name, brand, catId, unit, photoPath, userId] = params;
      const id = (store.product.length > 0 ? Math.max(...store.product.map((p) => p.id)) : 0) + 1;
      store.product.push({
        id,
        user_id: Number(userId) || 1,
        name,
        brand: brand || '',
        category_id: Number(catId) || 1,
        photo_path: photoPath || '',
        unit: unit || 'pièce',
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.includes('UPDATE PRODUCT')) {
      const id = params[params.length - 1];
      const p = store.product.find((x) => x.id === id || String(x.id) === String(id));
      if (p) {
        if (s.includes('NAME = ?')) p.name = params[0];
        if (s.includes('BRAND = ?')) p.brand = params[0];
        if (s.includes('CATEGORY_ID = ?')) p.category_id = Number(params[0]) || 1;
        if (s.includes('UNIT = ?')) p.unit = params[0];
        if (s.includes('PHOTO_PATH = ?')) p.photo_path = params[0];
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('DELETE FROM PRODUCT')) {
      const [id] = params;
      store.product = store.product.filter((p) => p.id !== id && String(p.id) !== String(id));
      store.purchase = store.purchase.filter((p) => p.product_id !== id && String(p.product_id) !== String(id));
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // DELETE FROM USER
    if (s.includes('DELETE FROM USER')) {
      const [id] = params;
      store.user = store.user.filter((u) => u.id !== id && String(u.id) !== String(id));
      store.purchase = store.purchase.filter((p) => p.user_id !== id && String(p.user_id) !== String(id));
      store.expense = store.expense.filter((e) => e.user_id !== id && String(e.user_id) !== String(id));
      store.product = store.product.filter((p) => p.user_id !== id && String(p.user_id) !== String(id));
      store.month_budget = store.month_budget.filter((b) => b.user_id !== id && String(b.user_id) !== String(id));
      store.category_budget = store.category_budget.filter((b) => b.user_id !== id && String(b.user_id) !== String(id));
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // PURCHASE OPERATIONS
    if (s.includes('INSERT INTO PURCHASE')) {
      const [prodId, userId, catId, storeName, qte, unit, price, date, month] = params;
      const id = (store.purchase.length > 0 ? Math.max(...store.purchase.map((p) => p.id)) : 0) + 1;
      store.purchase.push({
        id,
        user_id: Number(userId) || 1,
        product_id: Number(prodId) || 1,
        category_id: Number(catId) || 1,
        price: Number(price) || 0,
        quantity: Number(qte) || 1,
        unit: unit ?? 'pièce',
        store: storeName ?? 'Non précisé',
        date: date ?? new Date().toISOString().split('T')[0],
        month: month || (date ? String(date).substring(0, 7) : new Date().toISOString().substring(0, 7)),
        notes: '',
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.includes('UPDATE PURCHASE')) {
      const id = params[params.length - 1];
      const p = store.purchase.find((x) => x.id === id || String(x.id) === String(id));
      if (p) {
        if (s.includes('PRICE = ?')) p.price = Number(params[0]) || 0;
        if (s.includes('QUANTITY = ?')) p.quantity = Number(params[0]) || 1;
        if (s.includes('STORE = ?')) p.store = params[0];
        if (s.includes('DATE = ?')) {
          p.date = params[0];
          p.month = params[1] || params[0]?.substring(0, 7);
        }
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('DELETE FROM PURCHASE')) {
      const [id] = params;
      store.purchase = store.purchase.filter((p) => p.id !== id && String(p.id) !== String(id));
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // EXPENSE OPERATIONS
    if (s.includes('INSERT INTO EXPENSE')) {
      const [userId, catId, amount, label, date, month] = params;
      const id = (store.expense.length > 0 ? Math.max(...store.expense.map((e) => e.id)) : 0) + 1;
      store.expense.push({
        id,
        user_id: Number(userId) || 1,
        category_id: Number(catId) || 1,
        amount: Number(amount) || 0,
        label: label || 'Dépense',
        date: date ?? new Date().toISOString().split('T')[0],
        month: month || (date ? String(date).substring(0, 7) : new Date().toISOString().substring(0, 7)),
        notes: label || '',
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.includes('UPDATE EXPENSE')) {
      const id = params[params.length - 1];
      const e = store.expense.find((x) => x.id === id || String(x.id) === String(id));
      if (e) {
        if (s.includes('AMOUNT = ?')) e.amount = Number(params[0]) || 0;
        if (s.includes('LABEL = ?')) e.label = params[0];
        if (s.includes('CATEGORY_ID = ?')) e.category_id = Number(params[0]) || 1;
        if (s.includes('DATE = ?')) {
          e.date = params[0];
          e.month = params[1] || params[0]?.substring(0, 7);
        }
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('DELETE FROM EXPENSE')) {
      const [id] = params;
      store.expense = store.expense.filter((e) => e.id !== id && String(e.id) !== String(id));
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // BUDGET OPERATIONS
    if (s.includes('INSERT INTO BUDGET')) {
      const [userId, start, end, total] = params;
      const id = (store.budget.length > 0 ? Math.max(...store.budget.map((b: any) => b.id)) : 0) + 1;
      store.budget.push({ id, user_id: Number(userId) || 1, start_date: start, end_date: end, total: Number(total) || 0 });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    if (s.includes('UPDATE BUDGET')) {
      const [start, end, total, id] = params;
      const b = store.budget.find((x: any) => x.id === id || String(x.id) === String(id));
      if (b) {
        b.start_date = start;
        b.end_date = end;
        b.total = Number(total) || 0;
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (s.includes('MONTH_BUDGET')) {
      if (s.includes('INSERT') || s.includes('REPLACE')) {
        const [userId, month, total] = params;
        const idx = store.month_budget.findIndex((mb) => mb.user_id === Number(userId) && mb.month === month);
        const item: MonthBudgetRow = {
          id: idx >= 0 ? store.month_budget[idx].id : ((store.month_budget.length > 0 ? Math.max(...store.month_budget.map((m) => m.id)) : 0) + 1),
          user_id: Number(userId) || 1,
          month,
          total: Number(total) || 0,
          is_evaluated: 0,
          created_at: new Date().toISOString(),
        };
        if (idx >= 0) store.month_budget[idx] = item;
        else store.month_budget.push(item);
        store.sauvegarder();
        return { lastInsertRowId: item.id, changes: 1 };
      }
    }

    if (s.includes('CATEGORY_BUDGET')) {
      if (s.includes('INSERT') || s.includes('REPLACE')) {
        const [userId, month, catId, amount] = params;
        const idx = store.category_budget.findIndex((cb) => cb.user_id === Number(userId) && cb.month === month && cb.category_id === Number(catId));
        const item: CategoryBudgetRow = {
          id: idx >= 0 ? store.category_budget[idx].id : ((store.category_budget.length > 0 ? Math.max(...store.category_budget.map((c) => c.id)) : 0) + 1),
          user_id: Number(userId) || 1,
          month,
          category_id: Number(catId) || 1,
          amount: Number(amount) || 0,
          percent: 0,
          created_at: new Date().toISOString(),
        };
        if (idx >= 0) store.category_budget[idx] = item;
        else store.category_budget.push(item);
        store.sauvegarder();
        return { lastInsertRowId: item.id, changes: 1 };
      }
    }

    // FAMILY_FUND
    if (s.includes('FAMILY_FUND')) {
      if (s.includes('INSERT') || s.includes('REPLACE')) {
        const [id, parentId, balance, totalContribs, updatedAt] = params;
        const idx = store.family_fund.findIndex((f: any) => f.id === id || f.parent_id === parentId);
        const item = { id: String(id), parent_id: String(parentId), balance: Number(balance) || 0, total_contributions: Number(totalContribs) || 0, updated_at: updatedAt || new Date().toISOString() };
        if (idx >= 0) store.family_fund[idx] = item;
        else store.family_fund.push(item);
        store.sauvegarder();
        return { lastInsertRowId: 0, changes: 1 };
      }
    }

    // FAMILY_ALLOCATION
    if (s.includes('FAMILY_ALLOCATION')) {
      if (s.includes('DELETE FROM')) {
        const [id] = params;
        store.family_allocation = store.family_allocation.filter((a: any) => a.id !== id && String(a.id) !== String(id));
        store.sauvegarder();
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (s.includes('UPDATE')) {
        const id = params[params.length - 1];
        const a = store.family_allocation.find((x: any) => x.id === id || String(x.id) === String(id));
        if (a) {
          if (s.includes('AMOUNT = ?')) a.amount = Number(params[0]) || 0;
          if (s.includes('NOTE = ?')) a.note = params[0];
          if (s.includes('DATE = ?')) a.date = params[0];
          if (s.includes('CHILD_ID = ?')) {
            a.child_id = String(params[0]);
            a.child_name = params[1] || '';
          }
          store.sauvegarder();
        }
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (s.includes('INSERT') || s.includes('REPLACE')) {
        const [id, parentId, childId, childName, amount, note, date, createdAt] = params;
        const idx = store.family_allocation.findIndex((a: any) => a.id === id);
        const item = { id: String(id), parent_id: String(parentId), child_id: String(childId), child_name: childName, amount: Number(amount) || 0, note: note || null, date, created_at: createdAt || new Date().toISOString() };
        if (idx >= 0) store.family_allocation[idx] = item;
        else store.family_allocation.push(item);
        store.sauvegarder();
        return { lastInsertRowId: 0, changes: 1 };
      }
    }

    // MONEY_REQUEST
    if (s.includes('MONEY_REQUEST')) {
      if (s.includes('UPDATE')) {
        const [status, respondedAt, id] = params;
        const r = store.money_request.find((x: any) => x.id === id || String(x.id) === String(id));
        if (r) {
          r.status = status;
          r.responded_at = respondedAt;
          store.sauvegarder();
        }
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (s.includes('INSERT') || s.includes('REPLACE')) {
        const [id, parentId, childId, childName, amount, reason, status, date, createdAt, respondedAt] = params;
        const idx = store.money_request.findIndex((r: any) => r.id === id);
        const item = { id: String(id), parent_id: String(parentId), child_id: String(childId), child_name: childName, amount: Number(amount) || 0, reason, status, date, created_at: createdAt || new Date().toISOString(), responded_at: respondedAt || null };
        if (idx >= 0) store.money_request[idx] = item;
        else store.money_request.push(item);
        store.sauvegarder();
        return { lastInsertRowId: 0, changes: 1 };
      }
    }

    // FAMILY_BUDGET
    if (s.includes('FAMILY_BUDGET')) {
      if (s.includes('INSERT') || s.includes('REPLACE')) {
        const [id, parentId, start, end, total, allocs, createdAt] = params;
        const idx = store.family_budget.findIndex((b: any) => b.id === id);
        const item = { id: String(id), parent_id: String(parentId), start_date: start, end_date: end, total: Number(total) || 0, allocations: allocs, created_at: createdAt || new Date().toISOString() };
        if (idx >= 0) store.family_budget[idx] = item;
        else store.family_budget.push(item);
        store.sauvegarder();
        return { lastInsertRowId: 0, changes: 1 };
      }
    }

    // NOTIFICATION
    if (s.includes('NOTIFICATION')) {
      if (s.includes('UPDATE') && s.includes('IS_READ = 1')) {
        if (s.includes('USER_ID = ?')) {
          const [userId] = params;
          for (const n of store.notification) {
            if (n.user_id === userId || String(n.user_id) === String(userId)) n.is_read = 1;
          }
        } else {
          const [id] = params;
          const n = store.notification.find((x: any) => x.id === id || String(x.id) === String(id));
          if (n) n.is_read = 1;
        }
        store.sauvegarder();
        return { lastInsertRowId: 0, changes: 1 };
      }
      if (s.includes('INSERT') || s.includes('REPLACE')) {
        const [id, userId, budgetId, type, title, body, reason, actionRec, periodLabel, amount, threshold, isRead, createdAt] = params;
        const idx = store.notification.findIndex((n: any) => n.id === id);
        const item = { id: String(id), user_id: Number(userId) || 1, budget_id: budgetId, type, title, body, reason, action_recommended: actionRec, period_label: periodLabel, amount: Number(amount) || 0, threshold, is_read: isRead ?? 0, created_at: createdAt || new Date().toISOString() };
        if (idx >= 0) store.notification[idx] = item;
        else store.notification.push(item);
        store.sauvegarder();
        return { lastInsertRowId: 0, changes: 1 };
      }
    }

    store.sauvegarder();
    return { lastInsertRowId: 0, changes: 1 };
  },

  getFirstSync: <T>(sql: string, params: any[] = []): T | null => {
    const s = sql.toUpperCase();

    // SELECT BY EMAIL FROM USER
    // Simulation SQL : Recherche d'un utilisateur par son adresse e-mail
    if (s.includes('FROM USER WHERE EMAIL = ?') || s.includes('FROM UTILISATEURS WHERE EMAIL = ?')) {
      // Extraction du paramètre e-mail depuis la liste des arguments de requête
      const [email] = params;
      // Recherche de l'utilisateur dans le tableau des utilisateurs en mémoire
      const u = store.user.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
      // Si aucun utilisateur n'est trouvé, renvoi de null (résultat vide)
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
    // Simulation SQL : Recherche d'un utilisateur par son identifiant unique
    if (s.includes('FROM USER WHERE ID = ?') || s.includes('FROM UTILISATEURS WHERE ID = ?')) {
      // Extraction de l'identifiant unique depuis les arguments de la requête
      const [id] = params;
      // Recherche de l'utilisateur dans le tableau des utilisateurs en mémoire
      const u = store.user.find((x) => x.id === id);
      // Si aucun utilisateur n'est trouvé, renvoi de null (résultat vide)
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
    // Simulation SQL : Récupération des règles et paramètres de gamification
    if (s.includes('FROM SETTINGS')) {
      return store.settings as unknown as T;
    }

    // SELECT FROM CATEGORY
    if (s.includes('FROM CATEGORY') || s.includes('FROM CATEGORIES')) {
      const [p1, p2] = params;
      const target = p1 !== undefined ? String(p1).toLowerCase() : '';
      const target2 = p2 !== undefined ? String(p2).toLowerCase() : target;
      const cat = store.category.find(
        (c) =>
          String(c.id).toLowerCase() === target ||
          String(c.id).toLowerCase() === target2 ||
          String(c.name_key).toLowerCase() === target ||
          String(c.name_key).toLowerCase() === target2
      );
      if (!cat) return null;
      return {
        ...cat,
        nom: cat.name_key,
        icone: cat.icon,
        pourcentage_defaut: cat.default_percent,
        est_defaut: cat.is_default,
        est_visible: cat.is_active,
        est_systeme: cat.is_system,
      } as unknown as T;
    }

    return null;
  },

  getAllSync: <T>(sql: string, params: any[] = []): T[] => {
    const s = sql.toUpperCase();

    // CATEGORIES
    // Simulation SQL : Récupération du catalogue de catégories avec alias
    if (s.includes('FROM CATEGORY') || s.includes('FROM CATEGORIES')) {
      return store.category.map((c) => {
        const cleanName = typeof c.name_key === 'string' && isNaN(Number(c.name_key)) && c.name_key.trim()
          ? c.name_key.trim()
          : (DEFAULT_CATEGORIES.find((d) => d.id === c.id)?.name_key || `Catégorie ${c.id}`);
        return {
          ...c,
          name_key: cleanName,
          nom: cleanName,
          icone: c.icon,
          pourcentage_defaut: c.default_percent,
          est_defaut: c.is_default,
          est_visible: c.is_active,
          est_systeme: c.is_system,
        };
      }) as unknown as T[];
    }

    // USER CATEGORIES
    // Simulation SQL : Récupération des catégories activées pour l'utilisateur
    if (s.includes('FROM USER_CATEGORY')) {
      // Extraction de l'identifiant utilisateur pour filtrer les données associées
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
        role: u.role || 'user',
        parent_id: u.parent_id || null,
        family_id: u.family_id || null,
        account_type: u.account_type || (u.role === 'admin' ? 'family' : u.role === 'child' ? 'child' : 'personal'),
        balance: u.balance || 0,
        allocated_total: u.allocated_total || 0,
        family_name: u.family_name || null,
        onboarding_done: u.onboarding_done ?? 0,
        hash_version: u.hash_version ?? 1,
        budget_mensuel: u.budget_mensuel ?? 0,
        langue: u.langue ?? 'fr',
        created_at: u.created_at || new Date().toISOString(),
      })) as unknown as T[];
    }

    // FAMILY TABLES
    if (s.includes('FROM FAMILY_FUND')) {
      return store.family_fund as unknown as T[];
    }

    if (s.includes('FROM FAMILY_ALLOCATION')) {
      return store.family_allocation as unknown as T[];
    }

    if (s.includes('FROM MONEY_REQUEST')) {
      return store.money_request as unknown as T[];
    }

    if (s.includes('FROM FAMILY_BUDGET')) {
      return store.family_budget as unknown as T[];
    }

    if (s.includes('FROM NOTIFICATION')) {
      return store.notification as unknown as T[];
    }

    // PRODUCTS
    // Simulation SQL : Récupération des produits enregistrés avec métadonnées
    if (s.includes('FROM PRODUCT') || s.includes('FROM PRODUITS')) {
      return store.product.map((p) => {
      // Recherche de la catégorie correspondante dans le tableau en mémoire
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
    // Simulation SQL : Transformation des budgets mensuels en périodes calendaires précises
    if (s.includes('FROM BUDGET')) {
      if (store.budget && store.budget.length > 0) {
        return store.budget as unknown as T[];
      }
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
    // Simulation SQL : Récupération des enveloppes allouées par catégorie
    if (s.includes('FROM CATEGORY_BUDGET')) {
      // Récupération des allocations filtrées par utilisateur si fourni
      // Extraction de l'identifiant utilisateur pour filtrer les données associées
      const [userId] = params;
      const rows = store.category_budget.filter(
        (cb) => userId === undefined || cb.user_id === userId
      );
      return rows as unknown as T[];
    }

    // PURCHASES (Achats de produits détaillés)
    // Simulation SQL : Récupération de l'historique des achats de produits
    if (s.includes('FROM PURCHASE')) {
      return store.purchase as unknown as T[];
    }

    // EXPENSES (Dépenses directes)
    // Simulation SQL : Récupération de l'historique des dépenses directes
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
