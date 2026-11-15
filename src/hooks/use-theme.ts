// ============================================================
// FICHIER : src/hooks/use-theme.ts
// RÔLE DANS L'APPLICATION :
//   Fournit la palette complète des couleurs (palette Masrouf) active en
//   fonction du mode sombre ou clair du téléphone.
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est la boîte de peinture de l'architecte : selon que l'on construit pour
//   le jour ou pour la nuit, la boîte sélectionne automatiquement le bon nuancier
//   (vert forêt, crème, menthe, or, corail) pour peindre l'ensemble des pièces.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Définit toutes les teintes visibles :
//   - Vert forêt profond (#102B27) pour les boutons d'action et les titres.
//   - Crème chaleureux (#F5F3ED) pour l'arrière-plan de l'écran.
//   - Blanc pur (#FFFFFF) pour les cartes et conteneurs d'informations.
//   - Menthe fraîche (#D9F0E4) pour les badges positifs et dépenses sous contrôle.
//   - Or chaleureux (#E9B66B) pour le niveau Économe et les alertes modérées (80%).
//   - Corail alerte (#DC7770) pour les dépassements de budget (100%+).
// ============================================================

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * MISSION DE LA FONCTION : useTheme
 *   Lit le schéma actuel (clair/sombre) et extrait l'objet de couleurs
 *   correspondant depuis le référentiel central des couleurs de l'application.
 *
 * RÔLE DANS L'APPLICATION :
 *   Consommé par tous les composants React (Screen, Card, Button, Input, Header)
 *   pour styliser instantanément les vues selon la charte graphique.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Renvoie l'objet contenant toutes les couleurs de thème (text, background, tint,
 *   primary, secondary, accent, card, border, etc.) qui colorent immédiatement
 *   les cartes, textes, icônes et boutons de l'écran.
 */
export function useTheme() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';

  // Renvoie le dictionnaire de couleurs pour le thème sélectionné
  return Colors[theme];
}
