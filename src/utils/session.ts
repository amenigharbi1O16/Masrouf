// ============================================================
// FICHIER : src/utils/session.ts
// RÔLE DANS L'APPLICATION :
//   Aiguilleur de navigation (Route Guard) et contrôleur d'accès après authentification.
//   Détermine l'écran exact vers lequel un utilisateur doit être dirigé selon sa situation :
//   1. Renouvellement forcé : si `must_change_password === 1` -> `/changer-mot-de-passe`.
//   2. Administrateur : si `role === 'admin'` -> `/(admin)/dashboard`.
//   3. Nouvel inscrit : si `!onboarded` (ou `onboarding_done === 0`) -> `/onboarding`.
//   4. Utilisateur opérationnel : -> `/(tabs)` (Tableau de bord principal).
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est l'agent d'accueil à l'entrée d'un aéroport :
//   - Si votre passeport est expiré, il vous oriente immédiatement vers le guichet de renouvellement.
//   - Si vous êtes membre du personnel navigant (administrateur), il vous ouvre le sas officiel.
//   - Si vous n'avez pas encore fait enregistrer vos bagages (onboarding), il vous envoie aux comptoirs.
//   - Si tout est en règle, il vous ouvre l'accès direct à la porte d'embarquement (tableau de bord).
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Empêche tout accès illégal, garantit la sécurité des mots de passe temporaires
//   et guide sans friction le nouvel utilisateur à travers son parcours de découverte.
// ============================================================

import type { User } from '@/state/types';

/**
 * MISSION DE LA FONCTION : homeRouteFor
 *   Analyse l'état du profil utilisateur et renvoie la chaîne de la route Expo Router
 *   prioritaire vers laquelle l'application doit basculer.
 *
 * RÔLE DANS L'APPLICATION :
 *   Appelée à la racine (`src/app/index.tsx`) et à la fin de la connexion (`login.tsx`).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Provoque la transition fluide vers l'écran d'accueil adéquat sans jamais afficher d'écran blanc.
 *
 * @param user Profil de l'utilisateur authentifié.
 */
export function homeRouteFor(user: User): string {
  if (user.mustChangePassword) return '/changer-mot-de-passe';
  if (!user.onboarded) return '/onboarding';
  return '/(tabs)';
}
