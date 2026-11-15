// ============================================================
// FICHIER : src/constants/theme.ts
// RÔLE    : Charte graphique, palette de couleurs, espacements,
//           rayons de courbure et typographies officielles de Masrouf.
//
// CONFORMITÉ DE DESIGN :
//   - forest (#102B27) : Vert profond, couleur institutionnelle d'arrière-plan ou de texte sombre.
//   - green (#1C5143)  : Vert émeraude sombre, couleur d'accentuation principale et boutons primaires.
//   - mint (#D9F0E4)   : Vert menthe douce, badges, sélections actives et pastilles.
//   - warm (#F5F3ED)   : Fond chaud naturel, arrière-plan de toutes les vues.
//   - gold (#E9B66B)   : Doré éclatant, avertissements budgétaires (80%-100%) et points de fidélité.
//   - coral (#DC7770)  : Rouge corail, alertes de dépassement, suppressions et erreurs.
//   - muted (#61746D)  : Vert grisé doux, sous-titres, libellés secondaires et contours.
// ============================================================

/** Palette de couleurs centrale */
export const colors = {
  forest: '#102B27',
  green: '#1C5143',
  mint: '#D9F0E4',
  warm: '#F5F3ED',
  white: '#FFFFFF',
  gold: '#E9B66B',
  coral: '#DC7770',
  muted: '#61746D',
  border: '#E2E7DF',
  track: '#3C5B51',
  goldSoft: '#FBEFD9',
  coralSoft: '#F8E1DF',
} as const;

/** Échelle d'espacements harmonieux en pixels (multiples de 4 et 8) */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Rayons d'arrondi constants pour les contrôles, cartes et boutons pilules */
export const radius = {
  control: 16,
  card: 16,
  hero: 24,
  pill: 28,
} as const;

/** Styles typographiques hiérarchisés */
export const type = {
  display: { fontSize: 34, fontWeight: '600' as const },
  title: { fontSize: 26, fontWeight: '600' as const },
  section: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  label: { fontSize: 12, fontWeight: '500' as const },
};

// ------------------------------------------------------------
// ALIAS ET COMPATIBILITÉ AVEC LES ANCIENNES VERSIONS
// ------------------------------------------------------------
export const Spacing = space;
export const Colors = {
  light: {
    ...colors,
    text: colors.forest,
    background: colors.warm,
    tint: colors.green,
    icon: colors.muted,
    tabIconDefault: colors.muted,
    tabIconSelected: colors.green,
  },
  dark: {
    ...colors,
    text: colors.warm,
    background: colors.forest,
    tint: colors.mint,
    icon: colors.muted,
    tabIconDefault: colors.muted,
    tabIconSelected: colors.mint,
  },
};

export const Theme = {
  colors: {
    ...colors,
    ink: colors.forest,
    deepGreen: colors.green,
  },
  space,
  spacing: space,
  radius,
  type,
};
