import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import { colors, radius } from '@/constants/theme';
import { dt } from '@/utils/format';

export interface ChartPoint { label: string; value: number }

/** Simple line chart with 3 grid lines (design: "Price evolution chart"). */
export function PriceChart({ title, unit, points }: { title: string; unit: string; points: ChartPoint[] }) {
  const W = 310, H = 150, L = 44, R = 10, T = 14, B = 14;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || Math.max(max * 0.1, 1);
  const lo = min - span * 0.2, hi = max + span * 0.2;
  const x = (i: number) => (points.length === 1 ? (W + L - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);
  const grid = [hi, (hi + lo) / 2, lo];
  const poly = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {points.length === 0 ? (
        <Text style={styles.unit}>No prices recorded yet.</Text>
      ) : (
        <>
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
            {grid.map((g) => (
              <Line key={g} x1={L} x2={W - R} y1={y(g)} y2={y(g)} stroke={colors.border} strokeWidth={1} />
            ))}
            {points.length > 1 ? <Polyline points={poly} fill="none" stroke={colors.green} strokeWidth={2.5} strokeLinejoin="round" /> : null}
            {points.map((p, i) => (
              <Circle key={i} cx={x(i)} cy={y(p.value)} r={4} fill={colors.green} />
            ))}
          </Svg>
          <View style={[styles.axisY]} pointerEvents="none">
            {grid.map((g) => <Text key={g} style={styles.tick}>{dt(g, 2)}</Text>)}
          </View>
          <View style={styles.xRow}>
            {points.map((p, i) => <Text key={i} style={styles.tick}>{p.label}</Text>)}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, borderRadius: radius.card, padding: 16, gap: 8 },
  head: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontSize: 14, fontWeight: '600', color: colors.forest },
  unit: { fontSize: 12, color: colors.muted },
  axisY: { position: 'absolute', left: 16, top: 52, height: 120, justifyContent: 'space-between' },
  xRow: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 38 },
  tick: { fontSize: 10, color: colors.muted },
});
