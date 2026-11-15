/**
 * FICHIER : src/components/AppDrawer.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-040 (Variante Utilisateur)
 * COMPOSANT : AppDrawer (Menu Tiroir Latéral Utilisateur)
 *
 * RÔLE DU COMPOSANT :
 * Configure et alimente le menu tiroir latéral pour les utilisateurs normaux :
 * - Accueil (`/(tabs)`)
 * - Produits (`/(tabs)/produits`)
 * - Calendrier (`/(tabs)/calendrier`)
 * - Analyses (`/(tabs)/analyses`)
 * - Points et niveaux (`/points`)
 * - Réglages (`/(tabs)/reglages`)
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Affiche le tiroir coulissant vert forêt avec le sous-titre "COMPTE PERSONNEL",
 * la liste des 6 écrans utilisateur avec icônes IonIcons, et le sélecteur de langue `عربي / FR / ANG` en bas.
 */

import React from 'react';
// Système d'internationalisation
import { useTranslation } from '@/utils/i18n';
// Composant générique de tiroir latéral et interface d'élément
import { DrawerItem, SideDrawer } from './SideDrawer';

/**
 * Tiroir de navigation pour l'utilisateur régulier.
 */
export function AppDrawer() {
  const { t } = useTranslation();

  // Liste des destinations utilisateur avec libellés traduits et icônes
  const items: DrawerItem[] = [
    {
      label: t('accueil'),
      icon: 'home-outline',
      href: '/(tabs)',
    },
    {
      label: t('produits'),
      icon: 'bag-outline',
      href: '/(tabs)/produits',
    },
    {
      label: t('calendrier'),
      icon: 'calendar-outline',
      href: '/(tabs)/calendrier',
    },
    {
      label: t('analyses'),
      icon: 'stats-chart-outline',
      href: '/(tabs)/analyses',
    },
    {
      label: t('points'),
      icon: 'trophy-outline',
      href: '/points',
    },
    {
      label: t('reglages'),
      icon: 'settings-outline',
      href: '/(tabs)/reglages',
    },
  ];

  return <SideDrawer items={items} subtitle={t('compte_personnel')} />;
}
