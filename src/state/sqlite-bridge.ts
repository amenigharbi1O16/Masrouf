// ============================================================
// FICHIER : src/state/sqlite-bridge.ts
// RÔLE    : Passerelle de persistance bidirectionnelle entre l'état
//           en mémoire de l'application (React Context / Store)
//           et la base de données SQLite locale physique (masrouf.db).
//
// CONCEPTS CLÉS :
//   1. Hydratation initiale (loadDBFromSQLite) :
//      Lit toutes les tables SQLite (user, category, budget, product, purchase, expense, settings)
//      et reconstruit l'objet d'état complet DB conforme aux types de l'application.
//      Si la base est vierge, injecte automatiquement les catégories de référence et les utilisateurs initiaux.
//
//   2. Opérations d'écriture synchrones (sqliteAdd*, sqliteUpdate*, sqliteSave*) :
//      Appelées à chaque mutation du store pour garantir une persistance immédiate sans perte de données.
//
//   3. Conformité Zéro Données Codées en Dur :
//      Toutes les entités créées ou modifiées sont fidèlement sauvegardées dans SQLite avec leurs identifiants.
// ============================================================

import { db, initDatabase } from '@/db/database';
import type {
  AppSettings,
  Budget,
  Category,
  CategoryType,
  DB,
  Expense,
  FamilyBudget,
  FamilyFund,
  InAppNotification,
  MoneyAllocation,
  MoneyRequest,
  PointsRules,
  Product,
  Purchase,
  Role,
  User,
} from './types';
import { hashPassword } from '@/utils/security';
import { getExactMonthBounds, todayISO, uid } from '@/utils/format';
import {
  isChildrenCategory,
  CANONICAL_ENFANT_ID,
  CANONICAL_ENFANT_NAME,
} from '@/utils/categoryMatching';

/**
 * Charge l'intégralité des données persistées dans la base SQLite locale.
 * Initialise le schéma relationnel et retourne un instantané typé `DB`.
 * 
 * Processus étape par étape :
 * 1. Initialise la base via `initDatabase()` (tables, triggers, index).
 * 2. Charge et hydrate les catégories (ou amorce les catégories par défaut si vide).
 * 3. Charge et hydrate les utilisateurs avec leurs catégories associées.
 * 4. Charge les budgets de périodes et les enveloppes par catégorie.
 * 5. Charge le catalogue des produits enregistrés par l'utilisateur.
 * 6. Charge les achats (purchases) associés aux produits.
 * 7. Charge les dépenses courantes (expenses).
 * 8. Charge les règles de points et de gamification depuis la table settings.
 */
export async function loadDBFromSQLite(): Promise<DB> {
  // Initialise les tables et migrations SQLite locales
  try {
    initDatabase();
  } catch (err) {
    console.warn('initDatabase notice:', err);
  }

  // ------------------------------------------------------------
  // ÉTAPE 1 : Chargement des catégories depuis la table SQLite `category`
  // ------------------------------------------------------------
  let catRows: any[] = [];
  try {
    catRows = db.getAllSync(
      'SELECT id, name_key, type, icon, default_percent, is_active, user_id, description, color, is_custom, scope, created_at FROM category'
    );
  } catch {
    catRows = db.getAllSync('SELECT id, name_key, type, icon, default_percent, is_active FROM category');
  }

  // Si la table category est vierge (premier lancement), injection des catégories par défaut
  if (catRows.length === 0) {
    const SEED_CATS = [
      ['food', 'Food', 'product', 'restaurant-outline', 33],
      ['clothing', 'Clothing and shoes', 'product', 'shirt-outline', 4],
      ['personal-care', 'Personal care', 'product', 'sparkles-outline', 4],
      ['home', 'Home and equipment', 'product', 'home-outline', 5],
      ['computer', 'Computer equipment', 'product', 'laptop-outline', 3],
      ['health', 'Health and medicines', 'product', 'medkit-outline', 5],
      ['transport', 'Transport', 'expense', 'car-outline', 10],
      ['bills', 'Bills', 'expense', 'receipt-outline', 14],
      ['education', 'Education', 'expense', 'school-outline', 4],
      ['entertainment', 'Entertainment', 'expense', 'game-controller-outline', 5],
      ['children', 'Enfant', 'expense', 'happy-outline', 3],
      ['family', 'Family support', 'expense', 'people-outline', 3],
      ['savings', 'Savings', 'expense', 'cash-outline', 4],
      ['donations', 'Donations', 'expense', 'heart-outline', 1],
      ['bank-fees', 'Bank fees', 'expense', 'business-outline', 1],
      ['other', 'Other', 'expense', 'cart-outline', 1],
    ] as const;

    for (const [idKey, name, type, icon, defPct] of SEED_CATS) {
      db.runSync(
        'INSERT OR IGNORE INTO category (name_key, type, icon, default_percent, is_default, is_active) VALUES (?, ?, ?, ?, 1, 1)',
        [name, type, icon, defPct]
      );
    }

    try {
      catRows = db.getAllSync(
        'SELECT id, name_key, type, icon, default_percent, is_active, user_id, description, color, is_custom, scope, created_at FROM category'
      );
    } catch {
      catRows = db.getAllSync('SELECT id, name_key, type, icon, default_percent, is_active FROM category');
    }
  }

  // Déduplication et harmonisation de la catégorie "Enfant" dans SQLite
  try {
    const existingCats = db.getAllSync<{ id: number; name_key: string }>('SELECT id, name_key FROM category');
    const enfantRows = existingCats.filter(
      (c) => isChildrenCategory(c.name_key) || String(c.id) === CANONICAL_ENFANT_ID
    );
    if (enfantRows.length > 0) {
      const primary = enfantRows[0];
      const primaryId = primary.id;

      // Fusionner les doublons éventuels vers l'identifiant primaire
      for (let i = 1; i < enfantRows.length; i++) {
        const dupId = enfantRows[i].id;
        try { db.runSync('UPDATE purchase SET category_id = ? WHERE category_id = ?', [primaryId, dupId]); } catch {}
        try { db.runSync('UPDATE expense SET category_id = ? WHERE category_id = ?', [primaryId, dupId]); } catch {}
        try { db.runSync('UPDATE product SET category_id = ? WHERE category_id = ?', [primaryId, dupId]); } catch {}
        try { db.runSync('UPDATE category_budget SET category_id = ? WHERE category_id = ?', [primaryId, dupId]); } catch {}
        try { db.runSync('DELETE FROM user_category WHERE category_id = ?', [dupId]); } catch {}
        try { db.runSync('DELETE FROM category WHERE id = ?', [dupId]); } catch {}
      }

      // Appliquer le libellé officiel strict "Enfant"
      try {
        db.runSync("UPDATE category SET name_key = ? WHERE id = ?", [CANONICAL_ENFANT_NAME, primaryId]);
      } catch {}

      // Recharger catRows si nécessaire
      try {
        catRows = db.getAllSync(
          'SELECT id, name_key, type, icon, default_percent, is_active, user_id, description, color, is_custom, scope, created_at FROM category'
        );
      } catch {
        catRows = db.getAllSync('SELECT id, name_key, type, icon, default_percent, is_active FROM category');
      }
    }
  } catch (err) {
    console.warn('[SQLite] Erreur harmonisation catégorie Enfant:', err);
  }

  // Transformation des enregistrements SQLite en objets Category du store
  const categories: Category[] = catRows.map((r: any) => {
    const isEnfant = isChildrenCategory(r.name_key) || String(r.id) === CANONICAL_ENFANT_ID;
    return {
      id: String(r.id),
      name: isEnfant ? CANONICAL_ENFANT_NAME : r.name_key,
      kind: r.type as 'product' | 'expense',
      active: r.is_active === 1,
      userId: r.user_id ? String(r.user_id) : undefined,
      description: r.description || undefined,
      color: r.color || undefined,
      isCustom: r.is_custom === 1,
      scope: (r.scope as 'personal' | 'family') || 'personal',
      createdAt: r.created_at || undefined,
    };
  });

  // Dictionnaire des pourcentages par défaut par identifiant de catégorie
  const defaultPercentages = Object.fromEntries(
    catRows.map((r: any) => [String(r.id), r.default_percent || 0])
  );

  // ------------------------------------------------------------
  // ÉTAPE 2 : Chargement des utilisateurs depuis la table `user`
  // ------------------------------------------------------------
  let userRows: any[] = [];
  try {
    userRows = db.getAllSync(
      'SELECT id, name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue, parent_id, family_id, account_type, balance, allocated_total, family_name FROM user'
    );
  } catch {
    userRows = db.getAllSync(
      'SELECT id, name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue FROM user'
    );
  }

  // Suppression stricte et définitive de tous les comptes avec .tn de la base SQLite
  try {
    db.runSync(`DELETE FROM user WHERE email LIKE '%.tn' COLLATE NOCASE`);
  } catch { }

  // Relecture après migration
  try {
    userRows = db.getAllSync(
      'SELECT id, name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue, parent_id, family_id, account_type, balance, allocated_total, family_name FROM user'
    );
  } catch {
    userRows = db.getAllSync(
      'SELECT id, name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue FROM user'
    );
  }

  // Vérification de la présence de chacun des 3 comptes de test essentiels
  const hasAdmin = userRows.some((u: any) => u.email.toLowerCase() === 'admin@gmail.com');
  const hasInes = userRows.some((u: any) => u.email.toLowerCase() === 'ines.benali@gmail.com');
  const hasUser = userRows.some((u: any) => u.email.toLowerCase() === 'user@gmail.com');

  const adminPw = await hashPassword('Admin2026');
  const userPw = await hashPassword('Masrouf2026');

  if (!hasAdmin) {
    try {
      db.runSync(
        'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done, account_type, family_name) VALUES (?, ?, ?, ?, 1, 0, 1, ?, ?)',
        ['Administrator', 'admin@gmail.com', adminPw, 'admin', 'family', 'Famille Ben Ali']
      );
    } catch {
      db.runSync(
        'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done) VALUES (?, ?, ?, ?, 1, 0, 1)',
        ['Administrator', 'admin@gmail.com', adminPw, 'admin']
      );
    }
  }
  if (!hasInes) {
    try {
      db.runSync(
        'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done, budget_mensuel, account_type) VALUES (?, ?, ?, ?, 1, 0, 1, 1200, ?)',
        ['Ines Ben Ali', 'ines.benali@gmail.com', userPw, 'user', 'personal']
      );
    } catch {
      db.runSync(
        'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done, budget_mensuel) VALUES (?, ?, ?, ?, 1, 0, 1, 1200)',
        ['Ines Ben Ali', 'ines.benali@gmail.com', userPw, 'user']
      );
    }
  }
  if (!hasUser) {
    try {
      db.runSync(
        'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done, budget_mensuel, account_type) VALUES (?, ?, ?, ?, 1, 0, 1, 1200, ?)',
        ['Utilisateur Test', 'user@gmail.com', userPw, 'user', 'personal']
      );
    } catch {
      db.runSync(
        'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done, budget_mensuel) VALUES (?, ?, ?, ?, 1, 0, 1, 1200)',
        ['Utilisateur Test', 'user@gmail.com', userPw, 'user']
      );
    }
  }

  // Déverrouillage automatique et activation garantie de tous les comptes de démonstration
  db.runSync(
    "UPDATE user SET is_active = 1, must_change_password = 0, onboarding_done = 1 WHERE email IN ('admin@gmail.com', 'ines.benali@gmail.com', 'user@gmail.com') COLLATE NOCASE"
  );

  // Rechargement des enregistrements à jour
  try {
    userRows = db.getAllSync(
      'SELECT id, name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue, parent_id, family_id, account_type, balance, allocated_total, family_name FROM user'
    );
  } catch {
    userRows = db.getAllSync(
      'SELECT id, name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue FROM user'
    );
  }

  // Transformation des profils utilisateurs et récupération de leurs catégories choisies
  const users: User[] = userRows.map((u: any) => {
    const isTestAccount = ['admin@gmail.com', 'ines.benali@gmail.com', 'user@gmail.com'].includes(u.email.toLowerCase());
    const uCatRows = db.getAllSync<{ category_id: number }>(
      'SELECT category_id FROM user_category WHERE user_id = ? AND enabled = 1',
      [u.id]
    );
    const role: Role = u.role === 'admin' ? 'admin' : u.role === 'child' ? 'child' : 'user';
    const isFamily = role === 'admin' || u.account_type === 'family';
    return {
      id: String(u.id),
      name: u.name,
      email: u.email,
      passwordHash: u.password_hash,
      role,
      active: isTestAccount ? true : u.is_active === 1,
      mustChangePassword: isTestAccount ? false : u.must_change_password === 1,
      onboarded: isTestAccount ? true : u.onboarding_done === 1,
      categoryIds: uCatRows.map((c) => String(c.category_id)),
      celebratedBudgetIds: [],
      createdAt: u.created_at || todayISO(),
      langue: u.langue || 'fr',
      parentId: u.parent_id ? String(u.parent_id) : undefined,
      familyId: u.family_id ? String(u.family_id) : (isFamily ? `fam-${u.id}` : undefined),
      accountType: u.account_type || (role === 'admin' ? 'family' : role === 'child' ? 'child' : 'personal'),
      balance: Number(u.balance) || 0,
      allocatedTotal: Number(u.allocated_total) || 0,
      familyName: u.family_name || (isFamily ? 'Famille Ben Ali' : undefined),
    };
  });

  // ------------------------------------------------------------
  // ÉTAPE 3 : Chargement des budgets et enveloppes de catégories
  // ------------------------------------------------------------
  // Tableau de stockage des périodes de budget chargées en mémoire
  let budgets: Budget[] = [];
  try {
    // Récupération de tous les budgets déclarés dans SQLite
    const budgetRows = db.getAllSync<{
      id: number;
      user_id: number;
      start_date?: string;
      end_date?: string;
      month?: string;
      total: number;
    }>('SELECT * FROM budget');

    // Parcours de chaque ligne de budget trouvée
    for (const b of budgetRows) {
      // Conservation fidèle des dates de début et fin de période personnalisée
      const start = b.start_date || (b.month ? `${b.month}-01` : todayISO());
      const end = b.end_date || getExactMonthBounds(start).end;
      const monthPrefix = start.slice(0, 7);
      // Tentative de lecture des enveloppes précises pour ce mois dans category_budget
      let allocRows = db.getAllSync<{ category_id: number; amount: number }>(
        'SELECT category_id, amount FROM category_budget WHERE user_id = ? AND month = ?',
        [b.user_id, monthPrefix]
      );
      // Si aucune ligne trouvée, recherche dans la table relationnelle envelope
      if (allocRows.length === 0) {
        // Requête dans la table envelope par budget_id
        allocRows = db.getAllSync<{ category_id: number; amount: number }>(
          'SELECT category_id, amount FROM envelope WHERE budget_id = ?',
          [b.id]
        );
      }
      // Si toujours vide, repli sur l'ensemble des catégories allouées à cet utilisateur
      if (allocRows.length === 0) {
        // Requête globale par user_id
        allocRows = db.getAllSync<{ category_id: number; amount: number }>(
          'SELECT category_id, amount FROM category_budget WHERE user_id = ?',
          [b.user_id]
        );
      }
      // Dictionnaire associatif identifiant catégorie -> montant alloué en DT
      const allocations: Record<string, number> = {};
      // Remplissage du dictionnaire pour chaque enveloppe
      for (const a of allocRows) {
        allocations[String(a.category_id)] = a.amount;
      }
      
      const budgetItem: Budget = {
        id: String(b.id),
        userId: String(b.user_id),
        start,
        end,
        total: b.total,
        allocations,
      };

      // Un seul budget par identifiant ou par période identique
      const existingIdx = budgets.findIndex(
        (x) => x.id === budgetItem.id || (x.userId === budgetItem.userId && x.start === budgetItem.start && x.end === budgetItem.end)
      );
      if (existingIdx >= 0) {
        budgets[existingIdx] = budgetItem;
      } else {
        budgets.push(budgetItem);
      }
    }
  } catch {
    // Si la table budget n'a pas encore de lignes ou erreur
  }

  // ============================================================
  // MISSION ARCHITECTURALE : ZÉRO DONNÉE EN DUR DANS L'APPLICATION
  // RÔLE : Aucun budget n'est injecté automatiquement.
  //        L'utilisateur crée ses propres périodes et budgets dans le calendrier.
  // ============================================================

  // ------------------------------------------------------------
  // ÉTAPE 4 : Chargement du catalogue de produits
  // ------------------------------------------------------------
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
  } catch { }

  // ------------------------------------------------------------
  // ÉTAPE 5 : Chargement des achats détaillés (purchases)
  // ------------------------------------------------------------
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
  } catch { }

  // ------------------------------------------------------------
  // ÉTAPE 6 : Chargement des dépenses directes (expenses)
  // ------------------------------------------------------------
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
  } catch { }

  // ------------------------------------------------------------
  // ÉTAPE 7 : Chargement des règles de points et configuration
  // ------------------------------------------------------------
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
  } catch { }

  // Types de catégories (produit avec suivi de prix unitaire ou dépense forfaitaire)
  const categoryTypes: CategoryType[] = [
    { kind: 'product', label: 'Products', description: 'Articles achetés au quotidien avec suivi du prix unitaire.' },
    { kind: 'expense', label: 'Expenses', description: 'Dépenses courantes sans produit spécifique.' },
  ];

  // ------------------------------------------------------------
  // ÉTAPE 8 : Chargement des notifications persistées (notification)
  // ------------------------------------------------------------
  let notifications: InAppNotification[] = [];
  try {
    const notifRows = db.getAllSync<{
      id: string;
      user_id: number;
      budget_id?: number;
      type: string;
      title: string;
      body: string;
      reason: string;
      action_recommended: string;
      period_label: string;
      amount?: number;
      threshold?: number;
      is_read: number;
      created_at: string;
    }>('SELECT * FROM notification ORDER BY created_at DESC');

    notifications = notifRows.map((n) => ({
      id: String(n.id),
      userId: String(n.user_id),
      type: n.type as any,
      title: n.title,
      body: n.body,
      periodLabel: n.period_label,
      periodId: String(n.budget_id || ''),
      amountSpent: n.amount || 0,
      budgetTotal: 0,
      actionRecommended: n.action_recommended,
      isRead: n.is_read === 1,
      createdAt: n.created_at,
    }));
  } catch { }

  // ------------------------------------------------------------
  // ÉTAPE 9 : Chargement du système familial (fonds, allocations, demandes, budgets)
  // ------------------------------------------------------------
  let familyFunds: FamilyFund[] = [];
  try {
    const fundRows = db.getAllSync<{
      id: string;
      parent_id: string;
      balance: number;
      total_contributions: number;
      updated_at: string;
    }>('SELECT * FROM family_fund');
    familyFunds = fundRows.map((f) => ({
      id: String(f.id),
      parentId: String(f.parent_id),
      balance: Number(f.balance) || 0,
      totalContributions: Number(f.total_contributions) || 0,
      updatedAt: f.updated_at || todayISO(),
    }));
  } catch { }

  let allocations: MoneyAllocation[] = [];
  try {
    const allocRows = db.getAllSync<{
      id: string;
      parent_id: string;
      child_id: string;
      child_name: string;
      amount: number;
      note?: string;
      date: string;
      created_at: string;
    }>('SELECT * FROM family_allocation ORDER BY created_at DESC');
    allocations = allocRows.map((a) => ({
      id: String(a.id),
      parentId: String(a.parent_id),
      childId: String(a.child_id),
      childName: a.child_name,
      amount: Number(a.amount) || 0,
      note: a.note || undefined,
      date: a.date || todayISO(),
      createdAt: a.created_at || todayISO(),
    }));
  } catch { }

  let moneyRequests: MoneyRequest[] = [];
  try {
    const reqRows = db.getAllSync<{
      id: string;
      parent_id: string;
      child_id: string;
      child_name: string;
      amount: number;
      reason: string;
      status: string;
      date: string;
      created_at: string;
      responded_at?: string;
    }>('SELECT * FROM money_request ORDER BY created_at DESC');
    moneyRequests = reqRows.map((r) => ({
      id: String(r.id),
      parentId: String(r.parent_id),
      childId: String(r.child_id),
      childName: r.child_name,
      amount: Number(r.amount) || 0,
      reason: r.reason,
      status: (r.status as 'pending' | 'approved' | 'rejected') || 'pending',
      date: r.date || todayISO(),
      createdAt: r.created_at || todayISO(),
      respondedAt: r.responded_at || undefined,
    }));
  } catch { }

  let familyBudgets: FamilyBudget[] = [];
  try {
    const fbRows = db.getAllSync<{
      id: string;
      parent_id: string;
      start_date: string;
      end_date: string;
      total: number;
      allocations: string;
      created_at: string;
    }>('SELECT * FROM family_budget');
    familyBudgets = fbRows.map((b) => ({
      id: String(b.id),
      parentId: String(b.parent_id),
      start: b.start_date,
      end: b.end_date,
      total: Number(b.total) || 0,
      allocations: b.allocations ? JSON.parse(b.allocations) : {},
      createdAt: b.created_at || todayISO(),
    }));
  } catch { }

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
    notifications,
    sessionUserId: null,
    familyFunds,
    allocations,
    moneyRequests,
    familyBudgets,
  };
}

// ============================================================
// OPÉRATIONS D'ÉCRITURE SQLITE SYNCHRONES (PERSISTANCE PHYSIQUE)
// ============================================================

/**
 * Insère un nouvel utilisateur dans la table SQLite `user`.
 * @param user Objet utilisateur complet contenant le hash de mot de passe.
 */
export function sqliteAddUser(user: User): string {
  try {
    const res = db.runSync(
      'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue, parent_id, family_id, account_type, balance, allocated_total, family_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        user.name,
        user.email,
        user.passwordHash,
        user.role,
        user.active ? 1 : 0,
        user.mustChangePassword ? 1 : 0,
        user.onboarded ? 1 : 0,
        user.createdAt,
        user.langue || 'fr',
        user.parentId || null,
        user.familyId || null,
        user.accountType || (user.role === 'admin' ? 'family' : user.role === 'child' ? 'child' : 'personal'),
        user.balance || 0,
        user.allocatedTotal || 0,
        user.familyName || null,
      ]
    );
    return String(res.lastInsertRowId);
  } catch (e) {
    try {
      const res = db.runSync(
        'INSERT INTO user (name, email, password_hash, role, is_active, must_change_password, onboarding_done, created_at, langue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [user.name, user.email, user.passwordHash, user.role, user.active ? 1 : 0, user.mustChangePassword ? 1 : 0, user.onboarded ? 1 : 0, user.createdAt, user.langue || 'fr']
      );
      return String(res.lastInsertRowId);
    } catch (err) {
      console.warn('sqliteAddUser error:', err);
      return user.id;
    }
  }
}

/**
 * Met à jour les champs d'un utilisateur existant dans la table SQLite `user`.
 * @param id Identifiant numérique ou chaîne de l'utilisateur.
 * @param patch Modifications partielles (nom, mot de passe, statut actif, onboarding, langue, solde, etc.).
 */
export function sqliteUpdateUser(id: string, patch: Partial<User>): void {
  try {
    let numId = Number(id);
    if (!Number.isFinite(numId) || numId <= 0) {
      const uRow = db.getFirstSync<{ id: number }>('SELECT id FROM user WHERE email = ?', [id]);
      if (uRow?.id) numId = uRow.id;
    }
    if (!Number.isFinite(numId) || numId <= 0) return;
    if (patch.name !== undefined) {
      db.runSync('UPDATE user SET name = ? WHERE id = ?', [patch.name, numId]);
    }
    if (patch.email !== undefined) {
      db.runSync('UPDATE user SET email = ? WHERE id = ?', [patch.email, numId]);
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
    if (patch.langue !== undefined) {
      db.runSync('UPDATE user SET langue = ? WHERE id = ?', [patch.langue, numId]);
    }
    if (patch.balance !== undefined) {
      try {
        db.runSync('UPDATE user SET balance = ? WHERE id = ?', [patch.balance, numId]);
      } catch { }
    }
    if (patch.allocatedTotal !== undefined) {
      try {
        db.runSync('UPDATE user SET allocated_total = ? WHERE id = ?', [patch.allocatedTotal, numId]);
      } catch { }
    }
    if (patch.familyName !== undefined) {
      try {
        db.runSync('UPDATE user SET family_name = ? WHERE id = ?', [patch.familyName, numId]);
      } catch { }
    }
  } catch (e) {
    console.warn('sqliteUpdateUser error:', e);
  }
}

/**
 * Enregistre les catégories actives choisies par l'utilisateur dans `user_category`.
 * Réinitialise d'abord les anciennes liaisons puis réinsère les catégories sélectionnées.
 * @param userId Identifiant de l'utilisateur.
 * @param categoryIds Liste des identifiants de catégories sélectionnées.
 */
export function sqliteSetUserCategories(userId: string, categoryIds: string[]): void {
  try {
    let numUserId = Number(userId);
    if (!Number.isFinite(numUserId) || numUserId <= 0) {
      const uRow = db.getFirstSync<{ id: number }>('SELECT id FROM user WHERE email = ?', [userId]);
      if (uRow?.id) numUserId = uRow.id;
    }
    if (!Number.isFinite(numUserId) || numUserId <= 0) return;

    db.runSync('DELETE FROM user_category WHERE user_id = ?', [numUserId]);
    for (const catId of categoryIds) {
      let numCatId = Number(catId);
      if (!Number.isFinite(numCatId) || numCatId <= 0) {
        const row = db.getFirstSync<{ id: number }>(
          'SELECT id FROM category WHERE name_key = ? COLLATE NOCASE',
          [catId]
        );
        if (row?.id) numCatId = row.id;
      }
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

/**
 * Enregistre ou met à jour un budget de période et ses enveloppes dans SQLite.
 * Écrit à la fois dans `budget` (périodes personnalisées) et `month_budget` (mensuel).
 * @param budget Objet budget avec dates, total et dictionnaire d'allocations par catégorie.
 * @returns Identifiant de la ligne budget créée ou mise à jour.
 */
export function sqliteSaveBudget(budget: Budget): string {
  try {
    const numUserId = Number(budget.userId);
    // Conservation fidèle des dates exactes de la période choisie par l'utilisateur
    const start = budget.start;
    const end = budget.end;
    const month = start.slice(0, 7);
    let budgetDbId: number | null = Number(budget.id) || null;

    // 1. Table budget (périodes personnalisées avec dates libres)
    try {
      let existing: { id: number } | null = null;
      if (budgetDbId) {
        existing = db.getFirstSync<{ id: number }>(
          'SELECT id FROM budget WHERE id = ?',
          [budgetDbId]
        );
      }
      if (!existing) {
        existing = db.getFirstSync<{ id: number }>(
          'SELECT id FROM budget WHERE user_id = ? AND start_date = ? AND end_date = ?',
          [numUserId, start, end]
        );
      }
      if (existing) {
        budgetDbId = existing.id;
        db.runSync(
          'UPDATE budget SET start_date = ?, end_date = ?, total = ? WHERE id = ?',
          [start, end, budget.total, existing.id]
        );
      } else {
        const res = db.runSync(
          'INSERT INTO budget (user_id, start_date, end_date, total) VALUES (?, ?, ?, ?)',
          [numUserId, start, end, budget.total]
        );
        budgetDbId = res.lastInsertRowId;
      }
    } catch { }

    // 2. Table envelope (enveloppes de la période)
    if (budgetDbId) {
      try {
        db.runSync('DELETE FROM envelope WHERE budget_id = ?', [budgetDbId]);
        for (const [catIdStr, montant] of Object.entries(budget.allocations)) {
          const numCatId = Number(catIdStr);
          if (numCatId > 0) {
            db.runSync(
              'INSERT OR REPLACE INTO envelope (budget_id, category_id, amount) VALUES (?, ?, ?)',
              [budgetDbId, numCatId, montant]
            );
          }
        }
      } catch { }
    }

    // 3. Table month_budget (regroupement calendaire mensuel)
    try {
      db.runSync(
        'INSERT OR REPLACE INTO month_budget (user_id, month, total) VALUES (?, ?, ?)',
        [numUserId, month, budget.total]
      );
    } catch { }

    // 4. Table category_budget : montants alloués par catégorie
    for (const [catIdStr, montant] of Object.entries(budget.allocations)) {
      const numCatId = Number(catIdStr);
      if (numCatId > 0) {
        db.runSync(
          'INSERT OR REPLACE INTO category_budget (user_id, month, category_id, amount) VALUES (?, ?, ?, ?)',
          [numUserId, month, numCatId, montant]
        );
      }
    }
    return String(budgetDbId || budget.id);
  } catch (e) {
    console.warn('sqliteSaveBudget error:', e);
    return budget.id;
  }
}

/**
 * Insère un nouvel article dans le catalogue produit (`product`).
 * @param product Objet produit avec nom, marque, catégorie, unité et photo optionnelle.
 * @returns Identifiant persistant du produit dans SQLite.
 */
export function sqliteAddProduct(product: Product): string {
  try {
    // Insertion dans la table relationnelle product avec association à l'utilisateur (user_id)
    const res = db.runSync(
      'INSERT INTO product (name, brand, category_id, unit, photo_path, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [product.name, product.brand, Number(product.categoryId) || 1, product.unit, product.photo || '', Number(product.userId) || 1]
    );
    return String(res.lastInsertRowId);
  } catch (e) {
    console.warn('sqliteAddProduct error:', e);
    return product.id;
  }
}

/**
 * Modifie les caractéristiques d'un produit existant dans `product`.
 * @param id Identifiant du produit.
 * @param patch Données partielles à mettre à jour.
 */
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

/**
 * Enregistre un achat d'article dans la table `purchase` pour le calcul des prix unitaires.
 * @param purchase Objet achat contenant prix, quantité, magasin et date.
 * @returns Identifiant persistant de l'achat dans SQLite.
 */
export function sqliteAddPurchase(purchase: Purchase): string {
  try {
    const month = purchase.date.substring(0, 7);
    // Recherche de la catégorie du produit pour respecter la contrainte NOT NULL de purchase.category_id
    const prodRow = db.getFirstSync<{ category_id: number }>(
      'SELECT category_id FROM product WHERE id = ?',
      [Number(purchase.productId) || 1]
    );
    const categoryId = prodRow?.category_id ?? 1;
    const res = db.runSync(
      'INSERT INTO purchase (product_id, user_id, category_id, store, quantity, unit, price, date, month) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [Number(purchase.productId) || 1, Number(purchase.userId) || 1, categoryId, purchase.store, purchase.quantity, purchase.unit, purchase.price, purchase.date, month]
    );
    return String(res.lastInsertRowId);
  } catch (e) {
    console.warn('sqliteAddPurchase error:', e);
    return purchase.id;
  }
}

/**
 * Met à jour un achat enregistré dans la table `purchase`.
 * @param id Identifiant de l'achat.
 * @param patch Champs modifiés (prix, quantité, magasin, date).
 */
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

/**
 * Enregistre une dépense forfaitaire courante dans la table `expense`.
 * @param expense Objet dépense contenant montant, catégorie, note et date.
 */
/**
 * MISSION DE LA FONCTION : sqliteAddExpense
 *   Enregistre une dépense forfaitaire courante dans la table relationnelle `expense`.
 * RÔLE DANS L'APPLICATION :
 *   Insère le montant, l'utilisateur, la catégorie résolue et la date dans SQLite.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Met à jour immédiatement le solde consommé et le montant restant de l'enveloppe budgétaire.
 * @returns Identifiant persistant de la dépense dans SQLite.
 */
export function sqliteAddExpense(expense: Expense): string {
  try {
    // Calcul de la période mensuelle au format AAAA-MM
    const month = expense.date.substring(0, 7);
    // Résolution numérique de l'identifiant de catégorie
    let catId = Number(expense.categoryId);
    // Si l'identifiant n'est pas un nombre direct (ex: clé slug 'food' ou 'bills')
    if (!Number.isFinite(catId) || catId <= 0) {
      // Recherche de l'ID numérique correspondant dans la table category
      const row = db.getFirstSync<{ id: number }>(
        'SELECT id FROM category WHERE name_key = ? COLLATE NOCASE',
        [expense.categoryId]
      );
      // Affectation de l'ID trouvé ou repli sur 1
      catId = row?.id ?? 1;
    }
    // Insertion persistante dans la table expense
    const res = db.runSync(
      'INSERT INTO expense (user_id, category_id, amount, label, date, month) VALUES (?, ?, ?, ?, ?, ?)',
      [Number(expense.userId) || 1, catId, expense.amount, expense.note, expense.date, month]
    );
    return String(res.lastInsertRowId);
  } catch (e) {
    // Journalisation de sécurité en cas d'erreur SQLite
    console.warn('sqliteAddExpense error:', e);
    return expense.id;
  }
}

/**
 * Met à jour une dépense existante dans la table `expense`.
 * @param id Identifiant de la dépense.
 * @param patch Données modifiées (montant, note, date, catégorie).
 */
export function sqliteUpdateExpense(id: string, patch: Partial<Expense>): void {
  try {
    const numId = Number(id);
    if (patch.amount !== undefined) {
      db.runSync('UPDATE expense SET amount = ? WHERE id = ?', [patch.amount, numId]);
    }
    if (patch.note !== undefined) {
      db.runSync('UPDATE expense SET label = ? WHERE id = ?', [patch.note, numId]);
    }
    if (patch.categoryId !== undefined) {
      const numCat = Number(patch.categoryId) || null;
      db.runSync('UPDATE expense SET category_id = ? WHERE id = ?', [numCat, numId]);
    }
    if (patch.date !== undefined) {
      db.runSync('UPDATE expense SET date = ?, month = ? WHERE id = ?', [patch.date, patch.date.substring(0, 7), numId]);
    }
  } catch (e) {
    console.warn('sqliteUpdateExpense error:', e);
  }
}

/**
 * Supprime une dépense physique de la table `expense`.
 * @param id Identifiant de la dépense à supprimer.
 */
export function sqliteDeleteExpense(id: string): boolean {
  try {
    const numId = Number(id);
    db.runSync('DELETE FROM expense WHERE id = ?', [numId]);
    return true;
  } catch (e) {
    console.warn('sqliteDeleteExpense error:', e);
    return false;
  }
}

/**
 * Supprime un achat de produit de la table `purchase`.
 * @param id Identifiant de l'achat à supprimer.
 */
export function sqliteDeletePurchase(id: string): boolean {
  try {
    const numId = Number(id);
    db.runSync('DELETE FROM purchase WHERE id = ?', [numId]);
    return true;
  } catch (e) {
    console.warn('sqliteDeletePurchase error:', e);
    return false;
  }
}

/**
 * Insère une nouvelle catégorie créée par l'utilisateur ou le parent dans `category`.
 * @param cat Nouvelle catégorie avec nom, type ('product' ou 'expense'), statut actif, couleur, description, etc.
 * @returns Identifiant persistant de la catégorie dans SQLite.
 */
export function sqliteAddCategory(cat: Category): string {
  try {
    const res = db.runSync(
      'INSERT INTO category (name_key, type, icon, is_active, user_id, description, color, is_custom, scope) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        cat.name,
        cat.kind,
        'cart-outline',
        cat.active ? 1 : 0,
        cat.userId ? Number(cat.userId) || null : null,
        cat.description || null,
        cat.color || null,
        cat.isCustom ? 1 : 0,
        cat.scope || 'personal',
      ]
    );
    return String(res.lastInsertRowId);
  } catch (e) {
    try {
      const res = db.runSync(
        'INSERT INTO category (name_key, type, icon, is_active) VALUES (?, ?, ?, ?)',
        [cat.name, cat.kind, 'cart-outline', cat.active ? 1 : 0]
      );
      return String(res.lastInsertRowId);
    } catch (err) {
      console.warn('sqliteAddCategory error:', err);
      return cat.id;
    }
  }
}

/**
 * Modifie le libellé ou l'état actif/inactif d'une catégorie dans `category`.
 * @param id Identifiant de la catégorie.
 * @param patch Modifications partielles du libellé, description, couleur ou statut.
 */
export function sqliteUpdateCategory(id: string, patch: Partial<Category>): void {
  try {
    const numId = Number(id);
    if (patch.name !== undefined) {
      db.runSync('UPDATE category SET name_key = ? WHERE id = ?', [patch.name, numId]);
    }
    if (patch.active !== undefined) {
      db.runSync('UPDATE category SET is_active = ? WHERE id = ?', [patch.active ? 1 : 0, numId]);
    }
    if (patch.description !== undefined) {
      try {
        db.runSync('UPDATE category SET description = ? WHERE id = ?', [patch.description, numId]);
      } catch { }
    }
    if (patch.color !== undefined) {
      try {
        db.runSync('UPDATE category SET color = ? WHERE id = ?', [patch.color, numId]);
      } catch { }
    }
  } catch (e) {
    console.warn('sqliteUpdateCategory error:', e);
  }
}

/**
 * Supprime une catégorie personnalisée de la table SQLite si elle n'est pas utilisée.
 * @param id Identifiant de la catégorie.
 */
export function sqliteDeleteCategory(id: string): boolean {
  try {
    const numId = Number(id);
    // Vérifier si la catégorie est une catégorie système
    const cat = db.getFirstSync<{ is_system: number }>('SELECT is_system FROM category WHERE id = ?', [numId]);
    if (cat && cat.is_system === 1) {
      return false; // Catégorie système protégée
    }

    // Vérifier si elle est utilisée dans purchase ou expense
    const inPurchase = db.getFirstSync<{ id: number }>('SELECT id FROM purchase WHERE category_id = ? LIMIT 1', [numId]);
    if (inPurchase) return false;

    const inExpense = db.getFirstSync<{ id: number }>('SELECT id FROM expense WHERE category_id = ? LIMIT 1', [numId]);
    if (inExpense) return false;

    db.runSync('DELETE FROM category WHERE id = ?', [numId]);
    db.runSync('DELETE FROM user_category WHERE category_id = ?', [numId]);
    return true;
  } catch (e) {
    console.warn('sqliteDeleteCategory error:', e);
    return false;
  }
}

/**
 * Sauvegarde la réserve de fonds familiaux dans `family_fund`.
 */
export function sqliteSaveFamilyFund(fund: FamilyFund): void {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO family_fund (id, parent_id, balance, total_contributions, updated_at) VALUES (?, ?, ?, ?, ?)',
      [fund.id, fund.parentId, fund.balance, fund.totalContributions, fund.updatedAt]
    );
  } catch (e) {
    console.warn('sqliteSaveFamilyFund error:', e);
  }
}

/**
 * Enregistre une allocation / don d'argent dans `family_allocation`.
 */
export function sqliteAddAllocation(alloc: MoneyAllocation): void {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO family_allocation (id, parent_id, child_id, child_name, amount, note, date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [alloc.id, alloc.parentId, alloc.childId, alloc.childName, alloc.amount, alloc.note || null, alloc.date, alloc.createdAt]
    );
  } catch (e) {
    console.warn('sqliteAddAllocation error:', e);
  }
}

/**
 * Met à jour une allocation d'argent parent -> enfant dans `family_allocation`.
 */
export function sqliteUpdateAllocation(id: string, patch: Partial<MoneyAllocation>): boolean {
  try {
    if (patch.amount !== undefined) {
      db.runSync('UPDATE family_allocation SET amount = ? WHERE id = ?', [patch.amount, id]);
    }
    if (patch.note !== undefined) {
      db.runSync('UPDATE family_allocation SET note = ? WHERE id = ?', [patch.note, id]);
    }
    if (patch.date !== undefined) {
      db.runSync('UPDATE family_allocation SET date = ? WHERE id = ?', [patch.date, id]);
    }
    if (patch.childId !== undefined) {
      db.runSync('UPDATE family_allocation SET child_id = ?, child_name = ? WHERE id = ?', [patch.childId, patch.childName || '', id]);
    }
    return true;
  } catch (e) {
    console.warn('sqliteUpdateAllocation error:', e);
    return false;
  }
}

/**
 * Supprime une allocation d'argent dans `family_allocation`.
 */
export function sqliteDeleteAllocation(id: string): boolean {
  try {
    db.runSync('DELETE FROM family_allocation WHERE id = ?', [id]);
    return true;
  } catch (e) {
    console.warn('sqliteDeleteAllocation error:', e);
    return false;
  }
}

/**
 * Enregistre une demande d'argent soumise par un enfant dans `money_request`.
 */
export function sqliteAddMoneyRequest(req: MoneyRequest): void {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO money_request (id, parent_id, child_id, child_name, amount, reason, status, date, created_at, responded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.id, req.parentId, req.childId, req.childName, req.amount, req.reason, req.status, req.date, req.createdAt, req.respondedAt || null]
    );
  } catch (e) {
    console.warn('sqliteAddMoneyRequest error:', e);
  }
}

/**
 * Met à jour le statut d'une demande d'argent dans `money_request`.
 */
export function sqliteUpdateMoneyRequest(id: string, status: 'approved' | 'rejected', respondedAt: string): void {
  try {
    db.runSync(
      'UPDATE money_request SET status = ?, responded_at = ? WHERE id = ?',
      [status, respondedAt, id]
    );
  } catch (e) {
    console.warn('sqliteUpdateMoneyRequest error:', e);
  }
}

/**
 * Sauvegarde un budget familial dans `family_budget`.
 */
export function sqliteSaveFamilyBudget(b: FamilyBudget): void {
  try {
    db.runSync(
      'INSERT OR REPLACE INTO family_budget (id, parent_id, start_date, end_date, total, allocations, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [b.id, b.parentId, b.start, b.end, b.total, JSON.stringify(b.allocations), b.createdAt]
    );
  } catch (e) {
    console.warn('sqliteSaveFamilyBudget error:', e);
  }
}

/**
 * MISSION : sqliteSaveNotification
 * RÔLE : Persiste une alerte ou notification dans la table SQLite locale `notification`.
 * CE QUI EST AFFICHÉ : Alimente le centre de notifications et la pastille de badge dans l'en-tête.
 */
export function sqliteSaveNotification(n: InAppNotification): void {
  try {
    db.runSync(
      `INSERT OR REPLACE INTO notification (id, user_id, budget_id, type, title, body, reason, action_recommended, period_label, amount, threshold, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        n.id,
        Number(n.userId) || 1,
        n.periodId ? Number(n.periodId) || null : null,
        n.type,
        n.title,
        n.body,
        n.body,
        n.actionRecommended || '',
        n.periodLabel || '',
        n.amountSpent || 0,
        n.type === 'alert_80' ? 80 : n.type === 'alert_100' ? 100 : null,
        n.isRead ? 1 : 0,
        n.createdAt,
      ]
    );
  } catch (e) {
    console.warn('sqliteSaveNotification error:', e);
  }
}

/**
 * MISSION : sqliteMarkNotificationRead
 * RÔLE : Marque une notification spécifique comme lue (is_read = 1) dans la base SQLite.
 */
export function sqliteMarkNotificationRead(id: string): void {
  try {
    db.runSync('UPDATE notification SET is_read = 1 WHERE id = ?', [id]);
  } catch (e) {
    console.warn('sqliteMarkNotificationRead error:', e);
  }
}

/**
 * MISSION : sqliteMarkAllNotificationsRead
 * RÔLE : Marque toutes les notifications de l'utilisateur connecté comme lues dans SQLite.
 */
export function sqliteMarkAllNotificationsRead(userId: string): void {
  try {
    db.runSync('UPDATE notification SET is_read = 1 WHERE user_id = ?', [Number(userId) || 1]);
  } catch (e) {
    console.warn('sqliteMarkAllNotificationsRead error:', e);
  }
}
