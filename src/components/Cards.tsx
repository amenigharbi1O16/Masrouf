import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { dt, money, short } from '@/utils/format';
import type { Product } from '@/state/types';
import { ProductThumb } from './ProductThumb';

const card = { backgroundColor: colors.white, borderRadius: radius.card } as const;

export function BudgetCard({ available, spent, total, pct, range, over, onPress }: {
  available: number; spent: number; total: number; pct: number; range: string; over?: number; onPress?: () => void;
}) {
  const w = `${Math.min(100, Math.max(0, pct))}%` as `${number}%`;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.budget]} accessibilityRole={onPress ? 'button' : undefined}>
      <Text style={styles.budgetLabel}>{over ? 'OVER BUDGET BY' : 'AVAILABLE TO SPEND'}</Text>
      <Text style={styles.budgetAmount}>{money(over ? over : available)}</Text>
      <Text style={styles.budgetLine}>Budget  {money(total)}</Text>
      <View style={styles.track}><View style={[styles.fill, { width: w, backgroundColor: over ? colors.coral : pct >= 80 ? colors.gold : colors.mint }]} /></View>
      <View style={styles.rowBetween}>
        <Text style={styles.spent}>Spent  {money(spent)}</Text>
        <Text style={styles.pct}>{pct.toFixed(1).replace(/\.0$/, '')}% used</Text>
      </View>
      <Text style={styles.range}>{range}</Text>
    </Pressable>
  );
}

export function CategoryCard({ name, spent, allocation, onPress }: { name: string; spent: number; allocation: number; onPress?: () => void }) {
  const ratio = allocation > 0 ? Math.min(1, spent / allocation) : spent > 0 ? 1 : 0;
  const over = spent > allocation;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[card, { padding: 16, gap: 10 }]}>
      <View style={styles.rowBetween}>
        <View style={styles.iconTitle}>
          <Ionicons name="wallet-outline" size={22} color={colors.green} />
          <Text style={styles.cardTitle}>{name}</Text>
        </View>
        <Text style={[styles.cardSub, over && { color: colors.coral }]}>{short(spent)} / {short(allocation)} DT</Text>
      </View>
      <View style={styles.trackLight}><View style={{ width: `${ratio * 100}%`, height: 6, borderRadius: 3, backgroundColor: over ? colors.coral : colors.green }} /></View>
    </Pressable>
  );
}

export function TransactionRow({ title, detail, amount, icon = 'bag-outline', onPress }: {
  title: string; detail: string; amount: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[card, styles.txn]} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={styles.tile}><Ionicons name={icon} size={22} color={colors.green} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.txnDetail} numberOfLines={1}>{detail}</Text>
      </View>
      <Text style={styles.cardTitle}>{amount}</Text>
    </Pressable>
  );
}

export function ExpenseCard({ title, detail, amount, onPress }: { title: string; detail: string; amount: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[card, styles.expense]} accessibilityRole={onPress ? 'button' : undefined}>
      <Ionicons name="wallet-outline" size={22} color={colors.green} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{detail}</Text>
      </View>
      <Text style={[styles.cardTitle, { fontSize: 13 }]}>{amount}</Text>
    </Pressable>
  );
}

export function ProductCard({ product, categoryName, latestUnitPrice, unit, onPress }: {
  product: Product; categoryName: string; latestUnitPrice?: number; unit: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[card, styles.product]} accessibilityRole={onPress ? 'button' : undefined}>
      <ProductThumb name={product.name} uri={product.photo} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{[product.brand, categoryName].filter(Boolean).join(' · ')}</Text>
      </View>
      {latestUnitPrice !== undefined ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardTitle}>{dt(latestUnitPrice)}</Text>
          <Text style={styles.cardSub}>DT / {unit}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** label + value pair (design: "Latest unit price", "Store"...) */
export function InfoRow({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'good' }) {
  return (
    <View style={[card, styles.info]}>
      <Text style={styles.cardSub}>{label}</Text>
      <Text style={[styles.cardTitle, tone === 'danger' && { color: colors.coral }, tone === 'good' && { color: colors.green }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  budget: { backgroundColor: colors.forest, borderRadius: radius.card, padding: 20, gap: 6 },
  budgetLabel: { color: colors.mint, fontSize: 11, fontWeight: '500' },
  budgetAmount: { color: colors.white, fontSize: 34, lineHeight: 46, fontWeight: '600' },
  budgetLine: { color: colors.mint, fontSize: 13 },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.track, marginTop: 8, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  spent: { color: colors.white, fontSize: 13, fontWeight: '500' },
  pct: { color: colors.mint, fontSize: 12 },
  range: { color: colors.mint, fontSize: 10, fontWeight: '500', marginTop: 8 },
  iconTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  cardTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.forest },
  cardSub: { fontSize: 12, lineHeight: 17, fontWeight: '500', color: colors.muted },
  trackLight: { height: 6, borderRadius: 3, backgroundColor: colors.border },
  txn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 72 },
  tile: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  txnDetail: { fontSize: 11, lineHeight: 16, color: colors.muted },
  expense: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 80 },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 72 },
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
});
