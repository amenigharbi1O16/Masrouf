/**
 * FICHIER : src/components/ui/Input.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-056
 * COMPOSANT : Input (Champ de Saisie Textuel Stylisé)
 *
 * MISSION DU FICHIER :
 * Fournir le composant de saisie standardisé de l'application Masrouf :
 * 1. Intègre le libellé flottant en haut (taille 11px, couleur grise discrète `colors.muted`).
 * 2. Champ de saisie `TextInput` en dessous (taille 16px, police grasse vert forêt `colors.forest`).
 * 3. Prise en charge des claviers spécialisés (décimal pour les dinars, email, mot de passe masqué).
 * 4. Gestion automatique de l'alignement RTL (ferré à droite en langue arabe, à gauche en français/anglais).
 * 5. Affiche une bordure rouge corail et un message d'erreur si la validation échoue, ou un conseil d'aide sous la boîte.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il garantit une ergonomie de saisie constante et rassurante sur tous les formulaires
 * (budget, courses, dépenses, login, inscription, recherche).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Une boîte blanche élégante aux coins arrondis (hauteur minimale de 80px avec bordure fine).
 * - Le libellé en petit au-dessus et le texte tapé en grand et lisible au centre.
 * - Le texte d'exemple (placeholder) grisé `#9AA9A3`.
 * - Une bordure rouge corail vif (#DC7770) si une erreur est détectée avec le message en rouge en dessous.
 */

import React from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
// Constantes de thème (couleurs vert forêt, blanc, corail, bordures et arrondis)
import { colors, radius } from '@/constants/theme';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Propriétés attendues par le composant Input.
 */
interface Props {
  label: string;
  value: string;
  onChangeText?: (t: string) => void;
  placeholder?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  editable?: boolean;
  error?: string;
  hint?: string;
}

/**
 * MISSION DU COMPOSANT :
 * Rendre un champ de formulaire structuré avec libellé supérieur et gestion des erreurs.
 *
 * RÔLE DANS L'APPLICATION :
 * Encapsule la primitive `TextInput` de React Native avec le design et le comportement bilingue de Masrouf.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La boîte blanche contenant le libellé supérieur, le champ de saisie et la note d'aide ou d'erreur.
 */
export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  autoCapitalize = 'none',
  editable = true,
  error,
  hint,
}: Props) {
  // Détection du sens d'écriture actif (RTL pour l'arabe)
  const { isRTL } = useTranslation();

  return (
    <View>
      {/* Boîte conteneur du champ de saisie */}
      <View
        style={[
          styles.box,
          // Bordure rouge corail si une erreur est présente
          !!error && { borderColor: colors.coral },
          // Atténuation d'opacité si le champ est verrouillé en lecture seule
          !editable && { opacity: 0.6 },
        ]}
      >
        {/* Libellé supérieur discret */}
        <Text
          style={[
            styles.label,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {label}
        </Text>

        {/* Champ de saisie textuelle natif */}
        <TextInput
          style={[
            styles.input,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9AA9A3"
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
        />
      </View>

      {/* Message contextuel sous la boîte : erreur rouge prioritaire ou note d'aide grise */}
      {error ? (
        <Text
          style={[
            styles.error,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text
          style={[
            styles.hint,
            { textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// Feuilles de styles StyleSheet optimisées
const styles = StyleSheet.create({
  // Boîte conteneur rectangulaire blanche
  box: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    minHeight: 80,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 6,
  },
  // Typographie du libellé supérieur
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  // Typographie du texte de saisie
  input: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    color: colors.forest,
    paddingVertical: 4,
    minHeight: 36,
  },
  // Texte d'erreur en rouge corail
  error: {
    fontSize: 12,
    color: colors.coral,
    marginTop: 4,
    marginHorizontal: 4,
  },
  // Texte d'aide explicatif en gris ardoise
  hint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 4,
    marginHorizontal: 4,
  },
});
