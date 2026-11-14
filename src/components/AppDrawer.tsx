import React from 'react';
import { DrawerItem, SideDrawer } from './SideDrawer';

const ITEMS: DrawerItem[] = [
  { label: 'Home', icon: 'home-outline', href: '/(tabs)' },
  { label: 'Products', icon: 'bag-outline', href: '/(tabs)/produits' },
  { label: 'Calendar', icon: 'calendar-outline', href: '/(tabs)/calendrier' },
  { label: 'Analytics', icon: 'stats-chart-outline', href: '/(tabs)/analyses' },
  { label: 'Points', icon: 'trophy-outline', href: '/points' },
  { label: 'Settings', icon: 'settings-outline', href: '/(tabs)/reglages' },
];

export function AppDrawer() {
  return <SideDrawer items={ITEMS} subtitle="Personal account" />;
}
