/**
 * FICHIER : src/components/ui/AlertBanner.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-053
 * COMPOSANT : AlertBanner (Bannière d'Alerte et d'Information Contextuelle)
 *
 * RÔLE DU COMPOSANT :
 * Composant atomique d'alerte et d'information visuelle à 4 tonalités (`Tone`) :
 * 1. `success` : vert menthe doux avec coche verte (`checkmark-circle`).
 * 2. `info` : vert menthe avec bulle d'information (`information-circle`).
 * 3. `warning` : or ambré doux avec icône d'alerte (`alert-circle`).
 * 4. `danger` : rose corail doux avec triangle d'avertissement (`warning`).
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Cartouche coloré à coins arrondis (radius 16), avec icône IonIcons à gauche (ou à droite en RTL),
 * titre en gras et détail descriptif en taille 12px, parfaitement lisible.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Constantes de thème (couleurs écologiques)
import { colors, radius } from '@/constants/theme';
// Système d'internationalisation et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Tonalités supportées par la bannière d'alerte.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'info';

const TONES: Record<
  Tone,
  { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  success: { bg: colors.mint, fg: colors.green, icon: 'checkmark-circle' },
  info: { bg: colors.mint, fg: colors.green, icon: 'information-circle' },
  warning: { bg: colors.goldSoft, fg: '#8A5A12', icon: 'alert-circle' },
  danger: { bg: colors.coralSoft, fg: '#9B3B35', icon: 'warning' },
};

/**
 * Propriétés du composant AlertBanner.
 */
interface AlertBannerProps {
  title: string;
  detail?: string;
  tone?: Tone;
}

/**
 * Bannière d'alerte contextuelle.
 */
export function AlertBanner({
  title,
  detail,
  tone = 'success',
}: AlertBannerProps) {
  const t = TONES[tone];
  const { isRTL } = useTranslation();

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: t.bg,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      accessibilityRole="alert"
    >
      <Ionicons
        name={t.icon}
        size={22}
        color={t.fg}
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.title,
            { color: t.fg, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {title}
        </Text>
        {detail ? (
          <Text
            style={[
              styles.detail,
              { color: t.fg, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 10,
    padding: 14,
    borderRadius: radius.card,
  },
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  detail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
