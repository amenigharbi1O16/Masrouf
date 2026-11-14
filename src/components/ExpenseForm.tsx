import React, { useState } from 'react';
import { SelectField } from './SelectField';
import { AlertBanner, Button, Hint, Input } from './ui';
import { currentBudget, spentByCategory } from '@/state/selectors';
import { useStore } from '@/state/store';
import { isValidISO, money, todayISO, toNum } from '@/utils/format';

export interface ExpenseValues { categoryId: string; amount: number; note: string; date: string }
interface Props {
  initial?: Partial<ExpenseValues>;
  excludeId?: string; // when editing: budget impact counts only the difference
  onSubmit: (v: ExpenseValues) => void;
  onCancel: () => void;
  submitLabel: string;
}

/** Shared by "Add expense" and "Edit expense". No product is needed. */
export function ExpenseForm({ initial, excludeId, onSubmit, onCancel, submitLabel }: Props) {
  const { db, me } = useStore();
  const cats = db.categories.filter((c) => c.kind === 'expense' && c.active && (me?.categoryIds.includes(c.id) || c.id === initial?.categoryId));
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? cats[0]?.id ?? '');
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');

  const budget = me ? currentBudget(db, me.id) : null;
  const a = toNum(amount);
  let impact: { tone: 'info' | 'warning' | 'danger'; title: string; detail: string } | null = null;
  if (budget && me && categoryId && Number.isFinite(a) && a >= 0) {
    const alloc = budget.allocations[categoryId] ?? 0;
    const spent = (spentByCategory(db, me.id, budget.start, budget.end, excludeId)[categoryId] ?? 0) + (date >= budget.start && date <= budget.end ? a : 0);
    const name = cats.find((c) => c.id === categoryId)?.name ?? 'Category';
    impact = spent > alloc && alloc > 0
      ? { tone: 'danger', title: `${name} would exceed its allocation`, detail: `${money(spent)} of ${money(alloc)} after saving.` }
      : { tone: 'info', title: `${name} after saving`, detail: `${money(spent)} of ${money(alloc)} allocated.` };
  }

  const submit = () => {
    if (!categoryId) return setError('Choose an expense category.');
    if (!Number.isFinite(a) || a < 0) return setError('Enter an amount of 0 or more.');
    if (!isValidISO(date)) return setError('Use the date format YYYY-MM-DD.');
    onSubmit({ categoryId, amount: a, note: note.trim(), date });
  };

  return (
    <>
      {error ? <AlertBanner tone="danger" title="Check this expense" detail={error} /> : null}
      <SelectField label="Expense category" value={categoryId} options={cats.map((c) => ({ value: c.id, label: c.name }))} onChange={setCategoryId} />
      <Input label="Amount · DT" value={amount} onChangeText={(t) => { setAmount(t); setError(''); }} keyboardType="decimal-pad" placeholder="35.000" />
      <Input label="Date" value={date} onChangeText={(t) => { setDate(t); setError(''); }} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      <Input label="Note · optional" value={note} onChangeText={setNote} autoCapitalize="sentences" placeholder="Bus pass" />
      <Hint>{cats.map((c) => c.name).join(' · ') || 'No expense category selected — add some in Settings → Manage categories.'}</Hint>
      {impact ? <AlertBanner tone={impact.tone} title={impact.title} detail={impact.detail} /> : null}
      <Button label={submitLabel} onPress={submit} disabled={cats.length === 0} />
      <Button label="Cancel" variant="secondary" onPress={onCancel} />
    </>
  );
}
