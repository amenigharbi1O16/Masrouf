// ============================================================
// FICHIER : src/app/(tabs)/analyses.tsx
// MISSION : Écran d'analyse budgétaire complet — 100 % conforme aux exigences :
//           1. Résumé avec période de même durée et calculs en millimes entiers
//           2. Diagramme de répartition multi-segments (max 5 + "Autres") + légende
//           3. Détail par catégorie avec écarts, enveloppes, non budgétisé, et sous-totaux produits/dépenses
//           4. Conclusion automatique par règles sans IA (3 langues avec paramètres)
//           5. Classements individuels et courbe d'évolution de prix avec choix du produit
//           6. État vide propre avec CTA "+ Ajouter un achat"
// ============================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

// Fonctions SQLite
import {
  getBudgetCouvrant,
  getMonthlyBudget,
  getAnalysesParCategoriePeriode,
  getTopDepensesIndividuellesPeriode,
  getTopProduitsPeriode,
  getEvolutionPrixProduit,
  getAllProduits,
  getTotalPoints,
  getPointsSettings,
  CategoriePeriodeStat,
  DepenseIndividuelle,
  ProduitDepensePeriode,
  PointPrixProduit,
  Produit,
  PointsSettings,
} from '../../db/queries';

// Design System & Formatage
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { formatDT, formatPourcentage, formatPeriode, formatDate } from '../../utils/format';
import { useDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';
import ProductThumb from '../../components/ProductThumb';

// Palette officielle de la barre segmentée
const PALETTE_SEGMENTS = [
  Theme.colors.forest,
  Theme.colors.deepGreen,
  Theme.colors.gold,
  Theme.colors.coral,
  '#2C6E5A',
  '#61746D',
];

function formaterIso(d: Date): string {
  const annee = d.getFullYear();
  const mois = String(d.getMonth() + 1).padStart(2, '0');
  const jour = String(d.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

export default function AnalysesScreen() {
  const { user } = useAuth();
  const { t, langue } = useTranslation();
  const { openDrawer } = useDrawer();
  const params = useLocalSearchParams<{ startDate?: string; endDate?: string }>();

  // ------------------------------------------------------------
  // Calcul de la période courante et précédente de même durée
  // ------------------------------------------------------------
  const aujourdhui = useMemo(() => new Date(), []);
  const todayIso = formaterIso(aujourdhui);

  // Recherche du budget couvrant ou mois civil par défaut
  const budgetCouvrant = user ? getBudgetCouvrant(user.id, todayIso) : null;
  const moisCle = todayIso.substring(0, 7);
  const budgetMois = user ? getMonthlyBudget(user.id, moisCle) : null;

  const dateDebutCourante =
    params.startDate ||
    budgetCouvrant?.start_date ||
    budgetMois?.start_date ||
    `${moisCle}-01`;

  const dateFinCourante =
    params.endDate ||
    budgetCouvrant?.end_date ||
    budgetMois?.end_date ||
    formaterIso(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() + 1, 0));

  // Période précédente de MÊME DURÉE (se termine la veille du début courant)
  const { dateDebutPrecedente, dateFinPrecedente } = useMemo(() => {
    const dDebut = new Date(dateDebutCourante);
    const dFin = new Date(dateFinCourante);
    const dureeJours = Math.max(1, Math.round((dFin.getTime() - dDebut.getTime()) / (1000 * 3600 * 24)) + 1);

    const dFinPrec = new Date(dDebut);
    dFinPrec.setDate(dFinPrec.getDate() - 1);

    const dDebutPrec = new Date(dFinPrec);
    dDebutPrec.setDate(dDebutPrec.getDate() - (dureeJours - 1));

    return {
      dateDebutPrecedente: formaterIso(dDebutPrec),
      dateFinPrecedente: formaterIso(dFinPrec),
    };
  }, [dateDebutCourante, dateFinCourante]);

  // Données de l'analyse
  const [categories, setCategories] = useState<CategoriePeriodeStat[]>([]);
  const [totalCourantDT, setTotalCourantDT] = useState<number>(0);
  const [totalPrecedentDT, setTotalPrecedentDT] = useState<number>(0);
  const [nonBudgetiseDT, setNonBudgetiseDT] = useState<number>(0);
  const [sousTotalProduitsDT, setSousTotalProduitsDT] = useState<number>(0);
  const [sousTotalDepensesDT, setSousTotalDepensesDT] = useState<number>(0);

  // Classements et courbe
  const [topDepenses, setTopDepenses] = useState<DepenseIndividuelle[]>([]);
  const [topProduits, setTopProduits] = useState<ProduitDepensePeriode[]>([]);
  const [tousProduits, setTousProduits] = useState<Produit[]>([]);
  const [produitSelectionne, setProduitSelectionne] = useState<Produit | null>(null);
  const [pointsCourbe, setPointsCourbe] = useState<PointPrixProduit[]>([]);
  const [modalProduitVisible, setModalProduitVisible] = useState(false);

  // Gamification
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [pointsSettings, setPointsSettings] = useState<PointsSettings | null>(null);

  // ------------------------------------------------------------
  // Rechargement SQLite au focus
  // ------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      const budgetId = budgetCouvrant?.id || budgetMois?.id || null;

      const resultat = getAnalysesParCategoriePeriode(
        user.id,
        dateDebutCourante,
        dateFinCourante,
        dateDebutPrecedente,
        dateFinPrecedente,
        budgetId
      );

      setCategories(resultat.categories);
      setTotalCourantDT(resultat.totalCourantDT);
      setTotalPrecedentDT(resultat.totalPrecedentDT);
      setNonBudgetiseDT(resultat.nonBudgetiseDT);
      setSousTotalProduitsDT(resultat.sousTotalProduitsDT);
      setSousTotalDepensesDT(resultat.sousTotalDepensesDT);

      const topsIndiv = getTopDepensesIndividuellesPeriode(user.id, dateDebutCourante, dateFinCourante, 5);
      setTopDepenses(topsIndiv);

      const topsProds = getTopProduitsPeriode(user.id, dateDebutCourante, dateFinCourante, 5);
      setTopProduits(topsProds);

      const prodsCatalogue = getAllProduits(user.id);
      setTousProduits(prodsCatalogue);

      // Sélection par défaut pour la courbe
      if (prodsCatalogue.length > 0) {
        const prodDefaut =
          topsProds.length > 0
            ? prodsCatalogue.find((p) => p.id === topsProds[0].produit_id) || prodsCatalogue[0]
            : prodsCatalogue[0];
        setProduitSelectionne(prodDefaut);
        setPointsCourbe(getEvolutionPrixProduit(prodDefaut.id, user.id));
      } else {
        setProduitSelectionne(null);
        setPointsCourbe([]);
      }

      setTotalPoints(getTotalPoints(user.id));
      setPointsSettings(getPointsSettings());
    }, [user, dateDebutCourante, dateFinCourante, dateDebutPrecedente, dateFinPrecedente, budgetCouvrant?.id, budgetMois?.id])
  );

  function changerProduitCourbe(p: Produit) {
    if (!user) return;
    setProduitSelectionne(p);
    setPointsCourbe(getEvolutionPrixProduit(p.id, user.id));
    setModalProduitVisible(false);
  }

  // ------------------------------------------------------------
  // 1. Calculs du résumé et comparaison période précédente
  // ------------------------------------------------------------
  const ecartMontantDT = totalCourantDT - totalPrecedentDT;
  const aEconomise = ecartMontantDT <= 0;
  const ecartPct =
    totalPrecedentDT > 0
      ? Math.round(((Math.abs(ecartMontantDT) / totalPrecedentDT) * 100) * 10) / 10
      : null;

  // ------------------------------------------------------------
  // 2. Diagramme de répartition (max 5 + "Autres")
  // ------------------------------------------------------------
  const segmentsDiagramme = useMemo(() => {
    if (categories.length === 0 || totalCourantDT <= 0) return [];

    const top5 = categories.slice(0, 5);
    const reste = categories.slice(5);
    const sommeResteDT = reste.reduce((acc, c) => acc + c.total_dt, 0);

    const liste = top5.map((c, idx) => ({
      nom: c.categorie_nom,
      pct: c.part_pourcentage,
      couleur: PALETTE_SEGMENTS[idx % PALETTE_SEGMENTS.length],
    }));

    if (sommeResteDT > 0) {
      const pctReste = Math.round((sommeResteDT / totalCourantDT) * 1000) / 10;
      liste.push({
        nom: t('autres'),
        pct: pctReste,
        couleur: PALETTE_SEGMENTS[5],
      });
    }

    return liste;
  }, [categories, totalCourantDT, t]);

  // ------------------------------------------------------------
  // 4. Construction de la conclusion automatique par règles (sans IA)
  // ------------------------------------------------------------
  const phrasesConclusion = useMemo(() => {
    if (totalCourantDT <= 0 || categories.length === 0) return [];
    const phrases: string[] = [];

    // Règle 1 : Catégorie la plus dépensée (gestion stricte des égalités)
    const maxDepense = categories[0].total_dt;
    const exAequo = categories.filter((c) => Math.abs(c.total_dt - maxDepense) < 0.0001);

    if (exAequo.length >= 2) {
      phrases.push(
        t('conclusion_top_cat_egalite', {
          cat1: exAequo[0].categorie_nom,
          cat2: exAequo[1].categorie_nom,
          montant: formatDT(maxDepense, langue),
        })
      );
    } else {
      phrases.push(
        t('conclusion_top_cat', {
          cat: categories[0].categorie_nom,
          montant: formatDT(categories[0].total_dt, langue),
          pct: formatPourcentage(categories[0].part_pourcentage),
        })
      );
    }

    // Règle 2 : Plus forte hausse et plus forte baisse par rapport à la période précédente
    if (totalPrecedentDT > 0) {
      let plusForteHausse: CategoriePeriodeStat | null = null;
      let plusForteBaisse: CategoriePeriodeStat | null = null;

      for (const cat of categories) {
        if (cat.ecart_dt > 0) {
          if (!plusForteHausse || cat.ecart_dt > plusForteHausse.ecart_dt) {
            plusForteHausse = cat;
          }
        } else if (cat.ecart_dt < 0) {
          if (!plusForteBaisse || cat.ecart_dt < plusForteBaisse.ecart_dt) {
            plusForteBaisse = cat;
          }
        }
      }

      if (plusForteHausse) {
        phrases.push(
          t('conclusion_hausse', {
            cat: plusForteHausse.categorie_nom,
            ecart: formatDT(plusForteHausse.ecart_dt, langue),
          })
        );
      }
      if (plusForteBaisse) {
        phrases.push(
          t('conclusion_baisse', {
            cat: plusForteBaisse.categorie_nom,
            ecart: formatDT(Math.abs(plusForteBaisse.ecart_dt), langue),
          })
        );
      }
    }

    // Règle 3 : Catégories dépassant leur enveloppe
    const depassees = categories.filter((c) => c.montant_alloue > 0 && c.total_dt > c.montant_alloue);
    if (depassees.length > 0) {
      const noms = depassees.map((c) => c.categorie_nom).join(', ');
      phrases.push(t('conclusion_depassement', { cats: noms }));
    }

    // Règle 4 : Phrase sur le total global (hausse ou baisse)
    if (totalPrecedentDT > 0 && ecartPct !== null && Math.abs(ecartMontantDT) > 0.001) {
      if (aEconomise) {
        phrases.push(t('conclusion_total_baisse', { pct: formatPourcentage(ecartPct) }));
      } else {
        phrases.push(t('conclusion_total_hausse', { pct: formatPourcentage(ecartPct) }));
      }
    }

    return phrases;
  }, [categories, totalCourantDT, totalPrecedentDT, ecartMontantDT, ecartPct, aEconomise, t, langue]);

  // Gamification progress
  const seuilEco = pointsSettings?.seuil_econome ?? 300;
  const seuilExp = pointsSettings?.seuil_expert ?? 1000;
  let rangNom = t('niveau_debutant');
  let pointsRestants = Math.max(0, seuilEco - totalPoints);
  let progressionPct = Math.min(100, (totalPoints / seuilEco) * 100);

  if (totalPoints >= seuilExp) {
    rangNom = t('niveau_expert');
    pointsRestants = 0;
    progressionPct = 100;
  } else if (totalPoints >= seuilEco) {
    rangNom = t('niveau_econome');
    pointsRestants = Math.max(0, seuilExp - totalPoints);
    progressionPct = Math.min(100, ((totalPoints - seuilEco) / (seuilExp - seuilEco)) * 100);
  }

  return (
    <View style={styles.container}>
      <AppHeader titre={t('analyses')} onMenuPress={openDrawer} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ========================================================= */}
        {/* 1. RÉSUMÉ DE LA PÉRIODE & COMPARAISON PÉRIODE PRÉCÉDENTE */}
        {/* ========================================================= */}
        <Text style={styles.periodLabel}>
          {formatPeriode(dateDebutCourante, dateFinCourante, langue)}
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t('total_depense')}</Text>
          <Text style={styles.heroAmount}>{formatDT(totalCourantDT, langue)}</Text>

          {totalPrecedentDT > 0 ? (
            <View style={styles.deltaBox}>
              <Text
                style={[
                  styles.deltaText,
                  { color: aEconomise ? Theme.colors.mint : Theme.colors.coral },
                ]}
              >
                {aEconomise ? '↓' : '↑'} {formatDT(Math.abs(ecartMontantDT), langue)} (
                {aEconomise ? '-' : '+'}
                {formatPourcentage(ecartPct ?? 0)})
              </Text>
              <Text style={styles.deltaSub}>{t('vs_mois_precedent')}</Text>
            </View>
          ) : (
            <Text style={styles.deltaSub}>{t('pas_encore_comparer')}</Text>
          )}
        </View>

        {/* ÉTAT VIDE SI AUCUNE DÉPENSE */}
        {totalCourantDT <= 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>{t('aucun_achat_mois')}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/nouvel-achat')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>+ {t('ajouter_achat')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ========================================================= */}
            {/* 2. DIAGRAMME DE RÉPARTITION PAR CATÉGORIE                */}
            {/* ========================================================= */}
            <Text style={styles.sectionTitle}>{t('ou_va_votre_argent')}</Text>
            <View style={styles.card}>
              <View style={styles.segmentedBar}>
                {segmentsDiagramme.map((seg, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.segment,
                      { flex: seg.pct, backgroundColor: seg.couleur },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.legendContainer}>
                {segmentsDiagramme.map((seg, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: seg.couleur }]} />
                    <Text style={styles.legendText}>
                      {seg.nom} {formatPourcentage(seg.pct)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ========================================================= */}
            {/* 3. DÉTAIL DE CHAQUE CATÉGORIE DÉPENSÉE                    */}
            {/* ========================================================= */}
            <Text style={styles.sectionTitle}>{t('repartition_categorie')}</Text>
            <View style={styles.listCard}>
              {categories.map((cat, idx) => {
                const depasse = cat.montant_alloue > 0 && cat.total_dt > cat.montant_alloue;
                const couleurBarre = depasse
                  ? Theme.colors.coral
                  : cat.pourcentage_consomme >= 80
                  ? Theme.colors.gold
                  : Theme.colors.statusGreen;

                return (
                  <View
                    key={cat.categorie_id}
                    style={[
                      styles.categoryDetailRow,
                      idx < categories.length - 1 && styles.borderBottom,
                    ]}
                  >
                    <View style={styles.categoryHeaderRow}>
                      <View style={styles.catLeft}>
                        <Text style={styles.catIcon}>{cat.categorie_icone}</Text>
                        <Text style={styles.catName}>{cat.categorie_nom}</Text>
                      </View>
                      <View style={styles.catRight}>
                        <Text style={styles.catAmount}>{formatDT(cat.total_dt, langue)}</Text>
                        <Text style={styles.catPart}>{formatPourcentage(cat.part_pourcentage)}</Text>
                      </View>
                    </View>

                    {/* Écart période précédente */}
                    <View style={styles.ecartRow}>
                      {cat.est_nouveau ? (
                        <Text style={styles.ecartNouveau}>{t('nouveau')}</Text>
                      ) : cat.total_dt === 0 ? (
                        <Text style={styles.ecartMuted}>{t('aucune_depense_prec')}</Text>
                      ) : (
                        <Text
                          style={[
                            styles.ecartText,
                            { color: cat.ecart_dt <= 0 ? Theme.colors.deepGreen : Theme.colors.coral },
                          ]}
                        >
                          {cat.ecart_dt <= 0 ? '↓' : '↑'} {formatDT(Math.abs(cat.ecart_dt), langue)}{' '}
                          {cat.ecart_pct !== null
                            ? `(${cat.ecart_dt <= 0 ? '-' : '+'}${formatPourcentage(Math.abs(cat.ecart_pct))})`
                            : ''}
                        </Text>
                      )}

                      {cat.montant_alloue > 0 && (
                        <Text style={styles.envelopeRatio}>
                          {formatDT(cat.total_dt, langue)} / {formatDT(cat.montant_alloue, langue)}
                        </Text>
                      )}
                    </View>

                    {/* Barre de progression de l'enveloppe */}
                    {cat.montant_alloue > 0 && (
                      <View style={styles.catProgressTrack}>
                        <View
                          style={[
                            styles.catProgressFill,
                            {
                              width: `${Math.min(cat.pourcentage_consomme, 100)}%`,
                              backgroundColor: couleurBarre,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Ligne Hors Budget si présente */}
              {nonBudgetiseDT > 0 && (
                <View style={styles.nonBudgetBox}>
                  <Text style={styles.nonBudgetText}>
                    ⚠️ {t('non_budgetise')} : {formatDT(nonBudgetiseDT, langue)}
                  </Text>
                </View>
              )}

              {/* Sous-totaux Produits / Dépenses simples */}
              <View style={styles.subtotalsContainer}>
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>{t('sous_total_produits')}</Text>
                  <Text style={styles.subtotalValue}>{formatDT(sousTotalProduitsDT, langue)}</Text>
                </View>
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>{t('sous_total_depenses')}</Text>
                  <Text style={styles.subtotalValue}>{formatDT(sousTotalDepensesDT, langue)}</Text>
                </View>
              </View>
            </View>

            {/* ========================================================= */}
            {/* 4. CONCLUSION AUTOMATIQUE PAR RÈGLES (SANS IA)            */}
            {/* ========================================================= */}
            {phrasesConclusion.length > 0 && (
              <View style={styles.conclusionCard}>
                <Text style={styles.conclusionHeader}>💡 {t('conclusion_titre')}</Text>
                {phrasesConclusion.map((phrase, idx) => (
                  <View key={idx} style={styles.conclusionLine}>
                    <Text style={styles.conclusionDot}>•</Text>
                    <Text style={styles.conclusionText}>{phrase}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* ========================================================= */}
            {/* 5. CLASSEMENTS ET COURBE DE PRIX                          */}
            {/* ========================================================= */}
            <Text style={styles.sectionTitle}>{t('plus_grosses_depenses')}</Text>
            <View style={styles.listCard}>
              {topDepenses.map((d, idx) => (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.rankingRow,
                    idx < topDepenses.length - 1 && styles.borderBottom,
                  ]}
                  onPress={() => router.push({ pathname: '/modifier-achat' as any, params: { id: d.id } })}
                  activeOpacity={0.7}
                >
                  <View style={styles.rankingLeft}>
                    <Text style={styles.rankingNum}>{idx + 1}</Text>
                    <Text style={styles.rankingIcon}>{d.icone}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankingName}>{d.titre}</Text>
                      <Text style={styles.rankingMeta}>
                        {d.magasin} · {formatDate(d.date_achat, langue)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rankingAmount}>{formatDT(d.montant_dt, langue)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('produits_classes')}</Text>
            <View style={styles.listCard}>
              {topProduits.map((p, idx) => (
                <TouchableOpacity
                  key={p.produit_id}
                  style={[
                    styles.rankingRow,
                    idx < topProduits.length - 1 && styles.borderBottom,
                  ]}
                  onPress={() => router.push(`/produit/${p.produit_id}` as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rankingLeft}>
                    <Text style={styles.rankingNum}>{idx + 1}</Text>
                    <ProductThumb photoPath={p.photo_uri} icone="🛍️" taille={32} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rankingName}>{p.produit_nom}</Text>
                      <Text style={styles.rankingMeta}>
                        {p.quantite_totale} {p.unite}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.rankingAmount}>{formatDT(p.total_dt, langue)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Courbe d'évolution du prix d'un produit avec sélecteur */}
            {produitSelectionne && (
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chartTitle}>
                      {produitSelectionne.nom} · {t('evolution_prix_unitaire')}
                    </Text>
                    <Text style={styles.chartSub}>DT / {produitSelectionne.unite || 'unité'}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.selectProdBtn}
                    onPress={() => setModalProduitVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.selectProdBtnText}>{t('choisir_produit')}</Text>
                  </TouchableOpacity>
                </View>

                {pointsCourbe.length === 0 ? (
                  <Text style={styles.chartEmpty}>Aucun achat enregistré pour ce produit.</Text>
                ) : (
                  <View style={styles.chartTrack}>
                    {pointsCourbe.slice(-6).map((pt, idx) => (
                      <View key={idx} style={styles.chartColumn}>
                        <Text style={styles.chartVal}>{pt.prix_unitaire.toFixed(3)}</Text>
                        <View style={styles.chartDot} />
                        <Text style={styles.chartDate}>{pt.label}</Text>
                        <Text style={styles.chartStore} numberOfLines={1}>{pt.magasin}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* SECTION POINTS ET PROGRÈS */}
            <Text style={styles.sectionTitle}>{t('points_et_progres')}</Text>
            <View style={styles.pointsHero}>
              <Text style={styles.pointsHeroLabel}>{t('vos_points')}</Text>
              <Text style={styles.pointsHeroNumber}>{totalPoints}</Text>
              <Text style={styles.pointsHeroSub}>
                Niveau {rangNom}{' '}
                {pointsRestants > 0 ? `· ${pointsRestants} points avant rang supérieur` : '· Niveau max !'}
              </Text>
              <View style={styles.pointsBarTrack}>
                <View style={[styles.pointsBarFill, { width: `${progressionPct}%` }]} />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* MODALE CHOIX PRODUIT POUR LA COURBE */}
      <Modal
        visible={modalProduitVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalProduitVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalProduitVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('choisir_produit')}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {tousProduits.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.modalProdItem}
                  onPress={() => changerProduitCourbe(p)}
                >
                  <ProductThumb photoPath={p.photo_uri} icone={p.categorie_icone} taille={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalProdName}>{p.nom}</Text>
                    <Text style={styles.modalProdSub}>{p.marque} · {p.unite}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.warm },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 100 },

  periodLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  heroCard: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.xl,
    padding: 24,
    marginBottom: 20,
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
    marginBottom: 10,
  },
  deltaBox: { gap: 2 },
  deltaText: { fontSize: 15, fontWeight: '700' },
  deltaSub: { fontSize: 12, color: 'rgba(217, 240, 228, 0.7)' },

  emptyCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.xl,
    padding: 28,
    alignItems: 'center',
    marginVertical: 16,
    ...Theme.shadows.card,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: {
    fontSize: 15,
    color: Theme.colors.muted,
    textAlign: 'center',
    marginBottom: 18,
  },
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.full,
    height: 52,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.button,
  },
  primaryBtnText: { color: Theme.colors.white, fontSize: 15, fontWeight: '700' },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginTop: 12,
    marginBottom: 12,
  },

  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 20,
    ...Theme.shadows.card,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: Theme.colors.warm,
    marginBottom: 16,
  },
  segment: { height: '100%' },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 13, color: Theme.colors.ink, fontWeight: '500' },

  listCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 20,
    ...Theme.shadows.card,
  },
  categoryDetailRow: { paddingVertical: 14 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: Theme.colors.border },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  catIcon: { fontSize: 20 },
  catName: { fontSize: 15, fontWeight: '700', color: Theme.colors.ink },
  catRight: { alignItems: 'flex-end' },
  catAmount: { fontSize: 15, fontWeight: '800', color: Theme.colors.ink },
  catPart: { fontSize: 12, color: Theme.colors.muted, marginTop: 1 },
  ecartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ecartText: { fontSize: 13, fontWeight: '600' },
  ecartNouveau: { fontSize: 12, fontWeight: '700', color: Theme.colors.deepGreen },
  ecartMuted: { fontSize: 12, color: Theme.colors.muted },
  envelopeRatio: { fontSize: 12, color: Theme.colors.muted },
  catProgressTrack: {
    height: 6,
    backgroundColor: Theme.colors.warm,
    borderRadius: 3,
    overflow: 'hidden',
  },
  catProgressFill: { height: '100%', borderRadius: 3 },

  nonBudgetBox: {
    backgroundColor: '#FEF9EB',
    borderRadius: Theme.radius.md,
    padding: 12,
    marginVertical: 10,
  },
  nonBudgetText: { fontSize: 13, color: '#92400E', fontWeight: '600' },

  subtotalsContainer: {
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    paddingTop: 12,
    marginTop: 8,
    gap: 6,
  },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subtotalLabel: { fontSize: 13, color: Theme.colors.muted },
  subtotalValue: { fontSize: 13, fontWeight: '700', color: Theme.colors.ink },

  // Conclusion automatique
  conclusionCard: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.lg,
    padding: 18,
    marginBottom: 20,
    ...Theme.shadows.card,
  },
  conclusionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
    marginBottom: 10,
  },
  conclusionLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  conclusionDot: { fontSize: 14, color: Theme.colors.deepGreen, fontWeight: '800' },
  conclusionText: { fontSize: 13, color: Theme.colors.forest, lineHeight: 19, flex: 1 },

  // Rankings
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rankingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  rankingNum: { fontSize: 13, color: Theme.colors.muted, fontWeight: '700', width: 16 },
  rankingIcon: { fontSize: 18 },
  rankingName: { fontSize: 14, fontWeight: '600', color: Theme.colors.ink },
  rankingMeta: { fontSize: 12, color: Theme.colors.muted, marginTop: 2 },
  rankingAmount: { fontSize: 14, fontWeight: '800', color: Theme.colors.ink },

  // Chart
  chartCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 20,
    ...Theme.shadows.card,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Theme.colors.ink },
  chartSub: { fontSize: 12, color: Theme.colors.muted, marginTop: 2 },
  selectProdBtn: {
    backgroundColor: Theme.colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radius.full,
  },
  selectProdBtnText: { fontSize: 12, fontWeight: '700', color: Theme.colors.deepGreen },
  chartEmpty: { fontSize: 13, color: Theme.colors.muted, paddingVertical: 16, textAlign: 'center' },
  chartTrack: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 110,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: 8,
  },
  chartColumn: { alignItems: 'center', gap: 4, maxWidth: 50 },
  chartVal: { fontSize: 11, fontWeight: '700', color: Theme.colors.deepGreen },
  chartDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Theme.colors.forest },
  chartDate: { fontSize: 10, color: Theme.colors.muted },
  chartStore: { fontSize: 9, color: Theme.colors.muted, textAlign: 'center' },

  // Gamification
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
  pointsHeroSub: { fontSize: 13, color: 'rgba(217, 240, 228, 0.8)', marginBottom: 14 },
  pointsBarTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pointsBarFill: { height: '100%', backgroundColor: Theme.colors.gold, borderRadius: 4 },

  // Modale
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.xl,
    padding: 20,
    maxHeight: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.ink, marginBottom: 14 },
  modalProdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalProdName: { fontSize: 14, fontWeight: '700', color: Theme.colors.ink },
  modalProdSub: { fontSize: 12, color: Theme.colors.muted },
});
