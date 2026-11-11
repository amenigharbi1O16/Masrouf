// ============================================================
// FICHIER : src/app/(tabs)/index.tsx
// RÔLE    : Écran d'accueil principal (Dashboard Personnel) de l'utilisateur.
//
// VISUEL SUR L'ÉCRAN :
//   1. En-tête Gamification : Points totaux & Badge de Niveau
//      (Débutant, Économe, Expert configuré par l'admin).
//   2. Carte Budget Global & Enveloppes :
//      - Total dépensé vs Budget alloué.
//      - Bouton d'accès rapide vers la gestion des enveloppes.
//   3. Enveloppes par Catégorie (« Masrouf [Catégorie] ») :
//      - Barres de progression individuelles aux couleurs normées :
//        * Vert (< 70 %)
//        * Orange (70 à 99 %)
//        * Rouge (≥ 100 %)
//   4. Alertes budgétaires dans l'application (80 % et 100 %) :
//      - Affichées une seule fois par mois et par catégorie (table alertes_log).
//   5. Section "Non budgétisé" si des achats ont été faits hors enveloppes.
//   6. Actions rapides (+ Dépense, + Produit) et liste des dépenses récentes.
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

// Fonctions SQLite
import {
  getTotalMois,
  getRecentAchats,
  getEnveloppesBudget,
  getNonBudgetedDepenses,
  getTotalPoints,
  getPointsSettings,
  evaluerMoisPrecedent,
  hasAlerteBeenShown,
  logAlerte,
  Achat,
  EnveloppeBudget,
} from '../../db/queries';

// Contexte et internationalisation
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';

export default function HomeScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  const maintenant = new Date();
  const moisCourant = `${maintenant.getFullYear()}-${String(
    maintenant.getMonth() + 1
  ).padStart(2, '0')}`;

  const [totalDepense, setTotalDepense] = useState<number>(0);
  const [achatsRecents, setAchatsRecents] = useState<Achat[]>([]);
  const [enveloppes, setEnveloppes] = useState<EnveloppeBudget[]>([]);
  const [nonBudgetise, setNonBudgetise] = useState<number>(0);
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [niveauLabel, setNiveauLabel] = useState<string>('Débutant');

  // ----------------------------------------------------------
  // CHARGEMENT ET RECHARGEMENT DES DONNÉES
  // ----------------------------------------------------------
  const rechargerDonnees = useCallback(() => {
    if (!user) return;

    // Vérifie que le compte est toujours actif
    refreshUser();

    // 1. Évaluation du mois précédent (s'exécute 1 fois au premier lancement)
    const evalRes = evaluerMoisPrecedent(user.id, moisCourant);
    if (evalRes.evalue && evalRes.pointsGagnes > 0) {
      Alert.alert(t('felicitations_mois'), `${evalRes.message}\n+${evalRes.pointsGagnes} ${t('points')} ! 🎉`);
    }

    // 2. Total du mois et achats récents
    const total = getTotalMois(user.id, moisCourant);
    setTotalDepense(total);
    setAchatsRecents(getRecentAchats(user.id, moisCourant));

    // 3. Enveloppes du mois
    const envs = getEnveloppesBudget(user.id, moisCourant);
    setEnveloppes(envs);

    // 4. Dépenses non budgétisées
    const nonBudg = getNonBudgetedDepenses(user.id, moisCourant);
    setNonBudgetise(nonBudg);

    // 5. Points et Niveau
    const pts = getTotalPoints(user.id);
    setTotalPoints(pts);

    const s = getPointsSettings();
    if (pts >= s.seuil_expert) {
      setNiveauLabel(t('niveau_expert'));
    } else if (pts >= s.seuil_econome) {
      setNiveauLabel(t('niveau_econome'));
    } else {
      setNiveauLabel(t('niveau_debutant'));
    }

    // 6. Vérification des alertes 80 % et 100 % (non répétées)
    for (const env of envs) {
      if (env.pourcentage_consomme >= 100) {
        if (!hasAlerteBeenShown(user.id, moisCourant, env.categorie_id, 100)) {
          logAlerte(user.id, moisCourant, env.categorie_id, 100);
          Alert.alert(
            t('alerte_100_titre'),
            `${t('alerte_100_msg')} ${env.categorie_nom} (${env.montant_depense.toFixed(2)} / ${env.montant_alloue.toFixed(2)} TND).`
          );
        }
      } else if (env.pourcentage_consomme >= 80) {
        if (!hasAlerteBeenShown(user.id, moisCourant, env.categorie_id, 80)) {
          logAlerte(user.id, moisCourant, env.categorie_id, 80);
          Alert.alert(
            t('alerte_80_titre'),
            `${t('alerte_80_msg')} ${env.categorie_nom} (${env.montant_depense.toFixed(2)} / ${env.montant_alloue.toFixed(2)} TND).`
          );
        }
      }
    }
  }, [user, moisCourant, t, refreshUser]);

  useFocusEffect(rechargerDonnees);

  const budgetTotal = user?.budget_mensuel ?? 0;
  const ratioGlobal = budgetTotal > 0 ? (totalDepense / budgetTotal) * 100 : 0;
  const largeurBarreGlobale = Math.min(ratioGlobal, 100);

  let couleurBarreGlobale = '#10B981'; // Vert < 70%
  if (ratioGlobal >= 100) {
    couleurBarreGlobale = '#EF4444'; // Rouge >= 100%
  } else if (ratioGlobal >= 70) {
    couleurBarreGlobale = '#F59E0B'; // Orange 70 - 99%
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ==================================================== */}
      {/* SECTION 1 : BIENVENUE & BANDEAU GAMIFICATION        */}
      {/* ==================================================== */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.welcomeText}>
            {t('bienvenue')} <Text style={styles.userName}>{user?.nom} 👋</Text>
          </Text>
          <Text style={styles.subGreeting}>Mois de gestion : {moisCourant}</Text>
        </View>

        {/* Badge Points & Niveau */}
        <View style={styles.levelBadge}>
          <Text style={styles.levelIcon}>⭐</Text>
          <View>
            <Text style={styles.levelName}>{niveauLabel}</Text>
            <Text style={styles.pointsText}>{totalPoints} {t('points')}</Text>
          </View>
        </View>
      </View>

      {/* ==================================================== */}
      {/* SECTION 2 : CARTE BUDGET GLOBAL                     */}
      {/* ==================================================== */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardTitle}>{t('budget_du_mois')}</Text>
          <TouchableOpacity
            style={styles.manageEnvelopesBtn}
            onPress={() => router.push('/budget-mois')}
          >
            <Text style={styles.manageEnvelopesText}>⚙️ {t('gerer_enveloppes')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.cardAmount}>
          {totalDepense.toFixed(3)} <Text style={styles.currencyText}>TND</Text>
        </Text>

        <Text style={styles.cardSub}>
          {t('depense_sur')} {budgetTotal.toFixed(3)} TND ({ratioGlobal.toFixed(0)}%)
        </Text>

        {/* Barre de progression globale */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${largeurBarreGlobale}%`, backgroundColor: couleurBarreGlobale },
            ]}
          />
        </View>
      </View>

      {/* ==================================================== */}
      {/* SECTION 3 : ENVELOPPES PAR CATEGORIE                */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('budget_enveloppes')}</Text>

      {enveloppes.length === 0 ? (
        <TouchableOpacity
          style={styles.noBudgetPrompt}
          onPress={() => router.push('/budget-mois')}
        >
          <Text style={{ fontSize: 28, marginBottom: 6 }}>📬</Text>
          <Text style={styles.noBudgetTitle}>Aucune enveloppe configurée pour ce mois</Text>
          <Text style={styles.noBudgetSub}>Cliquez ici pour répartir votre budget en enveloppes intelligentes !</Text>
        </TouchableOpacity>
      ) : (
        enveloppes.map((env) => {
          const pct = env.pourcentage_consomme;
          const barreWidth = Math.min(pct, 100);

          // Couleurs réglementaires
          let col = '#10B981'; // Vert < 70%
          if (pct >= 100) {
            col = '#EF4444'; // Rouge >= 100%
          } else if (pct >= 70) {
            col = '#F59E0B'; // Orange 70 à 99%
          }

          return (
            <View key={env.categorie_id} style={styles.envelopeCard}>
              <View style={styles.envelopeHeader}>
                <View style={styles.envelopeTitleBox}>
                  <Text style={styles.envelopeIcon}>{env.categorie_icone}</Text>
                  <Text style={styles.envelopeTitle}>
                    {t('masrouf_prefix')} {env.categorie_nom}
                  </Text>
                </View>

                <Text style={styles.envelopeAmounts}>
                  {env.montant_depense.toFixed(2)} / {env.montant_alloue.toFixed(2)} TND
                </Text>
              </View>

              {/* Barre de l'enveloppe */}
              <View style={styles.miniTrack}>
                <View
                  style={[
                    styles.miniFill,
                    { width: `${barreWidth}%`, backgroundColor: col },
                  ]}
                />
              </View>

              <View style={styles.envelopeFooter}>
                <Text style={[styles.envelopePct, { color: col }]}>
                  {pct.toFixed(0)} % consommé
                </Text>
                <Text style={styles.envelopeRestant}>
                  Reste : {env.montant_restant.toFixed(2)} TND
                </Text>
              </View>
            </View>
          );
        })
      )}

      {/* SECTION 4 : DEPENSES HORS BUDGET */}
      {nonBudgetise > 0 ? (
        <View style={styles.nonBudgetCard}>
          <Text style={styles.nonBudgetTitle}>⚠️ {t('non_budgetise')}</Text>
          <Text style={styles.nonBudgetSub}>
            {t('avertissement_non_budgetise')} :{' '}
            <Text style={{ fontWeight: '800' }}>{nonBudgetise.toFixed(2)} TND</Text>
          </Text>
        </View>
      ) : null}

      {/* ==================================================== */}
      {/* SECTION 5 : ACTIONS RAPIDES                         */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('actions_rapides')}</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/nouvel-achat')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('ajouter_achat')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('/nouveau-produit')}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            {t('ajouter_produit')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ==================================================== */}
      {/* SECTION 6 : DEPENSES RECENTES                       */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('depenses_recentes')}</Text>

      {achatsRecents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyText}>{t('aucun_achat')}</Text>
        </View>
      ) : (
        achatsRecents.map((achat) => (
          <View key={achat.id} style={styles.expenseItem}>
            <View style={styles.expenseIconBox}>
              <Text style={{ fontSize: 22 }}>{achat.produit_icone}</Text>
            </View>

            <View style={styles.expenseInfo}>
              <Text style={styles.expenseTitle}>{achat.produit_nom}</Text>
              <Text style={styles.expenseMeta}>
                {achat.magasin_nom} • {achat.date_achat}
              </Text>
            </View>

            <View style={styles.expensePriceBox}>
              <Text style={styles.expensePrice}>
                {achat.prix_total.toFixed(3)}
              </Text>
              <Text style={styles.expenseCurrency}>TND</Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748B',
  },
  userName: {
    fontWeight: '800',
    color: '#1E293B',
  },
  subGreeting: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 6,
  },
  levelIcon: {
    fontSize: 18,
  },
  levelName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  pointsText: {
    fontSize: 10,
    color: '#2563EB',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  manageEnvelopesBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  manageEnvelopesText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '700',
  },
  cardAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 8,
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    marginTop: 6,
  },
  noBudgetPrompt: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 14,
  },
  noBudgetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  noBudgetSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  envelopeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  envelopeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  envelopeTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  envelopeIcon: {
    fontSize: 20,
  },
  envelopeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  envelopeAmounts: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  miniTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniFill: {
    height: '100%',
    borderRadius: 3,
  },
  envelopeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  envelopePct: {
    fontSize: 10,
    fontWeight: '700',
  },
  envelopeRestant: {
    fontSize: 10,
    color: '#64748B',
  },
  nonBudgetCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  nonBudgetTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  nonBudgetSub: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#334155',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
  },
  expenseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  expenseMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  expensePriceBox: {
    alignItems: 'flex-end',
  },
  expensePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
  },
  expenseCurrency: {
    fontSize: 10,
    color: '#64748B',
  },
});
