import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { AppHeader } from './AppHeader';

interface Props {
  title: string;
  children: React.ReactNode;
  back?: boolean;
  onBack?: () => void;
  plain?: boolean;
  /** Floating action (e.g. "＋ Add purchase"). */
  fab?: { label: string; onPress: () => void };
}

/** Standard page: status-bar safe area, header, scrollable body at 24 px (16 px on small phones). */
export function Screen({ title, children, back, onBack, plain, fab }: Props) {
  const { width } = useWindowDimensions();
  const pad = width < 360 ? 16 : 24;
  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: pad, paddingTop: 4 }}>
          <AppHeader title={title} back={back} onBack={onBack} plain={plain} />
        </View>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 14, paddingBottom: fab ? 120 : 40, gap: 14 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {fab ? (
          <Pressable onPress={fab.onPress} style={({ pressed }) => [styles.fab, { right: pad, opacity: pressed ? 0.85 : 1 }]} accessibilityRole="button">
            <Text style={styles.fabText}>{fab.label}</Text>
          </Pressable>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.warm },
  fab: {
    position: 'absolute', bottom: 16, height: 56, minWidth: 190, paddingHorizontal: 22, borderRadius: 28, backgroundColor: colors.green,
    alignItems: 'center', justifyContent: 'center', elevation: 6,
    shadowColor: colors.forest, shadowOpacity: 0.16, shadowRadius: 8, shadowOffset: { width: 0, height: 6 },
  },
  fabText: { color: colors.white, fontSize: 14, fontWeight: '600' },
});
