/**
 * FICHIER : src/components/BotanicalBackground.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-058-BOTANICAL-BG
 * COMPOSANT : Décoration d'Arrière-Plan Botanique Masrouf (Botanical Background)
 *
 * MISSION DU COMPOSANT :
 * Créer un décor immersif, apaisant et raffiné pour l'écran de bienvenue :
 * 1. Fond plein écran crème chaleureux (#FBFAF6).
 * 2. Deux grandes vagues organiques vertes confinées strictement aux coins :
 *    - Coin supérieur gauche : vague vert forêt / moyen avec sous-couche vert menthe lumineuse (#D9EEDD).
 *    - Coin inférieur droit : vague vert forêt (#112B28) avec sous-couche vert clair (#A8D5A0).
 * 3. Deux branches botaniques très discrètes et délicates en filigrane :
 *    - Coin supérieur droit : branche incurvée avec feuilles en vert très pâle (#E8F2E0) à 15% d'opacité.
 *    - Coin inférieur gauche : branche orientée vers le haut à 15% d'opacité.
 * 4. Respect total de la zone centrale libre, sans surcharge ni interférence avec le contenu principal.
 */

import React from 'react';
// Dimensions de l'écran et conteneur de style
import { StyleSheet, useWindowDimensions, View } from 'react-native';
// Composants SVG pour tracer les courbes de Bézier vectorielles et les branches
import Svg, { G, Path } from 'react-native-svg';
// Charte de couleurs centralisée
import { colors } from '@/constants/theme';

/**
 * Composant de fond d'écran botanique avec vagues et rameaux d'angle
 */
export function BotanicalBackground() {
  // Mesure dynamique de la largeur et hauteur de l'écran pour un dimensionnement adaptatif
  const { width, height } = useWindowDimensions();

  // Largeur proportionnelle des vagues (environ 52% de l'écran)
  const waveWidth = Math.min(width * 0.55, 260);
  // Hauteur proportionnelle des vagues (environ 28% de la hauteur totale)
  const waveHeight = Math.min(height * 0.28, 240);

  return (
    // Conteneur absolu couvrant tout l'arrière-plan sans intercepter les clics
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. VAGUE SUPÉRIEURE GAUCHE (DOUBLE COUCHE ORGANIQUE) */}
      <View style={[styles.topLeftCorner, { width: waveWidth, height: waveHeight }]}>
        <Svg width="100%" height="100%" viewBox="0 0 200 180" preserveAspectRatio="none">
          {/* Sous-couche claire en vert menthe (#D9EEDD) créant un liséré doux */}
          <Path
            d="M 0 0 L 190 0 C 170 60, 145 100, 95 130 C 45 155, 10 170, 0 175 Z"
            fill={colors.mint}
            opacity={0.85}
          />
          {/* Couche principale vert forêt profond (#112B28) au premier plan */}
          <Path
            d="M 0 0 L 145 0 C 125 50, 105 85, 65 115 C 25 135, 0 145, 0 145 Z"
            fill={colors.forest}
          />
        </Svg>
      </View>

      {/* 2. BRANCHE BOTANIQUE DÉLICATE - COIN SUPÉRIEUR DROIT */}
      <View style={styles.topRightBranch}>
        <Svg width={110} height={120} viewBox="0 0 110 120" fill="none">
          {/* Tige et feuilles en vert très pâle (#E8F2E0) à faible opacité (filigrane 15%) */}
          <G opacity={0.18}>
            {/* Tige incurvée */}
            <Path
              d="M 100 10 C 70 30, 45 65, 30 110"
              stroke={colors.veryPaleGreen}
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Feuille 1 (haute) */}
            <Path
              d="M 85 24 C 65 18, 55 28, 62 38 C 72 38, 80 32, 85 24 Z"
              fill={colors.veryPaleGreen}
            />
            {/* Feuille 2 (opposée) */}
            <Path
              d="M 75 36 C 85 45, 95 42, 92 32 C 85 30, 78 32, 75 36 Z"
              fill={colors.veryPaleGreen}
            />
            {/* Feuille 3 (médiane) */}
            <Path
              d="M 58 55 C 38 50, 30 62, 38 72 C 48 70, 55 64, 58 55 Z"
              fill={colors.veryPaleGreen}
            />
            {/* Feuille 4 (opposée médiane) */}
            <Path
              d="M 48 70 C 60 78, 68 74, 64 64 C 56 62, 50 65, 48 70 Z"
              fill={colors.veryPaleGreen}
            />
            {/* Feuille 5 (basse) */}
            <Path
              d="M 36 92 C 18 90, 14 102, 22 110 C 30 108, 34 100, 36 92 Z"
              fill={colors.veryPaleGreen}
            />
          </G>
        </Svg>
      </View>

      {/* 3. BRANCHE BOTANIQUE DÉLICATE - COIN INFÉRIEUR GAUCHE */}
      <View style={styles.bottomLeftBranch}>
        <Svg width={110} height={120} viewBox="0 0 110 120" fill="none">
          {/* Tige et feuilles symétriques en vert très pâle (#E8F2E0) */}
          <G opacity={0.18}>
            {/* Tige montant depuis le coin */}
            <Path
              d="M 10 110 C 35 85, 60 50, 75 10"
              stroke={colors.veryPaleGreen}
              strokeWidth={2}
              strokeLinecap="round"
            />
            {/* Feuille 1 */}
            <Path
              d="M 25 96 C 45 102, 55 92, 48 82 C 38 82, 30 88, 25 96 Z"
              fill={colors.veryPaleGreen}
            />
            {/* Feuille 2 */}
            <Path
              d="M 35 84 C 25 75, 15 78, 18 88 C 25 90, 32 88, 35 84 Z"
              fill={colors.veryPaleGreen}
            />
            {/* Feuille 3 */}
            <Path
              d="M 52 65 C 72 70, 80 58, 72 48 C 62 50, 55 56, 52 65 Z"
              fill={colors.veryPaleGreen}
            />
            {/* Feuille 4 */}
            <Path
              d="M 62 50 C 50 42, 42 46, 46 56 C 54 58, 60 55, 62 50 Z"
              fill={colors.veryPaleGreen}
            />
            {/* Feuille terminale */}
            <Path
              d="M 74 28 C 92 30, 96 18, 88 10 C 80 12, 76 20, 74 28 Z"
              fill={colors.veryPaleGreen}
            />
          </G>
        </Svg>
      </View>

      {/* 4. VAGUE INFÉRIEURE DROITE (DOUBLE COUCHE ORGANIQUE) */}
      <View style={[styles.bottomRightCorner, { width: waveWidth, height: waveHeight }]}>
        <Svg width="100%" height="100%" viewBox="0 0 200 180" preserveAspectRatio="none">
          {/* Sous-couche vert clair (#A8D5A0) pour un dégradé étagé */}
          <Path
            d="M 200 180 L 10 180 C 30 120, 55 80, 105 50 C 155 25, 190 10, 200 5 Z"
            fill={colors.lightGreen}
            opacity={0.7}
          />
          {/* Couche principale vert forêt (#112B28) fermant l'angle */}
          <Path
            d="M 200 180 L 55 180 C 75 130, 95 95, 135 65 C 175 45, 200 35, 200 35 Z"
            fill={colors.forest}
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Alignement dans le coin supérieur gauche
  topLeftCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  // Alignement dans le coin supérieur droit pour la branche
  topRightBranch: {
    position: 'absolute',
    top: 24,
    right: 12,
  },
  // Alignement dans le coin inférieur gauche pour la branche
  bottomLeftBranch: {
    position: 'absolute',
    bottom: 24,
    left: 12,
  },
  // Alignement dans le coin inférieur droit pour la vague
  bottomRightCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
