import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { LANGUES_DISPONIBLES, useTranslation } from '@/utils/i18n';

interface LanguageSelectorProps {
  style?: object;
}

/**
 * Sélecteur de langue universel (Français, العربية, English)
 * Affiché en haut de l'écran de connexion et dans les Réglages.
 * Les noms natifs sont invariables et ne sont jamais traduits.
 */
export function LanguageSelector({ style }: LanguageSelectorProps) {
  const { langue, changerLangue } = useTranslation();

  return (
    <View style={[styles.container, style]}>
      {LANGUES_DISPONIBLES.map((cfg) => {
        const active = langue === cfg.code;
        return (
          <Pressable
            key={cfg.code}
            onPress={() => changerLangue(cfg.code)}
            style={({ pressed }) => [
              styles.pill,
              active ? styles.pillActive : styles.pillInactive,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={cfg.nomNatif}
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>
              {cfg.nomNatif}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  pillInactive: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  labelInactive: {
    color: colors.forest,
    fontWeight: '500',
  },
});
