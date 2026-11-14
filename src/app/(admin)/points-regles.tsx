import React, { useState } from 'react';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
import { useStore } from '@/state/store';
import { toNum } from '@/utils/format';

export default function AdminPointsRulesScreen() {
  const { db, actions } = useStore();
  const r = db.pointsRules;
  const [f, setF] = useState({ periodReward: String(r.periodReward), streakLength: String(r.streakLength), streakBonus: String(r.streakBonus), saverAt: String(r.saverAt), expertAt: String(r.expertAt) });
  const [saved, setSaved] = useState(false);
  const n = { periodReward: toNum(f.periodReward), streakLength: toNum(f.streakLength), streakBonus: toNum(f.streakBonus), saverAt: toNum(f.saverAt), expertAt: toNum(f.expertAt) };
  const valid = Object.values(n).every((v) => Number.isFinite(v) && v >= 0) && n.streakLength >= 1 && n.expertAt > n.saverAt;
  const set = (k: keyof typeof f) => (t: string) => { setF((x) => ({ ...x, [k]: t })); setSaved(false); };
  return (
    <Screen title="Points rules">
      <Eyebrow>REWARD ONCE PER SUCCESSFUL PERIOD</Eyebrow>
      <Input label="Points per successful period" value={f.periodReward} onChangeText={set('periodReward')} keyboardType="number-pad" />
      <Input label="Streak length (periods)" value={f.streakLength} onChangeText={set('streakLength')} keyboardType="number-pad" />
      <Input label="Streak bonus points" value={f.streakBonus} onChangeText={set('streakBonus')} keyboardType="number-pad" />
      <Input label="Saver level starts at (points)" value={f.saverAt} onChangeText={set('saverAt')} keyboardType="number-pad" />
      <Input label="Expert level starts at (points)" value={f.expertAt} onChangeText={set('expertAt')} keyboardType="number-pad" />
      {!valid ? <AlertBanner tone="danger" title="Check the rules" detail="Use whole numbers, a streak of at least 1, and an Expert threshold above Saver." /> : null}
      {saved ? <AlertBanner tone="success" title="Points rules saved" /> : null}
      <Button label="Save rules" disabled={!valid} onPress={() => { actions.setPointsRules({ periodReward: n.periodReward, streakLength: Math.round(n.streakLength), streakBonus: n.streakBonus, saverAt: n.saverAt, expertAt: n.expertAt }); setSaved(true); }} />
    </Screen>
  );
}
