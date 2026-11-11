// ============================================================
// FICHIER : src/app/_layout.tsx
// RÔLE    : Agencement racine (Root Layout) de l'application.
//           C'est le composant père suprême de tout le projet :
//           1. Il initialise la base SQLite locale (initDatabase).
//           2. Il injecte le contexte d'authentification (AuthProvider).
//           3. Il configure la pile de navigation (Stack Navigator).
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
import { Stack } from 'expo-router';

// Initialisation de la base de données SQLite locale
import { initDatabase } from '../db/database';

// Fournisseur du Contexte Global d'Authentification
import { AuthProvider } from '../utils/auth';

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
