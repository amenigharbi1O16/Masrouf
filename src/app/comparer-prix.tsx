/**
 * FICHIER : src/app/comparer-prix.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-018
 * ÉCRAN : ECRAN-FORM-04 (Comparateur de Prix Avant Confirmation)
 *
 * MISSION DU FICHIER :
 * Analyser le prix du produit avant de valider définitivement l'achat dans SQLite :
 * 1. Calcule automatiquement le nouveau prix unitaire au litre/kg/pièce (`prix / quantité`).
 * 2. Interroge la table `purchases` pour retrouver le dernier achat du même produit avec la même unité.
 * 3. Calcule la variation de prix (delta monétaire en DT et pourcentage d'inflation/économie).
 * 4. Trace la courbe d'évolution des prix sur les 6 derniers passages en caisse via `PriceChart`.
 * 5. Simule l'impact immédiat sur l'enveloppe budgétaire de la catégorie (ex: 'Alimentation : 345 DT / 400 DT').
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il transforme Masrouf d'un simple carnet passif en un véritable conseiller d'achat intelligent.
 * L'utilisateur voit immédiatement s'il fait une bonne affaire ou s'il subit une hausse de prix abusive du magasin.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit 'Comparer le prix' et flèche retour.
 * - Le surtitre 'AVANT DE CONFIRMER L'ACHAT'.
 * - La carte du produit affichant son nom, sa catégorie et le nouveau prix unitaire calculé.
 * - Deux lignes comparatives : 'Prix unitaire précédent' (ex: 1.450 DT / l) et 'Nouveau prix unitaire' (ex: 1.600 DT / l).
 * - Une pastille visuelle `PriceIndicator` verte (économie avec flèche vers le bas) ou rouge corail (inflation avec flèche vers le haut).
 * - La date et l'enseigne du précédent achat (ex: 'Monoprix · 02/11/2026').
 * - Le graphique vectoriel SVG `PriceChart` montrant la courbe d'évolution du prix au fil des mois.
 * - Une ligne de simulation budgétaire affichant la consommation de l'enveloppe (rouge si dépassement).
 * - Un grand bouton vert 'Confirmer et enregistrer l'achat'.
 * - Un bouton secondaire clair 'Modifier l'achat' pour corriger une erreur de saisie.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
// Composants de cartes pour affichage synthétique et fiche produit
import { InfoRow, ProductCard } from '@/components/Cards';
// Composant de tracé vectoriel du graphique d'évolution des prix
import { PriceChart } from '@/components/PriceChart';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import {
  AlertBanner,
  Button,
  EmptyState,
  Eyebrow,
  PriceIndicator,
} from '@/components/ui';
// Sélecteurs de calcul financier SQLite (historique produit, dernier achat, simulation)
import {
  categoryName,
  currentBudget,
  previousPurchase,
  priceChange,
  productPurchases,
  spentByCategory,
  unitOf,
} from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul et formatage monétaire tunisien
import {
  dt,
  fmtDate,
  money,
  monthShort,
  parseISO,
  short,
  unitPrice,
} from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran d'analyse comparative de prix avant confirmation en base de données.
 *
 * RÔLE DANS L'APPLICATION :
 * Récupère les paramètres de l'achat saisis à l'écran précédent, interroge l'historique SQLite
 * et effectue les calculs de variation monétaire et de pourcentage d'inflation.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue comparative complète avec la carte produit, la pastille d'inflation, le graphique SVG et le bouton vert de confirmation.
 */
export default function ComparePriceScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Récupération des paramètres de l'achat transmis depuis le formulaire
  const q = useLocalSearchParams<{
    productId: string;
    price: string;
    quantity: string;
    unit: string;
    store: string;
    date: string;
    purchaseId?: string;
  }>();
  // Extraction des données de la base, de l'utilisateur connecté et des actions
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Recherche de l'article dans le catalogue SQLite
  const product = db.products.find((p) => p.id === q.productId);
  const price = Number(q.price);
  const quantity = Number(q.quantity);

  // Sécurité : si l'une des données requises est corrompue ou manquante
  if (!product || !me || !Number.isFinite(price) || !(quantity > 0)) {
    return (
      <Screen title={t('comparaison_prix_titre')} back>
        <EmptyState
          title={t('rien_a_comparer')}
          actionLabel={t('retour')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  // Identifiant si l'achat est en cours de modification plutôt que de création
  const editingId = q.purchaseId;
  // Calcul mathématique du nouveau prix unitaire strict au millime près : prix_total / quantité
  const newUnit = unitPrice(price, quantity);
  // Recherche du dernier achat de référence enregistré dans SQLite pour cet article avec la même unité
  const prev = previousPurchase(db, product.id, q.date, q.unit, editingId);
  // Calcul de la variation relative : ((nouveau - ancien) / ancien) * 100
  const change = prev ? priceChange(unitOf(prev), newUnit) : null;
  // Détection si l'utilisateur a changé d'unité par rapport aux achats passés (ex: acheté en pack au lieu de litre)
  const mismatch =
    productPurchases(db, product.id).some(
      (p) => p.id !== editingId && p.unit !== q.unit
    ) && !prev;

  // Préparation de la série de données historiques pour le tracé de la courbe SVG
  const history = productPurchases(db, product.id)
    .filter((p) => p.id !== editingId && p.unit === q.unit)
    .map((p) => ({ date: p.date, v: unitOf(p) }));

  // Tri chronologique des 6 derniers points pour une courbe lisible
  const series = [...history, { date: q.date, v: newUnit }]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(-6)
    .map((p) => ({
      label: monthShort(parseISO(p.date).getUTCMonth()),
      value: p.v,
    }));

  // Simulation de l'impact de cet achat sur le budget actif
  const budget = currentBudget(db, me.id);
  const catId = product.categoryId;
  const inBudget = !!budget && q.date >= budget.start && q.date <= budget.end;
  const spentAfter = budget
    ? (spentByCategory(db, me.id, budget.start, budget.end, editingId)[catId] ??
        0) + (inBudget ? price : 0)
    : 0;
  const alloc = budget?.allocations[catId] ?? 0;

  /**
   * MISSION DE LA FONCTION :
   * Confirmer et enregistrer définitivement l'achat dans la table SQLite 'purchases'.
   *
   * RÔLE DANS L'APPLICATION :
   * Déclenche l'écriture SQL, recalcule le total de l'enveloppe budgétaire,
   * crédite les points de gamification et redirige vers l'écran récapitulatif `/confirmation`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Valide l'opération et bascule instantanément vers l'écran de félicitations.
   */
  const confirm = () => {
    const values = {
      productId: product.id,
      price,
      quantity,
      unit: q.unit,
      store: q.store ?? '',
      date: q.date,
    };
    let id = editingId;
    if (editingId) {
      // Mise à jour de l'achat existant
      actions.updatePurchase(editingId, values);
    } else {
      // Création d'un nouvel achat
      id = actions.addPurchase(values);
    }
    // Redirection vers l'écran de confirmation avec transmission des montants
    router.replace({
      pathname: '/confirmation',
      params: {
        kind: editingId ? 'update' : 'purchase',
        purchaseId: id,
        productId: product.id,
        categoryId: catId,
        amount: String(price),
      },
    } as never);
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('comparaison_prix_titre')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('avant_de_confirmer')}
      </Eyebrow>

      {/* Carte du produit affichant le nom de l'article, son rayon et le prix unitaire calculé */}
      <ProductCard
        product={product}
        categoryName={categoryName(db, catId)}
        unit={q.unit}
        latestUnitPrice={newUnit}
      />

      {/* Bannière d'avertissement jaune si l'unité est différente des achats passés */}
      {mismatch ? (
        <AlertBanner
          tone="warning"
          title={t('unite_differente')}
          detail={t('unite_differente_detail')}
        />
      ) : null}

      {/* Ligne affichant le prix unitaire du précédent achat */}
      {prev ? (
        <InfoRow
          label={t('prix_unitaire_precedent')}
          value={`${dt(unitOf(prev))} DT / ${prev.unit}`}
        />
      ) : null}

      {/* Ligne affichant le nouveau prix unitaire calculé aujourd'hui */}
      <InfoRow
        label={t('nouveau_prix_unitaire')}
        value={`${dt(newUnit)} DT / ${q.unit}`}
        tone="good"
      />

      {/* Pastille visuelle : affiche la flèche rouge d'inflation ou verte de réduction */}
      <PriceIndicator change={change} unitLabel={q.unit} />

      {/* Ligne affichant la date du dernier passage en caisse */}
      {prev ? (
        <InfoRow
          label={t('achat_precedent_label')}
          value={fmtDate(prev.date)}
        />
      ) : null}

      {/* Ligne affichant l'enseigne du précédent achat (ex: Carrefour, Monoprix) */}
      {prev ? (
        <InfoRow
          label={t('magasin_precedent_label')}
          value={prev.store || '—'}
        />
      ) : null}

      {/* Graphique vectoriel SVG traçant la courbe des prix unitaires */}
      <PriceChart
        title={t('votre_historique_prix')}
        unit={`DT / ${q.unit}`}
        points={series}
      />

      {/* Ligne récapitulative du montant total payé en caisse */}
      <InfoRow label={t('total_achat_label')} value={money(price)} />

      {/* Ligne de simulation budgétaire : montre le nouveau total consommé dans l'enveloppe */}
      {budget ? (
        <InfoRow
          label={`${categoryName(db, catId)} (${t('budget_apres_enregistrement')})`}
          value={`${short(spentAfter)} / ${short(alloc)} DT`}
          tone={spentAfter > alloc && alloc > 0 ? 'danger' : undefined}
        />
      ) : (
        <AlertBanner
          tone="info"
          title={t('aucun_budget_actif')}
          detail={t('sauvegarde_sans_budget')}
        />
      )}

      {/* Bouton vert forêt : confirmation finale et écriture dans SQLite */}
      <Button label={t('confirmer_achat_btn')} onPress={confirm} />

      {/* Bouton secondaire clair : permet de retourner corriger le prix ou la quantité */}
      <Button
        label={t('modifier_achat_btn')}
        variant="secondary"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
