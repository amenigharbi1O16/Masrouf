import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { InfoRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, EmptyState, Eyebrow, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { categoryName, currentBudget, previousWindow, spentByCategory, totalSpent, userBudgets } from '@/state/selectors';
import { useStore } from '@/state/store';
import { fmtRange, money, short } from '@/utils/format';

/** Compares the current period with the previous period of EQUAL duration. Never invents history. */
export default function AnalyticsScreen() {
  const router = useRouter();
  const { db, me } = useStore();
  if (!me) return null;
  const budget = currentBudget(db, me.id) ?? userBudgets(db, me.id).slice(-1)[0] ?? null;
  const win = budget ? previousWindow(budget) : null;
  const cur = budget ? spentByCategory(db, me.id, budget.start, budget.end) : {};
  const prev = win ? spentByCategory(db, me.id, win.start, win.end) : {};
  const curTotal = totalSpent(cur), prevTotal = totalSpent(prev);

  if (!budget || !win || prevTotal === 0) {
    return (
      <Screen title="Analytics">
        <Eyebrow>FINANCIAL ANALYTICS</Eyebrow>
        <EmptyState
          icon="stats-chart-outline" title="No history yet"
          detail={budget ? 'Analytics compare periods of equal duration. Keep recording — your first comparison appears after the next period.' : 'Create a budget and record spending to unlock analytics.'}
          actionLabel={budget ? 'Add an expense' : 'Create a budget'} onAction={() => router.push((budget ? '/nouvelle-depense' : '/budget-mois') as never)}
        />
      </Screen>
    );
  }

  const diff = curTotal - prevTotal;
  const pct = (diff / prevTotal) * 100;
  const ids = Array.from(new Set([...Object.keys(cur), ...Object.keys(prev)]));
  const maxV = Math.max(1, ...ids.flatMap((id) => [cur[id] ?? 0, prev[id] ?? 0]));

  return (
    <Screen title="Analytics">
      <Eyebrow>{fmtRange(budget.start, budget.end)}  vs  {fmtRange(win.start, win.end)}</Eyebrow>
      <SectionTitle>Financial analytics</SectionTitle>
      <InfoRow label="This period" value={money(curTotal)} />
      <InfoRow label="Previous period" value={money(prevTotal)} />
      <AlertBanner
        tone={diff <= 0 ? 'success' : 'warning'}
        title={diff <= 0 ? `You spent ${Math.abs(pct).toFixed(1)}% less` : `You spent ${pct.toFixed(1)}% more`}
        detail={`${diff <= 0 ? '−' : '+'}${money(Math.abs(diff))} compared with the previous period of the same length.`}
      />
      <SectionTitle>By category</SectionTitle>
      {ids.map((id) => (
        <View key={id} style={{ backgroundColor: colors.white, borderRadius: radius.card, padding: 14, gap: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.forest }}>{categoryName(db, id)}</Text>
            <Text style={{ fontSize: 12, color: colors.muted }}>{short(cur[id] ?? 0)} vs {short(prev[id] ?? 0)} DT</Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}><View style={{ height: 6, borderRadius: 3, backgroundColor: colors.green, width: `${((cur[id] ?? 0) / maxV) * 100}%` }} /></View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.border }}><View style={{ height: 6, borderRadius: 3, backgroundColor: colors.gold, width: `${((prev[id] ?? 0) / maxV) * 100}%` }} /></View>
        </View>
      ))}
      <Body>Green: this period · Gold: previous period.</Body>
    </Screen>
  );
}
