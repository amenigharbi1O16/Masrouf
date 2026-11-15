// ============================================================
// FICHIER : src/utils/photos.ts
// RÔLE DANS L'APPLICATION :
//   Module de sélection, capture et recadrage d'images pour les articles du catalogue
//   via la galerie photo du smartphone (expo-image-picker).
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme un photomaton ou un studio photo d'étiquettes : il demande gentiment
//   l'autorisation d'accéder à vos albums, vous propose de recadrer la photo du produit
//   en carré parfait, puis l'optimise pour qu'elle prenne un minimum de place sur l'étagère.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Permet d'ajouter une photo concrète à un produit lors de sa création ou modification,
//   affichée ensuite dans la vignette carrée `<ProductThumb />` du catalogue et du comparateur.
// ============================================================

import * as ImagePicker from 'expo-image-picker';

/**
 * MISSION DE LA FONCTION : pickPhoto
 *   Sollicite les autorisations d'accès à la médiathèque de l'appareil mobile, ouvre la galerie
 *   d'images du téléphone et permet à l'utilisateur de rogner l'image sélectionnée au format carré (1:1)
 *   avec un taux de compression optimisé (0.6).
 *
 * RÔLE DANS L'APPLICATION :
 *   Appelée lorsque l'utilisateur appuie sur "Ajouter une photo" ou sur la vignette du formulaire
 *   dans `nouveau-produit.tsx` ou `modifier-produit.tsx`.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Ouvre l'interface native de sélection d'images du système d'exploitation (Android ou iOS)
 *   avec cadre de recadrage carré, puis affiche immédiatement l'aperçu de la photo choisie.
 */
export async function pickPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });

  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}
