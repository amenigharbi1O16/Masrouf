import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'danger';
interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ label, onPress, variant = 'primary', disabled, loading }: Props) {
  const off = disabled || loading;
  const bg = variant === 'primary' ? colors.green : variant === 'danger' ? colors.coral : colors.mint;
  const fg = variant === 'secondary' ? colors.green : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 }]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.label, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  label: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
