import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { Button } from './Button';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'leaf-outline', title, detail, actionLabel, onAction }: Props) {
  return (
    <View style={styles.box}>
      <View style={styles.badge}><Ionicons name={icon} size={26} color={colors.green} /></View>
      <Text style={styles.title}>{title}</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      {actionLabel && onAction ? <View style={{ alignSelf: 'stretch', marginTop: 8 }}><Button label={actionLabel} onPress={onAction} /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, borderRadius: radius.hero, padding: 24, alignItems: 'center', gap: 8 },
  badge: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: colors.forest, textAlign: 'center' },
  detail: { fontSize: 14, lineHeight: 20, color: colors.muted, textAlign: 'center' },
});
