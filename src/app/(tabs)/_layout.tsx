/**
 * FICHIER : src/app/(tabs)/_layout.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-011
 * COMPOSANT : TabsLayout (Structure du Groupe d'Écrans Utilisateur)
 *
 * MISSION DU FICHIER :
 * Configurer le conteneur principal des 5 écrans fondamentaux de l'espace utilisateur :
 * 1. `index` : Accueil aux 4 états budgétaires dynamiques (Reste à vivre, jauges, courses récentes).
 * 2. `produits` : Catalogue des articles d'épicerie et historique des prix au litre/kilo.
 * 3. `calendrier` : Calendrier financier mensuel et matrice annuelle des dépenses.
 * 4. `analyses` : Graphiques de répartition, détection d'inflation et comparaison de périodes.
 * 5. `reglages` : Profil, langue, historique de points et déconnexion.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il gère la persistance de l'état de navigation entre les écrans principaux de l'utilisateur.
 * L'application reste rapide et réactive car les écrans conservent leur état en mémoire lors des transitions.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Masque complètement la barre d'onglets inférieure (`tabBarStyle: { display: 'none' }`) : cela libère
 *   une surface d'affichage précieuse en bas de l'écran du smartphone pour voir plus de données.
 * - La navigation entre ces 5 écrans est accessible à tout moment en ouvrant le tiroir latéral (`SideDrawer`).
 * - Masque les barres de titre grises natives du système (`headerShown: false`).
 */

import { Tabs } from 'expo-router';
import React from 'react';

/**
 * MISSION DE LA FONCTION :
 * Initialiser la navigation par onglets virtuels sans barre inférieure visible.
 *
 * RÔLE DANS L'APPLICATION :
 * Déclare les 5 écrans majeurs du parcours utilisateur quotidien dans l'architecture Expo Router.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Un affichage plein écran fluide, aéré, sans barre d'onglets encombrante en bas.
 */
export default function TabsLayout() {
  return (
    // Composant Tabs fourni par Expo Router
    <Tabs
      screenOptions={{
        // Masquage de l'en-tête natif par défaut pour laisser place à notre composant personnalisé AppHeader
        headerShown: false,
        // Masquage absolu de la barre d'onglets en bas de l'écran pour un design moderne et immersif
        tabBarStyle: { display: 'none' },
      }}
    >
      {/* 1. Écran d'accueil principal : Tableau de bord budgétaire (ECRAN-HOME-01) */}
      <Tabs.Screen name="index" />

      {/* 2. Écran du répertoire de produits et suivi d'inflation (ECRAN-TAB-02) */}
      <Tabs.Screen name="produits" />

      {/* 3. Écran du calendrier financier et grille des 12 mois (ECRAN-TAB-03) */}
      <Tabs.Screen name="calendrier" />

      {/* 4. Écran d'analyses graphiques et comparaisons de périodes (ECRAN-TAB-04) */}
      <Tabs.Screen name="analyses" />

      {/* 5. Écran des réglages et du profil personnel (ECRAN-TAB-05) */}
      <Tabs.Screen name="reglages" />
    </Tabs>
  );
}
