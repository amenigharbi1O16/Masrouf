/**
 * FICHIER : src/components/LanguageSelector.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-046
 * COMPOSANT : LanguageSelector (Sélecteur Trilingue Français / Arabe RTL / Anglais)
 *
 * RÔLE DU COMPOSANT :
 * Permet à l'utilisateur de basculer la langue active de l'application entre le Français, l'Arabe et l'Anglais.
 * Supporte deux variantes visuelles :
 * 1. 'pills' : pastilles interactives sur fond chaud (pour écrans d'authentification et de réglages).
 * 2. 'drawer' : sélecteur compact intégré dans le pied du menu tiroir latéral.
 *
 * IMPACT DANS L'INTERFACE UTILISATEUR :
 * Au clic sur une langue, l'ensemble des textes est instantanément traduit et l'interface s'inverse en miroir (RTL) si l'arabe est sélectionné.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { LANGUES_DISPONIBLES, Langue, useTranslation } from '@/utils/i18n';

/** Interface pour les options de personnalisation d'affichage du sélecteur de langue */
interface LanguageSelectorProps {
  /** Style personnalisé optionnel transmis au conteneur principal */
  style?: object;
  /** 
   * Variante visuelle :
   * - 'pills' : boutons sous forme de pastilles rondes (pour les écrans Login, Inscription, Réglages).
   * - 'drawer' : boutons textuels épurés séparés par des slashes pour le tiroir latéral.
   */
  variant?: 'pills' | 'drawer';
  /**
   * Indique si le sélecteur est affiché dans le tiroir utilisateur (taille de police légèrement augmentée pour lisibilité)
   */
  isUserDrawer?: boolean;
}

/**
 * 🎯 COMPOSANT : LanguageSelector (`src/components/LanguageSelector.tsx`)
 * 📌 Mission : Permettre à l'utilisateur de basculer la langue de l'application entre Français, Arabe et Anglais.
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - En mode 'pills' : 3 pastilles cliquables côte à côte (« Français », « العربية », « English ») dont la langue active est colorée en vert foncé avec texte blanc.
 *    - En mode 'drawer' : une ligne discrète « عربي / FR / ANG » en bas du menu latéral.
 *    - Lorsqu'on clique sur une langue, l'ensemble de l'interface change de langue instantanément et bascule en mode RTL si l'arabe est sélectionné.
 */
export function LanguageSelector({ style, variant = 'pills', isUserDrawer = false }: LanguageSelectorProps) {
  // Récupération de la langue active, de la fonction de bascule et du sens d'écriture
  // Hook d'internationalisation : code langue courant, fonction de changement et drapeau RTL
  const { langue, changerLangue, isRTL } = useTranslation();
  // Mesure de la largeur d'écran pour l'adaptation responsive des pastilles
  const { width } = useWindowDimensions();
  // Indicateur de téléphone compact pour adapter la taille de police
  const isSmall = width < 360;

  // Affichage spécifique au tiroir latéral (fond vert foncé)
  if (variant === 'drawer') {
    const drawerOptions: { code: Langue; label: string }[] = [
      { code: 'ar', label: 'عربي' },
      { code: 'fr', label: 'FR' },
      { code: 'en', label: 'ANG' },
    ];

    return (
      <View style={[styles.drawerContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style]}>
        {drawerOptions.map((opt, i) => {
          const active = langue === opt.code;
          return (
            <React.Fragment key={opt.code}>
              {/* Séparateur slash entre les options (taille rehaussée pour le tiroir utilisateur) */}
              {i > 0 && (
                <Text style={[styles.drawerSlash, isUserDrawer && { fontSize: 14 }]}>
                  {' '}
                  /
                  {' '}
                </Text>
              )}

              {/* Bouton cliquable pour une langue */}
              <Pressable
                onPress={() => changerLangue(opt.code)}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.drawerButton,
                  active && styles.drawerButtonActive,
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={opt.label}
                accessibilityState={{ selected: active }}
              >
                {/* Libellé de langue (taille de police 14.5px pour le tiroir utilisateur vs 13px admin) */}
                <Text
                  style={[
                    styles.drawerText,
                    isUserDrawer && { fontSize: 14.5 },
                    active && styles.drawerTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  // Affichage standard sous forme de pastilles (Login, Inscription, Réglages)
  return (
    <View style={[styles.container, { flexDirection: isRTL ? 'row-reverse' : 'row' }, style]}>
      {LANGUES_DISPONIBLES.map((cfg) => {
        const active = langue === cfg.code;
        return (
          <Pressable
            key={cfg.code}
            onPress={() => changerLangue(cfg.code)}
            style={({ pressed }) => [
              styles.pill,
              active ? styles.pillActive : styles.pillInactive,
              pressed && { opacity: 0.8 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={cfg.nomNatif}
            accessibilityState={{ selected: active }}
          >
            {/* Libellé natif de la langue (ex: Français, العربية, English) */}
            <Text
              style={[
                styles.label,
                { fontSize: isSmall ? 12 : 14 },
                active ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {cfg.nomNatif}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Styles graphiques pour les deux variantes (pastilles et tiroir) */
const styles = StyleSheet.create({
  // Conteneur horizontal pour les pastilles de langue
  container: {
    // Disposition en ligne horizontale
    flexDirection: 'row',
    // Alignement vertical centré des pastilles
    alignItems: 'center',
    // Centrage horizontal des pastilles sur la largeur disponible
    justifyContent: 'center',
    // Espacement harmonieux de 8px entre chaque pastille
    gap: 8,
    // Marges verticales aérant le sélecteur dans le formulaire
    marginVertical: 12,
    width: '100%',
  },
  // Style commun d'une pastille de langue individuelle
  pill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    // Rayon de bordure maximal créant une forme de pilule entièrement arrondie
    borderRadius: radius.pill,
    // Hauteur minimale ergonomique pour une cible tactile optimale
    minHeight: 38,
    // Alignement vertical centré des pastilles
    alignItems: 'center',
    // Centrage horizontal des pastilles sur la largeur disponible
    justifyContent: 'center',
    // Bordure fine délimitant la pastille
    borderWidth: 1,
  },
  // Style de la pastille correspondant à la langue actuellement active
  pillActive: {
    // Fond vert forêt identifiant la sélection courante
    backgroundColor: colors.forest,
    // Bordure vert forêt assortie
    borderColor: colors.forest,
  },
  // Style des pastilles inactives non sélectionnées
  pillInactive: {
    // Fond blanc contrastant
    backgroundColor: colors.white,
    // Bordure grise discrète
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Typographie du texte de la pastille active
  labelActive: {
    // Texte blanc pour un contraste élevé sur fond vert forêt
    color: colors.white,
    // Graisse grasse marquant l'état sélectionné
    fontWeight: '700',
  },
  // Typographie du texte des pastilles inactives
  labelInactive: {
    // Texte vert forêt sur fond blanc
    color: colors.forest,
    fontWeight: '500',
  },

  // Styles spécifiques au tiroir latéral (fond vert foncé)
  // Conteneur spécifique pour le sélecteur intégré en bas du menu tiroir
  drawerContainer: {
    // Alignement vertical centré des pastilles
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  // Séparateur slash stylisé entre les codes de langue dans le tiroir
  drawerSlash: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.6,
  },
  // Bouton individuel de langue dans le tiroir
  drawerButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  // Surbrillance douce semi-transparente pour la langue active dans le tiroir
  drawerButtonActive: {
    backgroundColor: 'rgba(217, 240, 228, 0.2)',
  },
  // Libellé de langue dans le menu tiroir
  drawerText: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  // Libellé de langue actif en blanc soutenu
  drawerTextActive: {
    // Texte blanc pour un contraste élevé sur fond vert forêt
    color: colors.white,
    // Graisse grasse marquant l'état sélectionné
    fontWeight: '700',
    opacity: 1,
  },
});
