import React from 'react';
import { useTranslation } from '@/utils/i18n';
import { DrawerItem, SideDrawer } from './SideDrawer';

export function AdminDrawer() {
  const { t } = useTranslation();

  const items: DrawerItem[] = [
    { label: t('vue_ensemble_admin'), icon: 'speedometer-outline', href: '/(admin)/dashboard' },
    { label: t('utilisateurs_admin'), icon: 'people-outline', href: '/(admin)/utilisateurs' },
    { label: t('categories_admin'), icon: 'pricetags-outline', href: '/(admin)/categories' },
    { label: t('types_categories'), icon: 'layers-outline', href: '/(admin)/types' },
    { label: t('pourcentages_defaut'), icon: 'pie-chart-outline', href: '/(admin)/pourcentages' },
    { label: t('regles_points_admin'), icon: 'trophy-outline', href: '/(admin)/points-regles' },
    { label: t('reglages_admin'), icon: 'settings-outline', href: '/(admin)/reglages' },
  ];

  return <SideDrawer items={items} subtitle={t('administrateur')} />;
}
