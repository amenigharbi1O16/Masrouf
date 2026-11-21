/**
 * FICHIER : src/components/MasroufLogo.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-057-LOGO
 * COMPOSANT : Logo Officiel Botanique de Masrouf (Masrouf Botanical Logo)
 *
 * MISSION DU COMPOSANT :
 * Fournir le symbole visuel officiel et unifié de Masrouf pour toute l'application :
 * - Deux feuilles vertes élégantes émergeant d'une ligne de sol gracieusement incurvée.
 * - Dégradé fluide du vert clair (#A8D5A0) vers le vert profond (#2E7D43) via le vert moyen (#5FA867).
 * - Rendu vectoriel SVG pur garantissant une netteté parfaite sur toutes les résolutions d'écrans.
 * - Variante 'mint' (#D9EEDD) adaptée aux arrière-plans sombres (tiroir latéral, en-tête vert forêt).
 * - Accessibilité native avec description "Logo Masrouf".
 */

import React from 'react';
// Composant conteneur et styles de React Native
import { StyleProp, View, ViewStyle } from 'react-native';
// Primitives vectorielles SVG de react-native-svg
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
// Palette thématique centralisée de Masrouf
import { colors } from '@/constants/theme';

/**
 * Interface des propriétés du logo Masrouf
 */
export interface MasroufLogoProps {
  /** Dimension carrée en pixels (largeur et hauteur identiques) */
  size?: number;
  /** Variante chromatique : 'default' sur fond clair, 'mint' sur fond vert forêt */
  variant?: 'default' | 'mint';
  /** Style personnalisé optionnel pour le conteneur */
  style?: StyleProp<ViewStyle>;
}

/**
 * Composant Logo Masrouf officiel
 * Affiche deux feuilles botaniques avec dégradé et ligne de sol incurvée.
 */
export function MasroufLogo({
  size = 80,
  variant = 'default',
  style,
}: MasroufLogoProps) {
  // Détermination de la couleur de la ligne de sol selon la variante
  const groundColor = variant === 'mint' ? colors.mint : colors.deepGreen;
  // Détermination de la couleur des nervures fines
  const veinColor = variant === 'mint' ? 'rgba(17, 43, 40, 0.35)' : 'rgba(255, 255, 255, 0.45)';

  return (
    // Conteneur accessible pour lecteurs d'écran
    <View
      style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel="Logo Masrouf"
    >
      <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
        <Defs>
          {/* Dégradé fluide officiel pour la variante par défaut (fond clair) */}
          <LinearGradient id="masroufLeafGrad" x1="0%" y1="100%" x2="60%" y2="0%">
            {/* Vert profond à la base de la pousse */}
            <Stop offset="0%" stopColor={colors.deepGreen} />
            {/* Vert moyen équilibrant au cœur de la feuille */}
            <Stop offset="50%" stopColor={colors.mediumGreen} />
            {/* Vert clair lumineux aux pointes */}
            <Stop offset="100%" stopColor={colors.lightGreen} />
          </LinearGradient>

          {/* Dégradé doux menthe pour la variante sombre (tiroir, hero sombre) */}
          <LinearGradient id="masroufMintGrad" x1="0%" y1="100%" x2="60%" y2="0%">
            {/* Vert clair à la base */}
            <Stop offset="0%" stopColor={colors.lightGreen} />
            {/* Vert menthe douce lumineuse aux pointes */}
            <Stop offset="100%" stopColor={colors.mint} />
          </LinearGradient>
        </Defs>

        {/* 1. Ligne de sol incurvée élégante */}
        <Path
          d="M 22 96 C 42 102, 78 102, 98 96"
          stroke={groundColor}
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* 2. Petite tige centrale reliant les feuilles au sol */}
        <Path
          d="M 60 92 L 60 96"
          stroke={groundColor}
          strokeWidth={3.5}
          strokeLinecap="round"
        />

        {/* 3. Feuille gauche (courbée harmonieusement vers la gauche) */}
        <Path
          d="M 60 92 C 46 84, 26 70, 32 46 C 44 44, 58 64, 60 92 Z"
          fill={variant === 'mint' ? 'url(#masroufMintGrad)' : 'url(#masroufLeafGrad)'}
        />

        {/* 4. Nervure délicate de la feuille gauche */}
        <Path
          d="M 58 88 C 50 74, 40 60, 34 48"
          stroke={veinColor}
          strokeWidth={1.4}
          strokeLinecap="round"
        />

        {/* 5. Feuille droite (principale, s'élevant avec grâce vers le haut droit) */}
        <Path
          d="M 60 92 C 62 74, 68 46, 84 26 C 94 46, 84 74, 60 92 Z"
          fill={variant === 'mint' ? 'url(#masroufMintGrad)' : 'url(#masroufLeafGrad)'}
        />

        {/* 6. Nervure délicate de la feuille droite */}
        <Path
          d="M 61 88 C 65 68, 73 48, 82 30"
          stroke={veinColor}
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}
