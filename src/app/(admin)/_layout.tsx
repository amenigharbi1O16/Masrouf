import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F5F3ED' } }} />;
}
