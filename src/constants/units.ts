/**
 * FICHIER : src/constants/units.ts
 * IDENTIFIANT INVENTAIRE : CONST-UNITS-001
 * MODULE : Constantes Métier & Unités de Mesure
 *
 * RÔLE DU FICHIER :
 * Définition normalisée du catalogue des unités de mesure physiques supportées
 * par l'application Masrouf pour quantifier les articles de consommation courante.
 *
 * ANALOGIE DU MONDE RÉEL :
 * C'est l'étalon de mesure du commerçant : qu'il vende du lait au litre, de la farine
 * au kilogramme ou des oeufs à la pièce, chaque produit doit posséder une unité
 * standardisée pour permettre des comparaisons de prix au litre ou au kilo fiables.
 *
 * IMPACT VISUEL SUR L'INTERFACE UTILISATEUR :
 * Alimente les listes déroulantes de sélection d'unités (`SelectField`) dans les écrans :
 * - Création d'un nouveau produit (`nouveau-produit.tsx`)
 * - Modification d'un produit existant (`modifier-produit.tsx`)
 * - Enregistrement d'un nouvel achat (`PurchaseForm.tsx`)
 * - Affichage des étiquettes d'unités sur les cartes de produits et les historiques de prix.
 */

// ============================================================================
// CATALOGUE DES UNITÉS NORMALISÉES
// ============================================================================

/**
 * Tableau d'objets clé-valeur représentant chaque unité supportée :
 * - 'L'  : Litres (produits liquides volumineux : lait, huile d'olive, eau minérale).
 * - 'mL' : Millilitres (conditionnements liquides réduits : yaourts à boire, crèmes, sirops).
 * - 'kg' : Kilogrammes (denrées pesées au kilo : fruits, légumes, viandes, semoule, sucre).
 * - 'g'  : Grammes (portions légères préemballées : épices, levure, beurre 200g, thon 160g).
 * - 'pc' : Pièces / Unités individuelles (articles vendus à l'unité : savon, pain, cahier).
 *
 * STRUCTURE DE CHAQUE ÉLÉMENT :
 * { value: string, label: string }
 * - `value` : Valeur technique brute stockée dans les colonnes SQLite `product.unit` et `purchase.unit`.
 * - `label` : Libellé textuel affiché dans l'interface et les fenêtres modales de sélection.
 */
export const UNITS = [
  // Option vide pour les produits sans unité physique de mesure (ex: vêtements, chaussures, accessoires)
  { value: '', label: 'Aucune' },
  ...['L', 'mL', 'kg', 'g', 'pc'].map((u) => ({
    // Valeur technique transmise aux requêtes SQL d'insertion/mise à jour
    value: u,
    // Libellé visuel présenté à l'utilisateur dans la liste de sélection
    label: u,
  })),
];
