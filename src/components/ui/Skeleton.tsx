/**
 * FICHIER : src/components/ui/Skeleton.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-058
 * COMPOSANT : Skeleton & LoadingScreen (Indicateurs Squelettes de Chargement Animés)
 *
 * RÔLE DU COMPOSANT :
 * Fournit des espaces réservés animés imitant la silhouette du contenu en cours de chargement :
 * - `Skeleton` : bloc rectangulaire aux coins arrondis animé par `Animated.loop` faisant pulser
 *   l'opacité entre 0.45 et 1.00 toutes les 700 millisecondes (utilisant le driver natif React Native).
 * - `LoadingScreen` : écran complet de chargement élégant affiché pendant le démarrage de la base SQLite locale.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Remplace les écrans blancs ou spinners génériques par des formes grises douces pulsantes
 * sur fond écru chaleureux `#F5F3ED`, procurant une impression de réactivité immédiate.
 */

import React, { useEffect, useRef } from 'react';
// Importation des utilitaires d'animation et de détection de plateforme
import { Animated, DimensionValue, Platform, StyleSheet, View } from 'react-native';
// Constantes de thème
import { colors } from '@/constants/theme';

/**
 * Propriétés d'un bloc de squelette individuel.
 */
interface SkeletonProps {
  height?: number;
  width?: DimensionValue;
  radius?: number;
}

/**
 * Bloc rectangulaire squelette animé par pulsation d'opacité.
 */
export function Skeleton({
  height = 16,
  width = '100%',
  radius = 12,
}: SkeletonProps) {
  // Valeur d'animation d'opacité
  const o = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    // Variable déterminant l'utilisation du pilote natif (désactivé sur Web pour éviter l'avertissement console)
    const useNativeDriver = Platform.OS !== 'web';
    // Boucle continue de pulsation douce (700ms aller, 700ms retour)
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, {
          toValue: 1,
          duration: 700,
          useNativeDriver,
        }),
        Animated.timing(o, {
          toValue: 0.45,
          duration: 700,
          useNativeDriver,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [o]);

  return (
    <Animated.View
      style={{
        height,
        width,
        borderRadius: radius,
        backgroundColor: colors.border,
        opacity: o,
      }}
    />
  );
}

/**
 * Écran plein de chargement silencieux lors du démarrage de l'application.
 * Structure une disposition fantôme calquée sur l'écran d'accueil pour une transition fluide.
 */
export function LoadingScreen() {
  return (
    // Conteneur plein écran sur fond chaud (#F5F3ED)
    <View style={styles.wrap}>
      {/* 1. Silhouette de l'en-tête de salutation (ex: "Bonjour, Ines") */}
      <Skeleton height={32} width={200} />
      {/* 2. Silhouette de la grande carte de synthèse budgétaire BudgetCard (218px) */}
      <Skeleton height={218} radius={16} />
      {/* 3. Silhouette de la bannière d'alerte ou de félicitations (76px) */}
      <Skeleton height={76} radius={16} />
      {/* 4. Silhouette du titre de section "Vos catégories" (26px) */}
      <Skeleton height={26} width={160} />
      {/* 5. Silhouette de la première carte d'enveloppe de catégorie (88px) */}
      <Skeleton height={88} radius={16} />
      {/* 6. Silhouette de la deuxième carte d'enveloppe de catégorie (88px) */}
      <Skeleton height={88} radius={16} />
    </View>
  );
}

/** Styles graphiques de l'écran de chargement */
const styles = StyleSheet.create({
  // Conteneur racine occupant tout l'espace d'affichage avec rembourrage supérieur de 80px
  wrap: {
    flex: 1,
    backgroundColor: colors.warm,
    padding: 24,
    paddingTop: 80,
    gap: 14,
  },
});
