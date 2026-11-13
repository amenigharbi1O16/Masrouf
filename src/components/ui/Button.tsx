// ============================================================
// FICHIER : src/components/ui/Button.tsx
// MISSION : Boutons réutilisables conformes au thème Masrouf :
//           - primary (forest #102B27)
//           - secondary (mint #D9F0E4)
//           - danger (coral #DC7770)
//           - Hauteur 52 à 56, rayon 9999 (pilule)
//           - Animation d'appui 120 ms
// ============================================================

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Theme } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}: Props) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  const containerStyle = [
    styles.base,
    isPrimary && styles.primary,
    variant === 'secondary' && styles.secondary,
    isDanger && styles.danger,
    disabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.text,
    isPrimary && styles.textPrimary,
    variant === 'secondary' && styles.textSecondary,
    isDanger && styles.textDanger,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isPrimary || isDanger ? Theme.colors.white : Theme.colors.deepGreen}
        />
      ) : (
        <Text style={labelStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: Theme.control.height,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
    minWidth: 120,
  },
  primary: {
    backgroundColor: Theme.colors.forest,
    ...Theme.shadows.button,
  },
  secondary: {
    backgroundColor: Theme.colors.mint,
  },
  danger: {
    backgroundColor: Theme.colors.coral,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  textPrimary: {
    color: Theme.colors.white,
  },
  textSecondary: {
    color: Theme.colors.deepGreen,
  },
  textDanger: {
    color: Theme.colors.white,
  },
});

