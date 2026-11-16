// ============================================================
// FICHIER : src/utils/categoryIcons.ts
// RÔLE DANS L'APPLICATION :
//   Dictionnaire centralisé associant chaque catégorie financière
//   (courses alimentaires, transport, factures, santé, loisirs, etc.)
//   à une icône vectorielle Ionicons représentative et évocatrice.
//   Évite l'utilisation uniforme d'une icône de portefeuille pour tous les postes.
//
// ANALOGIE DE LA VIE RÉELLE :
//   Comme les panneaux de signalisation ou les rayons d'un grand magasin :
//   le rayon alimentation a une fourchette ou un panier, la station essence une voiture,
//   la pharmacie une croix de santé, plutôt que de tout étiqueter avec un symbole monétaire abstrait.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Permet à l'utilisateur de repérer en un clin d'œil ses différentes enveloppes
//   budgétaires sur le tableau de bord (Alimentation, Transport, Factures)
//   sans confusion visuelle ni monotonie d'icônes.
// ============================================================

import { Ionicons } from '@expo/vector-icons';

/**
 * MISSION DE LA FONCTION : getCategoryIcon
 *   Détermine et retourne le nom exact de l'icône Ionicons la plus adaptée
 *   pour représenter visuellement une catégorie donnée, selon son libellé
 *   en français, en anglais ou en arabe, ou selon son type ('product' vs 'expense').
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit une icône différenciée et parlante pour les composants :
 *   - `CategoryCard` (tableau de bord)
 *   - `ExpenseCard` (transactions récentes)
 *   - `CategoryPicker` (sélection de catégories)
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Une icône vectorielle distinctive (restaurant pour alimentation, voiture pour transport,
 *   reçu pour factures, manette pour loisirs, billet pour épargne, etc.).
 *
 * @param categoryName Nom brut ou traduit de la catégorie (ex: 'Alimentation', 'Transport')
 * @param categoryKind Type optionnel de la catégorie ('product' ou 'expense')
 * @returns Clé d'icône Ionicons valide
 */
export function getCategoryIcon(
  categoryName?: string,
  categoryKind?: 'product' | 'expense' | string
): keyof typeof Ionicons.glyphMap {
  // Normalisation du nom en minuscules pour comparaison insensible à la casse
  const normalized = (categoryName ?? '').toLowerCase().trim();

  // 1. Catégorie Alimentation / Nourriture / Épicerie
  if (
    normalized.includes('aliment') ||
    normalized.includes('nourrit') ||
    normalized.includes('épicerie') ||
    normalized.includes('epicerie') ||
    normalized.includes('food') ||
    normalized.includes('repas') ||
    normalized.includes('طعام') ||
    normalized.includes('أكل') ||
    normalized.includes('تغذية')
  ) {
    // Icône de restaurant / alimentation
    return 'restaurant-outline';
  }

  // 2. Catégorie Transport / Déplacements / Carburant
  if (
    normalized.includes('transport') ||
    normalized.includes('véhicule') ||
    normalized.includes('vehicule') ||
    normalized.includes('voiture') ||
    normalized.includes('carburant') ||
    normalized.includes('essence') ||
    normalized.includes('taxi') ||
    normalized.includes('bus') ||
    normalized.includes('métro') ||
    normalized.includes('metro') ||
    normalized.includes('نقل') ||
    normalized.includes('مواصلات') ||
    normalized.includes('سيارة')
  ) {
    // Icône d'automobile / transport
    return 'car-outline';
  }

  // 3. Catégorie Factures / Charges / Électricité / Eau
  if (
    normalized.includes('facture') ||
    normalized.includes('bill') ||
    normalized.includes('steg') ||
    normalized.includes('sonede') ||
    normalized.includes('charge') ||
    normalized.includes('électricité') ||
    normalized.includes('electricite') ||
    normalized.includes('eau') ||
    normalized.includes('gaz') ||
    normalized.includes('فواتير') ||
    normalized.includes('فاتورة') ||
    normalized.includes('كهرباء') ||
    normalized.includes('ماء')
  ) {
    // Icône de reçu / quittance
    return 'receipt-outline';
  }

  // 4. Catégorie Loisirs / Sorties / Jeux
  if (
    normalized.includes('loisir') ||
    normalized.includes('divertissement') ||
    normalized.includes('entertainment') ||
    normalized.includes('jeu') ||
    normalized.includes('sortie') ||
    normalized.includes('cinéma') ||
    normalized.includes('cinema') ||
    normalized.includes('ترفيه') ||
    normalized.includes('تسلية') ||
    normalized.includes('ألعاب')
  ) {
    // Icône de manette de jeu / loisir
    return 'game-controller-outline';
  }

  // 5. Catégorie Épargne / Investissement / Réserve
  if (
    normalized.includes('épargne') ||
    normalized.includes('epargne') ||
    normalized.includes('saving') ||
    normalized.includes('réserve') ||
    normalized.includes('reserve') ||
    normalized.includes('ادخار') ||
    normalized.includes('توفير')
  ) {
    // Icône de billet de banque / réserve financière
    return 'cash-outline';
  }

  // 6. Catégorie Santé et Médicaments / Pharmacie
  if (
    normalized.includes('santé') ||
    normalized.includes('sante') ||
    normalized.includes('médicament') ||
    normalized.includes('medicament') ||
    normalized.includes('pharmacie') ||
    normalized.includes('docteur') ||
    normalized.includes('health') ||
    normalized.includes('medical') ||
    normalized.includes('صحة') ||
    normalized.includes('أدوية') ||
    normalized.includes('علاج')
  ) {
    // Icône de trousse médicale / santé
    return 'medkit-outline';
  }

  // 7. Catégorie Hygiène et Soins / Beauté
  if (
    normalized.includes('hygiène') ||
    normalized.includes('hygiene') ||
    normalized.includes('soin') ||
    normalized.includes('beauté') ||
    normalized.includes('beaute') ||
    normalized.includes('personal care') ||
    normalized.includes('نظافة') ||
    normalized.includes('عناية') ||
    normalized.includes('تجميل')
  ) {
    // Icône d'éclat / propreté
    return 'sparkles-outline';
  }

  // 8. Catégorie Vêtements et Chaussures / Mode
  if (
    normalized.includes('vêtement') ||
    normalized.includes('vetement') ||
    normalized.includes('chaussure') ||
    normalized.includes('habit') ||
    normalized.includes('clothing') ||
    normalized.includes('shoe') ||
    normalized.includes('mode') ||
    normalized.includes('ملابس') ||
    normalized.includes('أحذية')
  ) {
    // Icône de chemise / habillement
    return 'shirt-outline';
  }

  // 9. Catégorie Maison et Équipement / Mobilier
  if (
    normalized.includes('maison') ||
    normalized.includes('équipement') ||
    normalized.includes('equipement') ||
    normalized.includes('meuble') ||
    normalized.includes('home') ||
    normalized.includes('logement') ||
    normalized.includes('منزل') ||
    normalized.includes('سكن') ||
    normalized.includes('أثاث')
  ) {
    // Icône de maison / foyer
    return 'home-outline';
  }

  // 10. Catégorie Matériel Informatique / Technologie
  if (
    normalized.includes('informatique') ||
    normalized.includes('ordinateur') ||
    normalized.includes('computer') ||
    normalized.includes('tech') ||
    normalized.includes('pc') ||
    normalized.includes('حاسوب') ||
    normalized.includes('إعلامية') ||
    normalized.includes('تقنية')
  ) {
    // Icône d'ordinateur portable
    return 'laptop-outline';
  }

  // 11. Catégorie Éducation / Études / Formation
  if (
    normalized.includes('éducation') ||
    normalized.includes('education') ||
    normalized.includes('étude') ||
    normalized.includes('etude') ||
    normalized.includes('formation') ||
    normalized.includes('école') ||
    normalized.includes('ecole') ||
    normalized.includes('school') ||
    normalized.includes('تعليم') ||
    normalized.includes('دراسة') ||
    normalized.includes('مدرسة')
  ) {
    // Icône d'école / chapeau d'études
    return 'school-outline';
  }

  // 12. Catégorie Enfants / Bébé / Maternité
  if (
    normalized.includes('enfant') ||
    normalized.includes('bébé') ||
    normalized.includes('bebe') ||
    normalized.includes('children') ||
    normalized.includes('kid') ||
    normalized.includes('أطفال') ||
    normalized.includes('رضيع')
  ) {
    // Icône d'émoticône souriant / enfance
    return 'happy-outline';
  }

  // 13. Catégorie Aide Familiale / Famille
  if (
    normalized.includes('aide familiale') ||
    normalized.includes('famille') ||
    normalized.includes('parent') ||
    normalized.includes('family') ||
    normalized.includes('عائلة') ||
    normalized.includes('أسرة')
  ) {
    // Icône de groupe / communauté familiale
    return 'people-outline';
  }

  // 14. Catégorie Dons / Charité / Solidarité
  if (
    normalized.includes('don') ||
    normalized.includes('charité') ||
    normalized.includes('charite') ||
    normalized.includes('donation') ||
    normalized.includes('solidarité') ||
    normalized.includes('صدقة') ||
    normalized.includes('زكاة') ||
    normalized.includes('تبرع')
  ) {
    // Icône de cœur / générosité
    return 'heart-outline';
  }

  // 15. Catégorie Frais Bancaires / Banque
  if (
    normalized.includes('banque') ||
    normalized.includes('bancaire') ||
    normalized.includes('bank') ||
    normalized.includes('frais') ||
    normalized.includes('carte') ||
    normalized.includes('بنك') ||
    normalized.includes('مصاريف بنكية')
  ) {
    // Icône de carte bancaire
    return 'card-outline';
  }

  // 16. Catégorie Restaurants et Cafés
  if (
    normalized.includes('restaurant') ||
    normalized.includes('café') ||
    normalized.includes('cafe') ||
    normalized.includes('coffee') ||
    normalized.includes('مقهى') ||
    normalized.includes('مطعم')
  ) {
    // Icône de tasse à café
    return 'cafe-outline';
  }

  // 17. Catégorie Téléphone et Internet
  if (
    normalized.includes('téléphone') ||
    normalized.includes('telephone') ||
    normalized.includes('internet') ||
    normalized.includes('phone') ||
    normalized.includes('forfait') ||
    normalized.includes('recharge') ||
    normalized.includes('هاتف') ||
    normalized.includes('إنترنت')
  ) {
    // Icône de téléphone / communication
    return 'call-outline';
  }

  // 18. Catégorie Loyer
  if (
    normalized.includes('loyer') ||
    normalized.includes('rent') ||
    normalized.includes('kré') ||
    normalized.includes('إيجار') ||
    normalized.includes('كراء')
  ) {
    // Icône de clé de logement
    return 'key-outline';
  }

  // 19. Catégorie Sport et Abonnements
  if (
    normalized.includes('sport') ||
    normalized.includes('fitness') ||
    normalized.includes('gym') ||
    normalized.includes('رياضة')
  ) {
    // Icône de remise en forme / haltère
    return 'fitness-outline';
  }

  // 20. Catégorie Voyages
  if (
    normalized.includes('voyage') ||
    normalized.includes('travel') ||
    normalized.includes('vol') ||
    normalized.includes('سفر') ||
    normalized.includes('رحلة')
  ) {
    // Icône d'avion
    return 'airplane-outline';
  }

  // 21. Catégorie Cadeaux et Fêtes
  if (
    normalized.includes('cadeau') ||
    normalized.includes('fête') ||
    normalized.includes('fete') ||
    normalized.includes('gift') ||
    normalized.includes('party') ||
    normalized.includes('هدية') ||
    normalized.includes('هدايا') ||
    normalized.includes('عيد')
  ) {
    // Icône de boîte cadeau
    return 'gift-outline';
  }

  // 22. Catégorie Animaux
  if (
    normalized.includes('animal') ||
    normalized.includes('animaux') ||
    normalized.includes('pet') ||
    normalized.includes('chien') ||
    normalized.includes('chat') ||
    normalized.includes('حيوان')
  ) {
    // Icône d'empreinte d'animal
    return 'paw-outline';
  }

  // 23. Catégorie Imprévus / Urgences
  if (
    normalized.includes('imprévu') ||
    normalized.includes('imprevu') ||
    normalized.includes('urgence') ||
    normalized.includes('طوارئ')
  ) {
    // Icône de signal d'alerte / éclair
    return 'flash-outline';
  }

  // 24. Reclassement par type de catégorie si libellé inconnu
  if (categoryKind === 'product') {
    // Sac d'articles pour un produit non catégorisé
    return 'bag-outline';
  }

  if (categoryKind === 'expense') {
    // Reçu pour une dépense générale
    return 'receipt-outline';
  }

  // Icône par défaut pour les catégories diverses
  return 'pricetag-outline';
}
