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
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  detail?: string;
  actionLabel?: string;
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
    <View style={styles.box}>
      {/* Médaillon circulaire avec icône thématique */}
      <View style={styles.badge}>
        <Ionicons name={icon} size={26} color={colors.green} />
      </View>

      {/* Titre de l'état vide */}
      <Text style={styles.title}>{title}</Text>

      {/* Explication ou conseil pour démarrer */}
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}

      {/* Bouton d'action contextuel optionnel */}
      {actionLabel && onAction ? (
        <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.white,
    borderRadius: radius.hero,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.forest,
    textAlign: 'center',
  },
  detail: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
    textAlign: 'center',
  },
});
