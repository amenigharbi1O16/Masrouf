/**
 * FICHIER : src/app/modifier-achat.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-023
 * ÉCRAN : ECRAN-FORM-02 (Modification d'un Achat de Produit)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur de rectifier les données d'un achat d'épicerie déjà consigné
 * (ex: corriger une faute de frappe sur le prix, modifier la quantité achetée, changer le magasin ou la date) :
 * - Le sélecteur d'article est verrouillé (`lockProduct = true`) afin de préserver l'intégrité de l'historique du produit.
 * - Le budget actif n'est impacté que par la différence monétaire (le différentiel).
 * - Redirige vers `/comparer-prix` pour visualiser la nouvelle courbe de prix avant validation définitive dans SQLite.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il garantit la réversibilité et la précision des données financières. L'utilisateur peut corriger
 * une erreur de ticket de caisse à tout moment sans avoir à supprimer puis recréer l'achat de zéro.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit 'Modifier l'achat' et flèche de retour.
 * - Le surtitre 'LA MODIFICATION N'IMPACTE LE BUDGET QUE DE LA DIFFÉRENCE'.
 * - Le formulaire `PurchaseForm` pré-rempli avec les anciennes valeurs de l'achat.
 * - Le nom du produit affiché en lecture seule sécurisée.
 * - Un bouton vert 'Comparer le prix et enregistrer' qui transmet les nouvelles valeurs au comparateur.
 * - Un bouton d'annulation qui revient à l'écran précédent sans modifier la base.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
// Composants natifs pour alertes et boutons tactiles
import { Alert, Text, TouchableOpacity, View } from 'react-native';
// Formulaire modulaire de saisie d'achat de produit
import { PurchaseForm } from '@/components/PurchaseForm';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { EmptyState, Eyebrow } from '@/components/ui';
// Constantes graphiques du design system
import { colors, radius } from '@/constants/theme';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de modification d'un ticket de caisse de produit.
 *
 * RÔLE DANS L'APPLICATION :
 * Récupère l'achat ciblé par son ID dans SQLite et initialise le formulaire avec ses valeurs actuelles.
 * Permet également la suppression définitive de l'achat avec confirmation.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Le formulaire pré-rempli avec les champs éditables (prix, quantité, magasin, date) et le bouton de suppression.
 */
export default function EditPurchaseScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction de l'identifiant de l'achat passé dans l'URL (ex: /modifier-achat?id=...)
  const { id } = useLocalSearchParams<{ id: string }>();
  // Extraction des achats de la base SQLite et des actions de mutation
  const { db, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Recherche de l'achat ciblé dans la liste hydratée depuis SQLite
  const purchase = db.purchases.find((p) => p.id === id);

  // Fonction de suppression de l'achat avec confirmation
  const handleDelete = () => {
    // Alerte de confirmation native
    Alert.alert(
      // Titre
      isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
      // Message
      isRTL
        ? 'هل أنت متأكد من حذف عملية الشراء هذه؟ لا يمكن التراجع عن هذه العملية.'
        : 'Êtes-vous sûr de vouloir supprimer cet achat ? Cette action est irréversible.',
      [
        // Bouton Annuler
        { text: isRTL ? 'إلغاء' : 'Annuler', style: 'cancel' },
        // Bouton Supprimer
        {
          text: isRTL ? 'حذف' : 'Supprimer',
          style: 'destructive',
          onPress: () => {
            // Suppression effective dans SQLite et dans le store
            actions.deletePurchase(purchase!.id);
            // Retour fluide
            router.back();
          },
        },
      ]
    );
  };

  // Sécurité : si l'achat a été supprimé ou est introuvable
  if (!purchase) {
    return (
      <Screen title={t('modifier_achat_titre')} back>
        <EmptyState
          title={t('achat_non_trouve')}
          actionLabel={t('retour')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('modifier_achat_titre')} back>
      {/* Surtitre explicatif rappelant le calcul au différentiel en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('modification_difference_budget').toUpperCase()}
      </Eyebrow>

      {/* Formulaire de saisie pré-rempli avec le produit verrouillé */}
      <PurchaseForm
        initial={purchase}
        lockProduct
        submitLabel={t('comparer_prix')}
        onCancel={() => router.back()}
        onSubmit={(v) => {
          /**
           * MISSION DU GESTIONNAIRE ONSUBMIT :
           * Rediriger vers l'écran `/comparer-prix` avec transmission de `purchaseId`.
           *
           * RÔLE DANS L'APPLICATION :
           * Permet de simuler le nouvel impact budgétaire et de recalculer le prix unitaire avant l'UPDATE en base.
           *
           * CE QUI EST AFFICHÉ À L'ÉCRAN :
           * Ouvre le comparateur avec l'ancien et le nouveau prix unitaire pour validation.
           */
          router.push({
            pathname: '/comparer-prix',
            params: {
              purchaseId: purchase.id,
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

      {/* Bouton de suppression définitive de l'achat */}
      <View style={{ marginTop: 16, marginBottom: 24 }}>
        <TouchableOpacity
          onPress={handleDelete}
          style={{
            backgroundColor: '#FEE2E2',
            paddingVertical: 14,
            borderRadius: radius.card,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.coral,
          }}
          activeOpacity={0.8}
        >
          <Text style={{ color: colors.coral, fontWeight: '700', fontSize: 14 }}>
            {isRTL ? 'حذف عملية الشراء هذه' : 'Supprimer cet achat'}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
