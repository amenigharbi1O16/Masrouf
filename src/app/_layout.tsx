// ============================================================
// FICHIER : src/app/_layout.tsx
// RÔLE    : Agencement racine (Root Layout) et Pare-feu de Navigation.
//           1. Initialise la base SQLite locale.
//           2. Fournit le contexte AuthProvider.
//           3. Applique la Navigation Conditionnelle stricte (RBAC) :
//              - Non connecté      -> /login ou /inscription
//              - Doit changer mdp  -> /changer-mot-de-passe
//              - Rôle 'user'       -> / (tabs) [accès à (admin) strictement bloqué]
//              - Rôle 'admin'      -> / (admin) [accès à (tabs) strictement bloqué]
// ============================================================

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, router, useSegments } from 'expo-router';

// Initialisation de la base SQLite
import { initDatabase } from '../db/database';

// Contexte d'authentification
import { AuthProvider, useAuth } from '../utils/auth';

// ============================================================
// COMPOSANT : NavigationGuard (Garde de Navigation & Pare-feu Applicatif RBAC)
// BUT       : Contrôler automatiquement et en temps réel les accès aux routes
//             selon le statut d'authentification et le rôle (admin vs user).
// MISSION DANS L'APPLICATION :
//             1. Bloquer l'accès à l'application tant que la session n'est pas restaurée.
//             2. Rediriger tout visiteur non connecté vers /login.
//             3. Forcer le changement de mot de passe si must_change_password === 1.
//             4. Interdire formellement aux utilisateurs ('user') l'accès à l'espace admin.
//             5. Interdire formellement aux administrateurs ('admin') l'accès aux onglets utilisateurs personnels.
//             6. Diriger vers l'onboarding au 1er démarrage si non complété.
// CE QUI S'AFFICHE SUR L'ÉCRAN :
//             - Pendant le chargement initial (isLoading === true) : affiche un écran
//               blanc avec un grand spinner d'attente bleu (ActivityIndicator) centré.
//             - Une fois la session déterminée : ne rend aucun élément visuel direct (null),
//               mais opère la redirection automatique vers l'écran adéquat.
// ============================================================
function NavigationGuard() {
  // Récupère l'utilisateur actuellement connecté et l'état de chargement initial
  const { user, isLoading } = useAuth();
  // Récupère le segment d'URL actif (ex: ['login'], ['(tabs)', 'index'], etc.)
  const segments = useSegments();

  useEffect(() => {
    // Si la session est en cours de restauration depuis SecureStore, on attend sans rediriger
    if (isLoading) return;

    // Détermine le premier segment de route pour identifier l'espace actuel
    const premierSegment = segments[0] as string | undefined;

    const estSurLogin = premierSegment === 'login';
    const estSurInscription = premierSegment === 'inscription';
    const estSurChangerMdp = premierSegment === 'changer-mot-de-passe';
    const estSurOnboarding = premierSegment === 'onboarding';
    const estSurTabs = premierSegment === '(tabs)';
    const estSurAdmin = premierSegment === '(admin)';

    // CAS 1 : Utilisateur NON CONNECTÉ -> Redirection immédiate vers /login
    if (!user) {
      if (!estSurLogin && !estSurInscription) {
        router.replace('/login');
      }
      return;
    }

    // CAS 2 : MOT DE PASSE TEMPORAIRE -> Redirection obligatoire vers /changer-mot-de-passe
    if (user.must_change_password === 1) {
      if (!estSurChangerMdp) {
        router.replace('/changer-mot-de-passe');
      }
      return;
    }

    // CAS 3 : UTILISATEUR NORMAL (rôle 'user')
    if (user.role === 'user') {
      // 3a. Onboarding non complété -> redirection forcée vers l'assistant en 3 étapes
      if ((user.onboarding_done ?? 0) === 0) {
        if (!estSurOnboarding) {
          router.replace('/onboarding' as any);
        }
        return;
      }

      // 3b. Onboarding déjà complété -> Bloque l'accès à l'espace admin et aux pages d'authentification
      if (estSurAdmin || estSurLogin || estSurInscription || estSurChangerMdp || estSurOnboarding) {
        router.replace('/(tabs)');
      }
      return;
    }

    // CAS 4 : ADMINISTRATEUR (rôle 'admin')
    if (user.role === 'admin') {
      // Bloque l'accès aux onglets utilisateurs et aux pages d'auth, redirige vers le dashboard admin
      if (estSurTabs || estSurLogin || estSurInscription || estSurChangerMdp || estSurOnboarding) {
        router.replace('/(admin)/dashboard' as any);
      }
      return;
    }
  }, [user, isLoading, segments]);

  // Écran d'attente lors de la restauration de la session matérielle
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        {/* Spinner circulaire centré pendant la lecture d'Expo SecureStore */}
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return null;
}

// ============================================================
// COMPOSANT PRINCIPAL : RootLayout
// BUT       : Racine absolue de l'arborescence des composants React de l'application.
// MISSION DANS L'APPLICATION :
//             1. Initialiser le schéma relationnel SQLite via initDatabase() au premier montage.
//             2. Envelopper toute l'application dans AuthProvider pour rendre l'état utilisateur accessible partout.
//             3. Intégrer le pare-feu NavigationGuard.
//             4. Déclarer la pile Stack de navigation Expo Router sans header natif redondant.
// CE QUI S'AFFICHE SUR L'ÉCRAN :
//             - Sert de conteneur d'affichage parent pour toutes les vues, routes et modales de Masrouf.
// ============================================================
export default function RootLayout() {
  useEffect(() => {
    try {
      initDatabase();
    } catch (error) {
      console.error('Erreur initialisation SQLite :', error);
    }
  }, []);

  return (
    <AuthProvider>
      <NavigationGuard />

      <Stack screenOptions={{ headerShown: false }}>
        {/* Écrans Publics d'Authentification */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="inscription" options={{ headerShown: false }} />
        <Stack.Screen name="changer-mot-de-passe" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />

        {/* Espace Utilisateur (Tabs) */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Espace Administrateur */}
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />

        {/* Modales Fonctionnelles */}
        <Stack.Screen name="nouvel-achat" options={{ headerShown: false }} />
        <Stack.Screen name="nouveau-produit" options={{ headerShown: false }} />
        <Stack.Screen name="modifier-produit" options={{ headerShown: false }} />
        <Stack.Screen name="modifier-achat" options={{ headerShown: false }} />
        <Stack.Screen name="budget-mois" options={{ headerShown: false }} />
        <Stack.Screen name="produit/[id]" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
});
