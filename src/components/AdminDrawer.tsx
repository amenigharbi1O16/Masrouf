// ============================================================
// FICHIER : src/components/AdminDrawer.tsx
// RÔLE    : Tiroir latéral de navigation pour l'espace Administrateur.
//           Conforme au design Figma : fond Forest Green (#102B27),
//           liens vers les 5 sections admin + retour espace utilisateur.
// ============================================================

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { Theme } from '../constants/theme';
import { useAuth } from '../utils/auth';
import { useTranslation, Langue } from '../utils/i18n';

interface AdminDrawerProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.78, 300);

export default function AdminDrawer({ visible, onClose }: AdminDrawerProps) {
  const { user, logout } = useAuth();
  const { t, langue, changerLangue } = useTranslation();
  const pathname = usePathname();

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -DRAWER_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateX, overlayOpacity]);

  const navItems = [
    { label: t('tableau_de_bord') ?? 'Vue d\'ensemble', route: '/(admin)/dashboard', icon: '📊' },
    { label: t('utilisateurs_admin') ?? 'Utilisateurs', route: '/(admin)/utilisateurs', icon: '👥' },
    { label: t('categories_admin') ?? 'Catégories', route: '/(admin)/categories', icon: '🏷️' },
    { label: t('regles_points_admin') ?? 'Règles des points', route: '/(admin)/points-regles', icon: '⭐' },
    { label: t('reglages_admin') ?? 'Paramètres admin', route: '/(admin)/reglages', icon: '⚙️' },
  ];

  function naviguerVers(route: string) {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  }

  async function handleLogout() {
    onClose();
    await logout();
    router.replace('/login');
  }

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Overlay semi-transparent */}
        <Animated.View
          style={[
            styles.overlay,
            { opacity: overlayOpacity },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        </Animated.View>

        {/* Panneau latéral du Drawer */}
        <Animated.View
          style={[
            styles.drawer,
            { transform: [{ translateX }] },
          ]}
        >
          {/* En-tête profil admin */}
          <View style={styles.profileSection}>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMINISTRATEUR</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.nom ?? 'Administrateur'}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {user?.email ?? 'admin@masrouf.tn'}
            </Text>
          </View>

          {/* Liste des rubriques administratives */}
          <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
            {navItems.map((item) => {
              const estActif = pathname.includes(item.route.replace('/(admin)/', ''));
              return (
                <TouchableOpacity
                  key={item.route}
                  style={[styles.navItem, estActif && styles.navItemActive]}
                  onPress={() => naviguerVers(item.route)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.navIcon}>{item.icon}</Text>
                  <Text style={[styles.navLabel, estActif && styles.navLabelActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Passerelle vers l'espace utilisateur personnel */}
            <TouchableOpacity
              style={styles.userSwitchBtn}
              onPress={() => naviguerVers('/(tabs)')}
              activeOpacity={0.7}
            >
              <Text style={styles.userSwitchIcon}>👤</Text>
              <Text style={styles.userSwitchText}>Espace Personnel</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Sélecteur de langue */}
          <View style={styles.langSelector}>
            {(['en', 'fr', 'ar'] as Langue[]).map((l) => (
              <TouchableOpacity
                key={l}
                style={[styles.langBtn, langue === l && styles.langBtnActive]}
                onPress={() => changerLangue(l)}
              >
                <Text style={[styles.langText, langue === l && styles.langTextActive]}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Déconnexion */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>{t('se_deconnecter') ?? 'Se déconnecter'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: Theme.colors.forest,
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  profileSection: {
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(217, 240, 228, 0.15)',
  },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(217, 240, 228, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Theme.radius.sm,
    marginBottom: 8,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Theme.colors.mint,
    letterSpacing: 0.8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.white,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 12,
    color: 'rgba(217, 240, 228, 0.65)',
  },
  navList: {
    flex: 1,
    paddingVertical: 14,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Theme.radius.md,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: 'rgba(217, 240, 228, 0.15)',
  },
  navIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  navLabel: {
    fontSize: 15,
    color: 'rgba(217, 240, 228, 0.75)',
    fontWeight: '500',
  },
  navLabelActive: {
    color: Theme.colors.white,
    fontWeight: '700',
  },
  userSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: Theme.radius.md,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(217, 240, 228, 0.12)',
  },
  userSwitchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  userSwitchText: {
    fontSize: 14,
    color: Theme.colors.mint,
    fontWeight: '600',
  },
  langSelector: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(217, 240, 228, 0.15)',
  },
  langBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  langBtnActive: {
    backgroundColor: Theme.colors.mint,
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(217, 240, 228, 0.75)',
  },
  langTextActive: {
    color: Theme.colors.forest,
  },
  logoutBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 14,
    color: Theme.colors.coral,
    fontWeight: '600',
  },
});
