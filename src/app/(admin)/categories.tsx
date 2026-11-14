import React, { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { AlertBanner, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import type { CategoryKind } from '@/state/types';

export default function AdminCategoriesScreen() {
  const { db, actions } = useStore();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [error, setError] = useState('');
  const add = () => {
    const r = actions.addCategory(name, kind);
    if (!r.ok) setError(r.error ?? '');
    else { setName(''); setError(''); }
  };
  return (
    <Screen title="Categories">
      <Eyebrow>CATEGORY CATALOGUE</Eyebrow>
      {error ? <AlertBanner tone="danger" title="Category not added" detail={error} /> : null}
      <Input label="New category name" value={name} onChangeText={(t) => { setName(t); setError(''); }} autoCapitalize="words" />
      <SelectField label="Category type" value={kind} onChange={(v) => setKind(v as CategoryKind)} options={db.categoryTypes.map((t) => ({ value: t.kind, label: t.label }))} />
      <Button label="Add category" onPress={add} disabled={!name.trim()} />
      {db.categoryTypes.map((t) => (
        <View key={t.kind} style={{ gap: 10 }}>
          <SectionTitle>{t.label}</SectionTitle>
          {db.categories.filter((c) => c.kind === t.kind).map((c) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.white, borderRadius: radius.card, paddingHorizontal: 14, minHeight: 56 }}>
              <TextInput defaultValue={c.name} onEndEditing={(e) => { const v = e.nativeEvent.text.trim(); if (v && v !== c.name) actions.updateCategory(c.id, { name: v }); }} style={{ flex: 1, fontSize: 14, fontWeight: '600', color: colors.forest }} />
              <Text style={{ fontSize: 12, color: colors.muted }}>{c.active ? 'Active' : 'Hidden'}</Text>
              <Switch value={c.active} onValueChange={(v) => actions.updateCategory(c.id, { active: v })} trackColor={{ true: colors.green, false: colors.border }} />
            </View>
          ))}
        </View>
      ))}
    </Screen>
  );
}
