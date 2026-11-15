// ============================================================
// FICHIER : src/utils/format.ts
// RÔLE    : Fonctions utilitaires de formatage des nombres,
//           des devises en dinars tunisiens (DT, 3 décimales),
//           des dates ISO et calculs d'intervalles calendaires.
//
// CONFORMITÉ MÉTIER :
//   - Le Dinar Tunisien (DT) se divise en 1000 millimes et s'exprime
//     obligatoirement avec 3 chiffres après la virgule (ex: "1,250 DT").
//   - Toutes les dates sont stockées sous format normalisé ISO-8601 (YYYY-MM-DD).
// ============================================================

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** Retourne le nom complet du mois en anglais */
export const monthName = (i: number) => MONTHS[i];

/** Retourne l'abréviation de 3 lettres du mois */
export const monthShort = (i: number) => MONTHS[i].slice(0, 3);

/**
 * Génère un identifiant unique aléatoire combinant timestamp et entropie.
 */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Formate un nombre décimal en chaîne avec séparateur de milliers et décimales fixes (par défaut 3).
 * Exemple : 1234.5 -> "1,234.500"
 * @param n Montant numérique.
 * @param decimals Nombre de décimales après la virgule (défaut : 3 pour DT).
 */
export function dt(n: number, decimals = 3): string {
  const safe = Number.isFinite(n) ? n : 0;
  const fixed = Math.abs(safe).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${safe < 0 ? '−' : ''}${withCommas}${dec ? '.' + dec : ''}`;
}

/**
 * Formate un montant en Dinars Tunisiens suivi du suffixe " DT".
 * Exemple : 14.5 -> "14.500 DT"
 */
export const money = (n: number, decimals = 3) => `${dt(n, decimals)} DT`;

/**
 * Alias officiel pour le formatage standard DT.
 */
export const formatDT = (n: number, decimals = 3) => `${dt(n, decimals)} DT`;

/**
 * Formatage compact : omet les décimales si le montant est entier (ex: 320 -> "320"),
 * sinon conserve les 3 décimales (ex: 14.5 -> "14.500").
 */
export const short = (n: number) => (Math.round(n * 1000) % 1000 === 0 ? dt(n, 0) : dt(n, 3));

/**
 * Convertit une chaîne de caractères saisie au clavier en nombre flottant valide.
 * Accepte indifféremment la virgule ou le point comme séparateur décimal.
 */
export function toNum(s: string): number {
  const n = parseFloat(String(s).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

/** Ajoute un zéro initial si le chiffre est inférieur à 10 */
export const pad = (n: number) => String(n).padStart(2, '0');

/** Convertit un objet Date JavaScript en chaîne ISO `YYYY-MM-DD` (UTC) */
export const toISO = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

/**
 * Retourne la date courante locale sous le format `YYYY-MM-DD`.
 */
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Vérifie si une chaîne correspond strictement à une date valide au format `YYYY-MM-DD`.
 */
export function isValidISO(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d));
  return x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d;
}

/**
 * Analyse une chaîne `YYYY-MM-DD` et renvoie l'objet Date correspondant en UTC.
 */
export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Ajoute un nombre de jours positif ou négatif à une date ISO.
 */
export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/**
 * Calcule le nombre de jours inclus entre deux dates ISO.
 */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000) + 1;
}

/**
 * Formate une date ISO sous une forme lisible (ex: "14 Nov 2026").
 */
export function fmtDate(iso: string): string {
  if (!isValidISO(iso)) return iso;
  const d = parseISO(iso);
  return `${d.getUTCDate()} ${monthShort(d.getUTCMonth())} ${d.getUTCFullYear()}`;
}

/**
 * Formate une plage de dates pour les en-têtes de budget (ex: "01–30 NOV 2026").
 */
export function fmtRange(start: string, end: string): string {
  const a = parseISO(start);
  const b = parseISO(end);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const mon = (d: Date) => monthShort(d.getUTCMonth()).toUpperCase();
  if (sameMonth) return `${pad(a.getUTCDate())}–${pad(b.getUTCDate())} ${mon(b)} ${b.getUTCFullYear()}`;
  return `${pad(a.getUTCDate())} ${mon(a)} – ${pad(b.getUTCDate())} ${mon(b)} ${b.getUTCFullYear()}`;
}

/**
 * Calcule le prix unitaire d'un article : prix total divisé par quantité.
 */
export const unitPrice = (price: number, quantity: number) => (quantity > 0 ? price / quantity : 0);

/**
 * Message d'accueil selon l'heure de la journée.
 */
export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
