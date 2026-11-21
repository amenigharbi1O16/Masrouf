/**
 * FICHIER : src/app/(admin)/finances.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-006-FINANCES
 * ÉCRAN : FINANCES FAMILIALES, RÉSERVE & ALLOCATIONS (Family Finances)
 *
 * MISSION DU FICHIER :
 * Gérer la trésorerie et les flux monétaires du foyer :
 * 1. Visualiser le solde disponible de la réserve familiale et le cumul historique des approvisionnements.
 * 2. Approvisionner la réserve familiale en liquidités.
 * 3. Allouer des fonds / donner de l'argent de poche aux enfants (avec sélection tactile, montant et note).
 * 4. Débiter la réserve et créditer le solde de l'enfant dans SQLite de manière transactionnelle.
 * 5. Consulter le grand livre d'historique de toutes les allocations effectuées.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import type { MoneyAllocation, User } from '@/state/types';
import { formatTND } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';

export default function FamilyFinancesScreen() {
  const router = useRouter();
  const { db, me, actions } = useStore();
  const { t, isRTL } = useTranslation();

  // Modal d'approvisionnement de la réserve
  const [topupModal, setTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupError, setTopupError] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);

  // Formulaire d'allocation d'argent
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [allocAmount, setAllocAmount] = useState('');
  const [allocNote, setAllocNote] = useState('');
  const [allocError, setAllocError] = useState('');
  const [allocBusy, setAllocBusy] = useState(false);

  // Données de la réserve familiale
  const familyFund = db.familyFunds.find((f) => f.parentId === me?.id) || {
    balance: 0,
    totalAdded: 0,
    totalAllocated: 0,
  };

  // Liste des enfants du parent
  const childrenList = db.users.filter(
    (u) => u.role === 'child' && (u.parentId === me?.id || u.familyId === me?.familyId)
  );

  // Historique des allocations
  const myAllocations = db.allocations.filter((a) => a.parentId === me?.id);

  // État de modal pour modifier ou supprimer une allocation existante
  const [editingAlloc, setEditingAlloc] = useState<MoneyAllocation | null>(null);
  // Montant édité
  const [editAllocAmount, setEditAllocAmount] = useState('');
  // Note éditée
  const [editAllocNote, setEditAllocNote] = useState('');
  // Date éditée
  const [editAllocDate, setEditAllocDate] = useState('');
  // Enfant destinataire édité
  const [editAllocChildId, setEditAllocChildId] = useState('');
  // Indicateur d'enregistrement en cours
  const [editAllocBusy, setEditAllocBusy] = useState(false);
  // Message d'erreur
  const [editAllocError, setEditAllocError] = useState('');

  // Fonction d'ouverture du modal de modification pour une allocation donnée
  const handleOpenEditAlloc = (alloc: MoneyAllocation) => {
    // Allocation cible
    setEditingAlloc(alloc);
    // Initialisation du montant
    setEditAllocAmount(String(alloc.amount));
    // Initialisation du motif
    setEditAllocNote(alloc.note || '');
    // Initialisation de la date
    setEditAllocDate(alloc.date);
    // Initialisation de l'enfant
    setEditAllocChildId(alloc.childId);
    // Réinitialisation de l'erreur
    setEditAllocError('');
  };

  // Fonction d'enregistrement des modifications de l'allocation
  const handleSaveEditAlloc = async () => {
    // Sécurité si aucune allocation sélectionnée
    if (!editingAlloc) return;
    // Conversion numérique du montant
    const num = parseFloat(editAllocAmount.replace(',', '.'));
    // Validation du montant
    if (isNaN(num) || num <= 0) {
      setEditAllocError('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }
    // Validation de l'enfant sélectionné
    if (!editAllocChildId) {
      setEditAllocError('Veuillez sélectionner un enfant destinataire.');
      return;
    }
    // Activation de l'indicateur de chargement
    setEditAllocBusy(true);
    // Appel de l'action de mise à jour atomique
    const res = actions.updateAllocation(editingAlloc.id, {
      amount: num,
      note: editAllocNote.trim() || undefined,
      date: editAllocDate,
      childId: editAllocChildId,
    });
    // Désactivation de l'indicateur
    setEditAllocBusy(false);
    // Gestion du résultat
    if (!res.ok) {
      setEditAllocError(res.error || 'Erreur lors de la modification.');
    } else {
      setEditingAlloc(null);
      Alert.alert('Succès', 'Allocation mise à jour avec succès.');
    }
  };

  // Fonction de suppression de l'allocation avec confirmation préalable
  const handleDeleteAlloc = () => {
    // Sécurité si aucune allocation sélectionnée
    if (!editingAlloc) return;
    // Alerte native de confirmation
    Alert.alert(
      // Titre
      isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
      // Message d'avertissement
      isRTL
        ? 'هل أنت متأكد من حذف هذه العملية؟ سيتم استرجاع المبلغ في الرصيد وحذف المصروف المرتبط.'
        : 'Êtes-vous sûr de vouloir supprimer cette allocation ? Le montant sera remboursé dans la réserve et la dépense parent liée sera supprimée.',
      [
        // Annulation
        { text: isRTL ? 'إلغاء' : 'Annuler', style: 'cancel' },
        // Confirmation destructrice
        {
          text: isRTL ? 'حذف' : 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Suppression atomique
            actions.deleteAllocation(editingAlloc.id);
            // Fermeture du modal
            setEditingAlloc(null);
            // Notification de succès
            Alert.alert('Supprimée', 'L’allocation a été supprimée avec succès.');
          },
        },
      ]
    );
  };

  // Approvisionner la réserve
  const submitTopup = async () => {
    const num = parseFloat(topupAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      setTopupError('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }

    setTopupBusy(true);
    setTopupError('');

    const res = await actions.addFamilyFunds(num);
    setTopupBusy(false);

    if (!res.ok) {
      setTopupError(res.error ?? 'Erreur lors de l’approvisionnement.');
    } else {
      setTopupModal(false);
      setTopupAmount('');
      Alert.alert(
        'Réserve approvisionnée',
        `${formatTND(num)} ont été ajoutés à votre réserve familiale.`
      );
    }
  };

  // Effectuer une allocation vers un enfant
  const submitAllocation = async () => {
    if (!selectedChildId) {
      setAllocError('Veuillez sélectionner un enfant destinataire.');
      return;
    }

    const num = parseFloat(allocAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      setAllocError('Veuillez entrer un montant valide supérieur à 0.');
      return;
    }

    if (num > familyFund.balance) {
      setAllocError(
        `Fonds insuffisants dans la réserve. Solde disponible : ${formatTND(familyFund.balance)}`
      );
      return;
    }

    setAllocBusy(true);
    setAllocError('');

    const child = childrenList.find((c) => c.id === selectedChildId);
    const res = await actions.allocateMoney(
      selectedChildId,
      num,
      allocNote.trim() || undefined
    );
    setAllocBusy(false);

    if (!res.ok) {
      setAllocError(res.error ?? 'Erreur lors de l’allocation.');
    } else {
      setAllocAmount('');
      setAllocNote('');
      Alert.alert(
        'Allocation confirmée',
        `${formatTND(num)} ont été alloués avec succès à ${child?.name}.`
      );
    }
  };

  return (
    <Screen
      title={t('finances_familiales')}
      back
      onBack={() => router.replace('/(tabs)')}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
          TRÉSORERIE & ALLOCATIONS · FOYER
        </Eyebrow>

        {/* CARTE DE LA RÉSERVE FAMILIALE */}
        <View style={styles.reserveCard}>
          <View
            style={[
              styles.reserveHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View style={styles.reserveTag}>
              <Ionicons name="shield-checkmark" size={16} color={colors.mint} />
              <Text style={styles.reserveTagText}>RÉSERVE FAMILIALE</Text>
            </View>

            <TouchableOpacity
              style={styles.topupBtn}
              onPress={() => {
                setTopupAmount('');
                setTopupError('');
                setTopupModal(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle" size={16} color={colors.white} />
              <Text style={styles.topupBtnText}>Approvisionner</Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.reserveBalance,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {formatTND(familyFund.balance)}
          </Text>
          <Text
            style={[
              styles.reserveSub,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            Solde disponible immédiatement pour les enfants
          </Text>

          <View style={styles.reserveDivider} />

          <View style={styles.reserveMetrics}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>
                {formatTND(familyFund.totalAdded || 0)}
              </Text>
              <Text style={styles.metricLbl}>Total approvisionné</Text>
            </View>

            <View style={styles.metricSep} />

            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>
                {formatTND(familyFund.totalAllocated || 0)}
              </Text>
              <Text style={styles.metricLbl}>Total alloué aux enfants</Text>
            </View>
          </View>
        </View>

        {/* SECTION FORMULAIRE D'ALLOCATION D'ARGENT */}
        <View style={styles.sectionCard}>
          <SectionTitle style={{ marginBottom: 4 }}>
            {t('donner_argent')}
          </SectionTitle>
          <Body style={{ marginBottom: 14 }}>
            Sélectionnez l'enfant, saisissez le montant en dinars et validez le
            transfert instantané.
          </Body>

          {allocError ? (
            <AlertBanner tone="danger" title={t('erreur')} detail={allocError} />
          ) : null}

          {/* Choix de l'enfant (Chips interactifs) */}
          <Text style={styles.fieldLabel}>Sélectionnez l’enfant :</Text>

          {childrenList.length === 0 ? (
            <View style={styles.noChildrenNotice}>
              <Text style={styles.noChildrenText}>
                Aucun enfant enregistré. Ajoutez d'abord un enfant depuis l'onglet
                Enfants.
              </Text>
              <Button
                label="+ Ajouter un enfant"
                variant="secondary"
                onPress={() => router.push('/(admin)/enfants')}
              />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childChipsScroll}
            >
              {childrenList.map((ch) => {
                const isSelected = selectedChildId === ch.id;
                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={[
                      styles.childChip,
                      isSelected && styles.childChipSelected,
                    ]}
                    onPress={() => {
                      setSelectedChildId(ch.id);
                      setAllocError('');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={isSelected ? colors.white : colors.forest}
                    />
                    <Text
                      style={[
                        styles.childChipText,
                        isSelected && styles.childChipTextSelected,
                      ]}
                    >
                      {ch.name}
                    </Text>
                    <Text
                      style={[
                        styles.childChipBalance,
                        isSelected && styles.childChipBalanceSelected,
                      ]}
                    >
                      ({formatTND(ch.balance || 0)})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Montant et Note */}
          <Input
            label="Montant à donner (TND)"
            value={allocAmount}
            onChangeText={(txt) => {
              setAllocAmount(txt);
              setAllocError('');
            }}
            keyboardType="decimal-pad"
            placeholder="Ex: 15.000"
          />

          <Input
            label="Motif (optionnel)"
            value={allocNote}
            onChangeText={setAllocNote}
            placeholder="Ex: Argent de poche de la semaine, récompense..."
          />

          <Button
            label="Transférer les fonds à l’enfant"
            onPress={submitAllocation}
            loading={allocBusy}
            disabled={childrenList.length === 0 || !selectedChildId}
          />
        </View>

        {/* SECTION HISTORIQUE DES ALLOCATIONS EFFECTUÉES */}
        <View style={styles.historySection}>
          <SectionTitle>{t('historique_familial')} des allocations</SectionTitle>

          {myAllocations.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="time-outline" size={36} color={colors.gray} />
              <Text style={styles.emptyTitle}>Aucune allocation effectuée</Text>
              <Text style={styles.emptySub}>
                Toutes les sommes données à vos enfants apparaîtront ici avec date,
                montant et motif.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {myAllocations.map((a) => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    styles.allocRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                  onPress={() => handleOpenEditAlloc(a)}
                  activeOpacity={0.7}
                >
                  <View style={styles.allocIcon}>
                    <Ionicons name="gift-outline" size={20} color={colors.forest} />
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.allocChildName}>{a.childName}</Text>
                    <Text style={styles.allocNote}>
                      {a.note || 'Argent de poche'} · {a.date}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.allocAmount}>
                      −{formatTND(a.amount)}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      Modifier ›
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL APPROVISIONNEMENT DE RÉSERVE */}
      <Modal
        visible={topupModal}
        transparent
        animationType="slide"
        onRequestClose={() => setTopupModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Approvisionner la réserve</Text>
                <Text style={styles.modalSub}>
                  Ajoutez des fonds pour financer les allocations de vos enfants.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setTopupModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={20} color={colors.forest} />
              </TouchableOpacity>
            </View>

            {topupError ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={topupError} />
            ) : null}

            <Input
              label="Montant à ajouter (TND)"
              value={topupAmount}
              onChangeText={(txt) => {
                setTopupAmount(txt);
                setTopupError('');
              }}
              keyboardType="decimal-pad"
              placeholder="Ex: 100.000"
              autoFocus
            />

            <View style={styles.modalBtnGroup}>
              <Button
                label="Confirmer l’approvisionnement"
                onPress={submitTopup}
                loading={topupBusy}
              />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setTopupModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE MODIFICATION OU SUPPRESSION D'UNE ALLOCATION EXISTANTE */}
      <Modal
        // Visibilité conditionnée par la présence d'une allocation en cours d'édition
        visible={editingAlloc !== null}
        // Fond transparent pour afficher l'assombrissement
        transparent
        // Animation glissante depuis le bas
        animationType="slide"
        // Gestion de la fermeture sur Android
        onRequestClose={() => setEditingAlloc(null)}
      >
        {/* Arrière-plan semi-transparent */}
        <View style={styles.modalBackdrop}>
          {/* Feuille modale blanche arrondie */}
          <View style={styles.modalSheet}>
            {/* En-tête de la modale avec titre et bouton fermer */}
            <View style={styles.modalHeader}>
              <View>
                {/* Titre principal */}
                <Text style={styles.modalTitle}>Modifier l’allocation</Text>
                {/* Sous-titre explicatif */}
                <Text style={styles.modalSub}>
                  Modifiez le montant, le motif ou supprimez cette allocation.
                </Text>
              </View>
              {/* Bouton de fermeture tactile */}
              <TouchableOpacity
                onPress={() => setEditingAlloc(null)}
                style={styles.modalClose}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.forest} />
              </TouchableOpacity>
            </View>

            {/* Bannière d'erreur si la validation échoue */}
            {editAllocError ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={editAllocError} />
            ) : null}

            {/* Sélection de l'enfant bénéficiaire */}
            <Text style={styles.fieldLabel}>Bénéficiaire :</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.childChipsScroll}
            >
              {childrenList.map((ch) => {
                const isSelected = editAllocChildId === ch.id;
                return (
                  <TouchableOpacity
                    key={ch.id}
                    style={[
                      styles.childChip,
                      isSelected && styles.childChipSelected,
                    ]}
                    onPress={() => setEditAllocChildId(ch.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="person"
                      size={16}
                      color={isSelected ? colors.white : colors.forest}
                    />
                    <Text
                      style={[
                        styles.childChipText,
                        isSelected && styles.childChipTextSelected,
                      ]}
                    >
                      {ch.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Champ de saisie du montant */}
            <Input
              label="Montant (TND)"
              value={editAllocAmount}
              onChangeText={setEditAllocAmount}
              keyboardType="decimal-pad"
              placeholder="Ex: 20.000"
            />

            {/* Champ de saisie du motif */}
            <Input
              label="Motif (optionnel)"
              value={editAllocNote}
              onChangeText={setEditAllocNote}
              placeholder="Ex: Argent de poche"
            />

            {/* Champ de saisie de la date */}
            <Input
              label="Date (AAAA-MM-JJ)"
              value={editAllocDate}
              onChangeText={setEditAllocDate}
              placeholder="Ex: 2026-11-20"
            />

            {/* Groupe de boutons d'action */}
            <View style={styles.modalBtnGroup}>
              {/* Bouton de sauvegarde des modifications */}
              <Button
                label="Enregistrer les modifications"
                onPress={handleSaveEditAlloc}
                loading={editAllocBusy}
              />
              {/* Bouton de suppression destructrice */}
              <TouchableOpacity
                onPress={handleDeleteAlloc}
                style={{
                  backgroundColor: '#FEE2E2',
                  paddingVertical: 14,
                  borderRadius: radius.card,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: colors.coral,
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: colors.coral, fontWeight: '700', fontSize: 14 }}>
                  Supprimer cette allocation
                </Text>
              </TouchableOpacity>
              {/* Bouton d'annulation */}
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setEditingAlloc(null)}
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
    paddingBottom: 36,
  },
  reserveCard: {
    backgroundColor: colors.forest,
    borderRadius: 22,
    padding: 20,
    marginVertical: 12,
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  reserveHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reserveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  reserveTagText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 196, 182, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  topupBtnText: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '700',
  },
  reserveBalance: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 1,
  },
  reserveSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  reserveDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 14,
  },
  reserveMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.white,
  },
  metricLbl: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  metricSep: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
    marginBottom: 8,
  },
  noChildrenNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  noChildrenText: {
    fontSize: 12,
    color: colors.gray,
    lineHeight: 16,
  },
  childChipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 14,
  },
  childChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  childChipSelected: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  childChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  childChipTextSelected: {
    color: colors.white,
  },
  childChipBalance: {
    fontSize: 11,
    color: colors.gray,
  },
  childChipBalanceSelected: {
    color: colors.mint,
  },
  historySection: {
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: colors.gray,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  allocRow: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  allocIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocChildName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  allocNote: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  allocAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coral,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
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
    backgroundColor: colors.warm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnGroup: {
    gap: 10,
    marginTop: 14,
  },
});

