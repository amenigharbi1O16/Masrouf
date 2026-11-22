/**
 * FICHIER : src/components/AdminDrawer.tsx
 * IDENTIFIANT : COMPOSANT-PARENT-DRAWER
 * RÔLE : Menu tiroir mobile unique du Parent / Administrateur familial
 *
 * DESCRIPTION DE LA FONCTION :
 * Affiche le tiroir latéral unique du parent avec 8 rubriques unifiées :
 * 1. Accueil (Tableau de bord et gestion financière)
 * 2. Enfants (Suivi des comptes enfants et allocations)
 * 3. Saisie rapide (Nouvelle dépense ou achat)
 * 4. Produits (Catalogue de courses et prix unitaires)
 * 5. Calendrier & Historique (Vue mensuelle des dépenses)
 * 6. Budgets & Analyses (Analyses globales et par enfant)
 * 7. Notifications (Alertes de dépassement)
 * 8. Réglages (Préférences personnelles et profil)
 *
 * EFFET VISUEL :
 * Volet vert forêt glissant avec avatar du parent, nom, badge "Parent",
 * la liste des 8 options avec icônes claires, le sélecteur de langue et la déconnexion.
 */

// Importation des icônes vectorielles Ionicons
import { Ionicons } from '@expo/vector-icons';
// Logo officiel Masrouf vectoriel botanique
import { MasroufLogo } from '@/components/MasroufLogo';
// Importation des hooks de navigation d'Expo Router
import { usePathname, useRouter } from 'expo-router';
// Importation de React et des hooks d'état et d'animation
import React, { useEffect, useRef, useState } from 'react';
// Importation des composants graphiques de React Native
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
// Importation du gestionnaire de marges de sécurité écran
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Importation de la charte graphique et des couleurs officielles
import { colors, radius, space, type } from '@/constants/theme';
// Importation du magasin de données global
import { useStore } from '@/state/store';
// Importation du hook d'authentification
import { useAuth } from '@/utils/auth';
// Importation du système de traduction trilingue
import { useTranslation } from '@/utils/i18n';
// Importation du contexte de contrôle du tiroir
import { useDrawer } from './DrawerContext';
// Importation du sélecteur de langue universel
import { LanguageSelector } from './LanguageSelector';

/**
 * MISSION DU COMPOSANT : AdminDrawer
 * Affiche le tiroir de navigation latéral réservé au rôle Parent.
 */
export function AdminDrawer() {
  // Récupération de l'état d'ouverture et de fermeture du tiroir
  const { visible, close } = useDrawer();
  // Récupération des informations du parent connecté et de la méthode de déconnexion
  const { user, logout } = useAuth();
  // Accès aux données globales en mémoire
  const { db } = useStore();
  // Fonctions de traduction et direction d'affichage droite-à-gauche
  const { t, isRTL } = useTranslation();
  // Outil de redirection de page
  const router = useRouter();
  // Récupération de l'adresse de la page actuelle
  const pathname = usePathname();
  // Marges de sécurité pour éviter l'encoche et la barre inférieure
  const insets = useSafeAreaInsets();
  // Récupération de la largeur et hauteur de l'écran du smartphone
  const { width } = useWindowDimensions();

  // Calcul de la largeur optimale du tiroir (environ 82% de l'écran)
  const drawerW = Math.min(Math.max(Math.round(width * 0.82), 270), 340);
  // Position horizontale de masquage adaptée au sens RTL ou LTR
  const hiddenX = isRTL ? drawerW : -drawerW;

  // Valeur animée de translation horizontale du tiroir
  const x = useRef(new Animated.Value(hiddenX)).current;
  // Valeur animée d'opacité du voile d'arrière-plan
  const fade = useRef(new Animated.Value(0)).current;
  // État local indiquant si le composant est monté dans l'arbre d'affichage
  const [mounted, setMounted] = useState(false);
  // Référence mémorisant l'état de visibilité précédent
  const wasVisible = useRef(false);

  // Effet d'animation à l'ouverture ou fermeture du tiroir
  useEffect(() => {
    // Activation du pilote natif sur mobile pour une fluidité maximale
    const useNativeDriver = Platform.OS !== 'web';
    // Si le tiroir doit s'afficher
    if (visible) {
      // Si le tiroir n'était pas encore visible
      if (!wasVisible.current) {
        // Enregistre que le tiroir est visible
        wasVisible.current = true;
        // Monte le modal à l'écran
        setMounted(true);
        // Positionne le panneau hors de l'écran
        x.setValue(hiddenX);
        // Lance les animations de glissement et de fondu en parallèle
        Animated.parallel([
          Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver }),
          Animated.timing(fade, { toValue: 0.3, duration: 200, useNativeDriver }),
        ]).start();
      } else {
        // Maintient la position ouverte
        x.setValue(0);
        fade.setValue(0.3);
      }
    } else if (wasVisible.current) {
      // Enregistre que le tiroir se ferme
      wasVisible.current = false;
      // Lance l'animation de sortie
      Animated.parallel([
        Animated.timing(x, { toValue: hiddenX, duration: 180, useNativeDriver }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver }),
      ]).start(() => setMounted(false));
    }
  }, [visible, hiddenX, fade, x]);

  // Si le tiroir est fermé et démonté, rien n'est affiché
  if (!mounted) return null;

  // Récupération de la liste des enfants rattachés au parent
  const childrenList = db.users.filter(
    (u) => u.role === 'child' && (u.parentId === user?.id || u.familyId === user?.familyId)
  );

  // Fonction de navigation vers une route interne
  const navigateTo = (href: string) => {
    // Ferme le tiroir
    close();
    // Navigue vers la destination
    router.navigate(href as never);
  };

  // Fonction de vérification si un lien est actuellement actif à l'écran
  const isActive = (href: string) => {
    // Cas particulier de la page d'accueil
    if (href === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
    }
    // Vérification par préfixe d'URL
    return pathname.startsWith(href);
  };

  // Les rubriques officielles du tiroir Parent (saisie_rapide supprimée conformément aux consignes)
  const menuItems: Array<{
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    href: string;
    badge?: number;
  }> = [
    // 1. Accueil
    { label: t('accueil'), icon: 'home-outline', href: '/(tabs)' },
    // 2. Enfants
    { label: t('enfants'), icon: 'people-outline', href: '/(admin)/enfants', badge: childrenList.length },
    // 3. Produits
    { label: t('produits'), icon: 'bag-outline', href: '/(tabs)/produits' },
    // 4. Calendrier & Historique
    { label: t('calendrier_historique') || 'Calendrier & Historique', icon: 'calendar-outline', href: '/(tabs)/calendrier' },
    // 5. Budgets & Analyses
    { label: t('budgets_analyses'), icon: 'pie-chart-outline', href: '/(admin)/budget-analyses' },
    // 6. Notifications
    { label: t('notifications'), icon: 'notifications-outline', href: '/notifications' },
    // 7. Réglages
    { label: t('reglages'), icon: 'settings-outline', href: '/(tabs)/reglages' },
  ];

  return (
    // Modal plein écran transparent pour contenir le tiroir
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={close}
      statusBarTranslucent
    >
      <View style={StyleSheet.absoluteFill}>
        {/* Voile sombre transparent fermant le tiroir au clic */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.forest, opacity: fade },
          ]}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
        </Animated.View>

        {/* Panneau coulissant vert forêt */}
        <Animated.View
          style={[
            styles.drawer,
            isRTL
              ? {
                  right: 0,
                  borderTopLeftRadius: radius.hero,
                  borderBottomLeftRadius: radius.hero,
                }
              : {
                  left: 0,
                  borderTopRightRadius: radius.hero,
                  borderBottomRightRadius: radius.hero,
                },
            {
              width: drawerW,
              transform: [{ translateX: x }],
            },
          ]}
        >
          {/* Défilement vertical pour assurer la compatibilité sur tous les écrans */}
          <ScrollView
            showsVerticalScrollIndicator
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: Math.max(insets.top + 12, space.lg),
                paddingBottom: Math.max(insets.bottom + 16, space.xl),
              },
            ]}
          >
            {/* Logo officiel Masrouf */}
            <View
              style={[
                styles.brandRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {/* Titre textuel de la marque */}
              <Text style={styles.brandTitle}>{t('nom_app')}</Text>
              {/* Logo officiel Masrouf vectoriel en variante menthe */}
              <MasroufLogo size={26} variant="mint" />
            </View>

            {/* En-tête profil du Parent */}
            <View
              style={[
                styles.profileBox,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={24} color={colors.forest} />
              </View>

              <View style={{ flex: 1, minWidth: 0, marginHorizontal: space.sm }}>
                <Text
                  style={[styles.userName, { textAlign: isRTL ? 'right' : 'left' }]}
                  numberOfLines={1}
                >
                  {user?.name || 'Parent'}
                </Text>

                <Text
                  style={[styles.userEmail, { textAlign: isRTL ? 'right' : 'left' }]}
                  numberOfLines={1}
                >
                  {user?.email}
                </Text>

                {/* Badge de rôle Parent unique */}
                <View
                  style={[
                    styles.roleBadge,
                    { alignSelf: isRTL ? 'flex-end' : 'flex-start' },
                  ]}
                >
                  <Text style={styles.roleBadgeText}>
                    {t('famille_administrateur') || 'Compte Parent'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Séparateur fin */}
            <View style={styles.divider} />

            {/* Liste unique des 8 rubriques du Parent */}
            <View style={styles.menuGroup}>
              {menuItems.map((item, index) => {
                const active = isActive(item.href);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.menuItem,
                      active && styles.menuItemActive,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => navigateTo(item.href)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={active ? colors.forest : colors.white}
                    />
                    <Text
                      style={[
                        styles.menuItemText,
                        active && styles.menuItemTextActive,
                        { textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.badge !== undefined && item.badge > 0 && (
                      <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{item.badge}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pied du tiroir : Sélecteur de langue et Déconnexion */}
            <View style={styles.footerWrap}>
              <LanguageSelector dark />

              <TouchableOpacity
                style={[
                  styles.logoutBtn,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                onPress={() => {
                  close();
                  logout();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={20} color={colors.coral} />
                <Text style={styles.logoutText}>{t('deconnexion')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.forest,
    shadowColor: colors.forest,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    flexGrow: 1,
  },
  brandRow: {
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.lg,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1,
  },
  profileBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radius.card,
    padding: space.md,
    marginBottom: space.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: type.body.fontSize,
    fontWeight: '700',
    color: colors.white,
  },
  userEmail: {
    fontSize: type.label.fontSize,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(217, 240, 228, 0.2)',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  roleBadgeText: {
    color: colors.mint,
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: space.md,
  },
  menuGroup: {
    gap: space.xs,
    flex: 1,
  },
  menuItem: {
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.control,
  },
  menuItemActive: {
    backgroundColor: colors.mint,
  },
  menuItemText: {
    flex: 1,
    fontSize: type.body.fontSize,
    fontWeight: '600',
    color: colors.white,
  },
  menuItemTextActive: {
    color: colors.forest,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  footerWrap: {
    marginTop: space.xl,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: space.md,
  },
  logoutBtn: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  logoutText: {
    fontSize: type.body.fontSize,
    fontWeight: '600',
    color: colors.coral,
  },
});
