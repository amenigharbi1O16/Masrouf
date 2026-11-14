import React from 'react';
import { DrawerItem, SideDrawer } from './SideDrawer';

const ITEMS: DrawerItem[] = [
  { label: 'Home', icon: 'home-outline', href: '/' },
  { label: 'Products', icon: 'bag-outline', href: '/produits' },
  { label: 'Calendar', icon: 'calendar-outline', href: '/calendrier' },
  { label: 'Analytics', icon: 'stats-chart-outline', href: '/analyses' },
  { label: 'Points', icon: 'trophy-outline', href: '/points' },
  { label: 'Settings', icon: 'settings-outline', href: '/reglages' },
];

export function AppDrawer() {
  return <SideDrawer items={ITEMS} subtitle="Personal account" />;
}
