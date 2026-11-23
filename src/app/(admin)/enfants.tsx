/**
 * FICHIER : src/app/(admin)/enfants.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-005-ENFANTS
 * ÉCRAN : GESTION DES COMPTES ENFANTS (Children Management)
 *
 * MISSION DU FICHIER :
 * Permettre au parent tuteur :
 * 1. De visualiser la liste de tous ses enfants rattachés avec leur solde disponible et allocations reçues.
 * 2. De créer un compte enfant indépendant avec identifiants de connexion dédiés (email et mot de passe).
 * 3. De sécuriser la transmission des identifiants au parent pour que l'enfant puisse se connecter seul.
 * 4. D'allouer rapidement de l'argent de poche directement depuis la fiche de chaque enfant.
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
import type { User } from '@/state/types';
import { formatTND, todayISO } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import { isValidGmail, passwordChecks } from '@/utils/security';
import {
  isChildrenCategory,
  findEnfantCategory,
  CANONICAL_ENFANT_ID,
  CANONICAL_ENFANT_NAME,
} from '@/utils/categoryMatching';

export default function ChildrenScreen() {
  const router = useRouter();
  const { db, me, actions } = useStore();
  const { t, isRTL } = useTranslation();

  // Modal d'ajout d'enfant
  const [createModal, setCreateModal] = useState(false);
  const [childName, setChildName] = useState('');
  const [childEmail, setChildEmail] = useState('');
  const [childPassword, setChildPassword] = useState('');
  const [childError, setChildError] = useState('');
  const [createBusy, setCreateBusy] = useState(false);

  // Modal d'affichage sécurisé des identifiants créés
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    pass: string;
  } | null>(null);

  // Modal donner de l'argent
  const [giveModal, setGiveModal] = useState(false);
  const [selectedChild, setSelectedChild] = useState<User | null>(null);
  const [giveAmount, setGiveAmount] = useState('');
  const [giveNote, setGiveNote] = useState('');
  const [giveError, setGiveError] = useState('');
  const [giveBusy, setGiveBusy] = useState(false);
  const [showOverBudgetWarning, setShowOverBudgetWarning] = useState(false);

  // Modal de réinitialisation du mot de passe d'un enfant
  const [resetModal, setResetModal] = useState(false);
  const [childToReset, setChildToReset] = useState<User | null>(null);
  const [newTempPassword, setNewTempPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  // Modal d'affichage sécurisé du mot de passe réinitialisé
  const [resetSuccessCreds, setResetSuccessCreds] = useState<{
    name: string;
    email: string;
    pass: string;
  } | null>(null);


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

  // Liste des enfants
  const childrenList = db.users.filter(
    (u) => u.role === 'child' && (u.parentId === me?.id || u.familyId === me?.familyId)
  );

  // État d'expansion de l'historique mensuel par enfant
  const [expandedChildHistory, setExpandedChildHistory] = useState<Record<string, boolean>>({});

  const toggleChildHistory = (childId: string) => {
    setExpandedChildHistory((prev) => ({
      ...prev,
      [childId]: !prev[childId],
    }));
  };

  // Calcul de l'historique mensuel réel sur les 4 derniers mois pour un enfant depuis SQLite
  const getChildMonthlyHistory = (childId: string) => {
    const months = [];
    const baseDate = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() - i, 1);
      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const mStart = `${mKey}-01`;
      const mEnd = `${mKey}-${String(lastDay).padStart(2, '0')}`;

      // Budget de l'enfant pour ce mois
      const b = db.budgets.find(
        (bg) => bg.userId === childId && bg.start <= mEnd && bg.end >= mStart
      );

      // Allocations reçues pour ce mois
      const allocsInMonth = db.allocations
        .filter((a) => a.childId === childId && a.date >= mStart && a.date <= mEnd)
        .reduce((s, a) => s + a.amount, 0);

      const allocated = b?.total || allocsInMonth;

      // Dépenses de l'enfant pour ce mois
      const eTot = db.expenses
        .filter((e) => e.userId === childId && e.date >= mStart && e.date <= mEnd)
        .reduce((s, e) => s + e.amount, 0);

      // Achats de l'enfant pour ce mois
      const pTot = db.purchases
        .filter((p) => p.userId === childId && p.date >= mStart && p.date <= mEnd)
        .reduce((s, p) => s + p.price, 0);

      const spent = eTot + pTot;
      const remaining = Math.max(0, allocated - spent);
      const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

      const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      const monthNamesAr = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      const monthLabel = isRTL
        ? `${monthNamesAr[d.getMonth()]} ${d.getFullYear()}`
        : `${monthNames[d.getMonth()]} ${d.getFullYear()}`;

      months.push({
        monthKey: mKey,
        monthLabel,
        allocated,
        spent,
        remaining,
        pct,
      });
    }
    return months;
  };

  const handleOpenCreate = () => {
    setChildName('');
    setChildEmail('');
    setChildPassword('');
    setChildError('');
    setCreateModal(true);
  };

  const submitCreateChild = async () => {
    if (!childName.trim()) {
      setChildError(t('erreur_nom_requis'));
      return;
    }

    if (!isValidGmail(childEmail.trim())) {
      setChildError(t('erreur_email_gmail_requis'));
      return;
    }

    if (childPassword.length < 8) {
      setChildError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setCreateBusy(true);
    setChildError('');

    const res = await actions.createChild(
      childName.trim(),
      childEmail.trim(),
      childPassword
    );

    setCreateBusy(false);

    if (!res.ok) {
      setChildError(res.error ?? 'Erreur lors de la création du compte enfant.');
    } else {
      setCreateModal(false);
      setCreatedCredentials({
        name: childName.trim(),
        email: childEmail.trim().toLowerCase(),
        pass: childPassword,
      });
    }
  };

  const handleOpenGive = (ch: User) => {
    setSelectedChild(ch);
    setGiveAmount('');
    setGiveNote('');
    setGiveError('');
    setShowOverBudgetWarning(false);
    setGiveModal(true);
  };

  const executeAllocation = async (num: number) => {
    if (!selectedChild || giveBusy) return;
    setGiveBusy(true);
    setGiveError('');

    try {
      const res = await actions.allocateMoney(
        selectedChild.id,
        num,
        giveNote.trim() || undefined
      );

      if (!res.ok) {
        setGiveError(res.error ?? 'Erreur lors de l’allocation.');
      } else {
        setGiveModal(false);
        setShowOverBudgetWarning(false);
        const isExceeded = (catEnfantBudget > 0 && currentEnfantSpent + num > catEnfantBudget) || catEnfantBudget === 0;
        Alert.alert(
          isRTL ? 'تأكيد العملية' : 'Allocation réussie',
          isRTL
            ? `تم تحويل ${formatTND(num)} إلى ${selectedChild.name}.${isExceeded ? ' تم تسجيل التحويل مع تجاوز الميزانية وسيعرض باللون الأحمر في التحليلات.' : ''}`
            : `${formatTND(num)} ont été crédités sur le solde de ${selectedChild.name}.${isExceeded ? ' (Dépassement enregistré et visible en rouge dans les analyses)' : ''}`
        );
      }
    } finally {
      setGiveBusy(false);
    }
  };

  const submitGiveMoney = async () => {
    if (!selectedChild || giveBusy) return;
    const num = parseFloat(giveAmount.replace(',', '.'));
    if (isNaN(num) || num <= 0) {
      setGiveError(isRTL ? 'الرجاء إدخال مبلغ صحيح أكبر من صفر.' : 'Veuillez saisir un montant valide supérieur à 0.');
      return;
    }

    const projectedSpent = currentEnfantSpent + num;
    const willExceed = (catEnfantBudget > 0 && projectedSpent > catEnfantBudget) || catEnfantBudget === 0;

    // Avertir le parent si le montant dépasse le budget alloué à la catégorie Enfants
    if (willExceed && !showOverBudgetWarning) {
      setShowOverBudgetWarning(true);
      return;
    }

    // Allocation validée (ou confirmation de dépassement acceptée)
    await executeAllocation(num);
  };

  /**
   * MISSION DE LA FONCTION : handleOpenReset
   *   Ouvre le formulaire modal de réinitialisation du mot de passe de l'enfant ciblé.
   */
  const handleOpenReset = (ch: User) => {
    // Sélection de l'enfant à réinitialiser
    setChildToReset(ch);
    // Mot de passe temporaire par défaut suggéré
    setNewTempPassword('Masrouf2026!');
    // Réinitialisation de l'erreur éventuelle
    setResetError('');
    // Affichage de la boîte modale
    setResetModal(true);
  };

  /**
   * MISSION DE LA FONCTION : submitResetPassword
   *   Exécute la mise à jour du mot de passe de l'enfant dans SQLite via le store.
   */
  const submitResetPassword = async () => {
    // Si aucun enfant ciblé, abandon immédiat
    if (!childToReset) return;
    // Contrôle de longueur minimale (8 caractères)
    if (newTempPassword.length < 8) {
      setResetError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    // Indicateur de chargement actif
    setResetBusy(true);
    // Réinitialisation de l'erreur
    setResetError('');

    // Appel à l'action de réinitialisation sécurisée
    const res = await actions.resetChildPassword(childToReset.id, newTempPassword);
    // Fin du chargement
    setResetBusy(false);

    // En cas d'erreur
    if (!res.ok) {
      setResetError(res.error ?? 'Erreur lors de la réinitialisation.');
    } else {
      // Fermeture du modal de saisie
      setResetModal(false);
      // Affichage du modal récapitulatif des nouveaux identifiants pour le parent
      setResetSuccessCreds({
        name: childToReset.name,
        email: childToReset.email,
        pass: newTempPassword,
      });
    }
  };

  return (
    <Screen title={t('enfants')} back onBack={() => router.replace('/(tabs)')}>
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        FOYER & FAMILLE · GESTION DES ENFANTS
      </Eyebrow>

      <View
        style={[
          styles.headerRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <SectionTitle style={{ marginBottom: 0, flex: 1 }}>
          Mes Enfants ({childrenList.length})
        </SectionTitle>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleOpenCreate}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={18} color={colors.white} />
          <Text style={styles.addBtnText}>Ajouter un enfant</Text>
        </TouchableOpacity>
      </View>

      <Body style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 16 }}>
        Chaque enfant dispose de son propre compte sécurisé pour suivre son argent
        de poche et apprendre à gérer son budget en autonomie.
      </Body>

      {/* LISTE DES CARTES ENFANTS */}
      {childrenList.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="people-outline" size={48} color={colors.gray} />
          <Text style={styles.emptyTitle}>Aucun enfant pour le moment</Text>
          <Text style={styles.emptySub}>
            Cliquez sur le bouton ci-dessous pour créer le premier compte enfant de
            votre foyer.
          </Text>
          <Button label="+ Ajouter un enfant" onPress={handleOpenCreate} />
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {childrenList.map((ch) => {
            // Recherche du budget personnel de l'enfant dans la base
            const chBudget =
              db.budgets.find(
                (b) => b.userId === ch.id && b.start <= todayISO() && todayISO() <= b.end
              ) || db.budgets.find((b) => b.userId === ch.id);
            // Montant alloué à l'enfant
            const allocated = chBudget?.total || ch.allocatedTotal || 0;
            // Somme des dépenses de l'enfant
            const chExpenses = db.expenses
              .filter((e) => e.userId === ch.id && (chBudget ? e.date >= chBudget.start && e.date <= chBudget.end : true))
              .reduce((s, e) => s + e.amount, 0);
            // Somme des achats de l'enfant
            const chPurchases = db.purchases
              .filter((p) => p.userId === ch.id && (chBudget ? p.date >= chBudget.start && p.date <= chBudget.end : true))
              .reduce((s, p) => s + p.price, 0);
            // Total dépensé par l'enfant
            const spent = chExpenses + chPurchases;
            // Solde disponible restant
            const remaining = Math.max(0, allocated - spent);
            // Pourcentage budgétaire consommé
            const pct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

            return (
              <View key={ch.id} style={styles.childCard}>
                <View
                  style={[
                    styles.childCardTop,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.childAvatarWrap}>
                    <Ionicons name="person" size={26} color={colors.forest} />
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={styles.childCardName}>{ch.name}</Text>
                    <Text style={styles.childCardEmail}>{ch.email}</Text>
                    <Text style={styles.childCardDate}>
                      Inscrit le {ch.createdAt?.split('T')[0] || 'Récemment'}
                    </Text>
                  </View>

                  {/* Badge descriptif du compte enfant sans mention d'état de blocage */}
                  <View style={styles.childBadge}>
                    <Text style={styles.childBadgeText}>{t('compte_enfant') || 'Enfant'}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Synthèse budgétaire : alloué, dépensé, restant */}
                <View style={styles.statsRow}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Alloué</Text>
                    <Text style={styles.statValAllocated}>
                      {formatTND(allocated)}
                    </Text>
                  </View>

                  <View style={styles.statSep} />

                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Dépensé</Text>
                    <Text style={styles.statValSpent}>
                      {formatTND(spent)}
                    </Text>
                  </View>

                  <View style={styles.statSep} />

                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Restant</Text>
                    <Text style={styles.statValBalance}>
                      {formatTND(remaining)}
                    </Text>
                  </View>
                </View>

                {/* Barre horizontale de progression du budget de l'enfant */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${Math.min(pct, 100)}%` },
                        pct > 100 && { backgroundColor: colors.coral },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressPctText, pct > 100 && { color: colors.coral }]}>
                    {pct}% consommé
                  </Text>
                </View>

                {/* Actions disponibles pour le parent sur le compte de l'enfant */}
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.giveBtn}
                    onPress={() => handleOpenGive(ch)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cash-outline" size={16} color={colors.white} />
                    <Text style={styles.giveBtnText}>Donner de l'argent</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resetPwBtn}
                    onPress={() => handleOpenReset(ch)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="key-outline" size={16} color={colors.forest} />
                    <Text style={styles.resetPwBtnText}>Réinitialiser mot de passe</Text>
                  </TouchableOpacity>
                </View>

                {/* Bouton pour afficher/masquer l'historique et la comparaison mensuelle */}
                <TouchableOpacity
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 10,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: '#F4F7F6',
                    gap: 6,
                  }}
                  onPress={() => toggleChildHistory(ch.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={expandedChildHistory[ch.id] ? 'chevron-up' : 'calendar-outline'}
                    size={16}
                    color={colors.forest}
                  />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.forest }}>
                    {expandedChildHistory[ch.id]
                      ? (isRTL ? 'إخفاء المقارنة الشهرية' : 'Masquer la comparaison mensuelle')
                      : (isRTL ? 'مقارنة الأشهر السابقة والتقدم' : 'Progression & Comparaison des mois')}
                  </Text>
                </TouchableOpacity>

                {/* Vue dépliante de comparaison des mois passés */}
                {expandedChildHistory[ch.id] && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E8ECEF', gap: 10 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: colors.forest, textAlign: isRTL ? 'right' : 'left' }}>
                      {isRTL ? 'سجل الأشهر السابقة (SQLite)' : 'Historique des 4 derniers mois (SQLite)'}
                    </Text>

                    {getChildMonthlyHistory(ch.id).map((hm) => (
                      <View
                        key={hm.monthKey}
                        style={{
                          backgroundColor: '#FAFCFB',
                          borderRadius: 10,
                          padding: 10,
                          borderWidth: 1,
                          borderColor: '#EDF2F0',
                          gap: 6,
                        }}
                      >
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.forest }}>
                            {hm.monthLabel}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '800',
                              color: hm.pct > 100 ? colors.coral : colors.forest,
                            }}
                          >
                            {hm.pct}% consommé
                          </Text>
                        </View>

                        {/* Progression bar mini */}
                        <View style={{ height: 6, backgroundColor: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                          <View
                            style={{
                              height: '100%',
                              width: `${Math.min(hm.pct, 100)}%`,
                              backgroundColor: hm.pct > 100 ? colors.coral : colors.forest,
                            }}
                          />
                        </View>

                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 11, color: colors.gray }}>
                            {isRTL ? 'المخصص : ' : 'Alloué : '}{formatTND(hm.allocated)}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.gray }}>
                            {isRTL ? 'المصروف : ' : 'Dépensé : '}{formatTND(hm.spent)}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.forest, fontWeight: '600' }}>
                            {isRTL ? 'المتبقي : ' : 'Restant : '}{formatTND(hm.remaining)}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* MODAL CRÉATION ENFANT */}
      <Modal
        visible={createModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un enfant</Text>
              <TouchableOpacity
                onPress={() => setCreateModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.forest} />
              </TouchableOpacity>
            </View>

            {childError ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={childError} />
            ) : null}

            <Input
              label="Nom complet de l'enfant"
              value={childName}
              onChangeText={(txt) => {
                setChildName(txt);
                setChildError('');
              }}
              placeholder="Ex: Youssef Ben Ali"
              autoFocus
            />

            <Input
              label="Adresse email de connexion (Gmail)"
              value={childEmail}
              onChangeText={(txt) => {
                setChildEmail(txt);
                setChildError('');
              }}
              keyboardType="email-address"
              placeholder="youssef.enfant@gmail.com"
            />

            <Input
              label="Mot de passe initial (8+ caractères)"
              value={childPassword}
              onChangeText={(txt) => {
                setChildPassword(txt);
                setChildError('');
              }}
              secure
              placeholder="Mot de passe secret"
            />

            <View style={styles.modalBtnGroup}>
              <Button
                label="Créer le compte enfant"
                onPress={submitCreateChild}
                loading={createBusy}
              />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setCreateModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SUCCÈS & IDENTIFIANTS DU COMPTE ENFANT CRÉÉ */}
      <Modal
        visible={!!createdCredentials}
        transparent
        animationType="fade"
        onRequestClose={() => setCreatedCredentials(null)}
      >
        <View style={styles.backdropCenter}>
          <View style={styles.credCard}>
            <View style={styles.credIconWrap}>
              <Ionicons name="checkmark-circle" size={44} color={colors.forest} />
            </View>

            <Text style={styles.credTitle}>Compte Enfant Créé !</Text>
            <Text style={styles.credSub}>
              Transmettez ces identifiants à votre enfant pour qu'il puisse se
              connecter à son Espace Enfant sur son téléphone :
            </Text>

            <View style={styles.credBox}>
              <View style={styles.credLine}>
                <Text style={styles.credLabel}>Nom :</Text>
                <Text style={styles.credValue}>{createdCredentials?.name}</Text>
              </View>
              <View style={styles.credLine}>
                <Text style={styles.credLabel}>Email :</Text>
                <Text style={styles.credValue}>{createdCredentials?.email}</Text>
              </View>
              <View style={styles.credLine}>
                <Text style={styles.credLabel}>Mot de passe :</Text>
                <Text style={[styles.credValue, { fontWeight: '800' }]}>
                  {createdCredentials?.pass}
                </Text>
              </View>
            </View>

            <Button
              label="C'est noté, fermer"
              onPress={() => setCreatedCredentials(null)}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL DONNER DE L'ARGENT */}
      <Modal
        visible={giveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setGiveModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  Allouer à {selectedChild?.name}
                </Text>
                <Text style={styles.modalSub}>
                  {isRTL ? 'ميزانية فئة الأطفال : ' : 'Budget catégorie Enfant : '}
                  <Text style={{ fontWeight: '700', color: colors.forest }}>
                    {formatTND(catEnfantBudget)}
                  </Text>
                  {` · ${isRTL ? 'المتبقي : ' : 'Disponible : '}`}
                  <Text
                    style={{
                      fontWeight: '700',
                      color: remainingEnfantBudget > 0 ? colors.forest : colors.coral,
                    }}
                  >
                    {formatTND(remainingEnfantBudget)}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setGiveModal(false);
                  setShowOverBudgetWarning(false);
                }}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.forest} />
              </TouchableOpacity>
            </View>

            {giveError ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={giveError} />
            ) : null}

            {showOverBudgetWarning ? (
              <View style={styles.warningAlertBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="warning" size={18} color={colors.coral} />
                  <Text style={styles.warningAlertTitle}>
                    {isRTL ? 'تنبيه : تجاوز ميزانية فئة الأطفال' : 'Attention : Dépassement du budget Enfant'}
                  </Text>
                </View>
                <Text style={styles.warningAlertText}>
                  {catEnfantBudget > 0
                    ? (isRTL
                      ? `هذا المبلغ (${formatTND(parseFloat(giveAmount.replace(',', '.')) || 0)}) يتجاوز الميزانية المخصصة لفئة الأطفال (المتبقي: ${formatTND(remainingEnfantBudget)} / المخطط: ${formatTND(catEnfantBudget)}). سيتم تسجيل التحويل وتحديده باللون الأحمر في التحليلات.`
                      : `Cette allocation de ${formatTND(parseFloat(giveAmount.replace(',', '.')) || 0)} dépasse le budget alloué à la catégorie « Enfant » (Budget restant : ${formatTND(remainingEnfantBudget)} / Prévu : ${formatTND(catEnfantBudget)}). Le virement sera effectué et apparaîtra en rouge dans vos analyses.`)
                    : (isRTL
                      ? `لم يتم تخصيص ميزانية مسبقة لفئة الأطفال لهذا الشهر (0.000 د.ت). سيتم تسجيل هذا المبلغ كتجاوز للميزانية وتوضيحه باللون الأحمر في التحليلات.`
                      : `Aucun budget n'a été alloué à la catégorie « Enfant » ce mois-ci (0.000 DT). Ce montant sera enregistré et mis en évidence en rouge dans vos analyses.`)}
                </Text>
              </View>
            ) : null}

            <Input
              label="Montant de l'allocation (TND)"
              value={giveAmount}
              onChangeText={(txt) => {
                setGiveAmount(txt);
                setGiveError('');
                setShowOverBudgetWarning(false);
              }}
              keyboardType="decimal-pad"
              placeholder="Ex: 25.000"
              autoFocus
            />

            <Input
              label="Motif ou note pour l'enfant"
              value={giveNote}
              onChangeText={setGiveNote}
              placeholder="Ex: Semaine de cours, félicitations..."
            />

            <View style={styles.modalBtnGroup}>
              <Button
                label={
                  showOverBudgetWarning
                    ? (isRTL ? 'تأكيد التحويل رغم التجاوز' : 'Confirmer malgré le dépassement')
                    : (isRTL ? 'تأكيد التحويل' : 'Confirmer le virement')
                }
                variant={showOverBudgetWarning ? 'danger' : 'primary'}
                onPress={submitGiveMoney}
                loading={giveBusy}
                disabled={giveBusy}
              />
              <Button
                label={showOverBudgetWarning ? (isRTL ? 'تعديل المبلغ' : 'Modifier le montant') : (isRTL ? 'Annuler' : 'Annuler')}
                variant="secondary"
                onPress={() => {
                  if (showOverBudgetWarning) {
                    setShowOverBudgetWarning(false);
                  } else {
                    setGiveModal(false);
                  }
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL RÉINITIALISATION DU MOT DE PASSE DE L'ENFANT */}
      <Modal
        visible={resetModal}
        transparent
        animationType="slide"
        onRequestClose={() => setResetModal(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Réinitialiser le mot de passe
                </Text>
                <Text style={styles.modalSub}>
                  Compte : {childToReset?.name} ({childToReset?.email})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setResetModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.forest} />
              </TouchableOpacity>
            </View>

            {resetError ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={resetError} />
            ) : null}

            <Input
              label="Nouveau mot de passe temporaire (8+ car.)"
              value={newTempPassword}
              onChangeText={(txt) => {
                setNewTempPassword(txt);
                setResetError('');
              }}
              placeholder="Ex: Masrouf2026!"
              autoFocus
            />

            <View style={styles.modalBtnGroup}>
              <Button
                label="Valider le nouveau mot de passe"
                onPress={submitResetPassword}
                loading={resetBusy}
              />
              <Button
                label="Annuler"
                variant="secondary"
                onPress={() => setResetModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SUCCÈS RÉINITIALISATION MOT DE PASSE */}
      <Modal
        visible={!!resetSuccessCreds}
        transparent
        animationType="fade"
        onRequestClose={() => setResetSuccessCreds(null)}
      >
        <View style={styles.backdropCenter}>
          <View style={styles.credCard}>
            <View style={styles.credIconWrap}>
              <Ionicons name="key" size={44} color={colors.forest} />
            </View>

            <Text style={styles.credTitle}>Mot de passe réinitialisé !</Text>
            <Text style={styles.credSub}>
              Transmettez ce nouveau mot de passe temporaire à votre enfant :
            </Text>

            <View style={styles.credBox}>
              <View style={styles.credLine}>
                <Text style={styles.credLabel}>Nom :</Text>
                <Text style={styles.credValue}>{resetSuccessCreds?.name}</Text>
              </View>
              <View style={styles.credLine}>
                <Text style={styles.credLabel}>Email :</Text>
                <Text style={styles.credValue}>{resetSuccessCreds?.email}</Text>
              </View>
              <View style={styles.credLine}>
                <Text style={styles.credLabel}>Nouveau mot de passe :</Text>
                <Text style={[styles.credValue, { fontWeight: '800' }]}>
                  {resetSuccessCreds?.pass}
                </Text>
              </View>
            </View>

            <Button
              label="C'est noté, fermer"
              onPress={() => setResetSuccessCreds(null)}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.forest,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    lineHeight: 18,
    marginVertical: 12,
  },
  childCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  childCardTop: {
    alignItems: 'center',
  },
  childAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childCardName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.forest,
  },
  childCardEmail: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 1,
  },
  childCardDate: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  childBadge: {
    backgroundColor: colors.mint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  childBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forest,
  },
  statusPill: {
    backgroundColor: colors.mint,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forest,
  },
  divider: {
    height: 1,
    backgroundColor: colors.warm,
    marginVertical: 14,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.gray,
    marginBottom: 4,
  },
  statValBalance: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.forest,
  },
  statValAllocated: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.forest,
  },
  statValSpent: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.coral,
  },
  statSep: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  progressContainer: {
    marginTop: 12,
    gap: 4,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.forest,
    borderRadius: 4,
  },
  progressPctText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.muted,
    textAlign: 'right',
  },
  actionRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.warm,
    gap: 8,
  },
  giveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.forest,
    paddingVertical: 10,
    borderRadius: 12,
  },
  giveBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  resetPwBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.mint,
    paddingVertical: 10,
    borderRadius: 12,
  },
  resetPwBtnText: {
    color: colors.forest,
    fontSize: 13,
    fontWeight: '700',
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
  backdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  credCard: {
    width: '100%',
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  credIconWrap: {
    marginBottom: 10,
  },
  credTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.forest,
    marginBottom: 8,
  },
  credSub: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  credBox: {
    width: '100%',
    backgroundColor: colors.warm,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
    marginBottom: 20,
  },
  credLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credLabel: {
    fontSize: 13,
    color: colors.gray,
    fontWeight: '600',
  },
  credValue: {
    fontSize: 14,
    color: colors.forest,
    fontWeight: '700',
  },
  warningAlertBox: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.coral,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
  },
  warningAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coral,
  },
  warningAlertText: {
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 18,
  },
});
