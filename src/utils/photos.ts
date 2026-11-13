// ============================================================
// FICHIER : src/utils/photos.ts
// MISSION : Copier une photo temporaire vers le stockage permanent
//           de l'application, et reconstruire le chemin à l'affichage.
//
// POURQUOI stocker seulement le NOM :
//   Après une mise à jour Expo, le chemin complet change.
//   Le nom seul reste stable ; on le recolle à Paths.document.
//
// API Expo 58 : File, Directory, Paths (pas FileSystem.copyAsync).
// ============================================================

import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';

const DOSSIER_PHOTOS = 'product-photos';

function dossierPhotos(): Directory {
  const dir = new Directory(Paths.document, DOSSIER_PHOTOS);
  if (!dir.exists) {
    dir.create();
  }
  return dir;
}

/** Chemin complet à partir du nom enregistré en base. Vide si pas de photo. */
export function uriPhotoProduit(nomFichier: string | null | undefined): string {
  if (!nomFichier) return '';
  try {
    const fichier = new File(dossierPhotos(), nomFichier);
    return fichier.exists ? fichier.uri : '';
  } catch {
    return '';
  }
}

/** Supprime le fichier photo s'il existe. Sans erreur si déjà absent. */
export function supprimerFichierPhoto(nomFichier: string | null | undefined): void {
  if (!nomFichier) return;
  try {
    const fichier = new File(dossierPhotos(), nomFichier);
    if (fichier.exists) {
      fichier.delete();
    }
  } catch {
    // Fichier déjà manquant : on ignore.
  }
}

/**
 * Demande caméra ou galerie, copie vers le dossier permanent,
 * renvoie le NOM du fichier (à enregistrer dans product.photo_path).
 * null = annulation ou permission refusée (la photo reste facultative).
 */
export async function choisirPhotoProduit(): Promise<string | null> {
  const choix = await new Promise<'camera' | 'gallery' | 'cancel'>((resolve) => {
    Alert.alert(
      'Photo du produit',
      'La photo est facultative. Choisissez une source.',
      [
        { text: 'Prendre une photo', onPress: () => resolve('camera') },
        { text: 'Choisir dans la galerie', onPress: () => resolve('gallery') },
        { text: 'Annuler', style: 'cancel', onPress: () => resolve('cancel') },
      ]
    );
  });

  if (choix === 'cancel') return null;

  if (choix === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission refusée',
        'L’accès à la caméra est refusé. Vous pouvez continuer sans photo, ou l’autoriser dans les réglages du téléphone.'
      );
      return null;
    }
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Permission refusée',
        'L’accès à la galerie est refusé. Vous pouvez continuer sans photo, ou l’autoriser dans les réglages du téléphone.'
      );
      return null;
    }
  }

  const resultat =
    choix === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7,
        });

  if (resultat.canceled || !resultat.assets?.[0]?.uri) {
    return null;
  }

  const uriTemporaire = resultat.assets[0].uri;
  const extension = uriTemporaire.toLowerCase().includes('.png') ? 'png' : 'jpg';
  const nom = `p_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${extension}`;

  try {
    const source = new File(uriTemporaire);
    const destination = new File(dossierPhotos(), nom);
    await source.copy(destination);
    return nom;
  } catch (err) {
    console.warn('[photos] Copie impossible', Platform.OS, err);
    Alert.alert('Photo', 'Impossible d’enregistrer la photo. Vous pouvez continuer sans.');
    return null;
  }
}
