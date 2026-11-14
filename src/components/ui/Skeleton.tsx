import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

export function Skeleton({ height = 16, width = '100%', radius = 12 }: { height?: number; width?: DimensionValue; radius?: number }) {
  const o = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(o, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [o]);
  return <Animated.View style={{ height, width, borderRadius: radius, backgroundColor: colors.border, opacity: o }} />;
}

/** Full-screen quiet loading state (design: "34 · Loading"). */
export function LoadingScreen() {
  return (
    <View style={styles.wrap}>
      <Skeleton height={32} width={200} />
      <Skeleton height={218} radius={16} />
      <Skeleton height={76} radius={16} />
      <Skeleton height={26} width={160} />
      <Skeleton height={88} radius={16} />
      <Skeleton height={88} radius={16} />
    </View>
  );
}
const styles = StyleSheet.create({ wrap: { flex: 1, backgroundColor: colors.warm, padding: 24, paddingTop: 80, gap: 14 } });
