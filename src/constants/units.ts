// ============================================================
// FICHIER : src/constants/units.ts
// RÔLE    : Liste normalisée des unités de mesure pour les produits
//           (Litres, Millilitres, Kilogrammes, Grammes, Pièces).
//           Utilisée dans les sélecteurs de création et modification de produits.
// ============================================================

export const UNITS = ['L', 'mL', 'kg', 'g', 'pc'].map((u) => ({
  value: u,
  label: u,
}));
