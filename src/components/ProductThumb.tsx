import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

export function ProductThumb({ name, uri, size = 48 }: { name: string; uri?: string; size?: number }) {
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 12 }} />;
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      <Text style={[styles.letter, { fontSize: size * 0.4 }]}>{name.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  box: { borderRadius: 12, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  letter: { color: colors.green, fontWeight: '700' },
});
