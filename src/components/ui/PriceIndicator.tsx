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
  change: PriceChange | null;
  unitLabel: string;
}

/**
 * Indicateur visuel d'évolution de prix unitaire.
 */
export function PriceIndicator({ change, unitLabel }: Props) {
  const { t, isRTL } = useTranslation();

  // Cas du premier achat : aucune base de comparaison antérieure
  if (!change) {
    return (
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.mint,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons name="sparkles" size={20} color={colors.green} />
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

  // Configuration visuelle selon la direction (baisse, hausse, égalité)
  const cfg = {
    down: {
      bg: colors.mint,
      fg: colors.green,
      icon: 'trending-down' as const,
      label: t('moins_cher_que_precedent'),
    },
    up: {
      bg: colors.coralSoft,
      fg: '#9B3B35',
      icon: 'trending-up' as const,
      label: t('plus_cher_que_precedent'),
    },
    same: {
      bg: colors.goldSoft,
      fg: '#8A5A12',
      icon: 'remove' as const,
      label: t('meme_prix_que_precedent'),
    },
  }[change.direction];

  const sign = change.diff > 0 ? '+' : change.diff < 0 ? '−' : '';

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: cfg.bg,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Ionicons name={cfg.icon} size={22} color={cfg.fg} />
      <View style={{ flex: 1 }}>
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

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.card,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
});
