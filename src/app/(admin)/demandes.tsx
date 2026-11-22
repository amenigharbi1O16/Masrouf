/**
 * FICHIER : src/app/(admin)/demandes.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-007-DEMANDES
 * ÉCRAN : GESTION DES DEMANDES D'ARGENT DES ENFANTS (Money Requests)
 *
 * MISSION DU FICHIER :
 * Permettre au parent de traiter les demandes d'argent soumises par ses enfants :
 * 1. Filtrage par onglets : En attente, Approuvées, Rejetées.
 * 2. Visualisation claire du montant, du motif saisi par l'enfant et de la date.
 * 3. Bouton d'approbation instantanée : vérifie la réserve familiale, débite la réserve,
 *    crédite le solde de l'enfant dans SQLite et met à jour le statut en 'approved'.
 * 4. Bouton de rejet : enregistre le refus sans aucun transfert monétaire.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import { formatTND, todayISO } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import {
  isChildrenCategory,
  findEnfantCategory,
  CANONICAL_ENFANT_ID,
  CANONICAL_ENFANT_NAME,
} from '@/utils/categoryMatching';

type FilterTab = 'pending' | 'approved' | 'rejected';

export default function MoneyRequestsScreen() {
  const router = useRouter();
  const { db, me, actions } = useStore();
  const { t, isRTL } = useTranslation();

  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Demandes d'argent adressées au parent connecté
  const allRequests = db.moneyRequests.filter((r) => r.parentId === me?.id);

  // Filtrage selon l'onglet
  const filteredRequests = allRequests.filter((r) => r.status === activeTab);

  // Réserve disponible
  const familyFund = db.familyFunds.find((f) => f.parentId === me?.id) || {
    balance: 0,
    totalAdded: 0,
    totalAllocated: 0,
  };

  // Calcul dynamique de l'enveloppe budgétaire catégorie « Enfants » pour le parent
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startOfMonth = `${currentMonthKey}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const endOfMonth = `${currentMonthKey}-${String(lastDay).padStart(2, '0')}`;

  const catEnfant = findEnfantCategory(db.categories);
  const catEnfantId = catEnfant?.id || CANONICAL_ENFANT_ID;

  const activeBudget =
    db.budgets.find((b) => b.userId === me?.id && b.start.slice(0, 7) === currentMonthKey) ||
    db.budgets.find((b) => b.userId === me?.id && b.start <= todayISO() && b.end >= todayISO()) ||
    db.budgets.find((b) => b.userId === me?.id);

  const familyBudget = db.familyBudgets?.find(
    (b) => b.parentId === me?.id && (b.month === currentMonthKey || b.start === startOfMonth)
  );

  // Somme des allocations réservées à la catégorie Enfant
  const catEnfantBudget = React.useMemo(() => {
    let sum = 0;
    const allocs = activeBudget?.allocations || familyBudget?.allocations || {};
    for (const [k, v] of Object.entries(allocs)) {
      if (k === catEnfantId || isChildrenCategory(k) || isChildrenCategory(db.categories.find((c) => c.id === k))) {
        sum += Number(v) || 0;
      }
    }
    return sum;
  }, [activeBudget, familyBudget, catEnfantId, db.categories]);

  // Dépenses actuelles dans la catégorie Enfant ce mois-ci
  const currentEnfantSpent = React.useMemo(() => {
    return db.expenses
      .filter(
        (e) =>
          e.userId === me?.id &&
          (e.categoryId === catEnfantId ||
            isChildrenCategory(e.categoryId) ||
            isChildrenCategory(db.categories.find((c) => c.id === e.categoryId))) &&
          e.date >= startOfMonth &&
          e.date <= endOfMonth
      )
      .reduce((sum, e) => sum + e.amount, 0);
  }, [db.expenses, me?.id, catEnfantId, db.categories, startOfMonth, endOfMonth]);

  const remainingEnfantBudget = Math.max(0, catEnfantBudget - currentEnfantSpent);

  const processResponse = async (reqId: string, approve: boolean) => {
    const req = allRequests.find((r) => r.id === reqId);
    if (!req) return;

    setBusyId(reqId);
    const res = await actions.respondToMoneyRequest(reqId, approve);
    setBusyId(null);

    if (!res.ok) {
      Alert.alert('Erreur', res.error ?? 'Impossible de traiter la demande.');
    } else {
      Alert.alert(
        approve ? 'Demande approuvée' : 'Demande rejetée',
        approve
          ? `${formatTND(req.amount)} ont été alloués à ${req.childName}.`
          : `La demande de ${req.childName} a été refusée.`
      );
    }
  };

  const handleResponse = async (reqId: string, approve: boolean) => {
    const req = allRequests.find((r) => r.id === reqId);
    if (!req) return;

    if (approve) {
      const projectedSpent = currentEnfantSpent + req.amount;
      const willExceed = (catEnfantBudget > 0 && projectedSpent > catEnfantBudget) || catEnfantBudget === 0;

      if (willExceed) {
        if (Platform.OS === 'web') {
          const msg = isRTL
            ? `الموافقة على هذا الطلب (${formatTND(req.amount)}) تتجاوز الميزانية المخصصة للأطفال (المتبقي: ${formatTND(remainingEnfantBudget)}). هل تريد تأكيد التحويل وتجاوز الميزانية؟`
            : `L'approbation de cette demande de ${formatTND(req.amount)} dépasse le budget alloué à la catégorie « Enfant » (Budget restant : ${formatTND(remainingEnfantBudget)} / Prévu : ${formatTND(catEnfantBudget)}).\n\nSouhaitez-vous confirmer l'allocation malgré le dépassement ? L'opération sera marquée en rouge dans vos analyses.`;
          const confirmed = typeof window !== 'undefined' ? window.confirm(msg) : true;
          if (confirmed) {
            await processResponse(reqId, true);
          }
          return;
        }

        Alert.alert(
          isRTL ? 'تنبيه تجاوز الميزانية' : 'Dépassement du budget Enfant',
          isRTL
            ? `الموافقة على هذا الطلب (${formatTND(req.amount)}) تتجاوز الميزانية المخصصة للأطفال (المتبقي: ${formatTND(remainingEnfantBudget)}). هل تريد تأكيد التحويل وتجاوز الميزانية؟`
            : `L'approbation de cette demande de ${formatTND(req.amount)} dépasse le budget alloué à la catégorie « Enfant » (Budget restant : ${formatTND(remainingEnfantBudget)} / Prévu : ${formatTND(catEnfantBudget)}).\n\nSouhaitez-vous confirmer l'allocation malgré le dépassement ? L'opération sera marquée en rouge dans vos analyses.`,
          [
            { text: isRTL ? 'إلغاء' : 'Annuler', style: 'cancel' },
            {
              text: isRTL ? 'تأكيد الموافقة' : 'Confirmer et approuver',
              style: 'destructive',
              onPress: () => processResponse(reqId, true),
            },
          ]
        );
        return;
      }
    }

    await processResponse(reqId, approve);
  };

  const pendingCount = allRequests.filter((r) => r.status === 'pending').length;
  const approvedCount = allRequests.filter((r) => r.status === 'approved').length;
  const rejectedCount = allRequests.filter((r) => r.status === 'rejected').length;

  return (
    <Screen
      title={t('demandes_argent')}
      back
      onBack={() => router.replace('/(admin)/dashboard')}
    >
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        FOYER & RESPONSABILISATION · DEMANDES DU FOYER
      </Eyebrow>

      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 6 }}>
        {t('demandes_argent')} ({allRequests.length})
      </SectionTitle>

      <Body style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 16 }}>
        Vos enfants peuvent vous solliciter pour de l'argent de poche avec un montant
        et un motif. Approuvez ou refusez en toute transparence.
      </Body>

      {/* ONGLETS DE FILTRAGE */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
          onPress={() => setActiveTab('pending')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'pending' && styles.tabTextActive,
            ]}
          >
            En attente ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'approved' && styles.tabActive]}
          onPress={() => setActiveTab('approved')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'approved' && styles.tabTextActive,
            ]}
          >
            Approuvées ({approvedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'rejected' && styles.tabActive]}
          onPress={() => setActiveTab('rejected')}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'rejected' && styles.tabTextActive,
            ]}
          >
            Rejetées ({rejectedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTE DES DEMANDES */}
      {filteredRequests.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name={
              activeTab === 'pending'
                ? 'checkmark-done-circle-outline'
                : activeTab === 'approved'
                ? 'ribbon-outline'
                : 'close-circle-outline'
            }
            size={44}
            color={colors.gray}
          />
          <Text style={styles.emptyTitle}>
            {activeTab === 'pending'
              ? 'Aucune demande en attente'
              : activeTab === 'approved'
              ? 'Aucune demande approuvée'
              : 'Aucune demande rejetée'}
          </Text>
          <Text style={styles.emptySub}>
            {activeTab === 'pending'
              ? 'Toutes les sollicitations de vos enfants ont été traitées.'
              : 'L’historique s’affichera ici au fur et à mesure.'}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {filteredRequests.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <View
                style={[
                  styles.cardHeader,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={styles.childIconCircle}>
                  <Ionicons name="person" size={20} color={colors.forest} />
                </View>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.childNameText}>{req.childName}</Text>
                  <Text style={styles.dateText}>{req.date}</Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    req.status === 'pending' && styles.badgePending,
                    req.status === 'approved' && styles.badgeApproved,
                    req.status === 'rejected' && styles.badgeRejected,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      req.status === 'pending' && { color: '#E65100' },
                      req.status === 'approved' && { color: colors.forest },
                      req.status === 'rejected' && { color: '#E11D48' },
                    ]}
                  >
                    {req.status === 'pending'
                      ? 'En attente'
                      : req.status === 'approved'
                      ? 'Approuvée'
                      : 'Rejetée'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBody}>
                <View style={styles.amountLine}>
                  <Text style={styles.amountLabel}>Montant demandé :</Text>
                  <Text style={styles.amountValue}>{formatTND(req.amount)}</Text>
                </View>

                <View style={styles.reasonLine}>
                  <Text style={styles.reasonLabel}>Motif :</Text>
                  <Text style={styles.reasonValue}>
                    {req.reason || 'Aucun motif précisé'}
                  </Text>
                </View>
              </View>

              {/* BOUTONS D'ACTION POUR DEMANDES EN ATTENTE */}
              {req.status === 'pending' && (
                <View style={styles.actionBtnRow}>
                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleResponse(req.id, true)}
                    disabled={busyId === req.id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={colors.white} />
                    <Text style={styles.approveBtnText}>Approuver et transférer</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleResponse(req.id, false)}
                    disabled={busyId === req.id}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle" size={18} color="#E11D48" />
                    <Text style={styles.rejectBtnText}>Refuser</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
  },
  tabTextActive: {
    color: colors.forest,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    alignItems: 'center',
  },
  childIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.forest,
  },
  dateText: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePending: {
    backgroundColor: '#FFF3E0',
  },
  badgeApproved: {
    backgroundColor: '#EAF7F0',
  },
  badgeRejected: {
    backgroundColor: '#FFE4E6',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  cardBody: {
    gap: 8,
  },
  amountLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 13,
    color: colors.gray,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.forest,
  },
  reasonLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reasonLabel: {
    fontSize: 13,
    color: colors.gray,
  },
  reasonValue: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
    fontWeight: '500',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  approveBtn: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.forest,
    paddingVertical: 10,
    borderRadius: 12,
  },
  approveBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFE4E6',
    paddingVertical: 10,
    borderRadius: 12,
  },
  rejectBtnText: {
    color: '#E11D48',
    fontSize: 12,
    fontWeight: '700',
  },
});
