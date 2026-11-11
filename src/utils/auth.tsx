// ============================================================
// FICHIER : src/utils/auth.tsx
// RÔLE    : Contexte d'authentification global de Masrouf.
//           Gère la connexion, l'inscription, la restauration de session
//           sécurisée (expo-secure-store), et le changement de mot de passe.
//
// CONCEPTS REACT CONTEXT & SÉCURITÉ :
//   - Persistance sécurisée : au démarrage, restaure l'ID stocké dans
//     expo-secure-store pour éviter de redemander la connexion à chaque ouverture.
//   - Déconnexion automatique : si un compte est suspendu par l'administrateur
//     alors qu'il est en cours d'utilisation, l'app le déconnecte immédiatement.
// ============================================================

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

// Fonctions SQLite
import {
  getUserByEmail,
  getUserById,
  registerUser,
  updateUserPassword,
  Utilisateur,
} from '../db/queries';

// Modules de cryptographie et de coffre sécurisé
import { createPasswordHash, verifyPassword } from './security';
import {
  saveSessionUserId,
  getSessionUserId,
  clearSessionUserId,
} from './session';

// ============================================================
// TYPES
// ============================================================

type LoginResult = {
  success: boolean;
  errorKey?: string;
  mustChangePassword?: boolean;
};

type RegisterResult = {
  success: boolean;
  errorKey?: string;
};

type AuthContextType = {
  user: Utilisateur | null;
  isLoading: boolean;
  login: (email: string, mdp: string) => Promise<LoginResult>;
  register: (nom: string, email: string, mdp: string) => Promise<RegisterResult>;
  changePassword: (nouveauMdp: string) => Promise<{ success: boolean; errorKey?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<Utilisateur>) => void;
  refreshUser: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// COMPOSANT FOURNISSEUR : AuthProvider
// ============================================================
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Utilisateur | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ----------------------------------------------------------
  // RESTAURATION AUTOMATIQUE DE LA SESSION AU DÉMARRAGE
  // ----------------------------------------------------------
  useEffect(() => {
    async function restaurerSession() {
      try {
        const storedId = await getSessionUserId();
        if (storedId) {
          const compte = getUserById(storedId);
          // Si le compte existe et est toujours actif
          if (compte && compte.is_active === 1) {
            setUser(compte);
          } else {
            // Si le compte a été suspendu ou supprimé entre-temps
            await clearSessionUserId();
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Erreur lors de la restauration de session :', err);
      } finally {
        setIsLoading(false);
      }
    }

    restaurerSession();
  }, []);

  // ----------------------------------------------------------
  // FONCTION login()
  // RÔLE : Vérification rigoureuse avec codes d'erreur précis
  // ----------------------------------------------------------
  const login = useCallback(async (email: string, mdp: string): Promise<LoginResult> => {
    const emailNettoye = email.trim().toLowerCase();

    // 1. Validation de l'e-mail
    if (!emailNettoye || !emailNettoye.includes('@')) {
      return { success: false, errorKey: 'erreur_email_invalide' };
    }

    if (!mdp.trim()) {
      return { success: false, errorKey: 'erreur_champ_requis' };
    }

    // 2. Recherche du compte dans SQLite
    const compte = getUserByEmail(emailNettoye);
    if (!compte) {
      return { success: false, errorKey: 'erreur_compte_inconnu' };
    }

    // 3. Vérification du statut du compte (actif / suspendu)
    if (compte.is_active === 0) {
      return { success: false, errorKey: 'erreur_compte_desactive' };
    }

    // 4. Vérification cryptographique du mot de passe (SHA-256 avec sel)
    const mdpValide = await verifyPassword(mdp, compte.password_hash);
    if (!mdpValide) {
      return { success: false, errorKey: 'erreur_mot_de_passe_faux' };
    }

    // 5. Sauvegarde de la session dans le coffre matériel
    await saveSessionUserId(compte.id);
    setUser(compte);

    return {
      success: true,
      mustChangePassword: compte.must_change_password === 1,
    };
  }, []);

  // ----------------------------------------------------------
  // FONCTION register()
  // RÔLE : Inscription sécurisée d'un utilisateur de rôle 'user' uniquement
  // ----------------------------------------------------------
  const register = useCallback(
    async (nom: string, email: string, mdp: string): Promise<RegisterResult> => {
      const nomNettoye = nom.trim();
      const emailNettoye = email.trim().toLowerCase();

      if (!nomNettoye) {
        return { success: false, errorKey: 'erreur_nom_requis' };
      }

      if (!emailNettoye || !emailNettoye.includes('@')) {
        return { success: false, errorKey: 'erreur_email_invalide' };
      }

      if (mdp.length < 6) {
        return { success: false, errorKey: 'erreur_mdp_trop_court' };
      }

      // Vérifie si l'e-mail est déjà utilisé
      const existeDeja = getUserByEmail(emailNettoye);
      if (existeDeja) {
        return { success: false, errorKey: 'erreur_email_deja_pris' };
      }

      // Hachage du mot de passe avec un nouveau sel aléatoire
      const hashSecurise = await createPasswordHash(mdp);

      // Insertion du compte de rôle 'user' dans SQLite
      const nouveauId = registerUser(nomNettoye, emailNettoye, hashSecurise);
      const nouveauCompte = getUserById(nouveauId);

      if (nouveauCompte) {
        await saveSessionUserId(nouveauCompte.id);
        setUser(nouveauCompte);
        return { success: true };
      }

      return { success: false, errorKey: 'erreur_inconnue' };
    },
    []
  );

  // ----------------------------------------------------------
  // FONCTION changePassword()
  // RÔLE : Mise à jour du mot de passe et levée de l'obligation must_change_password
  // ----------------------------------------------------------
  const changePassword = useCallback(
    async (nouveauMdp: string): Promise<{ success: boolean; errorKey?: string }> => {
      if (!user) {
        return { success: false, errorKey: 'erreur_non_connecte' };
      }

      if (nouveauMdp.length < 6) {
        return { success: false, errorKey: 'erreur_mdp_trop_court' };
      }

      // Calcule le nouveau hash avec sel
      const nouveauHash = await createPasswordHash(nouveauMdp);

      // Met à jour SQLite
      updateUserPassword(user.id, nouveauHash);

      // Met à jour le state local
      setUser((prev) =>
        prev ? { ...prev, password_hash: nouveauHash, must_change_password: 0 } : null
      );

      return { success: true };
    },
    [user]
  );

  // ----------------------------------------------------------
  // FONCTION logout()
  // RÔLE : Efface la session sécurisée et déconnecte l'utilisateur
  // ----------------------------------------------------------
  const logout = useCallback(async (): Promise<void> => {
    await clearSessionUserId();
    setUser(null);
  }, []);

  // ----------------------------------------------------------
  // FONCTION updateUser()
  // ----------------------------------------------------------
  const updateUser = useCallback((updates: Partial<Utilisateur>) => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  // ----------------------------------------------------------
  // FONCTION refreshUser()
  // RÔLE : Recharge les informations fraîches depuis SQLite
  //        et déconnecte si le compte a été suspendu par l'admin.
  //        Anti-boucle : compare les champs pour éviter tout re-render inutile.
  // ----------------------------------------------------------
  const refreshUser = useCallback(() => {
    setUser((prev) => {
      if (!prev) return null;
      const frais = getUserById(prev.id);
      if (!frais || frais.is_active === 0) {
        clearSessionUserId();
        return null;
      }
      // Comparaison superficielle : si rien n'a changé, préserve la même référence (pas de re-render)
      if (
        frais.id === prev.id &&
        frais.nom === prev.nom &&
        frais.email === prev.email &&
        frais.role === prev.role &&
        frais.is_active === prev.is_active &&
        frais.must_change_password === prev.must_change_password &&
        frais.budget_mensuel === prev.budget_mensuel &&
        frais.langue === prev.langue
      ) {
        return prev;
      }
      return frais;
    });
  }, []);

  const valeur = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      register,
      changePassword,
      logout,
      updateUser,
      refreshUser,
    }),
    [user, isLoading, login, register, changePassword, logout, updateUser, refreshUser]
  );

  return <AuthContext.Provider value={valeur}>{children}</AuthContext.Provider>;
}

// ------------------------------------------------------------
// HOOK useAuth()
// ------------------------------------------------------------
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() doit être utilisé dans <AuthProvider>.');
  }
  return context;
}
