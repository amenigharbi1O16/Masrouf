/**
 * FICHIER : src/app/(tabs)/analyses.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-013
 * ÉCRAN : ECRAN-TAB-04 (Tableau de Bord Financier & Analyses Ciblées)
 *
 * RÔLE DU COMPOSANT :
 * Tableau de bord financier moderne, épuré et professionnel de Masrouf, structuré
 * rigoureusement selon les 7 sections ordonnées de la spécification :
 * 1. Carte de synthèse budgétaire vert forêt (total, consommé, restant, % ; rouge si dépassé).
 * 2. Conclusion financière automatique et recommandation personnalisée basée sur l'état réel.
 * 3. Comparaison temporelle visuelle avec la période précédente de même durée.
 * 4. Graphique de consommation du budget avec jauge et seuil maximal.
 * 5. Graphique de consommation par catégorie classé du PLUS FAIBLE au PLUS FORT pourcentage.
 * 6. Analyse du rythme de dépenses quotidien avec projection et durabilité.
 * 7. Catégorie nécessitant le plus d'attention (ou message positif si tout est maîtrisé).
 *
 * Toutes les données proviennent exclusivement des tables SQLite locales réelles (zéro mock, zéro hardcodage).
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '@/components/Screen';
import { EmptyState, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import {
  categoryName,
  inRange,
  previousWindow,
  userTxns,
} from '@/state/selectors';
import { useStore } from '@/state/store';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { daysBetween, fmtRange, formatDT, money, todayISO } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { db, me, selectedBudget } = useStore();
  const { t, isRTL, langue, traduireCategorie } = useTranslation();

  if (!me) return null;

  // Période de référence centrale active
  const budget = selectedBudget;
  const win = budget ? previousWindow(budget) : null;

  // Transactions réelles filtrées sur la période active et la période précédente
  const allTxns = useMemo(() => userTxns(db, me.id), [db, me.id]);

  const curTxns = useMemo(() => {
    if (!budget) return [];
    return allTxns.filter((tx) => inRange(tx.date, budget.start, budget.end));
  }, [allTxns, budget]);

  const prevTxns = useMemo(() => {
    if (!win) return [];
    return allTxns.filter((tx) => inRange(tx.date, win.start, win.end));
  }, [allTxns, win]);

  // Calculs monétaires précis en millimes entiers (zéro dérive d'arrondi)
  const curTotal = useMemo(
    () => curTxns.reduce((sum, tx) => sum + Math.round(tx.amount * 1000), 0) / 1000,
    [curTxns]
  );
  const prevTotal = useMemo(
    () => prevTxns.reduce((sum, tx) => sum + Math.round(tx.amount * 1000), 0) / 1000,
    [prevTxns]
  );

  const totalBudget = budget?.total ?? 0;
  const isExceeded = curTotal > totalBudget && totalBudget > 0;
  const remainingBudget = Math.max(0, totalBudget - curTotal);
  const exceededAmount = Math.max(0, curTotal - totalBudget);
  const consumptionPct = totalBudget > 0 ? (curTotal / totalBudget) * 100 : 0;

  // Comparaison temporelle avec la période précédente équivalente
  const diff = curTotal - prevTotal;
  const pctDiff = prevTotal > 0 ? (diff / prevTotal) * 100 : null;
  const isSaving = diff < 0;
  const isStable = Math.abs(diff) < 0.001;

  // Calcul du rythme journalier (Pace)
  const today = todayISO();
  const totalDays = budget ? Math.max(1, daysBetween(budget.start, budget.end) + 1) : 1;

  const { daysElapsed, daysRemaining } = useMemo(() => {
    if (!budget) return { daysElapsed: 0, daysRemaining: 0 };
    if (today < budget.start) {
      return { daysElapsed: 0, daysRemaining: totalDays };
    }
    if (today > budget.end) {
      return { daysElapsed: totalDays, daysRemaining: 0 };
    }
    const elapsed = Math.max(1, daysBetween(budget.start, today) + 1);
    const rem = Math.max(0, daysBetween(today, budget.end));
    return { daysElapsed: elapsed, daysRemaining: rem };
  }, [budget, today, totalDays]);

  const avgDailySpend = daysElapsed > 0 ? curTotal / daysElapsed : 0;
  const projectedTotal = curTotal + avgDailySpend * daysRemaining;
  const isPaceSustainable = totalBudget > 0 ? projectedTotal <= totalBudget : true;
  const projectedDifference = Math.abs(projectedTotal - totalBudget);

  // Ventilation et calculs par catégorie
  const catStats = useMemo(() => {
    if (!budget) return [];

    const map = new Map<
      string,
      {
        id: string;
        name: string;
        spent: number;
        allocated: number;
        hasBudget: boolean;
        consumptionPct: number;
        shareOfTotal: number;
      }
    >();

    // Initialisation avec toutes les catégories actives ou présentes
    for (const c of db.categories) {
      const allocated = budget.allocations[c.id] ?? 0;
      map.set(c.id, {
        id: c.id,
        name: c.name,
        spent: 0,
        allocated,
        hasBudget: allocated > 0,
        consumptionPct: 0,
        shareOfTotal: 0,
      });
    }

    // Cumul des dépenses réelles
    for (const tx of curTxns) {
      const entry = map.get(tx.categoryId);
      if (entry) {
        entry.spent += Math.round(tx.amount * 1000);
      }
    }

    const list = Array.from(map.values())
      .filter((item) => item.spent > 0 || item.allocated > 0)
      .map((item) => {
        const spentDT = item.spent / 1000;
        const consumptionPct =
          item.allocated > 0 ? (spentDT / item.allocated) * 100 : 0;
        const shareOfTotal = curTotal > 0 ? (spentDT / curTotal) * 100 : 0;
        return {
          ...item,
          spent: spentDT,
          consumptionPct,
          shareOfTotal,
        };
      });

    // Tri strict du PLUS FAIBLE au PLUS FORT pourcentage de consommation (Section 5)
    return list.sort((a, b) => {
      // Si les deux ont un budget alloué, trier par consumptionPct croissant
      if (a.hasBudget && b.hasBudget) {
        return a.consumptionPct - b.consumptionPct;
      }
      // Les catégories sans budget sont classées par shareOfTotal croissant
      if (!a.hasBudget && !b.hasBudget) {
        return a.shareOfTotal - b.shareOfTotal;
      }
      // Catégories avec budget affichées en premier
      return a.hasBudget ? -1 : 1;
    });
  }, [db.categories, budget, curTxns, curTotal]);

  // Section 7 : Détection automatique de la catégorie requérant le plus d'attention
  const attentionCategory = useMemo(() => {
    if (catStats.length === 0 || curTotal <= 0) return null;

    // 1. Chercher d'abord parmi les catégories avec budget qui sont dépassées (> 100%)
    const exceeded = catStats.filter((c) => c.hasBudget && c.consumptionPct > 100);
    if (exceeded.length > 0) {
      // Trier par taux de dépassement le plus critique
      return [...exceeded].sort((a, b) => b.consumptionPct - a.consumptionPct)[0];
    }

    // 2. Chercher les catégories avec budget proches de la limite (>= 80%)
    const approaching = catStats.filter((c) => c.hasBudget && c.consumptionPct >= 80);
    if (approaching.length > 0) {
      return [...approaching].sort((a, b) => b.consumptionPct - a.consumptionPct)[0];
    }

    // 3. Chercher si une catégorie sans budget pèse de manière disproportionnée (>= 35% du total)
    const heavyUnallocated = catStats.filter((c) => !c.hasBudget && c.shareOfTotal >= 35);
    if (heavyUnallocated.length > 0) {
      return [...heavyUnallocated].sort((a, b) => b.shareOfTotal - a.shareOfTotal)[0];
    }

    // Si toutes les catégories sont saines (< 70% ou dépenses modérées)
    return null;
  }, [catStats, curTotal]);

  // Section 2 : Génération dynamique de la conclusion et recommandation personnalisée
  const { conclusionText, recommendationText } = useMemo(() => {
    if (!budget) return { conclusionText: '', recommendationText: '' };

    let conclusion = '';
    let recommendation = '';

    if (curTotal <= 0) {
      conclusion = 'Aucune transaction enregistrée pour cette période. Vos finances sont intactes.';
      recommendation = 'Commencez à consigner vos achats du quotidien pour activer vos analyses en temps réel.';
    } else if (isExceeded) {
      conclusion = `Budget dépassé : vos dépenses atteignent ${formatDT(curTotal)}, soit un dépassement de ${formatDT(exceededAmount)} (${consumptionPct.toFixed(1)}% du budget initial).`;
      recommendation = attentionCategory
        ? `Gelez temporairement les dépenses non indispensables sur « ${traduireCategorie(attentionCategory.name)} » qui a consommé ${attentionCategory.hasBudget ? attentionCategory.consumptionPct.toFixed(0) + '%' : attentionCategory.shareOfTotal.toFixed(0) + '%'} des fonds.`
        : 'Arrêtez tout achat superflu jusqu’au renouvellement de votre prochain cycle budgétaire.';
    } else if (consumptionPct >= 85) {
      conclusion = `Alerte de fin de budget : ${consumptionPct.toFixed(1)}% de votre enveloppe est déjà consommé alors qu'il reste ${daysRemaining} jour(s). Réserve disponible : ${formatDT(remainingBudget)}.`;
      recommendation = daysRemaining > 0
        ? `Limitez vos dépenses quotidiennes à ${formatDT(remainingBudget / daysRemaining)}/jour pour ne pas franchir votre plafond.`
        : 'Vos dépenses sont stabilisées juste sous la limite.';
    } else if (consumptionPct >= 65) {
      conclusion = `Consommation intermédiaire : ${consumptionPct.toFixed(1)}% dépensé. Il vous reste ${formatDT(remainingBudget)} pour couvrir les ${daysRemaining} jour(s) à venir.`;
      recommendation = isPaceSustainable
        ? `Votre rythme actuel de ${formatDT(avgDailySpend)}/jour est équilibré. Maintenez cette vigilance.`
        : `Au rythme actuel, une légère réduction de ${formatDT(projectedDifference)} d'ici la fin du mois vous évitera tout dépassement.`;
    } else {
      conclusion = `Excellente maîtrise financière : seulement ${consumptionPct.toFixed(1)}% consommé (${formatDT(curTotal)} dépensé sur ${formatDT(totalBudget)}). Réserve restante : ${formatDT(remainingBudget)}.`;
      recommendation = prevTotal > 0 && isSaving
        ? `Bravo : vous dépensez moins que la période passée (${formatDT(curTotal)} contre ${formatDT(prevTotal)}). Poursuivez cette discipline d'épargne !`
        : `Continuez à ce rythme régulier de ${formatDT(avgDailySpend)}/jour pour terminer votre période avec un excédent d'épargne.`;
    }

    return { conclusionText: conclusion, recommendationText: recommendation };
  }, [
    budget,
    curTotal,
    isExceeded,
    exceededAmount,
    consumptionPct,
    daysRemaining,
    remainingBudget,
    attentionCategory,
    isPaceSustainable,
    avgDailySpend,
    projectedDifference,
    totalBudget,
    prevTotal,
    isSaving,
    traduireCategorie,
  ]);

  // Si aucun budget n'est sélectionné ou actif
  if (!budget) {
    return (
      <Screen title={t('analyses')}>
        <EmptyState
          icon="stats-chart-outline"
          title={t('aucun_budget_actif')}
          detail={t('onboarding_budget_desc')}
          actionLabel={t('creer_budget')}
          onAction={() => router.push('/budget-mois')}
        />
      </Screen>
    );
  }

  const rangeLabel = fmtRange(budget.start, budget.end, langue);

  return (
    <Screen title={t('analyses')}>
      {/* Sélecteur de période de référence cliquable */}
      <Pressable
        onPress={() => router.push('/(tabs)/calendrier')}
        style={({ pressed }) => [
          styles.periodSelector,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('selectionner_periode')}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.green} />
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.periodLabel, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {rangeLabel}
          </Text>
          <Text
            style={[styles.periodHint, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {t('selectionner_periode')}
          </Text>
        </View>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={colors.muted}
        />
      </Pressable>

      {/* ============================================================ */}
      {/* 1. CARTE DE SYNTHÈSE BUDGÉTAIRE VERT FORÊT */}
      {/* ============================================================ */}
      <View style={styles.summaryCard}>
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={styles.summaryEyebrow}>
            {t('synthese_budget').toUpperCase()}
          </Text>
          <View
            style={[
              styles.summaryBadge,
              isExceeded && { backgroundColor: 'rgba(220, 38, 38, 0.25)' },
            ]}
          >
            <Text
              style={[
                styles.summaryBadgeText,
                isExceeded && { color: '#FF8A80', fontWeight: '700' },
              ]}
            >
              {isExceeded ? t('depassement_budget') : `${consumptionPct.toFixed(1)}%`}
            </Text>
          </View>
        </View>

        {/* Montant principal consommé */}
        <Text
          style={[
            styles.summaryAmount,
            { textAlign: isRTL ? 'right' : 'left' },
            isExceeded && { color: '#FF8A80' },
          ]}
        >
          {formatDT(curTotal)}
        </Text>
        <Text style={[styles.summarySub, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('montant_consomme')} · {rangeLabel}
        </Text>

        {/* Grille des 3 métriques clés : Total, Restant / Dépassé, % */}
        <View
          style={[
            styles.summaryGrid,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Métrique 1 : Budget total */}
          <View style={styles.summaryGridItem}>
            <Text style={styles.gridLabel}>{t('budget_total')}</Text>
            <Text style={styles.gridValue}>{formatDT(totalBudget)}</Text>
          </View>

          {/* Métrique 2 : Restant ou Dépassé en ROUGE */}
          <View style={styles.summaryGridItem}>
            <Text style={styles.gridLabel}>
              {isExceeded ? t('depassement_budget') : t('budget_restant')}
            </Text>
            <Text
              style={[
                styles.gridValue,
                isExceeded && { color: '#FF8A80', fontWeight: '700' },
              ]}
            >
              {isExceeded ? `+${formatDT(exceededAmount)}` : formatDT(remainingBudget)}
            </Text>
          </View>

          {/* Métrique 3 : Pourcentage global */}
          <View style={styles.summaryGridItem}>
            <Text style={styles.gridLabel}>{t('pourcentage_consomme')}</Text>
            <Text
              style={[
                styles.gridValue,
                isExceeded && { color: '#FF8A80', fontWeight: '700' },
              ]}
            >
              {consumptionPct.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. CONCLUSION FINANCIÈRE ET RECOMMANDATION PERSONNALISÉE */}
      {/* ============================================================ */}
      <View style={styles.insightCard}>
        {/* En-tête : Conclusion financière */}
        <View
          style={[
            styles.insightHeader,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Ionicons name="sparkles" size={18} color={colors.forest} />
          <Text style={styles.insightHeaderTitle}>
            {t('conclusion_financiere')}
          </Text>
        </View>
        <Text
          style={[styles.insightBodyText, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {conclusionText}
        </Text>

        {/* Séparateur fin */}
        <View style={styles.insightDivider} />

        {/* Sous-section : Recommandation personnalisée */}
        <View
          style={[
            styles.insightHeader,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Ionicons name="bulb-outline" size={18} color={colors.green} />
          <Text style={[styles.insightHeaderTitle, { color: colors.green }]}>
            {t('recommandation_personnalisee')}
          </Text>
        </View>
        <Text
          style={[styles.insightBodyText, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {recommendationText}
        </Text>
      </View>

      {/* ============================================================ */}
      {/* 3. COMPARAISON VISUELLE AVEC LA PÉRIODE PRÉCÉDENTE */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('comparaison_temporelle')}
      </SectionTitle>

      <View style={styles.comparisonCard}>
        {win ? (
          <>
            <View
              style={[
                styles.comparisonRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {/* Colonne Période active */}
              <View style={{ flex: 1 }}>
                <Text style={styles.comparisonPeriodTitle}>
                  {t('periode_actuelle')}
                </Text>
                <Text style={styles.comparisonDates}>
                  {budget.start} au {budget.end}
                </Text>
                <Text style={styles.comparisonAmount}>{formatDT(curTotal)}</Text>
              </View>

              {/* Point de séparation vertical */}
              <View style={styles.verticalDivider} />

              {/* Colonne Période précédente symétrique */}
              <View style={{ flex: 1 }}>
                <Text style={styles.comparisonPeriodTitle}>
                  {t('periode_precedente')}
                </Text>
                <Text style={styles.comparisonDates}>
                  {win.start} au {win.end}
                </Text>
                <Text style={styles.comparisonAmount}>{formatDT(prevTotal)}</Text>
              </View>
            </View>

            {/* Badge indicateur de tendance */}
            {prevTotal === 0 ? (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor: '#EBF4F0',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="information-circle-outline" size={16} color={colors.green} />
                <Text style={[styles.trendBadgeText, { color: colors.forest }]}>
                  {t('pas_de_depense_periode_prec')}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor: isSaving
                      ? '#E8F5E9'
                      : isStable
                      ? '#F5F5F5'
                      : '#FFEBEE',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons
                  name={
                    isSaving
                      ? 'trending-down'
                      : isStable
                      ? 'remove-outline'
                      : 'trending-up'
                  }
                  size={18}
                  color={isSaving ? colors.green : isStable ? colors.muted : colors.coral}
                />
                <Text
                  style={[
                    styles.trendBadgeText,
                    {
                      color: isSaving
                        ? colors.green
                        : isStable
                        ? colors.muted
                        : colors.coral,
                    },
                  ]}
                >
                  {isSaving
                    ? `Baisse des dépenses (Économie) : −${Math.abs(pctDiff ?? 0).toFixed(1)}% (${formatDT(Math.abs(diff))})`
                    : isStable
                    ? `Stabilité des dépenses (0.000 DT)`
                    : `Hausse des dépenses : +${Math.abs(pctDiff ?? 0).toFixed(1)}% (${formatDT(Math.abs(diff))})`}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {t('donnees_insuffisantes')}
          </Text>
        )}
      </View>

      {/* ============================================================ */}
      {/* 4. GRAPHIQUE DE CONSOMMATION DU BUDGET */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('graphique_consommation_budget')}
      </SectionTitle>

      <View style={styles.cardContainer}>
        {/* En-tête des chiffres de la jauge */}
        <View
          style={[
            styles.gaugeHeader,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View>
            <Text style={styles.gaugeSpentLabel}>{t('montant_consomme')}</Text>
            <Text
              style={[
                styles.gaugeSpentAmount,
                isExceeded && { color: colors.coral },
              ]}
            >
              {formatDT(curTotal)} ({consumptionPct.toFixed(1)}%)
            </Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            <Text style={styles.gaugeCeilLabel}>{t('seuil_budget_total')}</Text>
            <Text style={styles.gaugeCeilAmount}>{formatDT(totalBudget)}</Text>
          </View>
        </View>

        {/* Barre de progression avec marqueur de seuil 100% */}
        <View style={styles.gaugeTrack}>
          <View
            style={[
              styles.gaugeFill,
              {
                width: `${Math.min(100, consumptionPct)}%`,
                backgroundColor: isExceeded
                  ? colors.coral
                  : consumptionPct >= 80
                  ? colors.gold
                  : colors.green,
                alignSelf: isRTL ? 'flex-end' : 'flex-start',
              },
            ]}
          />
        </View>

        {/* Sous-titre informatif du solde restant */}
        <View
          style={[
            styles.gaugeFooter,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Text style={styles.gaugeFooterText}>
            {isExceeded
              ? `Dépassement de ${formatDT(exceededAmount)} au-delà du seuil fixé`
              : `${formatDT(remainingBudget)} encore disponibles`}
          </Text>
          <Text style={styles.gaugeFooterDays}>
            {daysRemaining} {t('jours_restants').toLowerCase()}
          </Text>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 5. CONSOMMATION PAR CATÉGORIE (DU PLUS FAIBLE AU PLUS FORT) */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('consommation_par_categorie')}
      </SectionTitle>

      {catStats.length === 0 ? (
        <View style={styles.cardContainer}>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
            {t('aucune_depense')}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {catStats.map((catItem) => {
            const rawName = catItem.name;
            const transName = traduireCategorie(rawName);
            const icon = getCategoryIcon(rawName);

            // Couleur dynamique : vert (< 70%), jaune (70-99%), rouge (>= 100%)
            const itemColor =
              catItem.hasBudget
                ? catItem.consumptionPct >= 100
                  ? colors.coral
                  : catItem.consumptionPct >= 70
                  ? colors.gold
                  : colors.green
                : catItem.shareOfTotal >= 35
                ? colors.gold
                : colors.green;

            const progressRatio = catItem.hasBudget
              ? Math.min(100, catItem.consumptionPct)
              : Math.min(100, catItem.shareOfTotal);

            return (
              <View key={catItem.id} style={styles.categoryCard}>
                {/* Ligne d'en-tête de la catégorie */}
                <View
                  style={[
                    styles.categoryHeaderRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryNameBox,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <Ionicons name={icon} size={18} color={itemColor} />
                    <Text style={styles.categoryNameText}>{transName}</Text>
                  </View>
                  <Text style={styles.categorySpentText}>
                    {formatDT(catItem.spent)}
                  </Text>
                </View>

                {/* Barre de progression visuelle */}
                <View style={styles.catProgressTrack}>
                  <View
                    style={[
                      styles.catProgressFill,
                      {
                        width: `${progressRatio}%`,
                        backgroundColor: itemColor,
                        alignSelf: isRTL ? 'flex-end' : 'flex-start',
                      },
                    ]}
                  />
                </View>

                {/* Ligne informative : Enveloppe allouée vs Part du total */}
                <View
                  style={[
                    styles.categoryMetaRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  {catItem.hasBudget ? (
                    <>
                      <Text style={[styles.categoryMetaText, { color: itemColor, fontWeight: '700' }]}>
                        {catItem.consumptionPct.toFixed(1)}% {t('pourcentage_consomme_enveloppe')}
                      </Text>
                      <Text style={styles.categoryMetaAlloc}>
                        {t('enveloppe_budgetaire')} : {formatDT(catItem.allocated)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.categoryMetaText}>
                        {t('part_du_total')} : {catItem.shareOfTotal.toFixed(1)}%
                      </Text>
                      <Text style={styles.categoryMetaUnallocated}>
                        ({t('sans_budget_alloue')})
                      </Text>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ============================================================ */}
      {/* 6. ANALYSE DU RYTHME QUOTIDIEN (PACE INSIGHT) */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('rythme_depenses_quotidien')}
      </SectionTitle>

      <View style={styles.cardContainer}>
        {/* Métriques d'allure : Moyenne / jour, Jours écoulés, Jours restants */}
        <View
          style={[
            styles.paceGrid,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View style={styles.paceGridItem}>
            <Text style={styles.paceLabel}>{t('moyenne_par_jour')}</Text>
            <Text style={styles.paceValue}>{formatDT(avgDailySpend)}</Text>
          </View>
          <View style={styles.paceGridItem}>
            <Text style={styles.paceLabel}>{t('jours_ecoules')}</Text>
            <Text style={styles.paceValue}>
              {daysElapsed} / {totalDays}
            </Text>
          </View>
          <View style={styles.paceGridItem}>
            <Text style={styles.paceLabel}>{t('jours_restants')}</Text>
            <Text style={styles.paceValue}>{daysRemaining} j</Text>
          </View>
        </View>

        <View style={styles.paceDivider} />

        {/* Estimation de fin de période */}
        <View
          style={[
            styles.paceProjectionRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.paceProjectionLabel}>
              {t('depense_estimee_fin_periode')} :
            </Text>
            <Text
              style={[
                styles.paceProjectionValue,
                !isPaceSustainable && { color: colors.coral },
              ]}
            >
              {formatDT(projectedTotal)}
            </Text>
          </View>

          {/* Badge de durabilité */}
          <View
            style={[
              styles.paceBadge,
              {
                backgroundColor: isPaceSustainable ? '#E8F5E9' : '#FFEBEE',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons
              name={isPaceSustainable ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={isPaceSustainable ? colors.green : colors.coral}
            />
            <Text
              style={[
                styles.paceBadgeText,
                { color: isPaceSustainable ? colors.green : colors.coral },
              ]}
            >
              {isPaceSustainable ? t('rythme_soutenable') : t('risque_depassement')}
            </Text>
          </View>
        </View>

        {/* Message d'alerte ou de confirmation de rythme */}
        <Text
          style={[
            styles.paceMessageText,
            { textAlign: isRTL ? 'right' : 'left' },
            !isPaceSustainable && { color: colors.coral },
          ]}
        >
          {isPaceSustainable
            ? `Au rythme actuel de ${formatDT(avgDailySpend)}/jour, votre budget est pleinement respecté avec une marge estimée de ${formatDT(projectedDifference)}.`
            : `Au rythme actuel de ${formatDT(avgDailySpend)}/jour, vous risquez de dépasser votre budget de ${formatDT(projectedDifference)}.`}
        </Text>
      </View>

      {/* ============================================================ */}
      {/* 7. CATÉGORIE REQUÉRANT LE PLUS D'ATTENTION */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('categorie_attention')}
      </SectionTitle>

      {attentionCategory ? (
        <View style={styles.attentionCard}>
          <View
            style={[
              styles.attentionHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.attentionTitleBox,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Ionicons
                name={getCategoryIcon(attentionCategory.name)}
                size={22}
                color={colors.coral}
              />
              <Text style={styles.attentionCategoryName}>
                {traduireCategorie(attentionCategory.name)}
              </Text>
            </View>
            <View style={styles.attentionBadge}>
              <Text style={styles.attentionBadgeText}>
                {attentionCategory.hasBudget
                  ? `${attentionCategory.consumptionPct.toFixed(0)}% consommé`
                  : `${attentionCategory.shareOfTotal.toFixed(0)}% du total`}
              </Text>
            </View>
          </View>

          {/* Explication du besoin d'attention */}
          <Text
            style={[
              styles.attentionReasonText,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {attentionCategory.hasBudget
              ? `Cette catégorie a consommé ${attentionCategory.consumptionPct.toFixed(1)}% de son allocation (${formatDT(attentionCategory.spent)} sur ${formatDT(attentionCategory.allocated)}). Son taux d'épuisement est le plus préoccupant du budget.`
              : `Cette catégorie représente ${attentionCategory.shareOfTotal.toFixed(1)}% de l'ensemble de vos dépenses actuelles (${formatDT(attentionCategory.spent)}), sans enveloppe budgétaire dédiée.`}
          </Text>

          {/* Suggestion pratique pour maîtriser les dépenses */}
          <View style={styles.suggestionBox}>
            <View
              style={[
                styles.suggestionHeader,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.forest} />
              <Text style={styles.suggestionHeaderTitle}>
                {t('suggestion_action')} :
              </Text>
            </View>
            <Text
              style={[
                styles.suggestionBody,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {attentionCategory.hasBudget
                ? `Différez les achats non urgents pour cette catégorie ou réallouez une fraction du solde disponible d'un autre poste pour équilibrer.`
                : `Définissez un plafond budgétaire explicite pour « ${traduireCategorie(attentionCategory.name)} » lors de votre prochaine période pour mieux encadrer ses sorties.`}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.healthyAttentionCard}>
          <View
            style={[
              styles.attentionTitleBox,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color={colors.green} />
            <Text style={styles.healthyAttentionTitle}>
              {t('toutes_categories_maitrisees')}
            </Text>
          </View>
          <Text
            style={[
              styles.healthyAttentionBody,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            Aucune catégorie ne présente de surconsommation anormale. Toutes vos enveloppes sont sous le seuil critique.
          </Text>
        </View>
      )}

      {/* Espacement de sécurité en bas */}
      <View style={{ height: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodSelector: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  periodHint: {
    fontSize: 11,
    color: colors.muted,
  },
  summaryCard: {
    backgroundColor: colors.forest,
    borderRadius: radius.card,
    padding: 20,
    gap: 6,
  },
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mint,
    letterSpacing: 0.5,
  },
  summaryBadge: {
    backgroundColor: 'rgba(217, 240, 228, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mint,
  },
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 38,
  },
  summarySub: {
    fontSize: 12,
    color: colors.track,
    marginBottom: 8,
  },
  summaryGrid: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 12,
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryGridItem: {
    flex: 1,
  },
  gridLabel: {
    fontSize: 11,
    color: colors.track,
    marginBottom: 2,
  },
  gridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  insightCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  insightHeader: {
    alignItems: 'center',
    gap: 6,
  },
  insightHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  insightBodyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#333333',
  },
  insightDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  comparisonCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  comparisonRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  comparisonPeriodTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  comparisonDates: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  comparisonAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 4,
  },
  verticalDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  trendBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  gaugeHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gaugeSpentLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  gaugeSpentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 2,
  },
  gaugeCeilLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  gaugeCeilAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 2,
  },
  gaugeTrack: {
    height: 12,
    backgroundColor: '#EBEBEB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: 12,
    borderRadius: 6,
  },
  gaugeFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeFooterText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  gaugeFooterDays: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forest,
  },
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  categoryHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryNameBox: {
    alignItems: 'center',
    gap: 8,
  },
  categoryNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  categorySpentText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  catProgressTrack: {
    height: 6,
    backgroundColor: '#EBEBEB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  catProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  categoryMetaRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryMetaText: {
    fontSize: 12,
    color: colors.forest,
  },
  categoryMetaAlloc: {
    fontSize: 12,
    color: colors.muted,
  },
  categoryMetaUnallocated: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },
  paceGrid: {
    justifyContent: 'space-between',
    gap: 8,
  },
  paceGridItem: {
    flex: 1,
  },
  paceLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
    marginBottom: 2,
  },
  paceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  paceDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  paceProjectionRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  paceProjectionLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  paceProjectionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 2,
  },
  paceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  paceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  paceMessageText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.forest,
    fontWeight: '500',
    marginTop: 4,
  },
  attentionCard: {
    backgroundColor: '#FFF8F8',
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    padding: 16,
    gap: 10,
  },
  attentionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attentionTitleBox: {
    alignItems: 'center',
    gap: 8,
  },
  attentionCategoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.coral,
  },
  attentionBadge: {
    backgroundColor: colors.coralSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attentionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.coral,
  },
  attentionReasonText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#444444',
  },
  suggestionBox: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 12,
    gap: 6,
  },
  suggestionHeader: {
    alignItems: 'center',
    gap: 6,
  },
  suggestionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forest,
  },
  suggestionBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#333333',
  },
  healthyAttentionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 16,
    gap: 8,
  },
  healthyAttentionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
    flex: 1,
  },
  healthyAttentionBody: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.forest,
  },
});
