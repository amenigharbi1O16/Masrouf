/**
 * FICHIER : src/components/Screen.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-051
 * COMPOSANT : Screen (Conteneur d'Écran Standard et Gabarit de Page)
 *
 * RÔLE DU COMPOSANT :
 * Gabarit de page unifié pour 100 % des écrans de l'application Masrouf :
 * 1. `SafeAreaView` : gère les bordures et encoches d'écran en haut et en bas avec la couleur de fond écru `#F5F3ED`.
 * 2. `KeyboardAvoidingView` : prévient le masquage des champs de formulaire par le clavier virtuel sur mobile.
 * 3. `AppHeader` : en-tête réutilisable avec gestion du titre traduit, flèche retour ou bouton burger ouvrant le tiroir.
 * 4. `ScrollView` : défilement vertical fluide avec espacement adaptatif selon la largeur d'écran (16px si < 360px, 24px sinon).
 * 5. Bouton d'action flottant FAB optionnel (`fab`) positionné en bas avec ombre portée et support RTL.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Assure la cohérence typographique, colorimétrique et ergonomique globale de Masrouf
 * sur tous les modèles de smartphones iOS et Android.
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
// Gestion des zones de sécurité de l'écran (encoches, barres système)
import { SafeAreaView } from 'react-native-safe-area-context';
// Constantes de thème (couleurs écologiques)
import { colors } from '@/constants/theme';
// Système d'internationalisation et détection RTL
import { useTranslation } from '@/utils/i18n';
// Composant d'en-tête de page standard
import { AppHeader } from './AppHeader';

/**
 * Propriétés du composant Screen.
 */
interface Props {
  title: string;
  children: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  plain?: boolean;
  /** Bouton d'action flottant optionnel (ex: "＋ Ajouter un achat") */
  fab?: { label: string; onPress: () => void };
}

/**
 * Conteneur d'écran standard de l'application.
 */
export function Screen({
  title,
  children,
  back,
  onBack,
  plain,
  fab,
}: Props) {
  const { width } = useWindowDimensions();
  const { isRTL } = useTranslation();

  // Padding horizontal adaptatif : 14px sur petits appareils (<360px), 18px sur téléphones standards (360-480px), 24px sur grands écrans/tablettes (>480px)
  const pad = width < 360 ? 14 : width > 480 ? 24 : 18;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.centerWrapper}>
          {/* En-tête de page unifié */}
          <View style={{ paddingHorizontal: pad, paddingTop: 4 }}>
            <AppHeader title={title} back={back} onBack={onBack} plain={plain} />
          </View>

          {/* Zone de contenu principale défilable */}
          <ScrollView
            contentContainerStyle={{
              paddingHorizontal: pad,
              paddingTop: 14,
              paddingBottom: fab ? 120 : 40,
              gap: 14,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {/* Bouton d'action flottant FAB optionnel */}
          {fab ? (
            <Pressable
              onPress={fab.onPress}
              style={({ pressed }) => [
                styles.fab,
                {
                  [isRTL ? 'left' : 'right']: pad,
                  maxWidth: width < 360 ? width - pad * 2 : 280,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={fab.label}
            >
              <Text style={styles.fabText} numberOfLines={1} adjustsFontSizeToFit>{fab.label}</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.warm,
  },
  keyboardContainer: {
    flex: 1,
  },
  centerWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    height: 54,
    minWidth: 160,
    paddingHorizontal: 20,
    borderRadius: 27,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.forest,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  fabText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
