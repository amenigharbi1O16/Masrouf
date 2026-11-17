import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { LANGUES_DISPONIBLES, useTranslation } from '@/utils/i18n';
import { useDrawer } from './DrawerContext';
import { LanguageSelector } from './LanguageSelector';

/** Interface décrivant chaque lien du menu du tiroir */
export interface DrawerItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
}

/**
 * 🎯 COMPOSANT : SideDrawer (`src/components/SideDrawer.tsx`)
 * 📌 Mission : Tiroir de navigation latéral coulissant pour Administrateur et Utilisateur.
 * 👁️ Ce que l'administrateur ou l'utilisateur voit à l'écran :
 *    - Un voile sombre semi-transparent qui assombrit l'arrière-plan de l'application.
 *    - Le volet latéral vert forêt qui glisse avec fluidité depuis le bord (gauche en français/anglais, droite en arabe).
 *    - Le logo "MASROUF" avec une feuille vert menthe au sommet.
 *    - Le profil complet avec avatar dédié (bouclier pour l'administrateur), nom et badge de rôle stylisé.
 *    - Les 8 boutons de menu pour l'administrateur avec icônes distinctes et mise en surbrillance de la page active.
 *    - Le sélecteur de langue rapide pour basculer facilement en Arabe (RTL), Français ou Anglais.
 *    - Le bouton de déconnexion clair et sécurisé.
 *    - Défilement fluide au curseur (molette de souris, barre de défilement visible, touch/drag) adapté à toutes les tailles de téléphone.
 */
export function SideDrawer({ items, subtitle }: { items: DrawerItem[]; subtitle: string }) {
  // Contexte global pour savoir si le tiroir est ouvert ou fermé, et fonction de fermeture
  const { visible, close } = useDrawer();

  // Données de l'utilisateur connecté, statut administrateur et fonction de déconnexion
  const { user, logout, isAdmin } = useAuth();

  // Traduction et gestion de l'alignement RTL pour l'arabe
  const { t, isRTL, langue } = useTranslation();

  // Outils de navigation d'Expo Router
  const router = useRouter();
  const pathname = usePathname();

  // Marges de sécurité pour éviter l'encoche du haut et la barre du bas
  const insets = useSafeAreaInsets();

  // Dimensions dynamiques de l'écran : largeur et hauteur
  const { width, height } = useWindowDimensions();

  // Largeur adaptative du tiroir : proportionnelle (80%) avec bornes responsive (260px - 340px)
  // garantissant un affichage parfait sur les petits écrans (iPhone SE 320px), les grands téléphones (430px) et tablettes
  const drawerW = Math.min(Math.max(Math.round(width * 0.80), 260), 340);

  // Détection des écrans courts (hauteur < 750px comme iPhone SE / 8) et des écrans étroits (< 360px)
  const isShortScreen = height < 750;
  const isSmallScreen = width < 360;

  // Hauteur et espacement adaptatifs des boutons de menu selon le nombre d'éléments et la hauteur d'écran
  const itemMinHeight = isShortScreen || items.length >= 8 ? 42 : 46;
  const itemGap = isShortScreen || items.length >= 8 ? 6 : 8;
  const menuMarginTop = isShortScreen ? 14 : 20;

  // Position hors-champ : à gauche (-drawerW) pour LTR, à droite (+drawerW) pour RTL
  const hiddenX = isRTL ? drawerW : -drawerW;

  // Variables animées pour la translation horizontale (x) et le fondu sombre (fade)
  const x = useRef(new Animated.Value(hiddenX)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);
  const wasVisible = useRef(false);

  /**
   * 🎬 Cycle d'animation du tiroir :
   * - À l'ouverture : fait glisser le tiroir en 200ms et assombrit l'arrière-plan.
   * - Si déjà ouvert lors d'un changement de langue : reste ouvert à x=0 de manière fluide sans clignotement.
   * - À la fermeture : fait glisser le tiroir en sens inverse puis démonte le composant.
   */
  useEffect(() => {
    // Variable indiquant l'activation du pilote natif (désactivé sur Web pour éviter les avertissements console)
    const useNativeDriver = Platform.OS !== 'web';

    if (visible) {
      if (!wasVisible.current) {
        // Ouverture initiale : glisse depuis le bord masqué
        wasVisible.current = true;
        setMounted(true);
        x.setValue(hiddenX);
        Animated.parallel([
          Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver }),
          Animated.timing(fade, { toValue: 0.25, duration: 200, useNativeDriver }),
        ]).start();
      } else {
        // Déjà ouvert pendant le changement de langue en direct :
        // Maintien instantané et stable sans repli ni clignotement
        x.setValue(0);
        fade.setValue(0.25);
      }
    } else if (wasVisible.current) {
      // Fermeture du tiroir
      wasVisible.current = false;
      Animated.parallel([
        Animated.timing(x, { toValue: hiddenX, duration: 180, useNativeDriver }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver }),
      ]).start(() => setMounted(false));
    }
  }, [visible, hiddenX]);

  // Si le tiroir est fermé et non monté, aucun composant n'est rendu pour économiser la mémoire
  if (!mounted) return null;

  /** Action de navigation : ferme le tiroir puis redirige vers l'écran demandé */
  const go = (href: string) => {
    close();
    router.navigate(href as never);
  };

  /** Détecte si un lien du menu correspond à la page actuellement affichée pour la surligner */
  const active = (href: string) => {
    if (href === '/' || href === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    const clean = href.replace('/(admin)/', '').replace('/(tabs)/', '');
    return pathname.includes(clean);
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={close} statusBarTranslucent>
      <View style={StyleSheet.absoluteFill}>
        {/* Voile sombre d'arrière-plan : un clic dessus referme le tiroir */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.forest, opacity: fade }]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
        </Animated.View>

        {/* Panneau coulissant du tiroir */}
        <Animated.View
          style={[
            styles.drawer,
            isRTL
              ? {
                right: 0,
                left: undefined,
                borderTopLeftRadius: 24,
                borderBottomLeftRadius: 24,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
              }
              : {
                left: 0,
                right: undefined,
                borderTopRightRadius: 24,
                borderBottomRightRadius: 24,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
              },
            {
              width: drawerW,
              transform: [{ translateX: x }],
            },
          ]}
        >
          {/* Défilement avec barre de défilement visible et déplaçable au curseur (souris, molette, touch) */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(insets.top + (isShortScreen ? 12 : 16), 20),
                paddingBottom: Math.max(insets.bottom + (isShortScreen ? 14 : 20), 24),
              },
            ]}
            showsVerticalScrollIndicator={true}
            persistentScrollbar={true}
            bounces={true}
            keyboardShouldPersistTaps="handled"
          >
            <View>
              {/* En-tête : Titre de l'application et logo feuille */}
              <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={styles.brand}>{t('nom_app')}</Text>
                <Ionicons name="leaf" size={24} color={colors.mint} />
              </View>

              {/* Profil : Avatar (bouclier pour admin), nom complet et badge de rôle clairement affiché */}
              <View
                style={[
                  styles.profile,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  isShortScreen && { marginTop: 12 },
                ]}
              >
                <View style={[styles.avatarWrapper, isAdmin && styles.adminAvatarWrapper]}>
                  <Ionicons
                    name={isAdmin ? 'shield-checkmark' : 'person-circle'}
                    size={isAdmin ? 24 : 34}
                    color={colors.mint}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[styles.name, { textAlign: isRTL ? 'right' : 'left' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {user?.name || (isAdmin ? t('administrateur') : t('compte_personnel'))}
                  </Text>
                  <View
                    style={[
                      styles.roleBadge,
                      { alignSelf: isRTL ? 'flex-end' : 'flex-start' },
                      isAdmin && styles.adminRoleBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        isAdmin && styles.adminRoleBadgeText,
                      ]}
                      numberOfLines={1}
                    >
                      {subtitle}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Liste de tous les boutons de navigation (8 boutons pour admin) affichés clairement */}
              <View style={{ gap: itemGap, marginTop: menuMarginTop }}>
                {items.map((it) => {
                  const on = active(it.href);
                  return (
                    <Pressable
                      key={it.href}
                      onPress={() => go(it.href)}
                      style={[
                        styles.item,
                        {
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          minHeight: itemMinHeight,
                        },
                        on && [
                          styles.itemActive,
                          {
                            borderLeftWidth: !isRTL ? 4 : 0,
                            borderRightWidth: isRTL ? 4 : 0,
                          },
                        ],
                      ]}
                      accessibilityRole="button"
                    >
                      <Ionicons
                        name={it.icon}
                        size={isShortScreen ? 20 : 22}
                        color={on ? colors.mint : colors.white}
                        style={{ opacity: on ? 1 : 0.85 }}
                      />
                      <Text
                        style={[
                          styles.itemText,
                          { fontSize: isSmallScreen ? 13 : 14.5 },
                          on && styles.itemTextActive,
                          { textAlign: isRTL ? 'right' : 'left' },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {it.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Pied du tiroir : Sélecteur de langue et déconnexion */}
            <View style={[styles.footer, isShortScreen && { marginTop: 14, paddingTop: 8 }]}>
              {/* Sélecteur rapide de langue */}
              <Text style={[styles.langLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                {t('langue_label')}
              </Text>
              <LanguageSelector variant="drawer" />

              {/* Bouton de déconnexion stylisé et distinct */}
              <Pressable
                onPress={() => {
                  close();
                  logout();
                }}
                style={[
                  styles.logout,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    minHeight: isShortScreen ? 38 : 42,
                    marginTop: isShortScreen ? 10 : 14,
                  },
                ]}
                accessibilityRole="button"
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={colors.white}
                  style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                />
                <Text style={styles.logoutText}>{t('se_deconnecter')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

/** Styles graphiques du tiroir, typographie et dimensions */
const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.forest,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    ...(Platform.OS === 'web'
      ? {
          overflowY: 'auto' as never,
          scrollbarWidth: 'thin' as never,
        }
      : {}),
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  brand: { color: colors.white, fontSize: 24, fontWeight: '700' },
  profile: {
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(217, 240, 228, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarWrapper: {
    backgroundColor: 'rgba(217, 240, 228, 0.22)',
    borderWidth: 1,
    borderColor: colors.mint,
  },
  name: { color: colors.white, fontSize: 16, fontWeight: '600' },
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(217, 240, 228, 0.12)',
  },
  adminRoleBadge: {
    backgroundColor: 'rgba(217, 240, 228, 0.24)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(217, 240, 228, 0.4)',
  },
  roleBadgeText: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  adminRoleBadgeText: {
    color: colors.white,
    fontWeight: '700',
  },
  item: {
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  itemActive: {
    backgroundColor: 'rgba(217, 240, 228, 0.20)',
    borderLeftColor: colors.mint,
    borderRightColor: colors.mint,
  },
  itemText: { color: colors.white, fontSize: 14.5, flex: 1, minWidth: 0 },
  itemTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(217, 240, 228, 0.25)',
  },
  langLabel: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  logout: {
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 119, 112, 0.16)',
  },
  logoutText: { color: colors.white, fontSize: 14.5, fontWeight: '600' },
});
