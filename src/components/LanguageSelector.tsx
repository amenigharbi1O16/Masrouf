import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { colors, radius } from '@/constants/theme';
import { LANGUES_DISPONIBLES, Langue, useTranslation } from '@/utils/i18n';

/** Interface pour les options de personnalisation d'affichage du sélecteur de langue */
interface LanguageSelectorProps {
  style?: object;
  /** 
   * Variante visuelle :
   * - 'pills' : boutons sous forme de pastilles rondes (pour les écrans Login, Inscription, Réglages).
   * - 'drawer' : boutons textuels épurés séparés par des slashes pour le tiroir latéral.
   */
  variant?: 'pills' | 'drawer';
}

/**
 * 🎯 COMPOSANT : LanguageSelector (`src/components/LanguageSelector.tsx`)
 * 📌 Mission : Permettre à l'utilisateur de basculer la langue de l'application entre Français, Arabe et Anglais.
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - En mode 'pills' : 3 pastilles cliquables côte à côte (« Français », « العربية », « English ») dont la langue active est colorée en vert foncé avec texte blanc.
 *    - En mode 'drawer' : une ligne discrète « عربي / FR / ANG » en bas du menu latéral.
 *    - Lorsqu'on clique sur une langue, l'ensemble de l'interface change de langue instantanément et bascule en mode RTL si l'arabe est sélectionné.
 */
export function LanguageSelector({ style, variant = 'pills' }: LanguageSelectorProps) {
  // Récupération de la langue active, de la fonction de bascule et du sens d'écriture
  const { langue, changerLangue, isRTL } = useTranslation();
  const { width } = useWindowDimensions();
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
              {/* Séparateur slash entre les options */}
              {i > 0 && <Text style={styles.drawerSlash}> / </Text>}

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
                <Text style={[styles.drawerText, active && styles.drawerTextActive]}>
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
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
    width: '100%',
  },
  pill: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  pillInactive: {
    backgroundColor: colors.white,
    borderColor: colors.border,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  labelInactive: {
    color: colors.forest,
    fontWeight: '500',
  },

  // Styles spécifiques au tiroir latéral (fond vert foncé)
  drawerContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
  },
  drawerSlash: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '400',
    opacity: 0.6,
  },
  drawerButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
  },
  drawerButtonActive: {
    backgroundColor: 'rgba(217, 240, 228, 0.2)',
  },
  drawerText: {
    color: colors.mint,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  drawerTextActive: {
    color: colors.white,
    fontWeight: '700',
    opacity: 1,
  },
});
