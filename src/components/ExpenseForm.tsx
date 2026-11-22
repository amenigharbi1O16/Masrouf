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

import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
// Sélecteur déroulant modal
import { SelectField } from './SelectField';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Hint, Input } from './ui';
// Sélecteurs de calcul financier SQLite (budget en cours, dépenses par catégorie)
import { currentBudget, spentByCategory } from '@/state/selectors';
import { isChildrenCategory, CANONICAL_ENFANT_ID } from '@/utils/categoryMatching';
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
 * MISSION DE LA FONCTION : ExpenseForm
 *   Formulaire interactif de saisie d'une dépense directe sans article au détail.
 * RÔLE DANS L'APPLICATION :
 *   Affiche le sélecteur de catégorie de dépense ("Dépenses & Services"), le montant en DT,
 *   la date et la note, et calcule en direct l'impact sur l'enveloppe budgétaire correspondante.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Le sélecteur de catégorie avec toutes les enveloppes choisies ou allouées (Alimentation, Transport,
 *   Factures, Loisirs, Épargne pour Ines Ben Ali), les champs de saisie et la simulation dynamique.
 */
export function ExpenseForm({
  initial,
  excludeId,
  onSubmit,
  onCancel,
  submitLabel,
}: Props) {
  // Récupération de l'état global de la base de données, de l'utilisateur connecté et de la période sélectionnée
  const { db, me, selectedBudget } = useStore();
  // Récupération des utilitaires de traduction et de disposition RTL
  const { t, isRTL, traduireCategorie } = useTranslation();

  // Récupération du budget de référence : utilise selectedBudget au lieu de dépendre du mois civil
  const budget = selectedBudget ?? (me ? currentBudget(db, me.id) : null);
  // Liste des identifiants de catégories ayant une enveloppe allouée dans le budget en cours
  const allocatedCatIds = budget ? Object.keys(budget.allocations) : [];
  // Liste des identifiants des catégories sélectionnées par l'utilisateur lors de son onboarding
  const userCatIds = me?.categoryIds ?? [];

  // Détection du compte de test officiel Ines Ben Ali pour garantir ses 5 enveloppes de démonstration
  const isInes = me?.email?.toLowerCase() === 'ines.benali@gmail.com';
  // Mots-clés de détection pour les 5 catégories garanties pour Ines
  const inesKeywords = ['aliment', 'food', 'transport', 'facture', 'bill', 'loisir', 'entertain', 'épargne', 'epargne', 'saving'];

  // Sélection et filtrage de toutes les catégories de dépenses disponibles
  const cats = db.categories.filter((c) => {
    // Si la catégorie est désactivée et n'est pas celle déjà sélectionnée, on ne l'affiche pas
    if (!c.active && c.id !== initial?.categoryId) return false;

    // 0. La catégorie Enfant doit TOUJOURS être présente dans les dépenses
    if (isChildrenCategory(c) || c.id === CANONICAL_ENFANT_ID) return true;

    // 1. Toutes les catégories de dépenses actives du système ou personnalisées
    if (c.kind === 'expense') return true;

    // 2. Inclusion si la catégorie fait partie du budget alloué actif
    if (allocatedCatIds.includes(c.id)) return true;

    // 3. Inclusion si la catégorie a été choisie par l'utilisateur dans son profil
    if (userCatIds.includes(c.id)) return true;

    // 4. Inclusion si c'est la catégorie initiale de la dépense en cours d'édition
    if (c.id === initial?.categoryId) return true;

    // 5. Pour Ines Ben Ali : garantie stricte d'affichage des 5 catégories allouées (Alimentation, Transport, Factures, Loisirs, Épargne)
    if (isInes) {
      // Normalisation du nom de la catégorie pour tester les mots-clés
      const nameLower = c.name.toLowerCase();
      // Vérification si le nom contient l'un des mots-clés prévus
      if (inesKeywords.some((kw) => nameLower.includes(kw))) return true;
    }

    // Exclusion des autres catégories
    return false;
  });

  // États locaux des champs du formulaire
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? cats[0]?.id ?? ''
  );
  const [amount, setAmount] = useState(
    initial?.amount !== undefined ? String(initial.amount) : ''
  );

  // Date par défaut rattachée à la période budgétaire de référence
  const defaultDate = useMemo(() => {
    if (initial?.date) return initial.date;
    const today = todayISO();
    if (budget) {
      if (today >= budget.start && today <= budget.end) {
        return today;
      }
      return budget.start;
    }
    return today;
  }, [initial?.date, budget]);

  const [date, setDate] = useState(defaultDate);
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState('');

  // Détection si la date choisie est en dehors de la période budgétaire sélectionnée
  const isOutsidePeriod = !!budget && !!date && (date < budget.start || date > budget.end);
  const targetCorrectionDate = budget
    ? (todayISO() >= budget.start && todayISO() <= budget.end ? todayISO() : budget.start)
    : todayISO();

  // Simulation dynamique d'impact budgétaire basée sur le montant saisi
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

    // Calcul précis du pourcentage de consommation prévisionnel (règle des millimes)
    const predPct = alloc > 0 ? (spent / alloc) * 100 : 0;
    const pctLabel = alloc > 0 ? ` (${predPct.toFixed(0)}%)` : '';

    // Détermination visuelle de l'impact budgétaire projeté : alerte rouge si dépassement, bleue informative sinon
    impact =
      spent > alloc && alloc > 0
        ? {
            // Bannière d'avertissement critique en rouge corail si l'enveloppe est dépassée
            tone: 'danger',
            title: t('depasserait_allocation', { cat: name }),
            detail: `${t('sur_alloue_apres_sauvegarde', {
              spent: money(spent),
              alloc: money(alloc),
            })}${pctLabel}`,
          }
        : {
            // Bannière informative bleue si la dépense s'inscrit dans les limites de l'enveloppe
            tone: 'info',
            title: t('apres_enregistrement', { cat: name }),
            detail: `${t('sur_alloue_apres_sauvegarde', {
              spent: money(spent),
              alloc: money(alloc),
            })}${pctLabel}`,
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

      {/* Sélecteur modal de catégorie de dépense avec libellé traduit (Alimentation, Factures, etc.) */}
      <SelectField
        label={t('categorie_depense')}
        value={categoryId}
        options={cats.map((c) => ({
          value: c.id,
          label: traduireCategorie(c.name),
        }))}
        onChange={setCategoryId}
      />

      {/* Champ de saisie du montant en Dinars Tunisiens (clavier numérique décimal) */}
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

      {/* Champ de saisie de la date de dépense (format ISO YYYY-MM-DD) */}
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

      {/* Alerte et action rapide si la date est hors de la période budgétaire sélectionnée */}
      {isOutsidePeriod && budget ? (
        <View style={{ gap: 6, marginVertical: 4 }}>
          <AlertBanner
            tone="warning"
            title={t('date_hors_periode')}
            detail={t('date_hors_periode_detail', {
              date,
              start: budget.start,
              end: budget.end,
            })}
          />
          <Button
            label={t('ajuster_date_periode', { date: targetCorrectionDate })}
            variant="secondary"
            onPress={() => setDate(targetCorrectionDate)}
          />
        </View>
      ) : null}

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
