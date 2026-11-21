/**
 * FICHIER : src/app/index.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-022
 * ÉCRAN : AIGUILLAGE RACINE (Root Navigation Gatekeeper)
 *
 * MISSION DU FICHIER :
 * Être le gardien d'aiguillage absolu à l'ouverture de l'application Masrouf :
 * 1. Attend l'initialisation complète de la base SQLite et le chargement de la session (`ready`).
 * 2. Si aucun utilisateur n'est connecté -> Redirige immédiatement vers l'écran de connexion (`/login`).
 * 3. Si l'utilisateur connecté est un Administrateur (`role === 'admin'`) -> Redirige vers le tableau de bord d'administration (`/(admin)/dashboard`).
 * 4. Si c'est un nouvel utilisateur n'ayant pas encore choisi ses catégories (`!onboarded`) -> Redirige vers l'assistant d'accueil (`/onboarding`).
 * 5. Si c'est un utilisateur normal régulier -> Redirige vers le tableau de bord d'accueil (`/(tabs)`).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il garantit qu'aucun utilisateur n'arrive jamais sur un écran blanc ou non autorisé.
 * La sécurité par rôle et la fluidité de reprise de session sont assurées dès la première milliseconde.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Pendant la fraction de seconde où SQLite charge les données : un écran d'attente soigné avec indicateur de chargement (`LoadingScreen`).
 * - Immédiatement après : transition fluide et invisible vers le bon écran selon le rôle et le statut de la session.
 */

import { Redirect } from 'expo-router';
import React from 'react';
// Écran d'attente avec spinner natif pendant l'initialisation de SQLite
import { LoadingScreen } from '@/components/ui';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';

/**
 * MISSION DU COMPOSANT :
 * Déterminer dynamiquement la destination de navigation initiale de l'utilisateur.
 *
 * RÔLE DANS L'APPLICATION :
 * Lit l'état d'authentification en mémoire et applique les règles de sécurité RBAC (Role-Based Access Control).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'écran de chargement temporaire, suivi d'une redirection automatique sans intervention manuelle.
 */
export default function RootIndex() {
  // Extraction de l'état de préparation de SQLite (ready) et du profil utilisateur connecté (me)
  const { ready, me } = useStore();

  // Étape 1 : Si la base SQLite est encore en cours d'ouverture ou de migration, on affiche l'écran de chargement
  if (!ready) {
    return <LoadingScreen />;
  }

  // Étape 2 : Si aucun compte n'est connecté en session, on oriente vers la page d'accueil et découverte
  if (!me) {
    return <Redirect href="/welcome" />;
  }

  // Étape 3 : Si mot de passe temporaire nécessitant un changement
  if (me.mustChangePassword) {
    return <Redirect href="/changer-mot-de-passe" />;
  }

  // Étape 4 : Si le compte n'a pas encore validé l'onboarding post-inscription (parents et utilisateurs)
  if (!me.onboarded) {
    return <Redirect href="/onboarding" />;
  }

  // Étape 5 : Pour tout utilisateur authentifié (Parent, Enfant ou Individuel), redirection vers l'accueil
  return <Redirect href="/(tabs)" />;
}
