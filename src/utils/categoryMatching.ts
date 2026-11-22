/**
 * FICHIER : src/utils/categoryMatching.ts
 * RÔLE    : Utilitaires centralisés pour la normalisation, la déduplication et
 *           l'identification canonique des catégories, en particulier la catégorie
 *           canonique "Enfant".
 *
 * RÈGLES MÉTIER :
 * 1. Le nom officiel de la catégorie pour les enfants est strictement "Enfant".
 * 2. La détection et le rapprochement sont insensibles à la casse, aux accents,
 *    aux espaces superflus et au singulier/pluriel (ex: "Enfant", "enfants", "ENFANT",
 *    "Children", "children", "أطفال" sont traités comme la même catégorie).
 * 3. Interdiction absolue de créer des catégories en double ou des budgets séparés
 *    à cause de différences de casse ou du 's' final.
 */

import type { Category } from '@/state/types';

export const CANONICAL_ENFANT_ID = 'children';
export const CANONICAL_ENFANT_NAME = 'Enfant';

/**
 * Normalise un nom ou une chaîne de catégorie pour comparaison stricte.
 * Supprime les accents, met en minuscules, compresse les espaces, et
 * harmonise le singulier/pluriel sur les noms courants en retirant le 's' final.
 */
export function normalizeCategoryKey(name?: unknown): string {
  if (typeof name !== 'string') {
    if (!name) return '';
    if (typeof name === 'number') {
      name = String(name);
    } else if (typeof name === 'object' && name !== null) {
      const obj = name as any;
      name = typeof obj.name === 'string'
        ? obj.name
        : typeof obj.name_key === 'string'
        ? obj.name_key
        : typeof obj.nom === 'string'
        ? obj.nom
        : '';
    } else {
      return '';
    }
  }
  const str = name as string;
  let s = str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents (ex: é -> e)
    .replace(/[_\-]+/g, ' ') // Remplace les tirets/underscores par des espaces
    .replace(/\s+/g, ' '); // Compresse les espaces multiples

  // Harmonisation singulier/pluriel : si le mot finit par 's' et fait au moins 4 lettres
  // (ex: "enfants" -> "enfant", "courses" -> "course", "factures" -> "facture")
  // Exception : "frais" ou "pass" où le 's' est radical
  const invariantWords = ['frais', 'pass', 'plus'];
  const words = s.split(' ').map((w) => {
    if (w.length > 3 && w.endsWith('s') && !invariantWords.includes(w)) {
      return w.slice(0, -1);
    }
    return w;
  });
  s = words.join(' ');

  return s;
}

/**
 * Normalisation spécifique pour la catégorie enfant / children.
 */
const CHILDREN_VARIANTS = new Set([
  'children',
  'child',
  'enfant',
  'enfants',
  'kid',
  'kids',
  'bebe',
  'bebes',
  'baby',
  'babies',
  'أطفال',
  'اطفال',
  'طفل',
  'الاطفال',
  'الأطفال',
]);

/**
 * Vérifie de manière robuste si un identifiant, nom ou objet Category correspond
 * à la catégorie réservée aux enfants / famille.
 */
export function isChildrenCategory(
  catOrIdOrName?: unknown
): boolean {
  if (!catOrIdOrName) return false;

  let id = '';
  let name = '';

  if (typeof catOrIdOrName === 'string') {
    id = catOrIdOrName;
    name = catOrIdOrName;
  } else if (typeof catOrIdOrName === 'number') {
    id = String(catOrIdOrName);
    name = String(catOrIdOrName);
  } else if (typeof catOrIdOrName === 'object' && catOrIdOrName !== null) {
    const obj = catOrIdOrName as any;
    id = String(obj.id ?? '');
    name = String(obj.name ?? obj.name_key ?? obj.nom ?? obj.id ?? '');
  } else {
    return false;
  }

  // Vérification de l'identifiant technique canonique
  const idLower = String(id || '').trim().toLowerCase();
  if (
    idLower === CANONICAL_ENFANT_ID ||
    idLower === 'enfant' ||
    idLower === 'enfants' ||
    idLower === 'child' ||
    idLower === 'children'
  ) {
    return true;
  }

  // Vérification du nom normalisé
  const normName = normalizeCategoryKey(name);
  if (normName === 'enfant' || CHILDREN_VARIANTS.has(normName)) {
    return true;
  }

  // Vérification des sous-chaînes ou variantes bilingues
  const rawLower = String(name || '').trim().toLowerCase();
  if (
    rawLower === 'enfant' ||
    rawLower === 'enfants' ||
    rawLower === 'children' ||
    rawLower === 'child' ||
    rawLower === 'أطفال' ||
    rawLower === 'اطفال' ||
    rawLower === 'طفل'
  ) {
    return true;
  }

  return false;
}

/**
 * Recherche la catégorie "Enfant" dans une liste de catégories existantes.
 */
export function findEnfantCategory(
  categories: Category[] = []
): Category | undefined {
  if (!Array.isArray(categories)) return undefined;
  return categories.find((c) => isChildrenCategory(c));
}

/**
 * Vérifie l'égalité de deux catégories de manière intelligente :
 * - Retourne vrai si les deux représentent la catégorie enfant.
 * - Retourne vrai si leurs identifiants sont identiques.
 * - Retourne vrai si leurs noms normalisés sont identiques (insensible casse, accents, singulier/pluriel).
 */
export function areCategoriesEqual(
  a?: Category | string | null | any,
  b?: Category | string | null | any
): boolean {
  if (!a || !b) return false;

  // Deux représentations de la catégorie Enfant sont toujours égales
  if (isChildrenCategory(a) && isChildrenCategory(b)) {
    return true;
  }

  const idA = typeof a === 'string' ? a : String(a?.id ?? '');
  const idB = typeof b === 'string' ? b : String(b?.id ?? '');
  if (idA && idB && idA === idB) return true;

  const nameA = typeof a === 'string' ? a : String(a?.name ?? a?.name_key ?? a?.nom ?? '');
  const nameB = typeof b === 'string' ? b : String(b?.name ?? b?.name_key ?? b?.nom ?? '');
  const normA = normalizeCategoryKey(nameA);
  const normB = normalizeCategoryKey(nameB);

  return normA.length > 0 && normA === normB;
}

/**
 * Déduplique une liste de catégories et garantit la présence d'une seule catégorie
 * canonique "Enfant", en fournissant une table de réassignation d'identifiants
 * pour préserver l'intégrité référentielle des données.
 */
export function deduplicateCategories(categories: Category[]): {
  deduplicated: Category[];
  remappedIds: Record<string, string>;
} {
  if (!Array.isArray(categories)) {
    return { deduplicated: [], remappedIds: {} };
  }
  const result: Category[] = [];
  const seenKeys = new Map<string, string>(); // normKey -> primaryId
  const remappedIds: Record<string, string> = {};

  for (const cat of categories) {
    if (!cat) continue;
    const isEnfant = isChildrenCategory(cat);
    const catName = typeof cat.name === 'string' ? cat.name : String(cat.name || '');
    const key = isEnfant ? 'canonical_enfant' : normalizeCategoryKey(catName);

    if (seenKeys.has(key)) {
      const primaryId = seenKeys.get(key)!;
      remappedIds[cat.id] = primaryId;
    } else {
      // Nouvelle clé unique
      const finalCat: Category = isEnfant
        ? {
            ...cat,
            id: cat.id || CANONICAL_ENFANT_ID,
            name: CANONICAL_ENFANT_NAME,
          }
        : cat;
      seenKeys.set(key, finalCat.id);
      result.push(finalCat);
    }
  }

  return { deduplicated: result, remappedIds };
}
