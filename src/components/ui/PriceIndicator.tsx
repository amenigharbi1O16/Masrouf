// ============================================================
// FICHIER : src/components/ui/PriceIndicator.tsx
// MISSION : Comparaison de prix unitaire réutilisable :
//           - Montant et pourcentage avec flèche et couleur
//           - 'Premier achat de ce produit' si premier achat
//           - Prix sans pourcentage si les unités sont incompatibles
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '../../constants/theme';
import { formatDT, formatPourcentage } from '../../utils/format';

type Props = {
  nouveauPrix: number;
  ancienPrix?: number | null;
  uniteNouvelle?: string;
  uniteAncienne?: string;
  langue?: string;
  style?: ViewStyle;
};

export default function PriceIndicator({
  nouveauPrix,
  ancienPrix,
  uniteNouvelle = '',
  uniteAncienne = '',
  langue = 'fr',
  style,
}: Props) {
  // Cas 1 : Premier achat
  if (ancienPrix === null || ancienPrix === undefined || ancienPrix <= 0) {
    return (
      <View style={[styles.container, styles.firstPurchase, style]}>
        <Text style={styles.firstPurchaseText}>Premier achat de ce produit</Text>
      </View>
    );
  }

  // Cas 2 : Unités incompatibles
  const unitesIncompatibles =
    uniteNouvelle.trim() !== '' &&
    uniteAncienne.trim() !== '' &&
    uniteNouvelle.trim().toLowerCase() !== uniteAncienne.trim().toLowerCase();

  if (unitesIncompatibles) {
    return (
      <View style={[styles.container, styles.incompatible, style]}>
        <Text style={styles.incompatibleText}>
          Précédent : {formatDT(ancienPrix, langue)} / {uniteAncienne} → Nouveau : {formatDT(nouveauPrix, langue)} / {uniteNouvelle} (unités différentes)
        </Text>
      </View>
    );
  }

  // Cas 3 : Comparaison normale
  const deltaMontant = nouveauPrix - ancienPrix;
  const aBaisse = deltaMontant <= 0;
  const deltaPct = ancienPrix > 0 ? (Math.abs(deltaMontant) / ancienPrix) * 100 : 0;

  return (
    <View
      style={[
        styles.container,
        aBaisse ? styles.cheaper : styles.expensive,
        style,
      ]}
    >
      <Text style={[styles.icon, { color: aBaisse ? Theme.colors.deepGreen : Theme.colors.coral }]}>
        {aBaisse ? '↓' : '↑'}
      </Text>
      <Text
        style={[
          styles.text,
          { color: aBaisse ? Theme.colors.deepGreen : Theme.colors.coral },
        ]}
      >
        {aBaisse ? '-' : '+'}{formatDT(Math.abs(deltaMontant), langue)} (
        {aBaisse ? '-' : '+'}{formatPourcentage(deltaPct)})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  cheaper: {
    backgroundColor: Theme.colors.mint,
  },
  expensive: {
    backgroundColor: Theme.colors.statusRedBg,
  },
  firstPurchase: {
    backgroundColor: Theme.colors.mint,
  },
  incompatible: {
    backgroundColor: Theme.colors.warm,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  icon: {
    fontSize: Theme.font.section,
    fontWeight: '800',
  },
  text: {
    fontSize: Theme.font.small,
    fontWeight: '700',
  },
  firstPurchaseText: {
    fontSize: Theme.font.small,
    fontWeight: '700',
    color: Theme.colors.deepGreen,
  },
  incompatibleText: {
    fontSize: Theme.font.small,
    color: Theme.colors.muted,
  },
});
