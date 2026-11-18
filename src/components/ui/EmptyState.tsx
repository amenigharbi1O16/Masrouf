/**
 * FICHIER : src/components/ui/EmptyState.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-055
 * COMPOSANT : EmptyState (Composant d'État Vide Pédagogique)
 *
 * RÔLE DU COMPOSANT :
 * Présenté à l'utilisateur lorsqu'une section, un tableau ou une entité ne contient aucune donnée :
 * - Liste de produits vide dans `produits.tsx`
 * - Absence de budget actif dans `analyses.tsx` ou `calendrier.tsx`
 * - Aucun utilisateur trouvé lors d'une recherche admin dans `utilisateurs.tsx`
 * - Aucune période clôturée dans `points.tsx`
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Grande carte blanche aux coins arrondis (radius hero 24), médaillon circulaire vert menthe doux (56x56)
 * contenant une icône verte IonIcons, titre clair en vert forêt, paragraphe descriptif centré
 * et bouton d'action pleine largeur pour créer la première ressource.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
// Constantes de thème
import { colors, radius } from '@/constants/theme';
// Bouton d'action atomique
import { Button } from './Button';

/**
 * Propriétés du composant EmptyState.
 */
interface Props {
  // Icône vectorielle thématique IonIcons affichée au centre du médaillon (défaut: 'leaf-outline')
  icon?: keyof typeof Ionicons.glyphMap;
  // Titre principal concis décrivant la situation vide (ex: "Aucun produit existant")
  title: string;
  // Explication ou conseil pratique pour guider l'utilisateur
  detail?: string;
  // Libellé du bouton d'action principal optionnel (ex: "Créer un budget", "Ajouter un produit")
  actionLabel?: string;
  // Callback déclenché lors de la pression sur le bouton d'action
  onAction?: () => void;
}

/**
 * Composant de présentation d'un état vide.
 */
export function EmptyState({
  icon = 'leaf-outline',
  title,
  detail,
  actionLabel,
  onAction,
}: Props) {
  return (
    // Carte blanche d'arrière-plan avec grand arrondi (radius 24) et centrage vertical
    <View style={styles.box}>
      {/* Médaillon circulaire vert menthe de 56x56 avec icône verte au centre */}
      <View style={styles.badge}>
        <Ionicons name={icon} size={26} color={colors.green} />
      </View>

      {/* Titre informatif en vert forêt centré */}
      <Text style={styles.title}>{title}</Text>

      {/* Paragraphe explicatif gris ardoise centré */}
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}

      {/* Bouton d'action contextuel occupant toute la largeur si une action est fournie */}
      {actionLabel && onAction ? (
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

/** Styles graphiques de l'état vide */
const styles = StyleSheet.create({
  // Boîte conteneur avec fond blanc pur, coins très arrondis et rembourrage de 24px
  box: {
    backgroundColor: colors.white,
    borderRadius: radius.hero,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  // Médaillon circulaire (56x56) vert menthe douce (#D9F0E4)
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Typographie du titre (18px, semi-bold 600) en vert forêt
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.forest,
    textAlign: 'center',
  },
  // Typographie de la description (14px, regular) en vert grisé
  detail: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
  },
});
