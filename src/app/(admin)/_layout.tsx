// ============================================================
// FICHIER : src/app/(admin)/_layout.tsx
// RÔLE    : Layout principal et contrôleur de navigation de l'espace Administrateur.
//           Navigation unifiée par tiroir latéral (AdminDrawer) conforme à la maquette Figma.
//
// MISSION DANS L'APPLICATION :
//   1. Déclarer le conteneur de navigation Expo Router pour les 7 écrans administrateur :
//      - dashboard.tsx (Statistiques globales de la plateforme)
//      - utilisateurs.tsx (Supervision des comptes & réinitialisation des mots de passe)
//      - categories.tsx (Gestion du catalogue global des catégories)
//      - types.tsx (Attribution des types Produit vs Dépense)
//      - pourcentages.tsx (Pourcentages indicatifs par défaut)
//      - points-regles.tsx (Barème de gamification et seuils des niveaux)
//      - reglages.tsx (Paramètres généraux et maintenance admin)
//   2. Contrôle de sécurité RBAC (Role-Based Access Control) :
//      Vérifie impérativement que l'utilisateur possède le rôle 'admin'.
//      Si un utilisateur simple tente d'accéder à ce layout, il est immédiatement refoulé.
//   3. Partager l'état d'ouverture du tiroir d'administration via `AdminDrawerContext`.
//
// CE QUI S'AFFICHE SUR L'ÉCRAN :
//   - Si l'utilisateur est admin : affiche l'écran d'administration actif sans barre d'onglets inférieure.
//   - Lorsque l'admin clique sur le menu hamburger ☰, le tiroir violet/vert forêt `AdminDrawer`
//     glisse sur le côté avec les raccourcis vers toutes les fonctions de gestion.
//   - Si non admin : écran vide (null) pendant la redirection immédiate vers /(tabs).
// ============================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs, router } from 'expo-router';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import AdminDrawer from '../../components/AdminDrawer';

// ------------------------------------------------------------
// INTERFACE : AdminDrawerContextType
// RÔLE : Contrat TypeScript décrivant les fonctions de contrôle du tiroir admin.
// ------------------------------------------------------------
interface AdminDrawerContextType {
  openDrawer: () => void;
  closeDrawer: () => void;
  ouvrirDrawer: () => void;
  fermerDrawer: () => void;
  isOpen: boolean;
}

// Création du contexte avec des fonctions vides par défaut pour éviter tout crash
const AdminDrawerContext = createContext<AdminDrawerContextType>({
  openDrawer: () => {},
  closeDrawer: () => {},
  ouvrirDrawer: () => {},
  fermerDrawer: () => {},
  isOpen: false,
});

// ------------------------------------------------------------
// HOOK : useAdminDrawer()
// BUT : Permet à chaque écran admin d'invoquer facilement `ouvrirDrawer()`
//       sur le clic du bouton hamburger de son AppHeader.
// ------------------------------------------------------------
export function useAdminDrawer() {
  return useContext(AdminDrawerContext);
}

// ------------------------------------------------------------
// COMPOSANT PRINCIPAL : AdminLayout()
// BUT : Monte la structure de navigation de l'administration et enforce la sécurité.
// ------------------------------------------------------------
export default function AdminLayout() {
  // Récupère l'utilisateur connecté depuis le contexte d'authentification
  const { user } = useAuth();
  // État local de visibilité du tiroir admin
  const [drawerVisible, setDrawerVisible] = useState(false);

  // Callbacks mémorisés pour ouvrir/fermer le tiroir sans re-render superflu
  const openDrawer = useCallback(() => setDrawerVisible(true), []);
  const closeDrawer = useCallback(() => setDrawerVisible(false), []);

  // ----------------------------------------------------------
  // SÉCURITÉ : VÉRIFICATION DU RÔLE 'admin'
  // Si l'utilisateur n'est pas connecté ou possède le rôle 'user',
  // il est automatiquement redirigé vers l'espace utilisateur normal.
  // ----------------------------------------------------------
  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.replace('/(tabs)' as any);
    }
  }, [user]);

  // Si non admin, ne rend rien pour empêcher tout flash visuel de l'interface admin
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    // 1. Fournisseur du contexte de navigation du tiroir admin
    <AdminDrawerContext.Provider
      value={{
        openDrawer,
        closeDrawer,
        ouvrirDrawer: openDrawer,
        fermerDrawer: closeDrawer,
        isOpen: drawerVisible,
      }}
    >
      {/* Conteneur principal plein écran avec fond warm off-white */}
      <View style={styles.root}>
        {/*
          2. Pile de navigation Tabs d'Expo Router :
          Tous les écrans admin sont accessibles via cette pile sans barre visible.
        */}
        <Tabs
          screenOptions={{
            headerShown: false, // En-tête natif désactivé : chaque écran a son propre AppHeader
            tabBarStyle: { display: 'none' }, // Barre inférieure masquée au profit du Drawer latéral
          }}
        >
          {/* Écran 1 : Dashboard (statistiques globales anonymes) */}
          <Tabs.Screen name="dashboard" />
          {/* Écran 2 : Gestion des utilisateurs (suspension, activation, reset MDP) */}
          <Tabs.Screen name="utilisateurs" />
          {/* Écran 3 : Gestion du catalogue des catégories */}
          <Tabs.Screen name="categories" />
          {/* Écran 4 : Types de catégories (produit vs dépense) */}
          <Tabs.Screen name="types" />
          {/* Écran 5 : Pourcentages par défaut */}
          <Tabs.Screen name="pourcentages" />
          {/* Écran 6 : Barème des points et règles de gamification */}
          <Tabs.Screen name="points-regles" />
          {/* Écran 7 : Paramètres de l'administrateur */}
          <Tabs.Screen name="reglages" />
        </Tabs>

        {/* 3. Tiroir latéral administrateur avec liste des options de gestion */}
        <AdminDrawer visible={drawerVisible} onClose={closeDrawer} />
      </View>
    </AdminDrawerContext.Provider>
  );
}

// ------------------------------------------------------------
// FEUILLE DE STYLES : styles
// ------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1, // Occupe l'intégralité de la fenêtre mobile
    backgroundColor: Theme.colors.warm, // Fond #F5F3ED
  },
});
