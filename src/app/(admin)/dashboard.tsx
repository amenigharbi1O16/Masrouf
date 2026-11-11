// ============================================================
// FICHIER : src/app/(admin)/dashboard.tsx
// RÔLE    : Tableau de bord d'administration globale de Masrouf.
//           Affiche UNIQUEMENT des chiffres globaux anonymes (KPIs).
//           AUCUN détail sur les dépenses, achats ou budgets individuels
//           n'est exposé (respect strict de la vie privée).
// ============================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Fonctions SQLite
import { getAdminGlobalStats, AdminGlobalStats } from '../../db/queries';

// Internationalisation
import { useTranslation } from '../../utils/i18n';

export default function AdminDashboardScreen() {
  const { t } = useTranslation();

  const [stats, setStats] = useState<AdminGlobalStats>({
    nbUtilisateurs: 0,
    nbUtilisateursActifs: 0,
    nbProduits: 0,
    nbAchats: 0,
    volumeTotalTND: 0,
    topCategorieNom: '...',
  });

  const rechargerStats = useCallback(() => {
    const s = getAdminGlobalStats();
    setStats(s);
  }, []);

  useFocusEffect(rechargerStats);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* BANDEAU CONFIDENTIALITE & VIE PRIVEE */}
      <View style={styles.privacyBanner}>
        <Text style={styles.privacyIcon}>🔒</Text>
        <Text style={styles.privacyText}>{t('confidentialite_respectee')}</Text>
      </View>

      <Text style={styles.sectionTitle}>{t('stats_globales_anonymes')}</Text>

      {/* GRILLE DES METRIQUES */}
      <View style={styles.grid}>
        {/* CARTE 1 : Utilisateurs */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>👥</Text>
          <Text style={styles.cardNumber}>{stats.nbUtilisateurs}</Text>
          <Text style={styles.cardLabel}>{t('comptes_actifs')}</Text>
          <Text style={styles.cardSub}>({stats.nbUtilisateursActifs} actifs)</Text>
        </View>

        {/* CARTE 2 : Produits */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>📦</Text>
          <Text style={styles.cardNumber}>{stats.nbProduits}</Text>
          <Text style={styles.cardLabel}>{t('articles_catalogue')}</Text>
        </View>

        {/* CARTE 3 : Transactions */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>🧾</Text>
          <Text style={styles.cardNumber}>{stats.nbAchats}</Text>
          <Text style={styles.cardLabel}>{t('transactions_totales')}</Text>
        </View>

        {/* CARTE 4 : Volume Total TND */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>💰</Text>
          <Text style={styles.cardNumber}>
            {stats.volumeTotalTND.toFixed(2)}
          </Text>
          <Text style={styles.cardLabel}>{t('volume_total')} (TND)</Text>
        </View>
      </View>

      {/* CARTE PLEINE LARGEUR : Catégorie la plus sollicitée */}
      <View style={styles.fullCard}>
        <Text style={styles.fullCardLabel}>🏆 {t('top_categorie')}</Text>
        <Text style={styles.fullCardValue}>{stats.topCategorieNom}</Text>
        <Text style={styles.fullCardSub}>
          Catégorie enregistrant le plus grand nombre de transactions dans l'application.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  privacyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  privacyIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#6B21A8',
    fontWeight: '600',
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#581C87',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#581C87',
  },
  cardLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'center',
  },
  cardSub: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  fullCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginTop: 16,
  },
  fullCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7E22CE',
  },
  fullCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 4,
  },
  fullCardSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});

