/**
 * FICHIER : src/components/AdminDrawer.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-040
 * COMPOSANT : AdminDrawer (Menu Tiroir Latéral Administrateur)
 *
 * RÔLE DU COMPOSANT :
 * Configure et alimente le menu tiroir latéral spécifique au rôle Administrateur :
 * - Vue d'ensemble (`/(admin)/dashboard`)
 * - Utilisateurs (`/(admin)/utilisateurs`)
 * - Catégories (`/(admin)/categories`)
 * - Types de catégories (`/(admin)/types`)
 * - Pourcentages par défaut (`/(admin)/pourcentages`)
 * - Règles de points (`/(admin)/points-regles`)
 * - Paramètres de l'application (`/(admin)/reglages`)
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Affiche le tiroir vert forêt avec le sous-titre "ADMINISTRATEUR", la liste des options
 * d'administration et le sélecteur de langue `عربي / FR / ANG` en bas.
 */

import React from 'react';
// Système d'internationalisation
import { useTranslation } from '@/utils/i18n';
// Composant générique de tiroir latéral et interface d'élément
import { DrawerItem, SideDrawer } from './SideDrawer';

/**
 * Tiroir de navigation pour le compte Administrateur.
 */
export function AdminDrawer() {
  const { t } = useTranslation();

  // Liste des destinations d'administration avec icônes et routes Expo Router
  const items: DrawerItem[] = [
    {
      label: t('vue_ensemble_admin'),
      icon: 'speedometer-outline',
      href: '/(admin)/dashboard',
    },
    {
      label: t('utilisateurs_admin'),
      icon: 'people-outline',
      href: '/(admin)/utilisateurs',
    },
    {
      label: t('categories_admin'),
      icon: 'pricetags-outline',
      href: '/(admin)/categories',
    },
    {
      label: t('types_categories'),
      icon: 'layers-outline',
      href: '/(admin)/types',
    },
    {
      label: t('pourcentages_defaut'),
      icon: 'pie-chart-outline',
      href: '/(admin)/pourcentages',
    },
    {
      label: t('regles_points_admin'),
      icon: 'trophy-outline',
      href: '/(admin)/points-regles',
    },
    {
      label: t('reglages_admin'),
      icon: 'settings-outline',
      href: '/(admin)/reglages',
    },
  ];

  return <SideDrawer items={items} subtitle={t('administrateur')} />;
}
