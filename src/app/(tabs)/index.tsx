// ============================================================
// FICHIER : src/app/(tabs)/index.tsx
// RÔLE    : Écran d'accueil (Home) — Design Figma 07/27/28/29.
//
// DESIGN FIGMA :
//   - Fond : #F5F3ED
//   - Header : hamburger ☰ | "Bonjour, [Prénom]" | icône profil
//   - Label : "[MOIS ANNÉE] · 01-30 NOV."
//   - Carte hero sombre (#102B27) : disponible à dépenser, budget, barre, dépensé
//   - Bannière mint (sain) / gold (80%) / coral (dépassé)
//   - Section "Vos catégories" : cartes blanches avec barre de progression
//   - Section "Transactions récentes" : lignes avec icône + nom + montant
//   - Bouton "Ajouter une dépense simple" (secondary, mint)
//   - FAB "+ Ajouter un achat" (primaire, vert forêt, full-width, ancré en bas)
//   - État sans budget : carte blanche avec CTA "Créer un budget"
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import {
  getTotalMois,
  getRecentAchats,
  getEnveloppesBudget,
  getMonthlyBudget,
  getNonBudgetedDepenses,
  getTotalPoints,
  getPointsSettings,
  evaluerMoisPrecedent,
  hasAlerteBeenShown,
  logAlerte,
  Achat,
  EnveloppeBudget,
} from '../../db/queries';

import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();

  // Période courante
  const maintenant = new Date();
  const moisCourant = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}`;

  // Libellé de la période (ex : "NOVEMBRE 2026 · 01-30 NOV.")
  const moisNom = maintenant.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }).toUpperCase();
  const debut = `01 ${maintenant.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).toUpperCase().replace('.', '')}`;
  const finDuMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 0);
  const fin = `${finDuMois.getDate()} ${finDuMois.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase().replace('.', '')}`;

  // États
  const [totalDepense, setTotalDepense] = useState<number>(0);
  const [achatsRecents, setAchatsRecents] = useState<Achat[]>([]);
  const [enveloppes, setEnveloppes] = useState<EnveloppeBudget[]>([]);
  const [nonBudgetise, setNonBudgetise] = useState<number>(0);
  const [budgetTotal, setBudgetTotal] = useState<number>(0);

  const rechargerDonnees = useCallback(() => {
    if (!user) return;
    refreshUser();

    // Évaluation du mois précédent (1 fois)
    const evalRes = evaluerMoisPrecedent(user.id, moisCourant);
    if (evalRes.evalue && evalRes.pointsGagnes > 0) {
      Alert.alert(t('felicitations_mois'), `${evalRes.message}\n+${evalRes.pointsGagnes} ${t('points')} 🎉`);
    }

    const total = getTotalMois(user.id, moisCourant);
    setTotalDepense(total);
    setAchatsRecents(getRecentAchats(user.id, moisCourant));

    const mb = getMonthlyBudget(user.id, moisCourant);
    const bTot = (user.budget_mensuel && user.budget_mensuel > 0)
      ? user.budget_mensuel
      : (mb?.montant_total ?? 0);
    setBudgetTotal(bTot);

    const envs = getEnveloppesBudget(user.id, moisCourant);
    setEnveloppes(envs);
    setNonBudgetise(getNonBudgetedDepenses(user.id, moisCourant));

    // Alertes 80% et 100%
    for (const env of envs) {
      if (env.pourcentage_consomme >= 100 && !hasAlerteBeenShown(user.id, moisCourant, env.categorie_id, 100)) {
        logAlerte(user.id, moisCourant, env.categorie_id, 100);
        Alert.alert(t('alerte_100_titre'), `${t('alerte_100_msg')} ${env.categorie_nom}`);
      } else if (env.pourcentage_consomme >= 80 && !hasAlerteBeenShown(user.id, moisCourant, env.categorie_id, 80)) {
        logAlerte(user.id, moisCourant, env.categorie_id, 80);
        Alert.alert(t('alerte_80_titre'), `${t('alerte_80_msg')} ${env.categorie_nom}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, moisCourant, t]);

  useFocusEffect(rechargerDonnees);

  const disponible = budgetTotal - totalDepense;
  const ratio = budgetTotal > 0 ? (totalDepense / budgetTotal) * 100 : 0;
  const largeurBarre = Math.min(ratio, 100);

  // Couleur de statut budgétaire
  let couleurBarre: string = Theme.colors.statusGreen;
  if (ratio >= 100) couleurBarre = Theme.colors.coral;
  else if (ratio >= 70) couleurBarre = Theme.colors.gold;

  // Statut de la bannière
  const statut: 'healthy' | 'warning' | 'exceeded' =
    ratio >= 100 ? 'exceeded' : ratio >= 70 ? 'warning' : 'healthy';

  // Catégories visibles vs résumé
  const enveloppesVisibles = enveloppes.slice(0, 2);
  const enveloppesRestantes = enveloppes.slice(2);
  const totalRestant = enveloppesRestantes.reduce((s, e) => s + e.montant_alloue, 0);

  return (
    <View style={styles.root}>
      {/* ── HEADER ── */}
      <AppHeader
        title={`${t('bonjour') ?? 'Bonjour'}, ${user?.nom?.split(' ')[0] ?? ''}`}
        onMenuPress={openDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── LABEL PÉRIODE ── */}
        <Text style={styles.periodLabel}>
          {moisNom}  ·  {debut}–{fin}.
        </Text>

        {budgetTotal <= 0 ? (
          /* ── ÉTAT SANS BUDGET (Figma 29) ── */
          <EtatSansBudget t={t} categories={enveloppes} />
        ) : (
          <>
            {/* ── CARTE HERO BUDGET ── */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>
                {t('disponible_a_depenser') ?? 'DISPONIBLE À DÉPENSER'}
              </Text>
              <Text style={styles.heroAmount}>
                {formatDT(disponible)}
              </Text>
              <Text style={styles.heroBudgetLine}>
                {t('budget') ?? 'Budget'}  {formatDT(budgetTotal)}
              </Text>

              {/* Barre de progression globale */}
              <View style={styles.heroProgressTrack}>
                <View
                  style={[
                    styles.heroProgressFill,
                    { width: `${largeurBarre}%`, backgroundColor: couleurBarre },
                  ]}
                />
              </View>

              <View style={styles.heroFooter}>
                <Text style={styles.heroDepense}>
                  {t('depense') ?? 'Dépensé'}  {formatDT(totalDepense)}
                </Text>
                <Text style={styles.heroRatio}>{ratio.toFixed(1)}% {t('utilise') ?? 'utilisé'}</Text>
              </View>
              <Text style={styles.heroDate}>
                {debut}–{fin} {maintenant.getFullYear()}
              </Text>
            </View>

            {/* ── BANNIÈRE DE STATUT ── */}
            <BannierStatut statut={statut} disponible={disponible} t={t} />

            {/* ── SECTION CATÉGORIES ── */}
            <Text style={styles.sectionTitle}>{t('vos_categories') ?? 'Vos catégories'}</Text>

            {enveloppesVisibles.map((env) => {
              const pct = env.pourcentage_consomme;
              const w = Math.min(pct, 100);
              let col: string = Theme.colors.statusGreen;
              if (pct >= 100) col = Theme.colors.coral;
              else if (pct >= 70) col = Theme.colors.gold;

              return (
                <View key={env.categorie_id} style={styles.catCard}>
                  <View style={styles.catCardHeader}>
                    <View style={styles.catIconBox}>
                      <Text style={{ fontSize: 18, color: Theme.colors.forest }}>☐</Text>
                    </View>
                    <Text style={styles.catName}>{env.categorie_nom}</Text>
                    <Text style={styles.catAmounts}>
                      {formatDT(env.montant_depense)} / {formatDT(env.montant_alloue)}
                    </Text>
                  </View>
                  <View style={styles.catProgressTrack}>
                    <View style={[styles.catProgressFill, { width: `${w}%`, backgroundColor: col }]} />
                  </View>
                </View>
              );
            })}

            {/* Résumé des catégories restantes */}
            {enveloppesRestantes.length > 0 && (
              <View style={styles.catSummaryRow}>
                <Text style={styles.catSummaryNames}>
                  {enveloppesRestantes.map((e) => e.categorie_nom).join(' · ')}
                </Text>
                <Text style={styles.catSummaryAmount}>
                  {formatDT(enveloppes.slice(2).reduce((s, e) => s + e.montant_depense, 0))} / {formatDT(totalRestant)}
                </Text>
              </View>
            )}

            {/* ── SECTION TRANSACTIONS RÉCENTES ── */}
            {achatsRecents.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>{t('transactions_recentes') ?? 'Transactions récentes'}</Text>
                {achatsRecents.map((a) => (
                  <View key={a.id} style={styles.transactionRow}>
                    <View style={styles.transactionIconBox}>
                      <Text style={{ fontSize: 16, color: Theme.colors.forest }}>☐</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.transactionName}>{a.produit_nom}</Text>
                      <Text style={styles.transactionMeta}>
                        {a.magasin_nom}  ·  {formatDate(a.date_achat)}
                      </Text>
                    </View>
                    <Text style={styles.transactionAmount}>
                      -{formatDT(a.prix_total)}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {/* Dépenses hors budget */}
        {nonBudgetise > 0 && (
          <View style={styles.nonBudgetRow}>
            <Text style={styles.nonBudgetText}>
              ⚠ {t('non_budgetise') ?? 'Hors budget'} : {formatDT(nonBudgetise)}
            </Text>
          </View>
        )}

        {/* ── BOUTON DÉPENSE SIMPLE ── */}
        <TouchableOpacity
          style={styles.simpleExpenseBtn}
          onPress={() => router.push('/nouvel-achat')}
          activeOpacity={0.8}
        >
          <Text style={styles.simpleExpenseBtnText}>
            {t('ajouter_depense_simple') ?? 'Ajouter une dépense simple'}
          </Text>
        </TouchableOpacity>

        {/* Espace pour le FAB */}
        <View style={{ height: 80 }} />
      </ScrollView>

      {/* ── FAB PRINCIPAL ── */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/nouvel-achat')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>+ {t('ajouter_achat') ?? 'Ajouter un achat'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Composant : bannière de statut budgétaire ──
function BannierStatut({ statut, disponible, t }: { statut: string; disponible: number; t: (k: string) => string }) {
  const bg = statut === 'exceeded' ? '#FEE2E2' : statut === 'warning' ? '#FEF9EB' : Theme.colors.mint;
  const textCol = statut === 'exceeded' ? Theme.colors.coral : statut === 'warning' ? '#92400E' : Theme.colors.deepGreen;
  const titre = statut === 'exceeded'
    ? (t('budget_depasse') ?? 'Budget dépassé')
    : statut === 'warning'
    ? (t('attention_80') ?? 'Attention — 80 % atteint')
    : (t('budget_se_porte_bien') ?? 'Votre budget se porte bien');
  const sous = statut === 'healthy'
    ? `${t('il_reste') ?? 'Il reste'} ${formatDT(disponible)} ${t('pour_periode') ?? 'pour cette période.'}`
    : '';

  return (
    <View style={[styles.statusBanner, { backgroundColor: bg }]}>
      <Text style={[styles.statusBannerCheck, { color: textCol }]}>✓</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.statusBannerTitle, { color: textCol }]}>{titre}</Text>
        {sous ? <Text style={[styles.statusBannerSub, { color: textCol }]}>{sous}</Text> : null}
      </View>
    </View>
  );
}

// ── Composant : état sans budget ──
function EtatSansBudget({ t, categories }: { t: (k: string) => string; categories: EnveloppeBudget[] }) {
  return (
    <>
      <View style={styles.noBudgetCard}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>☐</Text>
        <Text style={styles.noBudgetTitle}>
          {t('faites_place_objectifs') ?? 'Faites place à vos objectifs'}
        </Text>
        <Text style={styles.noBudgetSub}>
          {t('pas_de_budget_periode') ?? 'Vous n\'avez pas encore de budget pour cette période.'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => router.push('/budget-mois')}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>{t('creer_budget') ?? 'Créer un budget'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryBtn}
        onPress={() => router.push({ pathname: '/budget-mois', params: { copier: '1' } })}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryBtnText}>
          {t('copier_periode_precedente') ?? 'Copier la période précédente'}
        </Text>
      </TouchableOpacity>

      <View style={styles.mintBanner}>
        <Text style={{ color: Theme.colors.deepGreen, fontSize: 14, marginRight: 8 }}>✓</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.mintBannerTitle}>
            {t('commencez_vos_dates') ?? 'Commencez aux dates de votre choix'}
          </Text>
          <Text style={styles.mintBannerSub}>
            {t('decidez_duree_montant') ?? 'Vous décidez de la durée et du montant total.'}
          </Text>
        </View>
      </View>

      {categories.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{t('vos_categories_pretes') ?? 'Vos catégories sont prêtes'}</Text>
          {categories.map((c) => (
            <View key={c.categorie_id} style={styles.catReadyRow}>
              <Text style={styles.catReadyName}>{c.categorie_nom}</Text>
              <Text style={styles.catReadyStatus}>{t('prete') ?? 'Prête'}</Text>
            </View>
          ))}
        </>
      )}
    </>
  );
}

// ── Helpers ──
function formatDT(val: number): string {
  // Formatage tunisien : 3 décimales, séparateur point
  return `${val.toFixed(3)} DT`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.warm },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  // Période
  periodLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Carte hero (fond foncé)
  heroCard: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: Theme.colors.white,
    marginBottom: 4,
  },
  heroBudgetLine: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
  },
  heroProgressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  heroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  heroDepense: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  heroRatio: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  heroDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },

  // Bannière statut
  statusBanner: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 20,
  },
  statusBannerCheck: { fontSize: 14, fontWeight: '800', marginTop: 1 },
  statusBannerTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  statusBannerSub: { fontSize: 13, lineHeight: 18 },

  // Sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 12,
  },

  // Cartes catégories
  catCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  catCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  catIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Theme.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  catName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
  catAmounts: {
    fontSize: 13,
    color: Theme.colors.muted,
    fontWeight: '500',
  },
  catProgressTrack: {
    height: 5,
    backgroundColor: Theme.colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  catProgressFill: { height: '100%', borderRadius: 3 },

  // Résumé catégories
  catSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  catSummaryNames: { fontSize: 12, color: Theme.colors.muted },
  catSummaryAmount: { fontSize: 12, fontWeight: '700', color: Theme.colors.ink },

  // Transactions
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  transactionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Theme.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
  transactionMeta: { fontSize: 12, color: Theme.colors.muted, marginTop: 2 },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // Hors budget
  nonBudgetRow: {
    backgroundColor: '#FEF9EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  nonBudgetText: { fontSize: 13, color: '#92400E', fontWeight: '600' },

  // Bouton dépense simple (secondary)
  simpleExpenseBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  simpleExpenseBtnText: {
    color: Theme.colors.forest,
    fontSize: 15,
    fontWeight: '600',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 20,
    right: 20,
  },
  fab: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.colors.forest,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: Theme.colors.white, fontSize: 15, fontWeight: '700' },

  // État sans budget
  noBudgetCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  noBudgetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.ink,
    textAlign: 'center',
    marginBottom: 8,
  },
  noBudgetSub: {
    fontSize: 14,
    color: Theme.colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: Theme.colors.white, fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: { color: Theme.colors.forest, fontSize: 15, fontWeight: '600' },
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  mintBannerTitle: { fontSize: 14, fontWeight: '700', color: Theme.colors.ink, marginBottom: 4 },
  mintBannerSub: { fontSize: 13, color: Theme.colors.muted, lineHeight: 18 },
  catReadyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  catReadyName: { fontSize: 14, color: Theme.colors.ink },
  catReadyStatus: { fontSize: 14, fontWeight: '700', color: Theme.colors.muted },
});
