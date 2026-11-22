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
 *    - Administrateur : `admin@gmail.com` / mot de passe : `Admin2026` (rôle 'admin').
 *    - Utilisateur actif : `ines.benali@gmail.com` / mot de passe : `Masrouf2026` (rôle 'user'),
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
  Role,
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
  ['children', 'Enfant', 'expense', 3],
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
    role: Role,
    active = true,
    extra: Partial<User> = {}
  ): Promise<User> => ({
    id,
    name,
    email,
    passwordHash: await hashPassword(pw),
    role,
    active: true, // Aucun compte n'est jamais suspendu
    mustChangePassword: false,
    onboarded: role === 'parent' || role === 'admin',
    categoryIds: [],
    celebratedBudgetIds: [],
    createdAt: today,
    ...extra,
  });

  // Profils de test essentiels pour la connexion au format strict Gmail (name@gmail.com)
  // 1. Profil Parent (admin@gmail.com / Admin2026)
  const admin = await mk('u-admin', 'Parent / Administrateur', 'admin@gmail.com', 'Admin2026', 'parent', true, {
    accountType: 'family',
    familyName: 'Famille Ben Ali',
    onboarded: true,
  });

  // 2. Profil Utilisateur Standard (user@gmail.com / Masrouf2026)
  const user = await mk('u-user', 'Utilisateur Test', 'user@gmail.com', 'Masrouf2026', 'user', true, {
    onboarded: true,
    categoryIds: ['food', 'transport', 'bills', 'entertainment', 'savings'],
  });

  // 3. Profil Utilisateur Ines Ben Ali (ines.benali@gmail.com / Masrouf2026)
  const ines = await mk(
    'u-ines',
    'Ines Ben Ali',
    'ines.benali@gmail.com',
    'Masrouf2026',
    'user',
    true,
    {
      onboarded: true,
      categoryIds: ['food', 'transport', 'bills', 'entertainment', 'savings'],
    }
  );

  // Liste de tous les comptes pré-créés pour les tests de connexion
  const users: User[] = [admin, user, ines];

  // ============================================================
  // MISSION ARCHITECTURALE : ZÉRO DONNÉE EN DUR
  // RÔLE : Aucune donnée pré-remplie (aucun budget, aucun produit, aucun achat,
  //        aucune dépense). L'utilisateur teste l'application avec ses propres saisies.
  // ============================================================
  const budgets: Budget[] = [];
  const products: Product[] = [];
  const purchases: Purchase[] = [];
  const expenses: Expense[] = [];

  return {
    // Comptes utilisateurs de départ pré-hachés pour les tests et l'administration
    users,
    // Référentiel complet des 16 catégories financières
    categories,
    // Typologies de catégories : produits physiques avec prix unitaire vs dépenses forfaitaires
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
    // Clé de répartition budgétaire indicative par défaut
    defaultPercentages,
    // Règles de calcul des points et des badges de gamification
    pointsRules: {
      periodReward: 100,
      streakLength: 3,
      streakBonus: 50,
      saverAt: 300,
      expertAt: 1000,
    },
    // Paramètres système autorisant la création de nouveaux comptes
    settings: { allowRegistration: true },
    // Liste des budgets initialisée vide (respect de la règle ZÉRO donnée en dur)
    budgets,
    // Catalogue de produits initialisé vide
    products,
    // Historique des achats initialisé vide
    purchases,
    // Historique des dépenses initialisé vide
    expenses,
    // Centre de notifications initialisé vierge
    notifications: [],
    // Aucun utilisateur connecté par défaut au premier lancement
    sessionUserId: null,
    // Système familial initialisé
    familyFunds: [],
    allocations: [],
    moneyRequests: [],
    familyBudgets: [],
  };
}
