import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { PurchaseForm } from '@/components/PurchaseForm';
import { Screen } from '@/components/Screen';
import { EmptyState, Eyebrow } from '@/components/ui';
import { useStore } from '@/state/store';

export default function EditPurchaseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useStore();
  const purchase = db.purchases.find((p) => p.id === id);
  if (!purchase) return <Screen title="Edit purchase" back><EmptyState title="Purchase not found" actionLabel="Back" onAction={() => router.back()} /></Screen>;
  return (
    <Screen title="Edit purchase" back>
      <Eyebrow>EDITING CHANGES YOUR BUDGET BY THE DIFFERENCE ONLY</Eyebrow>
      <PurchaseForm
        initial={purchase} lockProduct submitLabel="Compare price" onCancel={() => router.back()}
        onSubmit={(v) => router.push({ pathname: '/comparer-prix', params: { purchaseId: purchase.id, productId: v.productId, price: String(v.price), quantity: String(v.quantity), unit: v.unit, store: v.store, date: v.date } } as never)}
      />
    </Screen>
  );
}
