// ============================================================
// FICHIER : src/components/ui/EmptyState.tsx
// MISSION : État vide réutilisable avec icône, titre, description
//           et bouton d'action visible conforme au design.
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../constants/theme';
import Button from './Button';

type Props = {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
};

export default function EmptyState({
  icon = '📦',
  title,
  description,
  actionLabel,
  onAction,
  style,
}: Props) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          variant="primary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.xxl,
    alignItems: 'center',
    marginVertical: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  icon: {
    fontSize: 44,
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.font.section,
    fontWeight: '800',
    color: Theme.colors.ink,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  description: {
    fontSize: Theme.font.body,
    color: Theme.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Theme.spacing.xl,
  },
  button: {
    marginTop: Theme.spacing.md,
    alignSelf: 'stretch',
  },
});

