// ============================================================
// FICHIER : src/app/onboarding.tsx
// RÔLE    : Assistant de premier démarrage en 3 étapes — Design Figma 04/05/06.
//
// ÉTAPES :
//   1. Bienvenue (Figma 04) : carte hero verte, 3 caractéristiques
//   2. Sélection des catégories (Figma 05) : Produits + Dépenses par liste
//   3. Résumé (Figma 06) : catégories choisies + bannière + deux boutons
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../utils/auth';
import {
  getAllCategories,
  setUserCategories,
  updateUserOnboarding,
  Categorie,
} from '../db/queries';
import { useTranslation } from '../utils/i18n';
import { Theme } from '../constants/theme';

export default function OnboardingScreen() {
  const { user, refreshUser } = useAuth();
  const { t, traduireCategorie } = useTranslation();

  const [etape, setEtape] = useState<number>(1);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [selectionnees, setSelectionnees] = useState<number[]>([]);

  useEffect(() => {
    const toutes = getAllCategories(true);
    setCategories(toutes);
    // Catégories recommandées par défaut
    const recommandees = toutes.filter((c) => c.est_defaut === 1).map((c) => c.id);
    setSelectionnees(recommandees);
  }, []);

  // Sélection ou désélection d'une catégorie
  function toggleCategorie(id: number) {
    setSelectionnees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Suppression directe depuis l'écran de récapitulation (Étape 3)
  function supprimerDeLaSelection(id: number) {
    setSelectionnees((prev) => prev.filter((x) => x !== id));
  }

  function handleSuivant() {
    if (etape === 1) { setEtape(2); return; }
    if (etape === 2) {
      if (selectionnees.length === 0) {
        Alert.alert(
          t('selection_requise') ?? 'Sélection requise',
          t('selectionner_categorie') ?? 'Veuillez sélectionner au moins une catégorie.'
        );
        return;
      }
      if (user) setUserCategories(user.id, selectionnees);
      setEtape(3);
      return;
    }
  }

  async function handleTerminer() {
    if (!user) return;
    if (selectionnees.length === 0) {
      Alert.alert(
        t('selection_requise') ?? 'Sélection requise',
        t('selectionner_categorie') ?? 'Veuillez sélectionner au moins une catégorie avant de continuer.'
      );
      setEtape(2);
      return;
    }
    // Enregistre les catégories sélectionnées dans SQLite user_category
    setUserCategories(user.id, selectionnees);
    // Marque l'onboarding comme terminé (onboarding_done = 1)
    updateUserOnboarding(user.id);
    await refreshUser();
    // Accès à l'accueil où toutes les catégories et le budget sont disponibles
    router.replace('/(tabs)');
  }

  function handleRetourSelection() {
    setEtape(2);
  }

  // Catégories sélectionnées avec leurs détails
  const detailsSelectionnes = categories.filter((c) => selectionnees.includes(c.id));
  const produits = categories.filter((c) => c.type === 'product');
  const depenses = categories.filter((c) => c.type === 'expense');

  return (
    <SafeAreaView style={styles.root}>
      {/* ── BARRE DE PROGRESSION ── */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(etape / 3) * 100}%` }]} />
      </View>
      <Text style={styles.progressLabel}>{etape} / 3</Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ======================================================
            ÉTAPE 1 : BIENVENUE (Figma 04)
        ====================================================== */}
        {etape === 1 && (
          <>
            {/* En-tête avec ☰ hamburger + Titre + Profil 👤 */}
            <View style={styles.appHeader}>
              <Text style={styles.hamburger}>☰</Text>
              <Text style={styles.appHeaderTitle}>{t('bienvenue') ?? 'Bienvenue'}</Text>
              <Text style={styles.profileIcon}>👤</Text>
            </View>

            <Text style={styles.stepMeta}>01 / 03  ·  {t('a_votre_image') ?? 'À VOTRE IMAGE'}</Text>

            {/* Carte hero verte */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLeaf}>🍃</Text>
              <Text style={styles.heroText}>
                {t('onboarding_titre_hero') ?? 'De petits gestes.\nPlus de possibilités.'}
              </Text>
            </View>

            <Text style={styles.mainTitle}>
              {t('onboarding_decouvrez') ?? 'Découvrez votre argent autrement.'}
            </Text>
            <Text style={styles.mainSub}>
              {t('onboarding_intro') ?? 'Planifiez des périodes flexibles, suivez vos dépenses et faites évoluer vos habitudes.'}
            </Text>

            {/* 3 caractéristiques */}
            {[
              { n: '01', title: t('vos_categories') ?? 'Vos catégories', sub: t('onboarding_cat_desc') ?? 'Choisissez ce qui compte pour vous' },
              { n: '02', title: t('a_votre_rythme') ?? 'À votre rythme', sub: t('onboarding_budget_desc') ?? 'Créez un budget quand vous êtes prêt' },
              { n: '03', title: t('vos_progres') ?? 'Vos progrès', sub: t('onboarding_points_desc') ?? 'Gagnez des points en gardant le cap' },
            ].map((item) => (
              <View key={item.n} style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Text style={styles.featureIconText}>☐</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureSub}>{item.sub}</Text>
                </View>
                <Text style={styles.featureNum}>{item.n}</Text>
              </View>
            ))}

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSuivant}>
              <Text style={styles.primaryBtnText}>
                {t('choisir_categories') ?? 'Choisir mes catégories'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ======================================================
            ÉTAPE 2 : SÉLECTION DES CATÉGORIES (Figma 05)
        ====================================================== */}
        {etape === 2 && (
          <>
            {/* En-tête : ☰ Hamburger + Your categories + Profil 👤 */}
            <View style={styles.appHeader}>
              <Text style={styles.hamburger}>☰</Text>
              <Text style={styles.appHeaderTitle}>{t('vos_categories') ?? 'Vos catégories'}</Text>
              <Text style={styles.profileIcon}>👤</Text>
            </View>

            <Text style={styles.stepMeta}>02 / 03  ·  {t('choisissez_suivi') ?? 'CHOISISSEZ VOTRE SUIVI'}</Text>
            <Text style={styles.mainTitle}>{t('quotidien_organise') ?? 'Le quotidien, bien organisé.'}</Text>
            <Text style={styles.mainSub}>{t('modifier_plus_tard') ?? 'Vous pouvez les modifier à tout moment.'}</Text>

            {/* Section 1 : Produits */}
            <Text style={styles.catSectionTitle}>{t('produits') ?? 'Produits'}</Text>
            {produits.map((c) => {
              const checked = selectionnees.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.catRow}
                  onPress={() => toggleCategorie(c.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catName}>{traduireCategorie(c.nom)}</Text>
                  <Text style={[styles.catAction, checked && styles.catActionChecked]}>
                    {checked ? `✓ ${t('selectionnee') ?? 'Selected'}` : (t('selectionner') ?? 'Select')}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Section 2 : Dépenses */}
            <Text style={[styles.catSectionTitle, { marginTop: 24 }]}>{t('depenses') ?? 'Dépenses'}</Text>
            {depenses.map((c) => {
              const checked = selectionnees.includes(c.id);
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.catRow}
                  onPress={() => toggleCategorie(c.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.catName}>{traduireCategorie(c.nom)}</Text>
                  <Text style={[styles.catAction, checked && styles.catActionChecked]}>
                    {checked ? `✓ ${t('selectionnee') ?? 'Selected'}` : (t('selectionner') ?? 'Select')}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Bouton de confirmation : Review X categories */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSuivant}>
              <Text style={styles.primaryBtnText}>
                {t('verifier_categories', { count: selectionnees.length }) ?? `Vérifier les ${selectionnees.length} catégories`}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* ======================================================
            ÉTAPE 3 : RÉSUMÉ & CONFIRMATION (Figma 06)
        ====================================================== */}
        {etape === 3 && (
          <>
            {/* En-tête : ☰ Hamburger + Prêt à commencer + Profil 👤 */}
            <View style={styles.appHeader}>
              <Text style={styles.hamburger}>☰</Text>
              <Text style={styles.appHeaderTitle}>{t('pret_a_commencer') ?? 'Prêt à commencer'}</Text>
              <Text style={styles.profileIcon}>👤</Text>
            </View>

            <Text style={styles.stepMeta}>03 / 03  ·  {t('votre_selection') ?? 'VOTRE SÉLECTION'}</Text>
            <Text style={styles.mainTitle}>{t('plan_vous_ressemble') ?? 'Un plan qui vous ressemble.'}</Text>
            <Text style={styles.mainSub}>
              {`${detailsSelectionnes.length} ${t('categories_selectionnees') ?? 'catégories sélectionnées'}. ${t('pas_besoin_budget') ?? 'Pas encore besoin de budget.'}`}
            </Text>

            {/* Liste récapitulative des catégories sélectionnées avec option de suppression directe */}
            {detailsSelectionnes.map((c) => (
              <View key={c.id} style={styles.selectedCatCard}>
                <View style={styles.selectedCatIcon}>
                  <Text style={{ fontSize: 18 }}>{c.icone}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.selectedCatName}>{traduireCategorie(c.nom)}</Text>
                  <Text style={styles.selectedCatType}>
                    {c.type === 'product'
                      ? (t('categorie_produit') ?? 'Catégorie de produit')
                      : (t('categorie_depense') ?? 'Catégorie de dépense')}
                  </Text>
                </View>
                {/* Bouton pour retirer directement de la sélection */}
                <TouchableOpacity
                  onPress={() => supprimerDeLaSelection(c.id)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.deleteActionBtn}
                >
                  <Text style={styles.deleteActionText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            {detailsSelectionnes.length === 0 && (
              <View style={styles.emptyWarningCard}>
                <Text style={styles.emptyWarningText}>
                  {t('selectionner_categorie') ?? 'Toutes les catégories ont été retirées. Veuillez en choisir au moins une.'}
                </Text>
              </View>
            )}

            {/* Bannière mint */}
            <View style={styles.mintBanner}>
              <Text style={styles.mintBannerCheck}>✓</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.mintBannerTitle}>
                  {t('gardez_controle') ?? 'Vous gardez le contrôle'}
                </Text>
                <Text style={styles.mintBannerSub}>
                  {t('ajouter_retirer_params') ?? 'Ajoutez ou retirez des catégories dans les paramètres.'}
                </Text>
              </View>
            </View>

            {/* Bouton primaire : Confirmer et entrer dans l'application */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleTerminer}>
              <Text style={styles.primaryBtnText}>
                {t('acceder_accueil') ?? 'Accéder à mon accueil'}
              </Text>
            </TouchableOpacity>

            {/* Bouton secondaire : Revenir en arrière pour modifier/ajouter */}
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetourSelection}>
              <Text style={styles.secondaryBtnText}>
                {t('modifier_selection') ?? 'Modifier la sélection'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.warm },

  // Barre de progression
  progressBar: {
    height: 4,
    backgroundColor: Theme.colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Theme.colors.forest,
  },
  progressLabel: {
    fontSize: 12,
    color: Theme.colors.muted,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // En-tête
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hamburger: {
    fontSize: 22,
    color: Theme.colors.ink,
    marginRight: 12,
  },
  appHeaderTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.ink,
  },
  profileIcon: { fontSize: 20 },

  // Méta-étape
  stepMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Carte hero
  heroCard: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  heroLeaf: { fontSize: 28, marginBottom: 12 },
  heroText: {
    fontSize: 26,
    fontWeight: '800',
    color: Theme.colors.white,
    lineHeight: 32,
  },

  // Titres
  mainTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 6,
  },
  mainSub: {
    fontSize: 14,
    color: Theme.colors.muted,
    lineHeight: 20,
    marginBottom: 24,
  },

  // Caractéristiques étape 1
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Theme.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconText: { fontSize: 20, color: Theme.colors.forest },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
    marginBottom: 2,
  },
  featureSub: { fontSize: 12, color: Theme.colors.muted, lineHeight: 16 },
  featureNum: { fontSize: 14, fontWeight: '700', color: Theme.colors.muted },

  // Catégories étape 2
  catSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 10,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.divider,
  },
  catName: {
    fontSize: 14,
    color: Theme.colors.ink,
    fontWeight: '500',
  },
  catAction: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.colors.muted,
  },
  catActionChecked: {
    color: Theme.colors.forest,
  },

  // Résumé étape 3
  selectedCatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  selectedCatIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Theme.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCatName: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
  },
  selectedCatType: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginTop: 2,
  },
  deleteActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyWarningCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  emptyWarningText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bannière mint
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 24,
    marginTop: 10,
  },
  mintBannerCheck: {
    color: Theme.colors.deepGreen,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  mintBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
    marginBottom: 4,
  },
  mintBannerSub: {
    fontSize: 13,
    color: Theme.colors.muted,
    lineHeight: 18,
  },

  // Boutons
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: Theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: Theme.colors.forest,
    fontSize: 15,
    fontWeight: '600',
  },
});
