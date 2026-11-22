/**
 * FICHIER : src/app/(admin)/budget-analyses.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-008-BUDGET-ANALYSES
 * ÉCRAN : BUDGETS ET ANALYSES FINANCIÈRES DU FOYER (Family Budgets & Analytics)
 *
 * MISSION DU FICHIER :
 * Fournir au parent une vision analytique et consolidée des dépenses familiales :
 * 1. Définition et suivi du budget global mensuel du foyer.
 * 2. Répartition par catégorie de dépenses (Alimentation, Éducation, Enfants, Transport...).
 * 3. Ventilation des dépenses et allocations par membre de la famille.
 * 4. Indicateur de santé budgétaire et alertes de dépassement.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, Input, PillBarChart, SectionTitle } from '@/components/ui';
import { ChildrenBudgetAnalytics } from '@/components/ChildrenBudgetAnalytics';
import { getParentTotalMonthlyHistory } from '@/utils/analyticsHistory';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import { formatTND } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import {
  isChildrenCategory,
  findEnfantCategory,
  CANONICAL_ENFANT_ID,
  CANONICAL_ENFANT_NAME,
} from '@/utils/categoryMatching';

export default function FamilyBudgetAnalysesScreen() {
  const router = useRouter();
  const { db, me, selectedBudget, actions } = useStore();
  const { t, isRTL, langue } = useTranslation();

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const y = now.getFullYear();
  const m = now.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  const startOfMonth = `${currentMonthKey}-01`;
  const endOfMonth = `${currentMonthKey}-${String(lastDay).padStart(2, '0')}`;

  // Modal de modification du Budget du mois
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [budgetBusy, setBudgetBusy] = useState(false);
  const [budgetError, setBudgetError] = useState('');

  // Enfants rattachés au parent
  const childrenList = db.users.filter(
    (u) => u.role === 'child' && (u.parentId === me?.id || u.familyId === me?.familyId)
  );

  // Budget mensuel unique de référence centrale (synchronisé entre l'accueil, budgets et analyses)
  const activeUserBudget =
    selectedBudget ||
    db.budgets.find((b) => b.userId === me?.id && b.start.slice(0, 7) === currentMonthKey) ||
    db.budgets.find((b) => b.userId === me?.id);

  // Budget familial du mois courant
  const familyBudget = db.familyBudgets.find(
    (b) => b.parentId === me?.id && (b.month === currentMonthKey || b.start === startOfMonth)
  );
  // Montant du Budget du mois : garanti unique et identique sur toutes les pages
  const totalBudgeted = activeUserBudget?.total ?? familyBudget?.totalBudget ?? familyBudget?.total ?? 0;

  // Dépenses du parent (achats + dépenses directes + argent donné aux enfants dans la catégorie Enfants)
  const parentSpent = useMemo(() => {
    if (!me) return 0;
    // Somme des dépenses directes du parent (incluant les allocations aux enfants)
    const eTot = db.expenses
      .filter((e) => e.userId === me.id && e.date >= startOfMonth && e.date <= endOfMonth)
      .reduce((s, e) => s + e.amount, 0);
    // Somme des achats de produits du parent
    const pTot = db.purchases
      .filter((p) => p.userId === me.id && p.date >= startOfMonth && p.date <= endOfMonth)
      .reduce((s, p) => s + p.price, 0);
    // Total dépensé par le parent
    return eTot + pTot;
  }, [db.expenses, db.purchases, me, startOfMonth, endOfMonth]);

  // Historique 6 mois pour profil PARENT (Achats + Dépenses directes + Allocations aux enfants)
  const parentTotalHistory = useMemo(() => {
    if (!me) return [];
    return getParentTotalMonthlyHistory(
      db,
      me.id,
      currentMonthKey,
      langue === 'ar' ? 'ar' : langue === 'en' ? 'en' : 'fr'
    );
  }, [db, me, currentMonthKey, langue]);

  // Total dépensé unique (sans double comptage de l'argent donné aux enfants)
  const totalSpent = parentSpent;
  // Pourcentage consommé (0 si aucun budget)
  const percentUsed = totalBudgeted > 0 ? Math.min(Math.round((totalSpent / totalBudgeted) * 100), 100) : 0;
  // Reste du Budget du mois
  const remaining = totalBudgeted > 0 ? Math.max(totalBudgeted - totalSpent, 0) : 0;
  // Dépassement budgétaire autorisé mais signalé
  const isOverBudget = totalBudgeted > 0 && totalSpent > totalBudgeted;

  // Répartition par catégorie des dépenses du Budget du mois (avec formule pct = (total cat / total mois) * 100)
  const categoryStats = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of db.expenses.filter((e) => e.userId === me?.id && e.date >= startOfMonth && e.date <= endOfMonth)) {
      const cat = db.categories.find((c) => c.id === exp.categoryId);
      const isEnf = isChildrenCategory(cat) || isChildrenCategory(exp.categoryId);
      const name = isEnf ? CANONICAL_ENFANT_NAME : (cat?.name || 'Autres');
      map[name] = (map[name] || 0) + exp.amount;
    }
    for (const pur of db.purchases.filter((p) => p.userId === me?.id && p.date >= startOfMonth && p.date <= endOfMonth)) {
      const prod = db.products.find((pr) => pr.id === pur.productId);
      const cat = db.categories.find((c) => c.id === prod?.categoryId);
      const isEnf = isChildrenCategory(cat) || isChildrenCategory(prod?.categoryId);
      const name = isEnf ? CANONICAL_ENFANT_NAME : (cat?.name || 'Autres');
      map[name] = (map[name] || 0) + pur.price;
    }
    return Object.entries(map).map(([name, amount]) => ({
      name,
      amount,
      pct: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [db.expenses, db.purchases, db.categories, db.products, me, totalSpent, startOfMonth, endOfMonth]);

  // Progression budgétaire individuelle de chaque enfant (alloué, dépensé, restant, %)
  const childrenBudgetProgress = useMemo(() => {
    return childrenList.map((ch) => {
      const chBudget = db.budgets.find((b) => b.userId === ch.id && b.start === startOfMonth);
      const allocated = chBudget?.total || ch.allocatedTotal || 0;
      const chExp = db.expenses
        .filter((e) => e.userId === ch.id && e.date >= startOfMonth && e.date <= endOfMonth)
        .reduce((s, e) => s + e.amount, 0);
      const chPur = db.purchases
        .filter((p) => p.userId === ch.id && p.date >= startOfMonth && p.date <= endOfMonth)
        .reduce((s, p) => s + p.price, 0);
      const spent = chExp + chPur;
      const chRemaining = Math.max(0, allocated - spent);
      const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;
      return {
        child: ch,
        allocated,
        spent,
        remaining: chRemaining,
        pct,
      };
    });
  }, [childrenList, db.budgets, db.expenses, db.purchases, startOfMonth, endOfMonth]);

  // Ouverture du modal de saisie du Budget du mois
  const handleOpenBudgetModal = () => {
    setBudgetAmount(totalBudgeted > 0 ? String(totalBudgeted) : '');
    setBudgetError('');
    setBudgetModal(true);
  };

  // Enregistrement du Budget du mois dans SQLite (synchronisé sur l'ensemble des pages)
  const handleSaveBudget = async () => {
    const numGlobal = parseFloat(budgetAmount.replace(',', '.'));
    if (isNaN(numGlobal) || numGlobal <= 0) {
      setBudgetError('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }

    setBudgetBusy(true);
    setBudgetError('');

    // 1. Sauvegarde dans les budgets centraux de l'utilisateur (utilisé par Accueil et Analyses)
    actions.saveBudget({
      id: activeUserBudget?.id,
      start: startOfMonth,
      end: endOfMonth,
      total: numGlobal,
      allocations: activeUserBudget?.allocations || familyBudget?.allocations || {},
    });

    // 2. Synchronisation dans le budget familial du foyer
    actions.saveFamilyBudget({
      id: familyBudget?.id,
      start: startOfMonth,
      end: endOfMonth,
      month: currentMonthKey,
      total: numGlobal,
      totalBudget: numGlobal,
      allocations: familyBudget?.allocations || activeUserBudget?.allocations || {},
    });

    setBudgetBusy(false);
    setBudgetModal(false);
    Alert.alert('Succès', 'Budget du mois mis à jour avec succès.');
  };

  return (
    <Screen
      title={t('budgets_analyses')}
      back
      onBack={() => router.replace('/(tabs)')}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
          ANALYTIQUE & CONTRÔLE BUDGÉTAIRE
        </Eyebrow>

        {/* CARTE DE JAUGE BUDGÉTAIRE MENSUELLE */}
        <View style={styles.budgetHeroCard}>
          <View
            style={[
              styles.budgetHeroHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View>
              <Text style={styles.budgetMonthLabel}>
                BUDGET DU MOIS ({currentMonthKey})
              </Text>
              <Text style={styles.budgetHeroTotal}>
                {formatTND(totalBudgeted)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.editBudgetBtn}
              onPress={handleOpenBudgetModal}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={16} color={colors.mint} />
              <Text style={styles.editBudgetBtnText}>Ajuster</Text>
            </TouchableOpacity>
          </View>

          {/* Barre de progression */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${percentUsed}%` },
                isOverBudget && { backgroundColor: colors.coral },
              ]}
            />
          </View>

          <View style={styles.budgetLegendRow}>
            <Text style={styles.legendSpent}>
              Dépensé : {formatTND(totalSpent)} ({percentUsed}%)
            </Text>
            <Text style={styles.legendRemaining}>
              {isOverBudget
                ? `Dépassement de ${formatTND(totalSpent - totalBudgeted)}`
                : `Reste : ${formatTND(remaining)}`}
            </Text>
          </View>

          {isOverBudget ? (
            <View style={styles.budgetAlertBadge}>
              <Ionicons name="warning" size={16} color={colors.coral} />
              <Text style={styles.budgetAlertText}>
                Attention : Votre foyer a dépassé le budget prévu ce mois-ci.
              </Text>
            </View>
          ) : (
            <View style={styles.budgetGoodBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.mint} />
              <Text style={styles.budgetGoodText}>
                Budget sous contrôle. Continuez ainsi !
              </Text>
            </View>
          )}
        </View>

        {/* Message clair et bouton lorsque aucun budget n'a été saisi (commence à 0) */}
        {totalBudgeted === 0 && (
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radius.card,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Ionicons name="wallet-outline" size={32} color={colors.forest} style={{ marginBottom: 6 }} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.forest, marginBottom: 4, textAlign: 'center' }}>
              {isRTL ? 'لم يتم تحديد أي ميزانية لهذا الشهر' : 'Aucun budget défini pour ce mois'}
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 12 }}>
              {isRTL
                ? 'حدد ميزانية الشهر لتتبع النفقات وإدارة مصروف الأبناء.'
                : 'Fixez votre Budget du mois pour suivre vos dépenses et allouer l’argent de vos enfants.'}
            </Text>
            <Button
              label={isRTL ? 'تحديد ميزانية الشهر' : 'Définir le budget du mois'}
              onPress={handleOpenBudgetModal}
            />
          </View>
        )}

        {/* RÉPARTITION PAR CATÉGORIE */}
        <View style={styles.sectionWrap}>
          <SectionTitle>Dépenses par catégorie</SectionTitle>

          {categoryStats.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                Aucune transaction enregistrée pour ce mois-ci.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {categoryStats.map((cat, idx) => {
                const isThisEnfant = isChildrenCategory(cat.name);
                let plannedAmount = 0;
                if (isThisEnfant) {
                  const allocs = activeUserBudget?.allocations || familyBudget?.allocations || {};
                  for (const [k, v] of Object.entries(allocs)) {
                    if (isChildrenCategory(k) || isChildrenCategory(db.categories.find((c) => c.id === k))) {
                      plannedAmount += Number(v) || 0;
                    }
                  }
                } else {
                  const catObj = db.categories.find(
                    (c) => c.name === cat.name || c.id === cat.name
                  );
                  plannedAmount = catObj
                    ? (activeUserBudget?.allocations?.[catObj.id] ?? familyBudget?.allocations?.[catObj.id] ?? 0)
                    : 0;
                }
                const plannedPct = totalBudgeted > 0 ? Math.round((plannedAmount / totalBudgeted) * 100) : 0;
                const isCatExceeded = plannedAmount > 0 && cat.amount > plannedAmount;
                const catOverAmount = plannedAmount > 0 ? Math.max(0, cat.amount - plannedAmount) : 0;

                return (
                  <View
                    key={idx}
                    style={[
                      styles.categoryRow,
                      isCatExceeded && { borderColor: colors.coral, backgroundColor: '#FFF5F5' },
                    ]}
                  >
                    <View style={styles.catHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.catName, isCatExceeded && { color: colors.coral }]}>
                          {cat.name}
                        </Text>
                        {isCatExceeded ? (
                          <View style={styles.catExceededPill}>
                            <Text style={styles.catExceededPillText}>
                              {isRTL ? 'تجاوز' : 'Dépassement'}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.catAmount, isCatExceeded && { color: colors.coral }]}>
                        {formatTND(cat.amount)}
                      </Text>
                    </View>
                    <View style={styles.catProgressTrack}>
                      <View
                        style={[
                          styles.catProgressFill,
                          {
                            width: `${Math.min(cat.pct, 100)}%`,
                            backgroundColor: isCatExceeded
                              ? colors.coral
                              : idx === 0
                                ? colors.forest
                                : idx === 1
                                  ? colors.mint
                                  : idx === 2
                                    ? colors.green
                                    : colors.gold,
                          },
                        ]}
                      />
                    </View>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', marginTop: 3 }}>
                      {isCatExceeded ? (
                        <Text style={[styles.catPct, { color: colors.coral, fontWeight: '700' }]}>
                          {isRTL
                            ? `تجاوز الميزانية بمقدار +${formatTND(catOverAmount)}`
                            : `Dépassement de +${formatTND(catOverAmount)}`}
                        </Text>
                      ) : (
                        <Text style={styles.catPct}>
                          {isRTL ? 'الفعلي : ' : 'Réalisé : '}{cat.pct}% {isRTL ? 'من المصاريف' : 'des dépenses'}
                        </Text>
                      )}
                      {plannedAmount > 0 ? (
                        <Text style={[styles.catPct, { color: isCatExceeded ? colors.coral : colors.gray, fontWeight: '600' }]}>
                          {isRTL ? 'المخطط : ' : 'Prévu : '}{plannedPct}% ({formatTND(plannedAmount)})
                        </Text>
                      ) : (
                        <Text style={[styles.catPct, { color: colors.gray }]}>
                          {isRTL ? 'بدون ميزانية محددة' : 'Sans enveloppe fixée'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* COMPARAISON MENSUELLE DES DÉPENSES GLOBALES DU PARENT (PILL BAR CHART) */}
        <View style={styles.sectionWrap}>
          <SectionTitle>
            {isRTL
              ? 'تطور إجمالي نفقات الولي والمصروف'
              : 'Évolution des dépenses globales du parent & foyer'}
          </SectionTitle>
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 10 }}>
            {isRTL
              ? 'مقارنة إجمالي النفقات والمشتريات والمبالغ المخصصة للأبناء خلال الـ 6 أشهر الماضية'
              : 'Graphique comparatif des achats, dépenses directes et montants alloués aux enfants.'}
          </Text>
          <PillBarChart
            title={
              isRTL
                ? 'إجمالي نفقات الولي والمصروف · د.ت'
                : 'Dépenses globales du parent & foyer · DT'
            }
            subtitle={
              isRTL
                ? 'المصاريف والمشتريات والتحويلات للأبناء'
                : 'Achats personnels, dépenses et allocations aux enfants'
            }
            items={parentTotalHistory}
            unit={isRTL ? 'د.ت' : 'DT'}
            toDateLabel={
              isRTL ? 'الشهر الحالي' : langue === 'en' ? 'to date' : 'en cours'
            }
            isRTL={isRTL}
          />
        </View>

        {/* ALLOCATIONS & PROGRESSION DES ENFANTS AVEC HISTORIQUE MULTI-MOIS */}
        <View style={styles.sectionWrap}>
          <ChildrenBudgetAnalytics
            childrenList={childrenList}
            db={db}
            currentMonthKey={currentMonthKey}
          />
        </View>
      </ScrollView>

      {/* MODAL AJUSTER LE BUDGET DU MOIS */}
      <Modal
        visible={budgetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setBudgetModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {isRTL ? 'تحديد ميزانية الشهر' : 'Fixer le Budget du mois'}
                </Text>
                <Text style={styles.modalSub}>
                  {isRTL ? `ميزانية الشهر لـ ${currentMonthKey}` : `Plafond global du foyer pour ${currentMonthKey}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBudgetModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.forest} />
              </TouchableOpacity>
            </View>

            {budgetError ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={budgetError} />
            ) : null}

            <Input
              label="Budget du mois (TND)"
              value={budgetAmount}
              onChangeText={(txt) => {
                setBudgetAmount(txt);
                setBudgetError('');
              }}
              keyboardType="decimal-pad"
              placeholder="Ex: 1200.000"
              autoFocus
            />

            <View style={styles.modalBtnGroup}>
              <Button
                label="Enregistrer le budget du mois"
                onPress={handleSaveBudget}
                loading={budgetBusy}
              />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setBudgetModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  budgetHeroCard: {
    backgroundColor: colors.forest,
    borderRadius: 22,
    padding: 20,
    marginVertical: 14,
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  budgetHeroHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetMonthLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.mint,
    letterSpacing: 0.5,
  },
  budgetHeroTotal: {
    fontSize: 30,
    fontWeight: '900',
    color: colors.white,
    marginTop: 4,
  },
  editBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 196, 182, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  editBudgetBtnText: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.mint,
    borderRadius: 5,
  },
  budgetLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  legendSpent: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  legendRemaining: {
    fontSize: 12,
    color: colors.mint,
    fontWeight: '700',
  },
  budgetAlertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.coralSoft,
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  budgetAlertText: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  budgetGoodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.mint,
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
  },
  budgetGoodText: {
    color: colors.forest,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  sectionWrap: {
    marginBottom: 22,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray,
  },
  categoryRow: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  catAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.forest,
  },
  catProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warm,
    overflow: 'hidden',
    marginBottom: 4,
  },
  catProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  catPct: {
    fontSize: 11,
    color: colors.gray,
  },
  childBreakdownCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  childHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.forest,
  },
  childSub: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 1,
  },
  childBalanceBox: {
    alignItems: 'flex-end',
  },
  childBalanceLbl: {
    fontSize: 10,
    color: colors.gray,
  },
  childBalanceVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.forest,
  },
  childDivider: {
    height: 1,
    backgroundColor: colors.warm,
    marginVertical: 10,
  },
  childStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  childStatsText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '600',
  },
  childPctText: {
    fontSize: 12,
    color: colors.green,
    fontWeight: '700',
  },
  childProgressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.warm,
    overflow: 'hidden',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.forest,
  },
  modalSub: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGroup: {
    gap: 10,
    marginTop: 14,
  },
  catExceededPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catExceededPillText: {
    color: colors.coral,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

