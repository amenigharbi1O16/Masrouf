/**
 * FICHIER : src/components/ui/PillBarChart.tsx
 * COMPOSANT : Graphique de comparaison mensuelle "Pill Bar Chart"
 *
 * DESIGN SYSTEM :
 * - Barres verticales arrondies en gélule (pill/capsule)
 * - Proportions fidèles à la maquette de référence
 * - Alignement rigoureux sur la ligne de base
 * - Légende récapitulative condensée sur 2 lignes sous la carte
 * - Volet d'inspection interactif affiché au toucher d'une barre
 */

import React, { useMemo, useState } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius } from '@/constants/theme';
import type { PillBarChartItem } from '@/utils/analyticsHistory';
import { formatTND } from '@/utils/format';

export interface PillBarChartProps {
  title: string;
  subtitle?: string;
  items: PillBarChartItem[];
  unit?: string;
  toDateLabel?: string;
  isRTL?: boolean;
  showBudgetDetailsOnTap?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export function formatShortAmount(amount: number): string {
  if (!amount || amount <= 0) return '0';
  if (amount % 1 === 0) return String(Math.round(amount));
  return parseFloat(amount.toFixed(3)).toString();
}

export function PillBarChart({
  title,
  subtitle,
  items,
  unit = 'DT',
  toDateLabel = 'en cours',
  isRTL = false,
  showBudgetDetailsOnTap = true,
  containerStyle,
}: PillBarChartProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const maxSpent = useMemo(() => {
    const vals = items.map((i) => i.spent);
    return Math.max(...vals, 0);
  }, [items]);

  const selectedItem = useMemo(
    () => items.find((i) => i.key === selectedKey),
    [items, selectedKey]
  );

  // Lignes de synthèse sous la carte (style exact de la maquette)
  const summaryLine1 = useMemo(() => {
    if (items.length < 4) return '';
    return items
      .slice(0, 4)
      .map((i) => `${i.shortLabel} ${formatShortAmount(i.spent)}`)
      .join(' · ');
  }, [items]);

  const summaryLine2 = useMemo(() => {
    if (items.length < 4) return '';
    const lastItems = items.slice(4);
    const formatted = lastItems
      .map((i) => `${i.shortLabel} ${formatShortAmount(i.spent)}`)
      .join(' · ');
    return `${formatted} ${unit} (${toDateLabel})`;
  }, [items, unit, toDateLabel]);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {/* 1. CARTE PRINCIPALE BLANCHE AVEC LE GRAPHIQUE VERTICAL */}
      <View style={styles.chartCard}>
        {/* En-tête : Titre et sous-titre optionnel */}
        <View style={styles.headerBox}>
          <Text style={[styles.chartTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.chartSubtitle,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>

        {/* Zone des barres verticales en capsules */}
        <View
          style={[
            styles.verticalChartArea,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {items.map((item) => {
            const isSelected = selectedKey === item.key;
            const ratio = maxSpent > 0 ? item.spent / maxSpent : 0;
            const barHeight =
              item.spent > 0 ? Math.max(Math.round(ratio * 135), 14) : 8;
            const barRadius = Math.min(13, Math.round(barHeight / 2));

            return (
              <TouchableOpacity
                key={item.key}
                style={styles.barColumn}
                activeOpacity={0.75}
                onPress={() => {
                  if (showBudgetDetailsOnTap) {
                    setSelectedKey(isSelected ? null : item.key);
                  }
                }}
              >
                {/* Tooltip flottant au toucher */}
                {isSelected && (
                  <View style={styles.tooltipBubble}>
                    <Text style={styles.tooltipText}>
                      {formatTND(item.spent)}
                    </Text>
                  </View>
                )}

                {/* Piste verticale qui aligne la barre sur la ligne de base */}
                <View style={styles.barTrackArea}>
                  <View
                    style={[
                      styles.verticalBar,
                      {
                        height: barHeight,
                        borderRadius: barRadius,
                        backgroundColor:
                          item.spent === 0
                            ? '#C8D6CF'
                            : isSelected
                            ? colors.deepGreen || '#2E7D43'
                            : colors.forest,
                      },
                    ]}
                  />
                </View>

                {/* Libellé court du mois (ex: Jun, Jul, Aug, Sep, Oct, Nov) */}
                <Text
                  style={[
                    styles.barMonthLabel,
                    item.isCurrent && styles.barMonthLabelCurrent,
                    isSelected && styles.barMonthLabelSelected,
                  ]}
                >
                  {item.shortLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 2. LÉGENDE RÉCAPITULATIVE SOUS LA CARTE (Style exact de la photo) */}
      <View style={styles.chartFooterSummary}>
        <Text
          style={[
            styles.chartSummaryText,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {summaryLine1}
        </Text>
        <Text
          style={[
            styles.chartSummaryText,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {summaryLine2}
        </Text>
      </View>

      {/* 3. DÉTAILS DU MOIS SÉLECTIONNÉ (AFFICHÉ AU CLIC) */}
      {showBudgetDetailsOnTap && selectedItem && (
        <View style={styles.selectedDetailCard}>
          <View
            style={[
              styles.selectedDetailHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Text style={styles.selectedMonthTitle}>
              {selectedItem.label}
            </Text>
            {selectedItem.allocated > 0 ? (
              <Text
                style={[
                  styles.selectedMonthPct,
                  selectedItem.pct > 100 && { color: colors.coral },
                ]}
              >
                {selectedItem.pct}% {isRTL ? 'مستهلك' : 'consommé'}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.selectedDetailRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View style={styles.detailCol}>
              <Text style={styles.selectedDetailLabel}>
                {isRTL ? 'المستهلك' : 'Consommé'}
              </Text>
              <Text style={styles.selectedDetailVal}>
                {formatTND(selectedItem.spent)}
              </Text>
            </View>

            {selectedItem.allocated > 0 && (
              <>
                <View style={styles.detailCol}>
                  <Text style={styles.selectedDetailLabel}>
                    {isRTL ? 'المخصص' : 'Alloué'}
                  </Text>
                  <Text style={styles.selectedDetailVal}>
                    {formatTND(selectedItem.allocated)}
                  </Text>
                </View>

                <View style={styles.detailCol}>
                  <Text style={styles.selectedDetailLabel}>
                    {isRTL ? 'المتبقي' : 'Restant'}
                  </Text>
                  <Text
                    style={[
                      styles.selectedDetailVal,
                      {
                        color:
                          selectedItem.remaining === 0
                            ? colors.coral
                            : colors.forest,
                      },
                    ]}
                  >
                    {formatTND(selectedItem.remaining)}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: 8,
  },
  chartCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerBox: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  chartSubtitle: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 3,
  },
  verticalChartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 4,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
    maxWidth: 64,
  },
  tooltipBubble: {
    position: 'absolute',
    top: -24,
    backgroundColor: colors.forest,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tooltipText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  barTrackArea: {
    height: 145,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  verticalBar: {
    width: 26,
    borderRadius: 13,
    backgroundColor: colors.forest,
  },
  barMonthLabel: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    color: colors.muted,
    textAlign: 'center',
  },
  barMonthLabelCurrent: {
    fontWeight: '700',
    color: colors.forest,
  },
  barMonthLabelSelected: {
    fontWeight: '800',
    color: colors.forest,
  },
  chartFooterSummary: {
    marginTop: 14,
    paddingHorizontal: 4,
    gap: 4,
  },
  chartSummaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4E655D',
    lineHeight: 20,
  },
  selectedDetailCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  selectedDetailHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedMonthTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  selectedMonthPct: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forest,
  },
  selectedDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F3F1',
  },
  detailCol: {
    alignItems: 'center',
  },
  selectedDetailLabel: {
    fontSize: 10,
    color: colors.muted,
    marginBottom: 2,
  },
  selectedDetailVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forest,
  },
});
