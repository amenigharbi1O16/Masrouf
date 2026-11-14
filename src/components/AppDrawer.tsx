import React from 'react';
import { useTranslation } from '@/utils/i18n';
import { DrawerItem, SideDrawer } from './SideDrawer';

export function AppDrawer() {
  const { t } = useTranslation();

  const items: DrawerItem[] = [
    { label: t('accueil'), icon: 'home-outline', href: '/(tabs)' },
    { label: t('produits'), icon: 'bag-outline', href: '/(tabs)/produits' },
    { label: t('calendrier'), icon: 'calendar-outline', href: '/(tabs)/calendrier' },
    { label: t('analyses'), icon: 'stats-chart-outline', href: '/(tabs)/analyses' },
    { label: t('points'), icon: 'trophy-outline', href: '/points' },
    { label: t('reglages'), icon: 'settings-outline', href: '/(tabs)/reglages' },
  ];

  return <SideDrawer items={items} subtitle={t('compte_personnel')} />;
}
