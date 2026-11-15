// ============================================================
// FICHIER : src/hooks/use-color-scheme.ts
// RÔLE DANS L'APPLICATION :
//   Ce crochet (hook) détecte le mode d'affichage préféré par le système
//   d'exploitation du téléphone de l'utilisateur (Mode Clair "light" ou
//   Mode Sombre "dark").
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme un capteur de luminosité automatique sur les phares d'une
//   voiture : dès que la nuit tombe ou que le conducteur entre dans un tunnel,
//   la voiture s'adapte automatiquement sans intervention manuelle.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Il permet à tous les écrans (accueil, budget, analyses, profil) de basculer
//   harmonieusement entre un fond crème chaud (#F5F3ED) et un fond sombre adapté.
// ============================================================

import { useColorScheme as useRNColorScheme } from 'react-native';

/**
 * MISSION DE LA FONCTION : useColorScheme
 *   Exporte directement le hook natif de React Native pour les plateformes mobiles
 *   (Android et iOS) afin de lire le thème système en temps réel.
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit la valeur 'light' ou 'dark' aux thèmes et composants visuels de Masrouf.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Aucun rendu visuel direct : renvoie une chaîne ('light' | 'dark' | null)
 *   utilisée par le système de styles pour colorer les fonds, cartes et textes.
 */
export function useColorScheme(): 'light' | 'dark' | null | undefined {
  return useRNColorScheme();
}
