/**
 * FICHIER : src/components/PurchaseForm.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-049
 * COMPOSANT : PurchaseForm (Formulaire Partagé d'Achat de Produit)
 *
 * RÔLE DU COMPOSANT :
 * Formulaire réutilisé par les écrans "Ajouter un achat" (`nouvel-achat.tsx`) et
 * "Modifier l'achat" (`modifier-achat.tsx`).
 * Gère la sélection du produit, la saisie du prix total en DT, de la quantité, de l'unité,
 * du magasin et de la date, tout en calculant dynamiquement le prix unitaire.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Affiche la sélection du produit (ou une InfoRow figée si le produit est verrouillé),
 * les champs de saisie Input pour le prix total et la quantité, le sélecteur d'unité,
 * le champ magasin et date, la ligne InfoRow affichant le prix unitaire calculé en temps réel,
 * une note pédagogique et les boutons d'action d'enregistrement et d'annulation.
 */

import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
// Composant d'information bicolore
import { InfoRow } from './Cards';
// Sélecteur déroulant modal
import { SelectField } from './SelectField';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Body, Button, Hint, Input } from './ui';
// Liste des unités physiques standardisées
import { UNITS } from '@/constants/units';
// Magasin d'état global SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul
import { dt, isValidISO, todayISO, toNum, unitPrice } from '@/utils/format';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Interface des valeurs transmises lors de la validation du formulaire.
 */
export interface PurchaseValues {
  productId: string;
  price: number;
  quantity: number;
  unit: string;
  store: string;
  date: string;
}

/**
 * Propriétés du formulaire d'achat.
 */
interface Props {
  initial?: Partial<{
    productId: string;
    price: number;
    quantity: number;
    unit: string;
    store: string;
    date: string;
  }>;
  lockProduct?: boolean;
  onSubmit: (v: PurchaseValues) => void;
  onCancel: () => void;
  submitLabel: string;
}

/**
 * Formulaire modulaire de saisie d'un achat de produit.
 */
export function PurchaseForm({
  initial,
  lockProduct,
  onSubmit,
  onCancel,
  submitLabel,
}: Props) {
  const { db, me, selectedBudget } = useStore();
  const { t, isRTL } = useTranslation();

  // Produits appartenant à l'utilisateur connecté
  const products = db.products.filter((p) => p.userId === me?.id);

  // États locaux des champs du formulaire
  const [productId, setProductId] = useState(initial?.productId ?? '');
  const product = products.find((p) => p.id === productId);

  const [price, setPrice] = useState(
    initial?.price !== undefined ? String(initial.price) : ''
  );
  const [quantity, setQuantity] = useState(
    initial?.quantity !== undefined ? String(initial.quantity) : '1'
  );
  const [unit, setUnit] = useState(initial?.unit ?? product?.unit ?? 'L');
  const [store, setStore] = useState(initial?.store ?? '');

  // Date par défaut rattachée à la période budgétaire sélectionnée
  const defaultDate = useMemo(() => {
    if (initial?.date) return initial.date;
    const today = todayISO();
    if (selectedBudget) {
      if (today >= selectedBudget.start && today <= selectedBudget.end) {
        return today;
      }
      return selectedBudget.start;
    }
    return today;
  }, [initial?.date, selectedBudget]);

  const [date, setDate] = useState(defaultDate);
  const [error, setError] = useState('');

  // Détection si la date choisie est en dehors de la période budgétaire sélectionnée
  const isOutsidePeriod = !!selectedBudget && !!date && (date < selectedBudget.start || date > selectedBudget.end);
  const targetCorrectionDate = selectedBudget
    ? (todayISO() >= selectedBudget.start && todayISO() <= selectedBudget.end ? todayISO() : selectedBudget.start)
    : todayISO();

  // Conversion numérique et calcul dynamique du prix unitaire
  const p = toNum(price);
  const q = toNum(quantity);
  const up = Number.isFinite(p) && q > 0 ? unitPrice(p, q) : null;

  /**
   * Action : sélection d'un produit dans la liste déroulante.
   */
  const pickProduct = (id: string) => {
    setProductId(id);
    const prod = products.find((x) => x.id === id);
    if (prod) setUnit(prod.unit);
  };

  /**
   * Validation et soumission des données saisies.
   */
  const submit = () => {
    if (!productId) return setError(t('choisir_produit_erreur'));
    if (!Number.isFinite(p) || p < 0) return setError(t('entrer_prix_total_valide'));
    if (!Number.isFinite(q) || q <= 0) return setError(t('quantite_doit_etre_positive'));
    if (!isValidISO(date)) return setError(t('format_date_invalide'));

    onSubmit({
      productId,
      price: p,
      quantity: q,
      unit,
      store: store.trim(),
      date,
    });
  };

  return (
    <>
      {/* Bannière d'erreur en cas de validation non satisfaite */}
      {error ? (
        <AlertBanner
          tone="danger"
          title={t('verifier_cet_achat')}
          detail={error}
        />
      ) : null}

      {/* Sélection ou affichage du produit verrouillé */}
      {lockProduct && product ? (
        <InfoRow
          label={t('produit_label')}
          value={`${product.name}${product.brand ? ' · ' + product.brand : ''}`}
        />
      ) : (
        <SelectField
          label={t('produit_label')}
          value={productId}
          placeholder={t('choisir_un_produit')}
          options={products.map((x) => ({
            value: x.id,
            label: `${x.name}${x.brand ? ' · ' + x.brand : ''}`,
          }))}
          onChange={pickProduct}
        />
      )}

      {/* Champ prix total en dinars tunisiens */}
      <Input
        label={t('prix_total_dt')}
        value={price}
        onChangeText={(tVal) => {
          setPrice(tVal);
          setError('');
        }}
        keyboardType="decimal-pad"
        placeholder="14.500"
      />

      {/* Champ quantité achetée */}
      <Input
        label={t('quantite_label')}
        value={quantity}
        onChangeText={(tVal) => {
          setQuantity(tVal);
          setError('');
        }}
        keyboardType="decimal-pad"
      />

      {/* Sélecteur d'unité physique */}
      <SelectField
        label={t('unite_label')}
        value={unit}
        options={UNITS}
        onChange={setUnit}
      />

      {/* Champ magasin */}
      <Input
        label={t('magasin_label')}
        value={store}
        onChangeText={setStore}
        autoCapitalize="words"
        placeholder="Monoprix"
      />

      {/* Champ date d'achat */}
      <Input
        label={t('date_achat_label')}
        value={date}
        onChangeText={(tVal) => {
          setDate(tVal);
          setError('');
        }}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      {/* Alerte et action rapide si la date est hors de la période budgétaire sélectionnée */}
      {isOutsidePeriod && selectedBudget ? (
        <View style={{ gap: 6, marginVertical: 4 }}>
          <AlertBanner
            tone="warning"
            title={t('date_hors_periode')}
            detail={t('date_hors_periode_detail', {
              date,
              start: selectedBudget.start,
              end: selectedBudget.end,
            })}
          />
          <Button
            label={t('ajuster_date_periode', { date: targetCorrectionDate })}
            variant="secondary"
            onPress={() => setDate(targetCorrectionDate)}
          />
        </View>
      ) : null}

      {/* Ligne prix unitaire calculé automatiquement */}
      <InfoRow
        label={t('prix_unitaire_calcule')}
        value={up === null ? '—' : `${dt(up)} DT / ${unit}`}
        tone="good"
      />

      {/* Formule de calcul pédagogique */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('formule_prix_unitaire')}
      </Body>

      {/* Conseil de comparaison */}
      <Hint style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('comparer_avant_sauvegarder')}
      </Hint>

      {/* Alerte si aucun produit n'existe encore dans le catalogue */}
      {products.length === 0 ? (
        <AlertBanner
          tone="warning"
          title={t('aucun_produit_existant')}
          detail={t('ajouter_produit_dabord')}
        />
      ) : null}

      {/* Bouton principal de soumission */}
      <Button
        label={submitLabel}
        onPress={submit}
        disabled={products.length === 0}
      />

      {/* Bouton d'annulation */}
      <Button
        label={t('annuler')}
        variant="secondary"
        onPress={onCancel}
      />
    </>
  );
}
