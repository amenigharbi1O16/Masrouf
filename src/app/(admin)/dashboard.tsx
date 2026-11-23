/**
 * FICHIER : src/app/(admin)/dashboard.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-004-FAMILY-DASHBOARD
 * ÉCRAN : TABLEAU DE BORD FAMILIAL DU PARENT (Parent Family Dashboard)
 *
 * MISSION DU FICHIER :
 * Être le centre névralgique de gestion financière du foyer :
 * 1. En-tête : Message de bienvenue, nom du parent, nom de famille et notifications.
 * 2. Synthèse Financière : Réserve familiale disponible, fonds totaux, fonds alloués, dépenses globales.
 * 3. Vue des Enfants : Soldes disponibles, montants alloués, accès rapide aux profils.
 * 4. Actions Rapides : Ajouter un enfant, Donner de l'argent, Gérer le budget, Voir les demandes.
 * 5. Demandes d'argent en attente : Approbation et rejet instantanés avec mise à jour du solde dans SQLite.
 * 6. Activités récentes et répartition des dépenses du foyer.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDrawer } from '@/components/DrawerContext';
import { Screen } from '@/components/Screen';
import { Eyebrow, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import { formatTND, todayISO } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import {
  isChildrenCategory,
  findEnfantCategory,
  CANONICAL_ENFANT_ID,
} from '@/utils/categoryMatching';

export default function FamilyDashboard() {
  const router = useRouter();
  const { open } = useDrawer();
  const { db, me, unreadNotificationsCount } = useStore();
  const { t, isRTL } = useTranslation();

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

  // Liste des enfants rattachés au parent
  const childrenList = db.users.filter(
    (u) => u.role === 'child' && (u.parentId === me?.id || u.familyId === me?.familyId)
  );

  // Historique des allocations
  const myAllocations = db.allocations.filter((a) => a.parentId === me?.id);

  // Calcul des dépenses totales de la famille sans double comptage des virements d'argent de poche
  const totalFamilyExpenses = React.useMemo(() => {
    const parentExp = db.expenses
      .filter((e) => e.userId === me?.id && e.date >= startOfMonth && e.date <= endOfMonth)
      .reduce((sum, e) => sum + e.amount, 0);
    const parentPur = db.purchases
      .filter((p) => p.userId === me?.id && p.date >= startOfMonth && p.date <= endOfMonth)
      .reduce((sum, p) => sum + p.price, 0);
    return parentExp + parentPur;
  }, [db.expenses, db.purchases, me?.id, startOfMonth, endOfMonth]);

  return (
    <Screen plain title={t('espace_familial')}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {/* EN-TÊTE FAMILIAL */}
        <View
          style={[
            styles.headerRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <TouchableOpacity
            style={styles.menuIconBtn}
            onPress={open}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color={colors.forest} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginHorizontal: 10 }}>
            <Text
              style={[styles.headerGreeting, { textAlign: isRTL ? 'right' : 'left' }]}
            >
              Bonjour, {me?.name?.split(' ')[0] || 'Parent'} 👋
            </Text>
            <Text
              style={[styles.headerFamily, { textAlign: isRTL ? 'right' : 'left' }]}
            >
              {me?.familyName || 'Famille Masrouf'} · Espace Familial
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/notifications')}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.forest} />
            {unreadNotificationsCount > 0 && <View style={styles.notifBadgeDot} />}
          </TouchableOpacity>
        </View>

        {/* CARTE DE SYNTHÈSE : ENVELOPPE ENFANTS DU BUDGET FAMILIAL */}
        <View style={styles.fundCard}>
          <View
            style={[
              styles.fundCardHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {/* Badge de l'enveloppe Enfants */}
            <View style={styles.fundBadge}>
              <Ionicons name="people-outline" size={15} color={colors.mint} />
              <Text style={styles.fundBadgeText}>
                {isRTL ? 'ميزانية فئة الأطفال · الشهر' : 'ENVELOPPE ENFANTS · BUDGET DU MOIS'}
              </Text>
            </View>
            {/* Bouton de gestion du budget vers budget-analyses */}
            <TouchableOpacity
              style={styles.addFundsBtn}
              onPress={() => router.push('/(admin)/budget-analyses')}
              activeOpacity={0.7}
            >
              <Ionicons name="pie-chart-outline" size={15} color={colors.white} />
              <Text style={styles.addFundsBtnText}>
                {isRTL ? 'الميزانية' : 'Gérer budget'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text
            style={[styles.fundBalanceNumber, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {formatTND(remainingEnfantBudget)}
          </Text>
          <Text
            style={[styles.fundBalanceLabel, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {isRTL
              ? 'المبلغ المتبقي المتاح للأطفال من ميزانية الشهر'
              : 'Disponible ce mois pour les allocations enfants'}
          </Text>

          <View style={styles.fundStatsDivider} />

          <View style={styles.fundStatsRow}>
            <View style={styles.fundStatItem}>
              <Text style={styles.fundStatVal}>
                {formatTND(catEnfantBudget)}
              </Text>
              <Text style={styles.fundStatLbl}>
                {isRTL ? 'ميزانية الأطفال' : 'Budget catégorie'}
              </Text>
            </View>
            <View style={styles.fundStatSep} />
            <View style={styles.fundStatItem}>
              <Text style={styles.fundStatVal}>
                {formatTND(currentEnfantSpent)}
              </Text>
              <Text style={styles.fundStatLbl}>
                {isRTL ? 'الموزع للأطفال' : 'Déjà alloué'}
              </Text>
            </View>
            <View style={styles.fundStatSep} />
            <View style={styles.fundStatItem}>
              <Text style={styles.fundStatVal}>
                {childrenList.length}
              </Text>
              <Text style={styles.fundStatLbl}>
                {isRTL ? 'الأطفال المسجلون' : 'Enfants'}
              </Text>
            </View>
          </View>
        </View>

        {/* ACTIONS RAPIDES (4 BOUTONS CLÉS) */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(admin)/enfants')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="person-add" size={20} color="#1565C0" />
            </View>
            <Text style={styles.quickActionLabel}>Ajouter Enfant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(admin)/enfants')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#EAF7F0' }]}>
              <Ionicons name="people" size={20} color={colors.forest} />
            </View>
            <Text style={styles.quickActionLabel}>Mes Enfants</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(admin)/budget-analyses')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="pie-chart" size={20} color="#7B1FA2" />
            </View>
            <Text style={styles.quickActionLabel}>Budgets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push('/(admin)/historique')}
            activeOpacity={0.8}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="time" size={20} color="#E65100" />
            </View>
            <Text style={styles.quickActionLabel}>Historique</Text>
          </TouchableOpacity>
        </View>

        {/* APERÇU DES ENFANTS DU FOYER */}
        <View style={styles.sectionWrap}>
          <View
            style={[
              styles.sectionHeaderRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <SectionTitle style={{ marginBottom: 0 }}>
              Mes Enfants ({childrenList.length})
            </SectionTitle>
            <TouchableOpacity
              onPress={() => router.push('/(admin)/enfants')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Gérer</Text>
            </TouchableOpacity>
          </View>

          {childrenList.length === 0 ? (
            <View style={styles.emptyCard}>
              {/* Icône de deux personnes en contour ardoise */}
              <Ionicons name="people-outline" size={44} color={colors.gray} />
              {/* Titre d'état vide */}
              <Text style={styles.emptyTitle}>Aucun enfant enregistré</Text>
              {/* Explication incitant à la création du premier compte enfant */}
              <Text style={styles.emptySub}>
                Créez un compte pour votre enfant afin de lui allouer de l'argent de
                poche et lui apprendre à gérer son budget.
              </Text>
              {/* Bouton centré d'ajout d'enfant conforme à la maquette */}
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => router.push('/(admin)/enfants')}
                activeOpacity={0.8}
              >
                {/* Texte blanc du bouton d'action */}
                <Text style={styles.emptyAddBtnText}>+ Ajouter un enfant</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {childrenList.map((ch) => (
                <View
                  key={ch.id}
                  style={[
                    styles.childRowCard,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.childAvatar}>
                    <Ionicons name="person-outline" size={22} color={colors.forest} />
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={styles.childName}>{ch.name}</Text>
                    <Text style={styles.childEmail}>{ch.email}</Text>
                    <View style={styles.balanceTag}>
                      <Text style={styles.balanceTagText}>
                        Solde dispo : {formatTND(ch.balance || 0)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.giveMoneyBtn}
                    onPress={() => router.push('/(admin)/enfants')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="gift-outline" size={16} color={colors.white} />
                    <Text style={styles.giveMoneyBtnText}>Donner</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ACTIVITÉ RÉCENTE DE LA FAMILLE */}
        <View style={styles.sectionWrap}>
          <View
            style={[
              styles.sectionHeaderRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <SectionTitle style={{ marginBottom: 0 }}>
              Activité Récente
            </SectionTitle>
            <TouchableOpacity
              onPress={() => router.push('/(admin)/historique')}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>Historique complet</Text>
            </TouchableOpacity>
          </View>

          {myAllocations.length === 0 ? (
            <View style={styles.emptyMiniCard}>
              <Text style={styles.emptyMiniText}>
                Aucun transfert d’argent réalisé pour l’instant.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {myAllocations.slice(0, 4).map((alloc) => (
                <View
                  key={alloc.id}
                  style={[
                    styles.activityItem,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.activityIcon}>
                    <Ionicons name="arrow-up" size={16} color={colors.forest} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 8 }}>
                    <Text style={styles.activityTitle}>
                      Allocation à {alloc.childName}
                    </Text>
                    <Text style={styles.activitySub}>
                      {alloc.note || 'Argent de poche'} · {alloc.date}
                    </Text>
                  </View>
                  <Text style={styles.activityAmount}>
                    −{formatTND(alloc.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  menuIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.forest,
  },
  headerFamily: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  notifBadgeDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E11D48',
  },
  fundCard: {
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
  fundCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  fundBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fundBadgeText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addFundsBtn: {
    // Disposition horizontale de l'icône plus et du libellé
    flexDirection: 'row',
    // Alignement centré sur l'axe vertical
    alignItems: 'center',
    // Espacement horizontal entre l'icône et le texte
    gap: 4,
    // Fond vert foncé identique à la maquette Family Space
    backgroundColor: '#1B4E44',
    // Rembourrage horizontal confortable
    paddingHorizontal: 12,
    // Rembourrage vertical adapté au format pilule
    paddingVertical: 6,
    // Coins arrondis en pilule
    borderRadius: 14,
  },
  addFundsBtnText: {
    // Texte blanc contrasté sur fond vert foncé
    color: colors.white,
    // Taille de police nette
    fontSize: 12,
    // Graisse semi-bold affirmée
    fontWeight: '700',
  },
  fundBalanceNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: 1,
  },
  fundBalanceLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  fundStatsDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 14,
  },
  fundStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fundStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  fundStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.white,
  },
  fundStatLbl: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  fundStatSep: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forest,
    textAlign: 'center',
  },
  quickActionBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#E11D48',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  quickActionBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  requestCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  requestChildAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestChildName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  requestReason: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  requestAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E65100',
    marginTop: 2,
  },
  requestBtnCol: {
    gap: 6,
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.forest,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE4E6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.white,
  },
  childRowCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  childAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  childEmail: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 1,
  },
  balanceTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EAF7F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  balanceTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.forest,
  },
  giveMoneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.forest,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  giveMoneyBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: colors.gray,
    textAlign: 'center',
    lineHeight: 18,
    marginVertical: 10,
  },
  emptyAddBtn: {
    // Fond vert forêt officiel
    backgroundColor: colors.forest,
    // Rembourrage horizontal généreux
    paddingHorizontal: 22,
    // Rembourrage vertical
    paddingVertical: 10,
    // Coins arrondis doux
    borderRadius: 10,
    // Espacement supérieur
    marginTop: 6,
  },
  emptyAddBtnText: {
    // Texte blanc contrasté
    color: colors.white,
    // Taille de police nette
    fontSize: 13,
    // Graisse semi-bold affirmée
    fontWeight: '700',
  },
  emptyMiniCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyMiniText: {
    fontSize: 13,
    color: colors.gray,
  },
  activityItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EAF7F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  activitySub: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E11D48',
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
