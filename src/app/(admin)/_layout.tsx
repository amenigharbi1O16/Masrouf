// ============================================================
// FICHIER : src/app/(admin)/_layout.tsx
// RÔLE    : Agencement des onglets de l'espace Administrateur (Bottom Tabs).
//           Protège l'accès : seul le rôle 'admin' peut accéder à cet espace.
// ============================================================

import React, { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { Text, StyleSheet } from 'react-native';

// Contexte et internationalisation
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';

export default function AdminTabLayout() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Contrôle d'accès strict : refoulement immédiat si non-admin
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/(tabs)' as any);
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#7E22CE', // Violet distinctif pour l'Admin
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E9D5FF',
        },
        headerStyle: { backgroundColor: '#FAF5FF' },
        headerTitleStyle: { fontWeight: 'bold', color: '#581C87' },
      }}
    >
      {/* 1. Tableau de bord */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('tableau_de_bord'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>📊</Text>,
        }}
      />

      {/* 2. Gestion des utilisateurs */}
      <Tabs.Screen
        name="utilisateurs"
        options={{
          title: t('utilisateurs_admin'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>👥</Text>,
        }}
      />

      {/* 3. Gestion des catégories */}
      <Tabs.Screen
        name="categories"
        options={{
          title: t('categories_admin'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏷️</Text>,
        }}
      />

      {/* 4. Règles des points */}
      <Tabs.Screen
        name="points-regles"
        options={{
          title: t('regles_points_admin'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>⭐</Text>,
        }}
      />

      {/* 5. Réglages Admin */}
      <Tabs.Screen
        name="reglages"
        options={{
          title: t('reglages_admin'),
          tabBarIcon: () => <Text style={{ fontSize: 20 }}>⚙️</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
