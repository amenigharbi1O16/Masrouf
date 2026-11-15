/**
 * FICHIER : src/app/produit/_layout.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-014
 * COMPOSANT : ProductLayout (Structure de Navigation des Fiches Produits)
 *
 * MISSION DU FICHIER :
 * Définir la pile de navigation (Stack) pour les écrans dédiés aux articles d'épicerie :
 * - `[id].tsx` : Fiche détaillée du produit avec comparateur de magasins, meilleur prix et bouton d'achat.
 * - `historique.tsx` : Journal chronologique complet de tous les tickets de caisse de cet article.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il isole la navigation produit au sein d'une pile fluide avec retour arrière naturel,
 * sans barre de titre native parasite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Masque les en-têtes natifs (`headerShown: false`).
 * - Applique le fond unifié sable chaud (#F5F3ED) lors des transitions entre la fiche produit et son historique.
 */

import { Stack } from 'expo-router';
import React from 'react';

/**
 * MISSION DU COMPOSANT :
 * Initialiser la pile de navigation des détails de produits.
 *
 * RÔLE DANS L'APPLICATION :
 * Encapsule les routes dynamiques `/produit/[id]` et `/produit/historique`.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Un conteneur fluide sans bordures parasites avec la couleur de fond du thème (#F5F3ED).
 */
export default function ProductLayout() {
  return (
    // Stack : composant de navigation en pile fourni par Expo Router
    <Stack
      screenOptions={{
        // Supprime la barre supérieure native du système
        headerShown: false,
        // Couleur de fond sable chaud (#F5F3ED) commune aux fiches produits
        contentStyle: { backgroundColor: '#F5F3ED' },
      }}
    />
  );
}
