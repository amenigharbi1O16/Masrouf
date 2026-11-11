// ============================================================
// FICHIER : src/utils/security.ts
// RÔLE    : Module de cryptographie et sécurité des mots de passe.
//           Fournit le hachage SHA-256 avec sel aléatoire unique
//           par utilisateur pour qu'aucun mot de passe ne soit stocké
//           en texte clair dans SQLite.
//
// CONCEPTS CLÉS EXPLIQUÉS :
//   1. Qu'est-ce que le hachage (SHA-256) ?
//      C'est une fonction mathématique à sens unique : à partir d'un
//      mot de passe "secret123", elle produit une empreinte hexadécimale
//      de 64 caractères impossibles à inverser.
//
//   2. Pourquoi un "SEL" (Salt) aléatoire est-il indispensable ?
//      Sans sel : si deux utilisateurs choisissent "123456", leurs
//      empreintes dans la base de données seraient strictement identiques.
//      Un attaquant pourrait utiliser une "Table Arc-en-ciel" (Rainbow Table),
//      c'est-à-dire un dictionnaire géant de hashes précalculés, pour
//      deviner le mot de passe en 1 seconde.
//      Avec sel : on génère une chaîne aléatoire unique pour chaque compte.
//      L'empreinte devient SHA256(mot_de_passe + sel).
//      Même avec deux mots de passe identiques, les hashes stockés
//      sont radicalement différents, rendant les Rainbow Tables inutilisables !
//
// FORMAT STOCKÉ DANS SQLITE :
//   "sel_hexadecimal:hash_hexadecimal" (ex: "a9f8e2...:c4b3d1...")
// ============================================================

import * as Crypto from 'expo-crypto';

// ------------------------------------------------------------
// FONCTION : generateSalt
// RÔLE : Génère un sel cryptographique aléatoire de 16 octets (32 caractères hexadécimaux).
// ------------------------------------------------------------
export function generateSalt(): string {
  // Crypto.getRandomValues remplit un tableau avec des octets cryptographiquement sûrs
  const randomBytes = Crypto.getRandomValues(new Uint8Array(16));
  // Convertit les octets en chaîne hexadécimale (ex: "4f7a2b...")
  return Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// ------------------------------------------------------------
// FONCTION : hashPasswordWithSalt
// RÔLE : Calcule l'empreinte SHA-256 du mot de passe combiné à son sel.
// ------------------------------------------------------------
export async function hashPasswordWithSalt(
  password: string,
  salt: string
): Promise<string> {
  // Concaténation du mot de passe et du sel unique
  const saltedString = `${password}:${salt}`;

  // Calcul du hachage SHA-256 asynchrone via la puce cryptographique
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    saltedString
  );

  return hash;
}

// ------------------------------------------------------------
// FONCTION : createPasswordHash
// RÔLE : Crée le sel, calcule le hash et retourne la chaîne complète
//        à insérer directement dans la colonne 'password_hash' de SQLite.
// ------------------------------------------------------------
export async function createPasswordHash(password: string): Promise<string> {
  // 1. Génère un sel unique pour ce compte
  const salt = generateSalt();

  // 2. Calcule le hash SHA-256
  const hash = await hashPasswordWithSalt(password, salt);

  // 3. Retourne la combinaison sel:hash
  return `${salt}:${hash}`;
}

// ------------------------------------------------------------
// FONCTION : verifyPassword
// RÔLE : Vérifie si un mot de passe saisi en clair correspond à l'empreinte
//        stockée en base de données SQLite.
//
// PARAMÈTRES :
//   password           = Le mot de passe saisi par l'utilisateur lors du login
//   storedHashWithSalt = La chaîne "sel:hash" enregistrée dans la table
// ------------------------------------------------------------
export async function verifyPassword(
  password: string,
  storedHashWithSalt: string
): Promise<boolean> {
  // Si le champ est vide ou mal formaté, échec immédiat
  if (!storedHashWithSalt || !storedHashWithSalt.includes(':')) {
    return false;
  }

  // Découpe pour extraire le sel original et le hash attendu
  const [salt, expectedHash] = storedHashWithSalt.split(':');

  if (!salt || !expectedHash) {
    return false;
  }

  // Recalcule le hash avec le mot de passe saisi et le sel extrait
  const computedHash = await hashPasswordWithSalt(password, salt);

  // Compare les deux empreintes : correspondance exacte = mot de passe valide
  return computedHash.toLowerCase() === expectedHash.toLowerCase();
}

// ------------------------------------------------------------
// FONCTION : generateTemporaryPassword
// RÔLE : Génère un mot de passe temporaire aléatoire (ex: "K8m#P2w9")
//        lorsqu'un administrateur réinitialise le compte d'un utilisateur.
// ------------------------------------------------------------
export function generateTemporaryPassword(longueur: number = 8): string {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
  let tempPass = '';
  const randomValues = Crypto.getRandomValues(new Uint8Array(longueur));

  for (let i = 0; i < longueur; i++) {
    const index = randomValues[i] % caracteres.length;
    tempPass += caracteres.charAt(index);
  }

  return tempPass;
}

