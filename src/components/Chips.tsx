import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/theme';

export function Chips({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.chip, on && styles.on]} accessibilityRole="button">
            <Text style={[styles.text, on && { color: colors.white }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, height: 36, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  on: { backgroundColor: colors.green, borderColor: colors.green },
  text: { fontSize: 13, fontWeight: '600', color: colors.forest },
});
