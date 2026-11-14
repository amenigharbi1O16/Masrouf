const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const monthName = (i: number) => MONTHS[i];
export const monthShort = (i: number) => MONTHS[i].slice(0, 3);

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/** 1234.5 -> "1,234.500" */
export function dt(n: number, decimals = 3): string {
  const safe = Number.isFinite(n) ? n : 0;
  const fixed = Math.abs(safe).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${safe < 0 ? '−' : ''}${withCommas}${dec ? '.' + dec : ''}`;
}
export const money = (n: number, decimals = 3) => `${dt(n, decimals)} DT`;
/** Compact amount: 320 stays "320", 14.5 becomes "14.500" */
export const short = (n: number) => (Math.round(n * 1000) % 1000 === 0 ? dt(n, 0) : dt(n, 3));

export function toNum(s: string): number {
  const n = parseFloat(String(s).replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(n) ? n : NaN;
}

export const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidISO(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const x = new Date(Date.UTC(y, m - 1, d));
  return x.getUTCFullYear() === y && x.getUTCMonth() === m - 1 && x.getUTCDate() === d;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** inclusive number of days */
export function daysBetween(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000) + 1;
}

export function fmtDate(iso: string): string {
  if (!isValidISO(iso)) return iso;
  const d = parseISO(iso);
  return `${d.getUTCDate()} ${monthShort(d.getUTCMonth())} ${d.getUTCFullYear()}`;
}

export function fmtRange(start: string, end: string): string {
  const a = parseISO(start);
  const b = parseISO(end);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear();
  const mon = (d: Date) => monthShort(d.getUTCMonth()).toUpperCase();
  if (sameMonth) return `${pad(a.getUTCDate())}–${pad(b.getUTCDate())} ${mon(b)} ${b.getUTCFullYear()}`;
  return `${pad(a.getUTCDate())} ${mon(a)} – ${pad(b.getUTCDate())} ${mon(b)} ${b.getUTCFullYear()}`;
}

export const unitPrice = (price: number, quantity: number) => (quantity > 0 ? price / quantity : 0);

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
