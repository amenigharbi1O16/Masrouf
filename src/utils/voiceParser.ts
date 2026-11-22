/**
 * FICHIER : src/utils/voiceParser.ts
 * IDENTIFIANT INVENTAIRE : FICHIER-055-VOICE-PARSER
 * MODULE : Moteur de Classification NLP et d'Extraction Sémantique (Dialecte Tunisien & Arabe)
 *
 * MISSION DU MODULE :
 * Parser des phrases vocales ou écrites en dialecte tunisien, arabe ou français pour générer
 * une transaction financière structurée et rigoureuse :
 * 1. Conversion obligatoire vers l'alphabet arabe : toute transcription s'écrit 100 % en lettres arabes.
 * 2. Détection du type : Achat (courses/articles), Dépense (factures/services), Allocation (argent de poche).
 * 3. Extraction précise du montant en Dinars Tunisiens (numéraux arabes, vocabulaire dialectal : ألفين، زوز، آلاف).
 * 4. Détection intelligente de l'enfant bénéficiaire selon le rôle de l'utilisateur :
 *    - Si Parent avec prénom d'enfant : allocation affectée directement à l'enfant.
 *    - Si Parent sans prénom : si 1 enfant, sélection automatique ; si plusieurs enfants, demande à choisir dans la liste.
 *    - Si Utilisateur normal (sans famille) : dépense simple classée en catégorie « Enfant » sans allocation.
 * 5. Classification sémantique via le référentiel centralisé `src/constants/categoryKeywords.ts`.
 * 6. Signalement d'incertitude « à confirmer » si la catégorie n'est pas certaine à 100 %.
 */

// Importation du référentiel centralisé de mots-clés et fonction d'appariement
import { matchCategoryFromText } from '@/constants/categoryKeywords';
// Importation des types métier
import type { Category, ParsedVoiceTransaction, User } from '@/state/types';

/**
 * Table de conversion de l'arabizi et des translittérations vers l'alphabet arabe pur.
 */
const ARABIZI_VOCABULARY: Array<[RegExp, string]> = [
  // Verbes et actions
  [/\bchrit\b/gi, 'شريت'],
  [/\bchrina\b/gi, 'شرينا'],
  [/\bichtarit\b/gi, 'اشتريت'],
  [/\bkhallast\b/gi, 'خلصت'],
  [/\bdfa3t\b/gi, 'دفعت'],
  [/\b9assit\b/gi, 'قصيت'],
  [/\ba3tit\b/gi, 'أعطيت'],
  [/\bmadit\b/gi, 'مديت'],

  // Produits alimentaires et courses
  [/\b7lib\b/gi, 'حليب'],
  [/\bkhobz\b/gi, 'خبز'],
  [/\bma2?\b/gi, 'ماء'],
  [/\bl7am\b/gi, 'لحم'],
  [/\bdjej\b/gi, 'دجاج'],
  [/\b7out\b/gi, 'حوت'],
  [/\bkhodhra\b/gi, 'خضرة'],
  [/\bghalla\b/gi, 'غلة'],
  [/\bjben\b/gi, 'جبن'],
  [/\bzit\b/gi, 'زيت'],
  [/\bskar\b/gi, 'سكر'],
  [/\b9ahwa\b/gi, 'قهوة'],
  [/\btmate?m\b/gi, 'طماطم'],
  [/\b9adhya\b/gi, 'قضية'],
  [/\bkosksi\b/gi, 'كسكسي'],
  [/\byaghort\b/gi, 'ياغورت'],
  [/\b3dham\b/gi, 'عظم'],

  // Dépenses fixes et factures
  [/\bfatoura\b/gi, 'فاتورة'],
  [/\bfatouret\b/gi, 'فاتورة'],
  [/\bdhaw\b/gi, 'الضو'],
  [/\bsteg\b/gi, 'الستاغ'],
  [/\bsonede\b/gi, 'الصوناد'],
  [/\binternet\b/gi, 'إنترنت'],
  [/\btéléphone\b/gi, 'تلفون'],
  [/\btelephoun\b/gi, 'تلفون'],
  [/\brecharge\b/gi, 'شحن'],

  // Transports et santé
  [/\btaxi\b/gi, 'تاكسي'],
  [/\bkar\b/gi, 'كار'],
  [/\bmetro\b/gi, 'مترو'],
  [/\bessence\b/gi, 'ايصونص'],
  [/\bbenzine\b/gi, 'بنزين'],
  [/\blouage\b/gi, 'لواج'],
  [/\bdwa\b/gi, 'دواء'],
  [/\bdwe\b/gi, 'دواء'],
  [/\bpharmacien?\b/gi, 'صيدلية'],
  [/\btbib\b/gi, 'طبيب'],

  // Montants et devises
  [/\bdinars?\b/gi, 'دينار'],
  [/\bdinarat\b/gi, 'دنانير'],
  [/\bdnanir\b/gi, 'دنانير'],
  [/\bzouz\b/gi, 'زوز'],
  [/\balfin\b/gi, 'ألفين'],
  [/\belfin\b/gi, 'ألفين'],
  [/\balaf\b/gi, 'آلاف'],
  [/\bmyat\b/gi, 'مائة'],
  [/\bflous\b/gi, 'فلوس'],
  [/\bmasrouf\b/gi, 'مصروف'],
];

/**
 * MISSION DE LA FONCTION : detectLanguage
 * Détecte automatiquement la langue dominante d'une phrase textuelle ou vocale :
 * - 'ar' : Arabe standard ou dialecte tunisien (présence de caractères arabes ou vocabulaire arabizi).
 * - 'en' : Anglais (mots grammaticaux et vocabulaire anglophone).
 * - 'fr' : Français (par défaut ou termes francophones).
 */
export function detectLanguage(text: string): 'ar' | 'fr' | 'en' {
  if (!text || !text.trim()) return 'fr';
  const trimmed = text.trim();

  // 1. Détection de caractères arabes (Unicode 0600-06FF)
  if (/[\u0600-\u06FF]/.test(trimmed)) {
    return 'ar';
  }

  const lower = trimmed.toLowerCase();

  // 2. Détection de termes arabizi tunisiens typiques
  const arabiziIndicators = [
    'chrit', 'chrina', 'khallast', 'dfa3t', '9assit', 'a3tit', 'madit',
    '7lib', 'khobz', 'l7am', 'djej', '7out', 'khodhra', 'ghalla', 'jben',
    'zit', 'skar', '9ahwa', 'tmate', 'tmatem', '9adhya', 'kosksi', 'yaghort',
    '3dham', 'fatoura', 'fatouret', 'dhaw', 'steg', 'sonede', 'flous',
    'masrouf', 'alfin', 'elfin', 'alaf', 'dnanir', 'dinarat', 'zouz'
  ];
  if (arabiziIndicators.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(lower) || lower.includes(word))) {
    return 'ar';
  }

  // 3. Détection de mots anglais fréquents
  const englishWords = [
    'i', 'bought', 'buy', 'purchased', 'purchase', 'spent', 'spend', 'paid', 'pay',
    'groceries', 'grocery', 'supermarket', 'market', 'pharmacy', 'yesterday', 'today',
    'money', 'allowance', 'for', 'with', 'from', 'milk', 'bread', 'water', 'cheese',
    'meat', 'chicken', 'fish', 'eggs', 'sugar', 'coffee', 'juice', 'food', 'fruit',
    'fruits', 'vegetables', 'bill', 'bills', 'electricity', 'gas', 'phone', 'wifi',
    'taxi', 'bus', 'doctor', 'shoes', 'clothes', 'donation', 'donated', 'charity',
    'at', 'the', 'and', 'my', 'child', 'son', 'daughter', 'kids', 'dinars', 'dinar'
  ];
  let englishScore = 0;
  for (const w of englishWords) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(lower)) {
      englishScore++;
    }
  }

  // 4. Détection de mots français
  const frenchWords = [
    "j'ai", 'je', 'acheté', 'achete', 'acheter', 'achat', 'achats', 'dépensé', 'depense',
    'dépense', 'payé', 'paye', 'payer', 'courses', 'supermarché', 'marche', 'marché',
    'pharmacie', 'hier', "aujourd'hui", 'argent', 'allocation', 'pour', 'avec', 'de',
    'du', 'des', 'le', 'la', 'les', 'lait', 'pain', 'eau', 'fromage', 'viande', 'poulet',
    'poisson', 'oeufs', 'œufs', 'sucre', 'café', 'cafe', 'jus', 'nourriture', 'fruits',
    'legumes', 'légumes', 'facture', 'factures', 'electricite', 'électricité', 'gaz',
    'telephone', 'téléphone', 'docteur', 'medecin', 'chaussures', 'vetements', 'vêtements',
    'don', 'dons', 'charité', 'charite', 'et', 'mon', 'enfant', 'fils', 'fille', 'enfants'
  ];
  let frenchScore = 0;
  for (const w of frenchWords) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(lower) || lower.includes(w)) {
      frenchScore++;
    }
  }

  if (englishScore > frenchScore && englishScore > 0) {
    return 'en';
  }

  return 'fr';
}

/**
 * MISSION DE LA FONCTION : toArabicScript
 * Convertit automatiquement une chaîne de caractères en alphabet arabe pur.
 * CE QU'ELLE FAIT :
 * Remplace les mots tunisiens latinisés par leur écriture arabe et substitue les chiffres arabizi.
 * CE QU'ELLE AFFICHE :
 * Une chaîne de texte 100 % en caractères arabes pour les transcriptions orales.
 */
export function toArabicScript(text: string): string {
  // Sécurité si texte vide
  if (!text || !text.trim()) return '';

  let converted = text.trim();

  // 1. Remplacement prioritaire du lexique économique et dialectal
  for (const [pattern, arabicWord] of ARABIZI_VOCABULARY) {
    converted = converted.replace(pattern, arabicWord);
  }

  // 2. Remplacement des caractères arabizi résiduels
  converted = converted
    .replace(/\bch\b/gi, 'ش')
    .replace(/ch/gi, 'ش')
    .replace(/kh/gi, 'خ')
    .replace(/gh/gi, 'غ')
    .replace(/th/gi, 'ث')
    .replace(/3/g, 'ع')
    .replace(/7/g, 'ح')
    .replace(/9/g, 'ق')
    .replace(/5/g, 'خ');

  return converted;
}

/**
 * MISSION DE LA FONCTION : extractAmount
 * Extrait le montant numérique en Dinars Tunisiens (DT) d'une phrase.
 * RETOURNE :
 * { amount: number, hasAmount: boolean, matchedText: string }
 */
export function extractAmount(text: string): { amount: number; hasAmount: boolean; matchedText: string } {
  const lower = text.toLowerCase();

  // 1. Expressions spécifiques à la Derja tunisienne
  if (lower.includes('ألفين') || lower.includes('الفين')) {
    return { amount: 2.0, hasAmount: true, matchedText: 'ألفين' };
  }
  if (lower.includes('زوز دينارات') || lower.includes('زوز دنانير') || lower.includes('دينارين')) {
    return { amount: 2.0, hasAmount: true, matchedText: 'دينارين' };
  }
  if (lower.includes('دينار واحد') || lower.includes('دينار برك')) {
    return { amount: 1.0, hasAmount: true, matchedText: 'دينار' };
  }
  if (lower.includes('نصف دينار') || lower.includes('خمسمائة مليم') || lower.includes('500 مليم')) {
    return { amount: 0.5, hasAmount: true, matchedText: 'نصف دينار' };
  }

  // 2. Formules dialectales avec "آلاف" (ex: 5 آلاف = 5 DT, 20 ألف = 20 DT, 10 الاف = 10 DT)
  const thousandsMatch = lower.match(/(\d+)\s*(?:آلاف|الاف|الف)/);
  if (thousandsMatch) {
    const val = parseInt(thousandsMatch[1], 10);
    return { amount: val, hasAmount: true, matchedText: thousandsMatch[0] };
  }

  // 3. Mots numéraux arabes
  const arabicNumbers: Record<string, number> = {
    'ثلاثة دنانير': 3.0,
    'أربعة دنانير': 4.0,
    'اربعة دنانير': 4.0,
    'خمسة دنانير': 5.0,
    'ستة دنانير': 6.0,
    'سبعة دنانير': 7.0,
    'ثمانية دنانير': 8.0,
    'تسعة دنانير': 9.0,
    'عشرة دنانير': 10.0,
    'خمسطاش دينار': 15.0,
    'خمسة عشر دينار': 15.0,
    'عشرين دينار': 20.0,
    'ثلاثين دينار': 30.0,
    'أربعين دينار': 40.0,
    'اربعين دينار': 40.0,
    'خمسين دينار': 50.0,
    'مائة دينار': 100.0,
    'مية دينار': 100.0,
  };

  for (const [phrase, val] of Object.entries(arabicNumbers)) {
    if (lower.includes(phrase)) {
      return { amount: val, hasAmount: true, matchedText: phrase };
    }
  }

  // 4. Mots numéraux en Français et en Anglais
  const westernNumbers: Record<string, number> = {
    'un dinar': 1.0, 'one dinar': 1.0, '1 dinar': 1.0,
    'deux dinars': 2.0, 'two dinars': 2.0, '2 dinars': 2.0,
    'trois dinars': 3.0, 'three dinars': 3.0,
    'quatre dinars': 4.0, 'four dinars': 4.0,
    'cinq dinars': 5.0, 'five dinars': 5.0,
    'dix dinars': 10.0, 'ten dinars': 10.0,
    'quinze dinars': 15.0, 'fifteen dinars': 15.0,
    'vingt dinars': 20.0, 'twenty dinars': 20.0,
    'trente dinars': 30.0, 'thirty dinars': 30.0,
    'quarante dinars': 40.0, 'forty dinars': 40.0,
    'cinquante dinars': 50.0, 'fifty dinars': 50.0,
    'cent dinars': 100.0, 'one hundred dinars': 100.0,
  };

  for (const [phrase, val] of Object.entries(westernNumbers)) {
    if (lower.includes(phrase)) {
      return { amount: val, hasAmount: true, matchedText: phrase };
    }
  }

  // 5. Détection numérique standard en chiffres (ex: "20 DT", "15.500", "42 دينار", "30 TND")
  const regexNum = /(\d+(?:[.,]\d+)?)\s*(?:دينار|دنانير|د\.ت|dt|tnd|dinars?)/i;
  const match = lower.match(regexNum);

  if (match) {
    const rawVal = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(rawVal) && rawVal > 0) {
      return { amount: rawVal, hasAmount: true, matchedText: match[0] };
    }
  }

  // 6. Détection de chiffre isolé s'il est précédé d'un terme financier ou suivi d'un mot
  const regexStandaloneNum = /(?:pour|de|prix|b-|b|\$|à|a)\s*(\d+(?:[.,]\d+)?)/i;
  const standaloneMatch = lower.match(regexStandaloneNum);
  if (standaloneMatch) {
    const rawVal = parseFloat(standaloneMatch[1].replace(',', '.'));
    if (!isNaN(rawVal) && rawVal > 0) {
      return { amount: rawVal, hasAmount: true, matchedText: standaloneMatch[0] };
    }
  }

  return { amount: 0, hasAmount: false, matchedText: '' };
}

/**
 * MISSION DE LA FONCTION : extractStore
 * Tente d'extraire le magasin ou commerce mentionné dans la phrase.
 */
export function extractStore(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('مونوبري') || lower.includes('monoprix')) return 'Monoprix';
  if (lower.includes('كارفور') || lower.includes('carrefour')) return 'Carrefour';
  if (lower.includes('مغازة') || lower.includes('magasin')) return 'Magasin Général';
  if (lower.includes('صيدلية') || lower.includes('pharmacie') || lower.includes('pharmacy')) return 'Pharmacie';
  if (lower.includes('عطار') || lower.includes('epicerie') || lower.includes('grocery')) return 'Épicerie du quartier';
  if (lower.includes('سوق') || lower.includes('marche') || lower.includes('market')) return 'Marché central';
  return 'Commerce';
}

/**
 * MISSION DE LA FONCTION : extractPurchaseName
 * Extrait le nom exact de l'article ou de l'achat à partir de la phrase dictée ou saisie,
 * en éliminant les verbes d'action, le montant et le lieu, et en le formatant dans la langue appropriée.
 * Assure que le libellé contient le véritable nom du produit (ex: "Lait et pain", "Milk and bread", "حليب وخبز").
 */
export function extractPurchaseName(
  text: string,
  lang: 'ar' | 'fr' | 'en',
  matchedAmountText?: string,
  matchedStore?: string
): string {
  if (!text || !text.trim()) return '';

  let cleaned = text.trim();

  // 1. Suppression du montant textuel détecté s'il est fourni
  if (matchedAmountText && matchedAmountText.trim()) {
    cleaned = cleaned.replace(matchedAmountText, ' ');
  }

  // Suppression des devises et chiffres résiduels (ex: "pour 45 dinars", "b- 2 dinars", "20 DT", etc.)
  cleaned = cleaned
    .replace(/(?:pour|à|a|de|for|at|b-|بـ|ب)\s*\d+(?:[.,]\d+)?\s*(?:dinars?|دنانير|دينار|د\.ت|dt|tnd)?/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:dinars?|دنانير|دينار|د\.ت|dt|tnd)\b/gi, ' ')
    .replace(/\b(?:ألفين|الفين|زوز|آلاف|الاف)\b/gi, ' ');

  // 2. Suppression des magasins connus s'ils apparaissent
  if (matchedStore && matchedStore !== 'Commerce') {
    const storeRegex = new RegExp(`(?:chez|au|at|from|dans|من|في)?\\s*${matchedStore}`, 'gi');
    cleaned = cleaned.replace(storeRegex, ' ');
  }
  cleaned = cleaned
    .replace(/(?:chez|au|at|from|من|في)\s*(?:monoprix|carrefour|magasin|supermarché|supermarket|epicerie|épicerie|boucher|boulangerie|pharmacie|pharmacy|مونوبري|كارفور|عطار|سوق|مرشي)/gi, ' ');

  // 3. Suppression des marqueurs temporels (hier, today, البارح...)
  cleaned = cleaned.replace(/\b(?:hier|avant-hier|aujourd'hui|ce matin|yesterday|today|this morning|البارح|اليوم|أول البارح)\b/gi, ' ');

  if (lang === 'ar') {
    // Suppression des verbes et formules d'achat en arabe
    cleaned = cleaned
      .replace(/\b(?:شريت|شرينا|اشتريت|شراء|خديت|مديت|قضيت)\b/g, ' ')
      .replace(/^[\s،,و\-_]+/g, '')
      .replace(/[\s،,و\-_]+$/g, '')
      .trim();

    return cleaned || 'شراء منتج';
  }

  if (lang === 'en') {
    // Suppression des verbes d'achat en anglais
    cleaned = cleaned
      .replace(/\b(?:i\s+have\s+bought|i\s+bought|i\s+purchased|i\s+got|bought|purchased|purchase\s+of|purchase|buy|got)\b/gi, ' ')
      .replace(/^\s*(?:some|a|an|the|of)\s+/gi, '')
      .replace(/^[\s,.\-_]+/g, '')
      .replace(/[\s,.\-_]+$/g, '')
      .trim();

    if (!cleaned) return 'Purchase';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  // Par défaut : Français
  cleaned = cleaned
    .replace(/\b(?:j'ai\s+acheté|j'ai\s+achete|j'ai\s+pris|achat\s+de|achat\s+d'|achat|acheté|achete|acheter|j'ai\s+payé|j'ai\s+paye|payé|paye|pris)\b/gi, ' ')
    .replace(/^\s*(?:du|de\s+la|des|d'|d’|un|une|le|la|les)\s+/gi, '')
    .replace(/^[\s,.\-_]+/g, '')
    .replace(/[\s,.\-_]+$/g, '')
    .trim();

  if (!cleaned) return 'Achat de produit';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * MISSION DE LA FONCTION : extractExpenseName
 * Extrait le libellé d'une dépense directe (ex: facture, transport, soin).
 */
export function extractExpenseName(
  text: string,
  lang: 'ar' | 'fr' | 'en',
  matchedAmountText?: string,
  defaultName?: string
): string {
  if (!text || !text.trim()) return defaultName || 'Dépense';
  let cleaned = text.trim();
  if (matchedAmountText && matchedAmountText.trim()) {
    cleaned = cleaned.replace(matchedAmountText, ' ');
  }
  cleaned = cleaned
    .replace(/(?:pour|à|a|de|for|at|b-|بـ|ب)\s*\d+(?:[.,]\d+)?\s*(?:dinars?|دنانير|دينار|د\.ت|dt|tnd)?/gi, ' ')
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:dinars?|دنانير|دينار|د\.ت|dt|tnd)\b/gi, ' ');

  if (lang === 'ar') {
    cleaned = cleaned.replace(/\b(?:دفعت|خلصت|قصيت)\b/g, ' ').trim();
    return cleaned || defaultName || 'دفع مصاريف';
  }
  if (lang === 'en') {
    cleaned = cleaned
      .replace(/\b(?:i\s+paid|i\s+spent|paid|spent|pay)\b/gi, ' ')
      .replace(/^\s*(?:the|a|an|for)\s+/gi, '')
      .trim();
    if (!cleaned) return defaultName || 'Expense';
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  cleaned = cleaned
    .replace(/\b(?:j'ai\s+payé|j'ai\s+paye|j'ai\s+reglé|j'ai\s+regle|payé|paye|reglé|regle)\b/gi, ' ')
    .replace(/^\s*(?:la|le|les|l'|un|une|de|du|des)\s+/gi, '')
    .trim();
  if (!cleaned) return defaultName || 'Dépense';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * MISSION PRINCIPALE DU MODULE : parseVoiceInput
 * Analyse la phrase (voix ou saisie libre) et retourne un objet structuré et modifiable.
 *
 * RÈGLES DE CLASSEMENT :
 * - Détection automatique de la langue (Arabe/Derja, Français, Anglais).
 * - Retranscription de la phrase dans les lettres de la langue parlée.
 * - Détection et sélection automatique du type 'purchase' (Achat) pour tout achat/produit.
 * - Extraction du nom exact de l'achat dans son libellé (Ex: "Lait et pain", "حليب وخبز").
 * - Compte Parent :
 *   « J'ai donné 20 DT à mon enfant Youssef » -> don à Youssef (reconnaissance du prénom).
 *   « J'ai donné 20 DT à mon enfant » (sans prénom) -> si 1 enfant, auto-sélection ; si plusieurs, demande le choix.
 * - Dons & Charité :
 *   « J'ai donné 10 DT pour la zakat » / « تبرعت بـ 20 دينار » -> transaction de type donation.
 * - Compte Utilisateur normal :
 *   « J'ai donné 20 DT à mon enfant » -> dépense en catégorie Enfant (pas de don).
 * - Autres phrases -> classement par mots-clés (avec mention « à confirmer » si incertitude).
 */
export function parseVoiceInput(
  rawText: string,
  categories: Category[],
  children: User[] = [],
  isParentAccount: boolean = true
): ParsedVoiceTransaction & { hasAmount: boolean } {
  // 1. Détection de la langue de saisie (Français, Arabe ou Anglais)
  const lang = detectLanguage(rawText);

  // 2. Retranscription dans les lettres de cette langue :
  // Si Arabe ou Derja tunisienne : retranscription normalisée 100% en lettres arabes
  // Si Français ou Anglais : conservation intégrale de l'alphabet latin de la langue parlée
  const formattedTranscript = lang === 'ar' ? toArabicScript(rawText) : rawText.trim();
  const lowerCombined = `${rawText} ${formattedTranscript}`.toLowerCase();

  // 3. Détection d'un don de bienfaisance / charité (type 'donation')
  const isCharityDonation =
    lowerCombined.includes('تبرع') ||
    lowerCombined.includes('تبرعت') ||
    lowerCombined.includes('صدقة') ||
    lowerCombined.includes('صدقه') ||
    lowerCombined.includes('زكاة') ||
    lowerCombined.includes('زكاه') ||
    lowerCombined.includes('إعانة') ||
    lowerCombined.includes('اعانة') ||
    lowerCombined.includes('charité') ||
    lowerCombined.includes('charite') ||
    lowerCombined.includes('charity') ||
    lowerCombined.includes('donate') ||
    lowerCombined.includes('donated') ||
    lowerCombined.includes('aumone') ||
    lowerCombined.includes('aumône') ||
    (/\bdon\b/i.test(lowerCombined) && !lowerCombined.includes('donné') && !lowerCombined.includes('donne'));

  // 4. Détection de mention d'un don à un enfant ("donné", "alloué", "مصروف", "أعطيت", "ولدي", "بنتي", "gave", "allowance")
  const mentionsChildDonation =
    !isCharityDonation &&
    (lowerCombined.includes('donné') ||
      lowerCombined.includes('donne') ||
      lowerCombined.includes('alloué') ||
      lowerCombined.includes('alloue') ||
      lowerCombined.includes('أعطيت') ||
      lowerCombined.includes('اعطيت') ||
      lowerCombined.includes('مديت') ||
      lowerCombined.includes('مصروف') ||
      lowerCombined.includes('argent de poche') ||
      lowerCombined.includes('allowance') ||
      lowerCombined.includes('pocket money') ||
      lowerCombined.includes('gave') ||
      lowerCombined.includes('ولدي') ||
      lowerCombined.includes('بنتي') ||
      lowerCombined.includes('enfant'));

  // Recherche explicite d'un enfant par son prénom
  let matchedChild: User | undefined;
  for (const ch of children) {
    const childFirstName = ch.name.toLowerCase().split(' ')[0];
    if (lowerCombined.includes(childFirstName)) {
      matchedChild = ch;
      break;
    }
  }

  // 5. Détermination du type d'opération selon le compte et le sens
  let type: 'purchase' | 'expense' | 'allocation' | 'donation' = 'expense';
  let needsChildSelection = false;

  if (isCharityDonation) {
    // CAS DON CARITATIF / BIENFAISANCE
    type = 'donation';
    needsChildSelection = false;
  } else if (isParentAccount && mentionsChildDonation) {
    // CAS PARENT : Gestion des allocations familiales
    if (matchedChild) {
      type = 'allocation';
      needsChildSelection = false;
    } else if (children.length === 1) {
      matchedChild = children[0];
      type = 'allocation';
      needsChildSelection = false;
    } else if (children.length > 1) {
      type = 'allocation';
      needsChildSelection = true;
      matchedChild = undefined;
    } else {
      type = 'expense';
      needsChildSelection = false;
    }
  } else if (!isParentAccount && mentionsChildDonation) {
    type = 'expense';
    needsChildSelection = false;
  } else {
    // Vérification explicite des verbes et mots d'achat dans les 3 langues (FR, AR, EN)
    const isExplicitPurchase =
      // Verbes en Arabe / Derja
      lowerCombined.includes('شريت') ||
      lowerCombined.includes('شرينا') ||
      lowerCombined.includes('اشتريت') ||
      lowerCombined.includes('شراء') ||
      lowerCombined.includes('قضيت') ||
      lowerCombined.includes('قضية') ||
      lowerCombined.includes('خديت') ||
      // Verbes en Français
      lowerCombined.includes('acheté') ||
      lowerCombined.includes('achete') ||
      lowerCombined.includes('acheter') ||
      lowerCombined.includes('achat') ||
      lowerCombined.includes('achats') ||
      lowerCombined.includes('courses') ||
      lowerCombined.includes("j'ai pris") ||
      // Verbes en Anglais
      lowerCombined.includes('bought') ||
      lowerCombined.includes('buy') ||
      lowerCombined.includes('purchased') ||
      lowerCombined.includes('purchase') ||
      lowerCombined.includes('shopping') ||
      lowerCombined.includes('groceries');

    type = isExplicitPurchase ? 'purchase' : 'expense';
  }

  // 6. Extraction du montant en Dinars Tunisiens
  const amountResult = extractAmount(formattedTranscript || rawText);
  const { amount, hasAmount } = amountResult;

  // 7. Classification de la catégorie via le module centralisé
  const isAllocationOp = type === 'allocation' || mentionsChildDonation;
  const matchResult = matchCategoryFromText(formattedTranscript || rawText, categories, isAllocationOp);

  // Si type donation, priorité à la catégorie Dons / Charité
  let finalCategory = matchResult.category;
  if (type === 'donation') {
    const donationCat = categories.find(
      (c) =>
        c.name.toLowerCase().includes('don') ||
        c.name.toLowerCase().includes('charit') ||
        c.name.toLowerCase().includes('تبرع') ||
        c.name.toLowerCase().includes('صدق')
    );
    if (donationCat) {
      finalCategory = donationCat;
    }
  }

  if (!finalCategory) {
    finalCategory = categories[0];
  }

  // Si la catégorie reconnue est de type 'product' (ex: Alimentation, Vêtements) et qu'il ne s'agit pas d'une facture/service,
  // s'assurer que le type d'achat 'purchase' est sélectionné
  if (
    type === 'expense' &&
    finalCategory &&
    finalCategory.kind === 'product' &&
    !lowerCombined.includes('facture') &&
    !lowerCombined.includes('bill') &&
    !lowerCombined.includes('فاتورة') &&
    !lowerCombined.includes('steg') &&
    !lowerCombined.includes('sonede') &&
    !lowerCombined.includes('transport') &&
    !lowerCombined.includes('taxi')
  ) {
    type = 'purchase';
  }

  const isUncertain = matchResult.isUncertain;

  // 8. Extraction du magasin et des détails pour un achat
  const store = type === 'purchase' ? extractStore(lowerCombined) : undefined;
  const quantity = type === 'purchase' ? 1 : undefined;
  const unit = type === 'purchase' ? 'pièce' : undefined;

  // 9. Libellé de la transaction : le nom de l'achat doit obligatoirement être écrit dans son libellé
  let label = formattedTranscript || rawText;
  if (type === 'allocation') {
    if (matchedChild) {
      label = lang === 'ar' ? `مصروف إلى ${matchedChild.name}` : lang === 'en' ? `Allowance to ${matchedChild.name}` : `Allocation à ${matchedChild.name}`;
    } else {
      label = lang === 'ar' ? 'مصروف للأبناء' : lang === 'en' ? 'Allowance for child' : 'Allocation pour enfant';
    }
  } else if (type === 'donation') {
    label = lang === 'ar' ? 'تبرع وصدقة' : lang === 'en' ? 'Donation & Charity' : 'Don & Charité';
  } else if (type === 'purchase') {
    // EXTRACTION PRÉCISE DU NOM DE L'ACHAT DANS LE LIBELLÉ
    const purchaseName = extractPurchaseName(formattedTranscript, lang, amountResult.matchedText, store);
    label = purchaseName;
  } else if (type === 'expense') {
    const expenseName = extractExpenseName(formattedTranscript, lang, amountResult.matchedText, finalCategory?.name);
    label = expenseName;
  }

  // 10. Date de la transaction (support de "hier" / "yesterday" / "البارح")
  const dateObj = new Date();
  if (lowerCombined.includes('avant-hier') || lowerCombined.includes('أول البارح') || lowerCombined.includes('day before yesterday')) {
    dateObj.setDate(dateObj.getDate() - 2);
  } else if (lowerCombined.includes('hier') || lowerCombined.includes('البارح') || lowerCombined.includes('yesterday')) {
    dateObj.setDate(dateObj.getDate() - 1);
  }
  const dateStr = dateObj.toISOString().slice(0, 10);

  return {
    type,
    title: label,
    label,
    amount,
    hasAmount,
    categoryId: finalCategory?.id || 'cat-autres',
    categoryName: finalCategory?.name || 'Autres',
    childId: matchedChild?.id,
    childName: matchedChild?.name,
    recipientChildId: matchedChild?.id,
    recipientName: matchedChild?.name,
    date: dateStr,
    store,
    quantity,
    unit,
    confidence: matchResult.confidence,
    isUncertainCategory: isUncertain,
    needsChildSelection,
    rawText: formattedTranscript || rawText,
    detectedLanguage: lang,
  };
}
