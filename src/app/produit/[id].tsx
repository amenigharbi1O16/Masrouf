import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { InfoRow } from '@/components/Cards';
import { PriceChart } from '@/components/PriceChart';
import { ProductThumb } from '@/components/ProductThumb';
import { Screen } from '@/components/Screen';
import { Button, EmptyState, Eyebrow, PriceIndicator } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { categoryName, priceChange, productPurchases, unitOf } from '@/state/selectors';
import { useStore } from '@/state/store';
import { dt, fmtDate, monthShort, parseISO } from '@/utils/format';

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db } = useStore();
  const product = db.products.find((p) => p.id === id);
  if (!product) {
    return (
      <Screen title="Product details" back>
        <EmptyState icon="alert-circle-outline" title="Product not found" detail="It may have been removed." actionLabel="Back to products" onAction={() => router.replace('/produits')} />
      </Screen>
    );
  }
  const list = productPurchases(db, product.id);
  const last = list[list.length - 1];
  const prev = last ? [...list].reverse().find((p) => p !== last && p.unit === last.unit) : undefined;
  const change = last && prev ? priceChange(unitOf(prev), unitOf(last)) : null;
  const unit = last?.unit ?? product.unit;
  const series = list.filter((p) => p.unit === unit).slice(-6).map((p) => ({ label: monthShort(parseISO(p.date).getUTCMonth()), value: unitOf(p) }));

  return (
    <Screen title={product.name} back>
      <Eyebrow>PRODUCT DETAILS</Eyebrow>
      <View style={{ backgroundColor: colors.white, borderRadius: radius.card, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <ProductThumb name={product.name} uri={product.photo} size={72} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: colors.muted }}>{product.name.toUpperCase()}</Text>
          <Text style={{ fontSize: 22, fontWeight: '600', color: colors.forest }}>{product.brand || product.name}</Text>
          <Text style={{ fontSize: 13, color: colors.muted }}>{categoryName(db, product.categoryId)}  ·  {product.unit}</Text>
        </View>
      </View>
      {last ? (
        <>
          <InfoRow label="Latest unit price" value={`${dt(unitOf(last))} DT / ${last.unit}`} />
          <InfoRow label="Last purchase" value={fmtDate(last.date)} />
          <InfoRow label="Store" value={last.store || '—'} />
          <PriceIndicator change={change} unitLabel={last.unit} />
          <PriceChart title="Price evolution" unit={`DT / ${last.unit}`} points={series} />
        </>
      ) : (
        <EmptyState icon="pricetag-outline" title="No purchase yet" detail="Record the first purchase to start tracking prices." />
      )}
      <Button label="View purchase history" onPress={() => router.push({ pathname: '/produit/historique', params: { id: product.id } } as never)} disabled={!last} />
      <Button label="＋ Add purchase" variant="secondary" onPress={() => router.push({ pathname: '/nouvel-achat', params: { productId: product.id } } as never)} />
      <Button label="Edit product" variant="secondary" onPress={() => router.push({ pathname: '/modifier-produit', params: { id: product.id } } as never)} />
    </Screen>
  );
}
