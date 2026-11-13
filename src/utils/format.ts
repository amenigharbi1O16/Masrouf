// ============================================================
// FICHIER : src/utils/format.ts
// MISSION : Formatage centralisé unique pour toute l'application :
//           - Montants en Dinars Tunisiens (3 décimales obligatoires)
//           - Pourcentages (1 décimale, gestion division par zéro)
//           - Dates et périodes
//           - Chiffres occidentaux (123...) et unité collée en arabe (د.ت)
// ============================================================

/**
 * Formate un montant en Dinars Tunisiens (DT) avec exactement 3 décimales.
 * @param montant Montant en DT (ex: 14.5)
 * @param langue Code langue actuel ('fr', 'ar', 'en')
 */
export function formatDT(montant: number | null | undefined, langue: string = 'fr'): string {
  const valeur = typeof montant === 'number' && !isNaN(montant) ? montant : 0;
  const fixe = valeur.toFixed(3);

  // En arabe : chiffres occidentaux conservés pour lisibilité financière, unité collée
  if (langue === 'ar') {
    return `${fixe}د.ت`;
  }
  return `${fixe} DT`;
}

/**
 * Formate un pourcentage avec 1 décimale et arrondi propre.
 * @param pct Valeur du pourcentage (ex: 42.678)
 * @param avecSigne Si true, ajoute '+' pour les valeurs positives
 */
export function formatPourcentage(pct: number | null | undefined, avecSigne: boolean = false): string {
  if (pct === null || pct === undefined || isNaN(pct)) return '0.0 %';
  const fixe = pct.toFixed(1);
  if (avecSigne && pct > 0) {
    return `+${fixe} %`;
  }
  return `${fixe} %`;
}

/**
 * Noms de mois abrégés selon la langue
 */
const MOIS_ABR: Record<string, string[]> = {
  fr: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

/**
 * Formate une date ISO (AAAA-MM-JJ) de manière lisible et localisée.
 */
export function formatDate(dateIso: string | null | undefined, langue: string = 'fr'): string {
  if (!dateIso) return '—';
  try {
    const [annee, moisStr, jourStr] = dateIso.split('-');
    const mIndex = parseInt(moisStr, 10) - 1;
    const j = parseInt(jourStr, 10);
    const noms = MOIS_ABR[langue] || MOIS_ABR.fr;
    const moisNom = noms[mIndex] || moisStr;

    if (langue === 'ar') {
      return `${j} ${moisNom} ${annee}`;
    }
    return `${j} ${moisNom} ${annee}`;
  } catch {
    return dateIso;
  }
}

/**
 * Formate une période (ex: "01–30 nov. 2026")
 */
export function formatPeriode(debutIso: string, finIso: string, langue: string = 'fr'): string {
  if (!debutIso || !finIso) return '—';
  try {
    const [, m1, j1] = debutIso.split('-');
    const [a2, m2, j2] = finIso.split('-');
    const noms = MOIS_ABR[langue] || MOIS_ABR.fr;
    const mIndex = parseInt(m2, 10) - 1;
    const moisNom = noms[mIndex] || m2;

    if (m1 === m2) {
      return `${j1}–${j2} ${moisNom} ${a2}`;
    }
    const m1Index = parseInt(m1, 10) - 1;
    const m1Nom = noms[m1Index] || m1;
    return `${j1} ${m1Nom} – ${j2} ${moisNom} ${a2}`;
  } catch {
    return `${debutIso} – ${finIso}`;
  }
}
