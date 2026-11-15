/**
 * FICHIER : src/app/produit/[id].tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-031
 * ÉCRAN : ECRAN-PROD-01 (Fiche Détail Produit et Suivi des Prix Unitaires)
 *
 * MISSION DU FICHIER :
 * Présenter l'observatoire complet des prix et l'identité d'un article d'épicerie :
 * 1. Affiche l'identité du produit (photo carrée ou icône stylisée `ProductThumb`, nom, marque, catégorie et unité).
 * 2. Calcule et affiche le dernier prix unitaire payé en Dinars Tunisiens (DT), la date et l'enseigne du dernier achat.
 * 3. Affiche la pastille de variation d'inflation `PriceIndicator` (verte si baisse de prix, rouge si hausse).
 * 4. Trace le graphique vectoriel SVG `PriceChart` montrant l'évolution historique des prix unitaires.
 * 5. Offre des raccourcis pour voir l'historique chronologique complet (`/produit/historique`),
 *    enregistrer un nouvel achat immédiat pour ce produit (`/nouvel-achat?productId=...`), ou éditer la fiche (`/modifier-produit`).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il donne au consommateur une arme contre l'inflation. Avant d'acheter ou dans les rayons du supermarché,
 * l'utilisateur vérifie combien il payait ce produit il y a un ou deux mois et dans quel magasin il était le moins cher.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec le nom du produit et la flèche de retour.
 * - Le surtitre 'DÉTAILS DU PRODUIT'.
 * - Une carte blanche avec une vignette photo de 72x72px à gauche, le nom en grand (22px vert forêt), la marque et le rayon.
 * - Si des achats existent :
 *   1. Ligne 'Dernier prix unitaire' (ex: 1.450 DT / L).
 *   2. Ligne 'Dernier achat' (ex: 14/11/2026).
 *   3. Ligne 'Magasin' (ex: Monoprix Ariana).
 *   4. Pastille colorée de variation de prix (+0.100 DT, +7.4%).
 *   5. Graphique vectoriel SVG des 6 derniers relevés de prix.
 * - Si aucun achat n'existe : illustration accueillante avec bouton invitant à noter le premier passage en caisse.
 * - Trois boutons verticaux : 'Historique complet des achats', 'Ajouter un achat' et 'Modifier le produit'.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
// Ligne d'information synthétique bicolore
import { InfoRow } from '@/components/Cards';
// Graphique vectoriel SVG d'évolution des prix
import { PriceChart } from '@/components/PriceChart';
// Vignette d'affichage de la photo du produit avec coins arrondis
import { ProductThumb } from '@/components/ProductThumb';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import {
  Button,
  EmptyState,
  Eyebrow,
  PriceIndicator,
} from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, bordures et arrondis)
import { colors, radius } from '@/constants/theme';
// Sélecteurs de calcul financier SQLite (nom de catégorie, variation de prix, achats)
import {
  categoryName,
  priceChange,
  productPurchases,
  unitOf,
} from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de formatage monétaire et de dates
import { dt, fmtDate, monthShort, parseISO } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de la fiche détaillée d'un article et son suivi de prix.
 *
 * RÔLE DANS L'APPLICATION :
 * Charge les données de l'article depuis SQLite via son ID dynamique (`/produit/[id]`),
 * extrait tous ses achats et génère les points du graphique temporel.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La fiche d'identité du produit, son dernier cours unitaire, sa pastille d'inflation et les boutons d'action.
 */
export default function ProductDetailsScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction de l'ID du produit depuis l'URL dynamique
  const { id } = useLocalSearchParams<{ id: string }>();
  // Extraction des données de la base SQLite
  const { db } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Recherche du produit ciblé dans la table SQLite 'products'
  const product = db.products.find((p) => p.id === id);

  // Sécurité : si l'article n'existe plus ou a été supprimé
  if (!product) {
    return (
      <Screen title={t('fiche_produit')} back>
        <EmptyState
          icon="alert-circle-outline"
          title={t('produit_non_trouve')}
          detail={t('produit_supprime_detail')}
          actionLabel={t('retour_aux_produits')}
          onAction={() => router.replace('/produits')}
        />
      </Screen>
    );
  }

  // Liste de tous les achats enregistrés pour cet article, triés chronologiquement
  const list = productPurchases(db, product.id);
  // Récupération du ticket de caisse le plus récent
  const last = list[list.length - 1];
  // Recherche du ticket de caisse précédent avec la même unité pour un comparatif rigoureux
  const prev = last
    ? [...list].reverse().find((p) => p !== last && p.unit === last.unit)
    : undefined;
  // Calcul du différentiel et du pourcentage d'inflation/économie
  const change =
    last && prev ? priceChange(unitOf(prev), unitOf(last)) : null;
  const unit = last?.unit ?? product.unit;

  // Préparation des 6 derniers points chronologiques pour tracer la courbe SVG
  const series = list
    .filter((p) => p.unit === unit)
    .slice(-6)
    .map((p) => ({
      label: monthShort(parseISO(p.date).getUTCMonth()),
      value: unitOf(p),
    }));

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={product.name} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('details_du_produit')}
      </Eyebrow>

      {/* Carte d'identité visuelle du produit avec photo ou vignette */}
      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radius.card,
          padding: 16,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: 14,
          alignItems: 'center',
        }}
      >
        {/* Vignette carrée de 72px avec photo ou première lettre */}
        <ProductThumb name={product.name} uri={product.photo} size={72} />
        
        {/* Détails textuels : catégorie, nom complet et unité par défaut */}
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: colors.muted,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {product.name.toUpperCase()}
          </Text>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '600',
              color: colors.forest,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {product.brand || product.name}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.muted,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {categoryName(db, product.categoryId)} · {product.unit}
          </Text>
        </View>
      </View>

      {/* Rendu des statistiques de prix si l'article a déjà été acheté au moins une fois */}
      {last ? (
        <>
          {/* Ligne 1 : Dernier prix unitaire calculé */}
          <InfoRow
            label={t('dernier_prix_unitaire')}
            value={`${dt(unitOf(last))} DT / ${last.unit}`}
          />
          {/* Ligne 2 : Date du dernier achat relevé */}
          <InfoRow
            label={t('dernier_achat_label')}
            value={fmtDate(last.date)}
          />
          {/* Ligne 3 : Enseigne du dernier passage en caisse */}
          <InfoRow label={t('magasin_label')} value={last.store || '—'} />
          
          {/* Pastille visuelle : flèche rouge si le prix a augmenté, verte s'il a baissé */}
          <PriceIndicator change={change} unitLabel={last.unit} />

          {/* Graphique SVG d'évolution du prix unitaire */}
          <PriceChart
            title={t('evolution_du_prix')}
            unit={`DT / ${last.unit}`}
            points={series}
          />
        </>
      ) : (
        // Illustration accueillante si aucun achat n'a encore été enregistré pour cet article
        <EmptyState
          icon="pricetag-outline"
          title={t('aucun_achat_enregistre')}
          detail={t('premier_achat_explication')}
        />
      )}

      {/* Bouton vert forêt : ouvre l'historique complet de tous les tickets de cet article */}
      <Button
        label={t('historique_achats_btn')}
        onPress={() =>
          router.push({
            pathname: '/produit/historique',
            params: { id: product.id },
          } as never)
        }
        disabled={!last}
      />

      {/* Bouton secondaire clair : ouvre directement le formulaire pour ajouter un achat de ce produit */}
      <Button
        label={t('ajouter_un_achat')}
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/nouvel-achat',
            params: { productId: product.id },
          } as never)
        }
      />

      {/* Bouton secondaire clair : permet de modifier le nom, la photo ou la marque du produit */}
      <Button
        label={t('modifier_le_produit')}
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/modifier-produit',
            params: { id: product.id },
          } as never)
        }
      />
    </Screen>
  );
}
