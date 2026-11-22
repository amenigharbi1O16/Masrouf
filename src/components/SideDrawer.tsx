/**
 * FICHIER : src/components/SideDrawer.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-051
 * COMPOSANT : SideDrawer (Menu Tiroir Coulissant Universel avec Support RTL)
 *
 * RÔLE DU COMPOSANT :
 * Composant de navigation latérale coulissante avec rideau translucide pour les profils Administrateur et Utilisateur :
 * - Animation fluide d'entrée et de sortie (glisse depuis la gauche en FR/EN, depuis la droite en AR).
 * - En-tête avec avatar, nom du profil, badge de rôle et feuille décorative Masrouf.
 * - Liste des options de menu avec icônes IonIcons et état actif mis en valeur.
 * - Pied de menu avec sélecteur de langue trilingue et bouton de déconnexion stylisé.
 * - Adaptabilité totale aux petits et grands écrans avec défilement tactile au curseur.
 *
 * IMPACT DANS L'INTERFACE UTILISATEUR :
 * Offre un accès rapide à toutes les rubriques de l'application sans encombrer la zone d'affichage principale.
 */

// ============================================================================
// IMPORTS ET DÉPENDANCES TECHNIQUES DU TIROIR LATÉRAL
// ============================================================================

// Icônes vectorielles IonIcons pour les rubriques de navigation, avatars et déconnexion
import { Ionicons } from '@expo/vector-icons';
// Logo officiel Masrouf vectoriel botanique
import { MasroufLogo } from '@/components/MasroufLogo';
// Hooks de navigation et détection d'URL active d'Expo Router
import { usePathname, useRouter } from 'expo-router';
// React core, hooks d'effets, références d'animation et état local de montage
import React, { useEffect, useRef, useState } from 'react';
// Primitifs d'animation, modales plein écran, défilement et détection de plateforme
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
// Gestion des zones de sécurité (notch, barre d'accueil iOS/Android)
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Tokens visuels du thème Masrouf : vert forêt, blanc, menthe
import { colors } from '@/constants/theme';
// Contexte d'authentification pour accéder au profil utilisateur, rôle et déconnexion
import { useAuth } from '@/utils/auth';
// Constantes de langues disponibles et hook d'internationalisation bidirectionnel RTL/LTR
import { LANGUES_DISPONIBLES, useTranslation } from '@/utils/i18n';
// Contexte d'ouverture et fermeture du tiroir partagé dans l'arbre React
import { useDrawer } from './DrawerContext';
// Sélecteur de langue réutilisable intégré dans le pied du tiroir
import { LanguageSelector } from './LanguageSelector';

// ============================================================================
// INTERFACE DE CONFIGURATION DES LIENS DE NAVIGATION
// ============================================================================

/**
 * Interface décrivant un élément individuel cliquable dans le tiroir de navigation.
 */
export interface DrawerItem {
  // Libellé textuel affiché à l'utilisateur (ex: "Tableau de bord", "Utilisateurs")
  label: string;
  // Nom de l'icône vectorielle IonIcons associée (ex: "grid-outline", "people-outline")
  icon: keyof typeof Ionicons.glyphMap;
  // Chemin de redirection interne dans l'arborescence Expo Router (ex: "/(admin)/dashboard")
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
  const { user, logout, isAdmin, isChild } = useAuth();
  const isChildUser = isChild || user?.role === 'child' || user?.accountType === 'child';

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

  // Hauteur et espacement adaptatifs des boutons de menu selon le nombre d'éléments, le rôle et la hauteur d'écran
  // Pour l'utilisateur (!isAdmin), boutons légèrement plus hauts et plus espacés pour une lisibilité optimale
  const itemMinHeight = !isAdmin
    ? (isShortScreen ? 48 : 52)
    : (isShortScreen || items.length >= 8 ? 42 : 46);
  // Espacement vertical harmonieux entre les items
  const itemGap = !isAdmin
    ? (isShortScreen ? 7 : 9)
    : (isShortScreen || items.length >= 8 ? 6 : 8);
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
              {/* En-tête : Titre de l'application et logo feuille (taille de police 26px pour l'utilisateur) */}
              <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Titre textuel de l'application */}
                <Text style={[styles.brand, !isAdmin && styles.userBrand]}>{t('nom_app')}</Text>
                {/* Logo officiel Masrouf vectoriel en variante menthe */}
                <MasroufLogo size={!isAdmin ? 28 : 24} variant="mint" />
              </View>

              {/* Profil : Avatar (bouclier pour admin), nom complet et badge de rôle clairement affiché */}
              <View
                style={[
                  styles.profile,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  isShortScreen && { marginTop: 12 },
                ]}
              >
                {/* Cadre de l'avatar avec dimension confortable pour l'utilisateur */}
                <View
                  style={[
                    styles.avatarWrapper,
                    isAdmin ? styles.adminAvatarWrapper : styles.userAvatarWrapper,
                  ]}
                >
                  <Ionicons
                    name={isAdmin ? 'shield-checkmark' : (isChildUser ? 'sparkles' : 'person-circle')}
                    size={isAdmin ? 24 : 36}
                    color={colors.mint}
                  />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {/* Nom d'utilisateur (police rehaussée à 18px pour l'utilisateur régulier) */}
                  <Text
                    style={[
                      styles.name,
                      !isAdmin && styles.userName,
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {user?.name || (isAdmin ? t('administrateur') : (isChildUser ? (t('compte_enfant') || 'Compte Enfant') : t('compte_personnel')))}
                  </Text>
                  {/* Badge de rôle avec typographie et espacement améliorés pour l'utilisateur */}
                  <View
                    style={[
                      styles.roleBadge,
                      !isAdmin && styles.userRoleBadge,
                      { alignSelf: isRTL ? 'flex-end' : 'flex-start' },
                      isAdmin && styles.adminRoleBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        !isAdmin && styles.userRoleBadgeText,
                        isAdmin && styles.adminRoleBadgeText,
                      ]}
                      numberOfLines={1}
                    >
                      {isChildUser ? (t('compte_enfant') || 'Compte Enfant') : subtitle}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Liste de tous les boutons de navigation affichés clairement */}
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
                      {/* Icône du bouton de menu (24px pour l'utilisateur) */}
                      <Ionicons
                        name={it.icon}
                        size={!isAdmin ? (isShortScreen ? 22 : 24) : (isShortScreen ? 20 : 22)}
                        color={on ? colors.mint : colors.white}
                        style={{ opacity: on ? 1 : 0.85 }}
                      />
                      {/* Libellé du menu : police légèrement augmentée pour lisibilité et clarté optimale */}
                      <Text
                        style={[
                          styles.itemText,
                          !isAdmin && styles.userItemText,
                          {
                            fontSize: !isAdmin
                              ? (isSmallScreen ? 15 : 16.5)
                              : (isSmallScreen ? 14 : 15.5),
                          },
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
              {/* Sélecteur rapide de langue (titre 12.5px pour l'utilisateur) */}
              <Text
                style={[
                  styles.langLabel,
                  !isAdmin && styles.userLangLabel,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('langue_label')}
              </Text>
              {/* Sélecteur de langue avec paramètre spécifique au tiroir utilisateur */}
              <LanguageSelector variant="drawer" isUserDrawer={!isAdmin} />

              {/* Bouton de déconnexion stylisé et distinct */}
              <Pressable
                onPress={() => {
                  close();
                  logout();
                }}
                style={[
                  styles.logout,
                  !isAdmin && styles.userLogout,
                  {
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    minHeight: !isAdmin ? (isShortScreen ? 42 : 46) : (isShortScreen ? 38 : 42),
                    marginTop: isShortScreen ? 10 : 14,
                  },
                ]}
                accessibilityRole="button"
              >
                {/* Icône de déconnexion */}
                <Ionicons
                  name="log-out-outline"
                  size={!isAdmin ? 22 : 20}
                  color={colors.white}
                  style={{ transform: [{ scaleX: isRTL ? -1 : 1 }] }}
                />
                {/* Libellé de déconnexion (16px pour l'utilisateur vs 14.5px admin) */}
                <Text style={[styles.logoutText, !isAdmin && styles.userLogoutText]}>
                  {t('se_deconnecter')}
                </Text>
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
  // Panneau principal coulissant vert forêt (#1B4332) occupant toute la hauteur d'écran
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.forest,
    overflow: 'hidden',
  },
  // Zone de défilement vertical avec support natif et curseur de souris pour le Web
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
  // Conteneur interne extensible garantissant la séparation entre en-tête et pied
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  // Ligne de marque au sommet associant le titre "MASROUF" et la feuille verte
  brandRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  // Typographie du logo Masrouf (25px en standard, 26px pour l'utilisateur)
  brand: { color: colors.white, fontSize: 25, fontWeight: '700' },
  // Bloc profil regroupant l'avatar, le nom complet et le badge de rôle
  profile: {
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    paddingHorizontal: 4,
  },
  // Cadre circulaire entourant l'avatar avec fond vert menthe translucide
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(217, 240, 228, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Cadre d'avatar spécifique administrateur avec bordure dorée/menthe
  adminAvatarWrapper: {
    backgroundColor: 'rgba(217, 240, 228, 0.22)',
    borderWidth: 1,
    borderColor: colors.mint,
  },
  // Nom de l'utilisateur connecté affiché en blanc bold
  name: { color: colors.white, fontSize: 17, fontWeight: '600' },
  // Badge rectangulaire stylisé sous le nom indiquant le rôle
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(217, 240, 228, 0.12)',
  },
  // Variante renforcée du badge pour l'administrateur système
  adminRoleBadge: {
    backgroundColor: 'rgba(217, 240, 228, 0.24)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(217, 240, 228, 0.4)',
  },
  // Typographie du badge de rôle en vert menthe
  roleBadgeText: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Texte blanc renforcé pour le rôle administrateur
  adminRoleBadgeText: {
    color: colors.white,
    fontWeight: '700',
  },
  // Bouton de menu individuel avec espacement tactile confortable et coins arrondis
  item: {
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  // État actif du bouton de menu : fond translucide et liseré vertical menthe
  itemActive: {
    backgroundColor: 'rgba(217, 240, 228, 0.20)',
    borderLeftColor: colors.mint,
    borderRightColor: colors.mint,
  },
  // Libellé textuel de menu (15.5px admin, rehaussé à 16.5px pour l'utilisateur)
  itemText: { color: colors.white, fontSize: 15.5, flex: 1, minWidth: 0 },
  // Mise en gras blanc de la rubrique actuellement consultée
  itemTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  // Pied du tiroir séparé par un trait fin regroupant langue et déconnexion
  footer: {
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(217, 240, 228, 0.25)',
  },
  // Titre informatif au-dessus des boutons de sélection de langue
  langLabel: {
    color: colors.mint,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
  // Bouton de déconnexion stylisé en rouge corail translucide d'avertissement
  logout: {
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 119, 112, 0.16)',
  },
  // Libellé de déconnexion en blanc bold (16px pour l'utilisateur)
  logoutText: { color: colors.white, fontSize: 15.5, fontWeight: '600' },
  // Typographie, espacements et arrondis optimisés spécifiquement pour le tiroir utilisateur
  userBrand: { fontSize: 26, fontWeight: '800' },
  // Cadre d'avatar élargi à 48px pour le profil utilisateur
  userAvatarWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(217, 240, 228, 0.16)',
  },
  // Nom d'utilisateur rehaussé à 18px pour une lisibilité optimale
  userName: { fontSize: 18, fontWeight: '700' },
  // Badge de rôle avec marges ajustées pour le profil utilisateur
  userRoleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  // Texte de rôle rehaussé à 12.5px pour l'utilisateur
  userRoleBadgeText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  // Police de menu rehaussée à 16.5px pour l'utilisateur
  userItemText: {
    fontSize: 16.5,
    fontWeight: '500',
  },
  // Titre de sélecteur de langue rehaussé à 12.5px pour l'utilisateur
  userLangLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  // Bouton de déconnexion utilisateur avec dimensions généreuses
  userLogout: {
    paddingVertical: 10,
    borderRadius: 12,
  },
  // Texte de déconnexion utilisateur rehaussé à 16px
  userLogoutText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
