// ============================================================
// FICHIER : src/app/onboarding.tsx
// RÔLE    : Assistant de premier démarrage (Onboarding) en 3 étapes
//           pour les nouveaux utilisateurs.
//
// ÉTAPES :
//   Étape 1 : Bienvenue & Présentation de la philosophie 100% locale et privée.
//   Étape 2 : Choix des catégories de dépenses et d'achats préférées.
//   Étape 3 : Confirmation & Finalisation (onboarding_done = 1).
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
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';

// Contexte d'authentification et base de données
import { useAuth } from '../utils/auth';
import {
  getAllCategories,
  getUserCategories,
  setUserCategories,
  updateUserOnboarding,
  Categorie,
} from '../db/queries';

// Internationalisation
import { useTranslation } from '../utils/i18n';

export default function OnboardingScreen() {
  const { user, refreshUser } = useAuth();
  const { t } = useTranslation();

  // Étape actuelle (1, 2 ou 3)
  const [etape, setEtape] = useState<number>(1);

  // Catégories disponibles et sélectionnées pour l'étape 2
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [selectionnees, setSelectionnees] = useState<number[]>([]);

  useEffect(() => {
    // Charge les catégories visibles du système
    const toutes = getAllCategories(true);
    setCategories(toutes);

    // Pré-coche par défaut les catégories recommandées / par défaut
    const recommandees = toutes.filter((c) => c.est_defaut === 1).map((c) => c.id);
    setSelectionnees(recommandees);
  }, []);

  // ----------------------------------------------------------
  // BASCULE D'UNE CATÉGORIE (COCHER / DÉCOCHER)
  // ----------------------------------------------------------
  function toggleCategorie(id: number) {
    setSelectionnees((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toutSelectionner() {
    setSelectionnees(categories.map((c) => c.id));
  }

  function selectionRecommandee() {
    const reco = categories.filter((c) => c.est_defaut === 1).map((c) => c.id);
    setSelectionnees(reco);
  }

  // ----------------------------------------------------------
  // PASSAGE A L'ETAPE SUIVANTE
  // ----------------------------------------------------------
  function handleSuivant() {
    if (etape === 1) {
      setEtape(2);
      return;
    }

    if (etape === 2) {
      if (selectionnees.length === 0) {
        Alert.alert(
          'Sélection requise',
          'Veuillez sélectionner au moins une catégorie pour commencer.'
        );
        return;
      }
      // Sauvegarde les catégories choisies dans user_category
      if (user) {
        setUserCategories(user.id, selectionnees);
      }
      setEtape(3);
      return;
    }
  }

  // ----------------------------------------------------------
  // FINALISATION DE L'ONBOARDING
  // ----------------------------------------------------------
  async function handleTerminer() {
    if (!user) return;

    try {
      // 1. Marque l'onboarding comme complété dans SQLite
      updateUserOnboarding(user.id, true);

      // 2. Rafraîchit l'état local du user dans le contexte d'auth
      await refreshUser();

      // 3. Redirige vers l'accueil utilisateur
      router.replace('/(tabs)');
    } catch (err) {
      console.error("Erreur lors de la validation de l'onboarding :", err);
      router.replace('/(tabs)');
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* INDICATEUR DE PROGRESSION (3 ÉTAPES) */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: etape === 1 ? '33%' : etape === 2 ? '66%' : '100%' },
            ]}
          />
        </View>
        <Text style={styles.stepText}>Étape {etape} sur 3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ==================================================== */}
        {/* ETAPE 1 : BIENVENUE & PHILOSOPHIE LOCALE             */}
        {/* ==================================================== */}
        {etape === 1 && (
          <View style={styles.stepCard}>
            <Text style={styles.heroEmoji}>🌱</Text>
            <Text style={styles.heroTitle}>Bienvenue sur Masrouf !</Text>
            <Text style={styles.heroSubtitle}>
              L'application tunisienne conçue pour vous redonner la maîtrise totale
              de vos dépenses quotidiennes et de votre budget familial.
            </Text>

            <View style={styles.featureBox}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🔒</Text>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureItemTitle}>100% Local et Privé</Text>
                  <Text style={styles.featureItemDesc}>
                    Aucun serveur distant. Vos revenus, achats et dépenses restent
                    exclusivement stockés sur votre smartphone.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📊</Text>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureItemTitle}>Méthode des Enveloppes</Text>
                  <Text style={styles.featureItemDesc}>
                    Allouez des montants cibles par catégorie pour garder le contrôle
                    sans mauvaises surprises en fin de mois.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🛒</Text>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureItemTitle}>Suivi Intégré des Produits</Text>
                  <Text style={styles.featureItemDesc}>
                    Saisie détaillée par article ou montant direct avec évaluation du
                    prix d'achat moyen.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSuivant}>
              <Text style={styles.primaryBtnText}>Personnaliser mes catégories →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================== */}
        {/* ETAPE 2 : SÉLECTION DES CATÉGORIES FAVORITES         */}
        {/* ==================================================== */}
        {etape === 2 && (
          <View style={styles.stepCard}>
            <Text style={styles.sectionTitle}>Vos Catégories Préférées</Text>
            <Text style={styles.sectionSubtitle}>
              Cochez les catégories que vous utilisez régulièrement. Vous pourrez en
              ajouter ou en masquer d'autres à tout moment.
            </Text>

            {/* Boutons d'aide à la sélection */}
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={selectionRecommandee}
              >
                <Text style={styles.quickBtnText}>⭐ Recommandées</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickBtn} onPress={toutSelectionner}>
                <Text style={styles.quickBtnText}>✅ Tout cocher</Text>
              </TouchableOpacity>
            </View>

            {/* Liste des catégories avec cases à cocher */}
            <View style={styles.catGrid}>
              {categories.map((c) => {
                const estCochee = selectionnees.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catCheckCard, estCochee && styles.catCheckCardActive]}
                    onPress={() => toggleCategorie(c.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.catEmoji}>{c.icone}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.catNameText}>{c.nom}</Text>
                      <Text style={styles.catDetailText}>
                        {c.type === 'expense' ? '🧾 Dépense' : '🛒 Produit'} • {c.theme}
                      </Text>
                    </View>
                    <View
                      style={[styles.checkbox, estCochee && styles.checkboxChecked]}
                    >
                      {estCochee && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSuivant}>
              <Text style={styles.primaryBtnText}>
                Valider ({selectionnees.length} sélectionnée(s)) →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==================================================== */}
        {/* ETAPE 3 : CONFIRMATION ET ACCUEIL                   */}
        {/* ==================================================== */}
        {etape === 3 && (
          <View style={styles.stepCard}>
            <Text style={styles.heroEmoji}>🎉</Text>
            <Text style={styles.heroTitle}>Tout est prêt !</Text>
            <Text style={styles.heroSubtitle}>
              Votre espace Masrouf est maintenant configuré avec vos catégories
              personnalisées.
            </Text>

            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Rappel important :</Text>
              <Text style={styles.summaryText}>
                • Votre budget mensuel est initialement libre (0 TND).
              </Text>
              <Text style={styles.summaryText}>
                • Rendez-vous dans l'onglet <Text style={{ fontWeight: '700' }}>Accueil</Text> ou{' '}
                <Text style={{ fontWeight: '700' }}>Réglages</Text> pour définir votre enveloppe
                globale dès que vous le souhaitez.
              </Text>
              <Text style={styles.summaryText}>
                • Vous pouvez commencer immédiatement à saisir vos premiers achats !
              </Text>
            </View>

            <TouchableOpacity style={styles.finishBtn} onPress={handleTerminer}>
              <Text style={styles.finishBtnText}>Commencer à gérer mon Masrouf 🚀</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 3,
  },
  stepText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 54,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  featureBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureIcon: {
    fontSize: 22,
  },
  featureTextCol: {
    flex: 1,
  },
  featureItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  featureItemDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
    width: '100%',
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  catGrid: {
    width: '100%',
    gap: 8,
    marginBottom: 18,
  },
  catCheckCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  catCheckCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  catEmoji: {
    fontSize: 24,
  },
  catNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  catDetailText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  summaryBox: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 24,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
    marginBottom: 2,
  },
  summaryText: {
    fontSize: 13,
    color: '#15803D',
    lineHeight: 18,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  finishBtn: {
    width: '100%',
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
