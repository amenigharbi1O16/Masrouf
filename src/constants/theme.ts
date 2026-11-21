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

/** Palette de couleurs centrale avec charte botanique Masrouf */
export const colors = {
  // Vert forêt profond institutionnel : titre Masrouf, vagues sombres, boutons (#112B28)
  forest: '#112B28',
  // Vert profond botanique : texte secondaire, logo (#2E7D43)
  deepGreen: '#2E7D43',
  // Vert moyen botanique : dégradé du logo (#5FA867)
  mediumGreen: '#5FA867',
  // Vert clair botanique : logo, soulignement incurvé, vagues (#A8D5A0)
  lightGreen: '#A8D5A0',
  // Menthe douce : seconde vague, logo sur fond sombre (#D9EEDD)
  mint: '#D9EEDD',
  // Vert très pâle : branches botaniques décoratives (#E8F2E0)
  veryPaleGreen: '#E8F2E0',
  // Fond crème chaud plein écran (#FBFAF6)
  cream: '#FBFAF6',
  // Gris-vert : sélecteur de langue non sélectionné (#5C6F6A)
  greyGreen: '#5C6F6A',

  // Vert émeraude sombre compatible
  green: '#2E7D43',
  // Fond crème chaud naturel
  warm: '#FBFAF6',
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
  // Gris neutre ardoise
  gray: '#64748B',
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

/** Tailles de police standardisées de Masrouf */
export const fontSizes = {
  // Titre d'écran principal (26px)
  title: 26,
  // Sous-titre ou titre de section (18px)
  subtitle: 18,
  // Corps de texte ordinaire (14px)
  body: 14,
  // Légende, date et métadonnée secondaire (12px)
  caption: 12,
} as const;

/** Style standard réutilisable pour toutes les cartes de l'application */
export const cardStyle = {
  // Fond blanc officiel albâtre
  backgroundColor: colors.white,
  // Arrondi standard des cartes (16px)
  borderRadius: radius.card,
  // Marge intérieure standard (16px)
  padding: space.lg,
  // Bordure fine neutre
  borderWidth: 1,
  // Couleur institutionnelle de bordure
  borderColor: colors.border,
} as const;

/** Styles standards pour les boutons interactifs */
export const buttonStyle = {
  // Bouton d'action principal vert forêt
  primary: {
    backgroundColor: colors.forest,
    borderRadius: radius.control,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Bouton d'action secondaire menthe douce
  secondary: {
    backgroundColor: colors.mint,
    borderRadius: radius.control,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  // Bouton destructif rouge corail
  danger: {
    backgroundColor: colors.coral,
    borderRadius: radius.control,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
} as const;

/** Style standard pour les champs de formulaire textuels */
export const inputStyle = {
  // Fond blanc pour lisibilité optimale
  backgroundColor: colors.white,
  // Rayon d'arrondi des contrôles (16px)
  borderRadius: radius.control,
  // Bordure fine
  borderWidth: 1,
  // Couleur de bordure neutre
  borderColor: colors.border,
  // Marge intérieure horizontale
  paddingHorizontal: space.lg,
  // Marge intérieure verticale
  paddingVertical: 12,
  // Taille de police confortable
  fontSize: 15,
  // Couleur de texte sombre
  color: colors.forest,
} as const;

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
