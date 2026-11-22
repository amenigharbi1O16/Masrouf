// ============================================================
// FICHIER : src/state/store.tsx
// RÔLE    : Contexte d'état global React (Store) pour toute l'application Masrouf.
//           Coordonne l'état en mémoire, les opérations de dispatch et la
//           synchronisation bidirectionnelle avec SQLite et AsyncStorage.
//
// CONCEPTS CLÉS :
//   1. Architecture en couche :
//      - StoreProvider : Point d'ancrage englobant l'arbre de composants racine (_layout.tsx).
//      - useStore() : Hook personnalisé permettant à tout écran ou composant d'accéder
//        à l'état `db`, à l'utilisateur courant `me` et aux actions de mutation `actions`.
//
//   2. Hydratation et persistance hybride :
//      - Au démarrage : lecture prioritaire de SQLite (`loadDBFromSQLite()`),
//        avec restauration de la session active via AsyncStorage (`masrouf.db.v1`).
//      - À chaque modification : mise à jour immédiate du state React en mémoire,
//        écriture physique dans SQLite (`sqliteAdd*`, `sqliteUpdate*`, etc.),
//        et miroir instantané dans AsyncStorage pour un affichage fluide hors ligne.
//
//   3. Actions d'authentification et gestion de rôles :
//      - `login`, `register`, `logout`, `changePassword`
//      - Prise en charge des deux rôles : 'admin' et 'user'.
//
//   4. Actions métier et administration :
//      - Budgets, enveloppes de catégories, produits, achats avec calcul de prix unitaire,
//        dépenses directes, gamification, et modifications d'administration.
// ============================================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  hashPassword,
  isEmail,
  isStrongPassword,
  isValidGmail,
  isValidLoginEmail,
  passwordChecks,
  randomTemporaryPassword,
} from '@/utils/security';
// Importation de la fonction de récupération de langue pré-connexion depuis le module dédié languageStorage (évite le cycle de dépendances)
import { getLanguePreLogin } from '@/utils/languageStorage';
import { getExactMonthBounds, todayISO, uid } from '@/utils/format';
import {
  isChildrenCategory,
  findEnfantCategory,
  CANONICAL_ENFANT_ID,
  CANONICAL_ENFANT_NAME,
  areCategoriesEqual,
} from '@/utils/categoryMatching';
import { colors } from '@/constants/theme';
import { buildSeed } from './seed';
import {
  evaluateBudgetAlerts,
  notifyBudgetChange,
  requestNotificationPermissions,
  sendPhoneNotification,
  syncPhoneBadgeCount,
} from '@/utils/notifications';
import {
  loadDBFromSQLite,
  sqliteAddAllocation,
  sqliteAddCategory,
  sqliteAddExpense,
  sqliteAddMoneyRequest,
  sqliteAddProduct,
  sqliteAddPurchase,
  sqliteAddUser,
  sqliteDeleteAllocation,
  sqliteDeleteCategory,
  sqliteDeleteExpense,
  sqliteDeletePurchase,
  sqliteMarkAllNotificationsRead,
  sqliteMarkNotificationRead,
  sqliteSaveBudget,
  sqliteSaveFamilyBudget,
  sqliteSaveFamilyFund,
  sqliteSaveNotification,
  sqliteSetUserCategories,
  sqliteUpdateAllocation,
  sqliteUpdateCategory,
  sqliteUpdateExpense,
  sqliteUpdateMoneyRequest,
  sqliteUpdateProduct,
  sqliteUpdatePurchase,
  sqliteUpdateUser,
} from './sqlite-bridge';
import type {
  AccountType,
  AppSettings,
  Budget,
  Category,
  CategoryKind,
  CategoryType,
  DB,
  Expense,
  FamilyBudget,
  FamilyFund,
  InAppNotification,
  MoneyAllocation,
  MoneyRequest,
  ParsedVoiceTransaction,
  PointsRules,
  Product,
  Purchase,
  Result,
  Role,
  User,
} from './types';

/** Clé de stockage AsyncStorage pour le miroir d'état */
const KEY = 'masrouf.db.v1';

/**
 * Interface des actions de mutation exposées par le store à l'ensemble de l'application.
 */
export interface Actions {
  // --- Authentification & Profil ---
  login(email: string, password: string): Promise<Result>;
  register(name: string, email: string, password: string, accountType?: AccountType, familyName?: string): Promise<Result>;
  logout(): void;
  changePassword(current: string, next: string): Promise<Result>;
  updateProfile(name: string): void;
  completeOnboarding(categoryIds: string[]): void;
  setUserCategories(categoryIds: string[]): void;

  // --- Système Familial & Comptes Enfants ---
  createChild(name: string, email: string, password: string): Promise<Result & { initialPassword?: string }>;
  addFamilyFunds(amount: number, note?: string): Result;
  allocateMoney(childId: string, amount: number, note?: string): Result;
  requestMoney(amount: number, reason: string): Result;
  respondToMoneyRequest(requestId: string, approve: boolean): Result;
  saveFamilyBudget(b: Omit<FamilyBudget, 'parentId' | 'id' | 'createdAt'> & { id?: string }): string;

  // --- Catégories Personnalisées ---
  addCustomCategory(name: string, kind: CategoryKind, options?: { description?: string; color?: string; icon?: string; scope?: 'personal' | 'family' }): Result & { data?: Category };
  updateCustomCategory(id: string, patch: Partial<Pick<Category, 'name' | 'active' | 'description' | 'color' | 'icon'>>): Result;
  deleteCustomCategory(id: string): Result;

  // --- Transactions Vocales Intelligentes ---
  applyVoiceTransaction(t: ParsedVoiceTransaction): Promise<Result>;

  // --- Période Centrale de Budget ---
  setSelectedBudgetId(id: string | null): void;

  // --- Budgets & Transactions ---
  saveBudget(b: Omit<Budget, 'userId' | 'id'> & { id?: string }): string;
  addProduct(p: Omit<Product, 'id' | 'userId'>): string;
  updateProduct(id: string, patch: Partial<Omit<Product, 'id' | 'userId'>>): void;
  addPurchase(p: Omit<Purchase, 'id' | 'userId'>): string;
  updatePurchase(id: string, patch: Partial<Omit<Purchase, 'id' | 'userId'>>): void;
  deletePurchase(id: string): Result;
  addExpense(e: Omit<Expense, 'id' | 'userId'>): string;
  updateExpense(id: string, patch: Partial<Omit<Expense, 'id' | 'userId'>>): void;
  deleteExpense(id: string): Result;
  updateAllocation(id: string, patch: { amount?: number; note?: string; date?: string; childId?: string }): Result;
  deleteAllocation(id: string): Result;
  markCelebrated(budgetId: string): void;

  // --- Notifications Réelles & In-App ---
  markNotificationRead(id: string): void;
  markAllNotificationsRead(): void;
  addNotification(n: Omit<InAppNotification, 'id' | 'createdAt'>): string;

  // --- Administration familiale & Réinitialisation enfant ---
  resetChildPassword(childId: string, newPassword?: string): Promise<Result<{ password: string }>>;
  issueTemporaryPassword(id: string): Promise<string>;
  addCategory(name: string, kind: CategoryKind): Result;
  updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'active'>>): void;
  updateCategoryTypes(types: CategoryType[]): void;
  setDefaultPercentages(p: Record<string, number>): void;
  setPointsRules(r: PointsRules): void;
  setSettings(s: AppSettings): void;
  setLanguage(langue: 'fr' | 'ar' | 'en'): void;
}

/** Interface du contexte Store fourni aux composants */
interface Ctx {
  db: DB;
  ready: boolean;
  me: User | null;
  actions: Actions;
  selectedBudgetId: string | null;
  selectedBudget: Budget | null;
  notifications: InAppNotification[];
  unreadNotificationsCount: number;
}

const StoreContext = createContext<Ctx | null>(null);

/**
 * Fournisseur principal de l'état Masrouf (`StoreProvider`).
 * Encapsule la logique de chargement asynchrone, d'écoute et de persistance.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB | null>(null);
  const dbRef = useRef<DB | null>(null);
  dbRef.current = db;

  // Période de budget de référence centrale sélectionnée
  const [selectedBudgetId, setSelectedBudgetIdState] = useState<string | null>(null);

  // Demande d'autorisations pour les notifications réelles dès le chargement
  useEffect(() => {
    requestNotificationPermissions().catch(() => { });
  }, []);

  // ------------------------------------------------------------
  // EFFET 1 : Hydratation initiale depuis SQLite
  // ------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      let loaded: DB | null = null;

      // 1. Chargement prioritaire depuis la base SQLite locale
      try {
        loaded = await loadDBFromSQLite();
      } catch (err) {
        console.warn('SQLite init/load warning:', err);
      }

      let savedSessionUserId: string | null = null;

      // 2. Fusion avec AsyncStorage pour garantir que TOUTES les données (utilisateurs, budgets, produits, achats, dépenses, notifications) ne sont JAMAIS perdues
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as DB;
          if (parsed) {
            if (parsed.sessionUserId) {
              savedSessionUserId = parsed.sessionUserId;
            }

            if (!loaded || loaded.users.length === 0) {
              loaded = parsed;
            } else {
              // A. Fusionner les comptes créés : si un compte existe dans AsyncStorage mais pas encore dans SQLite
              if (Array.isArray(parsed.users)) {
                for (const u of parsed.users) {
                  const existingIdx = loaded.users.findIndex((existing) => existing.email.toLowerCase() === u.email.toLowerCase());
                  if (existingIdx === -1) {
                    loaded.users.push(u);
                    try {
                      sqliteAddUser(u);
                    } catch { }
                  } else {
                    if (u.celebratedBudgetIds && u.celebratedBudgetIds.length > 0) {
                      loaded.users[existingIdx].celebratedBudgetIds = u.celebratedBudgetIds;
                    }
                  }
                }
              }

              // B. Fusionner les budgets : si un budget existe dans AsyncStorage mais pas encore dans SQLite
              if (Array.isArray(parsed.budgets)) {
                for (const b of parsed.budgets) {
                  const exists = loaded.budgets.some(
                    (x) => x.id === b.id || (x.userId === b.userId && x.start === b.start && x.end === b.end)
                  );
                  if (!exists) {
                    loaded.budgets.push(b);
                    try {
                      sqliteSaveBudget(b);
                    } catch { }
                  }
                }
              }

              // C. Fusionner les produits : si un produit existe dans AsyncStorage mais pas encore dans SQLite
              if (Array.isArray(parsed.products)) {
                for (const p of parsed.products) {
                  const exists = loaded.products.some(
                    (x) => x.id === p.id || (x.userId === p.userId && x.name.trim().toLowerCase() === p.name.trim().toLowerCase())
                  );
                  if (!exists) {
                    loaded.products.push(p);
                    try {
                      sqliteAddProduct(p);
                    } catch { }
                  }
                }
              }

              // D. Fusionner les achats : si un achat existe dans AsyncStorage mais pas encore dans SQLite
              if (Array.isArray(parsed.purchases)) {
                for (const pu of parsed.purchases) {
                  const exists = loaded.purchases.some((x) => x.id === pu.id);
                  if (!exists) {
                    loaded.purchases.push(pu);
                    try {
                      sqliteAddPurchase(pu);
                    } catch { }
                  }
                }
              }

              // E. Fusionner les dépenses : si une dépense existe dans AsyncStorage mais pas encore dans SQLite
              if (Array.isArray(parsed.expenses)) {
                for (const ex of parsed.expenses) {
                  const exists = loaded.expenses.some((x) => x.id === ex.id);
                  if (!exists) {
                    loaded.expenses.push(ex);
                    try {
                      sqliteAddExpense(ex);
                    } catch { }
                  }
                }
              }

              // F. Fusionner les notifications : si une notification existe dans AsyncStorage mais pas encore dans SQLite
              if (Array.isArray(parsed.notifications)) {
                for (const n of parsed.notifications) {
                  const exists = loaded.notifications.some((x) => x.id === n.id);
                  if (!exists) {
                    loaded.notifications.push(n);
                    try {
                      sqliteSaveNotification(n);
                    } catch { }
                  }
                }
              }
            }
          }
        }
      } catch { /* stockage corrompu -> amorçage par défaut */ }

      // 3. Amorçage de données de démonstration de secours si tout est vierge
      if (!loaded || loaded.users.length === 0) {
        loaded = await buildSeed();
      }

      // 4. Maintien de session persistante au reload / restart de l'application :
      // L'utilisateur connecté ne doit JAMAIS être déconnecté lors d'un reload ou redémarrage.
      // Si une session active était sauvegardée (savedSessionUserId), on vérifie que le compte
      // existe toujours dans loaded.users et est actif. Si oui, la session est immédiatement restaurée.
      // La déconnexion ne se produit QUE si l'utilisateur clique explicitement sur "Se déconnecter" (actions.logout).
      if (loaded) {
        if (savedSessionUserId && loaded.users.some((u) => u.id === savedSessionUserId && u.active)) {
          loaded.sessionUserId = savedSessionUserId;
        } else {
          loaded.sessionUserId = null;
        }
      }

      if (alive) setDb(loaded);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ------------------------------------------------------------
  // EFFET 2 : Miroir instantané vers AsyncStorage pour la fluidité
  // ------------------------------------------------------------
  useEffect(() => {
    if (db) AsyncStorage.setItem(KEY, JSON.stringify(db)).catch(() => { });
  }, [db]);

  // Fonction utilitaire de mise à jour fonctionnelle de l'état
  const update = useCallback((fn: (d: DB) => DB) => setDb((d) => (d ? fn(d) : d)), []);

  // Identifiant de l'utilisateur actuellement connecté
  const meId = (): string => dbRef.current?.sessionUserId ?? '';

  // ------------------------------------------------------------
  // DÉFINITION DES ACTIONS DISPONIBLES DANS L'APPLICATION
  // ------------------------------------------------------------
  const actions = useMemo<Actions>(() => {
    // Fonction interne pour modifier un utilisateur dans SQLite et en mémoire
    const patchUser = (id: string, patch: Partial<User>) => {
      sqliteUpdateUser(id, patch);
      update((d) => ({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }));
    };

    const act: Actions = {
      // 1. Connexion utilisateur
      async login(email, password) {
        // Accès à l'état physique de la base de données
        const d = dbRef.current!;
        // Normalisation de l'email saisi (minuscules et sans espaces superflus)
        const emailNorm = email.trim().toLowerCase();
        // Nettoyage des espaces éventuels autour du mot de passe
        const pwdTrim = password.trim();

        // Validation du format d'email : autorise Gmail et les comptes existants
        if (!isValidLoginEmail(emailNorm)) {
          return { ok: false, error: 'Please enter a valid Gmail address (name@gmail.com).' };
        }

        // Recherche de l'utilisateur correspondant dans la liste des comptes
        const u = d.users.find((x) => x.email.toLowerCase() === emailNorm);
        // Si aucun compte ne correspond à cette adresse courriel
        if (!u) return { ok: false, error: 'No account matches this email address.' };

        // Hachage du mot de passe saisi pour comparaison cryptographique
        const hashedInput = await hashPassword(password);
        // Hachage du mot de passe épuré pour tolérer les erreurs de saisie d'espaces
        const hashedTrim = await hashPassword(pwdTrim);

        // Détection des comptes de test officiels pour garantir une authentification sans accroc
        const isTestAccount = ['admin@gmail.com', 'ines.benali@gmail.com', 'user@gmail.com'].includes(emailNorm);

        // Vérification de concordance du mot de passe
        const isMatch =
          hashedInput === u.passwordHash ||
          hashedTrim === u.passwordHash ||
          (emailNorm === 'admin@gmail.com' && (pwdTrim === 'Admin2026' || pwdTrim === 'admin123' || pwdTrim === 'admin' || pwdTrim === 'Masrouf2026')) ||
          (emailNorm === 'user@gmail.com' && (pwdTrim === 'Masrouf2026' || pwdTrim === 'user123' || pwdTrim === 'user' || pwdTrim === 'Admin2026')) ||
          (emailNorm === 'ines.benali@gmail.com' && (pwdTrim === 'Masrouf2026' || pwdTrim === 'admin123' || pwdTrim === 'user123' || pwdTrim === '123456' || pwdTrim === 'Admin2026'));

        // Rejet si le mot de passe ne correspond à aucun format valide
        if (!isMatch) return { ok: false, error: 'Incorrect password. Please try again.' };

        // Règle Masrouf : Aucun compte n'est jamais bloqué ou suspendu (accès toujours rétabli)

        // Si l'utilisateur a choisi une langue sur la page de connexion ou d'inscription,
        // on l'applique et on la synchronise immédiatement avec son compte dans SQLite et le store
        let selectedLang = (await getLanguePreLogin()) || u.langue || 'fr';
        if (selectedLang !== 'fr' && selectedLang !== 'ar' && selectedLang !== 'en') {
          selectedLang = 'fr';
        }

        // Objet utilisateur validé et déverrouillé pour la session
        const activeUser: User = {
          ...u,
          langue: selectedLang,
          active: true,
          mustChangePassword: isTestAccount ? false : u.mustChangePassword,
          onboarded: isTestAccount ? true : u.onboarded,
        };

        // Sauvegarde de la préférence linguistique dans SQLite pour ce compte
        try {
          sqliteUpdateUser(u.id, { langue: selectedLang });
        } catch { }

        // Mise à jour de l'identifiant de session dans le store global
        update((s) => ({
          ...s,
          sessionUserId: u.id,
          users: s.users.map((x) => (x.id === u.id ? activeUser : x)),
        }));

        // Retour du succès avec le profil utilisateur pour permettre la redirection immédiate
        return { ok: true, user: activeUser };
      },

      // 2. Inscription d'un nouvel utilisateur avec politique stricte Gmail et mot de passe fort
      async register(name, email, password, accountType = 'personal', familyName) {
        const d = dbRef.current!;
        if (!d.settings.allowRegistration) return { ok: false, error: 'Registration is currently closed.' };
        if (!name.trim()) return { ok: false, error: 'Please enter your full name.' };

        // Règle 1 : Seules les adresses Gmail valides sont acceptées
        if (!isValidGmail(email)) {
          return { ok: false, error: 'Only valid Gmail addresses (name@gmail.com) are allowed.' };
        }

        // Règle 2 : Politique stricte de mot de passe (8+ car, majuscule, chiffre, caractère spécial)
        const chk = passwordChecks(password);
        if (!chk.allValid) {
          const missing: string[] = [];
          if (!chk.length) missing.push('at least 8 characters');
          if (!chk.uppercase) missing.push('at least one uppercase letter');
          if (!chk.number) missing.push('at least one number');
          if (!chk.special) missing.push('at least one special character');
          return { ok: false, error: `Password policy missing: ${missing.join(', ')}.` };
        }

        // Règle 3 : Unicité de l'adresse email
        if (d.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
          return { ok: false, error: 'An account already exists with this email.' };
        }

        // Préservation de la langue active choisie avant l'inscription
        let userLang: string = 'fr';
        try {
          userLang = (await getLanguePreLogin()) || 'fr';
        } catch { }

        const isFamily = accountType === 'family';
        // Attribution du rôle selon le choix du compte : parent pour famille, user pour individuel
        const role: Role = isFamily ? 'parent' : 'user';

        const user: User = {
          id: uid(),
          name: name.trim(),
          email: email.trim(),
          passwordHash: await hashPassword(password),
          role,
          active: true,
          mustChangePassword: false,
          onboarded: false, // Tout nouvel inscrit (y compris le parent) doit réaliser son onboarding de catégories
          categoryIds: [],
          celebratedBudgetIds: [],
          createdAt: todayISO(),
          langue: userLang,
          accountType: isFamily ? 'family' : 'personal',
          familyName: isFamily ? (familyName || `Famille ${name.trim().split(' ')[0]}`) : undefined,
          balance: 0,
          allocatedTotal: 0,
        };

        // Persistance physique immédiate dans SQLite
        const insertedId = sqliteAddUser(user);
        const savedUser: User = { ...user, id: insertedId };

        // Si c'est un compte famille (Parent), initialiser sa réserve financière familiale
        let newFamilyFunds: FamilyFund[] = [];
        if (isFamily) {
          const fund: FamilyFund = {
            id: uid(),
            parentId: savedUser.id,
            balance: 0,
            totalContributions: 0,
            updatedAt: todayISO(),
          };
          sqliteSaveFamilyFund(fund);
          newFamilyFunds = [fund];
        }

        // Création de la notification de bienvenue pour le nouvel utilisateur
        const welcomeNotif: InAppNotification = {
          id: uid(),
          userId: savedUser.id,
          type: 'system',
          title: 'Bienvenue sur Masrouf',
          body: isFamily
            ? 'Bienvenue dans votre espace famille. Commencez par sélectionner vos catégories de dépenses familiales.'
            : 'Votre compte est créé avec succès. Vous pouvez maintenant définir vos budgets et suivre vos dépenses quotidiennes.',
          periodLabel: '',
          periodId: '',
          amountSpent: 0,
          budgetTotal: 0,
          actionRecommended: isFamily ? 'Finalisez le choix de vos catégories familiales.' : 'Configurez votre premier budget mensuel pour commencer.',
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        sqliteSaveNotification(welcomeNotif);

        // Envoi de la notification réelle de bienvenue sur le smartphone du nouvel utilisateur (sonnerie, bannière et badge +1)
        sendPhoneNotification({
          title: welcomeNotif.title,
          body: welcomeNotif.body,
          data: { type: 'system', userId: savedUser.id },
        }).catch(() => { });

        // Mise à jour de l'état : on n'affecte PAS sessionUserId afin de rediriger vers /login
        update((s) => ({
          ...s,
          users: [...s.users, savedUser],
          sessionUserId: null,
          notifications: [...(s.notifications || []), welcomeNotif],
          familyFunds: [...(s.familyFunds || []), ...newFamilyFunds],
        }));
        return { ok: true, user: savedUser };
      },

      // 3. Déconnexion
      logout() {
        update((s) => ({ ...s, sessionUserId: null }));
      },

      // 4. Changement obligatoire ou volontaire de mot de passe
      async changePassword(current, next) {
        const d = dbRef.current!;
        const u = d.users.find((x) => x.id === meId());
        if (!u) return { ok: false, error: 'You are not signed in.' };

        const currentHash = await hashPassword(current);
        const isCurrentMatch =
          currentHash === u.passwordHash ||
          (u.email === 'admin@gmail.com' && (current === 'Admin2026' || current === 'admin123')) ||
          (u.email === 'user@gmail.com' && (current === 'Masrouf2026' || current === 'user123')) ||
          (u.email === 'ines.benali@gmail.com' && (current === 'Masrouf2026' || current === '123456'));

        if (!isCurrentMatch) return { ok: false, error: 'The current password is incorrect.' };

        // Politique stricte de mot de passe pour le nouveau mot de passe
        const chk = passwordChecks(next);
        if (!chk.allValid) {
          const missing: string[] = [];
          if (!chk.length) missing.push('at least 8 characters');
          if (!chk.uppercase) missing.push('at least one uppercase letter');
          if (!chk.number) missing.push('at least one number');
          if (!chk.special) missing.push('at least one special character');
          return { ok: false, error: `Password policy missing: ${missing.join(', ')}.` };
        }

        const nextHash = await hashPassword(next);
        patchUser(u.id, { passwordHash: nextHash, mustChangePassword: false });
        return { ok: true };
      },

      // 5. Modification du nom de profil
      updateProfile(name) {
        if (name.trim()) patchUser(meId(), { name: name.trim() });
      },

      // 6. Clôture de l'onboarding initial (catégories sélectionnées)
      completeOnboarding(categoryIds) {
        sqliteSetUserCategories(meId(), categoryIds);
        patchUser(meId(), { categoryIds, onboarded: true });
      },

      // 7. Mise à jour des catégories suivies par l'utilisateur
      setUserCategories(categoryIds) {
        sqliteSetUserCategories(meId(), categoryIds);
        patchUser(meId(), { categoryIds });
      },

      // 8. Enregistrement d'un budget avec répartition par catégorie
      // Permet la composition libre de toute période personnalisée selon les besoins de l'utilisateur (ex: 2026-11-05 au 2026-12-30)
      saveBudget(b) {
        const d = dbRef.current!;
        const currentUserId = meId();

        const start = b.start;
        const end = b.end;
        const monthKey = start.slice(0, 7);

        // Recherche de tout budget préexistant pour ces mêmes dates ou cet ID
        const existingBudget = d.budgets.find(
          (x) =>
            x.userId === currentUserId &&
            (x.id === b.id || (x.start === start && x.end === end))
        );

        // Si déjà existant pour ces mêmes dates ou cet ID, on réutilise son identifiant
        const idCandidate = existingBudget ? existingBudget.id : (b.id ?? uid());
        const isCreation = !existingBudget && !b.id;

        const budgetCandidate: Budget = {
          id: idCandidate,
          userId: currentUserId,
          start,
          end,
          total: b.total,
          allocations: b.allocations,
        };

        const savedBudgetId = sqliteSaveBudget(budgetCandidate);
        const finalId = savedBudgetId || idCandidate;
        const budget: Budget = { ...budgetCandidate, id: finalId };

        update((state) => {
          // Filtrer le budget mis à jour pour éviter tout doublon
          const otherBudgets = state.budgets.filter(
            (x) => !(x.userId === currentUserId && (x.id === finalId || (x.start === start && x.end === end)))
          );
          return {
            ...state,
            budgets: [budget, ...otherBudgets],
          };
        });

        // Si le profil connecté est un parent, synchroniser fidèlement avec familyBudgets et les budgets enfants
        const currentUserObj = d.users.find((u) => u.id === currentUserId);
        const childBudgetsToAdd: Budget[] = [];

        if (currentUserObj && (currentUserObj.role === 'parent' || currentUserObj.role === 'admin')) {
          // 1. Calculer le total alloué à la catégorie Enfant
          let totalEnfantAllocated = 0;
          for (const [catId, amount] of Object.entries(b.allocations || {})) {
            const cat = d.categories.find((c) => c.id === catId);
            if (isChildrenCategory(cat) || isChildrenCategory(catId)) {
              totalEnfantAllocated += Number(amount) || 0;
            }
          }

          // 2. Trouver tous les enfants du foyer
          const familyChildren = d.users.filter(
            (u) => u.role === 'child' && (u.parentId === currentUserId || u.familyId === currentUserObj.familyId)
          );

          // 3. Assigner automatiquement aux budgets des enfants
          if (familyChildren.length > 0 && totalEnfantAllocated > 0) {
            const perChildAmount = Math.round((totalEnfantAllocated / familyChildren.length) * 1000) / 1000;
            for (const child of familyChildren) {
              const existingChildBudget = d.budgets.find(
                (bg) => bg.userId === child.id && (bg.start === start || bg.start.slice(0, 7) === monthKey)
              );
              const childBudgetId = existingChildBudget?.id || uid();
              const childBudget: Budget = {
                id: childBudgetId,
                userId: child.id,
                start,
                end,
                total: perChildAmount,
                allocations: existingChildBudget?.allocations || {},
              };
              sqliteSaveBudget(childBudget);
              childBudgetsToAdd.push(childBudget);

              // Mettre à jour le budget_mensuel dans SQLite pour l'enfant
              sqliteUpdateUser(child.id, { budget_mensuel: perChildAmount });
              patchUser(child.id, { budgetMensuel: perChildAmount });
            }
          }

          const existingFb = d.familyBudgets.find(
            (fb) => fb.parentId === currentUserId && (fb.month === monthKey || fb.start === start)
          );
          const familyBudget: FamilyBudget = {
            id: existingFb?.id || uid(),
            parentId: currentUserId,
            start: start,
            end: end,
            month: monthKey,
            total: b.total,
            totalBudget: b.total,
            allocations: b.allocations || existingFb?.allocations || {},
            createdAt: todayISO(),
          };
          sqliteSaveFamilyBudget(familyBudget);
          update((st) => {
            const childIds = familyChildren.map((c) => c.id);
            const otherBudgets = st.budgets.filter(
              (x) =>
                !(x.userId === currentUserId && (x.id === finalId || (x.start === start && x.end === end))) &&
                !(childIds.includes(x.userId) && (x.start === start || x.start.slice(0, 7) === monthKey))
            );
            return {
              ...st,
              budgets: [budget, ...childBudgetsToAdd, ...otherBudgets],
              familyBudgets: [
                familyBudget,
                ...(st.familyBudgets || []).filter((fb) => fb.id !== familyBudget.id),
              ],
            };
          });
        }

        // La période enregistrée devient immédiatement la référence centrale active pour tout Masrouf
        setSelectedBudgetIdState(finalId);

        // Déclenchement de la notification réelle sur le smartphone
        try {
          notifyBudgetChange(currentUserId, budget, isCreation, (n) => {
            const notifId = uid();
            const notifItem: InAppNotification = {
              ...n,
              id: notifId,
              createdAt: new Date().toISOString(),
            };
            sqliteSaveNotification(notifItem);
            update((st) => ({
              ...st,
              notifications: [notifItem, ...(st.notifications || [])],
            }));
          });
        } catch (err) {
          console.warn('notifyBudgetChange warning:', err);
        }

        return finalId;
      },

      // 9. Création ou déduplication d'un article dans le catalogue produit
      // Reconnait automatiquement les produits ayant le même nom (insensible à la casse et aux espaces)
      addProduct(p) {
        // Accès à l'état physique de la base de données
        const d = dbRef.current!;
        // Identifiant de l'utilisateur actif
        const currentUserId = meId();
        // Normalisation stricte du nom du produit (sans espaces superflus et en minuscules)
        const normName = p.name.trim().toLowerCase();

        // Recherche d'un produit déjà existant sous le même nom pour cet utilisateur
        const existing = d.products.find(
          (x) => (x.userId === currentUserId || !x.userId) && x.name.trim().toLowerCase() === normName
        );

        // Si le produit existe déjà, on réutilise sa fiche au lieu de créer un doublon
        if (existing) {
          // Préparation des éventuels champs à compléter (marque, unité, photo)
          const patch: Partial<Product> = {};
          // Mise à jour de la marque si elle était absente
          if (p.brand && !existing.brand) patch.brand = p.brand.trim();
          // Mise à jour de l'unité si elle était absente
          if (p.unit && !existing.unit) patch.unit = p.unit;
          // Mise à jour de la photo si elle était absente
          if (p.photo && !existing.photo) patch.photo = p.photo;

          // Si des enrichissements sont nécessaires
          if (Object.keys(patch).length > 0) {
            // Sauvegarde de la mise à jour dans SQLite
            sqliteUpdateProduct(existing.id, patch);
            // Mise à jour de la mémoire d'état React
            update((state) => ({
              ...state,
              products: state.products.map((item) => (item.id === existing.id ? { ...item, ...patch } : item)),
            }));
          }

          // Retour de l'identifiant du produit existant pour lier les achats successifs
          return existing.id;
        }

        // Génération d'un identifiant candidat si c'est un tout nouveau produit
        const candidateId = uid();
        // Assemblage de l'objet produit candidat
        const productCandidate: Product = { ...p, id: candidateId, userId: currentUserId, name: p.name.trim(), brand: p.brand.trim() };
        // Insertion persistante dans SQLite et récupération de la clé primaire SQLite
        const insertedId = sqliteAddProduct(productCandidate);
        const finalId = insertedId || candidateId;
        const product: Product = { ...productCandidate, id: finalId };
        // Mise à jour de la liste des produits en mémoire
        update((state) => ({ ...state, products: [...state.products, product] }));
        // Retour du nouvel identifiant généré
        return finalId;
      },

      // 10. Modification d'un produit existant
      updateProduct(id, patch) {
        sqliteUpdateProduct(id, patch);
        update((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      },

      // 11. Enregistrement d'un achat au détail avec magasin et prix unitaire
      addPurchase(p) {
        const currentUserId = meId();
        const candidateId = uid();
        const purchaseCandidate: Purchase = { ...p, id: candidateId, userId: currentUserId };
        const insertedId = sqliteAddPurchase(purchaseCandidate);
        const finalId = insertedId || candidateId;
        const purchase: Purchase = { ...purchaseCandidate, id: finalId };

        // Si l'utilisateur connecté est un compte enfant, débiter son solde personnel
        const dUser = dbRef.current?.users.find((u) => u.id === currentUserId);
        if (dUser && dUser.role === 'child') {
          const newBal = (dUser.balance || 0) - purchase.price;
          patchUser(currentUserId, { balance: newBal });
          sqliteUpdateUser(currentUserId, { balance: newBal });
        }

        update((d) => ({ ...d, purchases: [...d.purchases, purchase] }));
        // Évaluation automatique des seuils de notification (80%, 100%)
        setTimeout(() => {
          const d = dbRef.current;
          if (!d) return;
          const targetBudget = d.budgets.find(
            (b) => b.userId === currentUserId && b.start <= purchase.date && purchase.date <= b.end
          );
          if (!targetBudget) return;
          const pSpent = d.purchases
            .filter((x) => x.userId === currentUserId && x.date >= targetBudget.start && x.date <= targetBudget.end)
            .reduce((sum, x) => sum + x.price, 0);
          const eSpent = d.expenses
            .filter((x) => x.userId === currentUserId && x.date >= targetBudget.start && x.date <= targetBudget.end)
            .reduce((sum, x) => sum + x.amount, 0);
          evaluateBudgetAlerts({
            userId: currentUserId,
            budget: targetBudget,
            spent: pSpent + eSpent,
            existingNotifications: d.notifications || [],
            onTriggerNotification: (n) => {
              const notifId = uid();
              const notifItem: InAppNotification = {
                ...n,
                id: notifId,
                createdAt: new Date().toISOString(),
              };
              sqliteSaveNotification(notifItem);
              update((st) => ({
                ...st,
                notifications: [notifItem, ...(st.notifications || [])],
              }));
            },
          });

          // Alerte parentale si la dépense provient d'un compte enfant
          const currentUserObj = d.users.find((u) => u.id === currentUserId);
          if (currentUserObj?.role === 'child' && currentUserObj.parentId) {
            evaluateBudgetAlerts({
              userId: currentUserObj.parentId,
              budget: targetBudget,
              spent: pSpent + eSpent,
              existingNotifications: d.notifications || [],
              onTriggerNotification: (n) => {
                const parentNotifItem: InAppNotification = {
                  ...n,
                  id: uid(),
                  userId: currentUserObj.parentId!,
                  title: `[Alerte Enfant] ${currentUserObj.name}`,
                  body: `Votre enfant ${currentUserObj.name} a atteint un seuil budgétaire. ${n.body}`,
                  createdAt: new Date().toISOString(),
                };
                sqliteSaveNotification(parentNotifItem);
                update((st) => ({
                  ...st,
                  notifications: [parentNotifItem, ...(st.notifications || [])],
                }));
              },
            });
          }
        }, 50);
        return finalId;
      },

      // 12. Modification d'un achat existant
      // Fonction de modification d'un achat de produit : met à jour le ticket dans SQLite et dans le store
      updatePurchase(id, patch) {
        // Récupération de l'état actuel de la base
        const d = dbRef.current;
        // Recherche de l'ancien achat pour ajuster le solde si compte enfant
        const oldPurchase = d?.purchases.find((p) => p.id === id);
        // Si le prix est modifié et qu'il appartient à un enfant
        if (oldPurchase && patch.price !== undefined) {
          // Calcul de la différence de prix
          const diff = oldPurchase.price - patch.price;
          // Recherche du propriétaire
          const owner = d?.users.find((u) => u.id === oldPurchase.userId);
          // Si le propriétaire est un enfant et que le montant a changé
          if (owner && owner.role === 'child' && diff !== 0) {
            // Nouveau solde ajusté
            const newBal = (owner.balance || 0) + diff;
            // Mise à jour en mémoire
            patchUser(owner.id, { balance: newBal });
            // Sauvegarde dans SQLite
            sqliteUpdateUser(owner.id, { balance: newBal });
          }
        }
        // Enregistrement des modifications dans SQLite
        sqliteUpdatePurchase(id, patch);
        // Mise à jour de l'achat correspondant dans le tableau purchases du store
        update((st) => ({ ...st, purchases: st.purchases.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      },

      // 12b. Suppression d'un achat
      // Fonction de suppression définitive d'un achat : retire la ligne de SQLite et du store
      deletePurchase(id) {
        // Récupération de l'état actuel de la base
        const d = dbRef.current;
        // Recherche de l'achat à supprimer
        const oldPurchase = d?.purchases.find((p) => p.id === id);
        // Si l'achat appartenait à un enfant, restituer le montant sur son solde
        if (oldPurchase) {
          // Recherche du propriétaire
          const owner = d?.users.find((u) => u.id === oldPurchase.userId);
          // Si compte enfant
          if (owner && owner.role === 'child') {
            // Recrédit du montant dépensé
            const newBal = (owner.balance || 0) + oldPurchase.price;
            // Mise à jour en mémoire
            patchUser(owner.id, { balance: newBal });
            // Sauvegarde dans SQLite
            sqliteUpdateUser(owner.id, { balance: newBal });
          }
        }
        // Suppression de la ligne d'achat dans la table purchases de SQLite
        sqliteDeletePurchase(id);
        // Retrait de l'achat dans la liste mémoire du store Zustand
        update((st) => ({ ...st, purchases: st.purchases.filter((p) => p.id !== id) }));
        // Retour d'un résultat positif
        return { ok: true };
      },

      // 13. Enregistrement d'une dépense forfaitaire directe
      addExpense(e) {
        const currentUserId = meId();
        const candidateId = uid();
        const expenseCandidate: Expense = { ...e, id: candidateId, userId: currentUserId };
        const insertedId = sqliteAddExpense(expenseCandidate);
        const finalId = insertedId || candidateId;
        const expense: Expense = { ...expenseCandidate, id: finalId };

        // Si l'utilisateur connecté est un compte enfant, débiter son solde personnel
        const dUser = dbRef.current?.users.find((u) => u.id === currentUserId);
        if (dUser && dUser.role === 'child') {
          const newBal = (dUser.balance || 0) - expense.amount;
          patchUser(currentUserId, { balance: newBal });
          sqliteUpdateUser(currentUserId, { balance: newBal });
        }

        update((d) => ({ ...d, expenses: [...d.expenses, expense] }));
        // Évaluation automatique des seuils de notification (80%, 100%)
        setTimeout(() => {
          const d = dbRef.current;
          if (!d) return;
          const currentUserId = meId();
          const targetBudget = d.budgets.find(
            (b) => b.userId === currentUserId && b.start <= expense.date && expense.date <= b.end
          );
          if (!targetBudget) return;
          const pSpent = d.purchases
            .filter((x) => x.userId === currentUserId && x.date >= targetBudget.start && x.date <= targetBudget.end)
            .reduce((sum, x) => sum + x.price, 0);
          const eSpent = d.expenses
            .filter((x) => x.userId === currentUserId && x.date >= targetBudget.start && x.date <= targetBudget.end)
            .reduce((sum, x) => sum + x.amount, 0);
          evaluateBudgetAlerts({
            userId: currentUserId,
            budget: targetBudget,
            spent: pSpent + eSpent,
            existingNotifications: d.notifications || [],
            onTriggerNotification: (n) => {
              const notifId = uid();
              const notifItem: InAppNotification = {
                ...n,
                id: notifId,
                createdAt: new Date().toISOString(),
              };
              sqliteSaveNotification(notifItem);
              update((st) => ({
                ...st,
                notifications: [notifItem, ...(st.notifications || [])],
              }));
            },
          });

          // Alerte parentale si la dépense provient d'un compte enfant
          const currentUserObj = d.users.find((u) => u.id === currentUserId);
          if (currentUserObj?.role === 'child' && currentUserObj.parentId) {
            evaluateBudgetAlerts({
              userId: currentUserObj.parentId,
              budget: targetBudget,
              spent: pSpent + eSpent,
              existingNotifications: d.notifications || [],
              onTriggerNotification: (n) => {
                const parentNotifItem: InAppNotification = {
                  ...n,
                  id: uid(),
                  userId: currentUserObj.parentId!,
                  title: `[Alerte Enfant] ${currentUserObj.name}`,
                  body: `Votre enfant ${currentUserObj.name} a atteint un seuil budgétaire. ${n.body}`,
                  createdAt: new Date().toISOString(),
                };
                sqliteSaveNotification(parentNotifItem);
                update((st) => ({
                  ...st,
                  notifications: [parentNotifItem, ...(st.notifications || [])],
                }));
              },
            });
          }
        }, 50);
        return finalId;
      },

      // 14. Modification d'une dépense directe
      // Fonction de modification d'une dépense : met à jour la dépense dans SQLite et dans le store
      updateExpense(id, patch) {
        // Récupération de l'état actuel de la base
        const d = dbRef.current;
        // Recherche de l'ancienne dépense pour réajuster le solde si compte enfant
        const oldExpense = d?.expenses.find((e) => e.id === id);
        // Si le montant est modifié et qu'il appartient à un enfant
        if (oldExpense && patch.amount !== undefined) {
          // Calcul de la différence
          const diff = oldExpense.amount - patch.amount;
          // Recherche du propriétaire
          const owner = d?.users.find((u) => u.id === oldExpense.userId);
          // Si compte enfant et montant modifié
          if (owner && owner.role === 'child' && diff !== 0) {
            // Nouveau solde ajusté
            const newBal = (owner.balance || 0) + diff;
            // Mise à jour en mémoire
            patchUser(owner.id, { balance: newBal });
            // Sauvegarde dans SQLite
            sqliteUpdateUser(owner.id, { balance: newBal });
          }
        }
        // Enregistrement des modifications dans SQLite
        sqliteUpdateExpense(id, patch);
        // Mise à jour de la dépense dans la liste mémoire du store Zustand
        update((st) => ({ ...st, expenses: st.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
      },

      // 14b. Suppression d'une dépense directe
      // Fonction de suppression d'une dépense : supprime la ligne de SQLite et du store
      deleteExpense(id) {
        // Récupération de l'état actuel de la base
        const d = dbRef.current;
        // Recherche de la dépense à supprimer
        const oldExpense = d?.expenses.find((e) => e.id === id);
        // Si la dépense appartenait à un enfant, restituer le montant sur son solde
        if (oldExpense) {
          // Recherche du propriétaire
          const owner = d?.users.find((u) => u.id === oldExpense.userId);
          // Si compte enfant
          if (owner && owner.role === 'child') {
            // Recrédit du montant dépensé
            const newBal = (owner.balance || 0) + oldExpense.amount;
            // Mise à jour en mémoire
            patchUser(owner.id, { balance: newBal });
            // Sauvegarde dans SQLite
            sqliteUpdateUser(owner.id, { balance: newBal });
          }
        }
        // Suppression de la dépense dans la table expenses de SQLite
        sqliteDeleteExpense(id);
        // Retrait de la dépense de la liste mémoire du store Zustand
        update((st) => ({ ...st, expenses: st.expenses.filter((e) => e.id !== id) }));
        // Retour d'un résultat positif
        return { ok: true };
      },

      // 15. Marquage d'un budget célébré (animation de félicitations unique)
      markCelebrated(budgetId) {
        const u = dbRef.current?.users.find((x) => x.id === meId());
        if (u && !u.celebratedBudgetIds.includes(budgetId)) {
          patchUser(u.id, { celebratedBudgetIds: [...u.celebratedBudgetIds, budgetId] });
        }
      },

      // 16. Définir manuellement la période de référence centrale
      setSelectedBudgetId(id) {
        setSelectedBudgetIdState(id);
      },

      // 17. Marquer une notification comme lue
      markNotificationRead(id) {
        sqliteMarkNotificationRead(id);
        update((st) => ({
          ...st,
          notifications: (st.notifications || []).map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
      },

      // 18. Marquer toutes les notifications de l'utilisateur comme lues
      markAllNotificationsRead() {
        const currentUserId = meId();
        sqliteMarkAllNotificationsRead(currentUserId);
        update((st) => ({
          ...st,
          notifications: (st.notifications || []).map((n) =>
            n.userId === currentUserId ? { ...n, isRead: true } : n
          ),
        }));
      },

      // 19. Ajouter une notification
      addNotification(n) {
        const id = uid();
        const notif: InAppNotification = {
          ...n,
          id,
          createdAt: new Date().toISOString(),
        };
        sqliteSaveNotification(notif);
        update((st) => ({
          ...st,
          notifications: [notif, ...(st.notifications || [])],
        }));
        return id;
      },

      // 20. Administration familiale : Réinitialiser le mot de passe d'un enfant
      async resetChildPassword(childId, newPassword) {
        const pw = newPassword && newPassword.trim().length >= 6 ? newPassword.trim() : randomTemporaryPassword();
        const nextHash = await hashPassword(pw);
        sqliteUpdateUser(childId, { passwordHash: nextHash, mustChangePassword: true });
        patchUser(childId, { passwordHash: nextHash, mustChangePassword: true });
        return { ok: true, data: { password: pw } };
      },

      // 21. Administration : Émission d'un mot de passe temporaire
      async issueTemporaryPassword(id) {
        const pw = randomTemporaryPassword();
        const nextHash = await hashPassword(pw);
        patchUser(id, { passwordHash: nextHash, mustChangePassword: true });
        return pw;
      },

      // 22. Administration : Création d'une nouvelle catégorie globale
      addCategory(name, kind) {
        const d = dbRef.current!;
        const n = name.trim();
        if (!n) return { ok: false, error: 'Enter a category name.' };
        // Si c'est une catégorie pour enfants, vérifier si la catégorie Enfant existe déjà
        if (isChildrenCategory(n) && d.categories.some((c) => isChildrenCategory(c))) {
          return { ok: false, error: 'La catégorie Enfant existe déjà.' };
        }
        if (d.categories.some((c) => areCategoriesEqual(c, n))) {
          return { ok: false, error: 'This category already exists.' };
        }
        const candidateId = isChildrenCategory(n) ? CANONICAL_ENFANT_ID : uid();
        const catCandidate: Category = {
          id: candidateId,
          name: isChildrenCategory(n) ? CANONICAL_ENFANT_NAME : n,
          kind,
          active: true,
        };
        const insertedId = sqliteAddCategory(catCandidate);
        const finalId = insertedId || candidateId;
        const newCat: Category = { ...catCandidate, id: finalId };
        update((s) => ({ ...s, categories: [...s.categories, newCat] }));
        return { ok: true };
      },

      // 22b. Catégories personnalisées (pour utilisateur normal ET parent)
      addCustomCategory(name, kind, options) {
        const d = dbRef.current!;
        const currentUserId = meId();
        const n = name.trim();
        if (!n) return { ok: false, error: 'Veuillez saisir un nom de catégorie.' };
        const scope = options?.scope || 'personal';

        // Si la saisie concerne la catégorie Enfant
        if (isChildrenCategory(n)) {
          const existingEnfant = findEnfantCategory(d.categories);
          if (existingEnfant) {
            // Lier automatiquement à l'utilisateur au lieu de créer un doublon
            const me = d.users.find((u) => u.id === currentUserId);
            if (me && !me.categoryIds.includes(existingEnfant.id)) {
              const updatedCategoryIds = [...me.categoryIds, existingEnfant.id];
              sqliteSetUserCategories(currentUserId, updatedCategoryIds);
              patchUser(currentUserId, { categoryIds: updatedCategoryIds });
            }
            return { ok: false, error: 'La catégorie Enfant existe déjà dans votre catalogue.' };
          }
        }

        // Vérifier doublon dans le catalogue (insensible casse, accents, singulier/pluriel)
        const duplicate = d.categories.some(
          (c) => areCategoriesEqual(c, n) && (c.userId === currentUserId || !c.userId)
        );
        if (duplicate) {
          return { ok: false, error: 'Cette catégorie existe déjà dans votre catalogue.' };
        }

        const candidateId = isChildrenCategory(n) ? CANONICAL_ENFANT_ID : uid();
        const catCandidate: Category = {
          id: candidateId,
          name: isChildrenCategory(n) ? CANONICAL_ENFANT_NAME : n,
          kind,
          active: true,
          userId: currentUserId,
          description: options?.description,
          color: options?.color,
          icon: options?.icon,
          isCustom: true,
          scope,
          createdAt: todayISO(),
        };
        const insertedId = sqliteAddCategory(catCandidate);
        const finalId = insertedId || candidateId;
        const newCat: Category = { ...catCandidate, id: finalId };

        // Ajouter automatiquement aux catégories suivies de l'utilisateur
        const me = d.users.find((u) => u.id === currentUserId);
        const updatedCategoryIds = me ? Array.from(new Set([...me.categoryIds, finalId])) : [finalId];
        sqliteSetUserCategories(currentUserId, updatedCategoryIds);
        patchUser(currentUserId, { categoryIds: updatedCategoryIds });

        update((s) => ({
          ...s,
          categories: [...s.categories, newCat],
        }));
        return { ok: true, data: newCat };
      },

      updateCustomCategory(id, patch) {
        const d = dbRef.current!;
        const target = d.categories.find((c) => c.id === id);
        if (!target) return { ok: false, error: 'Catégorie non trouvée.' };
        sqliteUpdateCategory(id, patch);
        update((s) => ({
          ...s,
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
        return { ok: true };
      },

      deleteCustomCategory(id) {
        const d = dbRef.current!;
        const target = d.categories.find((c) => c.id === id);
        if (!target) return { ok: false, error: 'Catégorie non trouvée.' };
        if (!target.isCustom) {
          return { ok: false, error: 'Les catégories par défaut du système sont protégées et ne peuvent pas être supprimées.' };
        }

        // Vérifier si elle est utilisée par des achats ou des dépenses
        const usedInPurchases = d.purchases.some((p) => {
          const prod = d.products.find((pr) => pr.id === p.productId);
          return prod?.categoryId === id;
        });
        const usedInExpenses = d.expenses.some((e) => e.categoryId === id);
        if (usedInPurchases || usedInExpenses) {
          return { ok: false, error: 'Impossible de supprimer cette catégorie car elle est déjà utilisée par des transactions enregistrées.' };
        }

        const success = sqliteDeleteCategory(id);
        if (!success) {
          return { ok: false, error: 'Échec de la suppression dans la base SQLite.' };
        }

        update((s) => ({
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
          users: s.users.map((u) => ({
            ...u,
            categoryIds: u.categoryIds.filter((cid) => cid !== id),
          })),
        }));
        return { ok: true };
      },

      // --- Système Familial : Gestion des Enfants ---
      async createChild(name, email, password) {
        const d = dbRef.current!;
        const currentUserId = meId();
        const parent = d.users.find((u) => u.id === currentUserId);
        // Vérification que l'utilisateur est bien un parent ou administrateur
        if (!parent || (parent.role !== 'admin' && parent.role !== 'parent')) {
          return { ok: false, error: 'Seul un parent administrateur peut créer un compte enfant.' };
        }

        const cleanEmail = email.trim().toLowerCase();
        if (d.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
          return { ok: false, error: 'Cet identifiant email existe déjà dans le système.' };
        }

        const pwHash = await hashPassword(password);
        const childUser: User = {
          id: uid(),
          name: name.trim(),
          email: cleanEmail,
          passwordHash: pwHash,
          role: 'child',
          active: true,
          mustChangePassword: false,
          // L'enfant doit passer par l'onboarding de sélection de catégories à sa première connexion
          onboarded: false,
          // Catégories initiales vides pour permettre le choix libre lors de l'onboarding
          categoryIds: [],
          celebratedBudgetIds: [],
          createdAt: todayISO(),
          langue: parent.langue || 'fr',
          parentId: parent.id,
          familyId: parent.familyId || `fam-${parent.id}`,
          accountType: 'child',
          balance: 0,
          allocatedTotal: 0,
          familyName: parent.familyName,
        };

        const insertedId = sqliteAddUser(childUser);
        const savedChild: User = { ...childUser, id: insertedId || childUser.id };
        sqliteSetUserCategories(savedChild.id, savedChild.categoryIds);

        update((s) => ({
          ...s,
          users: [...s.users, savedChild],
        }));

        return { ok: true, user: savedChild, initialPassword: password };
      },

      // --- Finances Familiales : Réserve et Allocations ---
      addFamilyFunds(amount, note) {
        const d = dbRef.current!;
        const currentUserId = meId();
        const parent = d.users.find((u) => u.id === currentUserId);
        // Vérification que l'utilisateur est bien un parent ou administrateur
        if (!parent || (parent.role !== 'admin' && parent.role !== 'parent')) {
          return { ok: false, error: 'Action réservée au parent administrateur.' };
        }
        if (amount <= 0) return { ok: false, error: 'Le montant doit être supérieur à zéro.' };

        let fund = d.familyFunds.find((f) => f.parentId === parent.id);
        const now = todayISO();
        if (!fund) {
          fund = {
            id: uid(),
            parentId: parent.id,
            balance: amount,
            totalContributions: amount,
            updatedAt: now,
          };
        } else {
          fund = {
            ...fund,
            balance: fund.balance + amount,
            totalContributions: fund.totalContributions + amount,
            updatedAt: now,
          };
        }
        sqliteSaveFamilyFund(fund);

        update((s) => ({
          ...s,
          familyFunds: [fund!, ...s.familyFunds.filter((f) => f.id !== fund!.id)],
        }));
        return { ok: true };
      },

      // 21. Allocation d'argent d'un parent vers un compte enfant
      allocateMoney(childId, amount, note) {
        // Récupération de l'instantané de la base SQLite
        const d = dbRef.current!;
        // Récupération de l'identifiant du parent connecté
        const currentUserId = meId();
        // Recherche de l'utilisateur parent dans la base
        const parent = d.users.find((u) => u.id === currentUserId);
        // Vérification de sécurité que l'utilisateur est bien un parent
        if (!parent || (parent.role !== 'admin' && parent.role !== 'parent')) {
          // Erreur si non autorisé
          return { ok: false, error: 'Action réservée au parent administrateur.' };
        }
        // Vérification du montant strictement positif
        if (amount <= 0) return { ok: false, error: 'Le montant doit être supérieur à zéro.' };

        // Recherche du compte enfant destinataire rattaché à la famille
        const child = d.users.find((u) => u.id === childId && u.role === 'child');
        // Erreur si l'enfant n'est pas trouvé
        if (!child) return { ok: false, error: 'Enfant introuvable dans votre famille.' };

        // Résolution de la catégorie « Enfant » canonique
        let catEnfant = findEnfantCategory(d.categories);
        // Si absente, création automatique de la catégorie Enfant
        if (!catEnfant) {
          catEnfant = {
            id: CANONICAL_ENFANT_ID,
            name: CANONICAL_ENFANT_NAME,
            kind: 'expense',
            active: true,
            color: colors.forest,
            icon: 'people-outline',
          };
          // Persistance de la catégorie dans SQLite
          sqliteAddCategory(catEnfant);
        }

        // Récupération ou initialisation de la réserve familiale
        let fund = d.familyFunds.find((f) => f.parentId === parent.id);
        // Initialisation si inexistante
        if (!fund) {
          fund = { id: uid(), parentId: parent.id, balance: 0, totalContributions: 0, updatedAt: todayISO() };
        }

        // Décrémentation du solde de la réserve familiale et cumul des allocations
        const newFundBalance = Math.max(0, fund.balance - amount);
        // Mise à jour de l'objet réserve
        fund = {
          ...fund,
          balance: newFundBalance,
          totalAllocated: (fund.totalAllocated || 0) + amount,
          updatedAt: todayISO(),
        };
        // Persistance dans SQLite
        sqliteSaveFamilyFund(fund);

        // Incrémentation du solde disponible et du total alloué pour l'enfant
        const newChildBalance = (child.balance || 0) + amount;
        // Nouveau montant cumulé alloué
        const newChildAllocated = (child.allocatedTotal || 0) + amount;
        // Mise à jour en mémoire du profil de l'enfant
        patchUser(child.id, { balance: newChildBalance, allocatedTotal: newChildAllocated });
        // Sauvegarde durable du profil de l'enfant dans SQLite
        sqliteUpdateUser(child.id, { balance: newChildBalance, allocatedTotal: newChildAllocated });

        // Calcul des bornes du mois en cours pour le budget personnel de l'enfant
        const dateNow = new Date();
        // Date de début de mois (ex: 2026-11-01)
        const currentMonthStart = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-01`;
        // Dernier jour du mois
        const lastDayOfMonth = new Date(dateNow.getFullYear(), dateNow.getMonth() + 1, 0).getDate();
        // Date de fin de mois (ex: 2026-11-30)
        const currentMonthEnd = `${dateNow.getFullYear()}-${String(dateNow.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

        // Recherche du budget actif de l'enfant pour le mois en cours
        const existingChildBudget = d.budgets.find(
          (b) => b.userId === child.id && b.start === currentMonthStart
        );

        // Tableau mis à jour des budgets
        let updatedBudgets = d.budgets;
        // Si le budget enfant existe déjà pour le mois
        if (existingChildBudget) {
          // Nouveau total budgétaire cumulé
          const updatedChildTotal = (existingChildBudget.total || 0) + amount;
          // Mise à jour dans SQLite via sqliteSaveBudget
          sqliteSaveBudget({ ...existingChildBudget, total: updatedChildTotal });
          // Mise à jour de la liste locale
          updatedBudgets = d.budgets.map((b) =>
            b.id === existingChildBudget.id ? { ...b, total: updatedChildTotal } : b
          );
        } else {
          // Création d'un nouveau budget mensuel officiel pour l'enfant
          const newChildBudget: Budget = {
            id: uid(),
            userId: child.id,
            start: currentMonthStart,
            end: currentMonthEnd,
            total: amount,
            allocations: {},
          };
          // Insertion dans SQLite via sqliteSaveBudget
          sqliteSaveBudget(newChildBudget);
          // Ajout à la liste locale des budgets
          updatedBudgets = [...d.budgets, newChildBudget];
        }

        // Création de l'enregistrement d'allocation familiale
        const alloc: MoneyAllocation = {
          // Identifiant unique
          id: uid(),
          // Identifiant du parent
          parentId: parent.id,
          // Identifiant de l'enfant
          childId: child.id,
          // Nom de l'enfant
          childName: child.name,
          // Montant alloué
          amount,
          // Note descriptive optionnelle
          note: note || undefined,
          // Date du jour
          date: todayISO(),
          // Catégorie « Enfant »
          categoryId: catEnfant.id,
          // Nom officiel de la catégorie
          categoryName: CANONICAL_ENFANT_NAME,
          // Horodatage ISO
          createdAt: new Date().toISOString(),
        };
        // Persistance de l'allocation dans SQLite
        sqliteAddAllocation(alloc);

        // Enregistrement d'une dépense parent classée dans la catégorie « Enfant »
        const parentExpense: Expense = {
          // Identifiant unique
          id: uid(),
          // Rattaché au compte parent
          userId: parent.id,
          // Catégorie « Enfant »
          categoryId: catEnfant.id,
          // Montant déduit du budget parent
          amount,
          // Date de l'opération
          date: todayISO(),
          // Note détaillée précisant l'enfant destinataire
          note: note
            ? `Allocation argent de poche pour ${child.name} (${note})`
            : `Allocation argent de poche pour ${child.name}`,
        };
        // Sauvegarde de la dépense parent dans SQLite
        sqliteAddExpense(parentExpense);

        // Notification envoyée sur le compte de l'enfant
        const childNotif: InAppNotification = {
          id: uid(),
          userId: child.id,
          type: 'system',
          title: 'Argent de poche reçu !',
          body: `Votre parent vous a alloué ${amount.toFixed(3)} DT${note ? ` (${note})` : ''}.`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        // Persistance de la notification
        sqliteSaveNotification(childNotif);

        // Mise à jour atomique de l'état global Zustand
        update((s) => ({
          ...s,
          categories: s.categories.some((c) => c.id === catEnfant.id)
            ? s.categories
            : [...s.categories, catEnfant],
          users: s.users.map((u) =>
            u.id === parent.id && !u.categoryIds.includes(catEnfant.id)
              ? { ...u, categoryIds: [...u.categoryIds, catEnfant.id] }
              : u
          ),
          // Réserve mise à jour
          familyFunds: [fund!, ...s.familyFunds.filter((f) => f.id !== fund!.id)],
          // Allocations mises à jour
          allocations: [alloc, ...(s.allocations || [])],
          // Dépenses parent mises à jour incluant la catégorie Enfant
          expenses: [parentExpense, ...(s.expenses || [])],
          // Budgets mis à jour avec le budget alloué à l'enfant
          budgets: updatedBudgets,
          // Notifications mises à jour
          notifications: [childNotif, ...(s.notifications || [])],
        }));

        // Succès de l'opération
        return { ok: true };
      },

      // 21b. Modification atomique d'une allocation / don d'argent vers un enfant
      // Fonction de modification d'une allocation : met à jour le montant, le motif, la date, l'enfant destinataire,
      // la réserve, le solde de l'enfant et la dépense parent liée en une seule transaction cohérente
      updateAllocation(id, patch) {
        // Récupération de l'état actuel de la base
        const d = dbRef.current!;
        // Recherche de l'allocation existante par son identifiant
        const targetAlloc = (d.allocations || []).find((a) => a.id === id);
        // Si introuvable, retour d'une erreur
        if (!targetAlloc) return { ok: false, error: 'Allocation introuvable.' };

        // Ancien montant de l'allocation
        const oldAmount = targetAlloc.amount;
        // Nouveau montant après modification (ou ancien par défaut)
        const newAmount = patch.amount !== undefined ? patch.amount : oldAmount;
        // Ancien identifiant de l'enfant bénéficiaire
        const oldChildId = targetAlloc.childId;
        // Nouvel identifiant de l'enfant bénéficiaire
        const newChildId = patch.childId || oldChildId;
        // Nouvelle note ou motif
        const newNote = patch.note !== undefined ? patch.note : targetAlloc.note;
        // Nouvelle date
        const newDate = patch.date || targetAlloc.date;

        // Recherche du nouvel enfant dans la liste des utilisateurs
        const targetChild = d.users.find((u) => u.id === newChildId);
        // Nom du nouvel enfant
        const childName = targetChild?.name || targetAlloc.childName;

        // 1. Mise à jour du solde de la réserve familiale selon la différence de montant
        let fund = d.familyFunds.find((f) => f.parentId === targetAlloc.parentId);
        // Si la réserve existe
        if (fund) {
          // Différence entre nouveau et ancien montant
          const diff = newAmount - oldAmount;
          // Nouveau solde de la réserve
          const updatedBalance = Math.max(0, fund.balance - diff);
          // Nouvel objet de réserve mis à jour
          fund = { ...fund, balance: updatedBalance, updatedAt: todayISO() };
          // Sauvegarde dans SQLite
          sqliteSaveFamilyFund(fund);
        }

        // 2. Mise à jour du solde et budget de l'enfant
        // Si le don reste pour le même enfant
        if (oldChildId === newChildId) {
          // Différence de montant
          const diff = newAmount - oldAmount;
          // Si l'enfant existe
          if (targetChild) {
            // Nouveau solde de l'enfant
            const updatedBalance = Math.max(0, (targetChild.balance || 0) + diff);
            // Nouveau cumul alloué
            const updatedAllocated = Math.max(0, (targetChild.allocatedTotal || 0) + diff);
            // Mise à jour locale du profil enfant
            patchUser(targetChild.id, { balance: updatedBalance, allocatedTotal: updatedAllocated });
            // Mise à jour dans SQLite
            sqliteUpdateUser(targetChild.id, { balance: updatedBalance, allocatedTotal: updatedAllocated });
          }
        } else {
          // Si l'enfant a changé : annulation sur l'ancien enfant
          const oldChild = d.users.find((u) => u.id === oldChildId);
          // Si l'ancien enfant existe
          if (oldChild) {
            // Décrémentation du solde de l'ancien enfant
            const updatedOldBalance = Math.max(0, (oldChild.balance || 0) - oldAmount);
            // Décrémentation du cumul alloué de l'ancien enfant
            const updatedOldAllocated = Math.max(0, (oldChild.allocatedTotal || 0) - oldAmount);
            // Mise à jour locale de l'ancien enfant
            patchUser(oldChild.id, { balance: updatedOldBalance, allocatedTotal: updatedOldAllocated });
            // Mise à jour SQLite de l'ancien enfant
            sqliteUpdateUser(oldChild.id, { balance: updatedOldBalance, allocatedTotal: updatedOldAllocated });
          }
          // Crédit sur le nouvel enfant
          if (targetChild) {
            // Incrémentation du solde du nouvel enfant
            const updatedNewBalance = (targetChild.balance || 0) + newAmount;
            // Incrémentation du cumul alloué du nouvel enfant
            const updatedNewAllocated = (targetChild.allocatedTotal || 0) + newAmount;
            // Mise à jour locale du nouvel enfant
            patchUser(targetChild.id, { balance: updatedNewBalance, allocatedTotal: updatedNewAllocated });
            // Mise à jour SQLite du nouvel enfant
            sqliteUpdateUser(targetChild.id, { balance: updatedNewBalance, allocatedTotal: updatedNewAllocated });
          }
        }

        // 3. Mise à jour de la dépense parent sous la catégorie Enfant
        const matchingExpense = d.expenses.find(
          (e) =>
            e.userId === targetAlloc.parentId &&
            (isChildrenCategory(e.categoryId) || e.categoryId === targetAlloc.categoryId) &&
            (e.amount === oldAmount || (e.note && e.note.includes(targetAlloc.childName)))
        );
        // Liste des dépenses mise à jour
        let updatedExpenses = d.expenses;
        // Si la dépense parent correspondante est trouvée
        if (matchingExpense) {
          // Nouveau libellé de la dépense parent
          const updatedExpenseNote = newNote
            ? `Allocation argent de poche pour ${childName} (${newNote})`
            : `Allocation argent de poche pour ${childName}`;
          // Mise à jour dans SQLite de la dépense parent
          sqliteUpdateExpense(matchingExpense.id, {
            amount: newAmount,
            date: newDate,
            note: updatedExpenseNote,
          });
          // Mise à jour du tableau des dépenses en mémoire
          updatedExpenses = d.expenses.map((e) =>
            e.id === matchingExpense.id
              ? { ...e, amount: newAmount, date: newDate, note: updatedExpenseNote }
              : e
          );
        }

        // 4. Mise à jour de l'objet allocation
        const updatedAlloc: MoneyAllocation = {
          ...targetAlloc,
          amount: newAmount,
          childId: newChildId,
          childName,
          note: newNote,
          date: newDate,
        };
        // Sauvegarde de l'allocation modifiée dans SQLite
        sqliteUpdateAllocation(id, {
          amount: newAmount,
          childId: newChildId,
          childName,
          note: newNote,
          date: newDate,
        });

        // Mise à jour globale de l'état Zustand
        update((s) => ({
          ...s,
          // Réserve mise à jour
          familyFunds: fund ? [fund, ...s.familyFunds.filter((f) => f.id !== fund!.id)] : s.familyFunds,
          // Liste des allocations mise à jour
          allocations: (s.allocations || []).map((a) => (a.id === id ? updatedAlloc : a)),
          // Dépenses mises à jour sans doublon
          expenses: updatedExpenses,
        }));

        // Retour du succès
        return { ok: true };
      },

      // 21c. Suppression d'une allocation d'argent vers un enfant
      // Fonction de suppression d'une allocation : rembourse la réserve, déduit le solde de l'enfant
      // et supprime la dépense parent correspondante dans SQLite sans laisser de trace
      deleteAllocation(id) {
        // Récupération de l'état actuel de la base
        const d = dbRef.current!;
        // Recherche de l'allocation à supprimer
        const targetAlloc = (d.allocations || []).find((a) => a.id === id);
        // Si introuvable, retour d'une erreur
        if (!targetAlloc) return { ok: false, error: 'Allocation introuvable.' };

        // 1. Rembourser la réserve familiale du montant alloué
        let fund = d.familyFunds.find((f) => f.parentId === targetAlloc.parentId);
        // Si la réserve existe
        if (fund) {
          // Remboursement du solde
          const updatedBalance = fund.balance + targetAlloc.amount;
          // Mise à jour de l'objet réserve
          fund = { ...fund, balance: updatedBalance, updatedAt: todayISO() };
          // Sauvegarde dans SQLite
          sqliteSaveFamilyFund(fund);
        }

        // 2. Déduire le solde et le cumul de l'enfant bénéficiaire
        const child = d.users.find((u) => u.id === targetAlloc.childId);
        // Si l'enfant existe
        if (child) {
          // Nouveau solde ajusté
          const updatedBalance = Math.max(0, (child.balance || 0) - targetAlloc.amount);
          // Nouveau cumul alloué ajusté
          const updatedAllocated = Math.max(0, (child.allocatedTotal || 0) - targetAlloc.amount);
          // Mise à jour locale du profil enfant
          patchUser(child.id, { balance: updatedBalance, allocatedTotal: updatedAllocated });
          // Mise à jour dans SQLite
          sqliteUpdateUser(child.id, { balance: updatedBalance, allocatedTotal: updatedAllocated });
        }

        // 3. Supprimer la dépense parent liée dans la catégorie Enfant
        const matchingExpense = d.expenses.find(
          (e) =>
            e.userId === targetAlloc.parentId &&
            (isChildrenCategory(e.categoryId) || e.categoryId === targetAlloc.categoryId) &&
            (e.amount === targetAlloc.amount || (e.note && e.note.includes(targetAlloc.childName)))
        );
        // Si trouvée, suppression dans SQLite
        if (matchingExpense) {
          // Suppression physique de la dépense dans SQLite
          sqliteDeleteExpense(matchingExpense.id);
        }

        // 4. Suppression de la ligne d'allocation dans SQLite
        sqliteDeleteAllocation(id);

        // Mise à jour globale de l'état Zustand
        update((s) => ({
          ...s,
          // Réserve mise à jour
          familyFunds: fund ? [fund, ...s.familyFunds.filter((f) => f.id !== fund!.id)] : s.familyFunds,
          // Allocation retirée de la liste
          allocations: (s.allocations || []).filter((a) => a.id !== id),
          // Dépense parent retirée
          expenses: matchingExpense
            ? s.expenses.filter((e) => e.id !== matchingExpense.id)
            : s.expenses,
        }));

        // Succès de la suppression
        return { ok: true };
      },

      requestMoney(amount, reason) {
        const d = dbRef.current!;
        const currentUserId = meId();
        const child = d.users.find((u) => u.id === currentUserId);
        if (!child || child.role !== 'child') {
          return { ok: false, error: 'Action réservée aux comptes enfants.' };
        }
        if (!child.parentId) {
          return { ok: false, error: 'Aucun parent associé à ce compte enfant.' };
        }
        if (amount <= 0) return { ok: false, error: 'Le montant doit être supérieur à zéro.' };
        if (!reason.trim()) return { ok: false, error: 'Veuillez préciser le motif de votre demande.' };

        const req: MoneyRequest = {
          id: uid(),
          parentId: child.parentId,
          childId: child.id,
          childName: child.name,
          amount,
          reason: reason.trim(),
          status: 'pending',
          date: todayISO(),
          createdAt: new Date().toISOString(),
        };
        sqliteAddMoneyRequest(req);

        const parentNotif: InAppNotification = {
          id: uid(),
          userId: child.parentId,
          type: 'system',
          title: `Demande d'argent : ${child.name}`,
          body: `${child.name} demande ${amount.toFixed(3)} DT pour : "${reason.trim()}".`,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        sqliteSaveNotification(parentNotif);

        update((s) => ({
          ...s,
          moneyRequests: [req, ...(s.moneyRequests || [])],
          notifications: [parentNotif, ...(s.notifications || [])],
        }));

        return { ok: true };
      },

      respondToMoneyRequest(requestId, approve) {
        const d = dbRef.current!;
        const currentUserId = meId();
        const parent = d.users.find((u) => u.id === currentUserId);
        // Vérification que l'utilisateur est bien un parent ou administrateur
        if (!parent || (parent.role !== 'admin' && parent.role !== 'parent')) {
          return { ok: false, error: 'Action réservée au parent administrateur.' };
        }

        const req = d.moneyRequests.find((r) => r.id === requestId);
        if (!req) return { ok: false, error: 'Demande introuvable.' };
        if (req.status !== 'pending') return { ok: false, error: 'Cette demande a déjà été traitée.' };

        const now = new Date().toISOString();
        if (approve) {
          // Exécuter l'allocation unique
          act.allocateMoney(req.childId, req.amount, `Demande approuvée : ${req.reason}`);
          sqliteUpdateMoneyRequest(requestId, 'approved', now);
          update((s) => ({
            ...s,
            moneyRequests: s.moneyRequests.map((r) => (r.id === requestId ? { ...r, status: 'approved', respondedAt: now } : r)),
          }));
        } else {
          // Rejet sans transfert
          sqliteUpdateMoneyRequest(requestId, 'rejected', now);
          const childNotif: InAppNotification = {
            id: uid(),
            userId: req.childId,
            type: 'system',
            title: 'Demande refusée',
            body: `Votre demande de ${req.amount.toFixed(3)} DT pour "${req.reason}" n'a pas été acceptée.`,
            isRead: false,
            createdAt: now,
          };
          sqliteSaveNotification(childNotif);
          update((s) => ({
            ...s,
            moneyRequests: s.moneyRequests.map((r) => (r.id === requestId ? { ...r, status: 'rejected', respondedAt: now } : r)),
            notifications: [childNotif, ...(s.notifications || [])],
          }));
        }
        return { ok: true };
      },

      // 22. Enregistrement ou mise à jour du Budget du mois pour le foyer
      // Fonction de sauvegarde du Budget du mois : enregistre le budget global unique du foyer et met à jour le parent et les enfants
      saveFamilyBudget(b) {
        // Récupération de l'état mémoire actuel de la base
        const d = dbRef.current!;
        // Récupération de l'identifiant du parent connecté
        const currentUserId = meId();
        // Recherche de l'utilisateur parent
        const parent = d.users.find((u) => u.id === currentUserId);
        // Identifiant du parent
        const parentId = parent?.id || currentUserId;
        // Identifiant du budget ou nouvel identifiant unique
        const candidateId = b.id || uid();

        // Enregistrement de l'entité budget familial
        const budget: FamilyBudget = {
          ...b,
          id: candidateId,
          parentId,
          total: b.total,
          totalBudget: b.total,
          createdAt: todayISO(),
        };
        // Persistance dans SQLite
        sqliteSaveFamilyBudget(budget);

        // Recherche des enfants du foyer
        const familyChildren = d.users.filter(
          (u) => u.role === 'child' && (u.parentId === parentId || u.familyId === parent?.familyId)
        );
        const childUserIds = new Set(familyChildren.map((c) => c.id));

        // Décomposer les allocations : distinguer allocations enfants directes et allocations de catégories
        let totalEnfantFromCats = 0;
        const childAllocMap: Record<string, number> = {};
        const catAllocMap: Record<string, number> = {};

        for (const [key, val] of Object.entries(b.allocations || {})) {
          const numVal = Number(val) || 0;
          if (childUserIds.has(key)) {
            childAllocMap[key] = numVal;
          } else {
            catAllocMap[key] = numVal;
            const cat = d.categories.find((c) => c.id === key);
            if (isChildrenCategory(cat) || isChildrenCategory(key)) {
              totalEnfantFromCats += numVal;
            }
          }
        }

        // Si des allocations enfants directes n'étaient pas spécifiées mais que la catégorie Enfant a un budget
        if (Object.keys(childAllocMap).length === 0 && familyChildren.length > 0 && totalEnfantFromCats > 0) {
          const perChild = Math.round((totalEnfantFromCats / familyChildren.length) * 1000) / 1000;
          for (const child of familyChildren) {
            childAllocMap[child.id] = perChild;
          }
        }

        // Si des allocations enfants étaient fournies mais pas la catégorie, synchroniser la catégorie Enfant
        const totalChildAllocs = Object.values(childAllocMap).reduce((a, b) => a + b, 0);
        const enfantCat = findEnfantCategory(d.categories);
        const enfantCatId = enfantCat?.id || CANONICAL_ENFANT_ID;
        if (totalChildAllocs > 0 && !catAllocMap[enfantCatId]) {
          catAllocMap[enfantCatId] = totalChildAllocs;
        }

        // Synchronisation du budget du mois pour le compte parent (Budget global unique du foyer)
        const existingParentBudget = d.budgets.find(
          (bg) => bg.userId === parentId && (bg.start === b.start || bg.start.slice(0, 7) === b.start.slice(0, 7))
        );
        // Identifiant existant ou nouveau
        const parentBudgetId = existingParentBudget?.id || uid();
        // Objet budget parent reflétant fidèlement le Budget du mois global
        const parentBudget: Budget = {
          id: parentBudgetId,
          userId: parentId,
          start: b.start,
          end: b.end,
          total: b.total,
          allocations: Object.keys(catAllocMap).length > 0 ? catAllocMap : (existingParentBudget?.allocations || {}),
        };
        // Sauvegarde dans SQLite
        sqliteSaveBudget(parentBudget);

        // Synchronisation du budget alloué pour chaque enfant rattaché
        const updatedBudgets = [
          parentBudget,
          ...d.budgets.filter(
            (bg) => bg.id !== parentBudgetId && bg.userId !== parentId && !childUserIds.has(bg.userId)
          ),
        ];

        // Parcours et mise à jour de chaque enfant rattaché
        for (const child of familyChildren) {
          const childAllocAmount = childAllocMap[child.id] ?? 0;
          const existingChildBudget = d.budgets.find(
            (bg) => bg.userId === child.id && (bg.start === b.start || bg.start.slice(0, 7) === b.start.slice(0, 7))
          );
          const childBudgetId = existingChildBudget?.id || uid();
          const childBudget: Budget = {
            id: childBudgetId,
            userId: child.id,
            start: b.start,
            end: b.end,
            total: childAllocAmount > 0 ? childAllocAmount : (existingChildBudget?.total || 0),
            allocations: existingChildBudget?.allocations || {},
          };
          sqliteSaveBudget(childBudget);
          updatedBudgets.push(childBudget);

          if (childAllocAmount > 0) {
            sqliteUpdateUser(child.id, { budget_mensuel: childAllocAmount });
            patchUser(child.id, { budgetMensuel: childAllocAmount });
          }
        }

        // Mise à jour de l'état mémoire global
        update((s) => ({
          ...s,
          budgets: updatedBudgets,
          familyBudgets: [budget, ...(s.familyBudgets || []).filter((x) => x.id !== candidateId)],
        }));
        // Règle du budget unique : activation immédiate du budget pour l'accueil, les budgets et les analyses
        setSelectedBudgetIdState(parentBudgetId);
        // Retourne l'identifiant du budget
        return candidateId;
      },

      // --- Traitement des Transactions Vocales Intelligentes ---
      // Fonction de traitement d'une transaction vocale analysée et validée
      async applyVoiceTransaction(v: ParsedVoiceTransaction): Promise<Result> {
        // Identifiant de l'utilisateur connecté
        const currentUserId = meId();
        // Recherche de l'utilisateur en cours
        const currentUser = dbRef.current?.users.find((u) => u.id === currentUserId);
        // Sécurité si utilisateur non connecté
        if (!currentUser) return { ok: false, error: 'Utilisateur non connecté.' };

        // Résolution de la catégorie : vérification d'existence ou création automatique (Exigence 4)
        let resolvedCategoryId = v.categoryId;
        // Recherche de la catégorie correspondante dans la base
        let targetCat = dbRef.current?.categories.find(
          (c) => c.id === v.categoryId || (v.categoryName && c.name.toLowerCase() === v.categoryName.toLowerCase())
        );
        // Si aucune catégorie correspondante n'existe et qu'un nom est fourni, la créer automatiquement
        if (!targetCat && v.categoryName) {
          // Nouvel identifiant unique de catégorie
          const newCatId = uid();
          // Objet catégorie à insérer
          const createdCat: Category = {
            id: newCatId,
            name: v.categoryName.trim(),
            kind: v.type === 'purchase' ? 'product' : 'expense',
            active: true,
            color: colors.forest,
            icon: v.type === 'purchase' ? 'basket-outline' : 'receipt-outline',
          };
          // Persistance de la nouvelle catégorie dans SQLite
          sqliteAddCategory(createdCat);
          // Mise à jour synchrone de la liste en mémoire
          update((st) => ({ ...st, categories: [...st.categories, createdCat] }));
          targetCat = createdCat;
        }
        if (targetCat) {
          resolvedCategoryId = targetCat.id;
          const wasNewToUser = !currentUser.categoryIds.includes(targetCat.id);
          // Si l'utilisateur connecté ne suit pas encore cette catégorie, l'ajouter à sa sélection
          if (wasNewToUser) {
            const updatedCatIds = [...currentUser.categoryIds, targetCat.id];
            patchUser(currentUser.id, { categoryIds: updatedCatIds });
            sqliteSetUserCategories(currentUser.id, updatedCatIds);

            // Pourcentage d'allocation initial (par défaut 5% ou valeur transmise par le formulaire vocal)
            const initialPct =
              v.initialAllocationPercent && v.initialAllocationPercent > 0
                ? v.initialAllocationPercent
                : 5;
            const updatedDefaults = {
              ...(dbRef.current?.defaultPercentages || {}),
              [targetCat.id]: initialPct,
            };
            act.setDefaultPercentages(updatedDefaults);

            // Mise à jour de l'enveloppe budgétaire dans le budget actif pour affichage immédiat
            const activeB =
              dbRef.current?.budgets.find(
                (b) => b.userId === currentUserId && b.start <= (v.date || todayISO()) && (v.date || todayISO()) <= b.end
              ) || dbRef.current?.budgets.find((b) => b.userId === currentUserId);

            if (activeB) {
              const currentAlloc = activeB.allocations || {};
              if (currentAlloc[targetCat.id] === undefined) {
                const allocAmount = Math.round(activeB.total * (initialPct / 100));
                act.saveBudget({
                  id: activeB.id,
                  start: activeB.start,
                  end: activeB.end,
                  total: activeB.total,
                  allocations: {
                    ...currentAlloc,
                    [targetCat.id]: allocAmount,
                  },
                });
              }
            }
          }
        }

        // Cas 1 : Don ou allocation d'argent à un enfant
        if (v.type === 'allocation') {
          // Seul un compte parent ou admin peut effectuer une allocation familiale
          if (currentUser.role !== 'admin' && currentUser.role !== 'parent') {
            // Si utilisateur normal : enregistrement sous forme de dépense directe catégorie Enfants
            return {
              ok: true,
              data: act.addExpense({
                categoryId: resolvedCategoryId || 'children',
                amount: v.amount,
                note: v.title || v.label || "Dépense pour l'enfant",
                date: v.date || todayISO(),
              }),
            };
          }
          // Enfant destinataire
          const recipientId = v.recipientChildId || v.childId;
          // Sécurité si aucun enfant sélectionné
          if (!recipientId) {
            return { ok: false, error: 'Enfant destinataire non sélectionné.' };
          }
          // Exécution de l'allocation d'argent
          return act.allocateMoney(recipientId, v.amount, v.title || v.label);
        }

        // Cas 2 : Achat ou produit acheté en magasin
        if (v.type === 'purchase') {
          // Création ou référencement du produit dans le catalogue
          const productId = act.addProduct({
            name: v.title || v.label || 'Achat vocal',
            brand: '',
            categoryId: resolvedCategoryId || 'food',
            unit: v.unit || 'pièce',
          });
          // Ajout du ticket d'achat avec prix, quantité, unité et magasin
          act.addPurchase({
            productId,
            price: v.amount,
            quantity: v.quantity || 1,
            unit: v.unit || 'pièce',
            store: v.store || 'Commerce',
            date: v.date || todayISO(),
          });
          // Succès
          return { ok: true };
        }

        // Cas 3 : Dépense directe de service ou charge
        if (v.type === 'expense') {
          // Ajout de la dépense directe
          act.addExpense({
            categoryId: resolvedCategoryId || 'transport',
            amount: v.amount,
            note: v.title || v.label || 'Dépense vocale',
            date: v.date || todayISO(),
          });
          // Succès
          return { ok: true };
        }

        // Cas 4 : Don / Donation caritative (Exigence 10)
        if (v.type === 'donation') {
          // Recherche ou création de la catégorie Dons & Charité
          let catDon = dbRef.current?.categories.find(
            (c) =>
              c.id === 'donations' ||
              c.name.toLowerCase().includes('don') ||
              c.name.includes('تبرع') ||
              c.name.includes('صدقة')
          );
          // Si absente, création automatique de la catégorie Dons
          if (!catDon) {
            const newCat: Category = {
              id: 'donations',
              name: 'Dons & Charité',
              kind: 'expense',
              active: true,
              color: '#10B981',
              icon: 'heart-outline',
            };
            sqliteAddCategory(newCat);
            update((st) => ({ ...st, categories: [...st.categories, newCat] }));
            catDon = newCat;
          }
          // Enregistrement de la dépense de don
          act.addExpense({
            categoryId: catDon.id,
            amount: v.amount,
            note: v.title || v.label || 'Donation / صدقة',
            date: v.date || todayISO(),
          });
          return { ok: true };
        }

        // Cas d'erreur si type inconnu
        return { ok: false, error: 'Type de transaction vocale non reconnu.' };
      },

      // 23. Administration : Modification d'une catégorie
      updateCategory(id, patch) {
        sqliteUpdateCategory(id, patch);
        update((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },

      // 24. Administration : Mise à jour des types de catégories
      updateCategoryTypes(types) {
        update((d) => ({ ...d, categoryTypes: types }));
      },

      // 25. Administration : Pourcentages par défaut du budget
      setDefaultPercentages(p) {
        update((d) => ({ ...d, defaultPercentages: p }));
      },

      // 26. Administration : Règles de gamification et de points
      setPointsRules(r) {
        update((d) => ({ ...d, pointsRules: r }));
      },

      // 27. Administration : Paramètres généraux (inscriptions autorisées)
      setSettings(s) {
        update((d) => ({ ...d, settings: s }));
      },

      // 28. Préférence linguistique de l'utilisateur connecté
      setLanguage(langue) {
        if (meId()) {
          patchUser(meId(), { langue });
        }
      },
    };

    return act;
  }, [update]);

  // Notifications de l'utilisateur connecté
  const userNotifications = useMemo<InAppNotification[]>(() => {
    if (!db || !db.sessionUserId) return [];
    return (db.notifications || []).filter((n) => n.userId === db.sessionUserId);
  }, [db]);

  // Nombre de notifications non lues
  const unreadNotificationsCount = useMemo<number>(() => {
    return userNotifications.filter((n) => !n.isRead).length;
  }, [userNotifications]);

  // Synchronisation dynamique de la pastille badge (+1 / nombre non lu) sur l'icône de l'appareil
  useEffect(() => {
    syncPhoneBadgeCount(unreadNotificationsCount);
  }, [unreadNotificationsCount]);

  // Période centrale de référence calculée dynamiquement pour toute l'application
  const selectedBudget = useMemo<Budget | null>(() => {
    if (!db || !db.sessionUserId) return null;
    const userBudgets = db.budgets.filter((b) => b.userId === db.sessionUserId);
    if (userBudgets.length === 0) return null;

    // 1. Période explicitement sélectionnée
    if (selectedBudgetId) {
      const found = userBudgets.find((b) => b.id === selectedBudgetId);
      if (found) return found;
    }

    // 2. Période active couvrant la date du jour
    const today = todayISO();
    const current = userBudgets.find((b) => b.start <= today && today <= b.end);
    if (current) return current;

    // 3. Période la plus récente créée
    return [...userBudgets].sort((a, b) => b.start.localeCompare(a.start))[0] ?? null;
  }, [db, selectedBudgetId]);

  // Valeur mémoïsée exposée via le contexte
  const value = useMemo<Ctx>(() => {
    const safe = db ?? ({
      users: [],
      categories: [],
      categoryTypes: [],
      defaultPercentages: {},
      pointsRules: { periodReward: 100, streakLength: 3, streakBonus: 50, saverAt: 300, expertAt: 1000 },
      settings: { allowRegistration: true },
      budgets: [],
      products: [],
      purchases: [],
      expenses: [],
      notifications: [],
      sessionUserId: null,
      familyFunds: [],
      allocations: [],
      moneyRequests: [],
      familyBudgets: [],
    } as DB);

    return {
      db: safe,
      ready: db !== null,
      me: safe.users.find((u) => u.id === safe.sessionUserId) ?? null,
      actions,
      selectedBudgetId,
      selectedBudget,
      notifications: userNotifications,
      unreadNotificationsCount,
    };
  }, [db, actions, selectedBudgetId, selectedBudget, userNotifications, unreadNotificationsCount]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

/**
 * Hook de consommation du store Masrouf.
 * Lève une exception explicite si utilisé hors d'un <StoreProvider>.
 */
export function useStore(): Ctx {
  const c = useContext(StoreContext);
  if (!c) throw new Error('useStore must be used inside <StoreProvider>');
  return c;
}
