// ============================================================
// FICHIER : src/components/ui/AlertBanner.tsx
// MISSION : Bannière d'alerte et de statut conforme au thème Masrouf :
//           - mint (sain / information)
//           - gold (alerte 80 %)
//           - coral (dépassement 100 %)
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../constants/theme';

type AlertVariant = 'mint' | 'gold' | 'coral';

type Props = {
  title: string;
  subtitle?: string;
  icon?: string;
  variant?: AlertVariant;
  style?: ViewStyle;
};

export default function AlertBanner({
  title,
  subtitle,
  icon = '✓',
  variant = 'mint',
  style,
}: Props) {
  const isGold = variant === 'gold';
  const isCoral = variant === 'coral';

  const bgColor = isCoral
    ? Theme.colors.statusRedBg
    : isGold
    ? Theme.colors.statusOrangeBg
    : Theme.colors.mint;

  const textColor = isCoral
    ? Theme.colors.coral
    : isGold
    ? '#92400E'
    : Theme.colors.deepGreen;

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }, style]}>
      <Text style={[styles.icon, { color: textColor }]}>{icon}</Text>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: textColor }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  icon: {
    fontSize: Theme.font.section,
    fontWeight: '800',
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Theme.font.body,
    fontWeight: '800',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Theme.font.small,
    lineHeight: 18,
    opacity: 0.9,
  },
});

