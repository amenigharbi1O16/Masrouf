import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DrawerProvider } from '@/components/DrawerContext';
import { LoadingScreen } from '@/components/ui';
import { StoreProvider, useStore } from '@/state/store';
import { homeRouteFor } from '@/utils/session';

/** Route guard: sends each visitor to the right place for their session state. */
function Gate({ children }: { children: React.ReactNode }) {
  const { ready, me, actions } = useStore();
  const router = useRouter();
  const first = (useSegments() as string[])[0];

  useEffect(() => {
    if (!ready) return;
    const isPublic = first === 'login' || first === 'inscription';
    if (!me) {
      if (!isPublic) router.replace('/login');
      return;
    }
    if (!me.active) {
      actions.logout();
      return;
    }
    if (me.mustChangePassword) {
      if (first !== 'changer-mot-de-passe') router.replace('/changer-mot-de-passe');
      return;
    }
    if (me.role === 'admin') {
      if (first !== '(admin)' && first !== 'changer-mot-de-passe') router.replace('/(admin)/dashboard');
      return;
    }
    if (first === '(admin)') { router.replace('/(tabs)'); return; }
    if (!me.onboarded) {
      if (first !== 'onboarding') router.replace('/onboarding');
      return;
    }
    if (isPublic || first === 'onboarding') router.replace(homeRouteFor(me) as never);
  }, [ready, me?.id, me?.active, me?.mustChangePassword, me?.onboarded, me?.role, first]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <LoadingScreen />;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <StoreProvider>
        <DrawerProvider>
          <Gate>
            <Stack screenOptions={{ headerShown: false, animation: 'fade_from_bottom', contentStyle: { backgroundColor: '#F5F3ED' } }} />
          </Gate>
        </DrawerProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
