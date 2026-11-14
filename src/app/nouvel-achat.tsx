import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { PurchaseForm } from '@/components/PurchaseForm';
import { Screen } from '@/components/Screen';
import { Eyebrow } from '@/components/ui';

export default function AddPurchaseScreen() {
  const router = useRouter();
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  return (
    <Screen title="Add purchase" back>
      <Eyebrow>RECORD A PRODUCT PURCHASE</Eyebrow>
      <PurchaseForm
        initial={{ productId }} lockProduct={!!productId} submitLabel="Compare price" onCancel={() => router.back()}
        onSubmit={(v) => router.push({ pathname: '/comparer-prix', params: { productId: v.productId, price: String(v.price), quantity: String(v.quantity), unit: v.unit, store: v.store, date: v.date } } as never)}
      />
    </Screen>
  );
}
