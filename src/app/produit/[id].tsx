/**
 * FICHIER : src/app/produit/[id].tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-031
 * ÉCRAN : ECRAN-PROD-01 (Fiche Détails d'un Produit et Suivi des Prix Unitaires)
 *
 * MISSION DU FICHIER :
 * Présenter l'observatoire complet des prix et l'identité d'un article d'épicerie :
 * 1. Carte Hero vert menthe affichant le nom du produit en capitales, la marque en très grand (30px) et la ligne "Catégorie · Emballage · Unité".
 * 2. Lignes d'informations synthétiques : Dernier prix unitaire, Dernier achat, Magasin.
 * 3. Carte de variation du prix vert menthe avec icône de tendance et écart chiffré (ex: "−0.500 DT / −3.3%").
 * 4. Graphique linéaire vectoriel `PriceChart` traçant l'évolution temporelle avec les mois en abscisse.
 * 5. Trois boutons d'action conformes au design : 'Voir l'historique des achats' (menthe), '+ Ajouter un achat' (vert forêt) et 'Modifier le produit' (menthe).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il permet à l'utilisateur de constater l'évolution de ses prix en magasin et de savoir si un produit est plus cher ou moins cher qu'auparavant.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - En-tête avec nom de l'article et bouton de retour.
 * - Surtitre 'DÉTAILS DU PRODUIT'.
 * - Grande carte Hero vert menthe `#D9F0E4`.
 * - Liste des détails : Dernier prix unitaire, Dernier achat, Magasin.
 * - Carte de variation avec flèche de tendance et pourcentage.
 * - Carte blanche 'Évolution du prix' avec courbe SVG et mois.
 * - Les 3 boutons verticaux d'action.
 */

// Outils d'extraction de paramètres d'URL et de navigation Expo Router
import { useLocalSearchParams, useRouter } from 'expo-router';
// Importation de React
import React from 'react';
// Composants visuels et de mise en page React Native
import { StyleSheet, Text, View } from 'react-native';
// Icônes vectorielles Ionicons
import { Ionicons } from '@expo/vector-icons';
// Ligne d'information synthétique clé/valeur
import { InfoRow } from '@/components/Cards';
// Graphique vectoriel SVG d'évolution des prix
import { PriceChart } from '@/components/PriceChart';
// Conteneur d'écran avec retour arrière et marges
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, EmptyState, Eyebrow } from '@/components/ui';
// Constantes de thème officielles
import { colors, radius } from '@/constants/theme';
// Sélecteurs de calcul financier SQLite
import {
  categoryName,
  priceChange,
  productPurchases,
  unitOf,
} from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul monétaire et de dates
import { dt, fmtDateLocale, monthShortLocale, parseISO } from '@/utils/format';
// Système d'internationalisation et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT : ProductDetailsScreen
 *   Gérer l'écran de la fiche détaillée d'un article et son suivi de prix unitaire.
 * RÔLE DANS L'APPLICATION :
 *   Charge les données de l'article depuis SQLite via son ID dynamique (`/produit/[id]`),
 *   calcule les variations de prix et affiche la courbe temporelle.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   La carte d'identité Hero menthe, les statistiques de prix, la variation d'inflation, la courbe et les 3 boutons.
 */
export default function ProductDetailsScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction de l'ID du produit depuis l'URL dynamique
  const { id } = useLocalSearchParams<{ id: string }>();
  // Extraction des données de la base SQLite et de la période active
  const { db, selectedBudget } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL, langue, traduireCategorie } = useTranslation();

  // Vérification de la présence d'une période sélectionnée avec budget alloué
  const hasBudget = Boolean(selectedBudget && Number(selectedBudget.total) > 0);

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
  const change = last && prev ? priceChange(unitOf(prev), unitOf(last)) : null;
  // Unité physique active
  const unit = last?.unit ?? product.unit;

  // Préparation des points chronologiques pour tracer la courbe SVG
  const series = list
    .filter((p) => p.unit === unit)
    .slice(-6)
    .map((p) => ({
      label: monthShortLocale(parseISO(p.date).getUTCMonth(), langue),
      value: unitOf(p),
    }));

  // Libellé de conditionnement (ex: Bouteille si litre)
  const packaging = product.unit === 'L' ? t('bouteille_label') : undefined;
  // Nom traduit de la catégorie de produit
  const catNom = traduireCategorie(categoryName(db, product.categoryId));
  // Sous-ligne Hero combinant catégorie, emballage et unité
  const heroSubLine = [
    catNom,
    packaging,
    last
      ? `${last.quantity}${last.unit ? ' ' + last.unit : ''}`
      : (product.unit ? `1 ${product.unit}` : ''),
  ]
    .filter(Boolean)
    .join('  ·  ');

  // Détermination du titre de la carte de variation de prix
  const variationTitle = !last
    ? t('premier_achat_enregistre_titre')
    : !change
    ? t('premier_achat_enregistre_titre')
    : change.direction === 'down'
    ? t('moins_cher_que_dernier_achat')
    : change.direction === 'up'
    ? t('plus_cher_que_dernier_achat')
    : t('meme_prix_que_dernier_achat');

  return (
    // Conteneur Screen avec flèche de retour
    <Screen title={product.name} back>
      {/* Surtitre discret en majuscules 'DÉTAILS DU PRODUIT' */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('details_du_produit')}
      </Eyebrow>

      {/* Carte Hero vert menthe présentant l'identité du produit */}
      <View style={styles.heroCard}>
        {/* Ligne 1 : Nom du produit en petites lettres capitales */}
        <Text
          style={[
            styles.heroEyebrow,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {product.name.toUpperCase()}
        </Text>

        {/* Ligne 2 : Marque commerciale en grand titre gras */}
        <Text
          style={[
            styles.heroBrand,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {product.brand || product.name}
        </Text>

        {/* Ligne 3 : Catégorie · Emballage · Format */}
        <Text
          style={[
            styles.heroSub,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {heroSubLine}
        </Text>
      </View>

      {/* Statistiques et observations si le produit a déjà été acheté */}
      {last ? (
        <>
          {/* Lignes d'informations synthétiques épurées */}
          <View style={styles.infoSection}>
            {/* Ligne 1 : Dernier prix unitaire */}
            <InfoRow
              plain
              label={t('dernier_prix_unitaire')}
              value={
                last.unit
                  ? `${dt(unitOf(last))} DT / ${last.unit}`
                  : `${dt(unitOf(last))} DT`
              }
            />
            {/* Ligne 2 : Date du dernier achat */}
            <InfoRow
              plain
              label={t('dernier_achat_label')}
              value={fmtDateLocale(last.date, langue)}
            />
            {/* Ligne 3 : Magasin du dernier achat */}
            <InfoRow
              plain
              label={t('magasin_label')}
              value={last.store || '—'}
            />
          </View>

          {/* Carte de variation de prix vert menthe */}
          <View style={styles.variationCard}>
            {/* Titre de statut de la variation */}
            <Text
              style={[
                styles.variationTitle,
                { textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {variationTitle}
            </Text>

            {/* Ligne affichant l'icône de tendance et les chiffres */}
            <View
              style={[
                styles.variationRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {/* Icône flèche diagonale de variation */}
              <Ionicons
                name={
                  !change || change.direction === 'same'
                    ? 'remove-outline'
                    : change.direction === 'down'
                    ? 'trending-down-outline'
                    : 'trending-up-outline'
                }
                size={26}
                color={colors.forest}
              />

              {/* Texte chiffré de l'écart en DT et en pourcentage */}
              <Text style={styles.variationValue}>
                {change
                  ? `${change.diff < 0 ? '−' : '+'}${dt(Math.abs(change.diff))} DT  /  ${change.pct < 0 ? '−' : '+'}${Math.abs(change.pct).toFixed(1)}%`
                  : `0.000 DT  /  0.0%`}
              </Text>
            </View>
          </View>

          {/* Graphique SVG d'évolution temporelle du prix */}
          <PriceChart
            title={t('evolution_du_prix')}
            unit={`DT / ${unit}`}
            points={series}
          />
        </>
      ) : (
        // Illustration accueillante si aucun ticket n'a encore été enregistré
        <EmptyState
          icon="pricetag-outline"
          title={t('aucun_achat_enregistre')}
          detail={t('premier_achat_explication')}
        />
      )}

      {/* Bouton 1 (Menthe) : Voir l'historique complet des achats */}
      <Button
        label={t('voir_historique_achats')}
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/produit/historique',
            params: { id: product.id },
          } as never)
        }
        disabled={!last}
      />

      {/* Message explicatif clair si aucune période n'est sélectionnée ou aucun budget alloué */}
      {!hasBudget && (
        <View style={{ gap: 8, marginVertical: 6 }}>
          <AlertBanner
            tone="warning"
            title={t('selectionner_periode_et_budget_dabord')}
            detail={t('selectionner_periode_et_budget_detail')}
          />
          <Button
            label={t('definir_periode_budget')}
            variant="secondary"
            onPress={() => router.push('/budget-mois')}
          />
        </View>
      )}

      {/* Bouton 2 (Vert forêt) : + Ajouter un achat pour ce produit (bloqué si aucune période et budget alloué) */}
      <Button
        label={t('ajouter_un_achat')}
        onPress={() => {
          if (!hasBudget) {
            router.push('/budget-mois');
            return;
          }
          router.push({
            pathname: '/nouvel-achat',
            params: { productId: product.id },
          } as never);
        }}
        disabled={!hasBudget}
      />

      {/* Bouton 3 (Menthe) : Modifier le produit */}
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

      {/* Espace bas de respiration */}
      <View style={{ height: 16 }} />
    </Screen>
  );
}

// Feuilles de styles StyleSheet de la fiche détaillée
const styles = StyleSheet.create({
  // Grande carte Hero vert menthe
  heroCard: {
    // Fond vert menthe officiel
    backgroundColor: colors.mint,
    // Coins arrondis de 20px
    borderRadius: 20,
    // Espacement intérieur de 20px
    padding: 20,
    // Espacement entre les lignes
    gap: 6,
  },
  // Nom du produit en majuscules discrètes
  heroEyebrow: {
    // Taille de 11px
    fontSize: 11,
    // Graisse très affirmée 700
    fontWeight: '700',
    // Espacement des lettres
    letterSpacing: 0.5,
    // Couleur vert forêt
    color: colors.forest,
  },
  // Marque commerciale en très grand titre gras
  heroBrand: {
    // Taille de police 30px
    fontSize: 30,
    // Graisse très affirmée 700
    fontWeight: '700',
    // Hauteur de ligne resserrée
    lineHeight: 38,
    // Couleur vert forêt institutionnelle
    color: colors.forest,
  },
  // Sous-ligne Hero descriptive
  heroSub: {
    // Taille de 13px
    fontSize: 13,
    // Graisse semi-grasse 500
    fontWeight: '500',
    // Couleur vert forêt
    color: colors.forest,
    // Marge haute
    marginTop: 2,
  },
  // Section des lignes clés/valeurs sans bordure lourde
  infoSection: {
    // Espacement vertical
    paddingVertical: 2,
  },
  // Carte de variation du prix
  variationCard: {
    // Fond vert menthe officiel
    backgroundColor: colors.mint,
    // Coins arrondis de 16px
    borderRadius: radius.card,
    // Espacement intérieur de 16px
    padding: 16,
    // Espacement entre les blocs
    gap: 8,
  },
  // Titre de la variation
  variationTitle: {
    // Taille de 13px
    fontSize: 13,
    // Graisse semi-grasse 600
    fontWeight: '600',
    // Couleur vert forêt
    color: colors.forest,
  },
  // Ligne de l'icône et de la valeur de variation
  variationRow: {
    // Alignement vertical centré
    alignItems: 'center',
    // Espacement entre l'icône et la valeur
    gap: 10,
  },
  // Chiffre de l'écart et pourcentage
  variationValue: {
    // Taille très lisible de 22px
    fontSize: 22,
    // Graisse très affirmée 700
    fontWeight: '700',
    // Couleur vert forêt sombre
    color: colors.forest,
  },
});
