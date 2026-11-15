/**
 * FICHIER : src/components/PriceChart.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-048
 * COMPOSANT : PriceChart (Graphique Linéaire Vectoriel SVG d'Évolution des Prix)
 *
 * RÔLE DU COMPOSANT :
 * Trace une courbe SVG représentant l'historique chronologique des prix unitaires d'un produit.
 * Utilise la bibliothèque `react-native-svg` sans nécessiter de dépendance graphique externe lourde.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Boîte blanche arrondie aux coins, en-tête avec titre ("Votre historique de prix") et unité ("DT / kg"),
 * canevas SVG affichant 3 lignes de repère horizontales grises, une ligne polygonale verte
 * reliant les points (`Polyline`), des pastilles circulaires pleines (`Circle`) sur chaque relevé,
 * un axe vertical des ordonnées avec les valeurs arrondies et un axe horizontal avec les dates/mois.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Éléments graphiques vectoriels natifs SVG
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
// Constantes de thème
import { colors, radius } from '@/constants/theme';
// Formatage monétaire
import { dt } from '@/utils/format';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Interface représentant un point sur le graphique des prix.
 */
export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Propriétés du composant graphique des prix.
 */
interface PriceChartProps {
  title: string;
  unit: string;
  points: ChartPoint[];
}

/**
 * Composant de graphique d'évolution des prix unitaires.
 */
export function PriceChart({ title, unit, points }: PriceChartProps) {
  const { t, isRTL } = useTranslation();

  // Dimensions fixes de la zone de tracé SVG
  const W = 310;
  const H = 150;
  const L = 44;
  const R = 10;
  const T = 14;
  const B = 14;

  // Extraction des valeurs numériques et calcul des bornes
  const vals = points.map((p) => p.value);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const span = max - min || Math.max(max * 0.1, 1);
  const lo = min - span * 0.2;
  const hi = max + span * 0.2;

  // Calcul des coordonnées X et Y
  const x = (i: number) =>
    points.length === 1
      ? (W + L - R) / 2
      : L + (i * (W - L - R)) / (points.length - 1);
  const y = (v: number) => T + ((hi - v) / (hi - lo)) * (H - T - B);

  // 3 lignes de grille de repère (haut, milieu, bas)
  const grid = [hi, (hi + lo) / 2, lo];

  // Construction de la chaîne SVG pour Polyline
  const poly = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');

  return (
    <View style={styles.box}>
      {/* En-tête du graphique : titre et unité */}
      <View
        style={[
          styles.head,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.unit}>{unit}</Text>
      </View>

      {points.length === 0 ? (
        // Message si aucun relevé de prix n'est disponible
        <Text
          style={[styles.unit, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {t('aucun_prix_enregistre')}
        </Text>
      ) : (
        <>
          {/* Surface SVG de tracé */}
          <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
            {/* Lignes de repère horizontales */}
            {grid.map((g) => (
              <Line
                key={g}
                x1={L}
                x2={W - R}
                y1={y(g)}
                y2={y(g)}
                stroke={colors.border}
                strokeWidth={1}
              />
            ))}

            {/* Tracé de la ligne brisée reliant les relevés */}
            {points.length > 1 ? (
              <Polyline
                points={poly}
                fill="none"
                stroke={colors.green}
                strokeWidth={2.5}
                strokeLinejoin="round"
              />
            ) : null}

            {/* Cercles pleins pour chaque point de données */}
            {points.map((p, i) => (
              <Circle
                key={i}
                cx={x(i)}
                cy={y(p.value)}
                r={4}
                fill={colors.green}
              />
            ))}
          </Svg>

          {/* Axe vertical Y (valeurs numériques des repères) */}
          <View
            style={[
              styles.axisY,
              isRTL ? { right: 16, left: undefined } : { left: 16 },
            ]}
            pointerEvents="none"
          >
            {grid.map((g) => (
              <Text key={g} style={styles.tick}>
                {dt(g, 2)}
              </Text>
            ))}
          </View>

          {/* Axe horizontal X (libellés des relevés / mois) */}
          <View
            style={[
              styles.xRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {points.map((p, i) => (
              <Text key={i} style={styles.tick}>
                {p.label}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
    gap: 8,
  },
  head: {
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.forest,
  },
  unit: {
    fontSize: 12,
    color: colors.muted,
  },
  axisY: {
    position: 'absolute',
    top: 52,
    height: 120,
    justifyContent: 'space-between',
  },
  xRow: {
    justifyContent: 'space-between',
    paddingLeft: 38,
  },
  tick: {
    fontSize: 10,
    color: colors.muted,
  },
});
