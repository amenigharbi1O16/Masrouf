import React from 'react';
import { DrawerItem, SideDrawer } from './SideDrawer';

const ITEMS: DrawerItem[] = [
  { label: 'Overview', icon: 'speedometer-outline', href: '/(admin)/dashboard' },
  { label: 'Users', icon: 'people-outline', href: '/(admin)/utilisateurs' },
  { label: 'Categories', icon: 'pricetags-outline', href: '/(admin)/categories' },
  { label: 'Category types', icon: 'layers-outline', href: '/(admin)/types' },
  { label: 'Default percentages', icon: 'pie-chart-outline', href: '/(admin)/pourcentages' },
  { label: 'Points rules', icon: 'trophy-outline', href: '/(admin)/points-regles' },
  { label: 'Settings', icon: 'settings-outline', href: '/(admin)/reglages' },
];

export function AdminDrawer() {
  return <SideDrawer items={ITEMS} subtitle="Administrator" />;
}
