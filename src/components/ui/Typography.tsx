/**
 * FICHIER : src/components/ui/Typography.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-059
 * COMPOSANT : Typographie Atomique (Eyebrow, SectionTitle, Body, Hint)
 *
 * RÔLE DU COMPOSANT :
 * Définit la hiérarchie typographique standardisée de l'application Masrouf :
 * 1. `Eyebrow` : surtitre en petits caractères grisés (`colors.muted`, taille 14, interlignage 20).
 * 2. `SectionTitle` : titre de section en vert forêt profond (`colors.forest`, taille 18, semi-gras 600, interlignage 26).
 * 3. `Body` : corps de texte de paragraphe descriptif (`colors.muted`, taille 14, interlignage 20).
 * 4. `Hint` : mention d'aide ou conseil discret (`colors.muted`, taille 12, interlignage 17).
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Assure une lisibilité harmonieuse et une échelle typographique uniforme sur tous les écrans.
 */

import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
// Constantes de thème
import { colors } from '@/constants/theme';
import { useTranslation } from '@/utils/i18n';

/**
 * Propriétés standard pour les éléments typographiques.
 */
type TypographyProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

/**
 * Surtitre décoratif ou indicateur d'étape.
 * Apparaît au-dessus des titres de section pour contextualiser la période ou l'étape (ex: "NOVEMBRE 2026").
 */
export const Eyebrow = ({ children, style }: TypographyProps) => {
  // Détection du sens RTL pour aligner le texte à droite en arabe
  const { isRTL } = useTranslation();
  return (
    // Texte 14px gris ardoise discret
    <Text
      style={[
        {
          fontSize: 14,
          lineHeight: 20,
          color: colors.muted,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

/**
 * Titre de section standard d'écran.
 * Met en valeur les grands blocs de contenu (ex: "Vos catégories", "Transactions récentes").
 */
export const SectionTitle = ({ children, style }: TypographyProps) => {
  // Détection du sens RTL pour aligner le texte à droite en arabe
  const { isRTL } = useTranslation();
  return (
    // Titre 18px semi-bold 600 en vert forêt (#102B27)
    <Text
      style={[
        {
          fontSize: 18,
          lineHeight: 26,
          fontWeight: '600',
          color: colors.forest,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

/**
 * Corps de texte pour paragraphes et descriptions.
 * Utilisé pour les explications de formulaires, consignes et détails de cartes.
 */
export const Body = ({ children, style }: TypographyProps) => {
  // Détection du sens RTL pour aligner le texte à droite en arabe
  const { isRTL } = useTranslation();
  return (
    // Texte courant 14px regular avec interlignage confortable de 20px
    <Text
      style={[
        {
          fontSize: 14,
          lineHeight: 20,
          color: colors.muted,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};

/**
 * Note explicative ou conseil discret de bas de formulaire.
 * Donne une astuce d'utilisation ou une précision sans surcharger l'interface.
 */
export const Hint = ({ children, style }: TypographyProps) => {
  // Détection du sens RTL pour aligner le texte à droite en arabe
  const { isRTL } = useTranslation();
  return (
    // Petit texte 12px discret avec interlignage fin de 17px
    <Text
      style={[
        {
          fontSize: 12,
          lineHeight: 17,
          color: colors.muted,
          textAlign: isRTL ? 'right' : 'left',
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
};
