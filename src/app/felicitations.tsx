import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { InfoRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { Body, Button } from '@/components/ui';
import { colors } from '@/constants/theme';
import { pointsFor } from '@/state/selectors';
import { useStore } from '@/state/store';
import { fmtRange } from '@/utils/format';

export default function CongratulationsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { db, me, actions } = useStore();
  const pts = me ? pointsFor(db, me) : null;
  const period = pts?.periods.find((x) => x.budget.id === id) ?? [...(pts?.periods ?? [])].reverse().find((x) => x.success);

  useEffect(() => {
    if (period) actions.markCelebrated(period.budget.id);
  }, [period?.budget.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen title="Congratulations" plain>
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="trophy" size={52} color={colors.forest} />
        </View>
        <Text style={{ fontSize: 26, fontWeight: '600', color: colors.forest }}>Well done!</Text>
        {period ? <Body style={{ textAlign: 'center' }}>You finished {fmtRange(period.budget.start, period.budget.end)} within budget.</Body> : <Body>Keep going — your first reward is on its way.</Body>}
      </View>
      {period ? <InfoRow label="Points earned" value={`+${period.points + period.bonus}`} tone="good" /> : null}
      {pts ? <InfoRow label="Total points" value={`${pts.total}  ·  ${pts.level}`} /> : null}
      {period && period.bonus > 0 ? <InfoRow label="Streak bonus" value={`+${period.bonus}`} tone="good" /> : null}
      <Button label="View my achievements" onPress={() => router.replace('/points')} />
      <Button label="Back to home" variant="secondary" onPress={() => router.replace('/(tabs)')} />
    </Screen>
  );
}
