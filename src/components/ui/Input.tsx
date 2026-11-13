// ============================================================
// FICHIER : src/components/ui/Input.tsx
// MISSION : Champ de saisie réutilisable conforme au design Figma :
//           - Carte blanche avec bordure et ombre
//           - Label en petit au-dessus (Theme.font.small / muted)
//           - Message d'erreur précis sous le champ en corail
// ============================================================

import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Theme } from '../../constants/theme';

type Props = TextInputProps & {
  label: string;
  error?: string;
  containerStyle?: ViewStyle;
};

export default function Input({
  label,
  error,
  containerStyle,
  style,
  ...rest
}: Props) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Theme.colors.muted}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.card,
  },
  label: {
    fontSize: Theme.font.small,
    color: Theme.colors.muted,
    marginBottom: Theme.spacing.xs,
    fontWeight: '500',
  },
  input: {
    fontSize: Theme.font.body,
    fontWeight: '600',
    color: Theme.colors.ink,
    padding: 0,
    minHeight: 24,
  },
  error: {
    fontSize: Theme.font.small,
    color: Theme.colors.coral,
    marginTop: Theme.spacing.xs,
    fontWeight: '600',
  },
});

