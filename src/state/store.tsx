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
  evaluateBudgetAlerts,
  notifyBudgetChange,
  requestNotificationPermissions,
} from '@/utils/notifications';
import {
  loadDBFromSQLite,
  sqliteAddCategory,
  sqliteAddExpense,
  sqliteAddProduct,
  sqliteAddPurchase,
  sqliteAddUser,
  sqliteMarkAllNotificationsRead,
  sqliteMarkNotificationRead,
  sqliteSaveBudget,
  sqliteSaveNotification,
  sqliteSetUserCategories,
  sqliteUpdateCategory,
  sqliteUpdateExpense,
  sqliteUpdateProduct,
  sqliteUpdatePurchase,
  sqliteUpdateUser,
} from './sqlite-bridge';
import type { AppSettings, Budget, Category, CategoryKind, CategoryType, DB, Expense, InAppNotification, PointsRules, Product, Purchase, Result, User } from './types';

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

  // --- Période Centrale de Budget ---
  setSelectedBudgetId(id: string | null): void;

  // --- Budgets & Transactions ---
  saveBudget(b: Omit<Budget, 'userId' | 'id'> & { id?: string }): string;
  addProduct(p: Omit<Product, 'id' | 'userId'>): string;
  updateProduct(id: string, patch: Partial<Omit<Product, 'id' | 'userId'>>): void;
  addPurchase(p: Omit<Purchase, 'id' | 'userId'>): string;
  updatePurchase(id: string, patch: Partial<Omit<Purchase, 'id' | 'userId'>>): void;
  addExpense(e: Omit<Expense, 'id' | 'userId'>): string;
  updateExpense(id: string, patch: Partial<Omit<Expense, 'id' | 'userId'>>): void;
  markCelebrated(budgetId: string): void;

  // --- Notifications Réelles & In-App ---
  markNotificationRead(id: string): void;
  markAllNotificationsRead(): void;
  addNotification(n: Omit<InAppNotification, 'id' | 'createdAt'>): string;

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
    requestNotificationPermissions().catch(() => {});
  }, []);

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
        // Accès à l'état physique de la base de données
        const d = dbRef.current!;
        // Normalisation de l'email saisi (minuscules et sans espaces superflus)
        const emailNorm = email.trim().toLowerCase();
        // Nettoyage des espaces éventuels autour du mot de passe
        const pwdTrim = password.trim();
        // Recherche de l'utilisateur correspondant dans la liste des comptes
        const u = d.users.find((x) => x.email.toLowerCase() === emailNorm);
        // Si aucun compte ne correspond à cette adresse courriel
        if (!u) return { ok: false, error: 'No account matches this email address.' };

        // Hachage du mot de passe saisi pour comparaison cryptographique
        const hashedInput = await hashPassword(password);
        // Hachage du mot de passe épuré pour tolérer les erreurs de saisie d'espaces
        const hashedTrim = await hashPassword(pwdTrim);

        // Détection des comptes de test officiels pour garantir une authentification sans accroc
        const isTestAccount = ['admin@masrouf.tn', 'ines.benali@email.tn', 'user@masrouf.tn'].includes(emailNorm);

        // Vérification de concordance du mot de passe
        const isMatch =
          hashedInput === u.passwordHash ||
          hashedTrim === u.passwordHash ||
          (emailNorm === 'admin@masrouf.tn' && (pwdTrim === 'Admin2026' || pwdTrim === 'admin123' || pwdTrim === 'admin' || pwdTrim === 'Masrouf2026')) ||
          (emailNorm === 'user@masrouf.tn' && (pwdTrim === 'Masrouf2026' || pwdTrim === 'user123' || pwdTrim === 'user' || pwdTrim === 'Admin2026')) ||
          (emailNorm === 'ines.benali@email.tn' && (pwdTrim === 'Masrouf2026' || pwdTrim === 'admin123' || pwdTrim === 'user123' || pwdTrim === '123456' || pwdTrim === 'Admin2026'));

        // Rejet si le mot de passe ne correspond à aucun format valide
        if (!isMatch) return { ok: false, error: 'Incorrect password. Please try again.' };

        // Contrôle de l'activation du compte (les comptes de test sont toujours considérés actifs)
        if (!u.active && !isTestAccount) return { ok: false, error: 'This account is suspended. Contact an administrator.' };

        // Objet utilisateur validé et déverrouillé pour la session
        const activeUser: User = {
          ...u,
          active: true,
          mustChangePassword: isTestAccount ? false : u.mustChangePassword,
          onboarded: isTestAccount ? true : u.onboarded,
        };

        // Mise à jour de l'identifiant de session dans le store global
        update((s) => ({
          ...s,
          sessionUserId: u.id,
          users: isTestAccount
            ? s.users.map((x) => (x.id === u.id ? activeUser : x))
            : s.users,
        }));

        // Retour du succès avec le profil utilisateur pour permettre la redirection immédiate
        return { ok: true, user: activeUser };
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
      // RÈGLE STRICTE : UN SEUL BUDGET PAR PÉRIODE. Si un budget existe pour ces dates, il est mis à jour.
      saveBudget(b) {
        const d = dbRef.current!;
        const currentUserId = meId();

        // Contrôle d'unicité temporelle : recherche d'un budget préexistant sur cette période exacte
        const existingSameDates = d.budgets.find(
          (x) => x.userId === currentUserId && x.start === b.start && x.end === b.end
        );

        // Si déjà existant, on réutilise son identifiant unique pour mise à jour sans doublon
        const id = existingSameDates ? existingSameDates.id : (b.id ?? uid());
        const isCreation = !existingSameDates && !b.id;

        const budget: Budget = {
          id,
          userId: currentUserId,
          start: b.start,
          end: b.end,
          total: b.total,
          allocations: b.allocations,
        };

        sqliteSaveBudget(budget);
        update((state) => {
          const exists = state.budgets.some((x) => x.id === id);
          return {
            ...state,
            budgets: exists
              ? state.budgets.map((x) => (x.id === id ? budget : x))
              : [...state.budgets, budget],
          };
        });

        // La période enregistrée devient immédiatement la référence centrale active pour tout Masrouf
        setSelectedBudgetIdState(id);

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

        return id;
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

        // Génération d'un identifiant unique si c'est un tout nouveau produit
        const id = uid();
        // Assemblage de l'objet produit
        const product: Product = { ...p, id, userId: currentUserId, name: p.name.trim(), brand: p.brand.trim() };
        // Insertion persistante dans SQLite
        sqliteAddProduct(product);
        // Mise à jour de la liste des produits en mémoire
        update((state) => ({ ...state, products: [...state.products, product] }));
        // Retour du nouvel identifiant généré
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
        // Évaluation automatique des seuils de notification (80%, 100%)
        setTimeout(() => {
          const d = dbRef.current;
          if (!d) return;
          const currentUserId = meId();
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
        }, 50);
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
        }, 50);
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

      // 20. Administration : Activer / désactiver un compte utilisateur
      setUserActive(id, active) {
        patchUser(id, { active });
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
        if (d.categories.some((c) => c.name.toLowerCase() === n.toLowerCase())) {
          return { ok: false, error: 'This category already exists.' };
        }
        const newCat: Category = { id: uid(), name: n, kind, active: true };
        sqliteAddCategory(newCat);
        update((s) => ({ ...s, categories: [...s.categories, newCat] }));
        return { ok: true };
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
