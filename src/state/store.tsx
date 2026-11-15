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
import { hashPassword, isEmail, isStrongPassword, randomTemporaryPassword } from '@/utils/security';
import { todayISO, uid } from '@/utils/format';
import { buildSeed } from './seed';
import {
  loadDBFromSQLite,
  sqliteAddCategory,
  sqliteAddExpense,
  sqliteAddProduct,
  sqliteAddPurchase,
  sqliteAddUser,
  sqliteSaveBudget,
  sqliteSetUserCategories,
  sqliteUpdateCategory,
  sqliteUpdateExpense,
  sqliteUpdateProduct,
  sqliteUpdatePurchase,
  sqliteUpdateUser,
} from './sqlite-bridge';
import type { AppSettings, Budget, Category, CategoryKind, CategoryType, DB, Expense, PointsRules, Product, Purchase, Result, User } from './types';

/** Clé de stockage AsyncStorage pour le miroir d'état */
const KEY = 'masrouf.db.v1';

/**
 * Interface des actions de mutation exposées par le store à l'ensemble de l'application.
 */
export interface Actions {
  // --- Authentification & Profil ---
  login(email: string, password: string): Promise<Result>;
  register(name: string, email: string, password: string): Promise<Result>;
  logout(): void;
  changePassword(current: string, next: string): Promise<Result>;
  updateProfile(name: string): void;
  completeOnboarding(categoryIds: string[]): void;
  setUserCategories(categoryIds: string[]): void;

  // --- Budgets & Transactions ---
  saveBudget(b: Omit<Budget, 'userId' | 'id'> & { id?: string }): string;
  addProduct(p: Omit<Product, 'id' | 'userId'>): string;
  updateProduct(id: string, patch: Partial<Omit<Product, 'id' | 'userId'>>): void;
  addPurchase(p: Omit<Purchase, 'id' | 'userId'>): string;
  updatePurchase(id: string, patch: Partial<Omit<Purchase, 'id' | 'userId'>>): void;
  addExpense(e: Omit<Expense, 'id' | 'userId'>): string;
  updateExpense(id: string, patch: Partial<Omit<Expense, 'id' | 'userId'>>): void;
  markCelebrated(budgetId: string): void;

  // --- Administration système & Paramétrage ---
  setUserActive(id: string, active: boolean): void;
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

  // ------------------------------------------------------------
  // EFFET 1 : Hydratation initiale depuis SQLite
  // ------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      let loaded: DB | null = null;
      let savedSessionId: string | null = null;

      // 1. Tente de récupérer l'identifiant de la dernière session sauvegardée
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.sessionUserId) {
            savedSessionId = String(parsed.sessionUserId);
          }
        }
      } catch {}

      // 2. Chargement prioritaire depuis la base SQLite locale
      try {
        loaded = await loadDBFromSQLite();
        if (loaded && savedSessionId) {
          // Vérification de la présence de l'utilisateur dans la base rechargée
          const exists = loaded.users.some((u) => u.id === savedSessionId);
          if (exists) {
            loaded.sessionUserId = savedSessionId;
          }
        }
      } catch (err) {
        console.warn('SQLite init/load warning:', err);
      }

      // 3. Repli de secours sur AsyncStorage si la base SQLite est vide
      if (!loaded || loaded.users.length === 0) {
        try {
          const raw = await AsyncStorage.getItem(KEY);
          if (raw) loaded = JSON.parse(raw) as DB;
        } catch { /* stockage corrompu -> amorçage par défaut */ }
      }

      // 4. Amorçage de données de démonstration de secours si tout est vierge
      if (!loaded || loaded.users.length === 0) {
        loaded = await buildSeed();
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
    if (db) AsyncStorage.setItem(KEY, JSON.stringify(db)).catch(() => {});
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

    return {
      // 1. Connexion utilisateur
      async login(email, password) {
        const d = dbRef.current!;
        const emailNorm = email.trim().toLowerCase();
        const u = d.users.find((x) => x.email.toLowerCase() === emailNorm);
        if (!u) return { ok: false, error: 'No account matches this email address.' };

        // Vérification de mot de passe souple pour les comptes de test et de soutenance
        const hashedInput = await hashPassword(password);
        const isMatch =
          hashedInput === u.passwordHash ||
          (u.email === 'admin@masrouf.tn' && (password === 'Admin2026' || password === 'admin123')) ||
          (u.email === 'user@masrouf.tn' && (password === 'Masrouf2026' || password === 'user123')) ||
          (u.email === 'ines.benali@email.tn' && password === 'Masrouf2026');

        if (!isMatch) return { ok: false, error: 'Incorrect password. Please try again.' };
        if (!u.active) return { ok: false, error: 'This account is suspended. Contact an administrator.' };

        update((s) => ({ ...s, sessionUserId: u.id }));
        return { ok: true };
      },

      // 2. Inscription d'un nouvel utilisateur
      async register(name, email, password) {
        const d = dbRef.current!;
        if (!d.settings.allowRegistration) return { ok: false, error: 'Registration is currently closed.' };
        if (!name.trim()) return { ok: false, error: 'Please enter your full name.' };
        if (!isEmail(email)) return { ok: false, error: 'Please enter a valid email address.' };
        if (!isStrongPassword(password)) return { ok: false, error: 'Use at least 8 characters with a number.' };
        if (d.users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) return { ok: false, error: 'An account already exists with this email.' };

        const user: User = {
          id: uid(),
          name: name.trim(),
          email: email.trim(),
          passwordHash: await hashPassword(password),
          role: 'user',
          active: true,
          mustChangePassword: false,
          onboarded: false,
          categoryIds: [],
          celebratedBudgetIds: [],
          createdAt: todayISO(),
        };

        // Persistance physique immédiate dans SQLite
        sqliteAddUser(user);
        update((s) => ({ ...s, users: [...s.users, user], sessionUserId: user.id }));
        return { ok: true };
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
          (u.email === 'admin@masrouf.tn' && (current === 'Admin2026' || current === 'admin123')) ||
          (u.email === 'user@masrouf.tn' && (current === 'Masrouf2026' || current === 'user123'));

        if (!isCurrentMatch) return { ok: false, error: 'The current password is incorrect.' };
        if (!isStrongPassword(next)) return { ok: false, error: 'Use at least 8 characters with a number.' };

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
      saveBudget(b) {
        const id = b.id ?? uid();
        const budget: Budget = {
          id,
          userId: meId(),
          start: b.start,
          end: b.end,
          total: b.total,
          allocations: b.allocations,
        };

        sqliteSaveBudget(budget);
        update((d) => {
          const exists = d.budgets.some((x) => x.id === id);
          return { ...d, budgets: exists ? d.budgets.map((x) => (x.id === id ? budget : x)) : [...d.budgets, budget] };
        });
        return id;
      },

      // 9. Création d'un nouvel article dans le catalogue produit
      addProduct(p) {
        const id = uid();
        const product: Product = { ...p, id, userId: meId() };
        sqliteAddProduct(product);
        update((d) => ({ ...d, products: [...d.products, product] }));
        return id;
      },

      // 10. Modification d'un produit existant
      updateProduct(id, patch) {
        sqliteUpdateProduct(id, patch);
        update((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      },

      // 11. Enregistrement d'un achat au détail avec magasin et prix unitaire
      addPurchase(p) {
        const id = uid();
        const purchase: Purchase = { ...p, id, userId: meId() };
        sqliteAddPurchase(purchase);
        update((d) => ({ ...d, purchases: [...d.purchases, purchase] }));
        return id;
      },

      // 12. Modification d'un achat existant
      updatePurchase(id, patch) {
        sqliteUpdatePurchase(id, patch);
        update((d) => ({ ...d, purchases: d.purchases.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
      },

      // 13. Enregistrement d'une dépense forfaitaire directe
      addExpense(e) {
        const id = uid();
        const expense: Expense = { ...e, id, userId: meId() };
        sqliteAddExpense(expense);
        update((d) => ({ ...d, expenses: [...d.expenses, expense] }));
        return id;
      },

      // 14. Modification d'une dépense directe
      updateExpense(id, patch) {
        sqliteUpdateExpense(id, patch);
        update((d) => ({ ...d, expenses: d.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
      },

      // 15. Marquage d'un budget célébré (animation de félicitations unique)
      markCelebrated(budgetId) {
        const u = dbRef.current?.users.find((x) => x.id === meId());
        if (u && !u.celebratedBudgetIds.includes(budgetId)) {
          patchUser(u.id, { celebratedBudgetIds: [...u.celebratedBudgetIds, budgetId] });
        }
      },

      // 16. Administration : Activer / désactiver un compte utilisateur
      setUserActive(id, active) {
        patchUser(id, { active });
      },

      // 17. Administration : Émission d'un mot de passe temporaire
      async issueTemporaryPassword(id) {
        const pw = randomTemporaryPassword();
        const nextHash = await hashPassword(pw);
        patchUser(id, { passwordHash: nextHash, mustChangePassword: true });
        return pw;
      },

      // 18. Administration : Création d'une nouvelle catégorie globale
      addCategory(name, kind) {
        const d = dbRef.current!;
        const n = name.trim();
        if (!n) return { ok: false, error: 'Enter a category name.' };
        if (d.categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
          return { ok: false, error: 'This category already exists.' };
        }
        const newCat: Category = { id: uid(), name: n, kind, active: true };
        sqliteAddCategory(newCat);
        update((s) => ({ ...s, categories: [...s.categories, newCat] }));
        return { ok: true };
      },

      // 19. Administration : Modification d'une catégorie
      updateCategory(id, patch) {
        sqliteUpdateCategory(id, patch);
        update((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
      },

      // 20. Administration : Mise à jour des types de catégories
      updateCategoryTypes(types) {
        update((d) => ({ ...d, categoryTypes: types }));
      },

      // 21. Administration : Pourcentages par défaut du budget
      setDefaultPercentages(p) {
        update((d) => ({ ...d, defaultPercentages: p }));
      },

      // 22. Administration : Règles de gamification et de points
      setPointsRules(r) {
        update((d) => ({ ...d, pointsRules: r }));
      },

      // 23. Administration : Paramètres généraux (inscriptions autorisées)
      setSettings(s) {
        update((d) => ({ ...d, settings: s }));
      },

      // 24. Préférence linguistique de l'utilisateur connecté
      setLanguage(langue) {
        if (meId()) {
          patchUser(meId(), { langue });
        }
      },
    };
  }, [update]);

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
      sessionUserId: null,
    } as DB);

    return {
      db: safe,
      ready: db !== null,
      me: safe.users.find((u) => u.id === safe.sessionUserId) ?? null,
      actions,
    };
  }, [db, actions]);

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
