import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { InfoRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { Button } from '@/components/ui';
import { colors } from '@/constants/theme';
import { categoryName, currentBudget, spentByCategory } from '@/state/selectors';
import { useStore } from '@/state/store';
import { money, short } from '@/utils/format';

/** "Purchase · Confirmation": exact amount + category impact. kind = purchase | expense | update */
export default function ConfirmationScreen() {
  const router = useRouter();
  const { kind = 'purchase', amount = '0', categoryId = '', productId } = useLocalSearchParams<{ kind?: string; amount?: string; categoryId?: string; productId?: string }>();
  const { db, me } = useStore();
  const budget = me ? currentBudget(db, me.id) : null;
  const spent = budget && me ? (spentByCategory(db, me.id, budget.start, budget.end)[categoryId] ?? 0) : 0;
  const alloc = budget?.allocations[categoryId] ?? 0;
  const label = kind === 'expense' ? 'Expense saved' : kind === 'update' ? 'Changes saved' : 'Purchase saved';

  return (
    <Screen title="Confirmation" plain>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={46} color={colors.green} />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '600', color: colors.forest }}>{label}</Text>
        <Text style={{ fontSize: 34, fontWeight: '600', color: colors.forest }}>{money(Number(amount))}</Text>
      </View>
      <InfoRow label="Category" value={categoryName(db, categoryId)} />
      {budget ? <InfoRow label={`${categoryName(db, categoryId)} budget`} value={`${short(spent)} / ${short(alloc)} DT`} tone={spent > alloc && alloc > 0 ? 'danger' : 'good'} /> : null}
      <Button label="Back to home" onPress={() => router.replace('/')} />
      {productId ? <Button label="View product" variant="secondary" onPress={() => router.replace({ pathname: '/produit/[id]', params: { id: productId } } as never)} /> : null}
      <Button label={kind === 'expense' ? 'Add another expense' : 'Add another purchase'} variant="secondary" onPress={() => router.replace((kind === 'expense' ? '/nouvelle-depense' : '/nouvel-achat') as never)} />
    </Screen>
  );
}
