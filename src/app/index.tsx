import { Redirect } from 'expo-router';
import React from 'react';
import { useStore } from '@/state/store';
import { LoadingScreen } from '@/components/ui';

export default function RootIndex() {
  const { ready, me } = useStore();
  if (!ready) return <LoadingScreen />;
  if (!me) return <Redirect href="/login" />;
  if (me.role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  if (!me.onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}
