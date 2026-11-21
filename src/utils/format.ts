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

// Noms complets des 12 mois du calendrier en langue anglaise
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

// Abréviations officielles des mois en français (alignées sur le design de l'application)
const MONTHS_FR = [
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.',
];

// Noms abrégés des mois en arabe
const MONTHS_AR = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

// Noms complets des mois en français
const MONTHS_FULL_FR = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

// Noms complets des mois en arabe
const MONTHS_FULL_AR = [
  'جانفي',
  'فيفري',
  'مارس',
  'أفريل',
  'ماي',
  'جوان',
  'جويلية',
  'أوت',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

/**
 * MISSION DE LA FONCTION : monthName
 *   Retourne le nom complet d'un mois en anglais selon son indice 0-11.
 * RÔLE DANS L'APPLICATION : Utilisé pour les en-têtes calendaires et récapitulatifs mensuels.
 * CE QUI EST AFFICHÉ À L'ÉCRAN : Le libellé complet du mois (ex: "November").
 */
// Définition de la fonction retournant le nom complet du mois
export const monthName = (i: number) => MONTHS[i];

/**
 * MISSION DE LA FONCTION : monthNameLocale
 *   Retourne le nom complet d'un mois selon la langue active (FR, AR, EN).
 */
export function monthNameLocale(i: number, lang: 'fr' | 'ar' | 'en' = 'fr'): string {
  const safeIdx = Math.max(0, Math.min(11, Math.floor(Number(i)) || 0));
  if (lang === 'ar') return MONTHS_FULL_AR[safeIdx] ?? 'نوفمبر';
  if (lang === 'fr') return MONTHS_FULL_FR[safeIdx] ?? 'Novembre';
  return MONTHS[safeIdx] ?? 'November';
}

/**
 * MISSION DE LA FONCTION : monthShort
 *   Retourne l'abréviation de 3 lettres d'un mois en anglais.
 * RÔLE DANS L'APPLICATION : Formatage condensé des dates.
 * CE QUI EST AFFICHÉ À L'ÉCRAN : L'abréviation de 3 lettres (ex: "Nov").
 */
// Définition de la fonction d'abréviation du mois
export const monthShort = (i: number) => MONTHS[i].slice(0, 3);

/**
 * MISSION DE LA FONCTION : monthShortLocale
 *   Retourne le nom abrégé du mois adapté à la langue sélectionnée par l'utilisateur (FR, AR, EN).
 * RÔLE DANS L'APPLICATION : Permet d'afficher les graduations exactes de l'axe temporel sur les courbes de prix.
 * CE QUI EST AFFICHÉ À L'ÉCRAN : Des étiquettes claires sous la courbe (ex: "Août", "Sept.", "Oct.", "Nov.").
 */
// Fonction de formatage abrégé du mois localisé
export function monthShortLocale(i: number, lang: 'fr' | 'ar' | 'en' = 'fr'): string {
  // Sécurisation de l'indice de mois entre 0 et 11
  const safeIdx = Math.max(0, Math.min(11, Math.floor(Number(i)) || 0));
  // Sélection de la liste arabe si la langue est 'ar'
  if (lang === 'ar') return MONTHS_AR[safeIdx] ?? 'نوفمبر';
  // Sélection de la liste française si la langue est 'fr'
  if (lang === 'fr') return MONTHS_FR[safeIdx] ?? 'Nov.';
  // Repli sur l'anglais par défaut
  return MONTHS[safeIdx]?.slice(0, 3) ?? 'Nov';
}

/**
 * MISSION DE LA FONCTION : fmtDateLocale
 *   Formate une date ISO (YYYY-MM-DD) dans la langue active avec le mois abrégé et l'année.
 * RÔLE DANS L'APPLICATION : Affichage harmonisé des dates des tickets de caisse et passages en caisse.
 * CE QUI EST AFFICHÉ À L'ÉCRAN : "12 nov. 2026", "12 Nov 2026", ou "12 نوفمبر 2026".
 */
// Fonction de formatage d'une date ISO complète localisée
export function fmtDateLocale(iso?: string, lang: 'fr' | 'ar' | 'en' = 'fr'): string {
  // Sécurisation contre les valeurs nulles ou indéfinies
  if (!iso || typeof iso !== 'string') return '';
  // Nettoyage de l'éventuelle composante horaire
  const clean = iso.split(' ')[0] || iso;
  // Vérification de la validité du format ISO
  if (!isValidISO(clean)) return clean;
  // Décomposition de la date en composantes UTC
  const d = parseISO(clean);
  // Récupération du numéro de jour
  const jour = d.getUTCDate();
  // Récupération du nom abrégé du mois selon la langue
  const mois = monthShortLocale(d.getUTCMonth(), lang);
  // Récupération de l'année à 4 chiffres
  const annee = d.getUTCFullYear();
  // Assemblage du libellé de date
  return `${jour} ${mois ? mois.toLowerCase() : ''} ${annee}`;
}

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
 * Alias officiel pour le formatage monétaire tunisien TND.
 */
export const formatTND = (n: number, decimals = 3) => `${dt(n, decimals)} DT`;

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
export function fmtRange(start: string, end: string, lang: 'fr' | 'ar' | 'en' = 'fr'): string {
  const a = parseISO(start);
  const b = parseISO(end);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const mon = (d: Date) => monthShortLocale(d.getUTCMonth(), lang).toUpperCase();
  if (sameMonth) return `${pad(a.getUTCDate())}–${pad(b.getUTCDate())} ${mon(b)} ${b.getUTCFullYear()}`;
  return `${pad(a.getUTCDate())} ${mon(a)} – ${pad(b.getUTCDate())} ${mon(b)} ${b.getUTCFullYear()}`;
}

/**
 * Calcule le prix unitaire d'un article : prix total divisé par quantité.
 */
export const unitPrice = (price: number, quantity: number) => (quantity > 0 ? price / quantity : 0);

/**
 * MISSION DE LA FONCTION : getExactMonthBounds
 *   Calcule rigoureusement les dates exactes de début (AAAA-MM-01) et de fin (dernier jour réel du mois)
 *   pour un mois ou une date ISO donnée.
 *   Gère parfaitement février bissextile (29 jours), les mois de 30 jours et de 31 jours.
 */
export function getExactMonthBounds(dateOrMonthStr?: string): {
  start: string;
  end: string;
  monthKey: string;
  year: number;
  month: number;
  lastDay: number;
} {
  let clean = dateOrMonthStr ? String(dateOrMonthStr).trim() : '';
  if (!clean || !/^\d{4}-\d{1,2}/.test(clean)) {
    clean = todayISO();
  }
  const parts = clean.split('-');
  const y = parseInt(parts[0], 10) || new Date().getFullYear();
  const m = parseInt(parts[1], 10) || 1; // 1 à 12
  const monthKey = `${y}-${pad(m)}`;
  const start = `${monthKey}-01`;
  // Dernier jour exact du mois en UTC
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${monthKey}-${pad(lastDay)}`;
  return { start, end, monthKey, year: y, month: m, lastDay };
}

/**
 * Message d'accueil selon l'heure de la journée.
 */
export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
