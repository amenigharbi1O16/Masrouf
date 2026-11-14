import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { SelectField } from '@/components/SelectField';
import { AlertBanner, Button, EmptyState, Eyebrow, Input } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { UNITS } from '@/constants/units';
import { useStore } from '@/state/store';
import { pickPhoto } from '@/utils/photos';

export default function EditProductScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, me, actions } = useStore();
  const product = db.products.find((p) => p.id === id);
  const [name, setName] = useState(product?.name ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [photo, setPhoto] = useState(product?.photo);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'L');
  const [error, setError] = useState('');
  if (!product) return <Screen title="Edit product" back><EmptyState title="Product not found" actionLabel="Back" onAction={() => router.back()} /></Screen>;
  const cats = db.categories.filter((c) => c.kind === 'product' && (me?.categoryIds.includes(c.id) || c.id === product.categoryId));

  const save = () => {
    if (!name.trim()) return setError('Enter a product name.');
    actions.updateProduct(product.id, { name: name.trim(), brand: brand.trim(), photo, categoryId, unit });
    router.back();
  };
  return (
    <Screen title="Edit product" back>
      <Eyebrow>PRODUCT INFORMATION</Eyebrow>
      {error ? <AlertBanner tone="danger" title="Check this product" detail={error} /> : null}
      <Input label="Product name" value={name} onChangeText={setName} autoCapitalize="sentences" />
      <Input label="Brand" value={brand} onChangeText={setBrand} autoCapitalize="words" />
      <Pressable onPress={async () => { const u = await pickPhoto(); if (u) setPhoto(u); }} accessibilityRole="button" style={{ backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, minHeight: 80, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.muted }}>Photo · optional</Text>
          <Text style={{ fontSize: 16, fontWeight: '500', color: colors.forest, marginTop: 6 }}>{photo ? 'Change photo' : '＋ Add a photo'}</Text>
        </View>
        {photo ? <Image source={{ uri: photo }} style={{ width: 48, height: 48, borderRadius: 12 }} /> : null}
      </Pressable>
      <SelectField label="Product category" value={categoryId} options={cats.map((c) => ({ value: c.id, label: c.name }))} onChange={setCategoryId} />
      <SelectField label="Default unit" value={unit} options={UNITS} onChange={setUnit} />
      <Button label="Save changes" onPress={save} />
      <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
