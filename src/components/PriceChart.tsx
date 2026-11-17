/**
 * FICHIER : src/components/PriceChart.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-048
 * COMPOSANT : PriceChart (Graphique Linéaire Vectoriel SVG d'Évolution des Prix)
 *
 * RÔLE DU COMPOSANT :
 * Trace une courbe vectorielle SVG représentant l'historique chronologique des prix unitaires d'un produit.
 * Utilise Svg, Line, Polyline et Circle de react-native-svg avec des étiquettes de repère précises :
 * - Titre et sous-titre de l'unité de mesure (ex: "Évolution du prix" puis "DT / L")
 * - Axe vertical des ordonnées avec étiquettes de prix réels arrondis
 * - Lignes de repère horizontales discrètes
 * - Courbe polygonale continue vert forêt
 * - Points circulaires pleins sur chaque relevé
 * - Axe horizontal des abscisses avec les mois abrégés (ex: "Août", "Sept.", "Oct.", "Nov.")
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Boîte blanche aux coins arrondis (radius 16), typographie vert forêt et graduations harmonieuses,
 * identique aux écrans de détail produit et d'historique des achats.
 */

// Importation de React
import React from 'react';
// Importation des composants d'affichage et de mise en page React Native
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
// Constantes de thème officielles
import { colors, radius } from '@/constants/theme';
// Utilitaire de formatage décimal en Dinars Tunisiens
import { dt } from '@/utils/format';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Interface représentant un point sur le graphique des prix.
 */
export interface ChartPoint {
  // Libellé de l'abscisse (ex: "Août", "Sept.")
  label: string;
  // Valeur numérique du prix unitaire (ex: 14.5)
  value: number;
}

/**
 * Propriétés du composant graphique des prix.
 */
interface PriceChartProps {
  // Titre du graphique
  title: string;
  // Unité affichée en sous-titre (ex: "DT / L")
  unit: string;
  // Liste ordonnée des points de relevés
  points: ChartPoint[];
}

/**
 * MISSION DE LA FONCTION : PriceChart
 *   Trace la courbe d'évolution historique des prix unitaires pour un article donné.
 * RÔLE DANS L'APPLICATION : Permet à l'utilisateur de visualiser les hausses ou baisses de prix au fil des mois.
 * CE QUI EST AFFICHÉ À L'ÉCRAN : Une carte blanche avec le titre, l'unité, les repères Y, la courbe vert forêt et les mois.
 */
export function PriceChart({ title, unit, points }: PriceChartProps) {
  // Fonctions de traduction et sens de lecture RTL
  const { t, isRTL } = useTranslation();

  // Dimensions de l'écran et mesure de la boîte conteneur
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = React.useState<number>(0);

  // Largeur totale adaptative du canevas SVG (s'adapte à 100% de la carte)
  const W = containerWidth > 0 ? containerWidth : Math.max(220, windowWidth - 68);
  // Hauteur totale du canevas SVG
  const H = 140;
  // Marge gauche pour les graduations d'ordonnées
  const L = 46;
  // Marge droite pour ne pas couper les points
  const R = 16;
  // Marge haute du tracé
  const T = 16;
  // Marge basse du tracé
  const B = 16;

  // Extraction des valeurs numériques des prix
  const vals = points.map((p) => p.value);
  // Valeur minimale observée
  const min = vals.length ? Math.min(...vals) : 0;
  // Valeur maximale observée
  const max = vals.length ? Math.max(...vals) : 1;
  // Écart de dynamique (minimum 0.40 DT pour éviter une courbe plate)
  const span = max - min || Math.max(max * 0.1, 0.4);
  // Borne basse avec marge de respiration
  const lo = Math.max(0, min - span * 0.15);
  // Borne haute avec marge de respiration
  const hi = max + span * 0.15;

  // 3 lignes de repère horizontales (haute, médiane, basse)
  const grid = [hi, (hi + lo) / 2, lo];

  // Calcul de la coordonnée X d'un point
  const getX = (i: number) => {
    // Si un seul point est disponible, centrage horizontal
    if (points.length <= 1) return (W + L - R) / 2;
    // Répartition équidistante sur la largeur utile
    const ratio = i / (points.length - 1);
    // Inversion du sens en mode RTL si nécessaire
    const pos = isRTL ? 1 - ratio : ratio;
    // Application des marges
    return L + pos * (W - L - R);
  };

  // Calcul de la coordonnée Y d'un point selon son prix
  const getY = (v: number) => {
    // Évite la division par zéro
    if (hi === lo) return (T + (H - B)) / 2;
    // Projection linéaire inversée (l'axe Y du SVG grandit vers le bas)
    return T + ((hi - v) / (hi - lo)) * (H - T - B);
  };

  // Construction de la chaîne de coordonnées pour la ligne brisée Polyline
  const polyPoints = points.map((p, i) => `${getX(i)},${getY(p.value)}`).join(' ');

  return (
    // Boîte blanche avec coins arrondis
    <View style={styles.box}>
      {/* En-tête : Titre du graphique */}
      <Text
        style={[
          styles.title,
          { textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {title}
      </Text>

      {/* Sous-titre : Unité de mesure sous le titre */}
      <Text
        style={[
          styles.unit,
          { textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {unit}
      </Text>

      {/* Condition : message si aucun point enregistré */}
      {points.length === 0 ? (
        <Text style={[styles.empty, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('aucun_prix_enregistre')}
        </Text>
      ) : (
        // Conteneur du graphique et de ses axes avec mesure dynamique de la largeur disponible
        <View
          style={styles.chartArea}
          onLayout={(e) => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && Math.abs(w - containerWidth) > 2) {
              setContainerWidth(w);
            }
          }}
        >
          {/* Surface graphique traçant les repères et la courbe */}
          <View style={{ width: '100%', height: H, position: 'relative' }}>
            {/* Lignes de repère horizontales */}
            {grid.map((gVal, idx) => (
              <View
                key={`grid-${idx}`}
                style={{
                  position: 'absolute',
                  left: isRTL ? R : L,
                  right: isRTL ? L : R,
                  top: getY(gVal),
                  height: 1,
                  backgroundColor: colors.border,
                }}
              />
            ))}

            {/* Segments de droite reliant chaque relevé de prix successif */}
            {points.length > 1 &&
              points.slice(0, -1).map((pt, i) => {
                const x1 = getX(i);
                const y1 = getY(pt.value);
                const x2 = getX(i + 1);
                const y2 = getY(points[i + 1].value);
                const dx = x2 - x1;
                const dy = y2 - y1;
                const length = Math.sqrt(dx * dx + dy * dy);
                const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <View
                    key={`seg-${i}`}
                    style={{
                      position: 'absolute',
                      left: midX - length / 2,
                      top: midY - 1.25,
                      width: length,
                      height: 2.5,
                      backgroundColor: colors.forest,
                      transform: [{ rotate: `${angle}deg` }],
                    }}
                  />
                );
              })}

            {/* Pastilles circulaires pleines pour chaque relevé de prix */}
            {points.map((pt, i) => (
              <View
                key={`dot-${i}`}
                style={{
                  position: 'absolute',
                  left: getX(i) - 4.5,
                  top: getY(pt.value) - 4.5,
                  width: 9,
                  height: 9,
                  borderRadius: 5,
                  backgroundColor: colors.forest,
                }}
              />
            ))}

            {/* Étiquettes d'ordonnées Y positionnées précisément sur chaque niveau */}
            {grid.map((gVal, idx) => (
              <Text
                key={`y-label-${idx}`}
                style={[
                  styles.yTick,
                  {
                    top: getY(gVal) - 7,
                    [isRTL ? 'right' : 'left']: 0,
                  },
                ]}
              >
                {dt(gVal, 2)}
              </Text>
            ))}
          </View>

          {/* Axe horizontal X affichant les mois sous les points */}
          <View
            style={[
              styles.xRow,
              {
                paddingLeft: isRTL ? R : L,
                paddingRight: isRTL ? L : R,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            {points.map((pt, i) => (
              <Text key={`x-label-${i}`} style={styles.xTick}>
                {pt.label}
              </Text>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// Feuilles de styles du graphique
const styles = StyleSheet.create({
  // Boîte conteneur blanche arrondie
  box: {
    // Fond blanc pur
    backgroundColor: colors.white,
    // Coins arrondis de 16px
    borderRadius: radius.card,
    // Espacement intérieur de 16px
    padding: 16,
    // Espacement entre les blocs
    gap: 4,
  },
  // Titre principal du graphique
  title: {
    // Taille de 14px
    fontSize: 14,
    // Graisse semi-grasse 600
    fontWeight: '600',
    // Couleur vert forêt officielle
    color: colors.forest,
  },
  // Sous-titre de l'unité
  unit: {
    // Taille discrète de 12px
    fontSize: 12,
    // Couleur vert grisé doux
    color: colors.muted,
    // Marge basse avant le graphique
    marginBottom: 8,
  },
  // Zone du graphique et de ses repères
  chartArea: {
    // Positionnement relatif pour placer les labels Y
    position: 'relative',
    // Hauteur globale avec espace pour l'axe X
    paddingBottom: 20,
  },
  // Étiquette numérique sur l'axe vertical Y
  yTick: {
    // Positionnement absolu pour s'aligner sur la ligne de repère
    position: 'absolute',
    // Largeur réservée pour le texte
    width: 42,
    // Taille de police 10px
    fontSize: 10,
    // Couleur grise discrète
    color: colors.muted,
    // Alignement à droite
    textAlign: 'right',
  },
  // Ligne horizontale des mois X
  xRow: {
    // Répartition équidistante
    justifyContent: 'space-between',
    // Marge supérieure
    marginTop: 6,
  },
  // Étiquette de mois sous la courbe
  xTick: {
    // Taille de police 10px
    fontSize: 10,
    // Couleur grise discrète
    color: colors.muted,
    // Centrage du texte
    textAlign: 'center',
  },
  // Texte d'état vide
  empty: {
    // Taille 12px
    fontSize: 12,
    // Couleur atténuée
    color: colors.muted,
    // Marge verticale
    paddingVertical: 20,
  },
});
