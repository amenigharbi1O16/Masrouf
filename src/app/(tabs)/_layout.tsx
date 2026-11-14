import { Tabs } from 'expo-router';
import React from 'react';

/** The design has NO bottom tab bar: navigation is the left drawer. Tabs is only used to keep the five main screens in one group. */
export default function TabsLayout() {
  return <Tabs tabBar={() => null} screenOptions={{ headerShown: false }} />;
}
