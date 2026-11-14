import { useRouter } from 'expo-router';
import React from 'react';
import { ExpenseForm } from '@/components/ExpenseForm';
import { Screen } from '@/components/Screen';
import { Eyebrow, SectionTitle } from '@/components/ui';
import { useStore } from '@/state/store';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { actions } = useStore();
  return (
    <Screen title="Add expense" back>
      <Eyebrow>NO PRODUCT REQUIRED</Eyebrow>
      <SectionTitle>Keep life’s essentials in view.</SectionTitle>
      <ExpenseForm
        submitLabel="Save expense" onCancel={() => router.back()}
        onSubmit={(v) => {
          actions.addExpense(v);
          router.replace({ pathname: '/confirmation', params: { kind: 'expense', categoryId: v.categoryId, amount: String(v.amount) } } as never);
        }}
      />
    </Screen>
  );
}
