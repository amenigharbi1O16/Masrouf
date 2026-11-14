import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';

export type Tone = 'success' | 'warning' | 'danger' | 'info';
const TONES: Record<Tone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { bg: colors.mint, fg: colors.green, icon: 'checkmark-circle' },
  info: { bg: colors.mint, fg: colors.green, icon: 'information-circle' },
  warning: { bg: colors.goldSoft, fg: '#8A5A12', icon: 'alert-circle' },
  danger: { bg: colors.coralSoft, fg: '#9B3B35', icon: 'warning' },
};

export function AlertBanner({ title, detail, tone = 'success' }: { title: string; detail?: string; tone?: Tone }) {
  const t = TONES[tone];
  return (
    <View style={[styles.box, { backgroundColor: t.bg }]} accessibilityRole="alert">
      <Ionicons name={t.icon} size={22} color={t.fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: t.fg }]}>{title}</Text>
        {detail ? <Text style={[styles.detail, { color: t.fg }]}>{detail}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radius.card },
  title: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  detail: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
