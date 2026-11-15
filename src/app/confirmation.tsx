/**
 * FICHIER : src/app/confirmation.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-019
 * ÉCRAN : ECRAN-NOTIF-02 (Confirmation de Transaction Enregistrée)
 *
 * MISSION DU FICHIER :
 * Rassurer immédiatement l'utilisateur après chaque enregistrement réussi d'achat ou de dépense :
 * 1. Affiche le montant exact enregistré avec la devise en Dinars Tunisiens (3 décimales, ex: 4.350 DT).
 * 2. Calcule et présente en direct l'impact sur l'enveloppe budgétaire de la catégorie (ex: 'Alimentation : 124 DT / 400 DT').
 * 3. Propose des raccourcis d'actions rapides (retour au tableau de bord d'accueil, consulter la fiche de l'article, ou enchaîner sur un nouvel enregistrement).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il ferme la boucle d'interaction de manière gratifiante et claire. L'utilisateur a la certitude
 * que sa saisie est bien persistée dans la base SQLite locale et voit tout de suite l'état de son budget restant.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand médaillon circulaire vert menthe (#D9F0E4) au centre avec une coche verte animée (✓).
 * - Le message de succès ('Achat enregistré', 'Dépense enregistrée' ou 'Modifications enregistrées').
 * - Le montant de la transaction en très grands chiffres vert forêt (#102B27) de 34px.
 * - La ligne d'information de la catégorie concernée avec son icône.
 * - La ligne de consommation budgétaire (vert si sain, rouge si l'enveloppe est dépassée).
 * - Le bouton vert principal 'Retour à l'accueil'.
 * - Les boutons secondaires 'Voir le produit' (si achat d'article) et 'Ajouter un autre achat / dépense'.
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
// Ligne d'information bicolore synthétique
import { InfoRow } from '@/components/Cards';
// Conteneur d'écran sans barre supérieure native (mode immersif plain)
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Button } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, vert menthe)
import { colors } from '@/constants/theme';
// Sélecteurs de calcul financier SQLite (nom de catégorie, budget actif, dépenses)
import {
  categoryName,
  currentBudget,
  spentByCategory,
} from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de formatage monétaire en Dinars Tunisiens
import { money, short } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran récapitulatif de validation post-enregistrement.
 *
 * RÔLE DANS L'APPLICATION :
 * Calcule l'état actualisé de l'enveloppe budgétaire dans SQLite et offre des options de rebond à l'utilisateur.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec le médaillon de succès, le grand montant en DT et les boutons de redirection.
 */
export default function ConfirmationScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Récupération des paramètres passés lors de la redirection
  const {
    kind = 'purchase',
    amount = '0',
    categoryId = '',
    productId,
  } = useLocalSearchParams<{
    kind?: string;
    amount?: string;
    categoryId?: string;
    productId?: string;
  }>();
  // Extraction des données de la base et du profil utilisateur
  const { db, me } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Recherche du budget actif de l'utilisateur connecté
  const budget = me ? currentBudget(db, me.id) : null;
  // Calcul de la somme totale consommée pour cette catégorie dans la période active
  const spent =
    budget && me
      ? spentByCategory(db, me.id, budget.start, budget.end)[categoryId] ?? 0
      : 0;
  // Plafond alloué pour cette catégorie
  const alloc = budget?.allocations[categoryId] ?? 0;

  // Libellé adapté selon la nature de l'opération (dépense directe, mise à jour ou achat)
  const label =
    kind === 'expense'
      ? t('depense_enregistree_succes')
      : kind === 'update'
      ? t('modifications_enregistrees_succes')
      : t('achat_enregistre_succes');

  return (
    // Screen : conteneur plein écran sans en-tête parasite
    <Screen title={t('confirmation_titre')} plain>
      {/* Bloc centré mettant en valeur la réussite avec le grand médaillon et le montant */}
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        {/* Médaillon circulaire vert menthe avec coche centrale */}
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: colors.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="checkmark" size={46} color={colors.green} />
        </View>

        {/* Titre de l'opération réussie */}
        <Text
          style={{
            fontSize: 22,
            fontWeight: '600',
            color: colors.forest,
            textAlign: 'center',
          }}
        >
          {label}
        </Text>

        {/* Montant exact de la transaction en grands caractères vert forêt de 34px */}
        <Text
          style={{
            fontSize: 34,
            fontWeight: '600',
            color: colors.forest,
            textAlign: 'center',
          }}
        >
          {money(Number(amount))}
        </Text>
      </View>

      {/* Ligne récapitulative affichant le nom du rayon de dépenses */}
      <InfoRow
        label={t('categorie')}
        value={categoryName(db, categoryId)}
      />

      {/* Ligne de consommation budgétaire : verte si sous le plafond, rouge si dépassement */}
      {budget ? (
        <InfoRow
          label={`${categoryName(db, categoryId)} (${t('budget')})`}
          value={`${short(spent)} / ${short(alloc)} DT`}
          tone={spent > alloc && alloc > 0 ? 'danger' : 'good'}
        />
      ) : null}

      {/* Bouton vert forêt : retour immédiat vers l'accueil principal */}
      <Button
        label={t('retour_a_accueil')}
        onPress={() => router.replace('/(tabs)')}
      />

      {/* Bouton secondaire clair : visible si un produit était concerné pour voir son historique de prix */}
      {productId ? (
        <Button
          label={t('voir_le_produit_btn')}
          variant="secondary"
          onPress={() =>
            router.replace({
              pathname: '/produit/[id]',
              params: { id: productId },
            } as never)
          }
        />
      ) : null}

      {/* Bouton secondaire clair : permet d'enchaîner immédiatement sur un autre enregistrement */}
      <Button
        label={
          kind === 'expense'
            ? t('ajouter_autre_depense_btn')
            : t('ajouter_autre_achat_btn')
        }
        variant="secondary"
        onPress={() =>
          router.replace(
            (kind === 'expense'
              ? '/nouvelle-depense'
              : '/nouvel-achat') as never
          )
        }
      />
    </Screen>
  );
}
