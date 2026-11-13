// ============================================================
// FICHIER : src/app/(tabs)/_layout.tsx
// RÔLE    : Layout racine et conteneur de navigation de l'espace utilisateur.
//           Selon le design Figma officiel de Masrouf, la navigation principale
//           se fait via un TIROIR LATÉRAL (AppDrawer animé) et non par des onglets inférieurs.
//
// MISSION DANS L'APPLICATION :
//   1. Déclarer le conteneur de navigation Expo Router pour les 5 écrans utilisateur :
//      - index.tsx (Accueil / Tableau de bord)
//      - produits.tsx (Catalogue des produits & prix)
//      - calendrier.tsx (Vue calendrier des dépenses journalières)
//      - analyses.tsx (Diagrammes, statistiques et répartition)
//      - reglages.tsx (Profil, budget, langue, manuel PDF)
//   2. Partager l'état d'ouverture du tiroir latéral (`isOpen`, `openDrawer`, `closeDrawer`)
//      avec tous les écrans enfants via le contexte React `DrawerContext`.
//   3. Superposer le composant animé `AppDrawer` au-dessus de la vue active.
//
// CE QUI S'AFFICHE SUR L'ÉCRAN :
//   - L'écran actif de l'utilisateur (index, produits, calendrier, analyses ou réglages).
//   - La barre d'onglets inférieure native est complètement masquée (`tabBarStyle: { display: 'none' }`).
//   - Lorsque l'utilisateur clique sur le bouton hamburger ☰ d'un écran, le tiroir latéral
//     `AppDrawer` glisse fluidement depuis la gauche (ou la droite en arabe RTL) avec un fond sombre semi-transparent.
// ============================================================

import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { Theme } from '../../constants/theme';
import AppDrawer from '../../components/AppDrawer';

// ------------------------------------------------------------
// INTERFACE : DrawerContextType
// RÔLE : Définit le contrat TypeScript pour les fonctions de contrôle du tiroir.
//        `openDrawer` / `ouvrirDrawer` : ouvre le tiroir latéral.
//        `closeDrawer` / `fermerDrawer` : ferme le tiroir latéral.
//        `isOpen` : booléen indiquant si le tiroir est actuellement ouvert.
// ------------------------------------------------------------
interface DrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  ouvrirDrawer: () => void;
  fermerDrawer: () => void;
  isOpen: boolean;
}

// Création du contexte React avec des valeurs par défaut sécurisées (fonctions vides no-op)
const DrawerContext = createContext<DrawerContextType>({
  openDrawer: () => {},
  closeDrawer: () => {},
  ouvrirDrawer: () => {},
  fermerDrawer: () => {},
  isOpen: false,
});

// ------------------------------------------------------------
// HOOK : useDrawer()
// BUT : Permet à n'importe quel écran enfant (index, produits, etc.)
//       d'accéder facilement aux fonctions d'ouverture et fermeture du tiroir.
// EXEMPLE D'UTILISATION :
//   const { openDrawer } = useDrawer();
//   <AppHeader onMenuPress={openDrawer} />
// ------------------------------------------------------------
export function useDrawer() {
  return useContext(DrawerContext);
}

// ------------------------------------------------------------
// COMPOSANT PRINCIPAL : TabLayout()
// BUT : Composant fonctionnel qui structure visuellement l'espace utilisateur.
// ------------------------------------------------------------
export default function TabLayout() {
  // État local contrôlant la visibilité du tiroir latéral (true = ouvert, false = fermé)
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Fonctions mémorisées via useCallback pour éviter des re-renders inutiles
  const openDrawer = useCallback(() => setDrawerVisible(true), []);
  const closeDrawer = useCallback(() => setDrawerVisible(false), []);

  return (
    // 1. Fournisseur du contexte : injecte les actions d'ouverture/fermeture vers tous les enfants
    <DrawerContext.Provider
      value={{
        openDrawer,
        closeDrawer,
        ouvrirDrawer: openDrawer,
        fermerDrawer: closeDrawer,
        isOpen: drawerVisible,
      }}
    >
      {/* Conteneur racine occupant 100 % de l'écran avec fond beige chaud Figma */}
      <View style={styles.root}>
        {/*
          2. Composant Tabs d'Expo Router :
          Gère la pile de navigation entre les 5 vues principales.
          - headerShown: false -> Désactive l'en-tête natif car chaque écran gère son propre AppHeader.
          - tabBarStyle: { display: 'none' } -> Masque la barre d'onglets pour respecter la maquette Figma.
        */}
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          {/* Écran 1 : Accueil et tableau de bord des dépenses */}
          <Tabs.Screen name="index" />
          {/* Écran 2 : Catalogue des produits et historique des prix unitaires */}
          <Tabs.Screen name="produits" />
          {/* Écran 3 : Calendrier mensuel interactif des achats par jour */}
          <Tabs.Screen name="calendrier" />
          {/* Écran 4 : Analyses statistiques, diagrammes et répartition du budget */}
          <Tabs.Screen name="analyses" />
          {/* Écran 5 : Réglages personnels, budget mensuel, langue et manuel PDF */}
          <Tabs.Screen name="reglages" />
        </Tabs>

        {/*
          3. Tiroir latéral AppDrawer :
          Superposé en couche supérieure (z-index élevé).
          S'affiche lorsque drawerVisible est vrai, et s'estompe quand on clique en dehors.
        */}
        <AppDrawer visible={drawerVisible} onClose={closeDrawer} />
      </View>
    </DrawerContext.Provider>
  );
}

// ------------------------------------------------------------
// FEUILLE DE STYLES : styles
// ------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1, // Occupe tout l'espace disponible de la fenêtre
    backgroundColor: Theme.colors.warm, // Fond #F5F3ED (Warm Off-white du design Figma)
  },
});
