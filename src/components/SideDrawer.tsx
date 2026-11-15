import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
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
 * 📌 Mission : Tiroir de navigation latéral coulissant (Drawer Navigation).
 * 👁️ Ce que l'utilisateur voit à l'écran :
 *    - Un voile sombre semi-transparent qui assombrit l'arrière-plan de l'application.
 *    - Le volet latéral vert forêt qui glisse avec fluidité depuis le bord (gauche en français/anglais, droite en arabe).
 *    - Le logo "MASROUF" avec une feuille verte en haut.
 *    - La photo/icône de profil avec le prénom de l'utilisateur et son statut.
 *    - Les boutons de menu avec leurs icônes (ex: Tableau de bord, Catégories, Points, Réglages).
 *    - Le sélecteur de langue pour basculer facilement en Arabe ou Anglais.
 *    - Le bouton rouge/blanc "Se déconnecter" tout en bas.
 */
export function SideDrawer({ items, subtitle }: { items: DrawerItem[]; subtitle: string }) {
  // Contexte global pour savoir si le tiroir est ouvert ou fermé, et fonction de fermeture
  const { visible, close } = useDrawer();

  // Données de l'utilisateur connecté et fonction de déconnexion
  const { user, logout } = useAuth();

  // Traduction et gestion de l'alignement RTL pour l'arabe
  const { t, isRTL, langue } = useTranslation();

  // Outils de navigation d'Expo Router
  const router = useRouter();
  const pathname = usePathname();

  // Marges de sécurité pour éviter l'encoche du haut et la barre du bas
  const insets = useSafeAreaInsets();

  // Largeur de l'écran du smartphone : le tiroir occupe 78% de la largeur totale
  const { width } = useWindowDimensions();
  const drawerW = Math.round(width * 0.78);

  // Position hors-champ : à gauche (-drawerW) pour LTR, à droite (+drawerW) pour RTL
  const hiddenX = isRTL ? drawerW : -drawerW;

  // Variables animées pour la translation horizontale (x) et le fondu sombre (fade)
  const x = useRef(new Animated.Value(hiddenX)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  /**
   * 🎬 Cycle d'animation du tiroir :
   * - À l'ouverture : fait glisser le tiroir en 200ms et assombrit l'arrière-plan.
   * - À la fermeture : fait glisser le tiroir en sens inverse puis démonte le composant.
   */
  useEffect(() => {
    if (visible) {
      setMounted(true);
      x.setValue(hiddenX);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.25, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(x, { toValue: hiddenX, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, drawerW, hiddenX]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const nomLangue =
    LANGUES_DISPONIBLES.find((l) => l.code === langue)?.nomNatif ?? 'Français';

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
              ? { right: 0, borderTopLeftRadius: 24, borderBottomLeftRadius: 24 }
              : { left: 0, borderTopRightRadius: 24, borderBottomRightRadius: 24 },
            {
              width: drawerW,
              paddingTop: insets.top + 24,
              paddingBottom: insets.bottom + 24,
              transform: [{ translateX: x }],
            },
          ]}
        >
          {/* En-tête : Titre de l'application et logo feuille */}
          <View style={[styles.brandRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.brand}>MASROUF</Text>
            <Ionicons name="leaf" size={26} color={colors.mint} />
          </View>

          {/* Profil utilisateur : Avatar, nom complet et statut */}
          <View style={[styles.profile, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="person-circle" size={34} color={colors.mint} />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.name, { textAlign: isRTL ? 'right' : 'left' }]}
                numberOfLines={1}
              >
                {user?.name}
              </Text>
              <Text style={[styles.sub, { textAlign: isRTL ? 'right' : 'left' }]}>
                {subtitle}
              </Text>
            </View>
          </View>

          {/* Liste des boutons de navigation du menu */}
          <View style={{ gap: 11, marginTop: 28 }}>
            {items.map((it) => {
              const on = active(it.href);
              return (
                <Pressable
                  key={it.href}
                  onPress={() => go(it.href)}
                  style={[
                    styles.item,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    on && { backgroundColor: colors.green },
                  ]}
                  accessibilityRole="button"
                >
                  <Ionicons name={it.icon} size={22} color={colors.white} />
                  <Text style={[styles.itemText, on && { fontWeight: '600' }]}>{it.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Espaceur flexible pour pousser les réglages et la déconnexion vers le bas */}
          <View style={{ flex: 1 }} />

          {/* Sélecteur rapide de langue */}
          <Text style={[styles.langLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('langue_label')}
          </Text>
          <LanguageSelector variant="drawer" />

          {/* Bouton de déconnexion */}
          <Pressable
            onPress={() => {
              close();
              logout();
            }}
            style={[styles.logout, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.white} />
            <Text style={styles.logoutText}>{t('se_deconnecter')}</Text>
          </Pressable>
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
    paddingHorizontal: 20,
  },
  brandRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  brand: { color: colors.white, fontSize: 26, fontWeight: '700' },
  profile: {
    alignItems: 'center',
    gap: 12,
    marginTop: 28,
    paddingHorizontal: 4,
  },
  name: { color: colors.white, fontSize: 17, fontWeight: '600' },
  sub: { color: colors.mint, fontSize: 12 },
  item: {
    alignItems: 'center',
    gap: 14,
    height: 54,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  itemText: { color: colors.white, fontSize: 16 },
  langLabel: {
    color: colors.mint,
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 4,
  },
  lang: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  logout: {
    alignItems: 'center',
    gap: 14,
    marginTop: 28,
    paddingHorizontal: 4,
    height: 40,
  },
  logoutText: { color: colors.white, fontSize: 15, fontWeight: '500' },
});
