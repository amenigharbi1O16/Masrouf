// ============================================================
// FICHIER : src/app/(tabs)/analyses.tsx
// RÔLE    : Écran d'analyse budgétaire et de statistiques.
//
// VISUEL SUR L'ÉCRAN :
//   1. En-tête : Résumé du total mensuel avec badge du mois en cours.
//   2. Carte "Répartition par Catégorie" :
//      - Graphique visuel en barres de progression horizontales.
//      - Chaque catégorie affiche son icône (🍞, 🥤, 🧼), son nom,
//        le total dépensé en TND et son pourcentage du total.
//   3. Carte "Comparaison Mois par Mois" :
//      - Confrontation du total du mois courant vs le mois précédent.
//      - Calcul automatique et affichage clair de l'économie réalisée (🎉)
//        ou du surcoût enregistré (⚠️).
//
// CONCEPTS REACT NATIVE & SQL :
//   - Requête SQL avec GROUP BY et SUM (getDepensesParCategorie).
//   - useFocusEffect : actualisation instantanée après un nouvel achat.
//   - Barres de progression graphiques stylisées sans bibliothèque lourde.
// ============================================================

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Fonctions d'analyse SQL
import {
  getTotalMois,
  getTotalMoisPrecedent,
  getDepensesParCategorie,
  getTotalPoints,
  getPointsSettings,
  DepenseParCategorie,
  PointsSettings,
} from '../../db/queries';

// Contexte et internationalisation
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';

export default function AnalysesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Détermination du mois en cours (AAAA-MM)
  const maintenant = new Date();
  const moisCourant = `${maintenant.getFullYear()}-${String(
    maintenant.getMonth() + 1
  ).padStart(2, '0')}`;

  // ÉTATS LOCAUX :
  const [totalMois, setTotalMois] = useState<number>(0);
  const [totalPrecedent, setTotalPrecedent] = useState<number>(0);
  const [categories, setCategories] = useState<DepenseParCategorie[]>([]);
  const [pointsTotal, setPointsTotal] = useState<number>(0);
  const [pointsSettings, setPointsSettings] = useState<PointsSettings | null>(null);

  // Palette de couleurs pour différencier les catégories dans les barres
  const couleurs = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  // ----------------------------------------------------------
  // CHARGEMENT DES STATISTIQUES DEPUIS SQLITE
  // ----------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (user) {
        // 1. Total du mois courant
        const tot = getTotalMois(user.id, moisCourant);
        setTotalMois(tot);

        // 2. Total du mois précédent
        const totPrec = getTotalMoisPrecedent(user.id, moisCourant);
        setTotalPrecedent(totPrec);

        // 3. Répartition des dépenses groupées par catégorie
        const catData = getDepensesParCategorie(user.id, moisCourant);
        setCategories(catData);

        // 4. Points et Gamification
        const pts = getTotalPoints(user.id);
        setPointsTotal(pts);
        const s = getPointsSettings();
        setPointsSettings(s);
      }
    }, [user, moisCourant])
  );

  // ----------------------------------------------------------
  // CALCULS STATISTIQUES COMPARATIFS ET NIVEAUX
  // ----------------------------------------------------------
  const difference = totalMois - totalPrecedent;
  const aEconomise = difference <= 0;

  const seuilEco = pointsSettings?.seuil_econome ?? 100;
  const seuilExp = pointsSettings?.seuil_expert ?? 300;

  let niveauNom = t('niveau_debutant') ?? 'Débutant';
  let niveauIcone = '🌱';
  let progressionPct = 0;
  let messageProchainNiveau = '';

  if (pointsTotal >= seuilExp) {
    niveauNom = t('niveau_expert') ?? 'Expert';
    niveauIcone = '🏆';
    progressionPct = 100;
    messageProchainNiveau = 'Félicitations ! Vous avez atteint le rang suprême d\'Expert budgétaire.';
  } else if (pointsTotal >= seuilEco) {
    niveauNom = t('niveau_econome') ?? 'Économe';
    niveauIcone = '💰';
    progressionPct = Math.min(100, Math.round(((pointsTotal - seuilEco) / (seuilExp - seuilEco)) * 100));
    messageProchainNiveau = `Plus que ${seuilExp - pointsTotal} points pour atteindre le rang Expert !`;
  } else {
    progressionPct = Math.min(100, Math.round((pointsTotal / seuilEco) * 100));
    messageProchainNiveau = `Plus que ${seuilEco - pointsTotal} points pour débloquer le rang Économe !`;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ==================================================== */}
      {/* CARTE 1 : RÉSUMÉ DU TOTAL MENSUEL                    */}
      {/* ==================================================== */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{t('total_mois')}</Text>
        <Text style={styles.summaryAmount}>
          {totalMois.toFixed(3)} <Text style={styles.currency}>TND</Text>
        </Text>
        <Text style={styles.monthBadge}>📅 {moisCourant}</Text>
      </View>

      {/* ==================================================== */}
      {/* CARTE 2 : RÉPARTITION PAR CATÉGORIE (Graphique en barres) */}
      {/* ==================================================== */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('repartition_categorie')}</Text>

        {categories.length === 0 ? (
          <Text style={styles.emptyNote}>
            Enregistrez des achats pour visualiser la répartition par catégorie.
          </Text>
        ) : (
          categories.map((cat, index) => {
            // Calcul du pourcentage de cette catégorie par rapport au total
            const pourcentage = totalMois > 0 ? (cat.total / totalMois) * 100 : 0;
            const couleurBarre = couleurs[index % couleurs.length];

            return (
              <View key={cat.categorie_nom} style={styles.categoryRow}>
                {/* Ligne de texte : Nom catégorie + Montant + % */}
                <View style={styles.categoryLabelRow}>
                  <Text style={styles.categoryName}>
                    {cat.categorie_icone} {cat.categorie_nom}
                  </Text>
                  <Text style={styles.categoryAmount}>
                    {cat.total.toFixed(3)} TND ({pourcentage.toFixed(0)}%)
                  </Text>
                </View>

                {/* Barre graphique proportionnelle */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${pourcentage}%`,
                        backgroundColor: couleurBarre,
                      },
                    ]}
                  />
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ==================================================== */}
      {/* CARTE 3 : COMPARAISON MOIS PAR MOIS                  */}
      {/* ==================================================== */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comparaison avec le mois précédent</Text>

        <View style={styles.comparisonGrid}>
          {/* Bloc Mois précédent */}
          <View style={styles.comparisonBox}>
            <Text style={styles.comparisonBoxLabel}>{t('mois_precedent')}</Text>
            <Text style={styles.comparisonBoxValue}>
              {totalPrecedent.toFixed(3)} TND
            </Text>
          </View>

          {/* Bloc Mois actuel */}
          <View style={styles.comparisonBox}>
            <Text style={styles.comparisonBoxLabel}>Mois Actuel</Text>
            <Text style={styles.comparisonBoxValue}>
              {totalMois.toFixed(3)} TND
            </Text>
          </View>
        </View>

        {/* Message d'analyse comparative dynamique */}
        {totalPrecedent > 0 ? (
          <View
            style={[
              styles.comparisonBanner,
              aEconomise ? styles.bannerSuccess : styles.bannerWarning,
            ]}
          >
            <Text
              style={
                aEconomise ? styles.bannerSuccessText : styles.bannerWarningText
              }
            >
              {aEconomise
                ? `🎉 ${t('economie')} de ${Math.abs(difference).toFixed(3)} TND !`
                : `⚠️ ${t('depassement')} de ${difference.toFixed(3)} TND.`}
            </Text>
          </View>
        ) : (
          <Text style={styles.emptyNote}>
            Les comparaisons apparaîtront dès le deuxième mois d'utilisation.
          </Text>
        )}
      </View>

      {/* ==================================================== */}
      {/* CARTE 4 : PERFORMANCE ET GAMIFICATION                */}
      {/* ==================================================== */}
      <View style={styles.card}>
        <View style={styles.gamificationHeader}>
          <Text style={styles.cardTitle}>🎯 Progression & Niveau</Text>
          <View style={styles.badgePill}>
            <Text style={{ fontSize: 16 }}>{niveauIcone}</Text>
            <Text style={styles.badgePillText}>{niveauNom}</Text>
          </View>
        </View>

        <View style={styles.pointsRow}>
          <Text style={styles.pointsBig}>{pointsTotal}</Text>
          <Text style={styles.pointsUnit}>{t('points') ?? 'points'}</Text>
        </View>

        {/* Barre de progression vers le niveau supérieur */}
        <View style={styles.levelProgressTrack}>
          <View
            style={[
              styles.levelProgressFill,
              { width: `${progressionPct}%` },
            ]}
          />
        </View>

        <Text style={styles.nextLevelNotice}>{messageProchainNiveau}</Text>
      </View>
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
  summaryCard: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryLabel: {
    color: '#BFDBFE',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  currency: {
    fontSize: 18,
    fontWeight: '600',
  },
  monthBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 14,
  },
  emptyNote: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  categoryRow: {
    marginBottom: 14,
  },
  categoryLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  categoryAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  barTrack: {
    height: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  comparisonGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  comparisonBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  comparisonBoxLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  comparisonBoxValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  comparisonBanner: {
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  bannerSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  bannerSuccessText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerWarning: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  bannerWarningText: {
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 13,
  },
  gamificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1D4ED8',
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 6,
  },
  pointsBig: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E293B',
  },
  pointsUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  levelProgressTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 10,
  },
  levelProgressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  nextLevelNotice: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
});
