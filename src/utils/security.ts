import * as Crypto from 'expo-crypto';

export async function hashPassword(password: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `masrouf:${password}`);
}

export function passwordChecks(password: string, confirm?: string) {
  return {
    length: password.length >= 8,
    number: /\d/.test(password),
    match: confirm === undefined ? true : password.length > 0 && password === confirm,
  };
}

export const isStrongPassword = (p: string) => {
  const c = passwordChecks(p);
  return c.length && c.number;
};

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export function randomTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out + String(Math.floor(10 + Math.random() * 89));
}
