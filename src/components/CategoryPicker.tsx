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
// Icônes vectorielles Ionicons pour illustrer chaque catégorie
import { Ionicons } from '@expo/vector-icons';
// Palette de couleurs de Masrouf (vert forêt #102B27)
import { colors } from '@/constants/theme';
// Type TypeScript représentant une catégorie
import type { Category } from '@/state/types';
// Système de traduction multilingue (FR, AR, EN)
import { useTranslation } from '@/utils/i18n';
// Résolveur d'icône représentative par catégorie
import { getCategoryIcon } from '@/utils/categoryIcons';
// Composant de titre de section réutilisable
import { SectionTitle } from './ui';
import { isChildrenCategory } from '@/utils/categoryMatching';

interface CategoryPickerProps {
  categories: Category[];
  selected: string[];
  onToggle: (id: string) => void;
  onEditCategory?: (category: Category) => void;
  onDeleteCategory?: (id: string) => void;
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
export function CategoryPicker({
  categories,
  selected,
  onToggle,
  onEditCategory,
  onDeleteCategory,
}: CategoryPickerProps) {
  // Fonctions de traduction et sens d'écriture
  const { t, isRTL, traduireCategorie } = useTranslation();

  // Découpage des catégories en deux groupes distincts (Produits vs Dépenses)
  const groups: [string, Category[]][] = [
    [t('categories_produits'), categories.filter((c) => c.kind === 'product' && !isChildrenCategory(c) && c.active)],
    [t('categories_depenses'), categories.filter((c) => (c.kind === 'expense' || isChildrenCategory(c)) && c.active)],
  ];

  return (
    // Conteneur global avec espacement de 20px entre les deux grands rayons
    <View style={{ gap: 20 }}>
      {/* =========================================================================
          COMPTEUR DYNAMIQUE DE CATÉGORIES SÉLECTIONNÉES
          - Initialisé à 0 à la découverte
          - S'incrémente automatiquement (+1) quand une catégorie est cochée
          - Se décrémente automatiquement (-1) quand une catégorie est décochée
          - Reflète la sélection réelle sans aucune valeur codée en dur
          ========================================================================= */}
      <View
        style={[
          styles.counterBanner,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <View
          style={[
            styles.counterBadge,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Icône de case à cocher vectorielle évolutive */}
          <Ionicons
            name={selected.length > 0 ? 'checkbox-outline' : 'square-outline'}
            size={20}
            color={colors.forest}
          />
          {/* Libellé textuel traduit selon la langue active (FR: Catégories sélectionnées, AR: الفئات المحددة, EN: Selected categories) */}
          <Text style={[styles.counterLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('categories_selectionnees')} :
          </Text>
          {/* Pastille numérique affichant le décompte exact et réactif */}
          <View style={styles.counterPill}>
            <Text style={styles.counterNumber}>{selected.length}</Text>
          </View>
        </View>
      </View>

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
                {/* Conteneur gauche associant l'icône évocatrice et le libellé de la catégorie */}
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {/* Icône Ionicons descriptive propre à la catégorie (restaurant, voiture, reçu, etc.) */}
                  <Ionicons
                    name={getCategoryIcon(c.name, c.kind)}
                    size={20}
                    color={c.color || (on ? colors.forest : colors.muted)}
                  />
                  {/* Libellé traduit de la catégorie */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.name,
                        { textAlign: isRTL ? 'right' : 'left' },
                        on && styles.nameSelected,
                      ]}
                    >
                      {labelNom}
                    </Text>
                    {c.description ? (
                      <Text
                        style={[
                          styles.description,
                          { textAlign: isRTL ? 'right' : 'left' },
                        ]}
                      >
                        {c.description}
                      </Text>
                    ) : null}
                  </View>

                  {/* Badge personnalisée */}
                  {c.isCustom && (
                    <View style={styles.customBadge}>
                      <Text style={styles.customBadgeText}>Perso</Text>
                    </View>
                  )}
                </View>

                {/* Actions d'édition / suppression pour catégories personnalisées */}
                {c.isCustom && (onEditCategory || onDeleteCategory) && (
                  <View
                    style={{
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginHorizontal: 4,
                    }}
                  >
                    {onEditCategory && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onEditCategory(c);
                        }}
                        hitSlop={8}
                        style={styles.actionIconBtn}
                      >
                        <Ionicons name="pencil-outline" size={16} color={colors.forest} />
                      </Pressable>
                    )}
                    {onDeleteCategory && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onDeleteCategory(c.id);
                        }}
                        hitSlop={8}
                        style={styles.actionIconBtn}
                      >
                        <Ionicons name="trash-outline" size={16} color="#E11D48" />
                      </Pressable>
                    )}
                  </View>
                )}

                {/* Bouton d'action avec icône vectorielle Ionicons : affiche une coche vectorielle + 'Sélectionné' ou 'Choisir' sans aucun emoji */}
                <View
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {/* Coche vectorielle Ionicons lorsque la catégorie est sélectionnée */}
                  {on && (
                    <Ionicons
                      name="checkmark"
                      size={15}
                      color={colors.forest}
                    />
                  )}
                  {/* Libellé textuel traduit ('Sélectionné' ou 'Choisir') */}
                  <Text style={[styles.state, on && styles.stateSelected]}>
                    {on ? t('selectionne') : t('selectionner')}
                  </Text>
                </View>
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
  // Conteneur centré du compteur dynamique de catégories sélectionnées
  counterBanner: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 4,
  },
  // Badge visuel du compteur avec bordure douce et fond vert menthe translucide
  counterBadge: {
    backgroundColor: 'rgba(28, 81, 67, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(28, 81, 67, 0.16)',
  },
  // Libellé textuel du compteur
  counterLabel: {
    fontSize: 14.5,
    fontWeight: '600',
    color: colors.forest,
  },
  // Pastille ronde vert forêt pour le chiffre dynamique
  counterPill: {
    backgroundColor: colors.forest,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 2,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Chiffre dynamique en lettres blanches très lisibles
  counterNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
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
  description: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  customBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  customBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1565C0',
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
});
