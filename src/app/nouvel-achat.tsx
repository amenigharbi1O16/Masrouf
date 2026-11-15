/**
 * FICHIER : src/app/nouvel-achat.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-027
 * ÉCRAN : ECRAN-FORM-01 (Enregistrement d'un Nouvel Achat de Produit)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur d'enregistrer un achat d'épicerie pour un article existant
 * (ex: Huile d'olive, Lait 1L, Café moulu, Couscous) :
 * - Saisie du prix total payé en Dinars Tunisiens (DT).
 * - Saisie de la quantité achetée et de l'unité (pièce, kg, g, litre, pack).
 * - Saisie du magasin (Monoprix, Carrefour, Épicier du quartier).
 * - Date de l'achat.
 * - Redirection vers l'écran d'analyse et de détection d'inflation `/comparer-prix`.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il alimente la base de données SQLite en tickets de caisse précis. Grâce à ces données,
 * Masrouf calcule automatiquement le prix unitaire au litre/kg et alerte l'utilisateur
 * si le magasin pratique une hausse de prix par rapport à ses passages précédents.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit 'Achat de produit' et flèche de retour.
 * - Le surtitre 'ENREGISTRER L'ACHAT D'UN PRODUIT'.
 * - Le formulaire complet `PurchaseForm` :
 *   1. Sélecteur de produit avec recherche rapide (verrouillé si on arrive depuis la fiche d'un article).
 *   2. Champ 'Quantité' avec sélecteur d'unité.
 *   3. Champ 'Prix total (DT)' avec pavé numérique.
 *   4. Champ 'Enseigne / Magasin' avec suggestions courantes.
 *   5. Champ 'Date d'achat' pré-rempli à la date du jour.
 * - Un bouton vert d'action 'Comparer le prix et enregistrer'.
 * - Un bouton d'annulation qui revient en arrière.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
// Formulaire réutilisable de saisie d'un achat de produit
import { PurchaseForm } from '@/components/PurchaseForm';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Eyebrow } from '@/components/ui';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Rendre l'écran de saisie d'un ticket de caisse de produit.
 *
 * RÔLE DANS L'APPLICATION :
 * Récupère un éventuel `productId` pré-sélectionné et transfère les données saisies au comparateur de prix.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'écran complet avec le formulaire de saisie et les boutons d'action.
 */
export default function AddPurchaseScreen() {
  // Hook de navigation Expo Router pour rediriger l'utilisateur
  const router = useRouter();
  // Extraction de l'identifiant optionnel si l'achat est initié depuis la fiche d'un produit spécifique
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('achat_produit')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('enregistrer_achat_produit')}
      </Eyebrow>

      {/* Formulaire complet de saisie d'achat */}
      <PurchaseForm
        initial={{ productId }}
        lockProduct={!!productId}
        submitLabel={t('comparer_prix')}
        onCancel={() => router.back()}
        onSubmit={(v) => {
          /**
           * MISSION DU GESTIONNAIRE ONSUBMIT :
           * Transférer les données saisies par l'utilisateur vers l'écran d'analyse d'inflation `/comparer-prix`.
           *
           * RÔLE DANS L'APPLICATION :
           * Permet à l'utilisateur de constater l'écart de prix par rapport à son dernier achat avant confirmation en base.
           *
           * CE QUI EST AFFICHÉ À L'ÉCRAN :
           * Ouvre immédiatement l'écran de comparaison avec la pastille verte ou rouge d'inflation.
           */
          router.push({
            pathname: '/comparer-prix',
            params: {
              productId: v.productId,
              price: String(v.price),
              quantity: String(v.quantity),
              unit: v.unit,
              store: v.store,
              date: v.date,
            },
          } as never);
        }}
      />
    </Screen>
  );
}
