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
  /** Valeur technique de filtrage associée à l'option */
  value: string;
  /** Libellé textuel affiché dans la pastille */
  label: string;
}

/**
 * Propriétés du composant Chips.
 */
interface ChipsProps {
  /** Liste de toutes les pastilles disponibles pour le choix */
  options: ChipOption[];
  /** Valeur technique actuellement sélectionnée */
  value: string;
  /** Callback notifiant le parent du choix d'une nouvelle pastille */
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
  // Conteneur individuel de pastille avec forme pilule
  chip: {
    // Marge interne latérale garantissant un espacement aéré du texte
    paddingHorizontal: 14,
    // Hauteur standard de 36px adaptée aux cibles tactiles
    height: 36,
    // Rayon de bordure semi-circulaire (moitié de 36px)
    borderRadius: 18,
    // Fond blanc au repos
    backgroundColor: colors.white,
    // Bordure fine de délimitation
    borderWidth: 1,
    // Couleur de bordure grise discrète
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Style spécifique lorsque la pastille est active
  on: {
    // Fond vert énergique indiquant la sélection active
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  // Typographie du texte de la pastille
  text: {
    // Taille de police 13px
    fontSize: 13,
    // Graisse semi-grasse
    fontWeight: '600',
    // Couleur vert forêt
    color: colors.forest,
  },
});
