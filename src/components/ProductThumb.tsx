/**
 * FICHIER : src/components/ProductThumb.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-047
 * COMPOSANT : ProductThumb (Vignette Carrée Visuelle de Produit)
 *
 * RÔLE DU COMPOSANT :
 * Affiche l'avatar visuel d'un produit :
 * - Si une image (`uri`) est présente : effectue le rendu d'une balise `Image` avec coins arrondis.
 * - Si aucune photo n'est associée : génère une tuile carrée élégante sur fond vert menthe doux (`colors.mint`)
 *   avec l'icône de sac de courses (`bag-outline`) en vert forêt, identique au design de l'application.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Vignette carrée (48x48px par défaut) aux angles doux (radius 14px),
 * garantissant une uniformité esthétique sur les listes de produits, tickets d'achat et fiches d'articles.
 */

// Importation de React
import React from 'react';
// Importation des composants visuels React Native
import { Image, StyleSheet, View } from 'react-native';
// Importation des icônes vectorielles Ionicons
import { Ionicons } from '@expo/vector-icons';
// Constantes de thème (couleurs écologiques)
import { colors } from '@/constants/theme';

/**
 * Interface des propriétés du composant ProductThumb.
 */
interface ProductThumbProps {
  // Nom du produit
  name: string;
  // URI locale ou distante de l'image (optionnelle)
  uri?: string;
  // Taille en pixels du conteneur carré (défaut : 48px)
  size?: number;
  // Nom d'icône personnalisé optionnel
  icon?: keyof typeof Ionicons.glyphMap;
}

/**
 * MISSION DE LA FONCTION : ProductThumb
 *   Affiche la vignette d'un article sous forme de photo enregistrée ou d'icône vectorielle sur fond menthe.
 * RÔLE DANS L'APPLICATION : Utilisé dans les listes de courses, catalogues et fiches de détail.
 * CE QUI EST AFFICHÉ À L'ÉCRAN : Un carré vert menthe arrondi (48x48) contenant la photo ou l'icône du sac de courses.
 */
export function ProductThumb({ uri, size = 48, icon = 'bag-outline' }: ProductThumbProps) {
  // Cas où une photo a été choisie par l'utilisateur
  if (uri) {
    // Rendu de la photo réelle avec coins arrondis
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: 14 }}
      />
    );
  }

  // Rendu par défaut : tuile vert menthe avec icône vectorielle
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {/* Icône de courses stylisée en vert forêt sombre */}
      <Ionicons name={icon} size={Math.round(size * 0.48)} color={colors.forest} />
    </View>
  );
}

// Feuilles de styles du composant ProductThumb
const styles = StyleSheet.create({
  // Boîte carrée vert menthe avec coins arrondis
  box: {
    // Rayon de courbure des angles de 14px pour un style moderne
    borderRadius: 14,
    // Arrière-plan vert menthe doux officiel
    backgroundColor: colors.mint,
    // Centrage horizontal de l'icône
    alignItems: 'center',
    // Centrage vertical de l'icône
    justifyContent: 'center',
  },
});
