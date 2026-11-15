// ============================================================
// FICHIER : src/utils/assets.ts
// RÔLE DANS L'APPLICATION :
//   Gestionnaire centralisé des ressources multimédias (images, bannières, logos)
//   avec prise en charge des qualificatifs de ressources et de la localisation.
//   Permet d'afficher des images adaptées à la langue de l'utilisateur (FR, EN, AR)
//   avec un mécanisme de repli (fallback) strict et sécurisé sur le français.
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme un panneau d'affichage dans un aéroport international : il affiche
//   l'affiche en arabe si le passager lit l'arabe, en anglais s'il lit l'anglais,
//   et en français par défaut si une déclinaison spécifique n'est pas encore imprimée.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Affiche les bannières d'en-tête de bienvenue, les logos Masrouf et les illustrations
//   dans la bonne orientation culturelle et linguistique sans jamais afficher d'image brisée.
// ============================================================

import { ImageSourcePropType } from 'react-native';

/**
 * Registre des bannières et visuels localisés par code langue.
 * Contient les déclinaisons FR, AR et EN packagées par Metro Bundler.
 */
const LOCALIZED_ASSETS: Record<string, Record<string, ImageSourcePropType>> = {
  banner: {
    fr: require('../../assets/images/banner_fr.png'),
    ar: require('../../assets/images/banner_ar.png'),
    en: require('../../assets/images/banner_en.png'),
  },
};

/**
 * MISSION DE LA FONCTION : getLocalizedAsset
 *   Résout dynamiquement la bonne image selon la clé d'asset demandée et la langue courante.
 *   Applique un protocole de repli à 3 niveaux :
 *   1. Image dans la langue demandée (ex: 'ar' pour l'arabe).
 *   2. Image en français ('fr') si la variante demandée est indisponible.
 *   3. Première image disponible ou icône Masrouf par défaut si la clé n'existe pas.
 *
 * RÔLE DANS L'APPLICATION :
 *   Appelé par les écrans d'accueil, d'inscription et de bienvenue pour charger
 *   le bon visuel localisé sans blocage d'exécution.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Une ressource image utilisable par un composant <Image source={...} />,
 *   rendant un bandeau illustré coloré adapté à la langue sélectionnée.
 *
 * @param cle Clé identifiant la ressource (ex: 'banner')
 * @param langue Code ISO de la langue voulue ('fr', 'ar', 'en')
 */
export function getLocalizedAsset(cle: string, langue: string = 'fr'): ImageSourcePropType {
  const groupe = LOCALIZED_ASSETS[cle];
  if (!groupe) {
    // Repli de secours absolu sur l'icône de l'application
    return require('../../assets/images/icon.png');
  }

  // Étape 1 : Recherche dans la langue demandée par l'utilisateur
  if (groupe[langue]) {
    return groupe[langue];
  }

  // Étape 2 : Repli garanti sur le français (langue principale de référence)
  if (groupe.fr) {
    return groupe.fr;
  }

  // Étape 3 : Premier visuel disponible dans le dictionnaire
  const premiere = Object.values(groupe)[0];
  return premiere || require('../../assets/images/icon.png');
}
