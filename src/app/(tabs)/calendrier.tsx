// ============================================================
// FICHIER : src/app/(tabs)/calendrier.tsx
// RÔLE    : Calendrier financier annuel — Design Figma 19.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 19 · FR · Calendar) :
//   • Header : ☰ hamburger + "Calendrier" + icône profil
//   • Label "VOTRE ANNÉE FINANCIÈRE" (muted, uppercase)
//   • Sélecteur d'année : "‹  2026  ›"
//   • Sous-titre : "Choisissez un mois pour consulter ses périodes budgétaires."
//   • Grille 3 colonnes de 12 mois (cartes blanches) :
//       - Nom du mois + montant dépensé "X DT"
//       - Barre colorée (vert < 70%, orange 70–99%, rouge ≥ 100%)
//       - Mois actuel : fond forest #102B27 + texte blanc
//       - Mois sans budget : "Aucun budget" grisé
//   • Légende : ● Sain ● Alerte 80% ● Dépassé
//   • Section "Novembre · sélectionné" :
//       - Dates + % utilisé
//       - "Dépensé / total" + montants
//   • Bouton secondary mint "Ouvrir l'ancienne période"
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getMonthlyBudget,
  getTotalMois,
  getEnveloppesBudget,
} from '../../db/queries';

// Design System & Contexte
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

// Noms des mois en français
const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril',
  'Mai', 'Juin', 'Juillet', 'Août',
  'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

// Noms abrégés pour l'affichage compact dans les cartes
const MOIS_ABR = [
  'jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

type DonneesMois = {
  cle: string;        // "2026-11"
  depense: number;    // total dépensé
  budget: number;     // budget total alloué
  ratio: number;      // 0–100+
};

export default function CalendrierScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useDrawer();

  const maintenant = new Date();
  const moisActuelNum = maintenant.getMonth() + 1; // 1–12

  // Année affichée (navigable avec ‹ ›)
  const [annee, setAnnee] = useState<number>(maintenant.getFullYear());

  // Mois sélectionné (1–12) — par défaut : mois en cours
  const [moisSel, setMoisSel] = useState<number>(moisActuelNum);

  // Données agrégées pour les 12 mois de l'année affichée
  const [donneesAnnee, setDonneesAnnee] = useState<DonneesMois[]>([]);

  // ----------------------------------------------------------
  // CHARGEMENT DES 12 MOIS AU FOCUS OU CHANGEMENT D'ANNÉE
  // ----------------------------------------------------------
  const chargerAnnee = useCallback(() => {
    if (!user) return;
    const liste: DonneesMois[] = [];
    for (let m = 1; m <= 12; m++) {
      const cle = `${annee}-${String(m).padStart(2, '0')}`;
      const depense = getTotalMois(user.id, cle);
      const budget = getMonthlyBudget(user.id, cle);
      const budgetTotal = budget?.montant_total ?? 0;
      const ratio = budgetTotal > 0 ? (depense / budgetTotal) * 100 : 0;
      liste.push({ cle, depense, budget: budgetTotal, ratio });
    }
    setDonneesAnnee(liste);
  }, [user, annee]);

  useFocusEffect(chargerAnnee);

  // ----------------------------------------------------------
  // DONNÉES DU MOIS SÉLECTIONNÉ
  // ----------------------------------------------------------
  const donneesSel = donneesAnnee[moisSel - 1];
  const ratioSel = donneesSel?.ratio ?? 0;

  // Couleur de statut
  const couleurStatut = (ratio: number): string => {
    if (ratio >= 100) return Theme.colors.coral;
    if (ratio >= 70) return Theme.colors.gold;
    return Theme.colors.deepGreen;
  };

  // Date de début et fin du mois sélectionné
  const dateDebut = `01 ${MOIS_ABR[moisSel - 1]} ${annee}`;
  const datesFin = new Date(annee, moisSel, 0).getDate();
  const dateFin = `${String(datesFin).padStart(2, '0')} ${MOIS_ABR[moisSel - 1]} ${annee}`;

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* HEADER : hamburger ☰ + "Calendrier" + icône profil        */}
      {/* ========================================================= */}
      <AppHeader
        titre={t('calendrier') ?? 'Calendrier'}
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* LABEL "VOTRE ANNÉE FINANCIÈRE"                            */}
        {/* ========================================================= */}
        <Text style={styles.sectionLabel}>
          {t('votre_annee_financiere') ?? 'VOTRE ANNÉE FINANCIÈRE'}
        </Text>

        {/* ========================================================= */}
        {/* SÉLECTEUR D'ANNÉE : ‹  2026  ›                           */}
        {/* ========================================================= */}
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setAnnee(a => a - 1)} style={styles.yearArrow}>
            <Text style={styles.yearArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.yearText}>{annee}</Text>
          <TouchableOpacity onPress={() => setAnnee(a => a + 1)} style={styles.yearArrow}>
            <Text style={styles.yearArrowText}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sous-titre */}
        <Text style={styles.yearHint}>
          {t('choisissez_mois') ??
            'Choisissez un mois pour consulter ses périodes budgétaires.'}
        </Text>

        {/* ========================================================= */}
        {/* GRILLE 3 COLONNES DES 12 MOIS                            */}
        {/* ========================================================= */}
        <View style={styles.grid}>
          {donneesAnnee.map((dm, idx) => {
            const numMois = idx + 1;
            const estActuel = numMois === moisActuelNum && annee === maintenant.getFullYear();
            const estSelectionne = numMois === moisSel;
            const couleur = couleurStatut(dm.ratio);
            const aUnBudget = dm.budget > 0;

            return (
              <TouchableOpacity
                key={dm.cle}
                style={[
                  styles.monthCard,
                  estActuel && styles.monthCardActuel,
                ]}
                onPress={() => setMoisSel(numMois)}
                activeOpacity={0.75}
              >
                {/* Nom du mois */}
                <Text style={[styles.monthName, estActuel && styles.monthNameActuel]}>
                  {MOIS_FR[idx]}
                </Text>

                {/* Montant dépensé ou "Aucun budget" */}
                <Text style={[styles.monthAmount, estActuel && styles.monthAmountActuel]}>
                  {aUnBudget
                    ? `${dm.depense.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} DT`
                    : (t('aucun_budget') ?? 'Aucun budget')}
                </Text>

                {/* Barre de statut colorée */}
                <View style={styles.monthBarTrack}>
                  <View
                    style={[
                      styles.monthBarFill,
                      {
                        width: `${Math.min(dm.ratio, 100)}%`,
                        backgroundColor: aUnBudget
                          ? (estActuel ? '#D9F0E4' : couleur)
                          : Theme.colors.border,
                      },
                    ]}
                  />
                </View>

                {/* Point de sélection */}
                {estSelectionne && !estActuel && (
                  <View style={styles.selDot} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ========================================================= */}
        {/* LÉGENDE                                                   */}
        {/* ========================================================= */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.deepGreen }]} />
            <Text style={styles.legendText}>{t('sain') ?? 'Sain'}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.gold }]} />
            <Text style={styles.legendText}>{t('alerte_80') ?? 'Alerte 80%'}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Theme.colors.coral }]} />
            <Text style={styles.legendText}>{t('depasse') ?? 'Dépassé'}</Text>
          </View>
        </View>

        {/* ========================================================= */}
        {/* SECTION MOIS SÉLECTIONNÉ                                  */}
        {/* ========================================================= */}
        {donneesSel && (
          <View style={styles.selectedSection}>
            {/* Titre : "Novembre · sélectionné" */}
            <Text style={styles.selectedTitle}>
              {MOIS_FR[moisSel - 1]} · {t('selectionne') ?? 'sélectionné'}
            </Text>

            {/* Ligne dates + % utilisé */}
            <View style={styles.selectedRow}>
              <Text style={styles.selectedDates}>
                {dateDebut}–{dateFin}
              </Text>
              <Text style={[styles.selectedRatio, { color: couleurStatut(ratioSel) }]}>
                {ratioSel.toFixed(1)}% {t('utilise') ?? 'utilisé'}
              </Text>
            </View>

            {/* Ligne dépensé / total */}
            <View style={styles.selectedRow}>
              <Text style={styles.selectedLabel}>
                {t('depense_total') ?? 'Dépensé / total'}
              </Text>
              <Text style={styles.selectedValue}>
                {donneesSel.depense.toFixed(3)} / {donneesSel.budget > 0 ? donneesSel.budget.toFixed(3) : '—'} DT
              </Text>
            </View>

            {/* Bouton secondary mint "Ouvrir l'ancienne période" */}
            <TouchableOpacity
              style={styles.openBtn}
              onPress={() => router.push('/budget-mois')}
              activeOpacity={0.8}
            >
              <Text style={styles.openBtnText}>
                {t('ouvrir_periode') ?? "Ouvrir l'ancienne période"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 19
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },

  // Label uppercase muted
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Sélecteur d'année
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 8,
  },
  yearArrow: {
    padding: 8,
  },
  yearArrowText: {
    fontSize: 24,
    color: Theme.colors.ink,
    fontWeight: '300',
  },
  yearText: {
    fontSize: 26,
    fontWeight: '800',
    color: Theme.colors.ink,
    minWidth: 80,
    textAlign: 'center',
  },
  yearHint: {
    fontSize: 14,
    color: Theme.colors.muted,
    marginBottom: 20,
    lineHeight: 20,
  },

  // Grille 3 colonnes
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },

  // Carte de mois (blanc, ~1/3 de largeur)
  monthCard: {
    width: '30.5%',
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 10,
    minHeight: 90,
    justifyContent: 'space-between',
    ...Theme.shadows.card,
  },

  // Mois en cours : fond forest #102B27
  monthCardActuel: {
    backgroundColor: Theme.colors.forest,
    borderColor: Theme.colors.forest,
  },

  monthName: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.ink,
    marginBottom: 4,
  },
  monthNameActuel: {
    color: Theme.colors.white,
  },

  monthAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 8,
  },
  monthAmountActuel: {
    color: Theme.colors.white,
  },

  // Barre de statut
  monthBarTrack: {
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  monthBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Point de sélection (anneau vert)
  selDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.deepGreen,
  },

  // Légende
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Theme.colors.muted,
  },

  // Section mois sélectionné
  selectedSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  selectedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 16,
  },
  selectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedDates: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  selectedRatio: {
    fontSize: 14,
    fontWeight: '700',
  },
  selectedLabel: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  selectedValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // Bouton secondary mint
  openBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  openBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.deepGreen,
  },
});
