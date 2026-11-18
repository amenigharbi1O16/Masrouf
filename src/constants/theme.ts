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
  // Vert forêt profond institutionnel : arrière-plans de cartes de synthèse et texte principal
  forest: '#102B27',
  // Vert émeraude sombre : couleur d'accent primaire et boutons d'action
  green: '#1C5143',
  // Vert menthe douce : badges, sélections actives et pastilles
  mint: '#D9F0E4',
  // Fond crème chaud naturel : arrière-plan par défaut de toutes les vues
  warm: '#F5F3ED',
  // Blanc pur albâtre : fond des cartes et texte contrasté sur fond sombre
  white: '#FFFFFF',
  // Doré éclatant : alertes de vigilance budgétaire (80%-99%) et étoiles
  gold: '#E9B66B',
  // Rouge corail : alertes de dépassement de budget, suppressions et erreurs
  coral: '#DC7770',
  // Vert grisé doux : sous-titres, libellés secondaires et contours inactifs
  muted: '#61746D',
  // Couleur fine de bordure neutre pour les séparateurs et contours de champ
  border: '#E2E7DF',
  // Vert foncé de piste pour les jauges et arrière-plans de progression
  track: '#3C5B51',
  // Teinte dorée adoucie pour les fonds d'alerte intermédiaire
  goldSoft: '#FBEFD9',
  // Teinte corail adoucie pour les fonds de cartes d'alerte critique
  coralSoft: '#F8E1DF',
} as const;

/** Échelle d'espacements harmonieux en pixels (multiples de 4 et 8) */
export const space = {
  // 4px : micro-espacement entre icône et texte ou marges internes minimes
  xs: 4,
  // 8px : espacement compact standard entre éléments d'une même ligne
  sm: 8,
  // 12px : espacement intermédiaire standard de grille
  md: 12,
  // 16px : marge intérieure standard de carte ou padding horizontal d'écran
  lg: 16,
  // 24px : marge généreuse entre sections majeures
  xl: 24,
  // 32px : grand espacement supérieur ou séparation de blocs héros
  xxl: 32,
} as const;

/** Rayons d'arrondi constants pour les contrôles, cartes et boutons pilules */
export const radius = {
  // 16px : arrondi standard des champs de saisie et boutons de formulaire
  control: 16,
  // 16px : arrondi officiel des cartes de synthèse et conteneurs
  card: 16,
  // 24px : grand arrondi des cartes héro et bannières d'accueil
  hero: 24,
  // 28px : arrondi pilule complet pour les pastilles de filtre et tags
  pill: 28,
} as const;

/** Styles typographiques hiérarchisés */
export const type = {
  // 34px bold : grands montants de synthèse financière
  display: { fontSize: 34, fontWeight: '600' as const },
  // 26px bold : titres principaux d'écrans et en-têtes
  title: { fontSize: 26, fontWeight: '600' as const },
  // 18px semi-bold : sous-titres et titres de sections
  section: { fontSize: 18, fontWeight: '600' as const },
  // 14px regular : corps de texte explicatif et descriptions
  body: { fontSize: 14, fontWeight: '400' as const },
  // 12px medium : petits libellés, dates et métadonnées secondaires
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
