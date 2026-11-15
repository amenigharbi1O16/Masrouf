import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { dt, money, short } from '@/utils/format';
import { useTranslation } from '@/utils/i18n';
import type { Product } from '@/state/types';
import { ProductThumb } from './ProductThumb';

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
 *    - Une icône de portefeuille avec le nom de la catégorie.
 *    - La consommation par rapport au plafond alloué (ex: "120 / 300 DT").
 *    - Une mini barre de jauge verte, virant au rouge corail en cas de dépassement.
 */
export function CategoryCard({ name, spent, allocation, onPress }: { name: string; spent: number; allocation: number; onPress?: () => void }) {
  // Calcul du ratio de consommation pour déterminer la largeur de la jauge
  const ratio = allocation > 0 ? Math.min(1, spent / allocation) : spent > 0 ? 1 : 0;
  // Détecte si le montant dépensé dépasse le plafond prévu
  const over = spent > allocation;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[card, { padding: 16, gap: 10 }]}>
      <View style={styles.rowBetween}>
        {/* Nom et icône de la catégorie */}
        <View style={styles.iconTitle}>
          <Ionicons name="wallet-outline" size={22} color={colors.green} />
          <Text style={styles.cardTitle}>{name}</Text>
        </View>
        {/* Montant dépensé vs montant alloué (coloré en rouge corail si dépassé) */}
        <Text style={[styles.cardSub, over && { color: colors.coral }]}>{short(spent)} / {short(allocation)} DT</Text>
      </View>
      {/* Jauge fine visuelle de la catégorie */}
      <View style={styles.trackLight}>
        <View style={{ width: `${ratio * 100}%`, height: 6, borderRadius: 3, backgroundColor: over ? colors.coral : colors.green }} />
      </View>
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : TransactionRow
 * 📌 Mission : Afficher une ligne compacte de transaction récente (achat ou dépense).
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - Un carré coloré contenant l'icône du type d'achat (sac de courses, portefeuille, etc.).
 *    - Le titre de la transaction (ex: "Courses Carrefour").
 *    - Les détails en gris (ex: "3 articles · 14 Nov").
 *    - Le montant total débité aligné à droite (ex: "42,50 DT").
 */
export function TransactionRow({ title, detail, amount, icon = 'bag-outline', onPress }: {
  title: string; detail: string; amount: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[card, styles.txn]} accessibilityRole={onPress ? 'button' : undefined}>
      {/* Pastille carrée contenant l'icône vectorielle */}
      <View style={styles.tile}><Ionicons name={icon} size={22} color={colors.green} /></View>
      
      {/* Intitulé et métadonnées de la transaction */}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.txnDetail} numberOfLines={1}>{detail}</Text>
      </View>

      {/* Montant de la dépense affiché à droite */}
      <Text style={styles.cardTitle}>{amount}</Text>
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : ExpenseCard
 * 📌 Mission : Afficher une fiche de dépense globale dans la liste des dépenses.
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - L'icône de portefeuille verte.
 *    - Le titre de la dépense et sa sous-catégorie / date.
 *    - Le montant de la dépense.
 */
export function ExpenseCard({ title, detail, amount, onPress }: { title: string; detail: string; amount: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[card, styles.expense]} accessibilityRole={onPress ? 'button' : undefined}>
      <Ionicons name="wallet-outline" size={22} color={colors.green} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{detail}</Text>
      </View>
      <Text style={[styles.cardTitle, { fontSize: 13 }]}>{amount}</Text>
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : ProductCard
 * 📌 Mission : Afficher un produit dans la liste du comparateur de prix ou du catalogue.
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - La photo miniature du produit (ou son icône de secours).
 *    - Le nom du produit et sa marque / catégorie.
 *    - Le dernier prix unitaire constaté et son unité (ex: "3,200 DT / kg").
 */
export function ProductCard({ product, categoryName, latestUnitPrice, unit, onPress }: {
  product: Product; categoryName: string; latestUnitPrice?: number; unit: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[card, styles.product]} accessibilityRole={onPress ? 'button' : undefined}>
      {/* Vignette miniature de la photo du produit */}
      <ProductThumb name={product.name} uri={product.photo} />

      {/* Libellé du produit, marque et catégorie associée */}
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.cardSub} numberOfLines={1}>{[product.brand, categoryName].filter(Boolean).join(' · ')}</Text>
      </View>

      {/* Bloc prix unitaire et unité (ex: DT / L ou DT / kg) */}
      {latestUnitPrice !== undefined ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.cardTitle}>{dt(latestUnitPrice)}</Text>
          <Text style={styles.cardSub}>DT / {unit}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * 🎯 COMPOSANT : InfoRow
 * 📌 Mission : Afficher une ligne d'information clé/valeur (ex: "Dernier prix : 2,500 DT", "Magasin : Monoprix").
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - Le label descriptif en gris clair à gauche.
 *    - La valeur mise en valeur à droite (qui peut être teintée en rouge si danger/inflation ou en vert si économie).
 */
export function InfoRow({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'good' }) {
  return (
    <View style={[card, styles.info]}>
      <Text style={styles.cardSub}>{label}</Text>
      <Text style={[styles.cardTitle, tone === 'danger' && { color: colors.coral }, tone === 'good' && { color: colors.green }]}>{value}</Text>
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
});
