// ============================================================
// FICHIER : src/theme/index.ts
// RÔLE DANS L'APPLICATION :
//   Point d'entrée unique et centralisé pour l'ensemble du système de design (Design System).
//   Il réexporte les constantes de styles, couleurs, espacements, rayons de bordure
//   et typographies utilisées par tous les composants de Masrouf.
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est le guide de style et la charte graphique de la marque reliés en un seul classeur :
//   tout le monde (développeurs, designers, composants visuels) s'y réfère pour s'assurer
//   qu'un bouton fait exactement 12px de rayon, qu'un titre utilise le bon vert forêt,
//   et que les marges restent toujours régulières et harmonieuses.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Garantit une cohérence visuelle parfaite entre tous les 32 écrans de l'application,
//   évitant tout décalage visuel, incohérence de couleur ou hétérogénéité de police.
// ============================================================

export * from '../constants/theme';
export { Theme, Colors, Spacing } from '../constants/theme';
