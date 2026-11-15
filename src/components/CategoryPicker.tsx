/**
 * FICHIER : src/components/CategoryPicker.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-042
 * COMPOSANT : CategoryPicker (Sélecteur Visuel de Catégories à Deux États)
 *
 * MISSION DU FICHIER :
 * Fournir un composant de sélection tactile épuré et ergonomique permettant à l'utilisateur
 * de cocher et décocher les catégories qu'il souhaite suivre.
 * - Sépare nettement les catégories en deux rayons majeurs : 'Produits d'épicerie' et 'Dépenses fixes'.
 * - Gère une interaction tactile fluide avec retour visuel immédiat (texte basculant entre 'Choisir' et '✓ Sélectionné').
 * - Prise en charge native complète du sens de lecture droite-à-gauche (RTL) pour l'arabe.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il est utilisé à la fois pendant l'assistant d'accueil post-inscription (`src/app/onboarding.tsx`)
 * et dans les paramètres de gestion de profil (`src/app/gerer-categories.tsx`).
 * Il assure une cohérence graphique absolue entre la première découverte et la personnalisation ultérieure.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Deux blocs thématiques avec titres gras en vert forêt : 'Produits d'épicerie' et 'Dépenses fixes'.
 * - Pour chaque catégorie : une rangée spacieuse (hauteur minimale tactile de 46px) contenant
 *   le nom traduit de la catégorie à gauche (ou à droite en arabe) et un bouton textuel interactif vert foncé :
 *   'Choisir' lorsque la catégorie n'est pas cochée, ou '✓ Sélectionné' en gras lorsqu'elle est active.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
// Palette de couleurs de Masrouf (vert forêt #102B27)
import { colors } from '@/constants/theme';
// Type TypeScript représentant une catégorie
import type { Category } from '@/state/types';
// Système de traduction multilingue (FR, AR, EN)
import { useTranslation } from '@/utils/i18n';
// Composant de titre de section réutilisable
import { SectionTitle } from './ui';

interface CategoryPickerProps {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
}

/**
 * MISSION DU COMPOSANT :
 * Rendre la liste des catégories avec sélection tactile à deux états ('Choisir' et '✓ Sélectionné').
 *
 * RÔLE DANS L'APPLICATION :
 * Permet à l'utilisateur de cliquer sur une catégorie pour l'ajouter ou la retirer de sa sélection active.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La liste ordonnée des catégories avec détection d'appui tactile et inversion RTL en langue arabe.
 */
export function CategoryPicker({ categories, selected, onToggle }: CategoryPickerProps) {
  // Fonctions de traduction et sens d'écriture
  const { t, isRTL, traduireCategorie } = useTranslation();

  // Découpage des catégories en deux groupes distincts (Produits vs Dépenses)
  const groups: [string, Category[]][] = [
    [t('categories_produits'), categories.filter((c) => c.kind === 'product' && c.active)],
    [t('categories_depenses'), categories.filter((c) => c.kind === 'expense' && c.active)],
  ];

  return (
    // Conteneur global avec espacement de 20px entre les deux grands rayons
    <View style={{ gap: 20 }}>
      {groups.map(([title, list]) => (
        <View key={title} style={{ gap: 4 }}>
          {/* Titre de section stylisé en vert forêt (Produits d'épicerie ou Dépenses fixes) */}
          <SectionTitle style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {title}
          </SectionTitle>

          {/* Rendu des lignes de catégories pour ce rayon */}
          {list.map((c) => {
            // Vérification si cette catégorie fait partie du tableau des catégories sélectionnées
            const on = selected.includes(c.id);
            // Traduction automatique du libellé selon la langue active
            const labelNom = traduireCategorie(c.name);

            return (
              // Zone cliquable tactile avec opacité réduite au toucher (pressed)
              <Pressable
                key={c.id}
                onPress={() => onToggle(c.id)}
                style={({ pressed }) => [
                  styles.row,
                  // Inverse l'agencement horizontal en mode arabe (RTL)
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  pressed && { opacity: 0.7 },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={labelNom}
              >
                {/* Libellé de la catégorie : gris ardoise par défaut, vert forêt plus soutenu si sélectionné */}
                <Text
                  style={[
                    styles.name,
                    { textAlign: isRTL ? 'right' : 'left' },
                    on && styles.nameSelected,
                  ]}
                >
                  {labelNom}
                </Text>

                {/* Bouton textuel d'état : affiche '✓ Sélectionné' ou 'Choisir' */}
                <Text style={[styles.state, on && styles.stateSelected]}>
                  {on ? `✓ ${t('selectionne')}` : t('selectionner')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// Feuilles de styles StyleSheet natives garantissant une fluidité à 60 FPS
const styles = StyleSheet.create({
  // Titre du rayon : grande police 20px en gras vert forêt
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.forest,
    marginTop: 12,
    marginBottom: 6,
  },
  // Ligne de catégorie : hauteur confortable au toucher (46px minimum) avec séparateur visuel naturel
  row: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    minHeight: 46,
  },
  // Nom de la catégorie non cochée
  name: {
    fontSize: 15,
    fontWeight: '400',
    color: '#4A5568',
    flex: 1,
  },
  // Nom de la catégorie cochée : passe en vert forêt avec graisse semi-bold
  nameSelected: {
    color: colors.forest,
    fontWeight: '500',
  },
  // Libellé de l'action à droite ('Choisir')
  state: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  // Libellé de l'action cochée ('✓ Sélectionné')
  stateSelected: {
    color: colors.forest,
    fontWeight: '700',
  },
});
