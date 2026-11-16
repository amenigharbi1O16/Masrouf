/**
 * FICHIER : src/app/budget-mois.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-016
 * ÉCRAN : ECRAN-FORM-03 (Création et Modification de Période de Budget)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur de définir ou modifier sa période budgétaire personnalisée :
 * - Mode Création (`/budget-mois`) : saisie des dates de début/fin libres (ex: du 25 au 24)
 *   et du montant total en Dinars Tunisiens (DT), puis transition vers l'écran d'enveloppes (`/allocation-budget`).
 * - Mode Modification (`/budget-mois?mode=edit&id=...`) : ajustement direct des plafonds
 *   de chaque catégorie déjà allouée et rééquilibrage immédiat du budget.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il concrétise le principe fondamental de Masrouf : ne pas imposer le mois civil rigide.
 * L'utilisateur adapte son cycle financier sur sa vraie date de paie tunisienne (ex: le 22, le 25 ou le 30).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit ('Créer un budget' ou 'Modifier le budget') et flèche de retour.
 * - Le surtitre 'PÉRIODE QUI VOUS CONVIENT' avec le nombre de jours calculé dynamiquement.
 * - Deux champs de date au format standard AAAA-MM-JJ ('Date de début', 'Date de fin').
 * - Un champ de montant 'Budget total (DT)' avec pavé numérique décimal adapté aux 3 décimales (ex: 1200.000).
 * - En mode modification : la liste de toutes les enveloppes actuelles avec champ de saisie pour chacune.
 * - Une bannière d'information calculant la somme allouée et le solde restant non alloué.
 * - Un bouton vert 'Répartir par catégorie' (en création) ou 'Enregistrer les modifications' (en édition).
 * - Un bouton secondaire clair 'Annuler'.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
// Conteneur d'écran avec flèche de retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
// Sélecteurs de calcul financier SQLite (total alloué, budget en cours)
import { allocated, currentBudget } from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul de dates et de montants en DT
import {
  addDays,
  daysBetween,
  fmtRange,
  isValidISO,
  money,
  todayISO,
  toNum,
} from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer le formulaire de saisie des dates et du montant global d'une période budgétaire.
 *
 * RÔLE DANS L'APPLICATION :
 * Valide la cohérence temporelle (date_fin >= date_debut) et financière (montant > 0),
 * et oriente l'utilisateur vers l'allocation catégorielle ou met à jour SQLite en mode édition.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'écran interactif de définition de budget avec calcul instantané du nombre de jours de la période.
 */
export default function BudgetPeriodScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction des paramètres d'URL (mode='edit' et id du budget)
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();
  // Extraction des données SQLite, du profil connecté et des actions
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Booléen indiquant si l'utilisateur modifie un budget existant
  const editing = mode === 'edit';

  // Recherche mémorisée du budget existant dans la base SQLite en cas de mode édition
  const existing = useMemo(() => {
    if (!editing || !me) return null;
    return (
      db.budgets.find((b) => b.id === id && b.userId === me.id) ??
      currentBudget(db, me.id)
    );
  }, [editing, id, db, me]);

  // État local de la date de début (initialisée à aujourd'hui ou à la date du budget existant)
  const [start, setStart] = useState(existing?.start ?? todayISO());
  // État local de la date de fin (initialisée à J+29 par défaut)
  const [end, setEnd] = useState(existing?.end ?? addDays(todayISO(), 29));
  // État local du montant total en Dinars Tunisiens (chaîne de caractères pour saisie fluide)
  const [total, setTotal] = useState(existing ? String(existing.total) : '');

  // Détection stricte d'un budget préexistant pour ces mêmes dates (Règle : un seul budget par période)
  const duplicateBudget = useMemo(() => {
    if (editing || !me) return null;
    return db.budgets.find((b) => b.userId === me.id && b.start === start && b.end === end) ?? null;
  }, [editing, me, db.budgets, start, end]);
  // État local des montants alloués par catégorie en mode édition
  const [alloc, setAlloc] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(existing?.allocations ?? {}).map(([k, v]) => [k, String(v)])
    )
  );
  // État local du message d'erreur de validation
  const [error, setError] = useState('');

  // Sécurité : si la session est expirée
  if (!me) return null;

  // Sécurité : si on a demandé d'éditer un budget introuvable
  if (editing && !existing) {
    return (
      <Screen title={t('modifier_budget')} back>
        <AlertBanner
          tone="info"
          title={t('aucun_budget_a_modifier')}
          detail={t('creer_periode_dabord')}
        />
        <Button
          label={t('creer_budget')}
          onPress={() => router.replace('/budget-mois')}
        />
      </Screen>
    );
  }

  // Conversions numériques pour les calculs de comparaison
  const totalN = toNum(total);
  const allocN = Object.fromEntries(
    Object.entries(alloc).map(([k, v]) => [
      k,
      Number.isFinite(toNum(v)) ? toNum(v) : 0,
    ])
  );
  // Somme totale consommée par toutes les enveloppes
  const allocSum = allocated({ allocations: allocN });

  /**
   * MISSION DE LA FONCTION :
   * Valider la cohérence des dates et des montants saisis avant d'autoriser la suite.
   *
   * RÔLE DANS L'APPLICATION :
   * Empêche l'enregistrement de données corrompues (ex: fin antérieure au début, montant négatif ou nul).
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Retourne une chaîne vide si tout est correct, ou un message d'erreur précis affiché dans la bannière rouge.
   */
  const validate = (): string => {
    if (!isValidISO(start) || !isValidISO(end)) {
      return t('erreur_format_dates');
    }
    if (end < start) {
      return t('erreur_date_fin_anterieure');
    }
    if (!Number.isFinite(totalN) || totalN <= 0) {
      return t('erreur_total_positif');
    }
    // Règle stricte d'unicité : interdiction absolue de créer un second budget pour la même période
    if (!editing && duplicateBudget) {
      return `Un budget existe déjà pour cette période (${fmtRange(start, end)}). Chaque période ne peut comporter qu'un seul budget.`;
    }
    if (editing && allocSum > totalN) {
      return `${t('erreur_depassement_allocations')}${money(allocSum - totalN)}.`;
    }
    return '';
  };

  /**
   * MISSION DE LA FONCTION :
   * Valider l'étape 1 et naviguer vers l'écran de répartition par catégorie (`allocation-budget.tsx`).
   *
   * RÔLE DANS L'APPLICATION :
   * Transmet les dates et le montant total validés en paramètres d'URL pour calculer les enveloppes.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Si erreur : affiche la bannière rouge. Si valide : fait glisser l'écran d'allocation budgétaire.
   */
  const next = () => {
    const e = validate();
    if (e) {
      setError(e);
      return;
    }
    router.push({
      pathname: '/allocation-budget',
      params: { start, end, total: String(totalN) },
    } as never);
  };

  /**
   * MISSION DE LA FONCTION :
   * Sauvegarder les modifications du budget directement dans SQLite (en mode édition).
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.saveBudget` qui met à jour les lignes correspondantes dans les tables `budgets` et `budget_categories`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Valide les changements et revient immédiatement à l'écran précédent avec les jauges réactualisées.
   */
  const save = () => {
    const e = validate();
    if (e || !existing) {
      setError(e);
      return;
    }
    actions.saveBudget({
      id: existing.id,
      start,
      end,
      total: totalN,
      allocations: Object.fromEntries(
        Object.entries(allocN).filter(([, v]) => v > 0)
      ),
    });
    router.back();
  };

  // Indicateur booléen vérifiant si la plage de dates est temporellement valide
  const validRange = isValidISO(start) && isValidISO(end) && end >= start;

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={editing ? t('modifier_budget') : t('creer_budget')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {editing && existing
          ? `${t('periode_actuelle').toUpperCase()}  ·  ${fmtRange(
              existing.start,
              existing.end
            )}`
          : t('periode_qui_vous_convient')}
      </Eyebrow>

      {/* Titre descriptif invitant à orienter ses dépenses */}
      {!editing && (
        <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {t('donner_direction_dinar')}
        </SectionTitle>
      )}

      {/* Bannière rouge d'erreur affichée en cas de date invalide ou de montant non positif */}
      {error ? (
        <AlertBanner
          tone="danger"
          title={t('verifier_ce_budget')}
          detail={error}
        />
      ) : null}

      {/* Champ de saisie de la date de début au format standard AAAA-MM-JJ */}
      <Input
        label={t('date_debut_label')}
        value={start}
        onChangeText={(text) => {
          setStart(text);
          setError('');
        }}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      {/* Champ de saisie de la date de fin au format standard AAAA-MM-JJ */}
      <Input
        label={t('date_fin_label')}
        value={end}
        onChangeText={(text) => {
          setEnd(text);
          setError('');
        }}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      {/* Champ de saisie du montant global en Dinars Tunisiens */}
      <Input
        label={t('budget_total_dt_label')}
        value={total}
        onChangeText={(text) => {
          setTotal(text);
          setError('');
        }}
        keyboardType="decimal-pad"
        placeholder="1200.000"
      />

      {/* Affichage conditionnel selon le mode d'édition ou de création */}
      {editing ? (
        <>
          {/* Titre de la section de réallocation */}
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('repartition_par_categorie')}
          </SectionTitle>

          {/* Liste des champs d'enveloppe pour chaque catégorie active */}
          {Object.keys(alloc).map((cid) => (
            <Input
              key={cid}
              label={db.categories.find((c) => c.id === cid)?.name ?? cid}
              value={alloc[cid]}
              onChangeText={(text) =>
                setAlloc((prev) => ({ ...prev, [cid]: text }))
              }
              keyboardType="decimal-pad"
            />
          ))}

          {/* Bannière de récapitulatif financier (somme allouée et solde non alloué restant) */}
          <AlertBanner
            tone={allocSum > (totalN || 0) ? 'danger' : 'info'}
            title={`${t('alloue_label')} ${money(allocSum)}  ·  ${t('non_alloue_label')} ${money(
              Math.max(0, (totalN || 0) - allocSum)
            )}`}
            detail={t('fonds_non_alloues_info')}
          />

          {/* Bouton vert forêt : enregistre les modifications dans SQLite */}
          <Button
            label={t('enregistrer_modifications')}
            onPress={save}
            disabled={!validRange}
          />
          {/* Bouton secondaire clair d'annulation */}
          <Button
            label={t('annuler')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </>
      ) : duplicateBudget ? (
        <>
          {/* Alerte stricte informant que la période existe déjà et empêchant le doublon */}
          <AlertBanner
            tone="warning"
            title="Période déjà existante"
            detail={`Un budget de ${money(duplicateBudget.total)} existe déjà pour cette période exacte (${fmtRange(start, end)}). Conformément à la règle de gestion Masrouf, chaque période ne peut comporter qu'un seul budget. Vous pouvez modifier ce budget existant.`}
          />

          {/* Bouton pour rediriger directement vers la modification du budget existant */}
          <Button
            label="Modifier le budget existant"
            onPress={() =>
              router.replace({
                pathname: '/budget-mois',
                params: { mode: 'edit', id: duplicateBudget.id },
              } as never)
            }
          />
          {/* Bouton secondaire clair d'annulation */}
          <Button
            label={t('annuler')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </>
      ) : (
        <>
          {/* Bannière d'aide en création : affiche le nombre de jours calculé (ex: 30 jours sélectionnés) */}
          <AlertBanner
            tone="info"
            title={
              validRange
                ? `${daysBetween(start, end)} ${t('jours_selectionnes')}`
                : t('choisir_dates_debut_fin')
            }
            detail={t('explication_cycle_paie')}
          />

          {/* Bouton vert forêt : transition vers la répartition des enveloppes */}
          <Button
            label={t('repartir_par_categorie_btn')}
            onPress={next}
          />
          {/* Bouton secondaire clair d'annulation */}
          <Button
            label={t('annuler')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </>
      )}
    </Screen>
  );
}
