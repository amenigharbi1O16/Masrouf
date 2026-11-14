import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { InfoRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
import { useStore } from '@/state/store';
import { daysBetween, dt, fmtRange, money, toNum } from '@/utils/format';

/** Allocate budget (10) + validation state (32): Save is disabled while allocated > total. */
export default function AllocateBudgetScreen() {
  const router = useRouter();
  const { start = '', end = '', total = '0' } = useLocalSearchParams<{ start: string; end: string; total: string }>();
  const { db, me, actions } = useStore();
  const totalN = toNum(total);
  const cats = db.categories.filter((c) => me?.categoryIds.includes(c.id) && c.active);
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(cats.map((c) => [c.id, dt(Math.round(((totalN * (db.defaultPercentages[c.id] ?? 0)) / 100) * 1000) / 1000)])),
  );

  const nums = Object.fromEntries(cats.map((c) => [c.id, Number.isFinite(toNum(vals[c.id])) ? toNum(vals[c.id]) : 0]));
  const sum = Object.values(nums).reduce((a, b) => a + b, 0);
  const over = sum - totalN > 0.0005;

  const create = () => {
    if (over || !Number.isFinite(totalN) || totalN <= 0) return;
    actions.saveBudget({ start, end, total: totalN, allocations: Object.fromEntries(Object.entries(nums).filter(([, v]) => v > 0)) });
    router.dismissAll?.();
    router.replace('/');
  };

  return (
    <Screen title="Allocate budget" back>
      <Eyebrow>{fmtRange(start, end)}  ·  {daysBetween(start, end)} DAYS</Eyebrow>
      <InfoRow label="Total budget" value={money(totalN)} />
      <InfoRow label="Allocated" value={money(sum)} tone={over ? 'danger' : undefined} />
      <InfoRow label="Unallocated" value={over ? `−${money(sum - totalN)}` : money(totalN - sum)} tone={over ? 'danger' : 'good'} />
      {cats.map((c) => (
        <Input
          key={c.id} label={`${c.name} · DT`} value={vals[c.id]} keyboardType="decimal-pad"
          onChangeText={(t) => setVals((v) => ({ ...v, [c.id]: t }))}
          hint={`Default ${db.defaultPercentages[c.id] ?? 0}% of total`}
        />
      ))}
      {over ? (
        <AlertBanner tone="danger" title="Allocation is higher than your total" detail={`Reduce categories by ${money(sum - totalN)} to continue.`} />
      ) : (
        <AlertBanner tone="info" title="Unallocated money is fine" detail="You can keep some of your budget unassigned." />
      )}
      <Button label="Create my budget" onPress={create} disabled={over || cats.length === 0} />
      {cats.length === 0 ? <AlertBanner tone="warning" title="No categories selected" detail="Select categories in Settings → Manage categories first." /> : null}
    </Screen>
  );
}
