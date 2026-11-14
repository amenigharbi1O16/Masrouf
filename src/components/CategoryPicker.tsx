import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import type { Category } from '@/state/types';
import { useTranslation } from '@/utils/i18n';
import { SectionTitle } from './ui';

interface CategoryPickerProps {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
}

/**
 * Sélecteur de catégories conforme à la maquette Figma.
 * Liste épurée sans bordures de cartes, sur fond beige chaud,
 * avec texte "✓ Selected" / "Select" en vert foncé.
 */
export function CategoryPicker({ categories, selected, onToggle }: CategoryPickerProps) {
  const { t, isRTL, traduireCategorie } = useTranslation();

  const groups: [string, Category[]][] = [
    [t('categories_produits'), categories.filter((c) => c.kind === 'product' && c.active)],
    [t('categories_depenses'), categories.filter((c) => c.kind === 'expense' && c.active)],
  ];

  return (
    <View style={{ gap: 20 }}>
      {groups.map(([title, list]) => (
        <View key={title} style={{ gap: 4 }}>
          <SectionTitle style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {title}
          </SectionTitle>
          {list.map((c) => {
            const on = selected.includes(c.id);
            const labelNom = traduireCategorie(c.name);
            return (
              <Pressable
                key={c.id}
                onPress={() => onToggle(c.id)}
                style={({ pressed }) => [
                  styles.row,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={labelNom}
              >
                <Text
                  style={[
                    styles.name,
                    { textAlign: isRTL ? 'right' : 'left' },
                    on && styles.nameSelected,
                  ]}
                >
                  {labelNom}
                </Text>
                <Text style={[styles.state, on && styles.stateSelected]}>
                  {on ? `✓ ${t('selectionne')}` : t('selectionner')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 12,
    marginBottom: 6,
  },
  row: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    minHeight: 46,
  },
  name: {
    fontSize: 15,
    fontWeight: '400',
    color: '#4A5568',
    flex: 1,
  },
  nameSelected: {
    color: colors.forest,
    fontWeight: '500',
  },
  state: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  stateSelected: {
    color: colors.forest,
    fontWeight: '700',
  },
});
