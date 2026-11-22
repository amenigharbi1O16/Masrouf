/**
 * FICHIER : src/app/produit/historique.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-015
 * ÉCRAN : ECRAN-PROD-02 (Historique Chronologique des Achats d'un Produit)
 *
 * MISSION DU FICHIER :
 * Présenter à l'utilisateur le grand livre complet de tous les achats enregistrés pour un produit :
 * 1. Affiche le surtitre 'NOM DU PRODUIT · Marque · Format'.
 * 2. Grand titre de section 'Chaque prix, en mémoire.'.
 * 3. Ligne récapitulative : nombre d'achats à gauche (ex: "4 achats"), total dépensé à droite (ex: "57.500 DT").
 * 4. Liste chronologique inversée des cartes d'achats (date en gras, magasin et quantité, prix total à droite).
 *    Chaque carte ouvre l'écran de modification (`/modifier-achat`) au clic.
 * 5. Carte graphique `PriceChart` de l'évolution du prix unitaire avec repères et mois en abscisse.
 * 6. Bouton vert menthe en bas d'écran 'Modifier le dernier achat'.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Permet de retracer l'historique exact des passages en caisse et de repérer l'inflation sur un article.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - En-tête avec bouton retour et titre 'Historique des achats'.
 * - Surtitre en majuscules avec marque et format.
 * - Grand titre 'Chaque prix, en mémoire.'.
 * - Ligne récapitulative 'X achats' et total dépensé en DT.
 * - Cartes blanches des tickets de caisse avec icône sac de courses vert menthe.
 * - Graphique SVG de la courbe de prix.
 * - Bouton vert menthe 'Modifier le dernier achat'.
 */

// Outils de récupération des paramètres d'URL et navigation Expo Router
import { useLocalSearchParams, useRouter } from 'expo-router';
// Importation de React
import React from 'react';
// Composants de mise en page React Native
import { Pressable, StyleSheet, Text, View } from 'react-native';
// Icônes vectorielles Ionicons
import { Ionicons } from '@expo/vector-icons';
// Composant de tracé vectoriel du graphique des prix
import { PriceChart } from '@/components/PriceChart';
// Conteneur d'écran standardisé avec barre supérieure
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Button, EmptyState, Eyebrow } from '@/components/ui';
// Constantes de thème officielles
import { colors, radius } from '@/constants/theme';
// Sélecteurs de données SQLite (achats d'un produit, calcul de prix unitaire)
import { productPurchases, unitOf } from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul monétaire et de dates
import { fmtDateLocale, money, monthShortLocale, parseISO } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT : PurchaseHistoryScreen
 *   Gérer l'écran du journal historique des achats d'un produit spécifique.
 * RÔLE DANS L'APPLICATION :
 *   Extrait toutes les lignes de la table SQLite `purchases` liées au `productId` et calcule la somme globale dépensée.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   La vue complète avec le récapitulatif financier, la liste des tickets de caisse, la courbe SVG et le bouton d'édition.
 */
export default function PurchaseHistoryScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction de l'ID du produit depuis les paramètres d'URL
  const { id } = useLocalSearchParams<{ id: string }>();
  // Extraction des données SQLite et de la période active
  const { db, selectedBudget } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL, langue } = useTranslation();

  // Vérification de la présence d'une période sélectionnée avec budget alloué
  const hasBudget = Boolean(selectedBudget && Number(selectedBudget.total) > 0);

  // Recherche de l'article dans la base SQLite
  const product = db.products.find((p) => p.id === id);
  // Extraction de la liste de tous ses achats ordonnés
  const list = product ? productPurchases(db, product.id) : [];

  // Sécurité : si l'article est introuvable
  if (!product) {
    return (
      <Screen title={t('historique_achats_btn')} back>
        <EmptyState
          title={t('produit_non_trouve')}
          actionLabel={t('retour_aux_produits')}
          onAction={() => router.replace('/produits')}
        />
      </Screen>
    );
  }

  // Dernier achat enregistré
  const last = list[list.length - 1];
  // Calcul de la somme totale dépensée sur ce produit depuis le premier jour
  const total = list.reduce((a, p) => a + p.price, 0);
  // Unité de référence
  const unit = last?.unit ?? product.unit;

  // Préparation des points chronologiques pour le graphique SVG
  const series = list
    .filter((p) => p.unit === unit)
    .slice(-6)
    .map((p) => ({
      label: monthShortLocale(parseISO(p.date).getUTCMonth(), langue),
      value: unitOf(p),
    }));

  // Libellé de surtitre combinant nom du produit, marque et format
  const eyebrowText = [
    product.name.toUpperCase(),
    product.brand,
    last
      ? `${last.quantity}${last.unit ? ' ' + last.unit : ''}`
      : (product.unit || ''),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    // Conteneur Screen avec flèche de retour et titre
    <Screen title={t('historique_achats_btn')} back>
      {/* Surtitre affichant le nom, la marque et le format du produit */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {eyebrowText}
      </Eyebrow>

      {/* Titre principal de la page : 'Chaque prix, en mémoire.' */}
      <Text
        style={[
          styles.mainHeadline,
          { textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {t('chaque_prix_en_memoire')}
      </Text>

      {/* Ligne récapitulative : nombre d'achats à gauche, total dépensé à droite */}
      <View
        style={[
          styles.subRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {/* Compteur d'achats */}
        <Text style={styles.countText}>
          {list.length} {list.length === 1 ? t('achat') : t('achats')}
        </Text>
        {/* Montant total cumulé en DT */}
        <Text style={styles.totalText}>
          {money(total)}
        </Text>
      </View>

      {/* Rendu de la liste chronologique ou état vide si aucun achat */}
      {list.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={t('aucun_achat_enregistre')}
          detail={hasBudget ? undefined : t('selectionner_periode_et_budget_detail')}
          actionLabel={hasBudget ? t('ajouter_un_achat') : t('definir_periode_budget')}
          onAction={() =>
            router.push(
              hasBudget
                ? ({
                    pathname: '/nouvel-achat',
                    params: { productId: product.id },
                  } as never)
                : '/budget-mois'
            )
          }
        />
      ) : (
        // Rendu chronologique inversé (du plus récent au plus ancien) des tickets de caisse
        [...list].reverse().map((p) => (
          <Pressable
            key={p.id}
            onPress={() =>
              router.push({
                pathname: '/modifier-achat',
                params: { id: p.id },
              } as never)
            }
            accessibilityRole="button"
            style={[
              styles.purchaseCard,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {/* Carré vert menthe avec icône sac de courses */}
            <View style={styles.iconTile}>
              <Ionicons name="bag-outline" size={22} color={colors.forest} />
            </View>

            {/* Détails textuels de l'achat */}
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              {/* Date du passage en caisse en gras */}
              <Text style={styles.purchaseDate}>
                {fmtDateLocale(p.date, langue)}
              </Text>
              {/* Enseigne et quantité achetée */}
              <Text style={styles.purchaseDetail}>
                {p.store || '—'} · {p.quantity}{p.unit ? ' ' + p.unit : ''}
              </Text>
            </View>

            {/* Prix total payé pour cet achat */}
            <Text style={styles.purchaseAmount}>
              {money(p.price)}
            </Text>
          </Pressable>
        ))
      )}

      {/* Graphique vectoriel SVG d'évolution du prix unitaire */}
      {list.length > 0 && (
        <PriceChart
          title={unit ? `${t('prix_unitaire')} · DT / ${unit}` : `${t('prix_unitaire')} · DT`}
          unit={unit ? `DT / ${unit}` : 'DT'}
          points={series}
        />
      )}

      {/* Bouton d'action vert menthe : Modifier le dernier achat */}
      <Button
        label={t('modifier_dernier_achat')}
        variant="secondary"
        onPress={() =>
          last &&
          router.push({
            pathname: '/modifier-achat',
            params: { id: last.id },
          } as never)
        }
        disabled={!last}
      />

      {/* Espace bas de sécurité pour le défilement */}
      <View style={{ height: 16 }} />
    </Screen>
  );
}

// Feuilles de styles StyleSheet de l'historique
const styles = StyleSheet.create({
  // Titre principal de la page
  mainHeadline: {
    // Taille généreuse 22px
    fontSize: 22,
    // Graisse très affirmée 700
    fontWeight: '700',
    // Couleur vert forêt officielle
    color: colors.forest,
    // Marge basse
    marginBottom: 2,
  },
  // Ligne récapitulative des totaux
  subRow: {
    // Justification aux deux extrémités
    justifyContent: 'space-between',
    // Alignement vertical centré
    alignItems: 'center',
    // Marge verticale
    marginVertical: 4,
  },
  // Compteur d'achats
  countText: {
    // Taille 13px
    fontSize: 13,
    // Couleur atténuée vert grisé
    color: colors.muted,
    // Graisse moyenne 500
    fontWeight: '500',
  },
  // Somme totale dépensée
  totalText: {
    // Taille 14px
    fontSize: 14,
    // Graisse semi-grasse 600
    fontWeight: '600',
    // Couleur vert forêt
    color: colors.forest,
  },
  // Carte blanche d'un ticket de caisse
  purchaseCard: {
    // Fond blanc
    backgroundColor: colors.white,
    // Coins arrondis de 16px
    borderRadius: radius.card,
    // Espacement intérieur horizontal et vertical
    padding: 14,
    // Alignement vertical des éléments
    alignItems: 'center',
    // Espacement horizontal entre les blocs
    gap: 12,
    // Hauteur minimale pour un confort tactile optimal
    minHeight: 70,
  },
  // Tuile carrée vert menthe pour l'icône
  iconTile: {
    // Largeur de 44px
    width: 44,
    // Hauteur de 44px
    height: 44,
    // Angles arrondis de 14px
    borderRadius: 14,
    // Fond vert menthe doux
    backgroundColor: colors.mint,
    // Centrage de l'icône
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Date du passage en caisse
  purchaseDate: {
    // Taille 14px
    fontSize: 14,
    // Graisse très affirmée 700
    fontWeight: '700',
    // Couleur vert forêt sombre
    color: colors.forest,
  },
  // Enseigne et quantité
  purchaseDetail: {
    // Taille 12px
    fontSize: 12,
    // Couleur vert grisé doux
    color: colors.muted,
    // Marge supérieure
    marginTop: 2,
  },
  // Montant total en DT
  purchaseAmount: {
    // Taille 15px
    fontSize: 15,
    // Graisse très affirmée 700
    fontWeight: '700',
    // Couleur vert forêt sombre
    color: colors.forest,
  },
});
