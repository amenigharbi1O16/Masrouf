import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import type { Category } from '@/state/types';
import { SectionTitle } from './ui';

/** Select / ✓ Selected list, used by onboarding and "Manage categories". */
export function CategoryPicker({ categories, selected, onToggle }: { categories: Category[]; selected: string[]; onToggle: (id: string) => void }) {
  const groups: [string, Category[]][] = [
    ['Products', categories.filter((c) => c.kind === 'product' && c.active)],
    ['Expenses', categories.filter((c) => c.kind === 'expense' && c.active)],
  ];
  return (
    <View style={{ gap: 10 }}>
      {groups.map(([title, list]) => (
        <View key={title} style={{ gap: 10 }}>
          <SectionTitle style={{ marginTop: 6 }}>{title}</SectionTitle>
          {list.map((c) => {
            const on = selected.includes(c.id);
            return (
              <Pressable key={c.id} onPress={() => onToggle(c.id)} style={[styles.row, on && styles.rowOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                <Text style={styles.name}>{c.name}</Text>
                <Text style={[styles.state, on && { color: colors.green, fontWeight: '600' }]}>{on ? '✓ Selected' : 'Select'}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, minHeight: 52 },
  rowOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  name: { fontSize: 14, fontWeight: '600', color: colors.forest },
  state: { fontSize: 12, color: colors.muted },
});
