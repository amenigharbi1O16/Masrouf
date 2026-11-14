import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { useStore } from '@/state/store';

export default function AdminCategoryTypesScreen() {
  const router = useRouter();
  const { db, actions } = useStore();
  const [types, setTypes] = useState(db.categoryTypes);
  const [saved, setSaved] = useState(false);
  const set = (i: number, patch: Partial<(typeof types)[number]>) => { setTypes((t) => t.map((x, j) => (j === i ? { ...x, ...patch } : x))); setSaved(false); };
  return (
    <Screen title="Category types">
      <Eyebrow>PRODUCTS AND EXPENSES STAY DISTINCT</Eyebrow>
      {types.map((t, i) => (
        <React.Fragment key={t.kind}>
          <SectionTitle>{t.kind === 'product' ? 'Product type' : 'Expense type'}</SectionTitle>
          <Input label="Display name" value={t.label} onChangeText={(v) => set(i, { label: v })} autoCapitalize="words" />
          <Input label="Description" value={t.description} onChangeText={(v) => set(i, { description: v })} autoCapitalize="sentences" />
        </React.Fragment>
      ))}
      {saved ? <AlertBanner tone="success" title="Category types saved" /> : null}
      <Button label="Save changes" disabled={types.some((t) => !t.label.trim())} onPress={() => { actions.updateCategoryTypes(types.map((t) => ({ ...t, label: t.label.trim() }))); setSaved(true); }} />
      <Button label="Back to overview" variant="secondary" onPress={() => router.navigate('/(admin)/dashboard')} />
    </Screen>
  );
}
