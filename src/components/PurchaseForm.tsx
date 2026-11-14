import React, { useState } from 'react';
import { InfoRow } from './Cards';
import { SelectField } from './SelectField';
import { AlertBanner, Body, Button, Hint, Input } from './ui';
import { UNITS } from '@/constants/units';
import { useStore } from '@/state/store';
import { dt, isValidISO, todayISO, toNum, unitPrice } from '@/utils/format';

export interface PurchaseValues { productId: string; price: number; quantity: number; unit: string; store: string; date: string }
interface Props {
  initial?: Partial<{ productId: string; price: number; quantity: number; unit: string; store: string; date: string }>;
  lockProduct?: boolean;
  onSubmit: (v: PurchaseValues) => void;
  onCancel: () => void;
  submitLabel: string;
}

/** Shared by "Add purchase" and "Edit purchase". */
export function PurchaseForm({ initial, lockProduct, onSubmit, onCancel, submitLabel }: Props) {
  const { db, me } = useStore();
  const products = db.products.filter((p) => p.userId === me?.id);
  const [productId, setProductId] = useState(initial?.productId ?? '');
  const product = products.find((p) => p.id === productId);
  const [price, setPrice] = useState(initial?.price !== undefined ? String(initial.price) : '');
  const [quantity, setQuantity] = useState(initial?.quantity !== undefined ? String(initial.quantity) : '1');
  const [unit, setUnit] = useState(initial?.unit ?? product?.unit ?? 'L');
  const [store, setStore] = useState(initial?.store ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [error, setError] = useState('');

  const p = toNum(price), q = toNum(quantity);
  const up = Number.isFinite(p) && q > 0 ? unitPrice(p, q) : null;

  const pickProduct = (id: string) => {
    setProductId(id);
    const prod = products.find((x) => x.id === id);
    if (prod) setUnit(prod.unit);
  };

  const submit = () => {
    if (!productId) return setError('Choose a product.');
    if (!Number.isFinite(p) || p < 0) return setError('Enter a total price of 0 or more.');
    if (!Number.isFinite(q) || q <= 0) return setError('Quantity must be greater than 0.');
    if (!isValidISO(date)) return setError('Use the date format YYYY-MM-DD.');
    onSubmit({ productId, price: p, quantity: q, unit, store: store.trim(), date });
  };

  return (
    <>
      {error ? <AlertBanner tone="danger" title="Check this purchase" detail={error} /> : null}
      {lockProduct && product ? (
        <InfoRow label="Product" value={`${product.name}${product.brand ? ' · ' + product.brand : ''}`} />
      ) : (
        <SelectField label="Product" value={productId} placeholder="Choose a product" options={products.map((x) => ({ value: x.id, label: `${x.name}${x.brand ? ' · ' + x.brand : ''}` }))} onChange={pickProduct} />
      )}
      <Input label="Total price · DT" value={price} onChangeText={(t) => { setPrice(t); setError(''); }} keyboardType="decimal-pad" placeholder="14.500" />
      <Input label="Quantity" value={quantity} onChangeText={(t) => { setQuantity(t); setError(''); }} keyboardType="decimal-pad" />
      <SelectField label="Unit" value={unit} options={UNITS} onChange={setUnit} />
      <Input label="Store" value={store} onChangeText={setStore} autoCapitalize="words" placeholder="Monoprix" />
      <Input label="Purchase date" value={date} onChangeText={(t) => { setDate(t); setError(''); }} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      <InfoRow label="Calculated unit price" value={up === null ? '—' : `${dt(up)} DT / ${unit}`} tone="good" />
      <Body>Unit price = total price ÷ quantity.</Body>
      <Hint>Compare with the previous purchase before saving.</Hint>
      {products.length === 0 ? <AlertBanner tone="warning" title="No product yet" detail="Add a product first, then record purchases for it." /> : null}
      <Button label={submitLabel} onPress={submit} disabled={products.length === 0} />
      <Button label="Cancel" variant="secondary" onPress={onCancel} />
    </>
  );
}
