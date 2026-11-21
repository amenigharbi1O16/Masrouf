/**
 * FICHIER : src/constants/categoryKeywords.ts
 * IDENTIFIANT INVENTAIRE : FICHIER-057-KEYWORDS
 * MODULE : Dictionnaire Centralisé des Mots-Clés par Catégorie (FR, AR, Derja Tunisienne)
 *
 * MISSION DU MODULE :
 * Fournir une source unique, modulaire et extensible de mots-clés sémantiques pour la
 * classification automatique des phrases vocales et des saisies libres :
 * 1. Couvre toutes les catégories officielles en Français, en Arabe littéraire et en Derja tunisienne.
 * 2. Facilement extensible : toute nouvelle règle ou terme dialectal s'ajoute ici sans impacter le code métier.
 * 3. Supporte la détection intelligente pour les catégories personnalisées créées par les utilisateurs.
 * 4. Détermine le niveau de certitude pour apposer la mention « à confirmer » si nécessaire.
 */

import type { Category } from '@/state/types';

/**
 * Dictionnaire exhaustif de correspondances sémantiques par catégorie officielle :
 * Mots clés en Français, Arabe standard et dialecte tunisien (Derja).
 */
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  // Catégorie Alimentation (courses, supermarché, alimentation quotidienne)
  'Alimentation': [
    // Derja & Arabe
    'حليب', 'خبز', 'ماء', 'لحم', 'دجاج', 'حوت', 'سمك', 'خضرة', 'غلة', 'فواكه',
    'جبن', 'زيت', 'سكر', 'طماطم', 'قضية', 'سوق', 'عظم', 'بيض', 'كسكسي', 'ياغورت',
    'مقرونة', 'سميد', 'فرينة', 'قهوة خضراء', 'تونة', 'تن', 'سردينة', 'مونوبري',
    'كارفور', 'مغازة', 'عطار', 'مرشي', 'سوبرماركت',
    // Français
    'lait', 'pain', 'eau', 'viande', 'poulet', 'poisson', 'legumes', 'fruits',
    'fromage', 'huile', 'sucre', 'tomate', 'courses', 'marche', 'oeufs', 'couscous',
    'yaourt', 'pates', 'supermarche', 'monoprix', 'carrefour', 'epicerie', 'alimentation',
    // English
    'milk', 'bread', 'water', 'meat', 'chicken', 'fish', 'vegetables', 'fruits',
    'cheese', 'oil', 'sugar', 'tomato', 'groceries', 'market', 'eggs', 'pasta',
    'yogurt', 'supermarket', 'grocery', 'food'
  ],

  // Catégorie Factures (charges fixes du foyer)
  'Factures': [
    // Derja & Arabe
    'ضو', 'ماء فاتورة', 'فاتورة', 'الغاز', 'فاتورة الضو', 'فاتورة الماء', 'الستاغ', 'الصوناد',
    'فاتورة الغاز', 'قصاصة', 'صوناد', 'ستاغ',
    // Français
    'steg', 'sonede', 'electricite', 'facture', 'gaz', 'eau facture', 'quittance',
    // English
    'electricity', 'bill', 'bills', 'gas', 'water bill', 'utilities', 'utility'
  ],

  // Catégorie Téléphone et internet (télécoms et forfaits)
  'Téléphone et internet': [
    // Derja & Arabe
    'انترنت', 'تلفون', 'شحن', 'توبنات', 'اورنج', 'اوريدو', 'اتصالات تونس', 'رصيد',
    'كارطة تلفون', 'لاين', 'فورفي', 'ويفي', 'فيبر',
    // Français
    'telecom', 'ooredoo', 'orange', 'internet', 'forfait', 'recharge', 'wifi', 'topnet', 'telephone', 'fibre',
    // English
    'phone', 'mobile', 'internet', 'wifi', 'recharge', 'data plan', 'cellular', 'fiber'
  ],

  // Catégorie Transport (mobilité urbaine et interurbaine)
  'Transport': [
    // Derja & Arabe
    'تاكسي', 'كار', 'مترو', 'بنزين', 'ايصونص', 'مازوت', 'لواج', 'قطار', 'كارطة نقل',
    'محطة', 'بياج', 'تيكي', 'باركينغ', 'غسيل كرهبة', 'تصليح كرهبة',
    // Français
    'taxi', 'bus', 'metro', 'carburant', 'essence', 'gasoil', 'louage', 'train', 'peage', 'parking', 'transport',
    // English
    'taxi', 'bus', 'subway', 'fuel', 'gasoline', 'petrol', 'train', 'toll', 'parking', 'transportation'
  ],

  // Catégorie Santé et médicaments (soins médicaux)
  'Santé et médicaments': [
    // Derja & Arabe
    'طبيب', 'صيدلية', 'دواء', 'تحليل', 'سبيطار', 'عيادة', 'طبيب اسنان', 'نظارات',
    'راديو', 'عملية', 'مستشفى', 'بانسمون', 'سيروم',
    // Français
    'docteur', 'medecin', 'pharmacie', 'medicament', 'hopital', 'dentiste', 'analyse', 'clinique', 'sante',
    // English
    'doctor', 'physician', 'pharmacy', 'medicine', 'hospital', 'dentist', 'clinic', 'health', 'medical'
  ],

  // Catégorie Éducation (frais scolaires et fournitures)
  'Éducation': [
    // Derja & Arabe
    'مدرسة', 'معهد', 'جامعة', 'كتاب', 'كراس', 'قراية', 'دروس', 'أدوات', 'تسجيل',
    'روضة', 'ايتيد', 'دروس خصوصية', 'فاك', 'محفظة', 'ستيلووات',
    // Français
    'ecole', 'lycee', 'livre', 'cahier', 'cours', 'inscription', 'universite', 'fournitures', 'etudes', 'education',
    // English
    'school', 'university', 'college', 'book', 'notebook', 'course', 'tuition', 'supplies', 'education'
  ],

  // Catégorie Restaurants et cafés (sorties gastronomiques)
  'Restaurants et cafés': [
    // Derja & Arabe
    'قهوة', 'كابوسين', 'مطعم', 'بيتزا', 'صحن', 'كفتاجي', 'شاورما', 'سندويتش',
    'شباتي', 'مقلوب', 'عصير', 'قاطو', 'ملاوي', 'دركستور',
    // Français
    'restaurant', 'cafe', 'express', 'chawarma', 'pizza', 'sandwich', 'fast food', 'crepe', 'resto',
    // English
    'restaurant', 'cafe', 'coffee', 'pizza', 'sandwich', 'fast food', 'dinner', 'lunch'
  ],

  // Catégorie Loisirs (détente et culture)
  'Loisirs': [
    // Derja & Arabe
    'سينما', 'مسرح', 'ماتش', 'لعبة', 'حفلة', 'خرجة', 'ستاد', 'بليستيشن', 'بارك',
    // Français
    'cinema', 'theatre', 'jeu', 'match', 'sortie', 'parc', 'concert', 'loisirs',
    // English
    'cinema', 'movies', 'theater', 'game', 'match', 'outing', 'park', 'concert', 'leisure', 'entertainment'
  ],

  // Catégorie Vêtements et chaussures (habillement)
  'Vêtements et chaussures': [
    // Derja & Arabe
    'حوايج', 'صباط', 'روب', 'سروال', 'فريب', 'قميص', 'سبادري', 'مريول', 'فيستة',
    'شلاكة', 'كولون', 'كابوس', 'معطف',
    // Français
    'vetements', 'chaussures', 'robe', 'pantalon', 'baskets', 'frippe', 'chemise', 'veste', 'habit',
    // English
    'clothes', 'clothing', 'shoes', 'dress', 'pants', 'sneakers', 'shirt', 'jacket', 'coat'
  ],

  // Catégorie Enfant (argent de poche et besoins de l'enfant)
  'Enfant': [
    // Derja & Arabe
    'مصروف', 'ألعاب', 'حفاضات', 'كوش', 'بيبي', 'حضانة', 'لعبة', 'مصروف الجيب',
    'أعطيت لولدي', 'أعطيت لبنتي', 'فلوس لولدي', 'فلوس لبنتي',
    // Français
    'argent de poche', 'bebe', 'jouet', 'creche', 'garderie', 'enfant', 'enfants', 'poche',
    // English
    'pocket money', 'allowance', 'baby', 'toy', 'toys', 'daycare', 'child', 'children', 'kid', 'kids'
  ],

  // Catégorie Maison et équipement (mobilier et équipement)
  'Maison et équipement': [
    // Derja & Arabe
    'ماعون', 'تجهيزات', 'تلفزة', 'فريجيدار', 'كوجينة', 'صالون', 'فرش', 'غطاء',
    // Français
    'meuble', 'vaisselle', 'electromenager', 'lit', 'cuisine', 'maison',
    // English
    'furniture', 'dishes', 'appliance', 'bed', 'kitchen', 'home', 'appliances'
  ],

  // Catégorie Hygiène et soins (cosmétique et soins personnels)
  'Hygiène et soins': [
    // Derja & Arabe
    'صابون', 'شامبوان', 'معجون سنان', 'حجامة', 'حجام', 'صالون تجميل', 'كريم',
    // Français
    'savon', 'shampoing', 'dentifrice', 'coiffeur', 'soins', 'hygiene', 'beaute',
    // English
    'soap', 'shampoo', 'toothpaste', 'barber', 'haircut', 'skincare', 'hygiene', 'beauty', 'care'
  ],

  // Catégorie Dons et Charité (aumônes, zakat, bienfaisance)
  'Dons': [
    // Derja & Arabe
    'تبرع', 'صدقة', 'صدقه', 'زكاة', 'إعانة', 'اعانة', 'قفة', 'خيرية', 'مسكين', 'محتاج', 'إحسان',
    // Français
    'don', 'dons', 'charite', 'charité', 'aumone', 'aumône', 'zakat', 'sadaqa', 'bienfaisance', 'aide',
    // English
    'donation', 'donations', 'charity', 'donate', 'donated', 'zakat', 'sadaqa', 'alms', 'aid'
  ],
};

/**
 * MISSION DE LA FONCTION : matchCategoryFromText
 * Recherche la catégorie la plus pertinente pour un texte donné.
 *
 * RETOURNE :
 * - `category` : la catégorie trouvée ou la plus probable.
 * - `isUncertain` : vrai si aucune correspondance exacte n'a été trouvée (à confirmer par l'utilisateur).
 * - `confidence` : score de confiance entre 0.0 et 1.0.
 */
export function matchCategoryFromText(
  text: string,
  categories: Category[],
  isAllocation: boolean = false
): { category: Category | undefined; isUncertain: boolean; confidence: number } {
  const lower = text.toLowerCase().trim();

  // 1. Cas prioritaire : Si c'est une allocation parentale -> catégorie "Enfant"
  if (isAllocation) {
    const childCat = categories.find((c) =>
      c.id === 'children' ||
      c.name.toLowerCase() === 'enfant' ||
      c.name.toLowerCase() === 'enfants' ||
      c.name.toLowerCase() === 'children'
    );
    if (childCat) {
      return { category: childCat, isUncertain: false, confidence: 1.0 };
    }
  }

  // 2. Correspondance exacte ou partielle avec le nom d'une catégorie active (inclus catégories personnalisées)
  for (const cat of categories) {
    if (!cat.active) continue;
    const catNameLower = cat.name.toLowerCase();
    if (lower.includes(catNameLower)) {
      return { category: cat, isUncertain: false, confidence: 0.95 };
    }
  }

  // 3. Correspondance avec le dictionnaire de mots-clés prédéfinis
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const foundKeyword = keywords.find((kw) => lower.includes(kw.toLowerCase()));
    if (foundKeyword) {
      const matched = categories.find(
        (c) =>
          c.name.toLowerCase().includes(catName.toLowerCase()) ||
          catName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (matched) {
        return { category: matched, isUncertain: false, confidence: 0.85 };
      }
    }
  }

  // 4. Correspondance avec les mots du nom des catégories personnalisées créées par l'utilisateur
  for (const cat of categories) {
    if (cat.isCustom && cat.active) {
      const words = cat.name.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
      const matchedWord = words.find((w) => lower.includes(w));
      if (matchedWord) {
        return { category: cat, isUncertain: false, confidence: 0.80 };
      }
    }
  }

  // 5. Aucune correspondance nette : proposition de la catégorie la plus probable avec mention « à confirmer »
  // Si le texte évoque des courses générales -> Alimentation
  const defaultFood = categories.find((c) => c.kind === 'product' && c.name.toLowerCase().includes('aliment'));
  if (defaultFood) {
    return { category: defaultFood, isUncertain: true, confidence: 0.45 };
  }

  // Repli sur la catégorie "Autres" ou la première catégorie active
  const fallback =
    categories.find((c) => c.name.toLowerCase().includes('autre')) ||
    categories[0];

  return { category: fallback, isUncertain: true, confidence: 0.30 };
}
