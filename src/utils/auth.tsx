// ============================================================
// FICHIER : src/utils/auth.ts
// RÔLE    : Système d'authentification global de l'application.
//           Utilise React Context pour partager l'utilisateur
//           connecté avec TOUS les écrans sans passer de props.
//
// CONCEPT "REACT CONTEXT" :
//   Imagine un tableau d'affichage visible depuis toute l'école.
//   AuthContext = ce tableau. N'importe quel écran peut y lire
//   "qui est connecté" sans qu'on le lui transmette manuellement.
//
// COMPOSANTS EXPORTÉS :
//   AuthProvider    → Enveloppe toute l'app dans _layout.tsx
//   useAuth()       → Hook pour lire le contexte dans n'importe quel écran
//
// UTILISATION DANS LES ÉCRANS :
//   const { user, login, logout } = useAuth();
//   if (user.role === 'admin') { ... }
// ============================================================

// createContext  = crée un "espace de partage" global
// useContext     = permet de lire cet espace depuis n'importe où
// useState       = variable réactive (re-render quand elle change)
// ReactNode      = type pour "tout ce qui peut être affiché" (enfants JSX)
import React, { createContext, useContext, useState, ReactNode } from 'react';

// Importe le type Utilisateur défini dans queries.ts
import type { Utilisateur } from '../db/queries';

// ============================================================
// TYPES : définit la forme du contexte Auth
// ============================================================

// Ce que le contexte fournit à chaque écran
type AuthContextType = {
  // user = l'utilisateur actuellement connecté, ou null si déconnecté
  user: Utilisateur | null;

  // login() = enregistre l'utilisateur dans le contexte
  // Paramètre : l'objet Utilisateur récupéré depuis SQLite
  login: (utilisateur: Utilisateur) => void;

  // logout() = efface l'utilisateur du contexte (déconnexion)
  logout: () => void;

  // updateUser() = met à jour les infos de l'utilisateur connecté
  // (utilisé après avoir sauvegardé le budget ou changé la langue)
  updateUser: (updates: Partial<Utilisateur>) => void;
};

// ============================================================
// CRÉATION DU CONTEXTE
// createContext() crée le "tableau d'affichage" vide.
// La valeur undefined sera remplacée par AuthProvider.
// ============================================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// AUTHPROVIDER — Le composant qui "remplit" le contexte
//
// RÔLE : Enveloppe toute l'application et fournit les fonctions
//        login, logout, updateUser à tous les enfants.
//
// UTILISATION DANS _layout.tsx :
//   <AuthProvider>
//     <Stack>...</Stack>
//   </AuthProvider>
//
// Paramètre 'children' : tout ce que l'on enveloppe
//   (= toute l'application : tous les écrans, navigateurs...)
// ============================================================
export function AuthProvider({ children }: { children: ReactNode }) {

  // STATE : stocke l'utilisateur connecté
  // null = personne n'est connecté (état initial au démarrage)
  // Utilisateur = objet avec id, nom, email, role, budget, langue...
  const [user, setUser] = useState<Utilisateur | null>(null);

  // ----------------------------------------------------------
  // FONCTION login()
  // RÔLE : Appelée par l'écran Login après vérification des credentials.
  //        Sauvegarde l'utilisateur dans le state → tous les écrans
  //        se mettent à jour automatiquement.
  // ----------------------------------------------------------
  function login(utilisateur: Utilisateur) {
    setUser(utilisateur);
    // setUser déclenche un re-render de toute l'application avec
    // le nouvel utilisateur disponible dans le contexte
  }

  // ----------------------------------------------------------
  // FONCTION logout()
  // RÔLE : Déconnecte l'utilisateur en remettant user à null.
  //        Appelée depuis l'écran Réglages.
  // ----------------------------------------------------------
  function logout() {
    setUser(null);
    // Remettre null → le _layout.tsx détecte user=null et redirige
    // automatiquement vers l'écran de Login
  }

  // ----------------------------------------------------------
  // FONCTION updateUser()
  // RÔLE : Met à jour partiellement l'utilisateur en mémoire.
  //        Utilisé après :
  //          - Sauvegarde du budget (budget_mensuel change)
  //          - Changement de langue (langue change → toute l'app se
  //            traduit instantanément sans ré-ouverture)
  //
  // Paramètre 'updates' : Partial<Utilisateur> = objet avec
  //   seulement les champs à modifier (pas besoin de tout envoyer)
  //   Exemple : updateUser({ budget_mensuel: 900 })
  //   → seul budget_mensuel est modifié, le reste reste intact
  // ----------------------------------------------------------
  function updateUser(updates: Partial<Utilisateur>) {
    setUser(prev => {
      // Si personne n'est connecté, on ne fait rien
      if (!prev) return null;
      // Spread operator (...) : crée un nouvel objet en combinant
      // l'ancien utilisateur et les nouvelles valeurs
      // Les nouvelles valeurs écrasent les anciennes si elles existent
      return { ...prev, ...updates };
    });
  }

  // ----------------------------------------------------------
  // VALEUR DU CONTEXTE
  // On rassemble tout ce qu'on veut partager dans un objet
  // ----------------------------------------------------------
  const valeurContexte: AuthContextType = {
    user,         // l'utilisateur connecté (ou null)
    login,        // fonction pour se connecter
    logout,       // fonction pour se déconnecter
    updateUser,   // fonction pour mettre à jour le profil
  };

  // ----------------------------------------------------------
  // RENDU : on enveloppe les enfants avec le Provider
  // AuthContext.Provider = "affiche" la valeur sur le tableau
  // Tous les composants enfants peuvent maintenant "lire" le tableau
  // ----------------------------------------------------------
  return (
    <AuthContext.Provider value={valeurContexte}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// HOOK useAuth()
// RÔLE : Donne accès au contexte Auth depuis n'importe quel écran.
//        C'est le "raccourci" pour lire le tableau d'affichage.
//
// UTILISATION :
//   const { user, login, logout } = useAuth();
//
// PROTECTION : Si useAuth() est appelé en dehors de AuthProvider,
//              on lance une erreur claire pour faciliter le debug.
// ============================================================
export function useAuth(): AuthContextType {
  // useContext(AuthContext) = lit la valeur actuelle du contexte
  const context = useContext(AuthContext);

  // Vérification : si context est undefined, c'est que useAuth()
  // a été appelé à l'extérieur de AuthProvider
  if (context === undefined) {
    throw new Error(
      'useAuth() doit être utilisé à l\'intérieur de <AuthProvider>.\n' +
      'Vérifiez que AuthProvider enveloppe bien tout dans _layout.tsx.'
    );
  }

  return context;
}

