import React from 'react';
import { Switch, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { Body, Button, Eyebrow } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import { useRouter } from 'expo-router';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const { db, me, actions } = useStore();
  return (
    <Screen title="Settings">
      <Eyebrow>APPLICATION SETTINGS</Eyebrow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: radius.card, padding: 16 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: colors.forest }}>Allow new registrations</Text>
          <Text style={{ fontSize: 12, color: colors.muted }}>When off, nobody can create an account.</Text>
        </View>
        <Switch value={db.settings.allowRegistration} onValueChange={(v) => actions.setSettings({ ...db.settings, allowRegistration: v })} trackColor={{ true: colors.green, false: colors.border }} />
      </View>
      <Body>Signed in as {me?.email}. Currency: Tunisian dinar (DT), 3 decimals. Language: English.</Body>
      <Button label="Change my password" variant="secondary" onPress={() => router.push('/changer-mot-de-passe')} />
      <Button label="Log out" variant="danger" onPress={actions.logout} />
    </Screen>
  );
}
