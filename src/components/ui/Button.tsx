/**
 * FICHIER : src/components/ui/Button.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-054
 * COMPOSANT : Button (Bouton d'Action Atomique)
 *
 * MISSION DU FICHIER :
 * Fournir le composant de bouton universel de Masrouf, utilisé pour toutes les actions interactives :
 * - Gère 3 variantes sémantiques distinctes :
 *   1. `primary` (par défaut) : fond vert forêt (#102B27 / #1C5143), texte blanc en gras.
 *   2. `secondary` : fond vert menthe douce (#D9F0E4), texte vert foncé contrasté.
 *   3. `danger` : fond rouge corail (#DC7770), texte blanc (pour les actions destructives ou la déconnexion).
 * - Intègre la gestion native de l'animation de chargement (`loading`) avec le composant natif `ActivityIndicator`.
 * - Gère l'état désactivé (`disabled`) avec une atténuation d'opacité à 50% et blocage des clics.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il garantit une cohérence ergonomique et visuelle totale. Si l'on souhaite ajuster la hauteur
 * ou l'arrondi de tous les boutons de l'application, une seule modification ici impacte les 80 écrans.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand bouton tactile spacieux (hauteur minimale de 52px, coins arrondis à 14px).
 * - Un texte parfaitement centré en graisse semi-bold (taille 15px).
 * - Un retour visuel tactile au toucher (atténuation d'opacité à 85% lors du clic).
 * - Si `loading = true` : le texte est remplacé par un spinner animé blanc ou vert.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
// Constantes de thème (couleurs vert forêt, menthe, corail et arrondis)
import { colors, radius } from '@/constants/theme';

/**
 * Variantes de style disponibles pour le bouton.
 */
type Variant = 'primary' | 'secondary' | 'danger';

/**
 * Propriétés attendues par le composant Button.
 */
interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
}

/**
 * MISSION DU COMPOSANT :
 * Rendre un bouton tactile accessible et réactif.
 *
 * RÔLE DANS L'APPLICATION :
 * Encapsule la primitive `Pressable` avec retour d'état, couleurs de charte et gestion d'accessibilité.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Le bouton d'action rectangulaire aux coins adoucis avec son texte ou son spinner de chargement.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: Props) {
  // Détermine si le bouton doit être inactif (désactivé manuellement ou en cours de chargement)
  const off = disabled || loading;
  
  // Attribution dynamique de la couleur de fond selon la variante
  const bg =
    variant === 'primary'
      ? colors.green
      : variant === 'danger'
        ? colors.coral
        : colors.mint;
        
  // Attribution dynamique de la couleur du texte (blanc pour primary/danger, vert forêt pour secondary)
  const fg = variant === 'secondary' ? colors.green : colors.white;

  return (
    // Primitive Pressable native avec retour visuel d'opacité
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      {/* Si l'action est en cours de traitement, affiche le spinner d'attente à la place du texte */}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.label, { color: fg }]}>{label}</Text>
      )}
    </Pressable>
  );
}

// Feuilles de styles StyleSheet compilées en C++ natif
const styles = StyleSheet.create({
  // Style de base du conteneur de bouton
  base: {
    minHeight: 52,
    borderRadius: radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  // Typographie du libellé d'action
  label: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
