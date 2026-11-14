import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ProductCard } from '@/components/Cards';
import { Chips } from '@/components/Chips';
import { Screen } from '@/components/Screen';
import { Button, EmptyState, Eyebrow, Hint, Input } from '@/components/ui';
import { colors } from '@/constants/theme';
import { categoryName, productPurchases, unitOf } from '@/state/selectors';
import { useStore } from '@/state/store';

export default function ProductsScreen() {
  const router = useRouter();
  const { db, me } = useStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [asc, setAsc] = useState(true);

  const mine = useMemo(() => db.products.filter((p) => p.userId === me?.id), [db.products, me?.id]);
  const chipCats = db.categories.filter((c) => c.kind === 'product' && me?.categoryIds.includes(c.id));
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return mine
      .filter((p) => (cat === 'all' || p.categoryId === cat) && (!s || `${p.name} ${p.brand}`.toLowerCase().includes(s)))
      .sort((a, b) => (asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [mine, q, cat, asc]);

  return (
    <Screen title="Products">
      <Eyebrow>YOUR EVERYDAY ESSENTIALS</Eyebrow>
      <Input label="Search" value={q} onChangeText={setQ} placeholder="Olive oil, milk…" autoCapitalize="none" />
      <Chips value={cat} onChange={setCat} options={[{ value: 'all', label: 'All products' }, ...chipCats.map((c) => ({ value: c.id, label: c.name }))]} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.forest }}>{list.length} {list.length === 1 ? 'product' : 'products'}</Text>
        <Pressable onPress={() => setAsc((a) => !a)} accessibilityRole="button"><Text style={{ fontSize: 13, color: colors.green, fontWeight: '600' }}>{asc ? 'Name A–Z' : 'Name Z–A'}</Text></Pressable>
      </View>
      {list.length === 0 ? (
        <EmptyState icon="bag-outline" title={mine.length ? 'No matching product' : 'No products yet'} detail="Products you buy appear here with their latest unit price." actionLabel="Add a product" onAction={() => router.push('/nouveau-produit')} />
      ) : (
        list.map((p) => {
          const last = productPurchases(db, p.id).slice(-1)[0];
          return (
            <ProductCard
              key={p.id} product={p} categoryName={categoryName(db, p.categoryId)} unit={last?.unit ?? p.unit}
              latestUnitPrice={last ? unitOf(last) : undefined}
              onPress={() => router.push({ pathname: '/produit/[id]', params: { id: p.id } } as never)}
            />
          );
        })
      )}
      <Hint>Product categories only. Everyday expenses stay separate.</Hint>
      <Button label="＋ Add a product" onPress={() => router.push('/nouveau-produit')} />
    </Screen>
  );
}
