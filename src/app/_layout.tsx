// ============================================================
// FICHIER : src/app/_layout.tsx
// RÔLE    : Agencement racine (Root Layout) de l'application.
//           C'est le composant père suprême de tout le projet :
//           1. Il initialise la base SQLite locale (initDatabase).
//           2. Il injecte le contexte d'authentification (AuthProvider).
//           3. Il configure la pile de navigation (Stack Navigator).
//           4. Il redirige automatiquement vers /login si personne n'est connecté.
//
// VISUEL SUR L'ÉCRAN :
//   Ne produit pas d'affichage direct par lui-même, mais gère
//   les transitions animées entre les écrans :
//   - Écran de connexion (Login) sans barre supérieure.
//   - Groupe d'onglets (Tabs) pour l'utilisateur normal.
//   - Groupe d'onglets (Admin) pour le tableau de bord administrateur.
//   - Modales (glissement du bas vers le haut) pour les ajouts.
//   - Écran de détail produit avec bouton retour automatique.
// ============================================================

import React, { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';

// Initialisation de la base de données SQLite locale
import { initDatabase } from '../db/database';

// Fournisseur du Contexte Global d'Authentification
import { AuthProvider, useAuth } from '../utils/auth';

// ------------------------------------------------------------
// COMPOSANT INTERNE : NavigationGuard
// RÔLE : Surveille l'état de connexion et redirige si nécessaire.
//        Séparé du RootLayout pour pouvoir utiliser useAuth()
//        APRÈS que AuthProvider soit déjà monté.
//
// LOGIQUE :
//   - user === null et on n'est pas sur /login → redirect vers /login
//   - user !== null et on est sur /login → redirect vers /(tabs)
// ------------------------------------------------------------
function NavigationGuard() {
  // Récupère l'utilisateur connecté depuis le contexte Auth
  const { user } = useAuth();

  // useSegments() retourne les segments URL actuels
  // Ex: sur /(tabs)/index → ['(tabs)', 'index']
  // Ex: sur /login → ['login']
  const segments = useSegments();

  useEffect(() => {
    // Détermine si l'écran actuel est l'écran de login
    // segments[0] === 'login' signifie qu'on est sur /login
    const estSurLogin = segments[0] === 'login';

    if (!user && !estSurLogin) {
      // Cas 1 : Personne n'est connecté et on n'est pas sur login
      // → Redirection forcée vers l'écran de connexion
      router.replace('/login');
    } else if (user && estSurLogin) {
      // Cas 2 : Utilisateur connecté mais toujours sur l'écran login
      // → Redirection vers l'accueil (ne devrait pas arriver, mais sécurité)
      router.replace('/(tabs)');
    }
    // Cas 3 : user === null et on est déjà sur login → rien à faire
    // Cas 4 : user !== null et on n'est pas sur login → rien à faire
  }, [user, segments]);

  // Ce composant ne rend rien visuellement, il ne fait que surveiller
  return null;
}

// ------------------------------------------------------------
// COMPOSANT PRINCIPAL : RootLayout
// ------------------------------------------------------------
export default function RootLayout() {
  // useEffect avec tableau de dépendances vide [] :
  // S'exécute une seule et unique fois lors du lancement de l'application
  useEffect(() => {
    try {
      // Crée les tables SQLite (utilisateurs, categories, produits, achats...)
      // et insère les comptes et données initiales de test
      initDatabase();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de SQLite :', error);
    }
  }, []);

  return (
    // AuthProvider entoure toute l'application : tous les écrans
    // pourront accéder à l'utilisateur connecté via useAuth()
    <AuthProvider>
      {/* NavigationGuard surveille user et redirige si besoin */}
      <NavigationGuard />

      <Stack>
        {/* 1. Écran de connexion : premier écran affiché */}
        <Stack.Screen
          name="login"
          options={{
            headerShown: false, // Pas d'en-tête natif sur le login
          }}
        />

        {/* 2. Le groupe d'onglets principal (Accueil, Produits, Analyses, Réglages) */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false, // Chaque onglet gère sa propre barre de titre
          }}
        />

        {/* 3. Le groupe d'onglets d'administration (Réservé au rôle Admin) */}
        <Stack.Screen
          name="(admin)"
          options={{
            headerShown: false,
          }}
        />

        {/* 4. Modale : Enregistrement d'un nouvel achat (glisse depuis le bas) */}
        <Stack.Screen
          name="nouvel-achat"
          options={{
            presentation: 'modal', // Animation modale native iOS/Android
            title: 'Enregistrer un achat',
            headerShown: true,
          }}
        />

        {/* 5. Modale : Création d'un nouveau produit (glisse depuis le bas) */}
        <Stack.Screen
          name="nouveau-produit"
          options={{
            presentation: 'modal',
            title: 'Nouveau Produit',
            headerShown: true,
          }}
        />

        {/* 6. Écran dynamique : Fiche détaillée d'un produit (/produit/[id]) */}
        <Stack.Screen
          name="produit/[id]"
          options={{
            title: 'Fiche Produit',
            headerShown: true,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}
