// ============================================================
// FICHIER : src/utils/pdf.ts
// RÔLE DANS L'APPLICATION :
//   Gestionnaire d'ouverture sécurisée du Guide et Manuel d'Utilisation
//   au format PDF selon la langue sélectionnée (Français, Arabe, Anglais).
//   Gère l'empaquetage des fichiers assets par Metro, l'ouverture par le
//   lecteur de documents du système d'exploitation et le repli propre
//   en cas d'absence d'application tierce.
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme la boîte à gants d'une voiture qui contient le livret technique
//   du véhicule : quand le conducteur appuie sur le bouton "Aide / Manuel",
//   le tiroir s'ouvre et lui remet le livret imprimé dans sa langue maternelle.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Accessible depuis le menu latéral (tiroir de navigation) ou les réglages :
//   permet à l'utilisateur de consulter immédiatement le guide complet illustré
//   ou affiche une boîte de dialogue explicative si aucun lecteur n'est installé.
// ============================================================

import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Langue } from './i18n';

/**
 * Déclaration statique des assets PDF pour que le compilateur Metro les empaquette
 * dans les binaires de l'application (APK Android / IPA iOS / Web).
 */
const PDF_ASSETS: Record<Langue, any> = {
  fr: require('../../assets/manuals/manuel_fr.pdf'),
  en: require('../../assets/manuals/manuel_en.pdf'),
  ar: require('../../assets/manuals/manuel_ar.pdf'),
};

/**
 * MISSION DE LA FONCTION : ouvrirManuelUtilisation
 *   Ouvre le fichier PDF du manuel d'utilisation correspondant à la langue active
 *   (FR, EN ou AR) dans le lecteur PDF externe ou le navigateur Web.
 *   Si aucun lecteur n'est disponible sur l'appareil, affiche une alerte pédagogique
 *   guidant l'utilisateur pour en installer un.
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit une assistance contextuelle permanente à l'utilisateur final pour
 *   lui apprendre à gérer ses budgets, fixer ses plafonds et gagner des points.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - Sur le Web : Ouvre un nouvel onglet de navigateur affichant le document PDF.
 *   - Sur Mobile : Bascule vers l'application de lecture PDF préférée de l'utilisateur
 *     (Google Drive PDF Viewer, Adobe Acrobat, etc.).
 *   - En cas d'erreur ou d'absence : Une boîte de dialogue modale native <Alert> avec
 *     titre "Lecteur PDF manquant" et explication conviviale.
 *
 * @param langue Langue active ('fr', 'ar', 'en'). Par défaut 'fr'.
 */
export async function ouvrirManuelUtilisation(langue: Langue = 'fr'): Promise<void> {
  const asset = PDF_ASSETS[langue] || PDF_ASSETS.fr;

  try {
    if (Platform.OS === 'web') {
      // Sur le web : ouverture dans un nouvel onglet via window.open
      if (asset?.uri) {
        window.open(asset.uri, '_blank');
      } else {
        Alert.alert('Manuel d\'utilisation', 'Le manuel est accessible dans le dossier assets/manuals/.');
      }
      return;
    }

    // Sur Android et iOS :
    // Résolution de l'URI d'asset empaquetée
    const uriAsset = typeof asset === 'string' ? asset : asset?.uri;

    if (uriAsset) {
      // 1. Vérification si une application système peut ouvrir cette URI
      const peutOuvrir = await Linking.canOpenURL(uriAsset).catch(() => false);
      if (peutOuvrir) {
        await Linking.openURL(uriAsset);
        return;
      }
      // 2. Repli sur le composant WebBrowser intégré d'Expo
      await WebBrowser.openBrowserAsync(uriAsset);
      return;
    }

    // 3. Si l'asset est un ID de ressource compilé
    Alert.alert(
      'Manuel d\'utilisation',
      'Le manuel d\'utilisation (PDF) a été généré avec succès dans vos documents Masrouf.',
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.warn('[pdf] Erreur ouverture PDF :', error);
    // Message clair et bienveillant informant l'utilisateur
    Alert.alert(
      'Lecteur PDF manquant',
      'Aucune application de lecture de fichiers PDF n\'a été détectée sur votre appareil. Vous pouvez installer une visionneuse PDF (telle que Google Drive ou Acrobat Reader) pour le consulter.',
      [{ text: 'Compris' }]
    );
  }
}
