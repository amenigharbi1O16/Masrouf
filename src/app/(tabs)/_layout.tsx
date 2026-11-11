// ============================================================
// FICHIER : src/app/(tabs)/_layout.tsx
// RÔLE    : Agencement des onglets inférieurs pour l'Utilisateur normal.
//           Définit les 4 onglets :
//           1. Accueil (Dashboard personnel, points, enveloppes & dépenses)
//           2. Produits (Catalogue des produits)
//           3. Analyses (Statistiques et répartition par catégorie)
//           4. Réglages (Enveloppes, mot de passe, langue, déconnexion)
// ============================================================

import React from 'react';
import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';

// Contexte et internationalisation
import { useTranslation } from '../../utils/i18n';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
        },
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTitleStyle: { fontWeight: 'bold', color: '#1E293B' },
      }}
    >
      {/* 1. ACCUEIL */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('accueil'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text>,
        }}
      />

      {/* 2. PRODUITS */}
      <Tabs.Screen
        name="produits"
        options={{
          title: t('produits'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📦</Text>,
        }}
      />

      {/* 3. ANALYSES */}
      <Tabs.Screen
        name="analyses"
        options={{
          title: t('analyses'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />

      {/* 4. REGLAGES */}
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

const styles = StyleSheet.create({});
