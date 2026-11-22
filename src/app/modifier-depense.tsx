/**
 * FICHIER : src/app/modifier-depense.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-024
 * ÉCRAN : ECRAN-FORM-02 (Modification d'une Dépense Directe)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur d'éditer une dépense directe déjà consignée
 * (ex: corriger le montant d'une facture SONEDE, réaffecter à une autre catégorie, ou changer la date) :
 * - Charge les valeurs existantes dans le formulaire `ExpenseForm`.
 * - Exécute un `UPDATE` direct dans la table SQLite `expenses` via `actions.updateExpense`.
 * - Ajuste l'enveloppe budgétaire correspondante selon la différence de montant.
 * - Redirige vers `/confirmation` avec la pastille verte de succès.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il offre la flexibilité indispensable pour tenir sa comptabilité sans rigidité.
 * Si une facture a été estimée puis régularisée, l'utilisateur met à jour le montant au millime près.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit 'Modifier la dépense' et flèche de retour arrière.
 * - Le surtitre 'LA MODIFICATION N'IMPACTE LE BUDGET QUE DE LA DIFFÉRENCE'.
 * - Le formulaire `ExpenseForm` pré-rempli avec les anciennes valeurs de la dépense.
 * - Un grand bouton vert 'Enregistrer les modifications'.
 * - Un bouton d'annulation qui quitte l'écran sans impacter la base.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
// Composants natifs pour alertes et boutons tactiles
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
// Formulaire modulaire de saisie d'une dépense directe
import { ExpenseForm } from '@/components/ExpenseForm';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { EmptyState, Eyebrow } from '@/components/ui';
// Constantes de design
import { colors, radius } from '@/constants/theme';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de modification d'une charge directe existante.
 *
 * RÔLE DANS L'APPLICATION :
 * Récupère la dépense par son ID dans SQLite et pré-remplit les champs du formulaire.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Le formulaire complet avec les champs éditables (catégorie, montant, note, date).
 */
export default function EditExpenseScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction de l'identifiant de la dépense passé dans l'URL (ex: /modifier-depense?id=...)
  const { id } = useLocalSearchParams<{ id: string }>();
  // Extraction des dépenses de la base SQLite et des actions
  const { db, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Recherche de la dépense ciblée dans SQLite
  const expense = db.expenses.find((e) => e.id === id);

  // Sécurité : si la dépense est introuvable
  if (!expense) {
    return (
      <Screen title={t('modifier_depense_titre')} back>
        <EmptyState
          title={t('depense_non_trouvee')}
          actionLabel={t('retour')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  // Fonction de suppression de la dépense avec confirmation préalable
  const handleDelete = () => {
    const doDelete = () => {
      // Suppression effective de la dépense dans SQLite et le store
      actions.deleteExpense(expense.id);
      // Retour fluide à l'écran précédent
      router.back();
    };

    if (Platform.OS === 'web') {
      const msg = isRTL
        ? 'هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذه العملية.'
        : 'Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible.';
      const confirmed = typeof window !== 'undefined' ? window.confirm(msg) : true;
      if (confirmed) {
        doDelete();
      }
      return;
    }

    // Alerte de confirmation native empêchant toute suppression accidentelle
    Alert.alert(
      // Titre de l'alerte
      isRTL ? 'تأكيد الحذف' : 'Confirmer la suppression',
      // Message d'avertissement explicatif
      isRTL
        ? 'هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذه العملية.'
        : 'Êtes-vous sûr de vouloir supprimer cette dépense ? Cette action est irréversible.',
      [
        // Bouton d'annulation sans impact
        { text: isRTL ? 'إلغاء' : 'Annuler', style: 'cancel' },
        // Bouton de validation destructrice
        {
          text: isRTL ? 'حذف' : 'Supprimer',
          style: 'destructive',
          onPress: doDelete,
        },
      ]
    );
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('modifier_depense_titre')} back>
      {/* Surtitre explicatif rappelant le calcul au différentiel en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('modification_difference_budget').toUpperCase()}
      </Eyebrow>

      {/* Formulaire pré-rempli pour la dépense directe */}
      <ExpenseForm
        initial={expense}
        excludeId={expense.id}
        submitLabel={t('enregistrer_modifications')}
        onCancel={() => router.back()}
        onSubmit={(v) => {
          /**
           * MISSION DU GESTIONNAIRE ONSUBMIT :
           * Mettre à jour la ligne dans la table SQLite 'expenses' et ouvrir l'écran de confirmation.
           *
           * RÔLE DANS L'APPLICATION :
           * Répercute la différence monétaire sur le budget actif et confirme la sauvegarde.
           *
           * CE QUI EST AFFICHÉ À L'ÉCRAN :
           * Enregistre les changements et bascule vers l'écran de confirmation vert.
           */
          actions.updateExpense(expense.id, v);
          router.replace({
            pathname: '/confirmation',
            params: {
              kind: 'update',
              categoryId: v.categoryId,
              amount: String(v.amount),
            },
          } as never);
        }}
      />

      {/* Bouton de suppression définitive de la dépense */}
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
            {isRTL ? 'حذف هذا المصروف' : 'Supprimer cette dépense'}
          </Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}
