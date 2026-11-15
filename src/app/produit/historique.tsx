/**
 * FICHIER : src/app/produit/historique.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-015
 * ÉCRAN : ECRAN-PROD-02 (Historique Chronologique des Achats d'un Produit)
 *
 * MISSION DU FICHIER :
 * Présenter à l'utilisateur le grand livre complet de tous les achats enregistrés pour un produit :
 * 1. Affiche l'intitulé du produit, sa marque et son unité de référence en surtitre.
 * 2. Calcule le nombre total de passages en caisse et le montant global dépensé en DT pour cet article.
 * 3. Rendu chronologique inversé (du plus récent au plus ancien) de chaque ticket de caisse :
 *    date formatée, magasin où il a été acheté, quantité, prix unitaire calculé et total payé.
 * 4. Chaque ligne d'achat est interactive et tactile : un appui dessus ouvre l'écran de modification (`/modifier-achat`).
 * 5. Trace la courbe vectorielle `PriceChart` de l'évolution du prix unitaire.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il permet à l'utilisateur de constater la trajectoire d'inflation sur un produit précis au fil des mois
 * et de comparer les enseignes (ex: voir si le pack de lait était moins cher chez Monoprix ou chez Carrefour).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre 'Historique des achats' et flèche de retour arrière.
 * - Le surtitre 'NOM PRODUIT · MARQUE · QUANTITÉ'.
 * - Une ligne d'information récapitulative 'X achats · Total dépensé en DT'.
 * - Si aucun achat : illustration d'état vide avec bouton 'Ajouter un achat'.
 * - Sinon : liste scrollable de cartes de transactions `TransactionRow` détaillant le magasin, la quantité et le prix au litre/kilo.
 * - Le graphique SVG de la courbe des prix unitaires.
 * - Un bouton vert 'Modifier le dernier achat'.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
// Composants de cartes pour lignes d'information et rangées de transaction
import { InfoRow, TransactionRow } from '@/components/Cards';
// Composant de tracé vectoriel du graphique des prix
import { PriceChart } from '@/components/PriceChart';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Button, EmptyState, Eyebrow, SectionTitle } from '@/components/ui';
// Sélecteurs de données SQLite (achats d'un produit, calcul de prix unitaire)
import { productPurchases, unitOf } from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul monétaire et de dates tunisiennes
import { dt, fmtDate, money, monthShort, parseISO } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran du journal historique des achats d'un produit spécifique.
 *
 * RÔLE DANS L'APPLICATION :
 * Extrait toutes les lignes de la table SQLite `purchases` liées au `productId` et calcule la somme globale dépensée.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec le récapitulatif financier, la liste des tickets de caisse et la courbe SVG.
 */
export default function PurchaseHistoryScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction de l'ID du produit depuis les paramètres d'URL
  const { id } = useLocalSearchParams<{ id: string }>();
  // Extraction des données SQLite
  const { db } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Recherche de l'article dans la base SQLite
  const product = db.products.find((p) => p.id === id);
  // Extraction de la liste de tous ses achats ordonnés
  const list = product ? productPurchases(db, product.id) : [];

  // Sécurité : si l'article est introuvable
  if (!product) {
    return (
      <Screen title={t('historique_prix')} back>
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

  // Préparation des 6 derniers relevés pour le graphique SVG
  const series = list
    .filter((p) => p.unit === unit)
    .slice(-6)
    .map((p) => ({
      label: monthShort(parseISO(p.date).getUTCMonth()),
      value: unitOf(p),
    }));

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('historique_prix')} back>
      {/* Surtitre affichant le nom, la marque et le format du produit */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {[product.name, product.brand, last ? `${last.quantity} ${last.unit}` : '']
          .filter(Boolean)
          .join(' · ')
          .toUpperCase()}
      </Eyebrow>

      {/* Titre descriptif invitant à visualiser l'historique complet */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('votre_historique_prix')}
      </SectionTitle>

      {/* Ligne récapitulative : nombre de fois acheté et total cumulé en Dinars Tunisiens */}
      <InfoRow
        label={`${list.length} ${list.length === 1 ? t('achat') : t('achats')}`}
        value={money(total)}
      />

      {/* Rendu de la liste chronologique ou état vide si aucun achat */}
      {list.length === 0 ? (
        <EmptyState
          icon="receipt-outline"
          title={t('aucun_achat_enregistre')}
          actionLabel={t('ajouter_un_achat')}
          onAction={() =>
            router.push({
              pathname: '/nouvel-achat',
              params: { productId: product.id },
            } as never)
          }
        />
      ) : (
        // Rendu inversé (du plus récent au plus ancien) des tickets de caisse
        [...list].reverse().map((p) => (
          <TransactionRow
            key={p.id}
            title={fmtDate(p.date)}
            detail={`${p.store || '—'} · ${p.quantity} ${p.unit} · ${dt(unitOf(p))} DT / ${p.unit}`}
            amount={`−${dt(p.price)} DT`}
            // Touche tactile : ouvre l'écran d'édition de cet achat précis
            onPress={() =>
              router.push({
                pathname: '/modifier-achat',
                params: { id: p.id },
              } as never)
            }
          />
        ))
      )}

      {/* Graphique vectoriel SVG d'évolution du prix unitaire */}
      {list.length > 0 && (
        <PriceChart
          title={`${t('evolution_du_prix')} · DT / ${unit}`}
          unit={`DT / ${unit}`}
          points={series}
        />
      )}

      {/* Bouton vert forêt : raccourci pour éditer directement le dernier passage en caisse */}
      <Button
        label={t('modifier_achat_btn')}
        onPress={() =>
          last &&
          router.push({
            pathname: '/modifier-achat',
            params: { id: last.id },
          } as never)
        }
        disabled={!last}
      />
    </Screen>
  );
}
