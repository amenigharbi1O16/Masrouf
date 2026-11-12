// ============================================================
// FICHIER : src/app/(tabs)/analyses.tsx
// RÔLE    : Écran d'analyse budgétaire et financière — Design Figma 20 & 21.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 20 & 21 · FR) :
//   • Header standardisé avec ☰ hamburger + titre "Analyses" + icône profil
//   • Label de période : "01–30 NOV. 2026"
//   • Carte Hero Forest (#102B27) :
//       - "TOTAL DÉPENSÉ"
//       - Montant grand format : "750.000 DT"
//       - Comparaison : "↓ 150.000 DT (-16.7%)" vs mois précédent
//       - Mention : "vs mois précédent · même période"
//   • Section "Où va votre argent" :
//       - Barre horizontale multi-segments colorés proportionnels
//       - Légende textuelle en dessous avec les pourcentages par catégorie
//   • Section "Classement des dépenses" :
//       - Liste numérotée (1, 2, 3...) par montant décroissant
//   • Section "Produits phares · par dépense" :
//       - Top 3 des produits les plus dépensés avec leur total
//   • Section "Évolution du prix unitaire" :
//       - Graphique linéaire stylisé du produit phare
//   • Section "Points et progrès" (Design Figma 21) :
//       - Score total, badge de niveau, barre de progression
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getTotalMois,
  getTotalMoisPrecedent,
  getDepensesParCategorie,
  getTopProduitsParDepense,
  getAchatsByProduit,
  getTotalPoints,
  getPointsSettings,
  DepenseParCategorie,
  TopProduitDepense,
  PointsSettings,
} from '../../db/queries';

// Design System, Contexte et internationalisation
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

// Palette de couleurs pour la barre segmentée
const PALETTE_SEGMENTS = [
  Theme.colors.forest,
  '#2C6E5A',
  Theme.colors.gold,
  Theme.colors.coral,
  '#78B39B',
  '#99B898',
  '#6C5B7B',
];

const MOIS_NOMS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

export default function AnalysesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useDrawer();

  const maintenant = new Date();
  const anneeCourante = maintenant.getFullYear();
  const moisIndex = maintenant.getMonth(); // 0–11
  const moisCourant = `${anneeCourante}-${String(moisIndex + 1).padStart(2, '0')}`;
  const dernierJour = new Date(anneeCourante, moisIndex + 1, 0).getDate();

  // Libellé de période : ex "01–30 NOV. 2026"
  const periodeLibelle = `01–${String(dernierJour).padStart(2, '0')} ${MOIS_NOMS_FR[moisIndex].substring(0, 4).toUpperCase()} ${anneeCourante}`;

  // États locaux
  const [totalMois, setTotalMois] = useState<number>(0);
  const [totalPrecedent, setTotalPrecedent] = useState<number>(0);
  const [categories, setCategories] = useState<DepenseParCategorie[]>([]);
  const [topProduits, setTopProduits] = useState<TopProduitDepense[]>([]);
  const [pointsTotal, setPointsTotal] = useState<number>(0);
  const [pointsSettings, setPointsSettings] = useState<PointsSettings | null>(null);

  // Historique de prix pour le produit n°1
  const [pointsChart, setPointsChart] = useState<{ label: string; prix: number }[]>([]);

  // ----------------------------------------------------------
  // CHARGEMENT DES DONNÉES SQLite AU FOCUS
  // ----------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      const tot = getTotalMois(user.id, moisCourant);
      setTotalMois(tot);

      const totPrec = getTotalMoisPrecedent(user.id, moisCourant);
      setTotalPrecedent(totPrec);

      const cats = getDepensesParCategorie(user.id, moisCourant);
      setCategories(cats);

      const tops = getTopProduitsParDepense(user.id, moisCourant, 3);
      setTopProduits(tops);

      if (tops.length > 0) {
        const achatsTop = getAchatsByProduit(tops[0].produit_id, user.id);
        const pts = achatsTop
          .slice(0, 4)
          .reverse()
          .map((a) => {
            const d = new Date(a.date_achat);
            const m = isNaN(d.getTime()) ? 'Mois' : MOIS_NOMS_FR[d.getMonth()]?.substring(0, 4) ?? 'Mois';
            return { label: m, prix: a.prix_unitaire };
          });
        setPointsChart(pts);
      } else {
        setPointsChart([]);
      }

      const pts = getTotalPoints(user.id);
      setPointsTotal(pts);
      setPointsSettings(getPointsSettings());
    }, [user, moisCourant])
  );

  // ----------------------------------------------------------
  // CALCULS STATISTIQUES COMPARATIFS
  // ----------------------------------------------------------
  const difference = totalMois - totalPrecedent;
  const aEconomise = difference <= 0;
  const variationPct = totalPrecedent > 0
    ? ((Math.abs(difference) / totalPrecedent) * 100).toFixed(1)
    : null;

  // Calculs pour les niveaux de points (Figma 21)
  const seuilEco = pointsSettings?.seuil_econome ?? 300;
  const seuilExp = pointsSettings?.seuil_expert ?? 1000;

  let rangNom = 'Débutant';
  let pointsRestants = Math.max(0, seuilEco - pointsTotal);
  let progressionPct = Math.min(100, (pointsTotal / seuilEco) * 100);

  if (pointsTotal >= seuilExp) {
    rangNom = 'Expert';
    pointsRestants = 0;
    progressionPct = 100;
  } else if (pointsTotal >= seuilEco) {
    rangNom = 'Économe';
    pointsRestants = Math.max(0, seuilExp - pointsTotal);
    progressionPct = Math.min(100, ((pointsTotal - seuilEco) / (seuilExp - seuilEco)) * 100);
  }

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* HEADER : hamburger ☰ + "Analyses" + profil                */}
      {/* ========================================================= */}
      <AppHeader
        titre={t('analyses') ?? 'Analyses'}
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* LABEL DE PÉRIODE                                          */}
        {/* ========================================================= */}
        <Text style={styles.periodLabel}>{periodeLibelle}</Text>

        {/* ========================================================= */}
        {/* CARTE HERO : TOTAL DÉPENSÉ (Forest Green #102B27)         */}
        {/* ========================================================= */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>
            {t('total_depense') ?? 'TOTAL DÉPENSÉ'}
          </Text>
          <Text style={styles.heroAmount}>
            {totalMois.toFixed(3)} DT
          </Text>

          {/* Comparaison avec le mois précédent */}
          {totalPrecedent > 0 ? (
            <View style={styles.deltaBox}>
              <Text style={styles.deltaText}>
                {aEconomise ? '↓' : '↑'}{' '}
                {Math.abs(difference).toFixed(3)} DT{' '}
                ({aEconomise ? '-' : '+'}{variationPct}%)
              </Text>
              <Text style={styles.deltaSub}>
                {t('vs_mois_precedent') ?? 'vs mois précédent · même durée'}
              </Text>
            </View>
          ) : (
            <Text style={styles.deltaSub}>
              {t('premier_mois_suivi') ?? 'Premier mois de suivi budgétaire'}
            </Text>
          )}
        </View>

        {/* ========================================================= */}
        {/* SECTION : OÙ VA VOTRE ARGENT                             */}
        {/* ========================================================= */}
        <Text style={styles.sectionTitle}>
          {t('ou_va_votre_argent') ?? 'Où va votre argent'}
        </Text>

        <View style={styles.card}>
          {categories.length === 0 ? (
            <Text style={styles.emptyNote}>
              {t('aucun_achat_mois') ?? 'Aucune dépense enregistrée pour ce mois.'}
            </Text>
          ) : (
            <>
              {/* Barre multi-segments proportionnels */}
              <View style={styles.segmentedBar}>
                {categories.map((cat, idx) => {
                  const pct = totalMois > 0 ? (cat.total / totalMois) * 100 : 0;
                  if (pct <= 0) return null;
                  return (
                    <View
                      key={cat.categorie_nom}
                      style={[
                        styles.segment,
                        {
                          flex: pct,
                          backgroundColor: PALETTE_SEGMENTS[idx % PALETTE_SEGMENTS.length],
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Légende en texte sous la barre */}
              <View style={styles.legendContainer}>
                {categories.map((cat, idx) => {
                  const pct = totalMois > 0 ? ((cat.total / totalMois) * 100).toFixed(1) : '0';
                  return (
                    <View key={cat.categorie_nom} style={styles.legendItem}>
                      <View
                        style={[
                          styles.legendDot,
                          { backgroundColor: PALETTE_SEGMENTS[idx % PALETTE_SEGMENTS.length] },
                        ]}
                      />
                      <Text style={styles.legendText}>
                        {cat.categorie_nom} {pct}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* ========================================================= */}
        {/* SECTION : CLASSEMENT DES DÉPENSES                         */}
        {/* ========================================================= */}
        <Text style={styles.sectionTitle}>
          {t('classement_depenses') ?? 'Classement des dépenses'}
        </Text>

        <View style={styles.listCard}>
          {categories.length === 0 ? (
            <Text style={styles.emptyNote}>
              {t('aucun_achat_mois') ?? 'Aucune dépense enregistrée.'}
            </Text>
          ) : (
            categories.map((cat, idx) => (
              <View
                key={cat.categorie_nom}
                style={[
                  styles.rankingRow,
                  idx < categories.length - 1 && styles.borderBottom,
                ]}
              >
                <View style={styles.rankingLeft}>
                  <Text style={styles.rankingNum}>{idx + 1}</Text>
                  <Text style={styles.rankingIcon}>{cat.categorie_icone}</Text>
                  <Text style={styles.rankingName}>{cat.categorie_nom}</Text>
                </View>
                <Text style={styles.rankingAmount}>
                  {cat.total.toFixed(3)} DT
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ========================================================= */}
        {/* SECTION : PRODUITS PHARES · PAR DÉPENSE                   */}
        {/* ========================================================= */}
        <Text style={styles.sectionTitle}>
          {t('produits_phares') ?? 'Produits phares · par dépense'}
        </Text>

        <View style={styles.listCard}>
          {topProduits.length === 0 ? (
            <Text style={styles.emptyNote}>
              {t('aucun_produit_achete') ?? 'Aucun produit spécifique acheté ce mois-ci.'}
            </Text>
          ) : (
            topProduits.map((prod, idx) => (
              <TouchableOpacity
                key={prod.produit_id}
                style={[
                  styles.rankingRow,
                  idx < topProduits.length - 1 && styles.borderBottom,
                ]}
                onPress={() => router.push(`/produit/${prod.produit_id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.rankingLeft}>
                  <Text style={styles.rankingNum}>{idx + 1}</Text>
                  <Text style={styles.rankingName}>{prod.produit_nom}</Text>
                </View>
                <Text style={styles.rankingAmount}>
                  {prod.total_depense.toFixed(3)} DT
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* ========================================================= */}
        {/* GRAPHIQUE DU PRODUIT N°1 : ÉVOLUTION DU PRIX UNITAIRE     */}
        {/* ========================================================= */}
        {topProduits.length > 0 && pointsChart.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              {topProduits[0].produit_nom} · {t('evolution_prix_unitaire') ?? 'évolution du prix unitaire'}
            </Text>
            <Text style={styles.chartUnit}>
              DT / {topProduits[0].unite || 'unité'}
            </Text>

            {/* Visualisation simple et élégante de la courbe */}
            <View style={styles.chartBody}>
              <View style={styles.chartLines}>
                {pointsChart.map((p, i) => (
                  <View key={i} style={styles.chartPointCol}>
                    <Text style={styles.chartPointValue}>{p.prix.toFixed(2)}</Text>
                    <View style={styles.chartDot} />
                    <Text style={styles.chartPointLabel}>{p.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* SECTION : POINTS ET SUCCÈS (Figma 21)                    */}
        {/* ========================================================= */}
        <Text style={styles.sectionTitle}>
          {t('points_et_progres') ?? 'Points et progrès'}
        </Text>

        <View style={styles.pointsHero}>
          <Text style={styles.pointsHeroLabel}>
            {t('vos_points') ?? 'VOS POINTS'}
          </Text>
          <Text style={styles.pointsHeroNumber}>{pointsTotal}</Text>
          <Text style={styles.pointsHeroSub}>
            Niveau {rangNom} {pointsRestants > 0 ? `· ${pointsRestants} points avant rang supérieur` : '· Niveau max atteint !'}
          </Text>

          {/* Barre de progression dorée */}
          <View style={styles.pointsBarTrack}>
            <View
              style={[
                styles.pointsBarFill,
                { width: `${progressionPct}%` },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 20 & 21
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },

  // Label uppercase de période
  periodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Carte Hero Dark Forest Green (#102B27)
  heroCard: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.xl,
    padding: 24,
    marginBottom: 24,
    ...Theme.shadows.card,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.mint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: Theme.colors.white,
    marginBottom: 12,
  },
  deltaBox: {
    gap: 2,
  },
  deltaText: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.mint,
  },
  deltaSub: {
    fontSize: 12,
    color: 'rgba(217, 240, 228, 0.7)',
  },

  // Titres de sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 12,
  },

  // Carte blanche standard
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 24,
    ...Theme.shadows.card,
  },

  // Barre horizontale multi-segments colorés
  segmentedBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: Theme.colors.warm,
    marginBottom: 16,
  },
  segment: {
    height: '100%',
  },

  // Légende
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 13,
    color: Theme.colors.ink,
  },

  // Carte liste de classement
  listCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 24,
    ...Theme.shadows.card,
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  rankingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankingNum: {
    fontSize: 14,
    color: Theme.colors.muted,
    fontWeight: '600',
    width: 16,
  },
  rankingIcon: {
    fontSize: 18,
  },
  rankingName: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
  rankingAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.ink,
  },

  // Graphique
  chartCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 24,
    ...Theme.shadows.card,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
    marginBottom: 2,
  },
  chartUnit: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginBottom: 16,
  },
  chartBody: {
    paddingVertical: 10,
  },
  chartLines: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: 8,
  },
  chartPointCol: {
    alignItems: 'center',
    gap: 6,
  },
  chartPointValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepGreen,
  },
  chartDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.forest,
  },
  chartPointLabel: {
    fontSize: 11,
    color: Theme.colors.muted,
    textTransform: 'capitalize',
  },

  // Section Points & Habitudes
  pointsHero: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.xl,
    padding: 24,
    marginBottom: 16,
    ...Theme.shadows.card,
  },
  pointsHeroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.mint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  pointsHeroNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: Theme.colors.white,
    marginBottom: 8,
  },
  pointsHeroSub: {
    fontSize: 13,
    color: 'rgba(217, 240, 228, 0.8)',
    marginBottom: 14,
  },
  pointsBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pointsBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.gold,
    borderRadius: 4,
  },

  emptyNote: {
    fontSize: 13,
    color: Theme.colors.muted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
});
