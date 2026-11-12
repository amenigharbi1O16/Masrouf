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

// ------------------------------------------------------------
// COMPOSANT : NavigationGuard (Pare-feu applicatif)
// ------------------------------------------------------------
function NavigationGuard() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    // Si la session est en cours de restauration depuis SecureStore, on attend
    if (isLoading) return;

    const premierSegment = segments[0] as string | undefined;

    const estSurLogin = premierSegment === 'login';
    const estSurInscription = premierSegment === 'inscription';
    const estSurChangerMdp = premierSegment === 'changer-mot-de-passe';
    const estSurOnboarding = premierSegment === 'onboarding';
    const estSurTabs = premierSegment === '(tabs)';
    const estSurAdmin = premierSegment === '(admin)';

    // CAS 1 : Utilisateur NON CONNECTÉ
    if (!user) {
      if (!estSurLogin && !estSurInscription) {
        router.replace('/login');
      }
      return;
    }

    // CAS 2 : MOT DE PASSE TEMPORAIRE -> Changement obligatoire forcé
    if (user.must_change_password === 1) {
      if (!estSurChangerMdp) {
        router.replace('/changer-mot-de-passe');
      }
      return;
    }

    // CAS 3 : UTILISATEUR NORMAL (rôle 'user')
    if (user.role === 'user') {
      // 3a. Onboarding non complété -> redirection forcée vers l'assistant
      if ((user.onboarding_done ?? 0) === 0) {
        if (!estSurOnboarding) {
          router.replace('/onboarding' as any);
        }
        return;
      }

      // 3b. Onboarding déjà complété -> Bloque l'accès à l'espace admin, onboarding et pages d'auth
      if (estSurAdmin || estSurLogin || estSurInscription || estSurChangerMdp || estSurOnboarding) {
        router.replace('/(tabs)');
      }
      return;
    }

    // CAS 4 : ADMINISTRATEUR (rôle 'admin')
    if (user.role === 'admin') {
      // Bloque l'accès aux onglets utilisateurs et aux pages d'auth
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
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return null;
}

// ------------------------------------------------------------
// COMPOSANT PRINCIPAL : RootLayout
// ------------------------------------------------------------
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
        <Stack.Screen
          name="nouvel-achat"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Enregistrer une dépense',
          }}
        />
        <Stack.Screen
          name="nouveau-produit"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Nouveau Produit',
          }}
        />
        <Stack.Screen
          name="budget-mois"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Budget par enveloppes',
          }}
        />
        <Stack.Screen
          name="produit/[id]"
          options={{
            headerShown: true,
            title: 'Fiche Produit',
          }}
        />
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
