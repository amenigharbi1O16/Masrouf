/**
 * FICHIER : src/app/(tabs)/analyses.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-013
 * ÉCRAN : ECRAN-TAB-04 (Analyses Statistiques et Rapports Comparatifs)
 *
 * RÔLE DU COMPOSANT :
 * Moteur d'analyses statistiques et budgétaires complet de Masrouf :
 * 1. Sélecteur de période cliquable affichant les dates réelles du budget et ouvrant le calendrier au toucher.
 * 2. Carte de résumé financière en vert forêt : total dépensé en DT (3 décimales), comparaison
 *    en montant et pourcentage avec la période précédente de même durée, pastille vert menthe (économie)
 *    ou corail (hausse).
 * 3. Répartition par catégorie avec diagramme horizontal segmenté (Top 5 + Autres) et légende détaillée.
 * 4. Tableau détaillé de chaque catégorie : montant consommé, pourcentage du total, comparaison
 *    avec la période précédente et jauge de consommation de l'enveloppe budgétaire.
 * 5. Carte de conclusions intelligentes automatisées (catégorie la plus dépensée, plus forte hausse/baisse,
 *    respect global du budget).
 * 6. Classement des plus grosses dépenses individuelles de la période.
 * 7. Sélecteur et graphique d'évolution du prix unitaire pour un produit choisi.
 *
 * ACTIONS ASSOCIÉES :
 * - Navigation vers le calendrier (`/(tabs)/calendrier`)
 * - Dépliage / repliage du tableau détaillé (`expandedDetails`)
 * - Sélection d'un produit pour afficher sa courbe de prix
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Interface riche bicolore (vert forêt, menthe, or, corail) sans aucune donnée codée en dur.
 * Toutes les valeurs proviennent des requêtes SQLite réelles.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chips } from '@/components/Chips';
import { PriceChart } from '@/components/PriceChart';
import { Screen } from '@/components/Screen';
import {
  AlertBanner,
  Body,
  Button,
  EmptyState,
  Eyebrow,
  SectionTitle,
} from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import {
  categoryName,
  currentBudget,
  inRange,
  previousWindow,
  userBudgets,
  userTxns,
} from '@/state/selectors';
import { useStore } from '@/state/store';
import { fmtRange, formatDT, unitPrice } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
// Résolveur d'icône représentative par catégorie pour les graphiques et listes d'analyses
import { getCategoryIcon } from '@/utils/categoryIcons';

const CAT_COLORS = [
  colors.forest,
  colors.green,
  '#4A7C59',
  colors.gold,
  colors.coral,
  '#7C9D8E',
  '#A0B2A6',
];

export default function AnalyticsScreen() {
  const router = useRouter();
  const { db, me, selectedBudget } = useStore();
  const { t, isRTL, traduireCategorie } = useTranslation();

  const [expandedDetails, setExpandedDetails] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  if (!me) return null;

  // 1. Période de référence centrale sélectionnée dans l'application et sa fenêtre précédente équivalente
  const budget = selectedBudget;
  const win = budget ? previousWindow(budget) : null;

  // 2. Transactions réelles pour chaque période
  const allTxns = useMemo(() => userTxns(db, me.id), [db, me.id]);

  const curTxns = useMemo(() => {
    if (!budget) return [];
    return allTxns.filter((tx) => inRange(tx.date, budget.start, budget.end));
  }, [allTxns, budget]);

  const prevTxns = useMemo(() => {
    if (!win) return [];
    return allTxns.filter((tx) => inRange(tx.date, win.start, win.end));
  }, [allTxns, win]);

  // 3. Calculs en millimes entiers pour zéro dérive d'arrondi
  const curTotal = useMemo(
    () => curTxns.reduce((sum, tx) => sum + Math.round(tx.amount * 1000), 0) / 1000,
    [curTxns]
  );
  const prevTotal = useMemo(
    () => prevTxns.reduce((sum, tx) => sum + Math.round(tx.amount * 1000), 0) / 1000,
    [prevTxns]
  );

  const diff = curTotal - prevTotal;
  const pctDiff = prevTotal > 0 ? (diff / prevTotal) * 100 : null;
  const aEconomise = diff <= 0;

  // 4. Statistiques détaillées par catégorie
  const catStats = useMemo(() => {
    if (!budget) return [];
    const catMap = new Map<
      string,
      {
        id: string;
        name: string;
        icon: keyof typeof Ionicons.glyphMap;
        curSpend: number;
        prevSpend: number;
        allocated: number;
      }
    >();

    for (const c of db.categories) {
      catMap.set(c.id, {
        id: c.id,
        name: c.name,
        // Icône personnalisée et descriptive selon la catégorie (restaurant, voiture, etc.) au lieu du portefeuille uniforme
        icon: getCategoryIcon(c.name, c.kind),
        curSpend: 0,
        prevSpend: 0,
        allocated: budget.allocations[c.id] ?? 0,
      });
    }

    for (const tx of curTxns) {
      const entry = catMap.get(tx.categoryId);
      if (entry) {
        entry.curSpend += Math.round(tx.amount * 1000);
      }
    }
    for (const tx of prevTxns) {
      const entry = catMap.get(tx.categoryId);
      if (entry) {
        entry.prevSpend += Math.round(tx.amount * 1000);
      }
    }

    const list = Array.from(catMap.values())
      .filter((item) => item.curSpend > 0 || item.prevSpend > 0 || item.allocated > 0)
      .map((item) => {
        const curDT = item.curSpend / 1000;
        const prevDT = item.prevSpend / 1000;
        const diffCat = curDT - prevDT;
        const diffCatPct = prevDT > 0 ? (diffCat / prevDT) * 100 : null;
        const curPct = curTotal > 0 ? (curDT / curTotal) * 100 : 0;
        const budgetPct = item.allocated > 0 ? (curDT / item.allocated) * 100 : 0;
        return {
          ...item,
          curDT,
          prevDT,
          diffCat,
          diffCatPct,
          curPct,
          budgetPct,
        };
      });

    return list.sort((a, b) => b.curDT - a.curDT);
  }, [db.categories, budget, curTxns, prevTxns, curTotal]);

  // Répartition pour le diagramme (Top 5 + Autres)
  const chartSlices = useMemo(() => {
    if (curTotal <= 0) return [];
    const spentOnly = catStats.filter((c) => c.curDT > 0);
    const top5 = spentOnly.slice(0, 5);
    const others = spentOnly.slice(5);
    const othersSum = others.reduce((s, c) => s + c.curDT, 0);

    const slices = top5.map((c, i) => ({
      id: c.id,
      name: traduireCategorie(c.name),
      amount: c.curDT,
      pct: (c.curDT / curTotal) * 100,
      color: CAT_COLORS[i % CAT_COLORS.length],
    }));

    if (othersSum > 0) {
      slices.push({
        id: 'autres',
        name: t('autres'),
        amount: othersSum,
        pct: (othersSum / curTotal) * 100,
        color: CAT_COLORS[5],
      });
    }

    return slices;
  }, [catStats, curTotal, t, traduireCategorie]);

  // Conclusions automatisées
  const conclusions = useMemo(() => {
    if (!budget || curTotal <= 0) return [];
    const phrases: string[] = [];

    // 1. Catégorie la plus dépensée
    const spentOnly = catStats.filter((c) => c.curDT > 0);
    if (spentOnly.length > 0) {
      const maxVal = spentOnly[0].curDT;
      const exAequo = spentOnly.filter((c) => Math.abs(c.curDT - maxVal) < 0.001);
      if (exAequo.length > 1) {
        phrases.push(
          t('conclusion_top_cat_egalite', {
            cat1: traduireCategorie(exAequo[0].name),
            cat2: traduireCategorie(exAequo[1].name),
            pct: exAequo[0].curPct.toFixed(1),
          })
        );
      } else {
        phrases.push(
          t('conclusion_top_cat', {
            nom: traduireCategorie(spentOnly[0].name),
            pct: spentOnly[0].curPct.toFixed(1),
          })
        );
      }
    }

    // 2. Catégorie avec la plus forte hausse
    const hausses = catStats.filter((c) => c.diffCat > 0 && c.prevDT > 0 && c.diffCatPct !== null);
    if (hausses.length > 0) {
      hausses.sort((a, b) => (b.diffCatPct ?? 0) - (a.diffCatPct ?? 0));
      phrases.push(
        t('conclusion_hausse', {
          nom: traduireCategorie(hausses[0].name),
          pct: Math.abs(hausses[0].diffCatPct ?? 0).toFixed(1),
        })
      );
    }

    // 3. Catégorie avec la plus forte baisse
    const baisses = catStats.filter((c) => c.diffCat < 0 && c.prevDT > 0 && c.diffCatPct !== null);
    if (baisses.length > 0) {
      baisses.sort((a, b) => (a.diffCatPct ?? 0) - (b.diffCatPct ?? 0));
      phrases.push(
        t('conclusion_baisse', {
          nom: traduireCategorie(baisses[0].name),
          pct: Math.abs(baisses[0].diffCatPct ?? 0).toFixed(1),
        })
      );
    }

    // 4. Respect global du budget
    if (budget.total > 0) {
      const globalPct = Math.round((curTotal / budget.total) * 100);
      if (curTotal <= budget.total) {
        phrases.push(t('respect_global_budget', { pct: globalPct }));
      } else {
        phrases.push(
          t('depassement_global_budget', {
            montant: formatDT(curTotal - budget.total),
            pct: globalPct,
          })
        );
      }
    }

    return phrases;
  }, [budget, curTotal, catStats, t, traduireCategorie]);

  // Plus grosses dépenses individuelles
  const topIndividualTxns = useMemo(() => {
    return [...curTxns].sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [curTxns]);

  // Produits avec achats pour la courbe d'évolution des prix
  const userProductsWithPurchases = useMemo(() => {
    return db.products.filter(
      (p) => p.userId === me.id && db.purchases.some((pu) => pu.productId === p.id)
    );
  }, [db.products, db.purchases, me.id]);

  const activeProductId = selectedProductId || userProductsWithPurchases[0]?.id || null;
  const activeProduct = db.products.find((p) => p.id === activeProductId);

  const productPurchasesHistory = useMemo(() => {
    if (!activeProductId) return [];
    return db.purchases
      .filter((pu) => pu.productId === activeProductId)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [db.purchases, activeProductId]);

  const priceChartPoints = useMemo(() => {
    return productPurchasesHistory.map((pu) => ({
      label: pu.date.slice(5),
      value: unitPrice(pu.price, pu.quantity),
    }));
  }, [productPurchasesHistory]);

  const latestPurchase =
    productPurchasesHistory.length > 0
      ? productPurchasesHistory[productPurchasesHistory.length - 1]
      : null;
  const latestStoreName = latestPurchase?.store || 'Magasin';

  // État vide si aucun budget n'existe
  if (!budget) {
    return (
      <Screen title={t('analyses')}>
        <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {t('analyses').toUpperCase()}
        </Eyebrow>
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

  const rangeLabel = fmtRange(budget.start, budget.end);
  const prevRangeLabel = win ? fmtRange(win.start, win.end) : '';

  const visibleCatStats = expandedDetails ? catStats : catStats.slice(0, 4);

  return (
    <Screen title={t('analyses')}>
      {/* 1. Sélecteur de période cliquable */}
      <Pressable
        onPress={() => router.push('/(tabs)/calendrier')}
        style={({ pressed }) => [
          styles.periodCard,
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

      {/* 2. Carte de résumé et Comparaison Explicite des Périodes */}
      <View style={styles.summaryCard}>
        <Text
          style={[styles.summaryEyebrow, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('depense_totale').toUpperCase()} · {rangeLabel}
        </Text>
        <Text
          style={[styles.summaryAmount, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {formatDT(curTotal)}
        </Text>

        {/* Bloc explicatif détaillant exactement ce qui est comparé */}
        <View style={{ marginTop: 10, padding: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.white, textAlign: isRTL ? 'right' : 'left' }}>
            Comparaison temporelle :
          </Text>
          <Text style={{ fontSize: 12, color: colors.track, textAlign: isRTL ? 'right' : 'left' }}>
            • Période active ({budget.start} au {budget.end}) : {formatDT(curTotal)}
          </Text>
          {win && (
            <Text style={{ fontSize: 12, color: colors.track, textAlign: isRTL ? 'right' : 'left' }}>
              • Période précédente ({win.start} au {win.end}) : {formatDT(prevTotal)}
            </Text>
          )}

          {prevTotal === 0 ? (
            <View style={[styles.noPrevBox, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 4 }]}>
              <Ionicons name="information-circle-outline" size={16} color={colors.mint} />
              <Text style={[styles.noPrevText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('pas_de_depense_periode_prec')}
              </Text>
            </View>
          ) : (
            <View style={{ marginTop: 6, gap: 4 }}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: diff < 0 ? 'rgba(217, 240, 228, 0.25)' : diff > 0 ? 'rgba(220, 119, 112, 0.25)' : 'rgba(255, 255, 255, 0.2)',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignSelf: isRTL ? 'flex-end' : 'flex-start',
                  },
                ]}
              >
                <Ionicons
                  name={diff < 0 ? 'trending-down' : diff > 0 ? 'trending-up' : 'remove-outline'}
                  size={16}
                  color={diff < 0 ? colors.mint : diff > 0 ? colors.coral : colors.white}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: diff < 0 ? colors.mint : diff > 0 ? colors.coral : colors.white },
                  ]}
                >
                  {diff < 0 ? 'Baisse (Économie)' : diff > 0 ? 'Hausse des dépenses' : 'Stabilité des dépenses'} : {diff < 0 ? '−' : diff > 0 ? '+' : ''}{Math.abs(pctDiff ?? 0).toFixed(1)}% ({formatDT(Math.abs(diff))})
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 3. Répartition par catégorie */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('repartition_categories')}
      </SectionTitle>

      {curTotal <= 0 ? (
        <AlertBanner
          tone="info"
          title={t('aucune_depense')}
          detail={t('pas_encore_comparer')}
        />
      ) : (
        <View style={styles.chartCard}>
          {/* Diagramme horizontal segmenté proportionnel */}
          <View
            style={[
              styles.segmentedBar,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {chartSlices.map((slice) => (
              <View
                key={slice.id}
                style={{
                  width: `${slice.pct}%`,
                  height: '100%',
                  backgroundColor: slice.color,
                }}
              />
            ))}
          </View>

          {/* Légende ordonnée du plus dépensé au moins dépensé */}
          <View style={{ gap: 10, marginTop: 14 }}>
            {chartSlices.map((slice) => (
              <View
                key={slice.id}
                style={[
                  styles.legendRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View
                  style={[
                    styles.legendLeft,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: slice.color }]} />
                  <Text style={styles.legendName}>{slice.name}</Text>
                </View>
                <View
                  style={[
                    styles.legendRight,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Text style={styles.legendPct}>{slice.pct.toFixed(1)}%</Text>
                  <Text style={styles.legendAmount}>{formatDT(slice.amount)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 4. Tableau détaillé */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('tableau_detaille')}
      </SectionTitle>

      <View style={{ gap: 10 }}>
        {visibleCatStats.map((item) => {
          const catTitle = traduireCategorie(item.name);
          const hasPrev = item.prevDT > 0;
          const isDecrease = item.diffCat <= 0;
          const consumptionRatio =
            item.allocated > 0 ? Math.min(1, item.curDT / item.allocated) : 0;
          const isOverBudget = item.allocated > 0 && item.curDT > item.allocated;

          return (
            <View key={item.id} style={styles.detailCard}>
              <View
                style={[
                  styles.detailHeader,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Text style={styles.detailTitle}>{catTitle}</Text>
                <Text style={styles.detailCurrentSpend}>
                  {formatDT(item.curDT)}
                  {curTotal > 0 ? ` (${item.curPct.toFixed(1)}%)` : ''}
                </Text>
              </View>

              <View
                style={[
                  styles.detailSubRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Text style={styles.detailPrevText}>
                  {t('periode_precedente')} : {formatDT(item.prevDT)}
                </Text>

                {hasPrev ? (
                  <View
                    style={[
                      styles.deltaBadge,
                      {
                        backgroundColor: isDecrease ? '#E8F5E9' : '#FFEBEE',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isDecrease ? 'arrow-down' : 'arrow-up'}
                      size={12}
                      color={isDecrease ? colors.green : colors.coral}
                    />
                    <Text
                      style={[
                        styles.deltaText,
                        { color: isDecrease ? colors.green : colors.coral },
                      ]}
                    >
                      {Math.abs(item.diffCatPct ?? 0).toFixed(1)}% (
                      {isDecrease ? '−' : '+'}
                      {formatDT(Math.abs(item.diffCat))})
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.newBadgeText}>+100%</Text>
                )}
              </View>

              {item.allocated > 0 ? (
                <View style={{ marginTop: 6, gap: 4 }}>
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${consumptionRatio * 100}%`,
                          backgroundColor: isOverBudget
                            ? colors.coral
                            : item.budgetPct >= 80
                            ? colors.gold
                            : colors.green,
                        },
                      ]}
                    />
                  </View>
                  <View
                    style={[
                      styles.budgetRatioRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <Text style={styles.budgetRatioText}>
                      {t('consommation_budget')} : {item.budgetPct.toFixed(0)}%
                    </Text>
                    <Text style={styles.budgetAllocText}>
                      {t('enveloppe_budgetaire')} : {formatDT(item.allocated)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}

        {catStats.length > 4 ? (
          <Button
            label={expandedDetails ? t('voir_moins') : t('voir_plus')}
            variant="secondary"
            onPress={() => setExpandedDetails((v) => !v)}
          />
        ) : null}
      </View>

      {/* 5. Carte de conclusions */}
      {conclusions.length > 0 ? (
        <>
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('conclusion_titre')}
          </SectionTitle>
          <View style={styles.conclusionsCard}>
            <View
              style={[
                styles.conclusionsHeader,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Ionicons name="sparkles" size={20} color={colors.green} />
              <Text style={styles.conclusionsHeaderTitle}>
                {t('conclusion_titre')}
              </Text>
            </View>
            <View style={{ gap: 8, marginTop: 4 }}>
              {conclusions.map((phrase, idx) => (
                <Text
                  key={idx}
                  style={[
                    styles.conclusionParagraph,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  • {phrase}
                </Text>
              ))}
            </View>
          </View>
        </>
      ) : null}

      {/* 6. Deux blocs finaux */}
      {/* Bloc A : Classement des plus grosses dépenses individuelles */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('plus_grosses_depenses')}
      </SectionTitle>

      {topIndividualTxns.length === 0 ? (
        <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {t('pas_encore_comparer')}
        </Body>
      ) : (
        <View style={{ gap: 8 }}>
          {topIndividualTxns.map((tx) => (
            <View
              key={tx.id}
              style={[
                styles.topExpenseCard,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={styles.topExpenseIconBox}>
                {/* Icône descriptive de l'opération selon sa catégorie réelle */}
                <Ionicons
                  name={
                    tx.kind === 'purchase'
                      ? 'bag-outline'
                      : getCategoryIcon(categoryName(db, tx.categoryId), 'expense')
                  }
                  size={20}
                  color={colors.green}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.topExpenseTitle,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                  numberOfLines={1}
                >
                  {tx.title}
                </Text>
                <Text
                  style={[
                    styles.topExpenseSub,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                  numberOfLines={1}
                >
                  {[categoryName(db, tx.categoryId), tx.date].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={styles.topExpenseAmount}>{formatDT(tx.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Bloc B : Évolution du prix unitaire d'un produit choisi */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('evolution_prix_unitaire')}
      </SectionTitle>

      {userProductsWithPurchases.length === 0 ? (
        <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {t('aucun_produit_enregistre')}
        </Body>
      ) : (
        <View style={{ gap: 12 }}>
          <Text
            style={[styles.productPickerPrompt, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {t('selectionner_produit_evolution')}
          </Text>
          <Chips
            options={userProductsWithPurchases.map((p) => ({
              value: p.id,
              label: p.name,
            }))}
            value={activeProductId ?? ''}
            onChange={(val) => setSelectedProductId(val)}
          />

          {activeProduct && priceChartPoints.length > 0 ? (
            <View style={{ gap: 8 }}>
              <PriceChart
                title={activeProduct.name}
                unit={activeProduct.unit || 'pièce'}
                points={priceChartPoints}
              />
              {latestPurchase ? (
                <View
                  style={[
                    styles.latestPriceBox,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Ionicons name="pricetag-outline" size={16} color={colors.forest} />
                  <Text style={styles.latestPriceText}>
                    {t('derniers_prix_observes', {
                      prix: formatDT(unitPrice(latestPurchase.price, latestPurchase.quantity)),
                      magasin: latestStoreName,
                    })}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
              {t('pas_encore_comparer')}
            </Body>
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  periodCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  periodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  periodHint: {
    fontSize: 12,
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
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 40,
  },
  noPrevBox: {
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
  },
  noPrevText: {
    fontSize: 12,
    color: colors.mint,
    flex: 1,
  },
  comparisonRow: {
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  prevDetailText: {
    fontSize: 12,
    color: colors.mint,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
  },
  segmentedBar: {
    height: 18,
    borderRadius: 9,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  legendRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.forest,
  },
  legendRight: {
    alignItems: 'center',
    gap: 8,
  },
  legendPct: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  legendAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 14,
    gap: 8,
  },
  detailHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  detailCurrentSpend: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  detailSubRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailPrevText: {
    fontSize: 12,
    color: colors.muted,
  },
  deltaBadge: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  deltaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  newBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.green,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  budgetRatioRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetRatioText: {
    fontSize: 11,
    color: colors.muted,
  },
  budgetAllocText: {
    fontSize: 11,
    color: colors.muted,
  },
  conclusionsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: colors.green,
  },
  conclusionsHeader: {
    alignItems: 'center',
    gap: 8,
  },
  conclusionsHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  conclusionParagraph: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.forest,
  },
  topExpenseCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  topExpenseIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topExpenseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.forest,
  },
  topExpenseSub: {
    fontSize: 11,
    color: colors.muted,
  },
  topExpenseAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  productPickerPrompt: {
    fontSize: 13,
    color: colors.muted,
  },
  latestPriceBox: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  latestPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forest,
  },
});
