import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Screen } from '@/components/Screen';
import { EmptyState, Eyebrow } from '@/components/ui';
import { useStore } from '@/state/store';

export default function EditExpenseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, actions } = useStore();
  const expense = db.expenses.find((e) => e.id === id);
  if (!expense) return <Screen title="Edit expense" back><EmptyState title="Expense not found" actionLabel="Back" onAction={() => router.back()} /></Screen>;
  return (
    <Screen title="Edit expense" back>
      <Eyebrow>EDITING CHANGES YOUR BUDGET BY THE DIFFERENCE ONLY</Eyebrow>
      <ExpenseForm
        initial={expense} excludeId={expense.id} submitLabel="Save changes" onCancel={() => router.back()}
        onSubmit={(v) => {
          actions.updateExpense(expense.id, v);
          router.replace({ pathname: '/confirmation', params: { kind: 'update', categoryId: v.categoryId, amount: String(v.amount) } } as never);
        }}
      />
    </Screen>
  );
}
