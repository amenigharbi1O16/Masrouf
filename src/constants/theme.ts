// ============================================================
// FICHIER : src/constants/theme.ts
// RÔLE    : Design System officiel de l'application Masrouf.
//           Basé sur la maquette Figma validée.
//
// DIRECTION DE DESIGN :
//   Calme, professionnel, minimaliste et financier.
//   « Quiet confidence. Clear decisions. Local by design. »
//
// PALETTE VISUELLE FIGMA :
//   - Forest / Forest Green : #102B27 (Headers, boutons primaires, drawer)
//   - Deep Green            : #1C5143 (Texte vert, indicateur « sain »)
//   - Mint / Mint Green     : #D9F0E4 (Bannières info, badges, accents)
//   - Warm / Warm Off-white : #F5F3ED (Fond principal de l'app)
//   - White                 : #FFFFFF (Cartes, inputs)
//   - Gold / Status Orange  : #E9B66B (Alerte budget 70-99 %)
//   - Coral / Status Red    : #DC7770 (Budget dépassé ≥ 100 %)
//   - Ink / Text Primary    : #102B27 (Texte principal)
//   - Muted / Text Secondary: #6B7B75 (Texte secondaire, descriptions)
// ============================================================

const palette = {
  // Couleurs principales Figma
  forest: '#102B27',
  forestGreen: '#102B27',
  deepGreen: '#1C5143',
  mint: '#D9F0E4',
  mintGreen: '#D9F0E4',
  warm: '#F5F3ED',
  warmOffWhite: '#F5F3ED',
  white: '#FFFFFF',
  border: '#E2E6DF',
  divider: '#ECEFEA',

  // Alertes et statuts budgétaires
  gold: '#E9B66B',
  coral: '#DC7770',
  statusGreen: '#1C5143',
  statusGreenBg: '#D9F0E4',
  statusOrange: '#E9B66B',
  statusOrangeBg: '#FEF3C7',
  statusRed: '#DC7770',
  statusRedBg: '#FEE2E2',

  // Typographie et niveaux de gris
  ink: '#102B27',
  textPrimary: '#102B27',
  textSecondary: '#6B7B75',
  textMuted: '#6B7B75',
  muted: '#6B7B75',
  subtle: '#9CA8A3',
  textLight: '#9CA8A3',

  // Tiroir latéral (Drawer)
  drawerBg: '#102B27',
  drawerText: '#FFFFFF',
  drawerMuted: '#9CA8A3',
  drawerActive: '#1C5143',

  // Administration
  adminPurple: '#581C87',
  adminPurpleLight: '#F3E8FF',
  adminPurpleBorder: '#D8B4FE',
} as const;

export const Theme = {
  colors: palette,

  // Typographie officielle Figma
  font: {
    display: 34,
    title: 26,
    section: 18,
    body: 14,
    label: 12,
    small: 11,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  // Alias pour la compatibilité avec Theme.Spacing
  Spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },

  shadows: {
    card: {
      shadowColor: '#102B27',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    button: {
      shadowColor: '#102B27',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 3,
    },
  },

  control: {
    height: 52,
    heightLg: 56,
  },
} as const;

// Alias exportés pour les hooks et fichiers existants
export const Spacing = Theme.spacing;

export const Colors = {
  light: {
    text: palette.ink,
    background: palette.warm,
    tint: palette.forest,
    icon: palette.muted,
    tabIconDefault: palette.muted,
    tabIconSelected: palette.forest,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: palette.mint,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: palette.mint,
  },
  ...palette,
};
