/**
 * FICHIER : src/components/ProductThumb.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-047
 * COMPOSANT : ProductThumb (Vignette Carrée Visuelle de Produit)
 *
 * RÔLE DU COMPOSANT :
 * Affiche l'avatar visuel d'un produit :
 * - Si une image (`uri`) est présente : effectue le rendu d'une balise `Image` avec coins arrondis.
 * - Si aucune photo n'est associée : génère un badge de substitution carré sur fond vert menthe doux (`colors.mint`)
 *   avec la première lettre du nom du produit en majuscule, dimensionnée proportionnellement (40% de la taille).
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Vignette carrée (par défaut 48x48, configurable) avec coins arrondis (radius 12),
 * offrant une régularité graphique parfaite dans les listes de produits et en-têtes.
 */

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
// Constantes de thème (couleurs écologiques)
import { colors } from '@/constants/theme';

/**
 * Propriétés du composant ProductThumb.
 */
interface ProductThumbProps {
  name: string;
  uri?: string;
  size?: number;
}

/**
 * Composant de vignette visuelle d'un produit.
 */
export function ProductThumb({ name, uri, size = 48 }: ProductThumbProps) {
  // Cas où une photo a été choisie par l'utilisateur
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 12 }}
      />
    );
  }

  // Cas de substitution par l'initiale du nom sur fond menthe
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>
        {name.trim().charAt(0).toUpperCase() || '?'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: colors.green,
    fontWeight: '700',
  },
});
