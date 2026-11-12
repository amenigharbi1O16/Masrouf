// ============================================================
// FICHIER : src/utils/security.ts
// RÔLE    : Module de cryptographie et sécurité des mots de passe.
//           Fournit le hachage PBKDF2-HMAC-SHA256 (10 000 itérations)
//           avec sel aléatoire unique par utilisateur via expo-crypto,
//           ainsi que la rétrocompatibilité SHA-256 v1 et la mise à niveau
//           automatique transparente vers v2 lors de la connexion.
//
// CONCEPTS CLÉS POUR LA SOUTENANCE :
//   1. Qu'est-ce que PBKDF2 (Password-Based Key Derivation Function 2) ?
//      Contrairement au SHA-256 simple qui s'exécute en quelques microsecondes
//      (ce qui permet à un attaquant de tester des milliards de combinaisons par seconde),
//      PBKDF2 applique 10 000 itérations successives avec HMAC-SHA256.
//      Cela ralentit considérablement les attaques par force brute sans ralentir
//      l'expérience de l'utilisateur légitime (~20-80 ms).
//
//   2. Pourquoi un sel cryptographique aléatoire par compte ?
//      Le sel (salt) est généré via expo-crypto (Crypto.getRandomValues).
//      Il garantit que deux utilisateurs ayant le même mot de passe
//      auront deux empreintes complètement différentes dans SQLite,
//      rendant les attaques par tables arc-en-ciel (rainbow tables) impossibles.
//
//   3. Gestion des versions de hachage (hash_version) :
//      - Version 1 : SHA-256 simple + sel (comptes historiques).
//      - Version 2 : PBKDF2 (10 000 itérations) + sel (nouveaux comptes et comptes migrés).
//
// FORMAT STOCKÉ DANS SQLITE :
//   "sel_hexadecimal:hash_hexadecimal" (ex: "a9f8e2...:c4b3d1...")
// ============================================================

import * as Crypto from 'expo-crypto';
import { pbkdf2 } from '@noble/hashes/pbkdf2';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

// Constante officielle pour le renforcement cryptographique
export const PBKDF2_ITERATIONS = 10000;
export const PBKDF2_KEY_LENGTH = 32; // 256 bits

// ------------------------------------------------------------
// FONCTION : generateSalt
// RÔLE : Génère un sel cryptographique aléatoire de 16 octets (32 caractères hexadécimaux).
//        Utilise obligatoirement Crypto.getRandomValues (jamais Math.random).
// ------------------------------------------------------------
export function generateSalt(): string {
  const randomBytes = Crypto.getRandomValues(new Uint8Array(16));
  return Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

// ------------------------------------------------------------
// FONCTION : hashPasswordV1 (Historique SHA-256 simple)
// RÔLE : Calcul rapide d'empreinte SHA-256 pour vérifier les anciens comptes.
// ------------------------------------------------------------
  export async function hashPasswordV1(password: string, salt: string): Promise<string> {
    const saltedString = `${password}:${salt}`;
  return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      saltedString
    );
  }

  // ------------------------------------------------------------
  // FONCTION : hashPasswordV2 (PBKDF2-HMAC-SHA256 - 10 000 itérations)
  // RÔLE : Hachage fort résistant aux attaques par force brute sur GPU/ASIC.
  // ------------------------------------------------------------
  export function hashPasswordV2(password: string, salt: string): string {
    const t0 = performance.now();
    // Calcul PBKDF2 avec SHA-256, 10 000 itérations et clé de 32 octets (256 bits)
    const derivedBytes = pbkdf2(sha256, password, salt, {
      c: PBKDF2_ITERATIONS,
      dkLen: PBKDF2_KEY_LENGTH,
    });
    const t1 = performance.now();
    const duree = (t1 - t0).toFixed(2);
    console.log(`[Sécurité PBKDF2] Hash calculé en ${duree} ms (${PBKDF2_ITERATIONS} itérations)`);
    return bytesToHex(derivedBytes);
  }

  // ------------------------------------------------------------
  // FONCTION : mesurerTempsPBKDF2
  // RÔLE : Mesure le temps réel d'exécution de PBKDF2 (10 000 itérations)
  //        directement sur l'appareil pour le rapporter au professeur/utilisateur.
  // ------------------------------------------------------------
  export function mesurerTempsPBKDF2(): number {
    const t0 = performance.now();
    pbkdf2(sha256, 'benchmark_test_password', 'benchmark_test_salt_16bytes', {
      c: PBKDF2_ITERATIONS,
      dkLen: PBKDF2_KEY_LENGTH,
    });
    const t1 = performance.now();
    const dureeMs = Math.round((t1 - t0) * 100) / 100;
    console.log(`[Benchmark PBKDF2] 10 000 itérations exécutées en ${dureeMs} ms sur cet appareil`);
    return dureeMs;
  }

  // ------------------------------------------------------------
  // FONCTION : createPasswordHash
  // RÔLE : Génère un nouveau sel aléatoire et calcule le hash (v2 par défaut).
  // RETOUR : "sel:hash"
  // ------------------------------------------------------------
    export async function createPasswordHash(
      password: string,
      version: number = 2
    ): Promise<string> {
      const salt = generateSalt();
      let hash = '';

      if (version === 1) {
        hash = await hashPasswordV1(password, salt);
      } else {
        hash = hashPasswordV2(password, salt);
      }

      return `${salt}:${hash}`;
    }

    // ------------------------------------------------------------
    // FONCTION : verifyPassword
    // RÔLE : Vérifie un mot de passe en clair selon sa version d'enregistrement.
    //        - Si version 1 : vérifie en SHA-256 simple.
    //        - Si version 2 : vérifie en PBKDF2 (10 000 itérations).
    // ------------------------------------------------------------
    export async function verifyPassword(
      password: string,
  storedHashWithSalt: string,
      version: number = 1
    ): Promise<boolean> {
      if (!storedHashWithSalt || !storedHashWithSalt.includes(':')) {
        return false;
      }

      const [salt, expectedHash] = storedHashWithSalt.split(':');
      if (!salt || !expectedHash) {
        return false;
      }

      let computedHash = '';
      if (version === 1) {
        computedHash = await hashPasswordV1(password, salt);
      } else {
        computedHash = hashPasswordV2(password, salt);
      }

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
