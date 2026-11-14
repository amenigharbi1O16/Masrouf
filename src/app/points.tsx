import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { InfoRow, TransactionRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { Body, Button, EmptyState, Eyebrow, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { pointsFor } from '@/state/selectors';
import { useStore } from '@/state/store';
import { fmtRange } from '@/utils/format';

export default function PointsScreen() {
  const router = useRouter();
  const { db, me } = useStore();
  if (!me) return null;
  const p = pointsFor(db, me);
  const r = db.pointsRules;
  const progress = p.next ? Math.min(1, p.total / p.next.at) : 1;
  const latest = [...p.periods].reverse().find((x) => x.success);

  return (
    <Screen title="Points and achievements" back>
      <Eyebrow>YOUR HABITS, REWARDED</Eyebrow>
      <View style={{ backgroundColor: colors.forest, borderRadius: radius.hero, padding: 24, gap: 6 }}>
        <Text style={{ color: colors.mint, fontSize: 12, fontWeight: '500' }}>LEVEL</Text>
        <Text style={{ color: colors.white, fontSize: 30, fontWeight: '700' }}>{p.level}</Text>
        <Text style={{ color: colors.mint, fontSize: 14 }}>{p.total} points{p.next ? `  ·  ${p.next.at - p.total} to ${p.next.name}` : '  ·  top level reached'}</Text>
        <View style={{ height: 7, borderRadius: 4, backgroundColor: colors.track, marginTop: 10 }}><View style={{ height: 7, borderRadius: 4, width: `${progress * 100}%`, backgroundColor: colors.mint }} /></View>
      </View>
      <InfoRow label="Current streak" value={`${p.streak} ${p.streak === 1 ? 'period' : 'periods'}`} />
      <InfoRow label="Best streak" value={`${p.best} ${p.best === 1 ? 'period' : 'periods'}`} />
      <Body>
        A period succeeds when spending ends at or below the budget. Earn {r.periodReward} points once per period, plus {r.streakBonus} bonus points for every {r.streakLength} successful periods in a row. Beginner 0 · Saver {r.saverAt} · Expert {r.expertAt}.
      </Body>
      <SectionTitle>Completed periods</SectionTitle>
      {p.periods.length === 0 ? (
        <EmptyState icon="trophy-outline" title="No completed period yet" detail="Your first reward arrives when a budget period ends within budget." />
      ) : (
        [...p.periods].reverse().map((x) => (
          <TransactionRow
            key={x.budget.id} icon={x.success ? 'trophy-outline' : 'close-circle-outline'}
            title={fmtRange(x.budget.start, x.budget.end)} detail={x.success ? (x.bonus ? 'Within budget · streak bonus' : 'Within budget') : 'Over budget'}
            amount={x.success ? `+${x.points + x.bonus}` : '0'}
          />
        ))
      )}
      {latest ? <Button label="View latest reward" onPress={() => router.push({ pathname: '/felicitations', params: { id: latest.budget.id } } as never)} /> : null}
    </Screen>
  );
}
