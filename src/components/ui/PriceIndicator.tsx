import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { dt } from '@/utils/format';
import type { PriceChange } from '@/state/selectors';

interface Props { change: PriceChange | null; unitLabel: string }

/** Shows whether the unit price went down, up or stayed the same. null = first purchase. */
export function PriceIndicator({ change, unitLabel }: Props) {
  if (!change) {
    return (
      <View style={[styles.box, { backgroundColor: colors.mint }]}>
        <Ionicons name="sparkles" size={20} color={colors.green} />
        <Text style={[styles.text, { color: colors.green }]}>First purchase — no earlier price to compare.</Text>
      </View>
    );
  }
  const cfg = {
    down: { bg: colors.mint, fg: colors.green, icon: 'trending-down' as const, label: 'Cheaper than last time' },
    up: { bg: colors.coralSoft, fg: '#9B3B35', icon: 'trending-up' as const, label: 'More expensive than last time' },
    same: { bg: colors.goldSoft, fg: '#8A5A12', icon: 'remove' as const, label: 'Same price as last time' },
  }[change.direction];
  const sign = change.diff > 0 ? '+' : change.diff < 0 ? '−' : '';
  return (
    <View style={[styles.box, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={22} color={cfg.fg} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.text, { color: cfg.fg, fontWeight: '600' }]}>{cfg.label}</Text>
        <Text style={[styles.text, { color: cfg.fg, fontSize: 12 }]}>
          {sign}{dt(Math.abs(change.diff))} DT / {unitLabel}  ·  {sign}{Math.abs(change.pct).toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.card },
  text: { fontSize: 14, lineHeight: 20 },
});
