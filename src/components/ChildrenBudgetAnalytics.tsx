/**
 * FICHIER : src/components/ChildrenBudgetAnalytics.tsx
 * COMPOSANT : Suivi Analytique & Comparaison Historique Multi-Mois du Budget des Enfants
 *
 * MISSION DU COMPOSANT :
 * Fournir au parent un tableau de bord analytique rigoureux pour chaque enfant :
 * 1. Progression budgétaire du mois en cours : Montant alloué, Montant consommé, Reste disponible, % consommé.
 * 2. Comparaison historique multi-mois (sur les 4 derniers mois) avec graphiques à barres comparatifs réactifs.
 * 3. Respect absolu de la vie privée : Zéro détail des achats ou des dépenses personnels des enfants (aucun libellé ni produit).
 * 4. Synchronisation automatique en temps réel à partir des données réelles SQLite (budgets, allocations, dépenses, achats).
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { formatShortAmount, PillBarChart, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import type { DB, User } from '@/state/types';
import { getChildMonthlyHistory } from '@/utils/analyticsHistory';
import { formatTND, monthShort, monthShortLocale } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';

interface MonthData {
  monthKey: string;
  monthLabel: string;
  allocated: number;
  spent: number;
  remaining: number;
  pct: number;
}

interface ChildrenBudgetAnalyticsProps {
  childrenList: User[];
  db: DB;
  currentMonthKey?: string;
}

export function ChildrenBudgetAnalytics({
  childrenList,
  db,
  currentMonthKey: propMonthKey,
}: ChildrenBudgetAnalyticsProps) {
  const { t, isRTL, langue } = useTranslation();

  const now = new Date();
  const currentMonthKey =
    propMonthKey ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Génération des 6 derniers mois civils pour l'historique comparatif vertical (style Photo 2)
  const pastMonths = useMemo(() => {
    const list: {
      key: string;
      label: string;
      shortLabel: string;
      start: string;
      end: string;
    }[] = [];
    const [curYear, curMonth] = currentMonthKey.split('-').map(Number);

    for (let i = 0; i < 6; i++) {
      const d = new Date(curYear, curMonth - 1 - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const key = `${y}-${String(m).padStart(2, '0')}`;
      const lastDay = new Date(y, m, 0).getDate();
      const start = `${key}-01`;
      const end = `${key}-${String(lastDay).padStart(2, '0')}`;

      // Libellé court pour l'axe X (ex: Jun, Jul, Aug, Sep, Oct, Nov)
      const monthIdx = d.getMonth();
      let shortLabel = '';
      if (langue === 'en') {
        shortLabel = monthShort(monthIdx);
      } else if (langue === 'ar') {
        shortLabel = monthShortLocale(monthIdx, 'ar');
      } else {
        const frShort = monthShortLocale(monthIdx, 'fr').replace('.', '');
        shortLabel = frShort.charAt(0).toUpperCase() + frShort.slice(1);
      }

      // Libellé du mois localisé complet
      let label = `${key}`;
      try {
        const monthFormatter = new Intl.DateTimeFormat(
          langue === 'ar' ? 'ar-TN' : langue === 'en' ? 'en-US' : 'fr-FR',
          { month: 'short', year: 'numeric' }
        );
        label = monthFormatter.format(d);
      } catch {
        label = key;
      }

      list.push({ key, label, shortLabel, start, end });
    }
    // Ordre chronologique pour les graphiques (du plus ancien au plus récent)
    return list.reverse();
  }, [currentMonthKey, langue]);

  // Enfant sélectionné pour la comparaison détaillée
  const [selectedChildId, setSelectedChildId] = useState<string>(
    childrenList[0]?.id || ''
  );
  // Mois sélectionné pour le détail interactif
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);

  // Synchronisation si la liste des enfants change
  React.useEffect(() => {
    if (childrenList.length > 0 && !childrenList.some((c) => c.id === selectedChildId)) {
      setSelectedChildId(childrenList[0].id);
      setSelectedMonthKey(null);
    }
  }, [childrenList, selectedChildId]);

  // Progression du mois courant pour chaque enfant
  const currentMonthProgress = useMemo(() => {
    const startOfMonth = `${currentMonthKey}-01`;
    const curYear = parseInt(currentMonthKey.split('-')[0], 10);
    const curMonth = parseInt(currentMonthKey.split('-')[1], 10);
    const lastDay = new Date(curYear, curMonth, 0).getDate();
    const endOfMonth = `${currentMonthKey}-${String(lastDay).padStart(2, '0')}`;

    return childrenList.map((ch) => {
      // 1. Budget alloué
      const chBudget = db.budgets.find(
        (b) => b.userId === ch.id && b.start.slice(0, 7) === currentMonthKey
      );
      const allocSum = db.allocations
        .filter(
          (a) =>
            a.childId === ch.id &&
            a.date >= startOfMonth &&
            a.date <= endOfMonth
        )
        .reduce((s, a) => s + a.amount, 0);

      const allocated =
        chBudget?.total || (allocSum > 0 ? allocSum : ch.allocatedTotal || 0);

      // 2. Dépenses et achats réels de l'enfant (somme globale sans détails d'articles)
      const chExp = db.expenses
        .filter(
          (e) =>
            e.userId === ch.id &&
            e.date >= startOfMonth &&
            e.date <= endOfMonth
        )
        .reduce((s, e) => s + e.amount, 0);
      const chPur = db.purchases
        .filter(
          (p) =>
            p.userId === ch.id &&
            p.date >= startOfMonth &&
            p.date <= endOfMonth
        )
        .reduce((s, p) => s + p.price, 0);

      const spent = chExp + chPur;
      const remaining = Math.max(0, allocated - spent);
      const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

      return {
        child: ch,
        allocated,
        spent,
        remaining,
        pct,
      };
    });
  }, [childrenList, db.budgets, db.allocations, db.expenses, db.purchases, currentMonthKey]);

  // Données historiques multi-mois pour chaque enfant
  const historicalDataByChild = useMemo(() => {
    const map: Record<string, MonthData[]> = {};

    for (const ch of childrenList) {
      map[ch.id] = pastMonths.map((m) => {
        // Budget mensuel pour ce mois
        const b = db.budgets.find(
          (bg) => bg.userId === ch.id && bg.start.slice(0, 7) === m.key
        );
        const allocs = db.allocations
          .filter(
            (a) => a.childId === ch.id && a.date >= m.start && a.date <= m.end
          )
          .reduce((s, a) => s + a.amount, 0);

        let allocated = b?.total || allocs;
        if (allocated === 0 && m.key === currentMonthKey) {
          allocated = ch.allocatedTotal || ch.balance || 0;
        }

        const expTot = db.expenses
          .filter(
            (e) => e.userId === ch.id && e.date >= m.start && e.date <= m.end
          )
          .reduce((s, e) => s + e.amount, 0);
        const purTot = db.purchases
          .filter(
            (p) => p.userId === ch.id && p.date >= m.start && p.date <= m.end
          )
          .reduce((s, p) => s + p.price, 0);

        const spent = expTot + purTot;
        const remaining = Math.max(0, allocated - spent);
        const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

        return {
          monthKey: m.key,
          monthLabel: m.label,
          shortLabel: m.shortLabel,
          allocated,
          spent,
          remaining,
          pct,
        };
      });
    }

    return map;
  }, [childrenList, pastMonths, db.budgets, db.allocations, db.expenses, db.purchases, currentMonthKey]);

  if (childrenList.length === 0) {
    return (
      <View style={styles.emptyCard}>
        <Ionicons name="people-outline" size={32} color={colors.muted} />
        <Text style={styles.emptyText}>
          {isRTL
            ? 'لا يوجد أبناء مرتبطون بهذا الحساب.'
            : 'Aucun compte enfant rattaché à ce foyer.'}
        </Text>
      </View>
    );
  }

  const activeChild =
    childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  const activeHistory = useMemo(() => {
    if (!activeChild) return [];
    return getChildMonthlyHistory(
      db,
      activeChild.id,
      currentMonthKey,
      langue === 'ar' ? 'ar' : langue === 'en' ? 'en' : 'fr'
    );
  }, [db, activeChild, currentMonthKey, langue]);

  return (
    <View style={styles.container}>
      {/* 1. SECTION : PROGRESSION DU MOIS EN COURS */}
      <View style={styles.sectionHeader}>
        <SectionTitle>
          {isRTL ? 'متابعة ميزانية الأبناء' : 'Progression du budget alloué aux enfants'}
        </SectionTitle>
        <Text style={styles.privacyNotice}>
          🔒 {isRTL ? 'حماية الخصوصية : تُعرض مؤشرات الاستهلاك الإجمالية فقط دون تفاصيل المشتريات الشخصية' : 'Confidentialité préservée : Seule la progression globale est affichée, sans détails des achats personnels.'}
        </Text>
      </View>

      <View style={styles.cardsList}>
        {currentMonthProgress.map(({ child, allocated, spent, remaining, pct }) => (
          <View
            key={child.id}
            style={[
              styles.childCard,
              pct > 100 && { borderColor: colors.coral, backgroundColor: '#FFF5F5' },
            ]}
          >
            <View
              style={[
                styles.childCardHeader,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={styles.avatarBox}>
                <Ionicons name="person" size={20} color={colors.forest} />
              </View>
              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <Text style={[styles.childName, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {child.name}
                </Text>
                <Text style={[styles.childEmail, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {child.email}
                </Text>
              </View>
              <View
                style={[
                  styles.pctBadge,
                  pct > 100 && { backgroundColor: '#FEE2E2', borderColor: colors.coral },
                ]}
              >
                <Text style={[styles.pctBadgeText, pct > 100 && { color: colors.coral, fontWeight: '800' }]}>
                  {pct > 100 ? `${pct}% · ${isRTL ? 'تجاوز' : 'Dépassement'}` : `${pct}%`}
                </Text>
              </View>
            </View>

            {/* Barre de jauge de consommation */}
            <View style={styles.gaugeTrack}>
              <View
                style={[
                  styles.gaugeFill,
                  {
                    width: `${Math.min(pct, 100)}%`,
                    backgroundColor: pct > 100 ? colors.coral : pct >= 80 ? colors.gold : colors.mint,
                  },
                ]}
              />
            </View>

            {/* Grille des métriques financières clés */}
            <View
              style={[
                styles.metricsGrid,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>
                  {isRTL ? 'المخصص' : 'Alloué'}
                </Text>
                <Text style={styles.metricVal}>{formatTND(allocated)}</Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>
                  {isRTL ? 'المستهلك' : 'Consommé'}
                </Text>
                <Text
                  style={[
                    styles.metricVal,
                    pct > 100 && { color: colors.coral },
                  ]}
                >
                  {formatTND(spent)}
                </Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>
                  {isRTL ? 'المتبقي' : 'Restant'}
                </Text>
                <Text
                  style={[
                    styles.metricVal,
                    { color: remaining === 0 && allocated > 0 ? colors.coral : colors.forest },
                  ]}
                >
                  {formatTND(remaining)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* 2. SECTION : HISTORIQUE COMPARATIF MULTI-MOIS */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <SectionTitle>
          {isRTL ? 'مقارنة تاريخية لاستهلاك الأبناء عبر الأشهر' : 'Comparaison historique de consommation entre les mois'}
        </SectionTitle>
        <Text style={styles.sectionSubtitle}>
          {isRTL
            ? 'رسم بياني يعتمد على البيانات الحقيقية المحفوظة في قاعدة البيانات لمقارنة استهلاك الميزانية من شهر لآخر.'
            : 'Graphiques comparatifs construits à partir des données réelles enregistrées dans la base de données.'}
        </Text>
      </View>

      {/* Sélecteur de l'enfant actif si plusieurs enfants */}
      {childrenList.length > 1 && (
        <View style={styles.childTabs}>
          {childrenList.map((ch) => {
            const isSelected = ch.id === activeChild?.id;
            return (
              <TouchableOpacity
                key={ch.id}
                style={[styles.childTab, isSelected && styles.childTabActive]}
                onPress={() => setSelectedChildId(ch.id)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.childTabText,
                    isSelected && styles.childTabTextActive,
                  ]}
                >
                  {ch.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* GRAPHIQUE COMPARATIF DU BUDGET PAR MOIS (PILL BAR CHART STANDARDISÉ) */}
      <PillBarChart
        title={
          childrenList.length > 1 && activeChild
            ? `${activeChild.name} · ${
                isRTL
                  ? 'مصاريف الطفل الشهرية · د.ت'
                  : langue === 'en'
                  ? 'Monthly child expenses · DT'
                  : 'Dépenses mensuelles · DT'
              }`
            : isRTL
            ? 'مصاريف الطفل الشهرية · د.ت'
            : langue === 'en'
            ? 'Monthly child expenses · DT'
            : "Dépenses mensuelles de l'enfant · DT"
        }
        subtitle={
          isRTL
            ? 'تطور نسبة استهلاك الميزانية الشهرية'
            : 'Évolution du taux de consommation du budget alloué'
        }
        items={activeHistory}
        unit={isRTL ? 'د.ت' : 'DT'}
        toDateLabel={
          isRTL ? 'الشهر الحالي' : langue === 'en' ? 'to date' : 'en cours'
        }
        isRTL={isRTL}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 17,
  },
  privacyNotice: {
    fontSize: 11,
    color: colors.forest,
    fontWeight: '500',
    marginTop: 3,
    lineHeight: 16,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  cardsList: {
    gap: 12,
  },
  childCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  childCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(27, 67, 50, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  childEmail: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 1,
  },
  pctBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  pctBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  gaugeTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.track || '#EAEAEA',
    overflow: 'hidden',
    marginVertical: 8,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 4,
  },
  metricsGrid: {
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  childTabs: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
    flexWrap: 'wrap',
  },
  childTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childTabActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  childTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
  },
  childTabTextActive: {
    color: colors.white,
  },
});
