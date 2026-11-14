import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { useDrawer } from './DrawerContext';

export interface DrawerItem { label: string; icon: keyof typeof Ionicons.glyphMap; href: string }

/** Left drawer, 78% of the viewport width, 200 ms ease-out (per design handoff). */
export function SideDrawer({ items, subtitle }: { items: DrawerItem[]; subtitle: string }) {
  const { visible, close } = useDrawer();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerW = Math.round(width * 0.78);
  const x = useRef(new Animated.Value(-drawerW)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      x.setValue(-drawerW);
      Animated.parallel([
        Animated.timing(x, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.25, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(x, { toValue: -drawerW, duration: 180, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible, drawerW]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const go = (href: string) => {
    close();
    router.navigate(href as never);
  };
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
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.forest, opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
        </Animated.View>
        <Animated.View style={[styles.drawer, { width: drawerW, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24, transform: [{ translateX: x }] }]}>
          <View style={styles.brandRow}>
            <Text style={styles.brand}>MASROUF</Text>
            <Ionicons name="leaf" size={26} color={colors.mint} />
          </View>
          <View style={styles.profile}>
            <Ionicons name="person-circle" size={34} color={colors.mint} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
              <Text style={styles.sub}>{subtitle}</Text>
            </View>
          </View>
          <View style={{ gap: 11, marginTop: 28 }}>
            {items.map((it) => {
              const on = active(it.href);
              return (
                <Pressable key={it.href} onPress={() => go(it.href)} style={[styles.item, on && { backgroundColor: colors.green }]} accessibilityRole="button">
                  <Ionicons name={it.icon} size={22} color={colors.white} />
                  <Text style={[styles.itemText, on && { fontWeight: '600' }]}>{it.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flex: 1 }} />
          <Text style={styles.langLabel}>LANGUAGE</Text>
          <Text style={styles.lang}>English</Text>
          <Pressable
            onPress={() => { close(); logout(); }}
            style={styles.logout}
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={22} color={colors.white} />
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: colors.forest, paddingHorizontal: 20, borderTopRightRadius: 24, borderBottomRightRadius: 24 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  brand: { color: colors.white, fontSize: 26, fontWeight: '700' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 28, paddingHorizontal: 4 },
  name: { color: colors.white, fontSize: 17, fontWeight: '600' },
  sub: { color: colors.mint, fontSize: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 54, borderRadius: 12, paddingHorizontal: 16 },
  itemText: { color: colors.white, fontSize: 16 },
  langLabel: { color: colors.mint, fontSize: 11, fontWeight: '500', paddingHorizontal: 4 },
  lang: { color: colors.white, fontSize: 13, fontWeight: '500', marginTop: 6, paddingHorizontal: 4 },
  logout: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 28, paddingHorizontal: 4, height: 40 },
  logoutText: { color: colors.white, fontSize: 15, fontWeight: '500' },
});
