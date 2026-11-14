import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { CategoryPicker } from '@/components/CategoryPicker';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, SectionTitle } from '@/components/ui';
import { useStore } from '@/state/store';

export default function ManageCategoriesScreen() {
  const router = useRouter();
  const { db, me, actions } = useStore();
  const [selected, setSelected] = useState<string[]>(me?.categoryIds ?? []);
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  return (
    <Screen title="Manage categories" back>
      <Eyebrow>CHOOSE WHAT YOU TRACK</Eyebrow>
      <SectionTitle>Your categories</SectionTitle>
      <Body>Products and expenses stay separate. Changing categories never deletes past data.</Body>
      <CategoryPicker categories={db.categories} selected={selected} onToggle={toggle} />
      {selected.length === 0 ? <AlertBanner tone="warning" title="Select at least one category" /> : null}
      <Button label={`Save ${selected.length} categories`} disabled={selected.length === 0} onPress={() => { actions.setUserCategories(selected); router.back(); }} />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
