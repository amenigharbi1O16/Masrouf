/**
 * FICHIER : src/components/ui/AlertBanner.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-053
 * COMPOSANT : AlertBanner (Bannière d'Alerte et d'Information Contextuelle)
 *
 * RÔLE DU COMPOSANT :
 * Composant atomique d'alerte et d'information visuelle à 4 tonalités (`Tone`) :
 * 1. `success` : vert menthe doux avec coche verte (`checkmark-circle`).
 * 2. `info` : vert menthe avec bulle d'information (`information-circle`).
 * 3. `warning` : or ambré doux avec icône d'alerte (`alert-circle`).
 * 4. `danger` : rose corail doux avec triangle d'avertissement (`warning`).
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Cartouche coloré à coins arrondis (radius 16), avec icône IonIcons à gauche (ou à droite en RTL),
 * titre en gras et détail descriptif en taille 12px, parfaitement lisible.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Constantes de thème (couleurs écologiques)
import { colors, radius } from '@/constants/theme';
// Système d'internationalisation et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Tonalités supportées par la bannière d'alerte.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'info';

/** Configuration visuelle par tonalité : couleur de fond, couleur de premier plan et icône associée */
const TONES: Record<
  Tone,
  { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  // Vert menthe et vert émeraude avec coche pour les confirmations et succès
  success: { bg: colors.mint, fg: colors.green, icon: 'checkmark-circle' },
  // Vert menthe doux avec bulle d'information pour les notifications contextuelles
  info: { bg: colors.mint, fg: colors.green, icon: 'information-circle' },
  // Fond doré ambré et texte brun foncé pour les avertissements et seuils d'alerte (80%)
  warning: { bg: colors.goldSoft, fg: '#8A5A12', icon: 'alert-circle' },
  // Fond rose corail adouci et texte rouge sombre pour les erreurs critiques et dépassements
  danger: { bg: colors.coralSoft, fg: '#9B3B35', icon: 'warning' },
};

/**
 * Propriétés du composant AlertBanner.
 */
interface AlertBannerProps {
  // Titre principal de l'alerte affiché en gras (ex: "Budget dépassé", "Opération réussie")
  title: string;
  // Détail explicatif textuel optionnel (ex: montant exact du dépassement, conseil)
  detail?: string;
  // Tonalité visuelle déterminant les couleurs et l'icône ('success' | 'warning' | 'danger' | 'info')
  tone?: Tone;
}

/**
 * Bannière d'alerte contextuelle.
 */
export function AlertBanner({
  title,
  detail,
  tone = 'success',
}: AlertBannerProps) {
  // Extraction de la configuration chromatique et de l'icône selon la tonalité demandée
  const t = TONES[tone];
  // Hook d'internationalisation pour adapter l'orientation en mode RTL (arabe)
  const { isRTL } = useTranslation();

  return (
    // Boîte principale avec couleur de fond dynamique et inversion de flux selon RTL
    <View
      style={[
        styles.box,
        {
          backgroundColor: t.bg,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
      accessibilityRole="alert"
    >
      {/* Icône thématique vectorielle IonIcons de 22px */}
      <Ionicons
        name={t.icon}
        size={22}
        color={t.fg}
        style={{ marginTop: 1 }}
      />
      {/* Conteneur textuel regroupant le titre et la description */}
      <View style={{ flex: 1 }}>
        {/* Titre en gras héritant de la couleur de premier plan */}
        <Text
          style={[
            styles.title,
            { color: t.fg, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {title}
        </Text>
        {/* Paragraphe descriptif affiché uniquement si fourni */}
        {detail ? (
          <Text
            style={[
              styles.detail,
              { color: t.fg, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

/** Styles graphiques de la bannière d'alerte */
const styles = StyleSheet.create({
  // Boîte avec espacement interne de 14px, coins arrondis de 16px et écartement de 10px
  box: {
    gap: 10,
    padding: 14,
    borderRadius: radius.card,
  },
  // Typographie du titre (14px, semi-bold 600)
  title: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  // Typographie du texte de détail (12px, regular)
  detail: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
});
