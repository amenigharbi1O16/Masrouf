import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { allocated, currentBudget } from '@/state/selectors';
import { useStore } from '@/state/store';
import { addDays, daysBetween, fmtRange, isValidISO, money, todayISO, toNum } from '@/utils/format';

/** Create budget (default) and Modify budget (?mode=edit[&id=...]). */
export default function BudgetPeriodScreen() {
  const router = useRouter();
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();
  const { db, me, actions } = useStore();
  const editing = mode === 'edit';
  const existing = useMemo(() => {
    if (!editing || !me) return null;
    return db.budgets.find((b) => b.id === id && b.userId === me.id) ?? currentBudget(db, me.id);
  }, [editing, id, db, me]);

  const [start, setStart] = useState(existing?.start ?? todayISO());
  const [end, setEnd] = useState(existing?.end ?? addDays(todayISO(), 29));
  const [total, setTotal] = useState(existing ? String(existing.total) : '');
  const [alloc, setAlloc] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(existing?.allocations ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [error, setError] = useState('');

  if (!me) return null;
  if (editing && !existing) {
    return (
      <Screen title="Modify budget" back>
        <AlertBanner tone="info" title="No budget to modify" detail="Create a budget period first." />
        <Button label="Create a budget" onPress={() => router.replace('/budget-mois')} />
      </Screen>
    );
  }

  const totalN = toNum(total);
  const allocN = Object.fromEntries(Object.entries(alloc).map(([k, v]) => [k, Number.isFinite(toNum(v)) ? toNum(v) : 0]));
  const allocSum = allocated({ allocations: allocN });

  const validate = (): string => {
    if (!isValidISO(start) || !isValidISO(end)) return 'Use the format YYYY-MM-DD for both dates.';
    if (end < start) return 'The end date must be on or after the start date.';
    if (!Number.isFinite(totalN) || totalN <= 0) return 'Enter a total budget greater than 0.';
    if (editing && allocSum > totalN) return `Allocated amounts exceed the total by ${money(allocSum - totalN)}.`;
    return '';
  };

  const next = () => {
    const e = validate();
    if (e) { setError(e); return; }
    router.push({ pathname: '/allocation-budget', params: { start, end, total: String(totalN) } } as never);
  };
  const save = () => {
    const e = validate();
    if (e || !existing) { setError(e); return; }
    actions.saveBudget({ id: existing.id, start, end, total: totalN, allocations: Object.fromEntries(Object.entries(allocN).filter(([, v]) => v > 0)) });
    router.back();
  };

  const validRange = isValidISO(start) && isValidISO(end) && end >= start;
  return (
    <Screen title={editing ? 'Modify budget' : 'Create budget'} back>
      <Eyebrow>{editing && existing ? `CURRENT PERIOD  ·  ${fmtRange(existing.start, existing.end)}` : 'A PERIOD THAT WORKS FOR YOU'}</Eyebrow>
      {!editing && <SectionTitle>Give every dinar a direction.</SectionTitle>}
      {error ? <AlertBanner tone="danger" title="Check this budget" detail={error} /> : null}
      <Input label="Start date" value={start} onChangeText={(t) => { setStart(t); setError(''); }} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      <Input label="End date" value={end} onChangeText={(t) => { setEnd(t); setError(''); }} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      <Input label="Total budget · DT" value={total} onChangeText={(t) => { setTotal(t); setError(''); }} keyboardType="decimal-pad" placeholder="1200.000" />
      {editing ? (
        <>
          <SectionTitle>Category allocation</SectionTitle>
          {Object.keys(alloc).map((cid) => (
            <Input key={cid} label={db.categories.find((c) => c.id === cid)?.name ?? cid} value={alloc[cid]} onChangeText={(t) => setAlloc((a) => ({ ...a, [cid]: t }))} keyboardType="decimal-pad" />
          ))}
          <AlertBanner
            tone={allocSum > (totalN || 0) ? 'danger' : 'info'}
            title={`Allocated ${money(allocSum)}  ·  Unallocated ${money(Math.max(0, (totalN || 0) - allocSum))}`}
            detail="Unallocated funds are allowed. Allocated amounts cannot exceed the total."
          />
          <Button label="Save changes" onPress={save} disabled={!validRange} />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </>
      ) : (
        <>
          <AlertBanner tone="info" title={validRange ? `${daysBetween(start, end)} days selected` : 'Choose any start and end dates'} detail="Not just a calendar month — pick the period that fits your pay cycle." />
          <Button label="Allocate by category" onPress={next} />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </>
      )}
    </Screen>
  );
}
