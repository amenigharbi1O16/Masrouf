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
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  title: string;
  /** Afficher une flèche de retour au lieu du bouton de menu */
  back?: boolean;
  onBack?: () => void;
  /** Mode épuré sans menu ni bouton de profil (ex: connexion, inscription) */
  plain?: boolean;
}

/**
 * Composant de barre d'en-tête de page.
 */
export function AppHeader({ title, back, onBack, plain }: Props) {
  const router = useRouter();
  const { open } = useDrawer();
  const { isAdmin } = useAuth();
  const { unreadNotificationsCount } = useStore();
  const { t, isRTL } = useTranslation();

  /**
   * Action : retour en arrière ou retour à l'accueil si aucune route historique.
   */
  const goBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as never);
    }
  };

  return (
    <View
      style={[
        styles.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      {/* 1. Bouton d'action gauche : Retour ou Burger Menu */}
      {plain ? (
        <View style={styles.slot} />
      ) : (
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

      {/* 2. Titre centré de l'écran */}
      <Text
        style={[
          styles.title,
          { textAlign: isRTL ? 'right' : 'left' },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* 3. Boutons d'action droits : Notifications et Profil */}
      {plain ? (
        <View style={styles.slot} />
      ) : (
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
                  alignItems: 'center',
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

          {/* Bouton profil & réglages */}
          <Pressable
            onPress={() =>
              router.navigate(
                (isAdmin ? '/(admin)/reglages' : '/(tabs)/reglages') as never
              )
            }
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
  row: {
    alignItems: 'center',
    minHeight: 56,
    gap: 8,
  },
  slot: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 22,
    lineHeight: 32,
    fontWeight: '600',
    color: colors.forest,
  },
});
