// ============================================================
// FICHIER : src/utils/security.ts
// RÔLE DANS L'APPLICATION :
//   Moteur de sécurité cryptographique, de validation des identifiants et de protection des données :
//   - Hachage irréversible SHA-256 avec sel applicatif pour les mots de passe (expo-crypto).
//   - Contrôle de robustesse (minimum 8 caractères et au moins 1 chiffre).
//   - Validation syntaxique stricte des adresses courriel (regex).
//   - Génération de mots de passe temporaires hautement sécurisés et lisibles pour les administrateurs.
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme un serrurier et un broyeur de documents confidentiels réunis :
//   dès que vous lui donnez votre clé secrète, il ne la conserve jamais telle quelle,
//   il la transforme en une empreinte d'empreinte digitale infalsifiable et vérifie
//   que votre clé est suffisamment solide pour résister aux cambrioleurs.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Affiche les indicateurs de solidité sous les champs de mot de passe (coche verte si >= 8 caractères
//   et présence de chiffre, rouge sinon) et empêche la soumission de formulaires invalides.
// ============================================================

import * as Crypto from 'expo-crypto';

/**
 * MISSION DE LA FONCTION : hashPassword
 *   Calcule l'empreinte cryptographique SHA-256 salée d'un mot de passe saisi en clair.
 *   Le préfixe applicatif `masrouf:` empêche les attaques par dictionnaires précalculés (rainbow tables).
 *
 * RÔLE DANS L'APPLICATION :
 *   Appelée à chaque inscription, connexion et changement de mot de passe pour ne JAMAIS
 *   stocker ni transmettre de mot de passe en clair dans la base SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Opération d'arrière-plan sans rendu direct. Protège l'utilisateur en cas de vol de l'appareil.
 *
 * @param password Mot de passe en clair saisi par l'utilisateur.
 */
export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `masrouf:${password}`);
}

/**
 * MISSION DE LA FONCTION : passwordChecks
 *   Évalue les 3 critères obligatoires d'un mot de passe : longueur minimale de 8 caractères,
 *   présence d'au moins un chiffre, et concordance parfaite avec la confirmation.
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit l'état en temps réel aux formulaires d'inscription et de réinitialisation.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Colore les pastilles et textes d'exigence (vert si validé, gris/rouge si incomplet).
 *
 * @param password Mot de passe à vérifier.
 * @param confirm Mot de passe de confirmation (optionnel).
 */
export function passwordChecks(password: string, confirm?: string) {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
    match: confirm === undefined ? true : password.length > 0 && password === confirm,
  };
}

/**
 * MISSION DE LA FONCTION : isStrongPassword
 *   Retourne `true` uniquement si le mot de passe atteint la longueur requise et comporte un chiffre.
 *
 * RÔLE DANS L'APPLICATION :
 *   Active ou désactive le bouton principal "Créer mon compte" ou "Changer mon mot de passe".
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Déverrouille le bouton vert de soumission du formulaire.
 */
export const isStrongPassword = (p: string) => {
  const c = passwordChecks(p);
  return c.length && c.number;
};

/**
 * MISSION DE LA FONCTION : isEmail
 *   Valide le format standardisé d'une adresse email au moyen d'une expression régulière.
 *
 * RÔLE DANS L'APPLICATION :
 *   Prévient les erreurs de frappe avant l'envoi de la requête de connexion à SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Affiche ou masque le message d'erreur rouge "Format d'email invalide".
 */
export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/**
 * MISSION DE LA FONCTION : randomTemporaryPassword
 *   Génère un mot de passe temporaire robuste de 10 caractères aléatoires, exempt de caractères
 *   confus (pas de zéro '0', pas de lettre 'O', pas de 'I', pas de 'l').
 *
 * RÔLE DANS L'APPLICATION :
 *   Utilisée par l'administrateur lors du dépannage d'un utilisateur ayant égaré son mot de passe.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Affiché en clair dans un encart sécurisé sur l'écran `mot-de-passe-temporaire.tsx`.
 */
export function randomTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + String(Math.floor(10 + Math.random() * 89));
}
