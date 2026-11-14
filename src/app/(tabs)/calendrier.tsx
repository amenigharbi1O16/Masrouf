import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { InfoRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { Body, Button, EmptyState, Eyebrow, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { budgetsOverlapping, monthlySpend, summarize } from '@/state/selectors';
import { useStore } from '@/state/store';
import { addDays, fmtRange, money, monthName, pad } from '@/utils/format';

export default function CalendarScreen() {
  const router = useRouter();
  const { db, me } = useStore();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(now.getMonth());
  if (!me) return null;

  const spend = monthlySpend(db, me.id, year);
  const monthBudgets = (m: number) => {
    const start = `${year}-${pad(m + 1)}-01`;
    const end = addDays(`${m === 11 ? year + 1 : year}-${pad(m === 11 ? 1 : m + 2)}-01`, -1);
    return budgetsOverlapping(db, me.id, start, end);
  };
  const ratio = (m: number) => {
    const total = monthBudgets(m).reduce((a, b) => a + b.total, 0);
    return total > 0 ? Math.min(1, spend[m] / total) : 0;
  };
  const selected = month === null ? [] : monthBudgets(month);

  return (
    <Screen title="Calendar">
      <Eyebrow>YOUR FINANCIAL YEAR</Eyebrow>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Previous year"><Text style={{ fontSize: 28, color: colors.forest }}>‹</Text></Pressable>
        <Text style={{ fontSize: 22, fontWeight: '600', color: colors.forest }}>{year}</Text>
        <Pressable onPress={() => setYear((y) => y + 1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Next year"><Text style={{ fontSize: 28, color: colors.forest }}>›</Text></Pressable>
      </View>
      <Body>Choose a month to explore its budget periods.</Body>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {Array.from({ length: 12 }, (_, m) => {
          const on = month === m;
          return (
            <Pressable key={m} onPress={() => setMonth(m)} accessibilityRole="button" style={{ width: '48%', flexGrow: 1, backgroundColor: on ? colors.forest : colors.white, borderRadius: radius.card, padding: 14, gap: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: on ? colors.white : colors.forest }}>{monthName(m)}</Text>
              <Text style={{ fontSize: 12, color: on ? colors.mint : colors.muted }}>{Math.round(spend[m])} DT</Text>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: on ? colors.track : colors.border }}>
                <View style={{ height: 5, borderRadius: 3, width: `${ratio(m) * 100}%`, backgroundColor: on ? colors.mint : ratio(m) >= 1 ? colors.coral : colors.green }} />
              </View>
            </Pressable>
          );
        })}
      </View>
      {month !== null && (
        <>
          <SectionTitle>{monthName(month)} {year}</SectionTitle>
          {selected.length === 0 ? (
            <EmptyState icon="calendar-outline" title="No budget period" detail="No period overlaps this month yet." actionLabel="Create a budget period" onAction={() => router.push('/budget-mois')} />
          ) : (
            selected.map((b) => {
              const s = summarize(db, me.id, b);
              return (
                <Pressable key={b.id} onPress={() => router.push({ pathname: '/budget-mois', params: { mode: 'edit', id: b.id } } as never)} accessibilityRole="button">
                  <InfoRow label={fmtRange(b.start, b.end)} value={`${money(s.spent, 0)} / ${money(b.total, 0)}`} tone={s.status === 'exceeded' ? 'danger' : undefined} />
                </Pressable>
              );
            })
          )}
        </>
      )}
      <Button label="Create a budget period" variant="secondary" onPress={() => router.push('/budget-mois')} />
    </Screen>
  );
}
