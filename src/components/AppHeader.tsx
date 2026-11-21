/**
 * FICHIER : src/components/AppHeader.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-041
 * COMPOSANT : AppHeader (Barre d'En-Tête Universelle)
 *
 * RÔLE DU COMPOSANT :
 * Barre supérieure commune à tous les écrans de l'application :
 * - À gauche (ou à droite en RTL) :
 *   - Si `back === true` : bouton retour avec chevron dynamique (‹ en LTR, › en RTL).
 *   - Sinon : bouton burger 'menu' ouvrant le tiroir de navigation latéral (`useDrawer().open()`).
 * - Au centre : titre de l'écran en vert forêt foncé (`colors.forest`), tronqué si nécessaire.
 * - À droite (ou à gauche en RTL) : raccourci d'accès au profil utilisateur / admin (`person-circle-outline`).
 * - Si `plain === true` (écrans de login, inscription, félicitations) : aucun bouton affiché.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * En-tête aéré de 56px de hauteur avec alignement parfait et gestion bidirectionnelle LTR/RTL.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
// Constantes de thème (couleurs écologiques)
import { colors } from '@/constants/theme';
// Hook d'authentification pour connaître le rôle de l'utilisateur
import { useAuth } from '@/utils/auth';
// Accès au store global Masrouf pour le badge de notifications
import { useStore } from '@/state/store';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';
// Contexte du menu tiroir latéral
import { useDrawer } from './DrawerContext';

/**
 * Propriétés du composant AppHeader.
 */
interface Props {
  /** Libellé du titre affiché au centre de la barre d'en-tête */
  title: string;
  /** Afficher une flèche de retour au lieu du bouton de menu */
  back?: boolean;
  /** Action personnalisée de retour arrière (remplace router.back() si fournie) */
  onBack?: () => void;
  /** Mode épuré sans menu ni bouton de profil (ex: connexion, inscription) */
  plain?: boolean;
}

/**
 * Composant de barre d'en-tête de page.
 */
export function AppHeader({ title, back, onBack, plain }: Props) {
  // Instance du routeur Expo Router pour la navigation impérative (back, push, replace)
  const router = useRouter();
  // Méthode d'ouverture du menu tiroir latéral gauche via le contexte global
  const { open } = useDrawer();
  // Rôle de l'utilisateur connecté (permet d'orienter vers les réglages admin ou utilisateur)
  const { isAdmin } = useAuth();
  // Décompte réactif des notifications non lues pour alimenter la pastille rouge (badge)
  const { unreadNotificationsCount } = useStore();
  // Outils de traduction multilingue et indicateur d'inversion bidirectionnelle RTL
  const { t, isRTL } = useTranslation();
  // Largeur physique de l'écran pour adapter les tailles de polices sur petits appareils
  const { width } = useWindowDimensions();
  // Détection des écrans étroits (<360px) pour éviter les débordements textuels
  const isSmall = width < 360;

  /**
   * Action : retour en arrière ou retour à l'accueil si aucune route historique.
   */
  const goBack = () => {
    // 1. Exécution du rappel personnalisé s'il est défini
    if (onBack) {
      onBack();
    // 2. Navigation vers la page précédente dans l'historique si possible
    } else if (router.canGoBack()) {
      router.back();
    // 3. Repli de sécurité : redirection vers l'écran d'accueil des onglets
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  return (
    <View
      style={[
        // Conteneur en ligne alignant les éléments horizontalement (flexDirection dynamique LTR/RTL)
        styles.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      {/* 1. Bouton d'action gauche : Retour ou Burger Menu */}
      {plain ? null : (
        <Pressable
          onPress={back ? goBack : open}
          hitSlop={12}
          style={styles.slot}
          accessibilityRole="button"
          accessibilityLabel={back ? t('retour') : t('ouvrir_menu')}
        >
          <Ionicons
            name={
              back
                ? isRTL
                  ? 'chevron-forward'
                  : 'chevron-back'
                : 'menu'
            }
            size={24}
            color={colors.forest}
          />
        </Pressable>
      )}

      {/* 2. Titre centré ou aligné de l'écran avec adaptation dynamique de taille */}
      <Text
        style={[
          // Style typographique du titre principal avec écriture bidirectionnelle
          styles.title,
          {
            fontSize: isSmall ? 18 : 22,
            lineHeight: isSmall ? 26 : 32,
            textAlign: isRTL ? 'right' : 'left',
            writingDirection: isRTL ? 'rtl' : 'ltr',
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {title}
      </Text>

      {/* 3. Boutons d'action droits : Notifications et Profil */}
      {plain ? null : (
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
          {/* Bouton cloche des notifications avec badge d'alertes non lues */}
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={8}
            style={styles.slot}
            accessibilityRole="button"
            accessibilityLabel={t('notifications')}
          >
            <Ionicons
              name={unreadNotificationsCount > 0 ? 'notifications' : 'notifications-outline'}
              size={22}
              color={colors.forest}
            />
            {unreadNotificationsCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  backgroundColor: colors.coral,
                  borderRadius: 7,
                  minWidth: 15,
                  height: 15,
    // Alignement vertical centré des icônes et du texte
                  alignItems: 'center',
    // Centrage horizontal et vertical de l'icône vectorielle
                  justifyContent: 'center',
                  paddingHorizontal: 2,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </Text>
              </View>
            )}
          </Pressable>

          {/* Bouton profil & réglages - dirige vers les réglages universels */}
          <Pressable
            onPress={() => router.navigate('/(tabs)/reglages' as never)}
            hitSlop={8}
            style={styles.slot}
            accessibilityRole="button"
            accessibilityLabel={t('profil_et_reglages')}
          >
            <Ionicons
              name="person-circle-outline"
              size={24}
              color={colors.forest}
            />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Ligne horizontale contenant l'en-tête de page
  row: {
    // Alignement vertical centré des icônes et du texte
    alignItems: 'center',
    // Hauteur minimale standardisée de 56px assurant une zone tactile confortable
    minHeight: 56,
    // Espacement régulier de 8px entre les boutons et le titre
    gap: 8,
  },
  // Zone réservée pour les boutons d'action cliquables (32x32)
  slot: {
    // Largeur fixe de la case
    width: 32,
    // Hauteur fixe de la case
    height: 32,
    // Alignement vertical centré des icônes et du texte
    alignItems: 'center',
    // Centrage horizontal et vertical de l'icône vectorielle
    justifyContent: 'center',
  },
  // Style typographique du titre de page
  title: {
    // Occupe tout l'espace disponible entre les boutons gauche et droite
    flex: 1,
    // Taille de police généreuse pour une visibilité optimale
    fontSize: 22,
    // Hauteur de ligne proportionnelle
    lineHeight: 32,
    // Graisse semi-grasse élégante
    fontWeight: '600',
    // Teinte vert forêt emblématique de Masrouf
    color: colors.forest,
  },
});
