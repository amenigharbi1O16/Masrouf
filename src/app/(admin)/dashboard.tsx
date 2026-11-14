import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, Eyebrow, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ width: '48%', flexGrow: 1, backgroundColor: colors.white, borderRadius: radius.card, padding: 16, gap: 4 }}>
      <Text style={{ fontSize: 28, fontWeight: '600', color: colors.forest }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.muted }}>{label}</Text>
    </View>
  );
}

/** Anonymous global statistics only. No individual financial record is ever shown here. */
export default function AdminDashboard() {
  const router = useRouter();
  const { db } = useStore();
  const people = db.users.filter((u) => u.role === 'user');
  return (
    <Screen title="Overview">
      <Eyebrow>ADMINISTRATION</Eyebrow>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        <Stat label="Accounts" value={people.length} />
        <Stat label="Active accounts" value={people.filter((u) => u.active).length} />
        <Stat label="Suspended" value={people.filter((u) => !u.active).length} />
        <Stat label="Budget periods" value={db.budgets.length} />
        <Stat label="Tracked products" value={db.products.length} />
        <Stat label="Purchases recorded" value={db.purchases.length} />
        <Stat label="Expenses recorded" value={db.expenses.length} />
        <Stat label="Active categories" value={db.categories.filter((c) => c.active).length} />
      </View>
      <AlertBanner tone="info" title="Privacy by design" detail="Statistics are anonymous totals. Personal budgets, purchases and expenses are never exposed to administrators." />
      <SectionTitle>Manage</SectionTitle>
      <Button label="Users" onPress={() => router.push('/(admin)/utilisateurs')} />
      <Button label="Categories" variant="secondary" onPress={() => router.push('/(admin)/categories')} />
      <Button label="Default percentages" variant="secondary" onPress={() => router.push('/(admin)/pourcentages')} />
      <Button label="Points rules" variant="secondary" onPress={() => router.push('/(admin)/points-regles')} />
    </Screen>
  );
}
