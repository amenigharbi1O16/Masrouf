/**
 * FICHIER : src/state/seed.ts
 * IDENTIFIANT INVENTAIRE : FICHIER-061
 * MODULE : Données Initiales et Script d'Amorçage de la Base SQLite (Seed)
 *
 * RÔLE DU MODULE :
 * Génère le jeu de données initial inséré dans SQLite lors du tout premier démarrage de l'application :
 * 1. 16 Catégories budgétaires de référence réparties entre Produits physiques et Dépenses directes,
 *    avec une clé de répartition par défaut dont la somme fait exactement 100 %.
 * 2. Comptes de démonstration avec hachage cryptographique sécurisé SHA-256 :
 *    - Administrateur : `admin@masrouf.tn` / mot de passe : `Admin2026` (rôle 'admin').
 *    - Utilisateur actif : `ines.benali@email.tn` / mot de passe : `Masrouf2026` (rôle 'user'),
 *      avec 3 mois de budgets consécutifs, produits tunisiens réels et historique de prix.
 *    - Autres utilisateurs : Sami Trabelsi, Rania Gharbi, Youssef Mansour (compte suspendu pour démonstration).
 * 3. Produits tunisiens du quotidien avec magasins réels (Huile d'olive Châal, Lait Délice, Pâtes Warda, Thon Sicam chez Monoprix/Carrefour).
 * 4. Périodes de budget dynamiques calculées par rapport à la date courante (`monthRange(0)`, `-1`, `-2`).
 * 5. Barèmes de gamification : 100 points par période réussie, bonus de 50 points toutes les 3 périodes, paliers Économe à 300 et Expert à 1000.
 */

// Utilitaire de hachage cryptographique du mot de passe avec sel
import { hashPassword } from '@/utils/security';
// Fonctions utilitaires de calcul et de formatage de dates
import { addDays, pad, todayISO } from '@/utils/format';
// Types métier TypeScript
import type {
  Budget,
  Category,
  DB,
  Expense,
  Product,
  Purchase,
  User,
} from './types';

/**
 * Catalogue initial des 16 catégories de base avec identifiant, nom anglais, nature et pourcentage par défaut (Total = 100%).
 */
const CATS: [string, string, 'product' | 'expense', number][] = [
  ['food', 'Food', 'product', 33],
  ['clothing', 'Clothing and shoes', 'product', 4],
  ['personal-care', 'Personal care', 'product', 4],
  ['home', 'Home and equipment', 'product', 5],
  ['computer', 'Computer equipment', 'product', 3],
  ['health', 'Health and medicines', 'product', 5],
  ['transport', 'Transport', 'expense', 10],
  ['bills', 'Bills', 'expense', 14],
  ['education', 'Education', 'expense', 4],
  ['entertainment', 'Entertainment', 'expense', 5],
  ['children', 'Children', 'expense', 3],
  ['family', 'Family support', 'expense', 3],
  ['savings', 'Savings', 'expense', 4],
  ['donations', 'Donations', 'expense', 1],
  ['bank-fees', 'Bank fees', 'expense', 1],
  ['other', 'Other', 'expense', 1],
];

/**
 * Calcule dynamiquement les dates de début et fin d'un mois avec un décalage relatif (offset).
 * @param offset 0 pour le mois en cours, -1 pour le mois précédent, -2 pour l'avant-dernier mois
 */
function monthRange(offset: number) {
  const now = new Date();
  const first = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset, 1));
  const last = new Date(Date.UTC(now.getFullYear(), now.getMonth() + offset + 1, 0));
  const f = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  return { start: f(first), end: f(last) };
}

/**
 * Génère le jeu de données initial complet sous forme d'objet structuré `DB`.
 */
export async function buildSeed(): Promise<DB> {
  const today = todayISO();
  // Génération des entités catégories
  const categories: Category[] = CATS.map(([id, name, kind]) => ({
    id,
    name,
    kind,
    active: true,
  }));
  // Clés de répartition budgétaire par défaut
  const defaultPercentages = Object.fromEntries(
    CATS.map(([id, , , p]) => [id, p])
  );

  /**
   * Fabrique un compte utilisateur avec mot de passe haché par SHA-256.
   */
  const mk = async (
    id: string,
    name: string,
    email: string,
    pw: string,
    role: 'user' | 'admin',
    active = true,
    extra: Partial<User> = {}
  ): Promise<User> => ({
    id,
    name,
    email,
    passwordHash: await hashPassword(pw),
    role,
    active,
    mustChangePassword: false,
    onboarded: role === 'admin',
    categoryIds: [],
    celebratedBudgetIds: [],
    createdAt: today,
    ...extra,
  });

  // Calcul des trois plages mensuelles (mois courant, M-1, M-2)
  const cur = monthRange(0);
  const m1 = monthRange(-1);
  const m2 = monthRange(-2);

  // Profil principal de démonstration pour la soutenance (Ines Ben Ali)
  const ines = await mk(
    'u-ines',
    'Ines Ben Ali',
    'ines.benali@email.tn',
    'Masrouf2026',
    'user',
    true,
    {
      onboarded: true,
      categoryIds: ['food', 'transport', 'bills', 'entertainment', 'savings'],
      celebratedBudgetIds: ['b-m2', 'b-m1'],
    }
  );

  // Liste de tous les comptes pré-créés
  const users: User[] = [
    await mk('u-admin', 'Administrator', 'admin@masrouf.tn', 'Admin2026', 'admin'),
    ines,
    await mk('u-sami', 'Sami Trabelsi', 'sami.trabelsi@email.tn', 'Masrouf2026', 'user'),
    await mk('u-rania', 'Rania Gharbi', 'rania.gharbi@email.tn', 'Masrouf2026', 'user'),
    await mk('u-youssef', 'Youssef Mansour', 'youssef.m@email.tn', 'Masrouf2026', 'user', false),
  ];

  // Budgets historiques pour Ines Ben Ali
  const alloc = {
    food: 500,
    transport: 150,
    bills: 250,
    entertainment: 100,
    savings: 100,
  };
  const budgets: Budget[] = [
    {
      id: 'b-m2',
      userId: ines.id,
      ...m2,
      total: 1100,
      allocations: { food: 450, transport: 150, bills: 250, entertainment: 100, savings: 100 },
    },
    {
      id: 'b-m1',
      userId: ines.id,
      ...m1,
      total: 1150,
      allocations: { food: 480, transport: 150, bills: 250, entertainment: 100, savings: 100 },
    },
    {
      id: 'b-cur',
      userId: ines.id,
      ...cur,
      total: 1200,
      allocations: alloc,
    },
  ];

  // Catalogue de produits du quotidien
  const P = (
    id: string,
    name: string,
    brand: string,
    categoryId: string,
    unit: string
  ): Product => ({
    id,
    userId: ines.id,
    name,
    brand,
    categoryId,
    unit,
  });

  const products: Product[] = [
    P('p-oil', 'Olive oil', 'Châal', 'food', 'L'),
    P('p-milk', 'Whole milk', 'Délice', 'food', 'L'),
    P('p-coffee', 'Ground coffee', 'Lavazza', 'food', 'kg'),
    P('p-rice', 'Basmati rice', 'Tilda', 'food', 'kg'),
    P('p-tuna', 'Tuna cans', 'Sicam', 'food', 'pc'),
    P('p-pasta', 'Pasta', 'Warda', 'food', 'kg'),
  ];

  // Génération des achats de produits avec magasins et prix
  const pu = (
    id: string,
    productId: string,
    price: number,
    quantity: number,
    unit: string,
    store: string,
    date: string
  ): Purchase => ({
    id,
    userId: ines.id,
    productId,
    price,
    quantity,
    unit,
    store,
    date,
  });

  const inMonth = (m: { start: string }, day: number) =>
    addDays(m.start, day - 1);

  const purchases: Purchase[] = [
    pu('pu-oil-1', 'p-oil', 14.0, 1, 'L', 'Carrefour', addDays(cur.start, -92 + 10)),
    pu('pu-oil-2', 'p-oil', 14.0, 1, 'L', 'Carrefour', addDays(cur.start, -61 + 10)),
    pu('pu-oil-3', 'p-oil', 15.0, 1, 'L', 'Carrefour', addDays(m1.start, 14)),
    pu('pu-oil-4', 'p-oil', 14.5, 1, 'L', 'Monoprix', addDays(today, today > addDays(cur.start, 1) ? -1 : 0)),
    pu('pu-milk', 'p-milk', 52.0, 24, 'L', 'Monoprix', inMonth(cur, 3)),
    pu('pu-coffee', 'p-coffee', 61.0, 1, 'kg', 'Magasin Général', inMonth(cur, 4)),
    pu('pu-rice', 'p-rice', 38.0, 5, 'kg', 'Carrefour', inMonth(cur, 5)),
    pu('pu-tuna', 'p-tuna', 64.5, 12, 'pc', 'Monoprix', inMonth(cur, 6)),
    pu('pu-pasta', 'p-pasta', 90.0, 30, 'kg', 'Carrefour', inMonth(cur, 7)),
    pu('pu-milk-prev', 'p-milk', 40, 20, 'L', 'Monoprix', inMonth(m1, 5)),
    pu('pu-rice-prev', 'p-rice', 420, 5, 'kg', 'Carrefour', inMonth(m1, 9)),
  ];

  // Génération des dépenses directes sans produit physique
  const ex = (
    id: string,
    categoryId: string,
    amount: number,
    note: string,
    date: string
  ): Expense => ({
    id,
    userId: ines.id,
    categoryId,
    amount,
    note,
    date,
  });

  const expenses: Expense[] = [
    ex('e1', 'transport', 35, 'Bus pass', addDays(today, today > addDays(cur.start, 2) ? -2 : 0)),
    ex('e2', 'transport', 65, 'Fuel', inMonth(cur, 2)),
    ex('e3', 'bills', 200, 'Electricity and water', inMonth(cur, 3)),
    ex('e4', 'entertainment', 80, 'Cinema and streaming', inMonth(cur, 6)),
    ex('e5', 'savings', 50, 'Monthly saving', inMonth(cur, 2)),
    ex('e6', 'bills', 250, 'Rent share', inMonth(m1, 2)),
    ex('e7', 'transport', 120, 'Fuel', inMonth(m1, 8)),
    ex('e8', 'entertainment', 90, 'Cinema', inMonth(m1, 15)),
    ex('e9', 'bills', 240, 'Utilities', inMonth(m2, 2)),
    ex('e10', 'transport', 110, 'Fuel', inMonth(m2, 8)),
    ex('e11', 'food', 350, 'Groceries', inMonth(m2, 10)),
  ];

  return {
    users,
    categories,
    categoryTypes: [
      {
        kind: 'product',
        label: 'Products',
        description: 'Items you buy and follow by unit price.',
      },
      {
        kind: 'expense',
        label: 'Expenses',
        description: 'Everyday spending with no product attached.',
      },
    ],
    defaultPercentages,
    pointsRules: {
      periodReward: 100,
      streakLength: 3,
      streakBonus: 50,
      saverAt: 300,
      expertAt: 1000,
    },
    settings: { allowRegistration: true },
    budgets,
    products,
    purchases,
    expenses,
    sessionUserId: null,
  };
}
