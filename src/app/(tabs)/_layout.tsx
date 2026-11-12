// ============================================================
// FICHIER : src/app/(tabs)/_layout.tsx
// RÔLE    : Layout racine de l'espace utilisateur.
//           Selon le design Figma, la navigation se fait via un
//           DRAWER LATÉRAL (tiroir) et non des onglets inférieurs.
//
// FONCTIONNEMENT :
//   - Chaque écran (index, produits, calendrier, analyses, reglages)
//     est rendu dans une Stack sans header visible (le header est
//     géré par chaque écran individuellement avec AppHeader).
//   - Le composant AppDrawer est superposé au-dessus quand visible.
//   - L'état d'ouverture du drawer est partagé via DrawerContext.
// ============================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Theme } from '../../constants/theme';
import AppDrawer from '../../components/AppDrawer';

// ------------------------------------------------------------
// CONTEXTE DU DRAWER : partagé entre le layout et les écrans enfants
// ------------------------------------------------------------
interface DrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  ouvrirDrawer: () => void;
  fermerDrawer: () => void;
  isOpen: boolean;
}

const DrawerContext = createContext<DrawerContextType>({
  openDrawer: () => {},
  closeDrawer: () => {},
  ouvrirDrawer: () => {},
  fermerDrawer: () => {},
  isOpen: false,
});

/** Hook utilisé par chaque écran pour ouvrir/fermer le drawer */
export function useDrawer() {
  return useContext(DrawerContext);
}

// ------------------------------------------------------------
// LAYOUT PRINCIPAL
// ------------------------------------------------------------
export default function TabLayout() {
  const [drawerVisible, setDrawerVisible] = useState(false);

  const openDrawer = useCallback(() => setDrawerVisible(true), []);
  const closeDrawer = useCallback(() => setDrawerVisible(false), []);

  return (
    <DrawerContext.Provider
      value={{
        openDrawer,
        closeDrawer,
        ouvrirDrawer: openDrawer,
        fermerDrawer: closeDrawer,
        isOpen: drawerVisible,
      }}
    >
      <View style={styles.root}>
        {/* ── Navigation par onglets (sans barre visible — le drawer la remplace) ── */}
        <Tabs
          screenOptions={{
            headerShown: false,         // Chaque écran gère son propre header
            tabBarStyle: { display: 'none' }, // Cache complètement la barre d'onglets
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="produits" />
          <Tabs.Screen name="calendrier" />
          <Tabs.Screen name="analyses" />
          <Tabs.Screen name="reglages" />
        </Tabs>

        {/* ── Drawer latéral superposé ── */}
        <AppDrawer visible={drawerVisible} onClose={closeDrawer} />
      </View>
    </DrawerContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
});
