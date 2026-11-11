// ============================================================
// FICHIER : src/utils/session.ts
// RÔLE    : Gestion de la persistance sécurisée de la session utilisateur.
//           Permet à l'utilisateur de rester connecté même après
//           la fermeture complète de l'application mobile.
//
// POURQUOI expo-secure-store PLUTÔT QUE AsyncStorage ?
//   - AsyncStorage écrit les données en texte brut dans un fichier XML
//     ou SQLite non chiffré sur l'appareil. Sur un téléphone rooté ou
//     via une sauvegarde USB, n'importe qui peut lire ces informations.
//   - expo-secure-store chiffre les données au niveau matériel :
//       * Sur Android : via l'Android Keystore et des SharedPreferences chiffrées (AES-256).
//       * Sur iOS     : via le Keychain Apple adossé à l'enclave sécurisée (Secure Enclave).
//   - Sur le Web : un repli transparent sur localStorage est assuré pour éviter les erreurs.
// ============================================================

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_KEY = 'masrouf_auth_user_id';

// ------------------------------------------------------------
// FONCTION : saveSessionUserId
// RÔLE : Sauvegarde l'ID de l'utilisateur connecté dans le coffre sécurisé.
// ------------------------------------------------------------
export async function saveSessionUserId(userId: number): Promise<void> {
  try {
    const valeur = String(userId);
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SESSION_KEY, valeur);
      }
    } else {
      await SecureStore.setItemAsync(SESSION_KEY, valeur);
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la session sécurisée :', error);
  }
}

// ------------------------------------------------------------
// FONCTION : getSessionUserId
// RÔLE : Récupère l'ID de l'utilisateur stocké au lancement de l'application.
//        Retourne null si aucune session n'est enregistrée.
// ------------------------------------------------------------
export async function getSessionUserId(): Promise<number | null> {
  try {
    let valeur: string | null = null;

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        valeur = window.localStorage.getItem(SESSION_KEY);
      }
    } else {
      valeur = await SecureStore.getItemAsync(SESSION_KEY);
    }

    if (valeur) {
      const id = parseInt(valeur, 10);
      return isNaN(id) ? null : id;
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la lecture de la session sécurisée :', error);
    return null;
  }
}

// ------------------------------------------------------------
// FONCTION : clearSessionUserId
// RÔLE : Supprime la session lors de la déconnexion explicite.
// ------------------------------------------------------------
export async function clearSessionUserId(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(SESSION_KEY);
      }
    } else {
      await SecureStore.deleteItemAsync(SESSION_KEY);
    }
  } catch (error) {
    console.error('Erreur lors de la suppression de la session sécurisée :', error);
  }
}
