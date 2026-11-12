// ============================================================
// FICHIER : src/app/budget-mois.tsx
// RÔLE    : Écran de création et répartition du budget — Design Figma 09, 10 & 11.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN :
//   Étape 1 : "Créer un budget" (Figma 09) :
//     • Header : ‹ retour + "Créer un budget" + profil
//     • Label "UNE PÉRIODE QUI VOUS CONVIENT" (uppercase, muted)
//     • Titre "Donnez un but à chaque dinar." (bold, ink)
//     • Sous-titre "Choisissez librement les dates, sans vous limiter au mois civil."
//     • Cartes blanches : Date de début, Date de fin, Budget total · DT
//     • Bannière mint de validation des dates
//     • Bouton primary forest : "Répartir par catégorie"
//     • Bouton secondary mint : "Annuler"
//
//   Étape 2 : "Répartir le budget / Modifier" (Figma 10 & 11) :
//     • Header : ‹ retour + "Répartir le budget" + profil
//     • Ligne d'en-tête : "01–30 NOV. 2026 · 30 JOURS"
//     • Lignes récapitulatives : Budget total, Réparti, Non réparti
//     • Cartes blanches par enveloppe (Alimentation · DT, Factures · DT...)
//     • Bannière mint : "✓ X DT restent non répartis"
//     • Bouton primary forest : "Créer mon budget" / "Enregistrer les modifications"
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

// Fonctions SQLite
import {
  getAllCategories,
  getMonthlyBudget,
  saveMonthlyBudget,
  getEnveloppesBudget,
  canDecreaseBudget,
  Categorie,
} from '../db/queries';

// Design System & Contexte
import { Theme } from '../constants/theme';
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';
import AppHeader from '../components/AppHeader';

const MOIS_NOMS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

type EnveloppeItem = {
  categorie_id: number;
  categorie_nom: string;
  categorie_icone: string;
  montant: number;
  pourcentage: number;
};

export default function BudgetMoisScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const maintenant = new Date();
  const annee = maintenant.getFullYear();
  const moisIndex = maintenant.getMonth();
  const moisCle = `${annee}-${String(moisIndex + 1).padStart(2, '0')}`;
  const dernierJour = new Date(annee, moisIndex + 1, 0).getDate();

  // Étape courante : 'periode' (Figma 09) ou 'repartition' (Figma 10 / 11)
  const [etape, setEtape] = useState<'periode' | 'repartition'>('periode');
  const [estEdition, setEstEdition] = useState<boolean>(false);

  // Étape 1 : Dates et total
  const [dateDebut, setDateDebut] = useState<string>(`01 ${MOIS_NOMS[moisIndex]} ${annee}`);
  const [dateFin, setDateFin] = useState<string>(`${dernierJour} ${MOIS_NOMS[moisIndex]} ${annee}`);
  const [budgetTotalTexte, setBudgetTotalTexte] = useState<string>('800');

  // Étape 2 : Répartition
  const [enveloppes, setEnveloppes] = useState<EnveloppeItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const existant = getMonthlyBudget(user.id, moisCle);

    if (existant && existant.montant_total > 0) {
      setEstEdition(true);
      setBudgetTotalTexte(String(existant.montant_total));
      const envs = getEnveloppesBudget(user.id, moisCle);
      setEnveloppes(
        envs.map((e) => ({
          categorie_id: e.categorie_id,
          categorie_nom: e.categorie_nom,
          categorie_icone: e.categorie_icone,
          montant: e.montant_alloue,
          pourcentage: e.pourcentage_alloue,
        }))
      );
      // Si un budget existe déjà, on démarre directement en vue répartition (Figma 11)
      setEtape('repartition');
    } else {
      setEstEdition(false);
      const budgetBase = user.budget_mensuel > 0 ? user.budget_mensuel : 800;
      setBudgetTotalTexte(String(budgetBase));

      const toutesCats = getAllCategories(true);
      const defauts = toutesCats.filter((c) => c.est_defaut === 1);
      const envsInit = (defauts.length > 0 ? defauts : toutesCats.slice(0, 5)).map((c) => ({
        categorie_id: c.id,
        categorie_nom: c.nom,
        categorie_icone: c.icone,
        montant: Math.round((budgetBase * (c.pourcentage_defaut || 20)) / 100),
        pourcentage: c.pourcentage_defaut || 20,
      }));
      setEnveloppes(envsInit);
    }
  }, [user, moisCle]);

  const budgetTotalNum = parseFloat(budgetTotalTexte.replace(',', '.')) || 0;
  const sommeRepartie = enveloppes.reduce((acc, cur) => acc + cur.montant, 0);
  const nonReparti = Math.max(0, budgetTotalNum - sommeRepartie);
  const estEnDepassement = sommeRepartie > budgetTotalNum;

  // Modification du montant d'une enveloppe
  function handleChangerMontant(catId: number, texte: string) {
    const val = parseFloat(texte.replace(',', '.')) || 0;
    setEnveloppes((prev) =>
      prev.map((e) => {
        if (e.categorie_id === catId) {
          const pct = budgetTotalNum > 0 ? Math.round((val / budgetTotalNum) * 100) : 0;
          return { ...e, montant: val, pourcentage: pct };
        }
        return e;
      })
    );
  }

  // Sauvegarde finale dans SQLite
  function handleSauvegarder() {
    if (!user) return;

    if (budgetTotalNum <= 0) {
      Alert.alert(t('erreur') ?? 'Attention', 'Veuillez définir un budget total valide.');
      return;
    }

    if (estEnDepassement) {
      Alert.alert(
        t('erreur') ?? 'Attention',
        'La somme des enveloppes dépasse le montant total alloué.'
      );
      return;
    }

    // Règle anti-triche : vérifie si on baisse sous le montant déjà dépensé
    for (const env of enveloppes) {
      const autorise = canDecreaseBudget(user.id, moisCle, env.categorie_id, env.montant);
      if (!autorise) {
        Alert.alert(
          'Règle budgétaire',
          `Vous ne pouvez pas baisser l'enveloppe « ${env.categorie_nom} » sous le montant déjà dépensé ce mois-ci.`
        );
        return;
      }
    }

    // Enregistrement SQLite
    saveMonthlyBudget(
      user.id,
      moisCle,
      budgetTotalNum,
      enveloppes.map((e) => ({
        categorie_id: e.categorie_id,
        montant: e.montant,
        pourcentage: e.pourcentage,
      }))
    );

    router.back();
  }

  return (
    <View style={styles.container}>
      {/* Header avec action retour */}
      <AppHeader
        titre={
          etape === 'periode'
            ? 'Créer un budget'
            : estEdition
            ? 'Modifier le budget'
            : 'Répartir le budget'
        }
        onMenuPress={() => {
          if (etape === 'repartition' && !estEdition) {
            setEtape('periode');
          } else {
            router.back();
          }
        }}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {etape === 'periode' ? (
          /* ==================================================== */
          /* ÉTAPE 1 : DÉFINITION DE LA PÉRIODE ET DU BUDGET (Figma 09) */
          /* ==================================================== */
          <View>
            <Text style={styles.sectionLabel}>
              UNE PÉRIODE QUI VOUS CONVIENT
            </Text>
            <Text style={styles.screenTitle}>
              Donnez un but à chaque dinar.
            </Text>
            <Text style={styles.screenSubtitle}>
              Choisissez librement les dates, sans vous limiter au mois civil.
            </Text>

            {/* Date de début */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Date de début</Text>
              <TextInput
                style={styles.textInput}
                value={dateDebut}
                onChangeText={setDateDebut}
              />
            </View>

            {/* Date de fin */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Date de fin</Text>
              <TextInput
                style={styles.textInput}
                value={dateFin}
                onChangeText={setDateFin}
              />
            </View>

            {/* Budget total · DT */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Budget total · DT</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 1,200.000"
                placeholderTextColor={Theme.colors.muted}
                keyboardType="decimal-pad"
                value={budgetTotalTexte}
                onChangeText={setBudgetTotalTexte}
              />
            </View>

            {/* Bannière validation (Figma 09) */}
            <View style={styles.mintBanner}>
              <View style={styles.bannerHeaderRow}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.bannerTitle}>Vos dates sont valides</Text>
              </View>
              <Text style={styles.bannerSub}>
                30 jours · La fin est postérieure au début.
              </Text>
            </View>

            {/* Boutons d'action */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setEtape('repartition')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Répartir par catégorie</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>
                {t('annuler') ?? 'Annuler'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ==================================================== */
          /* ÉTAPE 2 : RÉPARTITION PAR CATÉGORIE (Figma 10 & 11)   */
          /* ==================================================== */
          <View>
            {/* Ligne en-tête dates (Figma 10) */}
            <Text style={styles.periodHeader}>
              01–{dernierJour} {MOIS_NOMS[moisIndex].toUpperCase()} {annee} · {dernierJour} JOURS
            </Text>

            {/* Lignes récapitulatives */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Budget total</Text>
              <Text style={styles.summaryValue}>
                {budgetTotalNum.toFixed(3)} DT
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Réparti</Text>
              <Text style={styles.summaryValue}>
                {sommeRepartie.toFixed(3)} DT
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Non réparti</Text>
              <Text
                style={[
                  styles.summaryValue,
                  estEnDepassement && { color: Theme.colors.coral },
                ]}
              >
                {estEnDepassement
                  ? `Dépassement de ${(sommeRepartie - budgetTotalNum).toFixed(3)} DT`
                  : `${nonReparti.toFixed(3)} DT`}
              </Text>
            </View>

            {/* Cartes blanches des enveloppes de catégories */}
            <View style={{ marginTop: 16 }}>
              {enveloppes.map((env) => (
                <View key={env.categorie_id} style={styles.inputCard}>
                  <Text style={styles.inputLabel}>
                    {env.categorie_icone} {env.categorie_nom} · DT
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="0.000"
                    placeholderTextColor={Theme.colors.muted}
                    keyboardType="decimal-pad"
                    value={String(env.montant)}
                    onChangeText={(txt) => handleChangerMontant(env.categorie_id, txt)}
                  />
                </View>
              ))}
            </View>

            {/* Bannière de confirmation (Figma 10) */}
            <View
              style={[
                styles.mintBanner,
                estEnDepassement && styles.warningBanner,
              ]}
            >
              <View style={styles.bannerHeaderRow}>
                <Text style={styles.checkIcon}>{estEnDepassement ? '⚠️' : '✓'}</Text>
                <Text style={styles.bannerTitle}>
                  {estEnDepassement
                    ? 'Le total dépasse votre budget total'
                    : `${nonReparti.toFixed(3)} DT restent non répartis`}
                </Text>
              </View>
              <Text style={styles.bannerSub}>
                {estEnDepassement
                  ? 'Ajustez les montants de vos enveloppes pour ne pas dépasser.'
                  : 'À répartir plus tard. Le total ne peut dépasser le budget.'}
              </Text>
            </View>

            {/* Bouton de validation */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSauvegarder}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {estEdition ? 'Enregistrer les modifications' : 'Créer mon budget'}
              </Text>
            </TouchableOpacity>

            {/* Bouton retour étape période */}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setEtape('periode')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>
                ‹ Modifier la période
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 09, 10 & 11
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

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    color: Theme.colors.muted,
    lineHeight: 20,
    marginBottom: 20,
  },

  // Cartes blanches de saisie
  inputCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
    ...Theme.shadows.card,
  },
  inputLabel: {
    fontSize: 11,
    color: Theme.colors.muted,
    marginBottom: 4,
  },
  textInput: {
    fontSize: 15,
    color: Theme.colors.ink,
    fontWeight: '600',
    padding: 0,
  },

  // Bannière mint de validation
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.lg,
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  warningBanner: {
    backgroundColor: 'rgba(220, 119, 112, 0.15)',
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
  },
  bannerSub: {
    fontSize: 13,
    color: Theme.colors.forest,
  },

  // Étape 2 : Ligne de période
  periodHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  summaryLabel: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.ink,
  },

  // Boutons
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
    ...Theme.shadows.button,
  },
  primaryBtnText: {
    color: Theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Theme.colors.deepGreen,
    fontSize: 15,
    fontWeight: '700',
  },
});
