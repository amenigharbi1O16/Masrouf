/**
 * FICHIER : src/components/Chips.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-043
 * COMPOSANT : Chips (Barre Horizontale de Pastilles Filtrantes)
 *
 * RÔLE DU COMPOSANT :
 * Fournit une barre de sélection horizontale à défilement libre (`ScrollView horizontal`)
 * permettant à l'utilisateur de basculer instantanément de filtre ou de catégorie.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Présente une rangée de pastilles pillules arrondies (hauteur 36px, radius 18px).
 * - État inactif : fond blanc, fine bordure grise, texte vert forêt foncé.
 * - État actif : fond plein vert profond (`colors.green`), bordure verte, texte blanc gras.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
// Constantes de thème
import { colors } from '@/constants/theme';
import { useTranslation } from '@/utils/i18n';

/**
 * Interface d'une option de pastille.
 */
interface ChipOption {
  value: string;
  label: string;
}

/**
 * Propriétés du composant Chips.
 */
interface ChipsProps {
  options: ChipOption[];
  value: string;
  onChange: (v: string) => void;
}

/**
 * Barre de pastilles filtrantes défilables.
 */
export function Chips({ options, value, onChange }: ChipsProps) {
  const { isRTL } = useTranslation();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.chip, on && styles.on]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Text style={[styles.text, on && { color: colors.white }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
  },
});
