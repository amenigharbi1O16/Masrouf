// ============================================================
// FICHIER : src/utils/auth.tsx
// RÔLE DANS L'APPLICATION :
//   Façade d'authentification légère et ergonomique au-dessus du store global React Native.
//   Expose l'état `user`, le booléen `isAdmin` (rôle 'admin') et les méthodes courantes :
//   `login`, `register`, `logout`, `changePassword`, `setLanguage`.
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est le badge d'accès de sécurité du bâtiment : il indique qui vous êtes,
//   si vous avez les clés d'administrateur ou les droits d'utilisateur normal,
//   et vous permet de vous identifier auprès de n'importe quel guichet de l'application.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Détermine quels écrans sont accessibles (navigation protégée), affiche le bon tiroir
//   (AdminDrawer ou AppDrawer) et personnalise le prénom sur le tableau de bord.
// ============================================================

import { useStore } from '@/state/store';

/**
 * MISSION DE LA FONCTION : useAuth
 *   Hook personnalisé donnant un accès direct et réactif à l'utilisateur actuellement connecté,
 *   à son statut de rôle (`isAdmin`), et aux fonctions d'authentification.
 *
 * RÔLE DANS L'APPLICATION :
 *   Consommé par les layouts (`_layout.tsx`), les formulaires de connexion et les en-têtes
 *   pour adapter instantanément l'affichage selon les privilèges du compte.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Alimente le nom de l'utilisateur sur la page d'accueil, affiche l'icône de profil
 *   et pilote la redirection entre l'espace utilisateur et l'espace administrateur.
 */
export function useAuth() {
  const { me, ready, actions } = useStore();
  return {
    user: me,
    ready,
    // Le rôle parent ou administrateur a accès aux fonctionnalités familiales
    isAdmin: me?.role === 'parent' || me?.role === 'admin',
    // Booléens pratiques pour distinguer les rôles
    isParent: me?.role === 'parent' || me?.role === 'admin' || me?.accountType === 'family',
    isChild: me?.role === 'child' || me?.accountType === 'child',
    login: actions.login,
    register: actions.register,
    logout: actions.logout,
    changePassword: actions.changePassword,
    setLanguage: actions.setLanguage,
    refreshUser: async () => {},
  };
}
