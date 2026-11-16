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

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
// Ligne récapitulative stylisée avec icône et libellé
import { TransactionRow } from '@/components/Cards';
// Sélecteur visuel de catégories réutilisable
import { CategoryPicker } from '@/components/CategoryPicker';
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

// Liste des identifiants de catégories cochées par défaut à la première ouverture pour faciliter la prise en main
const DEFAULTS = ['food', 'transport', 'bills', 'entertainment', 'savings'];

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
  const { db, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL, traduireCategorie } = useTranslation();

  // État local : numéro de l'étape en cours (1: Découverte, 2: Sélection, 3: Récapitulatif)
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // État local : tableau des catégories sélectionnées (initialisé avec les valeurs par défaut tunisiennes)
  const [selected, setSelected] = useState<string[]>(DEFAULTS);

  /**
   * MISSION DE LA FONCTION :
   * Basculer l'état coché / décoché d'une catégorie donnée.
   *
   * RÔLE DANS L'APPLICATION :
   * Permet à l'utilisateur de composer sa liste sur mesure à l'étape 2.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Met à jour immédiatement le bouton tactile de la catégorie en vert foncé et recalcule le compteur du bouton de passage à l'étape 3.
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
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.completeOnboarding` qui persiste les catégories dans la table `users`,
   * passe le drapeau `onboarded = 1`, et redirige vers l'accueil `/(tabs)` sans aucun écran blanc.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Fait basculer l'application vers le tableau de bord d'accueil complet avec les enveloppes configurées.
   */
  const finish = () => {
    // Écriture synchrone dans SQLite via le store
    actions.completeOnboarding(selected);
    // Redirection propre et définitive vers le tableau de bord principal
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
            }}
          >
            {/* Icône de feuille menthe lumineuse */}
            <Ionicons name="leaf" size={48} color={colors.mint} />
            {/* Message d'accroche chaleureux en lettres blanches */}
            <Text
              style={{
                color: colors.white,
                fontSize: 27,
                lineHeight: 36,
                fontWeight: '600',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {t('onboarding_titre_hero')}
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

          {/* Titre et note explicative */}
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('vie_quotidienne_organisee')}
          </SectionTitle>
          <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('changer_a_tout_moment')}
          </Body>

          {/* Sélecteur de catégories : affiche la liste des rayons avec boutons tactiles réactifs */}
          <CategoryPicker
            categories={db.categories}
            selected={selected}
            onToggle={toggle}
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

          {/* Bouton vert forêt : validation finale et ouverture de la page d'accueil sans écran blanc */}
          <Button label={t('aller_a_accueil')} onPress={finish} />

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
