// ============================================================
// FICHIER : src/app/(admin)/_layout.tsx
// RÔLE    : Layout principal de l'espace Administrateur.
//           Navigation unifiée par tiroir latéral (Drawer) conforme au design Figma.
//           Contrôle d'accès strict : rôle 'admin' obligatoire.
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import AdminDrawer from '../../components/AdminDrawer';

interface AdminDrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  ouvrirDrawer: () => void;
  fermerDrawer: () => void;
  isOpen: boolean;
}

const AdminDrawerContext = createContext<AdminDrawerContextType>({
  openDrawer: () => {},
  closeDrawer: () => {},
  ouvrirDrawer: () => {},
  fermerDrawer: () => {},
  isOpen: false,
});

export function useAdminDrawer() {
  return useContext(AdminDrawerContext);
}

export default function AdminLayout() {
  const { user } = useAuth();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const openDrawer = useCallback(() => setDrawerVisible(true), []);
  const closeDrawer = useCallback(() => setDrawerVisible(false), []);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/(tabs)' as any);
    }
  }, [user]);

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <AdminDrawerContext.Provider
      value={{
        openDrawer,
        closeDrawer,
        ouvrirDrawer: openDrawer,
        fermerDrawer: closeDrawer,
        isOpen: drawerVisible,
      }}
    >
      <View style={styles.root}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="dashboard" />
          <Tabs.Screen name="utilisateurs" />
          <Tabs.Screen name="categories" />
          <Tabs.Screen name="types" />
          <Tabs.Screen name="pourcentages" />
          <Tabs.Screen name="points-regles" />
          <Tabs.Screen name="reglages" />
        </Tabs>

        {/* Tiroir latéral administrateur */}
        <AdminDrawer visible={drawerVisible} onClose={closeDrawer} />
      </View>
    </AdminDrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
});
