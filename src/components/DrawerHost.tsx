/**
 * FICHIER : src/components/DrawerHost.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-045-HOST
 * COMPOSANT : DrawerHost (Hôte de Montage du Tiroir Latéral)
 *
 * MISSION DU COMPOSANT :
 * Monter au sommet de l'arbre visuel le tiroir latéral adapté au rôle de l'utilisateur connecté :
 * - Si `me.role === 'admin'` -> affiche `<AdminDrawer />`.
 * - Si `me.role === 'user'` -> affiche `<AppDrawer />`.
 *
 * RÔLE DANS L'APPLICATION :
 * Isole le rendu du tiroir de la définition du contexte pour briser tout cycle de dépendance
 * circulaire (Require cycle) entre DrawerContext, AdminDrawer et SideDrawer.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Affiche le tiroir coulissant (gauche pour FR/EN, droite pour AR) au-dessus de l'écran actif.
 */

// Importation de React
import React from 'react';
// Accès au profil de l'utilisateur connecté depuis le store global
import { useStore } from '@/state/store';
// Tiroir dédié aux administrateurs
import { AdminDrawer } from './AdminDrawer';
// Tiroir dédié aux utilisateurs réguliers
import { AppDrawer } from './AppDrawer';

/**
 * Composant hôte montant le tiroir selon le rôle.
 */
export function DrawerHost() {
  // Récupération de l'utilisateur connecté
  const { me } = useStore();

  // Si aucun utilisateur n'est connecté, aucun tiroir n'est rendu
  if (!me) return null;

  // Rendu conditionnel selon le rôle
  return me.role === 'admin' ? <AdminDrawer /> : <AppDrawer />;
}
