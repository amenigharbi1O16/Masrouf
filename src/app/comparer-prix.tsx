import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { InfoRow, ProductCard } from '@/components/Cards';
import { PriceChart } from '@/components/PriceChart';
import { Screen } from '@/components/Screen';
import { AlertBanner, Button, EmptyState, Eyebrow, PriceIndicator } from '@/components/ui';
import { categoryName, currentBudget, previousPurchase, priceChange, productPurchases, spentByCategory, unitOf } from '@/state/selectors';
import { useStore } from '@/state/store';
import { dt, fmtDate, monthShort, money, parseISO, short, unitPrice } from '@/utils/format';

/** "Compare price": shown before confirming a new or edited purchase. */
export default function ComparePriceScreen() {
  const router = useRouter();
  const q = useLocalSearchParams<{ productId: string; price: string; quantity: string; unit: string; store: string; date: string; purchaseId?: string }>();
  const { db, me, actions } = useStore();
  const product = db.products.find((p) => p.id === q.productId);
  const price = Number(q.price), quantity = Number(q.quantity);
  if (!product || !me || !Number.isFinite(price) || !(quantity > 0)) {
    return <Screen title="Compare price" back><EmptyState title="Nothing to compare" actionLabel="Back" onAction={() => router.back()} /></Screen>;
  }
  const editingId = q.purchaseId;
  const newUnit = unitPrice(price, quantity);
  const prev = previousPurchase(db, product.id, q.date, q.unit, editingId);
  const change = prev ? priceChange(unitOf(prev), newUnit) : null;
  const mismatch = productPurchases(db, product.id).some((p) => p.id !== editingId && p.unit !== q.unit) && !prev;

  const history = productPurchases(db, product.id).filter((p) => p.id !== editingId && p.unit === q.unit).map((p) => ({ date: p.date, v: unitOf(p) }));
  const series = [...history, { date: q.date, v: newUnit }].sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-6)
    .map((p) => ({ label: monthShort(parseISO(p.date).getUTCMonth()), value: p.v }));

  const budget = currentBudget(db, me.id);
  const catId = product.categoryId;
  const inBudget = !!budget && q.date >= budget.start && q.date <= budget.end;
  const spentAfter = budget ? (spentByCategory(db, me.id, budget.start, budget.end, editingId)[catId] ?? 0) + (inBudget ? price : 0) : 0;
  const alloc = budget?.allocations[catId] ?? 0;

  const confirm = () => {
    const values = { productId: product.id, price, quantity, unit: q.unit, store: q.store ?? '', date: q.date };
    let id = editingId;
    if (editingId) actions.updatePurchase(editingId, values);
    else id = actions.addPurchase(values);
    router.replace({ pathname: '/confirmation', params: { kind: editingId ? 'update' : 'purchase', purchaseId: id, productId: product.id, categoryId: catId, amount: String(price) } } as never);
  };

  return (
    <Screen title="Compare price" back>
      <Eyebrow>BEFORE YOU CONFIRM</Eyebrow>
      <ProductCard product={product} categoryName={categoryName(db, catId)} unit={q.unit} latestUnitPrice={newUnit} />
      {mismatch ? <AlertBanner tone="warning" title="Different unit" detail={`Earlier purchases use another unit than ${q.unit}, so prices cannot be compared directly.`} /> : null}
      {prev ? <InfoRow label="Previous unit price" value={`${dt(unitOf(prev))} DT / ${prev.unit}`} /> : null}
      <InfoRow label="New unit price" value={`${dt(newUnit)} DT / ${q.unit}`} tone="good" />
      <PriceIndicator change={change} unitLabel={q.unit} />
      {prev ? <InfoRow label="Previous purchase" value={fmtDate(prev.date)} /> : null}
      {prev ? <InfoRow label="Previous store" value={prev.store || '—'} /> : null}
      <PriceChart title="Your price history" unit={`DT / ${q.unit}`} points={series} />
      <InfoRow label="Purchase total" value={money(price)} />
      {budget ? (
        <InfoRow label={`${categoryName(db, catId)} budget after saving`} value={`${short(spentAfter)} / ${short(alloc)} DT`} tone={spentAfter > alloc && alloc > 0 ? 'danger' : undefined} />
      ) : (
        <AlertBanner tone="info" title="No active budget" detail="This purchase will be saved without a budget impact." />
      )}
      <Button label="Confirm purchase" onPress={confirm} />
      <Button label="Edit purchase" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
