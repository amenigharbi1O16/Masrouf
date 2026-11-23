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
  /** Titre textuel de l'écran transmis à la barre d'en-tête AppHeader */
  title: string;
  /** Composants enfants et contenu principal à afficher dans la zone de défilement */
  children: React.ReactNode;
  /** Affiche une flèche retour plutôt qu'un bouton burger de menu */
  back?: boolean;
  /** Callback personnalisé pour l'action de retour arrière */
  onBack?: () => void;
  /** Mode épuré sans navigation ni bouton de profil (écrans d'onboarding/login) */
  plain?: boolean;
  /** Bouton d'action flottant optionnel (ex: "＋ Ajouter un achat") */
  fab?: { label: string; onPress: () => void };
  /** Référence optionnelle vers le ScrollView pour contrôle impératif du défilement */
  scrollRef?: any;
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
  scrollRef,
}: Props) {
  // Largeur physique de l'écran pour le calcul réactif des marges et du positionnement FAB
  const { width } = useWindowDimensions();
  // Détection de la direction droite-à-gauche pour aligner le FAB et les paddings
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
            ref={scrollRef as any}
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
  // Conteneur racine occupant tout l'espace écran avec fond écru
  root: {
    flex: 1,
    // Couleur de fond crème chaleureuse signature de Masrouf (#F5F3ED)
    backgroundColor: colors.warm,
  },
  // Gestionnaire d'évitement de clavier pour que les champs restent toujours visibles
  keyboardContainer: {
    flex: 1,
  },
  // Enveloppe centrale limitant la largeur à 600px pour un affichage centré sur tablette
  centerWrapper: {
    flex: 1,
    width: '100%',
    // Largeur maximale assurant une lisibilité optimale sur tablette et grand écran
    maxWidth: 600,
    // Centrage horizontal sur les dispositifs plus larges que 600px
    alignSelf: 'center',
  },
  // Style du bouton d'action flottant (Floating Action Button)
  fab: {
    // Positionnement absolu par-dessus la zone de défilement
    position: 'absolute',
    // Distance par rapport au bas de l'écran
    bottom: 16,
    // Hauteur standard du bouton flottant (54px)
    height: 54,
    // Largeur minimale pour garantir la lisibilité du libellé
    minWidth: 160,
    paddingHorizontal: 20,
    // Rayon de bordure semi-circulaire (moitié de la hauteur 54px)
    borderRadius: 27,
    // Teinte verte énergique attirant le regard sur l'action principale
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    // Ombre portée sous Android pour l'élévation matérielle
    elevation: 6,
    // Teinte de l'ombre portée sous iOS
    shadowColor: colors.forest,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
  // Typographie du texte inscrit dans le bouton flottant
  fabText: {
    // Texte blanc contrasté sur fond vert
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
