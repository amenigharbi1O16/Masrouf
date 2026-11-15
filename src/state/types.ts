/**
 * FICHIER : src/state/types.ts
 * IDENTIFIANT INVENTAIRE : FICHIER-064
 * MODULE : Types Métier et Interfaces de Données TypeScript
 *
 * RÔLE DU MODULE :
 * Définit la structure des données métier de l'application Masrouf et le typage strict
 * des entités persistées dans SQLite :
 * - `Role` : rôles autorisés ('user' pour utilisateur régulier, 'admin' pour administrateur).
 * - `CategoryKind` : nature de la catégorie ('product' pour article physique, 'expense' pour charge pure).
 * - `User` : profil utilisateur (identifiants, hachage de mot de passe, statut actif/suspendu, mot de passe temporaire, catégories suivies).
 * - `Category` : catégorie budgétaire du catalogue global.
 * - `Budget` : période budgétaire avec dates de début/fin, plafond total et enveloppes allouées.
 * - `Product` : article physique suivi (nom, marque, catégorie, unité par défaut, photo).
 * - `Purchase` : transaction d'achat liée à un produit physique (quantité, prix total, unité, magasin, date).
 * - `Expense` : dépense directe sans produit (montant, catégorie, note explicative, date).
 * - `CategoryType` : métadonnées des types de catégories.
 * - `PointsRules` : barèmes du moteur de gamification (récompense, bonus de série, paliers).
 * - `AppSettings` : paramètres globaux de l'application (autorisation des inscriptions).
 * - `DB` : instantané complet de l'état mémoire de la base de données SQLite locale.
 * - `Result` : retour standardisé des actions (succès `ok: boolean` ou message d'erreur).
 */

/**
 * Rôles d'utilisateurs supportés par Masrouf.
 */
export type Role = 'user' | 'admin';

/**
 * Nature fondamentale d'une catégorie :
 * - 'product' : article physique avec quantité, unité et historique de prix unitaire.
 * - 'expense' : dépense directe forfaitaire sans produit (loyer, transport, facture).
 */
export type CategoryKind = 'product' | 'expense';

/**
 * Entité Utilisateur stockée dans la table `users`.
 */
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

/**
 * Entité Catégorie stockée dans la table `categories`.
 */
export interface Category {
  id: string;
  name: string;
  kind: CategoryKind;
  active: boolean;
}

/**
 * Entité Période de Budget stockée dans la table `budgets`.
 */
export interface Budget {
  id: string;
  userId: string;
  start: string; // Format ISO : YYYY-MM-DD
  end: string;   // Format ISO : YYYY-MM-DD
  total: number; // Montant global en dinars tunisiens
  allocations: Record<string, number>; // Répartition par enveloppe : categoryId -> montant
}

/**
 * Entité Produit stockée dans la table `products`.
 */
export interface Product {
  id: string;
  userId: string;
  name: string;
  brand: string;
  categoryId: string;
  unit: string;
  photo?: string;
}

/**
 * Entité Achat de Produit stockée dans la table `purchases`.
 */
export interface Purchase {
  id: string;
  userId: string;
  productId: string;
  price: number; // Montant total payé en DT
  quantity: number;
  unit: string;
  store: string;
  date: string; // Format ISO : YYYY-MM-DD
}

/**
 * Entité Dépense Directe stockée dans la table `expenses`.
 */
export interface Expense {
  id: string;
  userId: string;
  categoryId: string;
  amount: number; // Montant en DT
  note: string;
  date: string; // Format ISO : YYYY-MM-DD
}

/**
 * Entité Métadonnées de Type de Catégorie.
 */
export interface CategoryType {
  kind: CategoryKind;
  label: string;
  description: string;
}

/**
 * Paramètres configurables du moteur de points et gamification.
 */
export interface PointsRules {
  periodReward: number; // Points attribués pour chaque période de budget respectée
  streakLength: number; // Nombre de périodes consécutives nécessaires pour le bonus
  streakBonus: number;  // Points bonus attribués lors d'une série réussie
  saverAt: number;      // Seuil de points requis pour atteindre le niveau Économe
  expertAt: number;     // Seuil de points requis pour atteindre le niveau Expert
}

/**
 * Réglages généraux de l'application.
 */
export interface AppSettings {
  allowRegistration: boolean; // Autorise ou bloque les nouvelles créations de compte
}

/**
 * Schéma complet de l'état mémoire en miroir de la base SQLite locale.
 */
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

/**
 * Type de retour universel des opérations d'écriture.
 */
export interface Result {
  ok: boolean;
  error?: string;
}
