// ============================================================
// FICHIER : src/app/(tabs)/_layout.tsx
// RÔLE    : Agencement des onglets inférieurs (Bottom Tab Bar).
//           Définit les 4 onglets principaux de l'application :
//           1. Accueil (Dashboard & dépenses récentes)
//           2. Produits (Catalogue & recherche)
//           3. Analyses (Statistiques mensuelles & graphiques)
//           4. Réglages (Gestion du budget & langue FR/AR)
//           + Un bouton d'accès rapide au Panneau Admin si l'utilisateur est administrateur.
//
// VISUEL SUR L'ÉCRAN :
//   Une barre blanche horizontale tout en bas de l'écran avec
//   icônes et libellés traduits dynamiquement selon la langue active.
// ============================================================

import React from 'react';
import { Tabs, router } from 'expo-router';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';

// Importation de notre système de traduction
import { useTranslation } from '../../utils/i18n';

// Importation du contexte utilisateur pour vérifier les permissions (Admin vs User)
import { useAuth } from '../../utils/auth';

export default function TabLayout() {
  // Récupération de la fonction de traduction 't'
  const { t } = useTranslation();

  // Récupération du profil de l'utilisateur connecté
  const { user } = useAuth();

  // Détermine si l'utilisateur connecté a le rôle d'administrateur
  const estAdmin = user?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        // Couleur bleue d'accentuation pour l'onglet actif
        tabBarActiveTintColor: '#2563EB',
        // Couleur grise pour les onglets non sélectionnés
        tabBarInactiveTintColor: '#64748B',
        // Style de la barre d'onglets inférieure
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
        // En-tête supérieur commun
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1E293B' },
        // Bouton dans l'en-tête supérieur droit : affiché uniquement pour l'administrateur
        headerRight: () =>
          estAdmin ? (
            <TouchableOpacity
              style={styles.adminBadgeButton}
              onPress={() => router.push('/(admin)/utilisateurs' as any)}
            >
              <Text style={styles.adminBadgeText}>👑 Admin</Text>
            </TouchableOpacity>
          ) : null,
      }}
    >
      {/* ==================================================== */}
      {/* ONGLET 1 : ACCUEIL                                   */}
      {/* ==================================================== */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('accueil'), // Titre traduit selon la langue
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />

      {/* ==================================================== */}
      {/* ONGLET 2 : PRODUITS ACHETÉS / CATALOGUE              */}
      {/* ==================================================== */}
      <Tabs.Screen
        name="produits"
        options={{
          title: t('produits'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📦</Text>,
        }}
      />

      {/* ==================================================== */}
      {/* ONGLET 3 : ANALYSES & STATISTIQUES                   */}
      {/* ==================================================== */}
      <Tabs.Screen
        name="analyses"
        options={{
          title: t('analyses'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />

      {/* ==================================================== */}
      {/* ONGLET 4 : RÉGLAGES & PRÉFÉRENCES                    */}
      {/* ==================================================== */}
      <Tabs.Screen
        name="reglages"
        options={{
          title: t('reglages'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  adminBadgeButton: {
    marginRight: 16,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  adminBadgeText: {
    color: '#7E22CE',
    fontSize: 12,
    fontWeight: '700',
  },
});
