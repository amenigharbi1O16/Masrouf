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
  /** Identifiant unique du profil utilisateur (ex: "u-ines") */
  id: string;
  /** Nom complet de l'utilisateur affiché sur l'accueil */
  name: string;
  /** Adresse électronique unique au format Gmail */
  email: string;
  /** Empreinte SHA-256 salée du mot de passe */
  passwordHash: string;
  /** Rôle d'accès : "user" (utilisateur standard) ou "admin" (administrateur) */
  role: Role;
  /** Statut d'activation : true = compte actif, false = suspendu */
  active: boolean;
  /** Vrai si l'utilisateur doit renouveler son mot de passe temporaire */
  mustChangePassword: boolean;
  /** Vrai si l'utilisateur a terminé l'onboarding initial */
  onboarded: boolean;
  /** Identifiants des catégories activées par l'utilisateur */
  categoryIds: string[];
  /** Identifiants des périodes de budget réussies ayant déjà affiché l'écran félicitations */
  celebratedBudgetIds: string[];
  /** Date de création du compte au format ISO */
  createdAt: string;
  /** Préférence de langue d'interface optionnelle ("fr", "ar", "en") */
  langue?: string;
}

/**
 * Entité Catégorie stockée dans la table `categories`.
 */
export interface Category {
  id: string;
  /** Nom de référence de la catégorie */
  name: string;
  /** Nature de la catégorie : "product" ou "expense" */
  kind: CategoryKind;
  /** Statut d'activation : true = compte actif, false = suspendu */
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
  /** Nom commercial du produit (ex: "Lait demi-écrémé 1L") */
  name: string;
  /** Marque du fabricant (ex: "Délice") */
  brand: string;
  /** Identifiant de la catégorie de rattachement */
  categoryId: string;
  /** Unité physique de référence pour le prix unitaire */
  unit: string;
  /** Chemin URI local de la photo capturée pour le produit */
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
  /** Enseigne ou magasin où l'achat a eu lieu */
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
  /** Observation textuelle libre sur la dépense */
  note: string;
  date: string; // Format ISO : YYYY-MM-DD
}

/**
 * Entité Métadonnées de Type de Catégorie.
 */
export interface CategoryType {
  /** Nature de la catégorie : "product" ou "expense" */
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
 * Entité Notification interne et alerte réelle smartphone stockée dans SQLite.
 */
export interface InAppNotification {
  id: string;
  userId: string;
  type: 'alert_80' | 'alert_100' | 'period_end' | 'budget_change' | 'user_registered' | 'system';
  title: string;
  body: string;
  periodLabel?: string;
  periodId?: string;
  amountSpent?: number;
  budgetTotal?: number;
  actionRecommended?: string;
  isRead: boolean;
  createdAt: string; // Format ISO : YYYY-MM-DDTHH:mm:ss.sssZ
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
  notifications: InAppNotification[];
  sessionUserId: string | null;
}

/**
 * Type de retour universel des opérations d'écriture et d'authentification.
 */
export interface Result {
  // Indique si l'opération a réussi
  ok: boolean;
  // Message explicatif en cas d'échec
  error?: string;
  // Profil utilisateur renvoyé en cas de connexion réussie
  user?: User;
}
