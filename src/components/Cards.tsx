import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { dt, money, short } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import type { Product } from '@/state/types';
import { ProductThumb } from './ProductThumb';
import { getCategoryIcon } from '@/utils/categoryIcons';

/** Style de base réutilisé pour donner un fond blanc et des coins arrondis à toutes les cartes */
const card = { backgroundColor: colors.white, borderRadius: radius.card } as const;

/**
 * 🎯 COMPOSANT : BudgetCard
 * 📌 Mission : Carte principale de l'écran d'accueil présentant le résumé du budget du mois.
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - Le grand chiffre du montant restant (ex: 450,00 DT) ou le dépassement en rouge.
 *    - Le montant total alloué pour le mois.
 *    - Une barre de progression colorée (Verte si tout va bien, Jaune si >= 80%, Corail si dépassé).
 *    - Le montant déjà dépensé et le pourcentage consommé (ex: "75% consommé").
 *    - La période concernée (ex: "1 Nov 2026 - 30 Nov 2026").
 */
export function BudgetCard({ available, spent, total, pct, range, over, onPress }: {
  available: number; spent: number; total: number; pct: number; range: string; over?: number; onPress?: () => void;
}) {
  // Récupération des fonctions de traduction et de détection de l'alignement arabe (RTL)
  const { t, isRTL } = useTranslation();
  
  // Calcul de la largeur de la jauge visuelle (bridée entre 0% et 100%)
  const w = `${Math.min(100, Math.max(0, pct))}%` as `${number}%`;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.budget]} accessibilityRole={onPress ? 'button' : undefined}>
      {/* Titre : "Reste à dépenser" ou "Dépassement de budget" si le seuil est franchi */}
      <Text style={[styles.budgetLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
        {over ? t('depassement_budget') : t('reste_a_depenser')}
      </Text>

      {/* Montant mis en avant en très grande taille de police */}
      <Text style={[styles.budgetAmount, { textAlign: isRTL ? 'right' : 'left' }]}>
        {money(over ? over : available)}
      </Text>

      {/* Rappel du montant total initial du budget */}
      <Text style={[styles.budgetLine, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('budget')}  {money(total)}
      </Text>

      {/* Barre de progression horizontale avec changement dynamique de couleur */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: w, backgroundColor: over ? colors.coral : pct >= 80 ? colors.gold : colors.mint }]} />
      </View>

      {/* Ligne récapitulative : Somme dépensée à gauche, pourcentage consommé à droite */}
      <View style={[styles.rowBetween, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.spent}>{t('depense')}  {money(spent)}</Text>
        <Text style={styles.pct}>{pct.toFixed(1).replace(/\.0$/, '')}% {t('consomme')}</Text>
      </View>

      {/* Date de début et de fin du budget affichée en bas de carte */}
      <Text style={[styles.range, { textAlign: isRTL ? 'right' : 'left' }]}>{range}</Text>
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : CategoryCard
 * 📌 Mission : Afficher l'état d'une enveloppe budgétaire pour une catégorie précise (ex: Alimentation, Transport).
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - Une icône évocatrice dédiée à la catégorie (fourchette pour alimentation, voiture pour transport, etc.).
 *    - La consommation par rapport au plafond alloué (ex: "320 / 500 DT").
 *    - Une mini barre de jauge verte, virant au rouge corail en cas de dépassement.
 */
// Carte représentative d'une enveloppe catégorielle
export function CategoryCard({
  name,
  spent,
  allocation,
  icon,
  onPress,
}: {
  // Nom de la catégorie
  name: string;
  // Montant consommé en DT
  spent: number;
  // Montant total alloué en DT
  allocation: number;
  // Nom optionnel d'icône Ionicons spécifique
  icon?: keyof typeof Ionicons.glyphMap;
  // Callback de clic tactile optionnel
  onPress?: () => void;
}) {
  // Calcul du ratio de consommation pour déterminer la largeur de la jauge
  const ratio = allocation > 0 ? Math.min(1, spent / allocation) : spent > 0 ? 1 : 0;
  // Détecte si le montant dépensé dépasse le plafond prévu
  const over = spent > allocation;
  // Détermination de l'icône représentative : priorité à l'icône transmise, sinon résolution automatique selon le nom
  const iconName = icon ?? getCategoryIcon(name);

  return (
    // Carte tactile stylisée avec fond blanc et coins arrondis
    <Pressable onPress={onPress} disabled={!onPress} style={[card, { padding: 16, gap: 10 }]}>
      {/* Ligne supérieure avec icône, titre et montant */}
      <View style={styles.rowBetween}>
        {/* Nom et icône représentative de la catégorie */}
        <View style={styles.iconTitle}>
          {/* Icône Ionicons vectorielle personnalisée selon la catégorie (ex: restaurant, voiture, reçu) */}
          <Ionicons name={iconName} size={22} color={colors.green} />
          {/* Titre de la catégorie en vert forêt */}
          <Text style={styles.cardTitle}>{name}</Text>
        </View>
        {/* Montant dépensé vs montant alloué (coloré en rouge corail si dépassé) */}
        <Text style={[styles.cardSub, over && { color: colors.coral }]}>{short(spent)} / {short(allocation)} DT</Text>
      </View>
      {/* Jauge fine visuelle de la catégorie */}
      <View style={styles.trackLight}>
        {/* Barre de progression verte ou corail */}
        <View style={{ width: `${ratio * 100}%`, height: 6, borderRadius: 3, backgroundColor: over ? colors.coral : colors.green }} />
      </View>
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : TransactionRow
 * 📌 Mission : Afficher une ligne compacte de transaction récente (achat de produit ou dépense directe).
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - Un carré vert menthe avec l'icône du type d'achat (sac de courses, portefeuille).
 *    - Le titre de la transaction (ex: date en gras ou nom de l'article).
 *    - Les détails en gris (ex: magasin, unité ou note).
 *    - Le montant total débité aligné en gras à droite (ex: "14.500 DT").
 */
// Composant de ligne de transaction
export function TransactionRow({ title, detail, amount, isConfirmed, icon = 'bag-outline', onPress }: {
  title: string; detail: string; amount?: string; isConfirmed?: boolean; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void;
}) {
  // Récupération de la détection du sens d'écriture droite-à-gauche pour l'arabe
  const { isRTL } = useTranslation();

  // Rendu cliquable de la ligne de transaction
  return (
    <Pressable
      // Gestionnaire de clic
      onPress={onPress}
      // Désactivation si aucune action n'est définie
      disabled={!onPress}
      // Style avec inversion RTL si nécessaire
      style={[
        card,
        styles.txn,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      // Rôle d'accessibilité
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {/* Pastille carrée vert menthe contenant l'icône vectorielle */}
      <View style={styles.tile}>
        <Ionicons name={icon} size={22} color={colors.forest} />
      </View>
      
      {/* Intitulé et métadonnées de la transaction */}
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        {/* Titre principal */}
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
          {title}
        </Text>
        {/* Détails secondaires */}
        <Text style={[styles.txnDetail, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
          {detail}
        </Text>
      </View>

      {/* Montant de la dépense ou icône vectorielle de confirmation sans aucun emoji */}
      {isConfirmed || amount === 'confirmed' ? (
        // Rendu de l'icône vectorielle de validation verte
        <Ionicons name="checkmark-circle" size={20} color={colors.forest} />
      ) : (
        // Affichage standard du montant chiffré
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'left' : 'right' }]}>
          {amount ?? ''}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : ExpenseCard
 * 📌 Mission : Afficher une fiche de dépense globale dans la liste des dépenses avec une icône adaptée.
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - L'icône représentative du poste de dépense (voiture pour transport, reçu pour facture, etc.).
 *    - Le titre de la dépense et sa sous-catégorie / date.
 *    - Le montant de la dépense.
 */
// Composant de carte de dépense simple avec icône spécifique
export function ExpenseCard({
  title,
  detail,
  amount,
  icon,
  onPress,
}: {
  // Titre ou nom de la dépense
  title: string;
  // Détail ou date formatée
  detail: string;
  // Montant textuel formaté en DT
  amount: string;
  // Nom d'icône Ionicons spécifique optionnel
  icon?: keyof typeof Ionicons.glyphMap;
  // Action au clic
  onPress?: () => void;
}) {
  // Récupération de l'orientation RTL
  const { isRTL } = useTranslation();
  // Résolution de l'icône selon l'icône fournie ou le titre de la catégorie
  const iconName = icon ?? getCategoryIcon(title, 'expense');

  // Rendu de la carte de dépense
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[
        card,
        styles.expense,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {/* Vignette avec icône évocatrice sur fond vert menthe */}
      <View style={styles.tile}>
        {/* Rendu de l'icône adaptée (voiture, reçu, etc. au lieu du portefeuille uniforme) */}
        <Ionicons name={iconName} size={22} color={colors.forest} />
      </View>
      {/* Colonne textuelle */}
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        <Text style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.cardSub, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>{detail}</Text>
      </View>
      {/* Montant de la dépense */}
      <Text style={[styles.cardTitle, { fontSize: 13, textAlign: isRTL ? 'left' : 'right' }]}>{amount}</Text>
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : ProductCard
 * 📌 Mission : Afficher un produit dans la liste du catalogue ou des essentiels du quotidien.
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - La vignette miniature vert menthe avec l'icône du sac de courses ou la photo enregistrée.
 *    - Le nom du produit en gras vert forêt (ex: "Huile d’olive").
 *    - La sous-ligne formatée "Catégorie · Unité · Prix DT" (ex: "Alimentation · 1 L · 14.500 DT").
 */
// Composant de carte de produit
export function ProductCard({ product, categoryName, latestUnitPrice, unit, onPress }: {
  product: Product; categoryName: string; latestUnitPrice?: number; unit: string; onPress?: () => void;
}) {
  // Détection du sens de lecture RTL pour l'arabe
  const { isRTL } = useTranslation();

  // Formatage de la ligne de sous-titre combinant catégorie, unité et dernier prix en DT
  const subLine = [
    categoryName,
    unit,
    latestUnitPrice !== undefined ? `${dt(latestUnitPrice)} DT` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  // Rendu de la carte du produit
  return (
    <Pressable
      // Gestionnaire de navigation vers la fiche détaillée du produit
      onPress={onPress}
      // Désactivation si non interactive
      disabled={!onPress}
      // Style avec gestion de l'alignement RTL
      style={[
        card,
        styles.product,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
      // Déclaration d'accessibilité
      accessibilityRole={onPress ? 'button' : undefined}
    >
      {/* Vignette miniature carrée vert menthe avec icône sac de courses */}
      <ProductThumb name={product.name} uri={product.photo} size={48} />

      {/* Bloc descriptif du produit */}
      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
        {/* Nom de l'article en gras vert forêt */}
        <Text
          style={[styles.cardTitle, { textAlign: isRTL ? 'right' : 'left' }]}
          numberOfLines={1}
        >
          {product.name}
        </Text>
        {/* Sous-ligne complète : Catégorie · Unité · Prix en DT */}
        <Text
          style={[styles.cardSub, { textAlign: isRTL ? 'right' : 'left' }]}
          numberOfLines={1}
        >
          {subLine}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : InfoRow
 * 📌 Mission : Afficher une ligne d'information clé/valeur (ex: "Dernier prix : 14.500 DT / L", "Magasin : Monoprix").
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - Le label descriptif en vert grisé à gauche (ou à droite en arabe).
 *    - La valeur mise en valeur en vert forêt à droite (ou à gauche en arabe).
 */
// Composant de ligne clé/valeur
export function InfoRow({ label, value, tone, plain = false }: {
  label: string; value: string; tone?: 'danger' | 'good'; plain?: boolean;
}) {
  // Détection du sens d'écriture
  const { isRTL } = useTranslation();

  // Rendu de la ligne
  return (
    <View
      style={[
        plain ? styles.infoPlain : [card, styles.info],
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      {/* Label descriptif */}
      <Text style={[styles.cardSub, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      {/* Valeur mise en évidence */}
      <Text
        style={[
          styles.cardTitle,
          { textAlign: isRTL ? 'left' : 'right' },
          tone === 'danger' && { color: colors.coral },
          tone === 'good' && { color: colors.green },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

/** Feuilles de styles géométriques et typographiques */
const styles = StyleSheet.create({
  budget: { backgroundColor: colors.forest, borderRadius: radius.card, padding: 20, gap: 6 },
  budgetLabel: { color: colors.mint, fontSize: 11, fontWeight: '500' },
  budgetAmount: { color: colors.white, fontSize: 34, lineHeight: 46, fontWeight: '600' },
  budgetLine: { color: colors.mint, fontSize: 13 },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.track, marginTop: 8, overflow: 'hidden' },
  fill: { height: 7, borderRadius: 4 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  spent: { color: colors.white, fontSize: 13, fontWeight: '500' },
  pct: { color: colors.mint, fontSize: 12 },
  range: { color: colors.mint, fontSize: 10, fontWeight: '500', marginTop: 8 },
  iconTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  cardTitle: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.forest },
  cardSub: { fontSize: 12, lineHeight: 17, fontWeight: '500', color: colors.muted },
  trackLight: { height: 6, borderRadius: 3, backgroundColor: colors.border },
  txn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 72 },
  tile: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  txnDetail: { fontSize: 11, lineHeight: 16, color: colors.muted },
  expense: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, minHeight: 80 },
  product: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, minHeight: 72 },
  info: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  infoPlain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4, gap: 12 },
});
