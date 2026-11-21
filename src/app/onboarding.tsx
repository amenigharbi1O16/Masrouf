/**
 * FICHIER : src/app/onboarding.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-029
 * ÉCRAN : ECRAN-ONB-01, ECRAN-ONB-02, ECRAN-ONB-03 (Assistant d'Accueil en 3 Étapes)
 *
 * MISSION DU FICHIER :
 * Guider le nouvel utilisateur immédiatement après son inscription à travers un parcours
 * d'accueil pédagogique structuré en 3 étapes sans aucun écran blanc :
 * - Étape 1 (ECRAN-ONB-01) : Bienvenue et découverte des 3 piliers (Produits d'épicerie, Dépenses fixes, Suivi des prix unitaires).
 * - Étape 2 (ECRAN-ONB-02) : Sélection visuelle libre des catégories suivies via `CategoryPicker` (avec bascule 'Choisir' / '✓ Sélectionné').
 * - Étape 3 (ECRAN-ONB-03) : Récapitulatif clair de toutes les catégories cochées avec coches vertes et validation finale vers l'accueil.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il garantit un démarrage personnalisé et chaleureux. L'utilisateur ne commence pas face à un tableau de bord vide et intimidant :
 * il calibre ses rayons de courses et ses postes de dépenses préférés en quelques secondes.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Étape 1 : Surtitre '01 / 03 · BIENVENUE', grand cartouche vert forêt avec icône feuille menthe (#D9F0E4),
 *   trois cartes d'exemples de transactions et un bouton 'Choisir mes catégories'.
 * - Étape 2 : Surtitre '02 / 03 · CHOISISSEZ CE QUE VOUS SUIVEZ', grille complète des catégories tunisiennes
 *   avec boutons tactiles 'Choisir' ou '✓ Sélectionné' et bouton vert 'Vérifier mes catégories (X)'.
 * - Étape 3 : Surtitre '03 / 03 · RÉCAPITULATIF', liste élégante de toutes les catégories validées avec coches vertes '✓',
 *   bannière d'aide bleue sur le budget, bouton vert 'Aller à l'accueil' et bouton 'Modifier ma sélection'.
 */

// Icônes vectorielles Ionicons pour les boutons et puces
import { Ionicons } from '@expo/vector-icons';
// Hook de navigation impérative Expo Router
import { useRouter } from 'expo-router';
// React core et hook de gestion d'état d'étape
import React, { useState } from 'react';
// Composants de base React Native pour le texte et les conteneurs
import { Text, TouchableOpacity, View } from 'react-native';
// Logo officiel Masrouf vectoriel botanique
import { MasroufLogo } from '@/components/MasroufLogo';
// Ligne récapitulative stylisée avec icône et libellé
import { TransactionRow } from '@/components/Cards';
// Sélecteur visuel de catégories réutilisable
import { CategoryPicker } from '@/components/CategoryPicker';
// Modal de sélection et création de catégorie personnalisée
import { CustomCategoryModal } from '@/components/CustomCategoryModal';
// Conteneur d'écran avec retour conditionnel
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import {
  AlertBanner,
  Body,
  Button,
  Eyebrow,
  SectionTitle,
} from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, menthe)
import { colors } from '@/constants/theme';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';
// Résolveur d'icône représentative par catégorie
import { getCategoryIcon } from '@/utils/categoryIcons';

/**
 * MISSION DU COMPOSANT :
 * Orchestrer le déroulement des 3 étapes de l'assistant d'accueil (Onboarding).
 *
 * RÔLE DANS L'APPLICATION :
 * Maintient l'état de l'étape courante (1, 2 ou 3) et sauvegarde la sélection finale dans SQLite à la fin du flux.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'écran interactif qui évolue sans rechargement brutal au fur et à mesure que l'utilisateur avance ou recule dans les étapes.
 */
export default function OnboardingScreen() {
  // Hook de navigation Expo Router pour rediriger vers la page d'accueil à la fin
  const router = useRouter();
  // Accès aux catégories de la base et à l'action de finalisation d'onboarding
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL, traduireCategorie } = useTranslation();

  // État local : numéro de l'étape en cours (1: Découverte, 2: Sélection, 3: Récapitulatif)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // État local : tableau des identifiants des catégories sélectionnées
  const [selected, setSelected] = useState<string[]>([]);
  // État local : affichage du modal d'ajout / création de catégorie
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);

  /**
   * MISSION DE LA FONCTION :
   * Basculer l'état coché / décoché d'une catégorie donnée.
   */
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Filtrage des objets de catégories réels de la base SQLite correspondant aux IDs sélectionnés
  const chosen = db.categories.filter((c) => selected.includes(c.id));

  /**
   * MISSION DE LA FONCTION :
   * Finaliser le parcours d'onboarding et enregistrer définitivement la sélection dans SQLite.
   * Redirige l'utilisateur (parent ou standard) vers son tableau de bord principal.
   */
  const finish = () => {
    // Écriture synchrone dans SQLite via le store
    actions.completeOnboarding(selected);
    // Redirection vers le tableau de bord principal
    router.replace('/(tabs)');
  };

  /**
   * MISSION DE LA FONCTION :
   * Déterminer le titre traduit de l'en-tête selon l'étape courante.
   *
   * RÔLE DANS L'APPLICATION :
   * Fournit un retour textuel immédiat sur la progression de l'utilisateur.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * 'Bienvenue' à l'étape 1, 'Vos catégories' à l'étape 2, et 'Récapitulatif' à l'étape 3.
   */
  const getTitle = () => {
    if (step === 1) return t('bienvenue');
    if (step === 2) return t('vos_categories');
    return t('recapitulatif_selection');
  };

  return (
    // Conteneur d'écran principal : gère le bouton retour aux étapes 2 et 3
    <Screen
      title={getTitle()}
      back={step > 1}
      plain={step === 1}
      onBack={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : s))}
    >
      {/* =========================================================================
          ÉTAPE 1 : BIENVENUE ET DÉCOUVERTE DU CONCEPT (ECRAN-ONB-01)
          ========================================================================= */}
      {step === 1 && (
        <>
          {/* Surtitre d'étape : 01 / 03 · BIENVENUE */}
          <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
            01 / 03 · {t('onboarding_intro').toUpperCase()}
          </Eyebrow>

          {/* Grand cartouche hero banner vert forêt avec feuille menthe */}
          <View
            style={{
              backgroundColor: colors.forest,
              borderRadius: 24,
              height: 248,
              padding: 24,
              justifyContent: 'space-between',
              alignItems: isRTL ? 'flex-end' : 'flex-start',
            }}
          >
            {/* Logo officiel Masrouf vectoriel en variante menthe pour fond sombre */}
            <MasroufLogo size={48} variant="mint" />
            {/* Message d'accroche chaleureux en lettres blanches adapté au profil */}
            <Text
              style={{
                color: colors.white,
                fontSize: 27,
                lineHeight: 36,
                fontWeight: '600',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {me?.role === 'child'
                ? isRTL
                  ? `مرحبًا ${me.name}، دعنا نبدأ في تنظيم مصروفك!`
                  : `Bienvenue ${me.name}, découvrez comment gérer votre argent de poche !`
                : t('onboarding_titre_hero')}
            </Text>
          </View>

          {/* Titre et sous-titre de présentation */}
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('onboarding_intro')}
          </SectionTitle>
          <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('onboarding_decouvrez')}
          </Body>

          {/* Trois lignes d'exemples concrets illustrant le suivi des dépenses et du prix unitaire */}
          <TransactionRow
            title={traduireCategorie('Alimentation')}
            detail={t('onboarding_cat_desc')}
            amount="−42.500 DT"
          />
          <TransactionRow
            title={`${traduireCategorie('Alimentation')} · Huile d'olive`}
            detail={t('onboarding_points_desc')}
            amount="−14.500 DT"
            icon="trending-down"
          />
          <TransactionRow
            // Libellé de la catégorie Transport
            title={traduireCategorie('Transport')}
            // Description du suivi budgétaire
            detail={t('onboarding_budget_desc')}
            // Montant de démonstration
            amount="−35.000 DT"
            // Icône descriptive de transport (voiture) au lieu de l'icône de portefeuille uniforme
            icon="car-outline"
          />

          {/* Bouton vert forêt pour avancer vers le choix des catégories */}
          <Button label={t('choisir_categories')} onPress={() => setStep(2)} />
        </>
      )}

      {/* =========================================================================
          ÉTAPE 2 : SÉLECTION DES CATÉGORIES (ECRAN-ONB-02)
          ========================================================================= */}
      {step === 2 && (
        <>
          {/* Surtitre d'étape : 02 / 03 · CHOISIR CE QUE VOUS SUIVEZ */}
          <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
            02 / 03 · {t('choisir_ce_que_vous_suivez').toUpperCase()}
          </Eyebrow>

          {/* Titre de la section de sélection des catégories et bouton d'ajout de catégorie */}
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left', marginBottom: 0, flex: 1 }}>
              {t('vie_quotidienne_organisee')}
            </SectionTitle>

            <TouchableOpacity
              onPress={() => setCategoryModalOpen(true)}
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row',
                alignItems: 'center',
                backgroundColor: colors.mint,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 20,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color={colors.forest} style={{ marginHorizontal: 2 }} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.forest }}>
                {t('ajouter_categorie')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sous-titre expliquant que la sélection est modifiable à tout moment */}
          <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('changer_a_tout_moment')}
          </Body>

          {/* Sélecteur de catégories : affiche uniquement les catégories existantes */}
          <CategoryPicker
            categories={db.categories}
            selected={selected}
            onToggle={toggle}
          />

          {/* Modal interactif d'ajout et création de catégorie */}
          <CustomCategoryModal
            visible={categoryModalOpen}
            onClose={() => setCategoryModalOpen(false)}
            onSuccess={(newCat) => {
              setSelected((prev) => Array.from(new Set([...prev, newCat.id])));
            }}
          />

          {/* Bouton vert de transition vers le récapitulatif avec compteur d'éléments */}
          <View style={{ marginTop: 12 }}>
            <Button
              label={t('verifier_categories', { count: selected.length })}
              onPress={() => setStep(3)}
              disabled={selected.length === 0}
            />
          </View>
        </>
      )}

      {/* =========================================================================
          ÉTAPE 3 : RÉCAPITULATIF ET VALIDATION FINALE (ECRAN-ONB-03)
          ========================================================================= */}
      {step === 3 && (
        <>
          {/* Surtitre d'étape : 03 / 03 · RÉCAPITULATIF DE LA SÉLECTION */}
          <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
            03 / 03 · {t('recapitulatif_selection').toUpperCase()}
          </Eyebrow>

          {/* Titre et compteur de confirmation */}
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('plan_qui_vous_ressemble')}
          </SectionTitle>
          <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('categories_selectionnees_compte', { count: selected.length })}
          </Body>

          {/* Liste récapitulative : chaque catégorie sélectionnée est confirmée par une coche verte vectorielle */}
          {chosen.map((c) => (
            <TransactionRow
              // Clé unique React
              key={c.id}
              // Nom traduit de la catégorie
              title={traduireCategorie(c.name)}
              // Description du type de catégorie
              detail={
                c.kind === 'product'
                  ? t('categorie_produit')
                  : t('categorie_depense')
              }
              // Coche de validation vectorielle Ionicons sans caractère texte
              isConfirmed
              // Icône représentative dédiée à la catégorie (restaurant, voiture, reçu, manette, etc.)
              icon={getCategoryIcon(c.name, c.kind)}
            />
          ))}

          {/* Bannière d'aide bleue rappelant que le budget pourra être défini à l'accueil */}
          <AlertBanner
            tone="info"
            title={t('budget_quand_pret')}
            detail={t('definir_depuis_accueil')}
          />

          {/* Bouton vert forêt : validation finale vers l'accueil */}
          <Button
            label={t('aller_a_accueil')}
            onPress={finish}
          />

          {/* Bouton secondaire clair : permet de revenir à l'étape 2 pour ajuster la liste */}
          <Button
            label={t('modifier_la_selection')}
            variant="secondary"
            onPress={() => setStep(2)}
          />
        </>
      )}
    </Screen>
  );
}
