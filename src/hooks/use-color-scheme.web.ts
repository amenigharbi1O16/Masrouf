// ============================================================
// FICHIER : src/hooks/use-color-scheme.web.ts
// RÔLE DANS L'APPLICATION :
//   Variante Web du hook useColorScheme pour les navigateurs internet.
//   Sur le web (Server-Side Rendering / Static Rendering d'Expo), le rendu
//   initial côté serveur ne connaît pas les préférences du navigateur.
//   Ce hook résout le problème d'hydratation (mismatch hydration).
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme ouvrir les rideaux d'une chambre d'hôtel en arrivant : au tout
//   premier instant avant d'entrer, on allume la lumière standard (light), puis
//   une fois dans la pièce (hydratation terminée), on s'adapte à la météo extérieure.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Évite les clignotements visuels désagréables (flash blanc/noir) au rechargement
//   d'une page Masrouf dans Chrome, Firefox ou Safari.
// ============================================================

import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * MISSION DE LA FONCTION : useColorScheme
 *   Gère l'hydratation côté client pour le web en garantissant un thème initial stable
 *   ('light') avant de synchroniser avec les préférences du navigateur une fois monté.
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit au hook useTheme() la certitude qu'aucun bug de désynchronisation
 *   HTML/DOM ne survient lors de l'exécution web.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Fournit 'light' pendant le premier cycle de rendu web, puis la valeur réelle
 *   ('light' ou 'dark') du navigateur, permettant d'appliquer les couleurs de fond
 *   (#F5F3ED) et les contrastes de police convenables.
 */
export function useColorScheme(): 'light' | 'dark' | null | undefined {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // Après le premier montage du composant dans le navigateur, on valide l'hydratation
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();

  // Si le composant est hydraté dans le navigateur, on lit la préférence réelle
  if (hasHydrated) {
    return colorScheme;
  }

  // Avant l'hydratation, on retourne 'light' par sécurité
  return 'light';
}
