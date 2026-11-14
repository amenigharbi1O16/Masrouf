import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
import { InfoRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, EmptyState, Eyebrow } from '@/components/ui';
import { useStore } from '@/state/store';
import { fmtDate } from '@/utils/format';

/** Admin · Activation and suspension (account data only — never financial records). */
export default function AdminUserScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, actions } = useStore();
  const user = db.users.find((u) => u.id === id);
  if (!user) return <Screen title="User" back><EmptyState title="User not found" actionLabel="Back" onAction={() => router.back()} /></Screen>;

  const toggle = () =>
    Alert.alert(user.active ? 'Suspend this account?' : 'Activate this account?', user.active ? `${user.name} will no longer be able to log in.` : `${user.name} will be able to log in again.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: user.active ? 'Suspend' : 'Activate', style: user.active ? 'destructive' : 'default', onPress: () => actions.setUserActive(user.id, !user.active) },
    ]);

  return (
    <Screen title="Account" back>
      <Eyebrow>ACTIVATION AND SUSPENSION</Eyebrow>
      <InfoRow label="Name" value={user.name} />
      <InfoRow label="Email" value={user.email} />
      <InfoRow label="Member since" value={fmtDate(user.createdAt)} />
      <InfoRow label="Status" value={user.active ? 'Active' : 'Suspended'} tone={user.active ? 'good' : 'danger'} />
      {user.mustChangePassword ? <AlertBanner tone="warning" title="Temporary password issued" detail="The user must choose a new password at next login." /> : null}
      <Button label={user.active ? 'Suspend account' : 'Activate account'} variant={user.active ? 'danger' : 'primary'} onPress={toggle} />
      <Button label="Issue temporary password" variant="secondary" onPress={() => router.push({ pathname: '/(admin)/mot-de-passe-temporaire', params: { id: user.id } } as never)} />
    </Screen>
  );
}
