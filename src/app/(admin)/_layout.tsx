/**
 * FICHIER : src/app/(admin)/_layout.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-002 (Groupe Admin)
 * COMPOSANT : AdminLayout (Structure du Groupe d'Écrans Administrateur)
 *
 * MISSION DU FICHIER :
 * Configurer et encapsuler la navigation pour l'ensemble des modules d'administration.
 * Il garantit que tous les écrans du tableau de bord d'administration partagent la même
 * cohérence visuelle, le même arrière-plan et une transition d'écran fluide.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il gère la pile de navigation (Stack) du sous-dossier (admin). C'est le cadre dans lequel
 * s'ouvrent la liste des utilisateurs, la gestion des catégories, le paramétrage des points
 * et la réinitialisation des mots de passe.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Masque la barre d'en-tête système par défaut (`headerShown: false`) pour laisser place à nos propres en-têtes personnalisés avec bouton menu.
 * - Applique un arrière-plan chaud couleur sable clair (#F5F3ED) sur tous les écrans d'administration pour éviter la fatigue visuelle.
 */

import { Stack } from 'expo-router';
import React from 'react';

/**
 * MISSION DE LA FONCTION :
 * Initialiser la pile de navigation des écrans réservés à l'administrateur.
 *
 * RÔLE DANS L'APPLICATION :
 * Configure les options communes à toutes les routes de l'espace administrateur.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Un conteneur plein écran fluide sans bordures parasites avec la couleur de fond sable (#F5F3ED).
 */
export default function AdminLayout() {
  return (
    // Stack : composant de navigation en pile fourni par Expo Router
    <Stack
      screenOptions={{
        // Désactive la barre de titre native grise du système d'exploitation
        headerShown: false,
        // Définit la couleur de fond sable (#F5F3ED) commune à toute la zone administration
        contentStyle: { backgroundColor: '#F5F3ED' },
      }}
    />
  );
}
