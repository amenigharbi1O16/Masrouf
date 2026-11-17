/**
 * FICHIER : src/app/allocation-budget.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-002
 * ÉCRAN : ECRAN-FORM-03 (Répartition par Enveloppe Budgétaire)
 *
 * MISSION DU FICHIER :
 * Répartir le montant global du budget entre les différentes enveloppes de dépenses de l'utilisateur.
 * - Reçoit les dates de début/fin et le montant total en Dinars Tunisiens (DT) validés à l'étape précédente.
 * - Calcule automatiquement les montants recommandés pour chaque catégorie selon les pourcentages par défaut du système.
 * - Permet à l'utilisateur d'ajuster chaque enveloppe selon ses priorités réelles.
 * - Bloque la création si la somme des enveloppes dépasse le plafond global fixé.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il implémente numériquement la « méthode des enveloppes » : l'argent est fléché dès le départ.
 * L'utilisateur sait exactement combien de dinars il peut dépenser en alimentation, en transport
 * ou en loisirs pendant toute la durée de sa période.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre 'Répartir le budget' et flèche retour.
 * - Le surtitre 'DU XX AU YY · ZZ JOURS' rappelant la période calendaire.
 * - Trois lignes de contrôle financier bicolores (`InfoRow`) :
 *   1. 'Budget total' : montant global fixé (ex: 1 200.000 DT).
 *   2. 'Alloué' : somme actuelle de toutes les enveloppes (rouge si dépassement).
 *   3. 'Non alloué' : solde encore disponible pour d'autres catégories (vert) ou déficit (rouge).
 * - La liste des champs de saisie pour chaque catégorie avec indication du pourcentage suggéré.
 * - Une bannière rouge explicative en cas de dépassement, ou une bannière bleue s'il reste des fonds libres.
 * - Un grand bouton vert 'Créer mon budget' qui enregistre les données et ouvre directement le tableau de bord.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
// Ligne d'information bicolore synthétique
import { InfoRow } from '@/components/Cards';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul et formatage monétaire tunisien (3 décimales)
import { daysBetween, dt, fmtRange, getExactMonthBounds, money, toNum } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer la répartition fine du montant global en sous-enveloppes catégorielles.
 *
 * RÔLE DANS L'APPLICATION :
 * Calcule la pré-allocation selon les pourcentages par défaut, surveille les dépassements
 * et écrit le budget complet et ses enveloppes dans SQLite de façon atomique.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec les 3 lignes récapitulatives, les champs d'enveloppes et le bouton de validation.
 */
export default function AllocateBudgetScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Récupération des paramètres transmis depuis l'écran précédent `budget-mois.tsx`
  const {
    start = '',
    end = '',
    total = '0',
  } = useLocalSearchParams<{
    start: string;
    end: string;
    total: string;
  }>();
  // Extraction des données de catalogue, du profil et des actions de sauvegarde
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL, langue, traduireCategorie } = useTranslation();

  // Bornes mensuelles exactes : 1er du mois au dernier jour réel du mois
  const exactBounds = getExactMonthBounds(start);
  const normalizedStart = exactBounds.start;
  const normalizedEnd = exactBounds.end;

  // Conversion numérique du montant total saisi
  const totalN = toNum(total);

  // Filtrage des catégories actives suivies par l'utilisateur connecté
  const cats = db.categories.filter(
    (c) => (me?.categoryIds ?? []).includes(c.id) && c.active
  );

  // Initialisation intelligente : pré-remplissage des enveloppes selon les pourcentages par défaut configurés
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(
      cats.map((c) => [
        c.id,
        dt(
          Math.round(
            ((totalN * (db.defaultPercentages[c.id] ?? 0)) / 100) * 1000
          ) / 1000
        ),
      ])
    )
  );

  // Conversion numérique en temps réel de tous les montants saisis
  const nums = Object.fromEntries(
    cats.map((c) => [
      c.id,
      Number.isFinite(toNum(vals[c.id])) ? toNum(vals[c.id]) : 0,
    ])
  );
  // Somme totale allouée à l'ensemble des enveloppes
  const sum = Object.values(nums).reduce((a, b) => a + b, 0);

  // Détection d'un dépassement par rapport au budget global (tolérance de 0.0005 DT pour arrondis)
  const over = sum - totalN > 0.0005;

  /**
   * MISSION DE LA FONCTION :
   * Créer et enregistrer définitivement la période de budget et ses enveloppes dans la base SQLite locale.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.saveBudget` qui insère une ligne dans `budgets` et les lignes associées
   * dans `budget_categories` sous une transaction ACID sécurisée.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Valide les données, ferme les fenêtres modales et bascule l'utilisateur sur le tableau de bord d'accueil (`/(tabs)`).
   */
  const create = () => {
    // Sécurité : bloque la validation si dépassement ou total nul/invalide
    if (over || !Number.isFinite(totalN) || totalN <= 0) return;
    
    // Écriture atomique dans SQLite avec bornes exactes de mois
    actions.saveBudget({
      start: normalizedStart,
      end: normalizedEnd,
      total: totalN,
      allocations: Object.fromEntries(
        Object.entries(nums).filter(([, v]) => v > 0)
      ),
    });

    // Fermeture propre des écrans modaux et redirection directe vers l'accueil
    router.dismissAll?.();
    router.replace('/(tabs)');
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('repartir_le_budget')} back>
      {/* Surtitre affichant les dates exactes et le nombre de jours de la période */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {fmtRange(normalizedStart, normalizedEnd, langue)} · {daysBetween(normalizedStart, normalizedEnd)}{' '}
        {t('jours').toUpperCase()}
      </Eyebrow>

      {/* Ligne 1 : Montant total du budget fixé */}
      <InfoRow label={t('budget_total')} value={money(totalN)} />

      {/* Ligne 2 : Montant actuellement réparti dans les enveloppes (passe au rouge si dépassement) */}
      <InfoRow
        label={t('alloue_label')}
        value={money(sum)}
        tone={over ? 'danger' : undefined}
      />

      {/* Ligne 3 : Montant encore disponible ou déficit en rouge */}
      <InfoRow
        label={t('non_alloue_label')}
        value={
          over ? `−${money(sum - totalN)}` : money(totalN - sum)
        }
        tone={over ? 'danger' : 'good'}
      />

      {/* Boucle de génération d'un champ de saisie pour chaque catégorie active */}
      {cats.map((c) => (
        <Input
          key={c.id}
          label={`${traduireCategorie(c.name)} · DT`}
          value={vals[c.id]}
          keyboardType="decimal-pad"
          onChangeText={(text) =>
            setVals((prev) => ({ ...prev, [c.id]: text }))
          }
          hint={t('pourcentage_defaut_info', {
            pct: db.defaultPercentages[c.id] ?? 0,
          })}
        />
      ))}

      {/* Bannière de statut dynamique : rouge si dépassement, bleue si argent encore non alloué */}
      {over ? (
        <AlertBanner
          tone="danger"
          title={t('allocation_superieure_total')}
          detail={t('reduire_categories_detail', {
            amount: money(sum - totalN),
          })}
        />
      ) : (
        <AlertBanner
          tone="info"
          title={t('argent_non_alloue_titre')}
          detail={t('argent_non_alloue_detail')}
        />
      )}

      {/* Bouton vert forêt : actif uniquement si la somme ne dépasse pas le budget total */}
      <Button
        label={t('creer_mon_budget')}
        onPress={create}
        disabled={over || cats.length === 0}
      />

      {/* Avertissement si aucune catégorie n'est suivie par l'utilisateur */}
      {cats.length === 0 ? (
        <AlertBanner
          tone="warning"
          title={t('aucune_categorie_selectionnee')}
          detail={t('selectionner_categories_dabord')}
        />
      ) : null}
    </Screen>
  );
}
