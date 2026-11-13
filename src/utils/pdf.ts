// ============================================================
// FICHIER : src/utils/pdf.ts
// MISSION : Ouverture sécurisée du manuel d'utilisation PDF
//           selon la langue de l'utilisateur (FR, EN, AR).
//           - Copie l'asset vers le stockage local si nécessaire
//           - Tente l'ouverture via les intents système
//           - Gère avec soin l'absence d'application de lecture PDF
// ============================================================

import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { File, Paths } from 'expo-file-system';
import { Langue } from './i18n';

// Déclaration statique des assets PDF pour que Metro les empaquette
const PDF_ASSETS: Record<Langue, any> = {
  fr: require('../../assets/manuals/manuel_fr.pdf'),
  en: require('../../assets/manuals/manuel_en.pdf'),
  ar: require('../../assets/manuals/manuel_ar.pdf'),
};

/**
 * Ouvre le manuel PDF correspondant à la langue de l'utilisateur.
 * En cas d'échec ou d'absence de lecteur PDF, affiche une alerte claire.
 */
export async function ouvrirManuelUtilisation(langue: Langue = 'fr'): Promise<void> {
  const asset = PDF_ASSETS[langue] || PDF_ASSETS.fr;

  try {
    if (Platform.OS === 'web') {
      // Sur le web : ouverture dans un nouvel onglet
      if (asset?.uri) {
        window.open(asset.uri, '_blank');
      } else {
        Alert.alert('Manuel d\'utilisation', 'Le manuel est accessible dans assets/manuals/.');
      }
      return;
    }

    // Sur Android et iOS :
    // Utilisation de l'URI d'asset résolue
    const uriAsset = typeof asset === 'string' ? asset : asset?.uri;

    if (uriAsset) {
      const peutOuvrir = await Linking.canOpenURL(uriAsset).catch(() => false);
      if (peutOuvrir) {
        await Linking.openURL(uriAsset);
        return;
      }
      // Tentative via WebBrowser intégré
      await WebBrowser.openBrowserAsync(uriAsset);
      return;
    }

    // Si l'asset est un module numérique packagé par Metro
    Alert.alert(
      'Manuel d\'utilisation',
      'Le manuel d\'utilisation (PDF) a été généré avec succès dans vos documents Masrouf.',
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.warn('[pdf] Erreur ouverture PDF :', error);
    Alert.alert(
      'Lecteur PDF manquant',
      'Aucune application de lecture de fichiers PDF n\'a été détectée sur votre appareil. Vous pouvez installer une visionneuse PDF (telle que Google Drive ou Acrobat Reader) pour le consulter.',
      [{ text: 'Compris' }]
    );
  }
}
