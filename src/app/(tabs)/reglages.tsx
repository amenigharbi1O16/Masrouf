import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';

function Row({ icon, label, detail, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; detail?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.white, borderRadius: radius.card, padding: 16, minHeight: 60 }}>
      <Ionicons name={icon} size={22} color={colors.green} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.forest }}>{label}</Text>
        {detail ? <Text style={{ fontSize: 12, color: colors.muted }}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { me, actions } = useStore();
  const [name, setName] = useState(me?.name ?? '');
  const [saved, setSaved] = useState(false);
  if (!me) return null;
  return (
    <Screen title="Settings">
      <Eyebrow>YOUR ACCOUNT</Eyebrow>
      <Input label="Full name" value={name} onChangeText={(t) => { setName(t); setSaved(false); }} autoCapitalize="words" />
      <Input label="Email address" value={me.email} editable={false} />
      {saved ? <AlertBanner tone="success" title="Profile saved" /> : null}
      <Button label="Save profile" variant="secondary" disabled={!name.trim() || name.trim() === me.name} onPress={() => { actions.updateProfile(name); setSaved(true); }} />
      <SectionTitle>Preferences</SectionTitle>
      <Row icon="wallet-outline" label="Budget period" detail="Modify the current budget" onPress={() => router.push({ pathname: '/budget-mois', params: { mode: 'edit' } } as never)} />
      <Row icon="pricetags-outline" label="Manage categories" detail="Choose what you track" onPress={() => router.push('/gerer-categories')} />
      <Row icon="trophy-outline" label="Points and achievements" onPress={() => router.push('/points')} />
      <Row icon="lock-closed-outline" label="Change password" onPress={() => router.push('/changer-mot-de-passe')} />
      <Body>Language: English. Your budgets, purchases and expenses stay on this device.</Body>
      <Button label="Log out" variant="danger" onPress={actions.logout} />
    </Screen>
  );
}
