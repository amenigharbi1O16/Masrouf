/**
 * FICHIER : src/components/ExpenseForm.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-044
 * COMPOSANT : ExpenseForm (Formulaire Partagé de Dépense Directe)
 *
 * RÔLE DU COMPOSANT :
 * Formulaire réutilisable partagé entre "Ajouter une dépense" (`nouvelle-depense.tsx`) et
 * "Modifier la dépense" (`modifier-depense.tsx`).
 * Gère la saisie d'une dépense directe sans produit (montant en DT, catégorie, date, note)
 * et simule en direct l'impact sur l'enveloppe budgétaire correspondante.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Affiche le sélecteur de catégorie de dépense, les champs de saisie pour le montant,
 * la date et la note optionnelle, une bannière dynamique simulant l'impact sur le budget
 * (bleue si dans l'enveloppe, rouge si dépassement), et les boutons d'action.
 */

import React, { useState } from 'react';
// Sélecteur déroulant modal
import { SelectField } from './SelectField';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Hint, Input } from './ui';
// Sélecteurs de calcul financier SQLite (budget en cours, dépenses par catégorie)
import { currentBudget, spentByCategory } from '@/state/selectors';
// Magasin d'état global SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul et dates
import { isValidISO, money, todayISO, toNum } from '@/utils/format';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Interface des valeurs transmises lors de la soumission de la dépense.
 */
export interface ExpenseValues {
  categoryId: string;
  amount: number;
  note: string;
  date: string;
}

/**
 * Propriétés du formulaire de dépense.
 */
interface Props {
  initial?: Partial<ExpenseValues>;
  excludeId?: string; // En cas de modification : soustrait l'ancien montant pour calculer le différentiel
  onSubmit: (v: ExpenseValues) => void;
  onCancel: () => void;
  submitLabel: string;
}

/**
 * Formulaire modulaire de saisie d'une dépense directe.
 */
export function ExpenseForm({
  initial,
  excludeId,
  onSubmit,
  onCancel,
  submitLabel,
}: Props) {
  const { db, me } = useStore();
  const { t, isRTL, traduireCategorie } = useTranslation();

  // Filtrage des catégories de type 'expense' actives suivies par l'utilisateur
  const cats = db.categories.filter(
    (c) =>
      c.kind === 'expense' &&
      c.active &&
      (me?.categoryIds.includes(c.id) || c.id === initial?.categoryId)
  );

  // États locaux des champs du formulaire
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? cats[0]?.id ?? ''
  );
  const [amount, setAmount] = useState(
    initial?.amount !== undefined ? String(initial.amount) : ''
  );
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');

  // Simulation dynamique d'impact budgétaire
  const budget = me ? currentBudget(db, me.id) : null;
  const a = toNum(amount);
  let impact: {
    tone: 'info' | 'warning' | 'danger';
    title: string;
    detail: string;
  } | null = null;

  if (budget && me && categoryId && Number.isFinite(a) && a >= 0) {
    const alloc = budget.allocations[categoryId] ?? 0;
    const spent =
      (spentByCategory(db, me.id, budget.start, budget.end, excludeId)[
        categoryId
      ] ?? 0) + (date >= budget.start && date <= budget.end ? a : 0);
    const catObj = cats.find((c) => c.id === categoryId);
    const name = catObj ? traduireCategorie(catObj.name) : t('categorie');

    impact =
      spent > alloc && alloc > 0
        ? {
            tone: 'danger',
            title: t('depasserait_allocation', { cat: name }),
            detail: t('sur_alloue_apres_sauvegarde', {
              spent: money(spent),
              alloc: money(alloc),
            }),
          }
        : {
            tone: 'info',
            title: t('apres_enregistrement', { cat: name }),
            detail: t('sur_alloue_apres_sauvegarde', {
              spent: money(spent),
              alloc: money(alloc),
            }),
          };
  }

  /**
   * Action : valider et soumettre les données de la dépense.
   */
  const submit = () => {
    if (!categoryId) return setError(t('choisir_cat_depense'));
    if (!Number.isFinite(a) || a < 0) return setError(t('entrer_montant_valide'));
    if (!isValidISO(date)) return setError(t('format_date_invalide'));

    onSubmit({ categoryId, amount: a, note: note.trim(), date });
  };

  return (
    <>
      {/* Bannière d'erreur en cas de données non conformes */}
      {error ? (
        <AlertBanner
          tone="danger"
          title={t('verifier_cette_depense')}
          detail={error}
        />
      ) : null}

      {/* Sélecteur de catégorie de dépense */}
      <SelectField
        label={t('categorie_depense')}
        value={categoryId}
        options={cats.map((c) => ({
          value: c.id,
          label: traduireCategorie(c.name),
        }))}
        onChange={setCategoryId}
      />

      {/* Champ montant en DT */}
      <Input
        label={t('montant_dt_label')}
        value={amount}
        onChangeText={(textVal) => {
          setAmount(textVal);
          setError('');
        }}
        keyboardType="decimal-pad"
        placeholder="35.000"
      />

      {/* Champ date de la dépense */}
      <Input
        label={t('date_label')}
        value={date}
        onChangeText={(textVal) => {
          setDate(textVal);
          setError('');
        }}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      {/* Champ note facultative */}
      <Input
        label={t('note_optionnelle')}
        value={note}
        onChangeText={setNote}
        autoCapitalize="sentences"
        placeholder="Abonnement transport"
      />

      {/* Note d'information sur les catégories disponibles */}
      <Hint style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {cats.map((c) => traduireCategorie(c.name)).join(' · ') ||
          t('aucune_cat_depense_selectionnee')}
      </Hint>

      {/* Bannière de simulation d'impact sur l'enveloppe */}
      {impact ? (
        <AlertBanner
          tone={impact.tone}
          title={impact.title}
          detail={impact.detail}
        />
      ) : null}

      {/* Bouton de validation */}
      <Button
        label={submitLabel}
        onPress={submit}
        disabled={cats.length === 0}
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
