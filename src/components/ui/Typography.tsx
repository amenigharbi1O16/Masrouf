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

/**
 * Propriétés standard pour les éléments typographiques.
 */
type TypographyProps = {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
};

/**
 * Surtitre décoratif ou indicateur d'étape.
 */
export const Eyebrow = ({ children, style }: TypographyProps) => (
  <Text style={[{ fontSize: 14, lineHeight: 20, color: colors.muted }, style]}>
    {children}
  </Text>
);

/**
 * Titre de section standard d'écran.
 */
export const SectionTitle = ({ children, style }: TypographyProps) => (
  <Text
    style={[
      {
        fontSize: 18,
        lineHeight: 26,
        fontWeight: '600',
        color: colors.forest,
      },
      style,
    ]}
  >
    {children}
  </Text>
);

/**
 * Corps de texte pour paragraphes et descriptions.
 */
export const Body = ({ children, style }: TypographyProps) => (
  <Text style={[{ fontSize: 14, lineHeight: 20, color: colors.muted }, style]}>
    {children}
  </Text>
);

/**
 * Note explicative ou conseil discret de bas de formulaire.
 */
export const Hint = ({ children, style }: TypographyProps) => (
  <Text style={[{ fontSize: 12, lineHeight: 17, color: colors.muted }, style]}>
    {children}
  </Text>
);
