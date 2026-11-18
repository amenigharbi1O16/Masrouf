// ============================================================
// FICHIER : src/utils/pdf.ts
// RÔLE DANS L'APPLICATION :
//   Gestionnaire centralisé pour l'ouverture et la consultation du Manuel d'utilisation (PDF).
//   Garantit que le clic sur le cadre "Manuel d'utilisation (PDF)" dans les pages de réglages
//   ouvre immédiatement le document complet correspondant à la langue sélectionnée (FR, EN ou AR).
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est la notice officielle de bord du véhicule : lorsque l'usager demande
//   à consulter le manuel, le livret technique s'ouvre directement sous ses yeux
//   dans sa propre langue (Français, Anglais ou Arabe).
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   - Affiche le manuel d'utilisation complet avec pagination (1/4 à 4/4) et mise en page PDF soignée.
//   - Permet d'ouvrir également le fichier binaire `.pdf` natif dans un navigateur ou lecteur externe.
//   - Fonctionne sur 100% des smartphones sans dépendre obligatoirement d'une application tierce installée.
// ============================================================

// Importation des utilitaires d'alerte, de plateforme et d'URL
import { Alert, Platform } from 'react-native';
// Gestionnaire de liens externes natifs
import * as Linking from 'expo-linking';
// Navigateur Web intégré d'Expo pour l'affichage de documents distants
import * as WebBrowser from 'expo-web-browser';
// Déclaration des assets d'Expo
import { Asset } from 'expo-asset';
// Moteur de routage impératif pour naviguer vers l'écran dédié
import { router } from 'expo-router';
// Types de langues supportées et fonction de lecture de la langue active
import { Langue, getModuleLangue } from './languageStorage';

/**
 * Déclaration des ressources statiques PDF compilées avec Metro.
 * Chaque langue dispose de son fichier PDF officiel dédié dans assets/manuals/.
 */
export const PDF_ASSETS: Record<Langue, number> = {
  // Manuel en français
  fr: require('../../assets/manuals/manuel_fr.pdf'),
  // Manuel en anglais
  en: require('../../assets/manuals/manuel_en.pdf'),
  // Manuel en arabe
  ar: require('../../assets/manuals/manuel_ar.pdf'),
};

/**
 * MISSION DE LA FONCTION : resoudreUriAssetPdf
 *   Charge de manière asynchrone l'asset PDF empaqueté et retourne son URI exploitable.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet d'extraire le fichier PDF du bundle de l'application vers le système de fichiers.
 *
 * @param langue Code de la langue ('fr', 'en', 'ar')
 * @returns Objet contenant l'URI distante et locale de l'asset
 */
export async function resoudreUriAssetPdf(langue: Langue = 'fr'): Promise<{ uri: string; localUri: string | null }> {
  try {
    // Sélection de l'asset selon la langue demandée (repli sécurisé sur le français)
    const assetModule = PDF_ASSETS[langue] || PDF_ASSETS.fr;
    // Chargement et extraction par le moteur expo-asset
    const assets = await Asset.loadAsync(assetModule);
    // Première ressource résolue
    const asset = assets[0];
    return {
      uri: asset?.uri || '',
      localUri: asset?.localUri || null,
    };
  } catch (err) {
    // Avertissement silencieux en cas d'impossibilité de résolution
    console.warn('[pdf] Erreur de résolution de l\'asset PDF :', err);
    return { uri: '', localUri: null };
  }
}

/**
 * MISSION DE LA FONCTION : ouvrirFichierPdfNatif
 *   Tente d'ouvrir le fichier PDF brut dans le lecteur de documents externe ou le navigateur Web.
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit une option de téléchargement ou d'impression du fichier PDF original.
 *
 * @param langue Code de la langue ('fr', 'en', 'ar')
 */
export async function ouvrirFichierPdfNatif(langue: Langue = 'fr'): Promise<void> {
  try {
    // Résolution de l'asset
    const { uri, localUri } = await resoudreUriAssetPdf(langue);
    const targetUri = localUri || uri;

    // Sur environnement Web : ouverture dans un nouvel onglet
    if (Platform.OS === 'web') {
      if (uri && typeof window !== 'undefined') {
        window.open(uri, '_blank');
        return;
      }
    }

    // Sur mobile : si l'URI est accessible via HTTP (serveur dev Metro ou distant)
    if (uri && (uri.startsWith('http://') || uri.startsWith('https://'))) {
      await WebBrowser.openBrowserAsync(uri);
      return;
    }

    // Si une URI locale est disponible
    if (targetUri) {
      const peutOuvrir = await Linking.canOpenURL(targetUri).catch(() => false);
      if (peutOuvrir) {
        await Linking.openURL(targetUri);
        return;
      }
    }

    // Boîte de dialogue informative si aucun lecteur externe n'a pu être déclenché directement
    Alert.alert(
      langue === 'ar' ? 'ملف PDF' : langue === 'en' ? 'PDF File' : 'Fichier PDF',
      langue === 'ar'
        ? 'يمكنك معاينة الدليل الكامل مباشرة من الشاشة الحالية أو تنزيله عبر متصفح جهازك.'
        : langue === 'en'
        ? 'You can view the full manual directly in the app or open it with your device viewer.'
        : 'Vous pouvez consulter le manuel complet directement dans l\'application ou l\'ouvrir avec votre lecteur.',
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.warn('[pdf] Erreur lors de l\'ouverture du fichier natif :', error);
  }
}

/**
 * MISSION DE LA FONCTION : ouvrirManuelUtilisation
 *   Point d'entrée principal déclenché lors du clic sur le cadre "Manuel d'utilisation (PDF)".
 *   Ouvre immédiatement l'écran de consultation PDF dans l'application, configuré selon la langue choisie.
 *
 * RÔLE DANS L'APPLICATION :
 *   Garantit que l'utilisateur accède directement et sans blocage à son manuel d'utilisation en FR, EN ou AR.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - L'écran complet du Manuel d'utilisation au format PDF avec ses 4 pages illustrées.
 *   - Sur Web : ouvre également l'onglet de document PDF en parallèle.
 *
 * @param langue Langue active ('fr', 'en', 'ar'). Si omise, lit dynamiquement la langue du store.
 */
export async function ouvrirManuelUtilisation(langue: Langue = (getModuleLangue() || 'fr')): Promise<void> {
  // 1. Navigation immédiate vers l'écran dédié du Manuel d'utilisation avec paramètre de langue
  try {
    router.push({
      pathname: '/manuel-utilisation',
      params: { lang: langue },
    } as never);
  } catch (err) {
    // Avertissement console en cas d'impossibilité de navigation
    console.warn('[pdf] Navigation vers /manuel-utilisation échouée, tentative directe:', err);
    // 2. Repli en cas d'échec de navigation : tentative d'ouverture du fichier externe
    await ouvrirFichierPdfNatif(langue);
  }

  // Sur Web uniquement, ouvre aussi l'asset PDF dans un nouvel onglet pour commodité
  if (Platform.OS === 'web') {
    try {
      const { uri } = await resoudreUriAssetPdf(langue);
      if (uri && typeof window !== 'undefined') {
        window.open(uri, '_blank');
      }
    } catch { }
  }
}
