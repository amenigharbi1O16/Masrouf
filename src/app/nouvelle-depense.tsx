/**
 * FICHIER : src/app/nouvelle-depense.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-028
 * ÉCRAN : ECRAN-FORM-01 (Enregistrement d'une Nouvelle Dépense Directe)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur d'enregistrer une dépense de la vie quotidienne sans article au détail :
 * loyer d'habitation, facture d'électricité STEG, quittance d'eau SONEDE, carburant, abonnement internet ou consultation médicale.
 * - Saisie du montant direct en Dinars Tunisiens (DT).
 * - Sélection de la catégorie de dépense correspondante.
 * - Note descriptive optionnelle (ex: 'Facture bimestrielle climatiseur').
 * - Choix de la date.
 * - Insertion immédiate dans la table SQLite `expenses` et redirection vers `/confirmation`.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il gère les dépenses forfaitaires qui ne nécessitent pas de calcul de prix unitaire au litre ou au kilo.
 * Cette dépense vient débiter immédiatement l'enveloppe budgétaire correspondante et recalcule le reste à vivre en temps réel.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit 'Ajouter une dépense' et flèche de retour.
 * - Le surtitre 'AUCUN PRODUIT REQUIS' avec le sous-titre 'GARDER LES ESSENTIELS EN VUE'.
 * - Le formulaire complet `ExpenseForm` :
 *   1. Sélecteur de catégorie de dépense (Factures, Logement, Transport, etc.).
 *   2. Champ de montant en DT avec pavé numérique à 3 décimales.
 *   3. Champ de note explicative libre.
 *   4. Sélecteur de date pré-rempli à la date du jour.
 * - Un grand bouton vert 'Enregistrer la dépense'.
 * - Un bouton d'annulation qui revient en arrière sans rien sauvegarder.
 */

import { useRouter } from 'expo-router';
import React from 'react';
// Formulaire modulaire pour la saisie d'une dépense directe
import { ExpenseForm } from '@/components/ExpenseForm';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Eyebrow, SectionTitle } from '@/components/ui';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de formulaire d'ajout d'une dépense directe.
 *
 * RÔLE DANS L'APPLICATION :
 * Réceptionne les données saisies par l'utilisateur, déclenche l'écriture dans la table SQLite `expenses`,
 * et route vers l'écran récapitulatif de confirmation.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec le formulaire de dépense et les boutons tactiles.
 */
export default function AddExpenseScreen() {
  // Hook de navigation Expo Router pour rediriger après enregistrement
  const router = useRouter();
  // Extraction des actions du magasin SQLite
  const { actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('ajouter_depense')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('aucun_produit_requis')}
      </Eyebrow>

      {/* Titre descriptif invitant à suivre ses charges régulières */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('garder_essentiels_vue')}
      </SectionTitle>

      {/* Formulaire de saisie d'une dépense directe */}
      <ExpenseForm
        submitLabel={t('enregistrer_depense_btn')}
        onCancel={() => router.back()}
        onSubmit={(v) => {
          /**
           * MISSION DU GESTIONNAIRE ONSUBMIT :
           * Insérer la dépense dans la table SQLite 'expenses' et ouvrir l'écran de confirmation.
           *
           * RÔLE DANS L'APPLICATION :
           * Met à jour instantanément le solde dépensé de l'enveloppe budgétaire et attribue les points de fidélité.
           *
           * CE QUI EST AFFICHÉ À L'ÉCRAN :
           * Enregistre les données et redirige vers l'écran de confirmation avec une animation de réussite.
           */
          actions.addExpense(v);
          router.replace({
            pathname: '/confirmation',
            params: {
              kind: 'expense',
              categoryId: v.categoryId,
              amount: String(v.amount),
            },
          } as never);
        }}
      />
    </Screen>
  );
}
