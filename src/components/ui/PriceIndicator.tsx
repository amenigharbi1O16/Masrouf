/**
 * FICHIER : src/components/ui/PriceIndicator.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-057
 * COMPOSANT : PriceIndicator (Pastille Visuelle de Variation de Prix)
 *
 * RÔLE DU COMPOSANT :
 * Compare le prix unitaire d'un achat avec le relevé précédent pour le même produit et la même unité :
 * - Si premier achat (`change === null`) : pastille vert menthe douce avec icône étincelles `sparkles`.
 * - Si baisse de prix (`change.direction === 'down'`) : vert menthe avec flèche descendante (`trending-down`), libellé "Moins cher que la dernière fois".
 * - Si hausse de prix (`change.direction === 'up'`) : rose corail avec flèche montante (`trending-up`), libellé "Plus cher que la dernière fois".
 * - Si prix identique (`change.direction === 'same'`) : or ambré avec trait horizontal (`remove`), libellé "Même prix que la dernière fois".
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Cartouche arrondi affichant la variation absolue en dinars tunisiens (ex: −0.350 DT / L)
 * et le pourcentage relatif (ex: −2.4%), avec support bidirectionnel RTL.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Constantes de thème
import { colors, radius } from '@/constants/theme';
// Type métier représentant une variation de prix
import type { PriceChange } from '@/state/selectors';
// Formatage monétaire
import { dt } from '@/utils/format';
// Système d'internationalisation et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Propriétés du composant PriceIndicator.
 */
interface Props {
  // Objet de variation de prix contenant la différence absolue, le pourcentage et la direction
  change: PriceChange | null;
  // Libellé de l'unité physique (ex: "kg", "L", "pièce")
  unitLabel: string;
}

/**
 * Indicateur visuel d'évolution de prix unitaire.
 */
export function PriceIndicator({ change, unitLabel }: Props) {
  // Hook d'internationalisation pour adapter l'orientation en mode RTL (arabe)
  const { t, isRTL } = useTranslation();

  // Cas du premier achat : aucune base de comparaison antérieure disponible dans l'historique
  if (!change) {
    return (
      // Pastille vert menthe douce avec icône étincelles sparkles
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.mint,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        {/* Icône étincelles en vert émeraude */}
        <Ionicons name="sparkles" size={20} color={colors.green} />
        {/* Message d'information indiquant qu'il s'agit du premier relevé de prix */}
        <Text
          style={[
            styles.text,
            { color: colors.green, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {t('premier_achat_sans_comparaison')}
        </Text>
      </View>
    );
  }

  // Configuration visuelle selon la direction (baisse = vert, hausse = corail, égalité = or)
  const cfg = {
    // Cas de baisse de prix : vert menthe apaisant avec flèche vers le bas
    down: {
      bg: colors.mint,
      fg: colors.green,
      icon: 'trending-down' as const,
      label: t('moins_cher_que_precedent'),
    },
    // Cas de hausse de prix : rose corail doux avec flèche vers le haut
    up: {
      bg: colors.coralSoft,
      fg: '#9B3B35',
      icon: 'trending-up' as const,
      label: t('plus_cher_que_precedent'),
    },
    // Cas de prix strictement identique : fond doré avec tiret horizontal
    same: {
      bg: colors.goldSoft,
      fg: '#8A5A12',
      icon: 'remove' as const,
      label: t('meme_prix_que_precedent'),
    },
  }[change.direction];

  // Détermination du signe arithmétique (+ pour hausse, − pour baisse, neutre pour égalité)
  const sign = change.diff > 0 ? '+' : change.diff < 0 ? '−' : '';

  return (
    // Boîte stylisée avec fond dynamique selon l'évolution du prix
    <View
      style={[
        styles.box,
        {
          backgroundColor: cfg.bg,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      {/* Icône vectorielle dynamique (flèche montante, descendante ou tiret) */}
      <Ionicons name={cfg.icon} size={22} color={cfg.fg} />
      {/* Conteneur des deux lignes de texte informatif */}
      <View style={{ flex: 1 }}>
        {/* Ligne 1 : Intitulé de la variation (ex: "Moins cher que la dernière fois") */}
        <Text
          style={[
            styles.text,
            {
              color: cfg.fg,
              fontWeight: '600',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {cfg.label}
        </Text>
        {/* Ligne 2 : Détail chiffré de l'écart unitaire en DT et variation en pourcentage */}
        <Text
          style={[
            styles.text,
            {
              color: cfg.fg,
              fontSize: 12,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
        >
          {sign}
          {dt(Math.abs(change.diff))} DT / {unitLabel} · {sign}
          {Math.abs(change.pct).toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

/** Styles graphiques de l'indicateur de prix */
const styles = StyleSheet.create({
  // Boîte avec alignement centré, coins arrondis de 16px et padding confortable de 14px
  box: {
    // Alignement vertical centré de l'icône et des textes
    alignItems: 'center',
    // Espacement horizontal régulier entre l'icône et le texte
    gap: 10,
    // Rembourrage interne homogène de 14px
    padding: 14,
    // Coins arrondis assortis aux cartes de l'application (16px)
    borderRadius: radius.card,
  },
  // Typographie standardisée avec interlignage équilibré
  text: {
    // Taille de police lisible de 14px
    fontSize: 14,
    // Hauteur de ligne proportionnelle
    lineHeight: 20,
  },
});
