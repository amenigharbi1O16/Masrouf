/**
 * FICHIER : src/components/ChildDashboard.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-048-CHILD-DASHBOARD
 * COMPOSANT : ChildDashboard (Tableau de Bord Dédié à l'Enfant)
 *
 * MISSION DU COMPOSANT :
 * Fournir une expérience financière adaptée, engageante et protectrice pour l'enfant :
 * 1. Affichage clair du solde disponible en DT issu des allocations de son parent.
 * 2. Visualisation du total reçu et des dépenses effectuées.
 * 3. Actions directes :
 *    - Ajouter une dépense / un achat avec possibilité de saisie vocale.
 *    - Soumettre une demande d'argent de poche à son parent (montant + motif).
 * 4. Liste des transactions personnelles récentes avec débit immédiat du solde.
 * 5. Suivi en temps réel de ses demandes d'argent (En attente, Approuvée, Rejetée).
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
import { AlertBanner, Body, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import { formatTND } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import { VoiceTransactionModal } from './VoiceTransactionModal';

export function ChildDashboard() {
  const router = useRouter();
  const { db, me, actions } = useStore();
  const { t, isRTL } = useTranslation();

  // Modal de demande d'argent
  const [requestModal, setRequestModal] = useState(false);
  const [requestAmount, setRequestAmount] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestBusy, setRequestBusy] = useState(false);

  // Modal de transaction vocale
  const [voiceModal, setVoiceModal] = useState(false);

  // Transactions de l'enfant
  const myExpenses = useMemo(() => {
    return db.expenses.filter((e) => e.userId === me?.id);
  }, [db.expenses, me?.id]);

  const myPurchases = useMemo(() => {
    return db.purchases.filter((p) => p.userId === me?.id);
  }, [db.purchases, me?.id]);

  const totalSpent = useMemo(() => {
    const exp = myExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pur = myPurchases.reduce((sum, p) => sum + p.price, 0);
    return exp + pur;
  }, [myExpenses, myPurchases]);

  // Demandes soumises par cet enfant
  const myRequests = useMemo(() => {
    return db.moneyRequests
      .filter((r) => r.childId === me?.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.moneyRequests, me?.id]);

  // Transactions récentes combinées
  const recentTransactions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      subtitle: string;
      amount: number;
      date: string;
      icon: keyof typeof Ionicons.glyphMap;
    }> = [];

    for (const e of myExpenses) {
      const cat = db.categories.find((c) => c.id === e.categoryId);
      list.push({
        id: `exp-${e.id}`,
        title: cat?.name || 'Dépense',
        subtitle: e.note || e.date,
        amount: e.amount,
        date: e.date,
        icon: 'receipt-outline',
      });
    }

    for (const p of myPurchases) {
      const prod = db.products.find((pr) => pr.id === p.productId);
      list.push({
        id: `pur-${p.id}`,
        title: prod?.name || 'Achat',
        subtitle: `${p.quantity} unité(s)`,
        amount: p.price,
        date: p.date,
        icon: 'cart-outline',
      });
    }

    return list.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [myExpenses, myPurchases, db.categories, db.products]);

  const submitRequest = async () => {
    const num = parseFloat(requestAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      setRequestError('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }

    setRequestBusy(true);
    setRequestError('');

    const res = await actions.requestMoney(num, requestReason.trim() || 'Demande d\'argent');
    setRequestBusy(false);

    if (!res.ok) {
      setRequestError(res.error ?? 'Erreur lors de la demande.');
    } else {
      setRequestModal(false);
      setRequestAmount('');
      setRequestReason('');
      Alert.alert(
        'Demande envoyée !',
        'Votre demande a été transmise à votre parent. Vous serez notifié dès qu’il y aura répondu.'
      );
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {/* EN-TÊTE ENFANT */}
      <View
        style={[
          styles.headerRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <View style={styles.childAvatarBadge}>
          <Ionicons name="sparkles" size={20} color={colors.mint} />
        </View>

        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <Text
            style={[styles.greetingText, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            Bonjour, {me?.name?.split(' ')[0] || 'Enfant'} ⭐
          </Text>
          <Text
            style={[styles.subGreeting, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {me?.familyName || 'Famille'} · Mon Espace Personnel
          </Text>
        </View>

        <TouchableOpacity
          style={styles.micQuickBtn}
          onPress={() => setVoiceModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="mic" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* CARTE DU SOLDE PRINCIPAL DE L'ENFANT */}
      <View style={styles.balanceCard}>
        <View
          style={[
            styles.balanceTopRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View style={styles.balancePill}>
            <Ionicons name="wallet-outline" size={16} color={colors.mint} />
            <Text style={styles.balancePillText}>MON SOLDE DISPONIBLE</Text>
          </View>

          <TouchableOpacity
            style={styles.askMoneyBtn}
            onPress={() => {
              setRequestAmount('');
              setRequestReason('');
              setRequestError('');
              setRequestModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="hand-right-outline" size={15} color={colors.white} />
            <Text style={styles.askMoneyBtnText}>Demander</Text>
          </TouchableOpacity>
        </View>

        <Text
          style={[styles.balanceNumber, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {formatTND(me?.balance || 0)}
        </Text>
        <Text
          style={[styles.balanceSub, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          Argent de poche utilisable pour vos dépenses
        </Text>

        <View style={styles.balanceDivider} />

        <View style={styles.balanceStatsRow}>
          <View style={styles.balanceStatCol}>
            <Text style={styles.statVal}>{formatTND(me?.allocatedTotal || 0)}</Text>
            <Text style={styles.statLbl}>Reçu des parents</Text>
          </View>
          <View style={styles.statSep} />
          <View style={styles.balanceStatCol}>
            <Text style={[styles.statVal, { color: '#FF8A80' }]}>
              {formatTND(totalSpent)}
            </Text>
            <Text style={styles.statLbl}>Total dépensé</Text>
          </View>
        </View>
      </View>

      {/* ACTIONS RAPIDES ENFANT */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.forest }]}
          onPress={() => router.push('/nouvelle-depense')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={20} color={colors.white} />
          <Text style={styles.actionBtnLabel}>+ Nouvelle Dépense</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#1E88E5' }]}
          onPress={() => setVoiceModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="mic" size={20} color={colors.white} />
          <Text style={styles.actionBtnLabel}>Saisie Vocale</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION MES DEMANDES D'ARGENT RÉCENTES */}
      <View style={styles.sectionWrap}>
        <SectionTitle>Mes demandes d’argent</SectionTitle>

        {myRequests.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Vous n'avez pas encore soumis de demande d'argent.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {myRequests.slice(0, 3).map((req) => (
              <View
                key={req.id}
                style={[
                  styles.requestRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={styles.reqIconWrap}>
                  <Ionicons
                    name={
                      req.status === 'approved'
                        ? 'checkmark-circle'
                        : req.status === 'rejected'
                          ? 'close-circle'
                          : 'hourglass-outline'
                    }
                    size={20}
                    color={
                      req.status === 'approved'
                        ? colors.forest
                        : req.status === 'rejected'
                          ? '#E11D48'
                          : '#E65100'
                    }
                  />
                </View>

                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.reqReason}>
                    {req.reason || 'Demande d’argent'}
                  </Text>
                  <Text style={styles.reqDate}>{req.date}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.reqAmount}>{formatTND(req.amount)}</Text>
                  <Text
                    style={[
                      styles.reqStatus,
                      req.status === 'approved' && { color: colors.forest },
                      req.status === 'rejected' && { color: '#E11D48' },
                      req.status === 'pending' && { color: '#E65100' },
                    ]}
                  >
                    {req.status === 'approved'
                      ? 'Approuvée ✓'
                      : req.status === 'rejected'
                        ? 'Refusée ✕'
                        : 'En attente ⏳'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* SECTION DERNIÈRES DÉPENSES */}
      <View style={styles.sectionWrap}>
        <SectionTitle>Mes dernières dépenses</SectionTitle>

        {recentTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Aucune dépense enregistrée pour le moment.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {recentTransactions.map((tx) => (
              <View
                key={tx.id}
                style={[
                  styles.txnRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={styles.txnIconWrap}>
                  <Ionicons name={tx.icon} size={20} color={colors.forest} />
                </View>
                <View style={{ flex: 1, marginHorizontal: 10 }}>
                  <Text style={styles.txnTitle}>{tx.title}</Text>
                  <Text style={styles.txnSub}>{tx.subtitle} · {tx.date}</Text>
                </View>
                <Text style={styles.txnAmount}>−{formatTND(tx.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* MODAL SOUMETTRE UNE DEMANDE D'ARGENT */}
      <Modal
        visible={requestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRequestModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Demander de l'argent</Text>
                <Text style={styles.modalSub}>
                  Votre parent recevra votre demande pour validation.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRequestModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color={colors.forest} />
              </TouchableOpacity>
            </View>

            {requestError ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={requestError} />
            ) : null}

            <Input
              label="Montant souhaité (TND)"
              value={requestAmount}
              onChangeText={(txt) => {
                setRequestAmount(txt);
                setRequestError('');
              }}
              keyboardType="decimal-pad"
              placeholder="Ex: 10.000"
              autoFocus
            />

            <Input
              label="Motif de la demande"
              value={requestReason}
              onChangeText={setRequestReason}
              placeholder="Ex: Fournitures scolaires, sortie entre amis..."
            />

            <View style={styles.modalBtnGroup}>
              <Button
                label="Envoyer à mes parents"
                onPress={submitRequest}
                loading={requestBusy}
              />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setRequestModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE TRANSACTION VOCALE */}
      <VoiceTransactionModal
        visible={voiceModal}
        onClose={() => setVoiceModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  childAvatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.forest,
  },
  subGreeting: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  micQuickBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E88E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E88E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  balanceCard: {
    backgroundColor: colors.forest,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  balancePillText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  askMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(46, 196, 182, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  askMoneyBtnText: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '700',
  },
  balanceNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 1,
  },
  balanceSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  balanceDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 14,
  },
  balanceStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  statLbl: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionWrap: {
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 13,
    color: colors.gray,
  },
  requestRow: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reqIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqReason: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  reqDate: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 1,
  },
  reqAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.forest,
  },
  reqStatus: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  txnRow: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  txnSub: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 1,
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
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
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGroup: {
    gap: 10,
    marginTop: 14,
  },
});

