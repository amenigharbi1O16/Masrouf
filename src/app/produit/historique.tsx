import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { InfoRow, TransactionRow } from '@/components/Cards';
import { PriceChart } from '@/components/PriceChart';
import { Screen } from '@/components/Screen';
import { Button, EmptyState, Eyebrow, SectionTitle } from '@/components/ui';
import { productPurchases, unitOf } from '@/state/selectors';
import { useStore } from '@/state/store';
import { dt, fmtDate, monthShort, money, parseISO } from '@/utils/format';

export default function PurchaseHistoryScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useStore();
  const product = db.products.find((p) => p.id === id);
  const list = product ? productPurchases(db, product.id) : [];
  if (!product) {
    return <Screen title="Purchase history" back><EmptyState title="Product not found" actionLabel="Back to products" onAction={() => router.replace('/produits')} /></Screen>;
  }
  const last = list[list.length - 1];
  const total = list.reduce((a, p) => a + p.price, 0);
  const unit = last?.unit ?? product.unit;
  const series = list.filter((p) => p.unit === unit).slice(-6).map((p) => ({ label: monthShort(parseISO(p.date).getUTCMonth()), value: unitOf(p) }));

  return (
    <Screen title="Purchase history" back>
      <Eyebrow>{[product.name, product.brand, last ? `${last.quantity} ${last.unit}` : ''].filter(Boolean).join(' · ').toUpperCase()}</Eyebrow>
      <SectionTitle>Every price, remembered.</SectionTitle>
      <InfoRow label={`${list.length} ${list.length === 1 ? 'purchase' : 'purchases'}`} value={money(total)} />
      {list.length === 0 ? (
        <EmptyState icon="receipt-outline" title="No purchases yet" actionLabel="Add purchase" onAction={() => router.push({ pathname: '/nouvel-achat', params: { productId: product.id } } as never)} />
      ) : (
        [...list].reverse().map((p) => (
          <TransactionRow
            key={p.id} title={fmtDate(p.date)} detail={`${p.store} · ${p.quantity} ${p.unit} · ${dt(unitOf(p))} DT / ${p.unit}`} amount={`−${dt(p.price)}`}
            onPress={() => router.push({ pathname: '/modifier-achat', params: { id: p.id } } as never)}
          />
        ))
      )}
      {list.length > 0 && <PriceChart title={`Unit price · DT / ${unit}`} unit={`DT / ${unit}`} points={series} />}
      <Button label="Edit latest purchase" onPress={() => last && router.push({ pathname: '/modifier-achat', params: { id: last.id } } as never)} disabled={!last} />
    </Screen>
  );
}
