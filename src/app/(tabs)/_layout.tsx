import { Tabs } from 'expo-router';
import React from 'react';

/** The design has NO bottom tab bar: navigation is the left drawer. Tabs is only used to keep the five main screens in one group. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="produits" />
      <Tabs.Screen name="calendrier" />
      <Tabs.Screen name="analyses" />
      <Tabs.Screen name="reglages" />
    </Tabs>
  );
}
