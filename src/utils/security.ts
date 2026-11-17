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
export interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  number: boolean;
  special: boolean;
  match: boolean;
  allValid: boolean;
}

/**
 * MISSION DE LA FONCTION : passwordChecks
 *   Évalue les 4 critères obligatoires de sécurité d'un mot de passe :
 *   1. Longueur minimale de 8 caractères
 *   2. Au moins une lettre majuscule (A-Z)
 *   3. Au moins un chiffre (0-9)
 *   4. Au moins un caractère spécial (!@#$%...)
 *   Et la concordance exacte avec le champ de confirmation.
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit l'état en temps réel aux formulaires d'inscription et de réinitialisation.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Indicateurs interactifs de conformité avec coches vertes instantanées avant soumission.
 *
 * @param password Mot de passe à vérifier.
 * @param confirm Mot de passe de confirmation (optionnel).
 */
export function passwordChecks(password: string, confirm?: string): PasswordChecks {
  const p = password || '';
  const length = p.length >= 8;
  const uppercase = /[A-Z]/.test(p);
  const number = /[0-9]/.test(p);
  const special = /[^A-Za-z0-9]/.test(p);
  const match = confirm === undefined ? true : p.length > 0 && p === confirm;
  const allValid = length && uppercase && number && special;
  return {
    length,
    uppercase,
    number,
    special,
    match,
    allValid,
  };
}

/**
 * MISSION DE LA FONCTION : getMissingPasswordRequirements
 *   Identifie explicitement la liste des critères de mot de passe non encore satisfaits
 *   afin d'afficher un retour explicite et guidé à l'utilisateur.
 */
export function getMissingPasswordRequirements(
  password: string,
  t: (k: string) => string
): string[] {
  const c = passwordChecks(password);
  const missing: string[] = [];
  if (!c.length) missing.push(t('regle_8_chars'));
  if (!c.uppercase) missing.push(t('regle_majuscule'));
  if (!c.number) missing.push(t('regle_chiffre'));
  if (!c.special) missing.push(t('regle_special'));
  return missing;
}

/**
 * MISSION DE LA FONCTION : isStrongPassword
 *   Retourne `true` uniquement si le mot de passe satisfait aux 4 exigences de sécurité :
 *   au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.
 */
export const isStrongPassword = (p: string): boolean => {
  const c = passwordChecks(p);
  return c.allValid;
};

/**
 * Expression régulière stricte pour valider les adresses Gmail uniquement :
 * Format standard : nom@gmail.com (insensible à la casse)
 */
export const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

/**
 * MISSION DE LA FONCTION : isValidGmail
 *   Vérifie qu'une adresse email suit strictement le format Gmail requis (nom@gmail.com).
 *   Utilisée de façon uniforme sur l'ensemble de l'application Masrouf.
 */
export function isValidGmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return GMAIL_REGEX.test(email.trim());
}

/**
 * MISSION DE LA FONCTION : isValidLoginEmail
 *   Valide une adresse pour la connexion : n'autorise strictement que les adresses Gmail valides
 *   (incluant admin@gmail.com, user@gmail.com, ines.benali@gmail.com et tout compte name@gmail.com).
 *   Tous les anciens emails avec .tn ou d'autres domaines sont strictement refusés.
 */
export function isValidLoginEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return isValidGmail(email);
}

/**
 * MISSION DE LA FONCTION : isEmail
 *   Vérifie le format d'email : applique strictement la validation Gmail partout dans l'application.
 */
export const isEmail = (s: string): boolean => isValidGmail(s);

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
