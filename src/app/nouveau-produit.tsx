import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { AlertBanner, Body, Button, Eyebrow, Hint, Input, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { UNITS } from '@/constants/units';
import { useStore } from '@/state/store';
import { isValidISO, money, todayISO, toNum } from '@/utils/format';
import { pickPhoto } from '@/utils/photos';

export default function AddProductScreen() {
  const router = useRouter();
  const { db, me, actions } = useStore();
  const cats = db.categories.filter((c) => c.kind === 'product' && c.active && me?.categoryIds.includes(c.id));
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState(cats[0]?.id ?? '');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('L');
  const [store, setStore] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');

  const save = () => {
    const p = toNum(price), q = toNum(quantity);
    if (!name.trim()) return setError('Enter a product name.');
    if (!categoryId) return setError('Choose a product category.');
    if (!Number.isFinite(p) || p < 0) return setError('Enter a price of 0 or more.');
    if (!Number.isFinite(q) || q <= 0) return setError('Quantity must be greater than 0.');
    if (!isValidISO(date)) return setError('Use the date format YYYY-MM-DD.');
    const productId = actions.addProduct({ name: name.trim(), brand: brand.trim(), categoryId, unit, photo });
    const purchaseId = actions.addPurchase({ productId, price: p, quantity: q, unit, store: store.trim(), date });
    router.replace({ pathname: '/confirmation', params: { kind: 'purchase', purchaseId, productId, categoryId, amount: String(p) } } as never);
  };

  return (
    <Screen title="Add product" back>
      <Eyebrow>PRODUCT INFORMATION</Eyebrow>
      <SectionTitle>A new item to follow.</SectionTitle>
      {error ? <AlertBanner tone="danger" title="Check this product" detail={error} /> : null}
      {cats.length === 0 ? <AlertBanner tone="warning" title="No product category selected" detail="Select at least one product category in Settings → Manage categories." /> : null}
      <Input label="Product name" value={name} onChangeText={setName} autoCapitalize="sentences" placeholder="Olive oil" />
      <Input label="Brand" value={brand} onChangeText={setBrand} autoCapitalize="words" placeholder="Châal" />
      <Pressable onPress={async () => { const u = await pickPhoto(); if (u) setPhoto(u); }} accessibilityRole="button" style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, minHeight: 80, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.muted }}>Photo · optional</Text>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.forest, marginTop: 6 }}>{photo ? 'Change photo' : '＋ Add a photo'}</Text>
        </View>
        {photo ? <Image source={{ uri: photo }} style={{ width: 48, height: 48, borderRadius: 12 }} /> : null}
      </Pressable>
      <SelectField label="Product category" value={categoryId} options={cats.map((c) => ({ value: c.id, label: c.name }))} onChange={setCategoryId} />
      <Input label="Price · DT" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="14.500" />
      <Input label="Quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
      <SelectField label="Unit" value={unit} options={UNITS} onChange={setUnit} />
      <Input label="Store" value={store} onChangeText={setStore} autoCapitalize="words" placeholder="Monoprix" />
      <Input label="Purchase date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      <Hint>Categories: {cats.map((c) => c.name).join('; ') || 'none selected'}.</Hint>
      {Number.isFinite(toNum(price)) && toNum(quantity) > 0 ? <Body>Unit price: {money(toNum(price) / toNum(quantity))} / {unit}</Body> : null}
      <Button label="Save product and purchase" onPress={save} disabled={cats.length === 0} />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
