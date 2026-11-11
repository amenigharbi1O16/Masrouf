// ============================================================
// FICHIER : src/app/(tabs)/index.tsx
// RÔLE    : Écran d'accueil principal (Dashboard) de l'utilisateur.
//
// VISUEL SUR L'ÉCRAN :
//   1. En haut : Message de bienvenue personnalisé avec le nom de l'utilisateur.
//   2. Carte Budget :
//      - Montant dépensé en grand (calculé dynamiquement depuis SQLite).
//      - Objectif budgétaire mensuel configuré par l'utilisateur.
//      - Barre de progression animée (Bleu si normal, Orange si >= 80%, Rouge si dépassé).
//      - Alerte visuelle en cas de dépassement ou d'approche du seuil.
//   3. Actions rapides : 2 boutons côte à côte (+ Achat et + Produit).
//   4. Dépenses récentes : Liste interactive des 5 derniers achats réels
//      avec icône de catégorie, date, magasin et montant en TND.
//
// CONCEPTS REACT NATIVE & PROGRAMMATION ÉVÉNEMENTIELLE :
//   - useFocusEffect : rafraîchit automatiquement les données SQLite
//     dès que l'utilisateur revient sur cet écran (par exemple après avoir
//     enregistré un nouvel achat dans la modale).
//   - useAuth : lit l'ID et les réglages de l'utilisateur connecté.
//   - useTranslation : bascule les libellés en Français ou Arabe.
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

// Fonctions d'interrogation de la base SQLite
import { getTotalMois, getRecentAchats, Achat } from '../../db/queries';

// Contexte d'authentification et internationalisation
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';

export default function HomeScreen() {
  // Récupération de l'utilisateur connecté
  const { user } = useAuth();

  // Système de traduction
  const { t } = useTranslation();

  // Calcul du mois en cours au format "AAAA-MM" (ex: "2026-11")
  const maintenant = new Date();
  const moisCourant = `${maintenant.getFullYear()}-${String(
    maintenant.getMonth() + 1
  ).padStart(2, '0')}`;

  // ÉTATS LOCAUX :
  // totalDepense : somme des achats du mois en cours
  const [totalDepense, setTotalDepense] = useState<number>(0);

  // achatsRecents : liste des 5 derniers achats
  const [achatsRecents, setAchatsRecents] = useState<Achat[]>([]);

  // ----------------------------------------------------------
  // CHARGEMENT DES DONNÉES DEPUIS SQLITE
  // useFocusEffect est déclenché chaque fois que l'onglet Accueil devient actif
  // ----------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // 1. Récupère le total dépensé pour le mois en cours
        const total = getTotalMois(user.id, moisCourant);
        setTotalDepense(total);

        // 2. Récupère les 5 achats les plus récents
        const recents = getRecentAchats(user.id, moisCourant);
        setAchatsRecents(recents);
      }
    }, [user, moisCourant])
  );

  // ----------------------------------------------------------
  // CALCULS DU BUDGET
  // ----------------------------------------------------------
  const budget = user?.budget_mensuel ?? 0;
  // Calcul du pourcentage consommé (plafonné à 100% pour la barre)
  const ratio = budget > 0 ? (totalDepense / budget) * 100 : 0;
  const largeurBarre = Math.min(ratio, 100);

  // Couleur dynamique de la barre de progression
  let couleurProgression = '#2563EB'; // Bleu standard
  if (ratio >= 100) {
    couleurProgression = '#EF4444'; // Rouge = Dépassement
  } else if (ratio >= 80) {
    couleurProgression = '#F59E0B'; // Orange = Alerte 80%
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ==================================================== */}
      {/* SECTION 1 : BIENVENUE & PROFIL                       */}
      {/* ==================================================== */}
      <View style={styles.welcomeBox}>
        <Text style={styles.welcomeText}>
          {t('bienvenue')} <Text style={styles.userName}>{user?.nom ?? 'Utilisateur'} 👋</Text>
        </Text>
        <Text style={styles.roleTag}>
          {user?.role === 'admin' ? '👑 Administrateur' : '👤 Compte Personnel'}
        </Text>
      </View>

      {/* ==================================================== */}
      {/* SECTION 2 : CARTE BUDGET MENSUEL                     */}
      {/* ==================================================== */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('budget_du_mois')}</Text>

        {/* Montant total dépensé en grand */}
        <Text style={styles.cardAmount}>
          {totalDepense.toFixed(3)} <Text style={styles.currencyText}>TND</Text>
        </Text>

        {/* Comparaison avec le budget configuré */}
        <Text style={styles.cardSub}>
          {t('depense_sur')} {budget.toFixed(3)} TND ({ratio.toFixed(0)}%)
        </Text>

        {/* BARRE DE PROGRESSION VISUELLE */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${largeurBarre}%`, backgroundColor: couleurProgression },
            ]}
          />
        </View>

        {/* ALERTES BUDGÉTAIRES ÉVÉNEMENTIELLES */}
        {ratio >= 100 ? (
          <View style={[styles.alertBadge, styles.alertDanger]}>
            <Text style={styles.alertDangerText}>{t('budget_depasse')}</Text>
          </View>
        ) : ratio >= 80 ? (
          <View style={[styles.alertBadge, styles.alertWarning]}>
            <Text style={styles.alertWarningText}>{t('budget_alerte_80')}</Text>
          </View>
        ) : null}
      </View>

      {/* ==================================================== */}
      {/* SECTION 3 : ACTIONS RAPIDES                          */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('actions_rapides')}</Text>
      <View style={styles.actionRow}>
        {/* BOUTON 1 : Ouvre la modale pour enregistrer un achat */}
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/nouvel-achat')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t('ajouter_achat')}</Text>
        </TouchableOpacity>

        {/* BOUTON 2 : Ouvre la modale pour ajouter un nouveau produit au catalogue */}
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
      {/* SECTION 4 : LISTE DES DÉPENSES RÉCENTES              */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('depenses_recentes')}</Text>

      {achatsRecents.length === 0 ? (
        // Message si aucun achat n'a été enregistré ce mois-ci
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛍️</Text>
          <Text style={styles.emptyText}>{t('aucun_achat')}</Text>
        </View>
      ) : (
        // Affichage des achats sous forme de cartes élégantes
        achatsRecents.map((achat) => (
          <View key={achat.id} style={styles.expenseItem}>
            {/* Icône de la catégorie */}
            <View style={styles.expenseIconBox}>
              <Text style={{ fontSize: 22 }}>{achat.produit_icone}</Text>
            </View>

            {/* Détails du produit et magasin */}
            <View style={styles.expenseInfo}>
              <Text style={styles.expenseTitle}>{achat.produit_nom}</Text>
              <Text style={styles.expenseMeta}>
                {achat.magasin_nom} • {achat.date_achat}
              </Text>
            </View>

            {/* Montant total de l'achat */}
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

// ------------------------------------------------------------
// STYLES GRAPHIQUES
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  welcomeBox: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748B',
  },
  userName: {
    fontWeight: '700',
    color: '#1E293B',
  },
  roleTag: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  cardAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
    marginVertical: 6,
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
  },
  cardSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  alertBadge: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
  },
  alertWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  alertWarningText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  alertDanger: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertDangerText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  secondaryButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#2563EB',
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
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  expenseItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  expenseIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  expenseMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  expensePriceBox: {
    alignItems: 'flex-end',
  },
  expensePrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  expenseCurrency: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
});
