/**
 * FICHIER : src/app/(tabs)/analyses.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-013
 * ÉCRAN : ECRAN-TAB-04 (Tableau de Bord Financier & Analyses Ciblées)
 *
 * RÔLE DU COMPOSANT :
 * Tableau de bord financier moderne, épuré et professionnel de Masrouf, structuré
 * rigoureusement selon les 7 sections ordonnées de la spécification :
 * 1. Carte de synthèse budgétaire vert forêt (total, consommé, restant, % ; rouge si dépassé).
 * 2. Conclusion financière automatique et recommandation personnalisée basée sur l'état réel.
 * 3. Comparaison temporelle visuelle avec la période précédente de même durée.
 * 4. Graphique de consommation du budget avec jauge et seuil maximal.
 * 5. Graphique de consommation par catégorie classé du PLUS FAIBLE au PLUS FORT pourcentage.
 * 6. Analyse du rythme de dépenses quotidien avec projection et durabilité.
 * 7. Catégorie nécessitant le plus d'attention (ou message positif si tout est maîtrisé).
 *
 * Toutes les données proviennent exclusivement des tables SQLite locales réelles (zéro mock, zéro hardcodage).
 */

// ============================================================================
// IMPORTS ET DÉPENDANCES TECHNIQUES
// ============================================================================

// Icônes vectorielles IonIcons pour la signalétique visuelle (étoiles, ampoules, jauges, calendriers)
import { Ionicons } from '@expo/vector-icons';
// Routeur de navigation déclaratif d'Expo Router pour les redirections
import { useRouter } from 'expo-router';
// React core et hook de mémoïsation pour optimiser les calculs d'agrégation financière
import React, { useMemo } from 'react';
// Composants primitifs d'interface utilisateur React Native
import { Pressable, StyleSheet, Text, View } from 'react-native';
// Conteneur d'écran standardisé avec barre d'état et marges de sécurité
import { Screen } from '@/components/Screen';
// Composants atomiques d'état vide (sans budget) et de titres de section
import { EmptyState, PillBarChart, SectionTitle } from '@/components/ui';
import { ChildrenBudgetAnalytics } from '@/components/ChildrenBudgetAnalytics';
import {
  getChildMonthlyHistory,
  getParentTotalMonthlyHistory,
  getUserMonthlyHistory,
} from '@/utils/analyticsHistory';
// Constantes de thème : palette chromatique (vert forêt, corail, menthe) et arrondis
import { colors, radius } from '@/constants/theme';
// Sélecteurs d'état SQLite : filtrage par intervalle, fenêtre temporelle antérieure et transactions
import {
  categoryName,
  inRange,
  previousWindow,
  userTxns,
} from '@/state/selectors';
import {
  isChildrenCategory,
  CANONICAL_ENFANT_ID,
  CANONICAL_ENFANT_NAME,
} from '@/utils/categoryMatching';
// Store global de l'application Masrouf (Zustand synchronisé avec SQLite)
import { useStore } from '@/state/store';
// Utilitaire d'assignation d'icônes vectorielles selon le nom de la catégorie
import { getCategoryIcon } from '@/utils/categoryIcons';
// Outils de formatage des montants en Dinars Tunisiens (DT), calcul de dates et libellés
import { daysBetween, fmtRange, formatDT, money, todayISO } from '@/utils/format';
// Hook de traduction multilingue (Français, Anglais, Arabe RTL)
import { useTranslation } from '@/utils/i18n';

export default function AnalyticsScreen() {
  const router = useRouter();
  const { db, me, selectedBudget } = useStore();
  const { t, isRTL, langue, traduireCategorie } = useTranslation();

  // Période de référence centrale active
  const budget = selectedBudget;
  const win = budget ? previousWindow(budget) : null;

  // Transactions réelles filtrées sur la période active et la période précédente (sécurisé si me est temporairement nul)
  const allTxns = useMemo(() => (me ? userTxns(db, me.id) : []), [db, me?.id]);

  const curTxns = useMemo(() => {
    if (!budget) return [];
    return allTxns.filter((tx) => inRange(tx.date, budget.start, budget.end));
  }, [allTxns, budget]);

  const prevTxns = useMemo(() => {
    if (!win) return [];
    return allTxns.filter((tx) => inRange(tx.date, win.start, win.end));
  }, [allTxns, win]);

  // Enfants rattachés au parent (pour le tableau de bord d'analyse parent)
  const isParent = me?.role === 'parent' || me?.role === 'admin';
  const isChild = me?.role === 'child';
  const isNormalUser = !isParent && !isChild;

  const childrenList = useMemo(() => {
    if (!isParent || !me) return [];
    return db.users.filter(
      (u) => u.role === 'child' && (u.parentId === me.id || u.familyId === me.familyId)
    );
  }, [db.users, isParent, me]);

  // Mois cible pour l'historique comparatif réactif (respecte le sélecteur de période)
  const targetMonthKey = useMemo(() => {
    if (budget?.start) {
      return budget.start.slice(0, 7);
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, [budget?.start]);

  // Historique 6 mois pour profil PARENT (Achats + Dépenses + Allocations aux enfants)
  const parentTotalHistory = useMemo(() => {
    if (!isParent || !me) return [];
    return getParentTotalMonthlyHistory(
      db,
      me.id,
      targetMonthKey,
      langue === 'ar' ? 'ar' : langue === 'en' ? 'en' : 'fr'
    );
  }, [db, isParent, me, targetMonthKey, langue]);

  // Historique 6 mois pour profil ENFANT (Dépenses/Achats personnels vs Budget alloué)
  const childHistory = useMemo(() => {
    if (!isChild || !me) return [];
    return getChildMonthlyHistory(
      db,
      me.id,
      targetMonthKey,
      langue === 'ar' ? 'ar' : langue === 'en' ? 'en' : 'fr'
    );
  }, [db, isChild, me, targetMonthKey, langue]);

  // Historique 6 mois pour profil UTILISATEUR NORMAL (Dépenses/Achats personnels vs Budget)
  const normalUserHistory = useMemo(() => {
    if (!isNormalUser || !me) return [];
    return getUserMonthlyHistory(
      db,
      me.id,
      targetMonthKey,
      langue === 'ar' ? 'ar' : langue === 'en' ? 'en' : 'fr'
    );
  }, [db, isNormalUser, me, targetMonthKey, langue]);

  // Calculs monétaires précis en millimes entiers (zéro dérive d'arrondi)
  const curTotal = useMemo(
    () => curTxns.reduce((sum, tx) => sum + Math.round(tx.amount * 1000), 0) / 1000,
    [curTxns]
  );
  const prevTotal = useMemo(
    () => prevTxns.reduce((sum, tx) => sum + Math.round(tx.amount * 1000), 0) / 1000,
    [prevTxns]
  );

  const totalBudget = budget?.total ?? 0;
  const isExceeded = curTotal > totalBudget && totalBudget > 0;
  const remainingBudget = Math.max(0, totalBudget - curTotal);
  const exceededAmount = Math.max(0, curTotal - totalBudget);
  const consumptionPct = totalBudget > 0 ? (curTotal / totalBudget) * 100 : 0;

  // Comparaison temporelle avec la période précédente équivalente
  const diff = curTotal - prevTotal;
  const pctDiff = prevTotal > 0 ? (diff / prevTotal) * 100 : null;
  const isSaving = diff < 0;
  const isStable = Math.abs(diff) < 0.001;

  // ==========================================================================
  // CALCULS DU RYTHME JOURNALIER ET PROJECTIONS (SECTION 6 : PACE INSIGHT)
  // ==========================================================================
  // Date du jour courante au format ISO YYYY-MM-DD
  const today = todayISO();
  // Nombre total de jours composant la période budgétaire (minimum 1 pour éviter la division par zéro)
  const totalDays = budget ? Math.max(1, daysBetween(budget.start, budget.end) + 1) : 1;

  // Calcul dynamique et réactif du nombre de jours consommés et restants
  const { daysElapsed, daysRemaining } = useMemo(() => {
    // Si aucun budget n'est sélectionné, initialisation neutre à 0
    if (!budget) return { daysElapsed: 0, daysRemaining: 0 };
    // Cas où la période budgétaire est future (la date d'aujourd'hui précède le début)
    if (today < budget.start) {
      return { daysElapsed: 0, daysRemaining: totalDays };
    }
    // Cas où la période budgétaire est déjà révolue (la date d'aujourd'hui dépasse la fin)
    if (today > budget.end) {
      return { daysElapsed: totalDays, daysRemaining: 0 };
    }
    // Période active en cours : calcul des jours passés depuis le début (inclusif) et restants jusqu'à la fin
    const elapsed = Math.max(1, daysBetween(budget.start, today) + 1);
    const rem = Math.max(0, daysBetween(today, budget.end));
    return { daysElapsed: elapsed, daysRemaining: rem };
  }, [budget, today, totalDays]);

  // Vitesse de dépense moyenne par jour écoulé (Burn Rate quotidien en Dinars)
  const avgDailySpend = daysElapsed > 0 ? curTotal / daysElapsed : 0;
  // Extrapolation linéaire du montant final si le rythme actuel se maintient jusqu'au dernier jour
  const projectedTotal = curTotal + avgDailySpend * daysRemaining;
  // Indicateur de viabilité : vrai si la projection reste inférieure ou égale au budget alloué
  const isPaceSustainable = totalBudget > 0 ? projectedTotal <= totalBudget : true;
  // Écart absolu entre la projection finale et le plafond budgétaire (marge de sécurité ou déficit)
  const projectedDifference = Math.abs(projectedTotal - totalBudget);

  // ==========================================================================
  // VENTILATION ET STATISTIQUES PAR CATÉGORIE (SECTION 5)
  // ==========================================================================
  const catStats = useMemo(() => {
    if (!budget) return [];

    // Table de hachage associant chaque identifiant unique de catégorie à ses métriques cumulées
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        spent: number;
        allocated: number;
        hasBudget: boolean;
        consumptionPct: number;
        shareOfTotal: number;
      }
    >();

    // Étape 1 : Initialisation de la carte avec toutes les catégories définies dans la base SQLite (avec regroupement canonique "Enfant")
    for (const c of db.categories) {
      const isEnf = isChildrenCategory(c);
      const catKey = isEnf ? CANONICAL_ENFANT_ID : c.id;
      const catName = isEnf ? CANONICAL_ENFANT_NAME : c.name;
      const allocated = budget.allocations[c.id] ?? 0;

      const existing = map.get(catKey);
      if (existing) {
        existing.allocated += allocated;
        existing.hasBudget = existing.allocated > 0;
      } else {
        map.set(catKey, {
          id: catKey,
          name: catName,
          spent: 0,
          allocated,
          hasBudget: allocated > 0,
          consumptionPct: 0,
          shareOfTotal: 0,
        });
      }
    }

    // Étape 2 : Agrégation des dépenses réelles à partir des transactions de la période
    for (const tx of curTxns) {
      if (!tx || !tx.categoryId) continue;
      const isEnf = isChildrenCategory(tx.categoryId) || isChildrenCategory(categoryName(db, tx.categoryId));
      const catKey = isEnf ? CANONICAL_ENFANT_ID : tx.categoryId;
      let entry = map.get(catKey);
      // Création dynamique d'une entrée si une catégorie personnalisée n'était pas pré-initialisée
      if (!entry) {
        const catName = isEnf ? CANONICAL_ENFANT_NAME : categoryName(db, tx.categoryId);
        const alloc = budget.allocations[tx.categoryId] ?? 0;
        entry = {
          id: catKey,
          name: catName,
          spent: 0,
          allocated: alloc,
          hasBudget: alloc > 0,
          consumptionPct: 0,
          shareOfTotal: 0,
        };
        map.set(catKey, entry);
      }
      // Cumul précis en millimes entiers (1 DT = 1000 millimes) pour éliminer les dérives décimales
      entry.spent += Math.round(Number(tx.amount || 0) * 1000);
    }

    // Étape 3 : Conversion du Map en tableau et calcul des ratios de consommation et part du total
    const list = Array.from(map.values())
      // Filtrer pour ne conserver que les catégories qui ont soit des dépenses soit un budget alloué
      .filter((item) => item.spent > 0 || item.allocated > 0)
      .map((item) => {
        // Reconversion des millimes en dinars réels
        const spentDT = item.spent / 1000;
        // Taux de consommation par rapport à l'enveloppe allouée spécifique
        const consumptionPct =
          item.allocated > 0 ? (spentDT / item.allocated) * 100 : 0;
        // Part relative de cette catégorie dans le total des dépenses de la période
        const shareOfTotal = curTotal > 0 ? (spentDT / curTotal) * 100 : 0;
        return {
          ...item,
          spent: spentDT,
          consumptionPct,
          shareOfTotal,
        };
      });

    // Étape 4 : Tri strict du PLUS FAIBLE au PLUS FORT pourcentage de consommation (Exigence Section 5)
    return list.sort((a, b) => {
      // Si les deux ont un budget alloué, trier par consumptionPct croissant (du moins consommé au plus consommé)
      if (a.hasBudget && b.hasBudget) {
        return a.consumptionPct - b.consumptionPct;
      }
      // Les catégories sans budget sont classées par shareOfTotal croissant
      if (!a.hasBudget && !b.hasBudget) {
        return a.shareOfTotal - b.shareOfTotal;
      }
      // Les catégories dotées d'un budget alloué apparaissent prioritairement en tête de liste
      return a.hasBudget ? -1 : 1;
    });
  }, [db.categories, budget, curTxns, curTotal]);

  // Section 7 : Détection automatique de la catégorie requérant le plus d'attention
  const attentionCategory = useMemo(() => {
    if (catStats.length === 0 || curTotal <= 0) return null;

    // 1. Chercher d'abord parmi les catégories avec budget qui sont dépassées (> 100%)
    const exceeded = catStats.filter((c) => c.hasBudget && c.consumptionPct > 100);
    if (exceeded.length > 0) {
      // Trier par taux de dépassement le plus critique
      return [...exceeded].sort((a, b) => b.consumptionPct - a.consumptionPct)[0];
    }

    // 2. Chercher les catégories avec budget proches de la limite (>= 80%)
    const approaching = catStats.filter((c) => c.hasBudget && c.consumptionPct >= 80);
    if (approaching.length > 0) {
      return [...approaching].sort((a, b) => b.consumptionPct - a.consumptionPct)[0];
    }

    // 3. Chercher si une catégorie sans budget pèse de manière disproportionnée (>= 35% du total)
    const heavyUnallocated = catStats.filter((c) => !c.hasBudget && c.shareOfTotal >= 35);
    if (heavyUnallocated.length > 0) {
      return [...heavyUnallocated].sort((a, b) => b.shareOfTotal - a.shareOfTotal)[0];
    }

    // Si toutes les catégories sont saines (< 70% ou dépenses modérées)
    return null;
  }, [catStats, curTotal]);

  // Section 2 : Génération dynamique de la conclusion et recommandation personnalisée
  const { conclusionText, recommendationText } = useMemo(() => {
    if (!budget) return { conclusionText: '', recommendationText: '' };

    let conclusion = '';
    let recommendation = '';

    if (curTotal <= 0) {
      conclusion = 'Aucune transaction enregistrée pour cette période. Vos finances sont intactes.';
      recommendation = 'Commencez à consigner vos achats du quotidien pour activer vos analyses en temps réel.';
    } else if (isExceeded) {
      conclusion = `Budget dépassé : vos dépenses atteignent ${formatDT(curTotal)}, soit un dépassement de ${formatDT(exceededAmount)} (${consumptionPct.toFixed(1)}% du budget initial).`;
      recommendation = attentionCategory
        ? `Gelez temporairement les dépenses non indispensables sur « ${traduireCategorie(attentionCategory.name)} » qui a consommé ${attentionCategory.hasBudget ? attentionCategory.consumptionPct.toFixed(0) + '%' : attentionCategory.shareOfTotal.toFixed(0) + '%'} des fonds.`
        : 'Arrêtez tout achat superflu jusqu’au renouvellement de votre prochain cycle budgétaire.';
    } else if (consumptionPct >= 85) {
      conclusion = `Alerte de fin de budget : ${consumptionPct.toFixed(1)}% de votre enveloppe est déjà consommé alors qu'il reste ${daysRemaining} jour(s). Réserve disponible : ${formatDT(remainingBudget)}.`;
      recommendation = daysRemaining > 0
        ? `Limitez vos dépenses quotidiennes à ${formatDT(remainingBudget / daysRemaining)}/jour pour ne pas franchir votre plafond.`
        : 'Vos dépenses sont stabilisées juste sous la limite.';
    } else if (consumptionPct >= 65) {
      conclusion = `Consommation intermédiaire : ${consumptionPct.toFixed(1)}% dépensé. Il vous reste ${formatDT(remainingBudget)} pour couvrir les ${daysRemaining} jour(s) à venir.`;
      recommendation = isPaceSustainable
        ? `Votre rythme actuel de ${formatDT(avgDailySpend)}/jour est équilibré. Maintenez cette vigilance.`
        : `Au rythme actuel, une légère réduction de ${formatDT(projectedDifference)} d'ici la fin du mois vous évitera tout dépassement.`;
    } else {
      conclusion = `Excellente maîtrise financière : seulement ${consumptionPct.toFixed(1)}% consommé (${formatDT(curTotal)} dépensé sur ${formatDT(totalBudget)}). Réserve restante : ${formatDT(remainingBudget)}.`;
      recommendation = prevTotal > 0 && isSaving
        ? `Bravo : vous dépensez moins que la période passée (${formatDT(curTotal)} contre ${formatDT(prevTotal)}). Poursuivez cette discipline d'épargne !`
        : `Continuez à ce rythme régulier de ${formatDT(avgDailySpend)}/jour pour terminer votre période avec un excédent d'épargne.`;
    }

    return { conclusionText: conclusion, recommendationText: recommendation };
  }, [
    budget,
    curTotal,
    isExceeded,
    exceededAmount,
    consumptionPct,
    daysRemaining,
    remainingBudget,
    attentionCategory,
    isPaceSustainable,
    avgDailySpend,
    projectedDifference,
    totalBudget,
    prevTotal,
    isSaving,
    traduireCategorie,
  ]);

  // Sécurité de session : si aucun profil utilisateur n'est connecté (placé strictement après tous les hooks)
  if (!me) return null;

  // Si aucun budget n'est sélectionné ou actif
  if (!budget) {
    return (
      <Screen title={t('analyses')}>
        <EmptyState
          icon="stats-chart-outline"
          title={t('aucun_budget_actif')}
          detail={t('onboarding_budget_desc')}
          actionLabel={t('creer_budget')}
          onAction={() => router.push('/budget-mois')}
        />
      </Screen>
    );
  }

  const rangeLabel = fmtRange(budget.start, budget.end, langue);

  return (
    <Screen title={t('analyses')}>
      {/* Sélecteur de période de référence cliquable */}
      <Pressable
        onPress={() => router.push('/(tabs)/calendrier')}
        style={({ pressed }) => [
          styles.periodSelector,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
          pressed && { opacity: 0.8 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('selectionner_periode')}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.green} />
        <View style={{ flex: 1 }}>
          <Text
            style={[styles.periodLabel, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {rangeLabel}
          </Text>
          <Text
            style={[styles.periodHint, { textAlign: isRTL ? 'right' : 'left' }]}
          >
            {t('selectionner_periode')}
          </Text>
        </View>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={colors.muted}
        />
      </Pressable>

      {/* ============================================================ */}
      {/* 1. CARTE DE SYNTHÈSE BUDGÉTAIRE VERT FORÊT */}
      {/* ============================================================ */}
      <View style={styles.summaryCard}>
        {/* Ligne d'en-tête de synthèse : surtitre vert menthe à gauche et badge de statut à droite */}
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Surtitre "SYNTHÈSE DU BUDGET" en lettres capitales */}
          <Text style={styles.summaryEyebrow}>
            {t('synthese_budget').toUpperCase()}
          </Text>
          {/* Badge dynamique : vert menthe translucide si respecté, rouge alerte translucide si dépassé */}
          <View
            style={[
              styles.summaryBadge,
              isExceeded && { backgroundColor: 'rgba(220, 38, 38, 0.25)' },
            ]}
          >
            {/* Pourcentage de consommation (ex: "45.2%") ou mention textuelle d'alerte "DÉPASSEMENT" */}
            <Text
              style={[
                styles.summaryBadgeText,
                isExceeded && { color: '#FF8A80', fontWeight: '700' },
              ]}
            >
              {isExceeded ? t('depassement_budget') : `${consumptionPct.toFixed(1)}%`}
            </Text>
          </View>
        </View>

        {/* Montant principal consommé en gros caractères (32px) : blanc pur si conforme, rouge saumon (#FF8A80) si dépassé */}
        <Text
          style={[
            styles.summaryAmount,
            { textAlign: isRTL ? 'right' : 'left' },
            isExceeded && { color: '#FF8A80' },
          ]}
        >
          {formatDT(curTotal)}
        </Text>
        {/* Sous-titre textuel rappelant le libellé "Montant consommé" et la période exacte */}
        <Text style={[styles.summarySub, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('montant_consomme')} · {rangeLabel}
        </Text>

        {/* Grille des 3 métriques clés : Total, Restant / Dépassé, % */}
        <View
          style={[
            styles.summaryGrid,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Métrique 1 : Budget total */}
          <View style={styles.summaryGridItem}>
            <Text style={styles.gridLabel}>{t('budget_total')}</Text>
            <Text style={styles.gridValue}>{formatDT(totalBudget)}</Text>
          </View>

          {/* Métrique 2 : Restant ou Dépassé en ROUGE */}
          <View style={styles.summaryGridItem}>
            <Text style={styles.gridLabel}>
              {isExceeded ? t('depassement_budget') : t('budget_restant')}
            </Text>
            <Text
              style={[
                styles.gridValue,
                isExceeded && { color: '#FF8A80', fontWeight: '700' },
              ]}
            >
              {isExceeded ? `+${formatDT(exceededAmount)}` : formatDT(remainingBudget)}
            </Text>
          </View>

          {/* Métrique 3 : Pourcentage global */}
          <View style={styles.summaryGridItem}>
            <Text style={styles.gridLabel}>{t('pourcentage_consomme')}</Text>
            <Text
              style={[
                styles.gridValue,
                isExceeded && { color: '#FF8A80', fontWeight: '700' },
              ]}
            >
              {consumptionPct.toFixed(1)}%
            </Text>
          </View>
        </View>
      </View>

      {/* ============================================================ */}
      {/* 2. CONCLUSION FINANCIÈRE ET RECOMMANDATION PERSONNALISÉE */}
      {/* ============================================================ */}
      {/* Carte d'analyse intelligente formulant un diagnostic synthétique automatique */}
      <View style={styles.insightCard}>
        {/* En-tête avec icône d'étincelles pour la conclusion financière */}
        <View
          style={[
            styles.insightHeader,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Icône sparkles en vert forêt */}
          <Ionicons name="sparkles" size={18} color={colors.forest} />
          {/* Titre "Conclusion financière" */}
          <Text style={styles.insightHeaderTitle}>
            {t('conclusion_financiere')}
          </Text>
        </View>
        {/* Texte dynamique de conclusion calculé selon le taux d'épuisement réel */}
        <Text
          style={[styles.insightBodyText, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {conclusionText}
        </Text>

        {/* Ligne séparatrice horizontale discrète */}
        <View style={styles.insightDivider} />

        {/* En-tête avec icône ampoule pour la recommandation personnalisée */}
        <View
          style={[
            styles.insightHeader,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Icône ampoule en vert clair stimulant l'action d'épargne */}
          <Ionicons name="bulb-outline" size={18} color={colors.green} />
          {/* Titre "Recommandation personnalisée" */}
          <Text style={[styles.insightHeaderTitle, { color: colors.green }]}>
            {t('recommandation_personnalisee')}
          </Text>
        </View>
        {/* Recommandation pragmatique sur mesure adaptée au comportement financier de l'utilisateur */}
        <Text
          style={[styles.insightBodyText, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {recommendationText}
        </Text>
      </View>

      {/* ============================================================ */}
      {/* 3. COMPARAISON VISUELLE AVEC LA PÉRIODE PRÉCÉDENTE */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('comparaison_temporelle')}
      </SectionTitle>

      <View style={styles.comparisonCard}>
        {win ? (
          <>
            {/* Rangée comparant visuellement la période active et la période passée équivalente */}
            <View
              style={[
                styles.comparisonRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {/* Colonne Période active (dates et total dépensé) */}
              <View style={{ flex: 1 }}>
                <Text style={styles.comparisonPeriodTitle}>
                  {t('periode_actuelle')}
                </Text>
                <Text style={styles.comparisonDates}>
                  {budget.start} au {budget.end}
                </Text>
                <Text style={styles.comparisonAmount}>{formatDT(curTotal)}</Text>
              </View>

              {/* Trait fin de séparation vertical entre les deux colonnes */}
              <View style={styles.verticalDivider} />

              {/* Colonne Période précédente symétrique de même durée */}
              <View style={{ flex: 1 }}>
                <Text style={styles.comparisonPeriodTitle}>
                  {t('periode_precedente')}
                </Text>
                <Text style={styles.comparisonDates}>
                  {win.start} au {win.end}
                </Text>
                <Text style={styles.comparisonAmount}>{formatDT(prevTotal)}</Text>
              </View>
            </View>

            {/* Badge indicateur de tendance */}
            {prevTotal === 0 ? (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor: '#EBF4F0',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="information-circle-outline" size={16} color={colors.green} />
                <Text style={[styles.trendBadgeText, { color: colors.forest }]}>
                  {t('pas_de_depense_periode_prec')}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.trendBadge,
                  {
                    backgroundColor: isSaving
                      ? '#E8F5E9'
                      : isStable
                      ? '#F5F5F5'
                      : '#FFEBEE',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons
                  name={
                    isSaving
                      ? 'trending-down'
                      : isStable
                      ? 'remove-outline'
                      : 'trending-up'
                  }
                  size={18}
                  color={isSaving ? colors.green : isStable ? colors.muted : colors.coral}
                />
                <Text
                  style={[
                    styles.trendBadgeText,
                    {
                      color: isSaving
                        ? colors.green
                        : isStable
                        ? colors.muted
                        : colors.coral,
                    },
                  ]}
                >
                  {isSaving
                    ? `Baisse des dépenses (Économie) : −${Math.abs(pctDiff ?? 0).toFixed(1)}% (${formatDT(Math.abs(diff))})`
                    : isStable
                    ? `Stabilité des dépenses (0.000 DT)`
                    : `Hausse des dépenses : +${Math.abs(pctDiff ?? 0).toFixed(1)}% (${formatDT(Math.abs(diff))})`}
                </Text>
              </View>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 13, color: colors.muted }}>
            {t('donnees_insuffisantes')}
          </Text>
        )}
      </View>

      {/* ============================================================ */}
      {/* 4. GRAPHIQUE DE CONSOMMATION DU BUDGET */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('graphique_consommation_budget')}
      </SectionTitle>

      <View style={styles.cardContainer}>
        {/* En-tête des chiffres de la jauge */}
        <View
          style={[
            styles.gaugeHeader,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View>
            <Text style={styles.gaugeSpentLabel}>{t('montant_consomme')}</Text>
            <Text
              style={[
                styles.gaugeSpentAmount,
                isExceeded && { color: colors.coral },
              ]}
            >
              {formatDT(curTotal)} ({consumptionPct.toFixed(1)}%)
            </Text>
          </View>
          <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
            <Text style={styles.gaugeCeilLabel}>{t('seuil_budget_total')}</Text>
            <Text style={styles.gaugeCeilAmount}>{formatDT(totalBudget)}</Text>
          </View>
        </View>

        {/* Barre de progression visuelle (jauge) avec seuil dynamique et arrondi complet */}
        <View style={styles.gaugeTrack}>
          {/* Remplissage de la jauge : vert (< 80%), or (80-99%) ou corail (>= 100% ou dépassement) */}
          <View
            style={[
              styles.gaugeFill,
              {
                width: `${Math.min(100, consumptionPct)}%`,
                backgroundColor: isExceeded
                  ? colors.coral
                  : consumptionPct >= 80
                  ? colors.gold
                  : colors.green,
                alignSelf: isRTL ? 'flex-end' : 'flex-start',
              },
            ]}
          />
        </View>

        {/* Sous-titre informatif du solde restant */}
        <View
          style={[
            styles.gaugeFooter,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Text style={styles.gaugeFooterText}>
            {isExceeded
              ? `Dépassement de ${formatDT(exceededAmount)} au-delà du seuil fixé`
              : `${formatDT(remainingBudget)} encore disponibles`}
          </Text>
          <Text style={styles.gaugeFooterDays}>
            {daysRemaining} {t('jours_restants').toLowerCase()}
          </Text>
        </View>
      </View>

      {/* COMPARAISON HISTORIQUE DE CONSOMMATION MULTI-MOIS (PILL BAR CHART UNIFIÉ) */}
      {isParent && (
        <View style={{ marginTop: 14 }}>
          <PillBarChart
            title={
              isRTL
                ? 'إجمالي نفقات الولي والمصروف · د.ت'
                : langue === 'en'
                ? 'Total parent & family expenses · DT'
                : 'Dépenses globales du parent & foyer · DT'
            }
            subtitle={
              isRTL
                ? 'مقارنة إجمالي المصاريف والمشتريات والمبالغ المخصصة للأبناء'
                : 'Achats personnels, dépenses directes et montants alloués aux enfants'
            }
            items={parentTotalHistory}
            unit={isRTL ? 'د.ت' : 'DT'}
            toDateLabel={
              isRTL ? 'الشهر الحالي' : langue === 'en' ? 'to date' : 'en cours'
            }
            isRTL={isRTL}
          />
        </View>
      )}

      {isChild && (
        <View style={{ marginTop: 14 }}>
          <PillBarChart
            title={
              isRTL
                ? 'مصاريفي الشخصية · د.ت'
                : langue === 'en'
                ? 'My monthly expenses · DT'
                : 'Mes dépenses mensuelles · DT'
            }
            subtitle={
              isRTL
                ? 'مقارنة استهلاك مصروفي الشخصي ومشترياتي عبر الأشهر'
                : 'Évolution de mes dépenses et de mon argent de poche alloué'
            }
            items={childHistory}
            unit={isRTL ? 'د.ت' : 'DT'}
            toDateLabel={
              isRTL ? 'الشهر الحالي' : langue === 'en' ? 'to date' : 'en cours'
            }
            isRTL={isRTL}
          />
        </View>
      )}

      {isNormalUser && (
        <View style={{ marginTop: 14 }}>
          <PillBarChart
            title={
              isRTL
                ? 'المصاريف الشهرية · د.ت'
                : langue === 'en'
                ? 'Monthly expenses · DT'
                : 'Dépenses mensuelles · DT'
            }
            subtitle={
              isRTL
                ? 'تطور النفقات والمشتريات خلال الـ 6 أشهر الماضية'
                : 'Évolution de vos dépenses et achats par rapport à votre budget'
            }
            items={normalUserHistory}
            unit={isRTL ? 'د.ت' : 'DT'}
            toDateLabel={
              isRTL ? 'الشهر الحالي' : langue === 'en' ? 'to date' : 'en cours'
            }
            isRTL={isRTL}
          />
        </View>
      )}

      {/* ============================================================ */}
      {/* 5. CONSOMMATION PAR CATÉGORIE (DU PLUS FAIBLE AU PLUS FORT) */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('consommation_par_categorie')}
      </SectionTitle>

      {catStats.length === 0 ? (
        <View style={styles.cardContainer}>
          <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
            {t('aucune_depense')}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {catStats.map((catItem) => {
            const rawName = catItem.name;
            const transName = traduireCategorie(rawName);
            const icon = getCategoryIcon(rawName);

            // Couleur dynamique : vert (< 70%), jaune (70-99%), rouge (>= 100%)
            const itemColor =
              catItem.hasBudget
                ? catItem.consumptionPct >= 100
                  ? colors.coral
                  : catItem.consumptionPct >= 70
                  ? colors.gold
                  : colors.green
                : catItem.shareOfTotal >= 35
                ? colors.gold
                : colors.green;

            const progressRatio = catItem.hasBudget
              ? Math.min(100, catItem.consumptionPct)
              : Math.min(100, catItem.shareOfTotal);

            const isOverCat = catItem.hasBudget && catItem.consumptionPct > 100;

            return (
              <View
                key={catItem.id}
                style={[
                  styles.categoryCard,
                  isOverCat && { borderColor: colors.coral, backgroundColor: '#FFF5F5' },
                ]}
              >
                {/* Ligne d'en-tête de la catégorie */}
                <View
                  style={[
                    styles.categoryHeaderRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryNameBox,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <Ionicons name={icon} size={18} color={itemColor} />
                    <Text style={[styles.categoryNameText, isOverCat && { color: colors.coral }]}>
                      {transName}
                    </Text>
                    {isOverCat ? (
                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginHorizontal: 4 }}>
                        <Text style={{ color: colors.coral, fontSize: 10, fontWeight: '800' }}>
                          {t('depassement_budget')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.categorySpentText, isOverCat && { color: colors.coral, fontWeight: '800' }]}>
                    {formatDT(catItem.spent)}
                  </Text>
                </View>

                {/* Piste grise de la barre de progression pour la catégorie */}
                <View style={styles.catProgressTrack}>
                  {/* Remplissage coloré proportionnel au pourcentage consommé ou part du total */}
                  <View
                    style={[
                      styles.catProgressFill,
                      {
                        width: `${progressRatio}%`,
                        backgroundColor: itemColor,
                        alignSelf: isRTL ? 'flex-end' : 'flex-start',
                      },
                    ]}
                  />
                </View>

                {/* Ligne informative : Enveloppe allouée vs Part du total */}
                <View
                  style={[
                    styles.categoryMetaRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  {catItem.hasBudget ? (
                    <>
                      <Text style={[styles.categoryMetaText, { color: itemColor, fontWeight: '700' }]}>
                        {isOverCat
                          ? `+${formatDT(catItem.spent - catItem.allocated)} (${catItem.consumptionPct.toFixed(1)}%)`
                          : `${catItem.consumptionPct.toFixed(1)}% ${t('pourcentage_consomme_enveloppe')}`}
                      </Text>
                      <Text style={[styles.categoryMetaAlloc, isOverCat && { color: colors.coral, fontWeight: '600' }]}>
                        {t('enveloppe_budgetaire')} : {formatDT(catItem.allocated)}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.categoryMetaText}>
                        {t('part_du_total')} : {catItem.shareOfTotal.toFixed(1)}%
                      </Text>
                      <Text style={styles.categoryMetaUnallocated}>
                        ({t('sans_budget_alloue')})
                      </Text>
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ============================================================ */}
      {/* 6. ANALYSE DU RYTHME QUOTIDIEN (PACE INSIGHT) */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('rythme_depenses_quotidien')}
      </SectionTitle>

      <View style={styles.cardContainer}>
        {/* Métriques d'allure : Moyenne / jour, Jours écoulés, Jours restants */}
        <View
          style={[
            styles.paceGrid,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View style={styles.paceGridItem}>
            <Text style={styles.paceLabel}>{t('moyenne_par_jour')}</Text>
            <Text style={styles.paceValue}>{formatDT(avgDailySpend)}</Text>
          </View>
          <View style={styles.paceGridItem}>
            <Text style={styles.paceLabel}>{t('jours_ecoules')}</Text>
            <Text style={styles.paceValue}>
              {daysElapsed} / {totalDays}
            </Text>
          </View>
          <View style={styles.paceGridItem}>
            <Text style={styles.paceLabel}>{t('jours_restants')}</Text>
            <Text style={styles.paceValue}>{daysRemaining} j</Text>
          </View>
        </View>

        <View style={styles.paceDivider} />

        {/* Estimation de fin de période */}
        <View
          style={[
            styles.paceProjectionRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.paceProjectionLabel}>
              {t('depense_estimee_fin_periode')} :
            </Text>
            <Text
              style={[
                styles.paceProjectionValue,
                !isPaceSustainable && { color: colors.coral },
              ]}
            >
              {formatDT(projectedTotal)}
            </Text>
          </View>

          {/* Badge de durabilité */}
          <View
            style={[
              styles.paceBadge,
              {
                backgroundColor: isPaceSustainable ? '#E8F5E9' : '#FFEBEE',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons
              name={isPaceSustainable ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={isPaceSustainable ? colors.green : colors.coral}
            />
            <Text
              style={[
                styles.paceBadgeText,
                { color: isPaceSustainable ? colors.green : colors.coral },
              ]}
            >
              {isPaceSustainable ? t('rythme_soutenable') : t('risque_depassement')}
            </Text>
          </View>
        </View>

        {/* Message d'alerte ou de confirmation de rythme */}
        <Text
          style={[
            styles.paceMessageText,
            { textAlign: isRTL ? 'right' : 'left' },
            !isPaceSustainable && { color: colors.coral },
          ]}
        >
          {isPaceSustainable
            ? `Au rythme actuel de ${formatDT(avgDailySpend)}/jour, votre budget est pleinement respecté avec une marge estimée de ${formatDT(projectedDifference)}.`
            : `Au rythme actuel de ${formatDT(avgDailySpend)}/jour, vous risquez de dépasser votre budget de ${formatDT(projectedDifference)}.`}
        </Text>
      </View>

      {/* ============================================================ */}
      {/* 7. CATÉGORIE REQUÉRANT LE PLUS D'ATTENTION */}
      {/* ============================================================ */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('categorie_attention')}
      </SectionTitle>

      {attentionCategory ? (
        <View style={styles.attentionCard}>
          <View
            style={[
              styles.attentionHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.attentionTitleBox,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Ionicons
                name={getCategoryIcon(attentionCategory.name)}
                size={22}
                color={colors.coral}
              />
              <Text style={styles.attentionCategoryName}>
                {traduireCategorie(attentionCategory.name)}
              </Text>
            </View>
            <View style={styles.attentionBadge}>
              <Text style={styles.attentionBadgeText}>
                {attentionCategory.hasBudget
                  ? `${attentionCategory.consumptionPct.toFixed(0)}% consommé`
                  : `${attentionCategory.shareOfTotal.toFixed(0)}% du total`}
              </Text>
            </View>
          </View>

          {/* Explication du besoin d'attention */}
          <Text
            style={[
              styles.attentionReasonText,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {attentionCategory.hasBudget
              ? `Cette catégorie a consommé ${attentionCategory.consumptionPct.toFixed(1)}% de son allocation (${formatDT(attentionCategory.spent)} sur ${formatDT(attentionCategory.allocated)}). Son taux d'épuisement est le plus préoccupant du budget.`
              : `Cette catégorie représente ${attentionCategory.shareOfTotal.toFixed(1)}% de l'ensemble de vos dépenses actuelles (${formatDT(attentionCategory.spent)}), sans enveloppe budgétaire dédiée.`}
          </Text>

          {/* Suggestion pratique pour maîtriser les dépenses */}
          <View style={styles.suggestionBox}>
            <View
              style={[
                styles.suggestionHeader,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.forest} />
              <Text style={styles.suggestionHeaderTitle}>
                {t('suggestion_action')} :
              </Text>
            </View>
            <Text
              style={[
                styles.suggestionBody,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {attentionCategory.hasBudget
                ? `Différez les achats non urgents pour cette catégorie ou réallouez une fraction du solde disponible d'un autre poste pour équilibrer.`
                : `Définissez un plafond budgétaire explicite pour « ${traduireCategorie(attentionCategory.name)} » lors de votre prochaine période pour mieux encadrer ses sorties.`}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.healthyAttentionCard}>
          <View
            style={[
              styles.attentionTitleBox,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color={colors.green} />
            <Text style={styles.healthyAttentionTitle}>
              {t('toutes_categories_maitrisees')}
            </Text>
          </View>
          <Text
            style={[
              styles.healthyAttentionBody,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            Aucune catégorie ne présente de surconsommation anormale. Toutes vos enveloppes sont sous le seuil critique.
          </Text>
        </View>
      )}

      {/* ============================================================ */}
      {/* 8. SUIVI ANALYTIQUE DU BUDGET DES ENFANTS (TABLEAU DE BORD PARENT) */}
      {/* ============================================================ */}
      {isParent && childrenList.length > 0 && (
        <ChildrenBudgetAnalytics
          childrenList={childrenList}
          db={db}
          currentMonthKey={budget.start.slice(0, 7)}
        />
      )}

      {/* Espacement de sécurité en bas */}
      <View style={{ height: 24 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Bouton sélecteur de période : cadre blanc épuré avec bordure discrète et disposition flexible
  periodSelector: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Libellé de la période temporelle : typographie bold vert forêt pour une excellente lisibilité
  periodLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  // Indication textuelle invitant au clic pour changer de période
  periodHint: {
    fontSize: 11,
    color: colors.muted,
  },
  // Section 1 : Carte de synthèse vert forêt (#1B4332) servant d'ancrage visuel supérieur
  summaryCard: {
    backgroundColor: colors.forest,
    borderRadius: radius.card,
    padding: 20,
    gap: 6,
  },
  // Surtitre en lettres capitales vert menthe (#D9F0E4) pour l'identité visuelle
  summaryEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.mint,
    letterSpacing: 0.5,
  },
  // Badge de statut supérieur avec fond translucide menthe ou corail selon l'état
  summaryBadge: {
    backgroundColor: 'rgba(217, 240, 228, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  // Texte du badge de statut affichant le pourcentage ou l'alerte de dépassement
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mint,
  },
  // Grand montant consommé (32px, bold) mis en exergue au centre de la carte
  summaryAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 38,
  },
  // Sous-titre textuel rappelant la période sous le montant principal
  summarySub: {
    fontSize: 12,
    color: colors.track,
    marginBottom: 8,
  },
  // Grille inférieure de synthèse à 3 colonnes séparée par un liseré semi-transparent
  summaryGrid: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    paddingTop: 12,
    justifyContent: 'space-between',
    gap: 8,
  },
  // Cellule individuelle de la grille de synthèse budgétaire
  summaryGridItem: {
    flex: 1,
  },
  // Libellé de métrique secondaire (Budget total, Restant, Pourcentage)
  gridLabel: {
    fontSize: 11,
    color: colors.track,
    marginBottom: 2,
  },
  // Chiffre clé formaté en dinars ou pourcentage dans la synthèse
  gridValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  // Section 2 : Carte d'intelligence financière blanche avec encadrement fin
  insightCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 8,
  },
  // En-tête de bloc d'analyse avec icône thématique alignée
  insightHeader: {
    alignItems: 'center',
    gap: 6,
  },
  // Titre en vert forêt soulignant la conclusion ou recommandation
  insightHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  // Paragraphe explicatif de conseil budgétaire rédigé en langage naturel
  insightBodyText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#333333',
  },
  // Trait de séparation horizontal discret entre conclusion et recommandation
  insightDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  // Section 3 : Carte de comparaison temporelle avec la période précédente
  comparisonCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  // Conteneur en ligne alignant les deux périodes comparées côte à côte
  comparisonRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  // En-tête de colonne en majuscules (Période actuelle vs Période précédente)
  comparisonPeriodTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
  },
  // Plage de dates calendaires de la période comparée
  comparisonDates: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  // Montant total dépensé durant la période comparée
  comparisonAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 4,
  },
  // Séparateur vertical fin entre les deux colonnes temporelles
  verticalDivider: {
    width: 1,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
  // Pastille horizontale de tendance colorée selon économie ou surcoût
  trendBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    gap: 8,
  },
  // Texte explicatif de l'écart budgétaire et du pourcentage de variation
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  // Conteneur de carte blanche standard pour les jauges et graphiques
  cardContainer: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  // En-tête supérieur de la jauge affichant consommé vs seuil maximal
  gaugeHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  // Libellé informatif au-dessus du montant consommé
  gaugeSpentLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  // Montant consommé et pourcentage affichés en gros caractères
  gaugeSpentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 2,
  },
  // Libellé informatif au-dessus du plafond budgétaire
  gaugeCeilLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
  },
  // Plafond maximal autorisé pour la période active
  gaugeCeilAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 2,
  },
  // Piste grise d'arrière-plan de la jauge de progression
  gaugeTrack: {
    height: 12,
    backgroundColor: '#EBEBEB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  // Barre dynamique de remplissage de la jauge colorée selon le niveau
  gaugeFill: {
    height: 12,
    borderRadius: 6,
  },
  // Pied d'information sous la jauge indiquant le solde et les jours
  gaugeFooter: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Message textuel du solde restant ou du montant dépassé
  gaugeFooterText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: '500',
  },
  // Compteur textuel de jours restants jusqu'à la fin de la période
  gaugeFooterDays: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forest,
  },
  // Section 5 : Carte individuelle d'une catégorie dans la liste ordonnée
  categoryCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 8,
  },
  // Ligne d'en-tête de catégorie associant icône, nom et montant
  categoryHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Bloc horizontal regroupant l'icône vectorielle et le nom traduit
  categoryNameBox: {
    alignItems: 'center',
    gap: 8,
  },
  // Intitulé de la catégorie en vert forêt soutenu
  categoryNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  // Montant exact dépensé pour cette catégorie en dinars
  categorySpentText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  // Piste d'arrière-plan de la mini-jauge de catégorie
  catProgressTrack: {
    height: 6,
    backgroundColor: '#EBEBEB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  // Remplissage dynamique de la mini-jauge de catégorie
  catProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  // Ligne inférieure précisant l'enveloppe allouée ou la part du total
  categoryMetaRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Pourcentage consommé ou part relative dans les dépenses
  categoryMetaText: {
    fontSize: 12,
    color: colors.forest,
  },
  // Plafond budgétaire individuel alloué à cette catégorie
  categoryMetaAlloc: {
    fontSize: 12,
    color: colors.muted,
  },
  // Mention stylisée en italique pour les catégories sans budget
  categoryMetaUnallocated: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
  },
  // Section 6 : Grille horizontale à 3 métriques d'allure quotidienne
  paceGrid: {
    justifyContent: 'space-between',
    gap: 8,
  },
  // Cellule individuelle de rythme (moyenne, jours écoulés, restants)
  paceGridItem: {
    flex: 1,
  },
  // Libellé de métrique d'allure journalière
  paceLabel: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: '500',
    marginBottom: 2,
  },
  // Valeur chiffrée de la cadence de dépenses
  paceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  // Trait horizontal séparateur dans le bloc de rythme
  paceDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  // Ligne de projection financière finale avec badge d'évaluation
  paceProjectionRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  // Libellé invitant à lire la projection en fin de période
  paceProjectionLabel: {
    fontSize: 12,
    color: colors.muted,
  },
  // Montant total estimé en fin de cycle selon la vitesse actuelle
  paceProjectionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 2,
  },
  // Badge d'évaluation de durabilité (soutenable vs risque)
  paceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  // Texte du badge de viabilité du rythme de dépenses
  paceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Message explicatif détaillé avec estimation de la marge ou du déficit
  paceMessageText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.forest,
    fontWeight: '500',
    marginTop: 4,
  },
  // Section 7 : Carte d'alerte spécifique pour la catégorie critique
  attentionCard: {
    backgroundColor: '#FFF8F8',
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: '#FFCDD2',
    padding: 16,
    gap: 10,
  },
  // En-tête de la carte d'alerte avec nom et badge de criticité
  attentionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  // Bloc horizontal associant l'icône corail et le nom en alerte
  attentionTitleBox: {
    alignItems: 'center',
    gap: 8,
  },
  // Nom de la catégorie requérant une action immédiate
  attentionCategoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.coral,
  },
  // Pastille douce corail indiquant le taux de consommation excessif
  attentionBadge: {
    backgroundColor: colors.coralSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  // Texte chiffré du dépassement de la catégorie sous tension
  attentionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.coral,
  },
  // Explication pédagogique claire de la cause de mise en garde
  attentionReasonText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#444444',
  },
  // Encadré blanc intérieur contenant le plan d'action préconisé
  suggestionBox: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    padding: 12,
    gap: 6,
  },
  // En-tête avec bouclier vert forêt de protection budgétaire
  suggestionHeader: {
    alignItems: 'center',
    gap: 6,
  },
  // Titre du plan d'action préventif
  suggestionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forest,
  },
  // Recommandation concrète pour assainir la dépense sur cette catégorie
  suggestionBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#333333',
  },
  // Carte positive alternative : félicite pour la maîtrise globale
  healthyAttentionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    padding: 16,
    gap: 8,
  },
  // Titre de confirmation de gestion budgétaire saine
  healthyAttentionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.green,
    flex: 1,
  },
  // Corps de message rassurant confirmant le respect des plafonds
  healthyAttentionBody: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.forest,
  },
});
