import React, { useState } from 'react';
import { InfoRow } from '@/components/Cards';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
import { useStore } from '@/state/store';
import { toNum } from '@/utils/format';

export default function AdminDefaultPercentagesScreen() {
  const { db, actions } = useStore();
  const cats = db.categories.filter((c) => c.active);
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(cats.map((c) => [c.id, String(db.defaultPercentages[c.id] ?? 0)])));
  const [saved, setSaved] = useState(false);
  const nums = Object.fromEntries(cats.map((c) => [c.id, Number.isFinite(toNum(vals[c.id])) ? toNum(vals[c.id]) : 0]));
  const total = Object.values(nums).reduce((a, b) => a + b, 0);
  const ok = Math.abs(total - 100) < 0.0001 && Object.values(nums).every((v) => v >= 0);
  return (
    <Screen title="Default percentages">
      <Eyebrow>SUGGESTED ALLOCATION · MUST TOTAL 100%</Eyebrow>
      <InfoRow label="Total" value={`${total.toFixed(1).replace(/\.0$/, '')}%`} tone={ok ? 'good' : 'danger'} />
      {cats.map((c) => (
        <Input key={c.id} label={`${c.name} · %`} value={vals[c.id]} keyboardType="decimal-pad" onChangeText={(t) => { setVals((v) => ({ ...v, [c.id]: t })); setSaved(false); }} />
      ))}
      {!ok ? <AlertBanner tone="danger" title="Percentages must total exactly 100%" detail={`Currently ${total.toFixed(1)}%.`} /> : null}
      {saved ? <AlertBanner tone="success" title="Default percentages saved" detail="Users can still customize their own allocation." /> : null}
      <Button label="Save percentages" disabled={!ok} onPress={() => { actions.setDefaultPercentages({ ...db.defaultPercentages, ...nums }); setSaved(true); }} />
    </Screen>
  );
}
