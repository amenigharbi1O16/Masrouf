// ============================================================
// FICHIER : src/utils/assets.ts
// MISSION : Gestion centralisée des ressources avec qualificatifs
//           (densités 1x, 2x, 3x gérées par Metro / React Native)
//           et visuels localisés selon la langue (getLocalizedAsset)
//           avec repli garanti sur le français.
// ============================================================

import { ImageSourcePropType } from 'react-native';

const LOCALIZED_ASSETS: Record<string, Record<string, ImageSourcePropType>> = {
  banner: {
    fr: require('../../assets/images/banner_fr.png'),
    ar: require('../../assets/images/banner_ar.png'),
    en: require('../../assets/images/banner_en.png'),
  },
};

/**
 * Retourne la ressource image localisée correspondant à la langue active,
 * avec repli strict et garanti sur le français si la variante est absente.
 * @param cle Clé de la ressource (ex: 'banner')
 * @param langue Code langue actuel ('fr', 'ar', 'en')
 */
export function getLocalizedAsset(cle: string, langue: string = 'fr'): ImageSourcePropType {
  const groupe = LOCALIZED_ASSETS[cle];
  if (!groupe) {
    // Repli par défaut sur l'icône de l'application
    return require('../../assets/images/icon.png');
  }

  // 1. Recherche dans la langue demandée
  if (groupe[langue]) {
    return groupe[langue];
  }

  // 2. Repli garanti sur le français
  if (groupe.fr) {
    return groupe.fr;
  }

  // 3. Premier disponible
  const premiere = Object.values(groupe)[0];
  return premiere || require('../../assets/images/icon.png');
}

