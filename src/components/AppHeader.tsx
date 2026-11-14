import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';
import { useAuth } from '@/utils/auth';
import { useDrawer } from './DrawerContext';

interface Props {
  title: string;
  /** Show a back arrow instead of the menu button. */
  back?: boolean;
  onBack?: () => void;
  /** Login / registration: no menu, no profile button. */
  plain?: boolean;
}

export function AppHeader({ title, back, onBack, plain }: Props) {
  const router = useRouter();
  const { open } = useDrawer();
  const { isAdmin } = useAuth();
  const goBack = () => (onBack ? onBack() : router.canGoBack() ? router.back() : router.replace('/' as never));
  return (
    <View style={styles.row}>
      {plain ? (
        <View style={styles.slot} />
      ) : (
        <Pressable onPress={back ? goBack : open} hitSlop={12} style={styles.slot} accessibilityRole="button" accessibilityLabel={back ? 'Go back' : 'Open menu'}>
          <Ionicons name={back ? 'chevron-back' : 'menu'} size={24} color={colors.forest} />
        </Pressable>
      )}
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      {plain ? (
        <View style={styles.slot} />
      ) : (
        <Pressable
          onPress={() => router.navigate((isAdmin ? '/(admin)/reglages' : '/reglages') as never)}
          hitSlop={12}
          style={styles.slot}
          accessibilityRole="button"
          accessibilityLabel="Profile and settings"
        >
          <Ionicons name="person-circle-outline" size={26} color={colors.forest} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 8 },
  slot: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, lineHeight: 32, fontWeight: '600', color: colors.forest },
});
