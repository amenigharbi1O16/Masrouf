// ============================================================
// FICHIER : src/utils/photos.ts
// RÔLE DANS L'APPLICATION :
//   Module de capture (appareil photo / caméra) et de sélection (galerie d'images)
//   avec recadrage au format carré (1:1) pour les articles du catalogue Masrouf (expo-image-picker).
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme un studio photo complet pour vos courses :
//   - Soit vous prenez un cliché en direct avec l'objectif de votre smartphone devant le rayon du magasin.
//   - Soit vous choisissez une photo déjà enregistrée dans vos albums.
//   L'outil vous permet de cadrer l'article en carré parfait et compresse l'image pour un chargement instantané.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Permet d'ajouter une vraie photo prise sur le vif ou depuis la galerie,
//   affichée ensuite dans la vignette carrée `<ProductThumb />` du catalogue, de la fiche produit et du comparateur.
// ============================================================

import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/**
 * MISSION DE LA FONCTION : takePhotoWithCamera
 *   Sollicite l'autorisation d'accéder à l'appareil photo du smartphone, ouvre la caméra native,
 *   permet à l'utilisateur de photographier son article puis de le rogner au format carré (1:1)
 *   avec un taux de compression optimisé (0.6).
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet à l'utilisateur de prendre directement en photo un produit dans un rayon ou sur sa table de cuisine.
 *
 * @returns L'URI locale de la photo prise, ou null en cas d'annulation ou refus de permission.
 */
export async function takePhotoWithCamera(): Promise<string | null> {
  try {
    // 1. Demande de permission pour l'appareil photo
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Appareil photo',
          'L\'accès à l\'appareil photo est nécessaire pour photographier vos produits.'
        );
      }
      return null;
    }

    // 2. Déclenchement de la caméra native
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (res.canceled || !res.assets?.length) return null;
    return res.assets[0].uri;
  } catch (err) {
    console.warn('[photos] Erreur lors de la capture photo par caméra :', err);
    return null;
  }
}

/**
 * MISSION DE LA FONCTION : pickPhotoFromGallery
 *   Sollicite l'autorisation d'accéder à la médiathèque/galerie d'images, ouvre le sélecteur d'albums
 *   et permet de rogner la photo choisie au format carré (1:1).
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet de sélectionner une photo de produit existante déjà enregistrée dans la mémoire de l'appareil.
 *
 * @returns L'URI locale de la photo choisie, ou null en cas d'annulation ou refus de permission.
 */
export async function pickPhotoFromGallery(): Promise<string | null> {
  try {
    // 1. Demande de permission pour la médiathèque
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Galerie photos',
          'L\'accès à vos photos est nécessaire pour choisir une image de produit.'
        );
      }
      return null;
    }

    // 2. Ouverture de la galerie
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });

    if (res.canceled || !res.assets?.length) return null;
    return res.assets[0].uri;
  } catch (err) {
    console.warn('[photos] Erreur lors de la sélection depuis la galerie :', err);
    return null;
  }
}

/**
 * MISSION DE LA FONCTION : pickPhoto
 *   Fonction universelle de sélection d'image avec choix de source ('camera' ou 'gallery').
 *   Par défaut, bascule sur la galerie pour assurer une rétro-compatibilité 100% transparente.
 *
 * @param source 'camera' pour utiliser l'appareil photo, 'gallery' pour ouvrir les albums (défaut)
 */
export async function pickPhoto(source: 'camera' | 'gallery' = 'gallery'): Promise<string | null> {
  if (source === 'camera') {
    return takePhotoWithCamera();
  }
  return pickPhotoFromGallery();
}
