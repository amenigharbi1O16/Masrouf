// ============================================================
// FICHIER : src/components/AppDrawer.tsx
// RÔLE    : Tiroir de navigation latéral (Drawer) conforme au
//           design Figma de Masrouf.
//
// FONCTIONNEMENT :
//   - Fond vert forêt (#102B27) avec le logo MASROUF en haut.
//   - Affiche le nom et email de l'utilisateur connecté.
//   - 5 items de navigation : Accueil, Produits, Calendrier,
//     Analyses, Paramètres — l'item actif a un fond vert profond.
//   - En bas : sélecteur de langue (EN / FR / العربية) + déconnexion.
//   - Ouverture depuis la gauche (LTR) ou la droite (RTL/arabe).
//   - Largeur ≈ 78 % de l'écran (304 / 390 dans le design).
//
// ANIMATION :
//   - Slide-in 220 ms ease-out à l'entrée, 180 ms ease-in à la sortie.
//   - Overlay semi-transparent derrière le drawer.
// ============================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  I18nManager,
  TouchableWithoutFeedback,
} from 'react-native';
import { router, useSegments } from 'expo-router';

// Design System et internationalisation
import { Theme } from '../constants/theme';
import { useAuth } from '../utils/auth';
import { useTranslation, Langue } from '../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.round(SCREEN_WIDTH * 0.78);

// Icônes simples en texte pour correspondre au style Figma (outline)
const NAV_ITEMS = [
  { key: 'accueil', route: '/(tabs)', icon: '⌂' },
  { key: 'produits', route: '/(tabs)/produits', icon: '☐' },
  { key: 'calendrier', route: '/(tabs)/calendrier', icon: '▦' },
  { key: 'analyses', route: '/(tabs)/analyses', icon: '⫻' },
  { key: 'parametres', route: '/(tabs)/reglages', icon: '✲' },
] as const;

interface AppDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export default function AppDrawer({ visible, onClose }: AppDrawerProps) {
  const { user, logout } = useAuth();
  const { t, langue: locale, changerLangue } = useTranslation();
  const segments = useSegments();

  // Animation du drawer
  const slideAnim = useRef(new Animated.Value(0)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayAnim]);

  // Calcul de la translation selon la direction (RTL = depuis la droite)
  const isRTL = I18nManager.isRTL;
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: isRTL ? [DRAWER_WIDTH, 0] : [-DRAWER_WIDTH, 0],
  });

  // Déterminer l'onglet actif d'après les segments de route
  const activeSegment = segments[1] as string | undefined;

  function navigateTo(route: string) {
    onClose();
    // Petit délai pour laisser l'animation de fermeture se jouer
    setTimeout(() => {
      router.replace(route as any);
    }, 100);
  }

  function handleLangChange(lang: 'fr' | 'en' | 'ar') {
    if (locale !== lang) {
      changerLangue(lang);
    }
  }

  function handleLogout() {
    onClose();
    setTimeout(() => {
      logout();
    }, 150);
  }

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Overlay semi-transparent (ferme le drawer au clic) */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.4] }) },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Contenu du Drawer */}
      <Animated.View
        style={[
          styles.drawer,
          isRTL ? styles.drawerRight : styles.drawerLeft,
          { width: DRAWER_WIDTH, transform: [{ translateX }] },
        ]}
      >
        {/* ── EN-TÊTE : Logo + icône feuille ── */}
        <View style={styles.header}>
          <Text style={styles.logo}>MASROUF</Text>
          <Text style={styles.leafIcon}>🍃</Text>
        </View>

        {/* ── PROFIL UTILISATEUR ── */}
        <View style={styles.profileSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.nom?.charAt(0)?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.nom ?? ''}</Text>
            <Text style={styles.profileSub}>{t('compte_personnel')}</Text>
          </View>
        </View>

        {/* ── ITEMS DE NAVIGATION ── */}
        <View style={styles.navSection}>
          {NAV_ITEMS.map((item) => {
            // Déterminer si cet item est actif
            let isActive = false;
            if (item.key === 'accueil') {
              isActive = activeSegment === undefined || activeSegment === 'index';
            } else if (item.key === 'parametres') {
              isActive = activeSegment === 'reglages';
            } else {
              isActive = activeSegment === item.key;
            }

            return (
              <TouchableOpacity
                key={item.key}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => navigateTo(item.route)}
                activeOpacity={0.7}
              >
                <Text style={[styles.navIcon, isActive && styles.navIconActive]}>
                  {item.icon}
                </Text>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                  {t(item.key)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── ESPACE FLEXIBLE ── */}
        <View style={{ flex: 1 }} />

        {/* ── SÉLECTEUR DE LANGUE ── */}
        <View style={styles.langSection}>
          <Text style={styles.langTitle}>{t('langue').toUpperCase()}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity onPress={() => handleLangChange('en')}>
              <Text
                style={[
                  styles.langOption,
                  locale === 'en' && styles.langOptionActive,
                ]}
              >
                English
              </Text>
            </TouchableOpacity>
            <Text style={styles.langSep}>/</Text>
            <TouchableOpacity onPress={() => handleLangChange('fr')}>
              <Text
                style={[
                  styles.langOption,
                  locale === 'fr' && styles.langOptionActive,
                ]}
              >
                Français
              </Text>
            </TouchableOpacity>
            <Text style={styles.langSep}>/</Text>
            <TouchableOpacity onPress={() => handleLangChange('ar')}>
              <Text
                style={[
                  styles.langOption,
                  locale === 'ar' && styles.langOptionActive,
                ]}
              >
                العربية
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── DÉCONNEXION ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>→</Text>
          <Text style={styles.logoutText}>{t('se_deconnecter')}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill as any,
    backgroundColor: '#000000',
    zIndex: 90,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: Theme.colors.drawerBg,
    zIndex: 100,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  drawerLeft: {
    left: 0,
  },
  drawerRight: {
    right: 0,
  },

  // En-tête
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.drawerText,
    letterSpacing: 1,
  },
  leafIcon: {
    fontSize: 20,
  },

  // Profil
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Theme.colors.drawerText,
    fontSize: 16,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: Theme.colors.drawerText,
    fontSize: 15,
    fontWeight: '700',
  },
  profileSub: {
    color: Theme.colors.drawerMuted,
    fontSize: 12,
    marginTop: 2,
  },

  // Navigation
  navSection: {
    gap: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Theme.radius.md,
    gap: 14,
  },
  navItemActive: {
    backgroundColor: Theme.colors.drawerActive,
  },
  navIcon: {
    fontSize: 18,
    color: Theme.colors.drawerMuted,
    width: 24,
    textAlign: 'center',
  },
  navIconActive: {
    color: Theme.colors.drawerText,
  },
  navLabel: {
    fontSize: 15,
    color: Theme.colors.drawerMuted,
    fontWeight: '500',
  },
  navLabelActive: {
    color: Theme.colors.drawerText,
    fontWeight: '700',
  },

  // Langue
  langSection: {
    marginBottom: 24,
  },
  langTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.drawerMuted,
    letterSpacing: 1,
    marginBottom: 8,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  langOption: {
    fontSize: 13,
    color: Theme.colors.drawerMuted,
    fontWeight: '500',
  },
  langOptionActive: {
    color: Theme.colors.drawerText,
    fontWeight: '700',
  },
  langSep: {
    color: Theme.colors.drawerMuted,
    fontSize: 13,
    marginHorizontal: 4,
  },

  // Déconnexion
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  logoutIcon: {
    fontSize: 16,
    color: Theme.colors.drawerMuted,
  },
  logoutText: {
    fontSize: 14,
    color: Theme.colors.drawerMuted,
    fontWeight: '500',
  },
});
