// ============================================================
// FICHIER : src/components/AppHeader.tsx
// RÔLE    : En-tête standardisé de toutes les pages Masrouf.
//           Conforme au design Figma : hamburger ☰ à gauche,
//           titre de page au centre-gauche, icône profil à droite.
// ============================================================

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Theme } from '../constants/theme';

interface AppHeaderProps {
  /** Titre affiché dans le header (ex: "Bonjour, Ines" ou "Produits") */
  title?: string;
  titre?: string;
  /** Fonction appelée quand l'utilisateur appuie sur le hamburger ☰ */
  onMenuPress: () => void;
  /** Afficher l'icône profil à droite (défaut : true) */
  showProfile?: boolean;
  /** Fonction appelée quand l'utilisateur appuie sur l'icône profil */
  onProfilePress?: () => void;
}

export default function AppHeader({
  title,
  titre,
  onMenuPress,
  showProfile = true,
  onProfilePress,
}: AppHeaderProps) {
  const displayTitle = title ?? titre ?? '';
  return (
    <View style={styles.header}>
      {/* Bouton hamburger ☰ */}
      <TouchableOpacity
        style={styles.menuBtn}
        onPress={onMenuPress}
        activeOpacity={0.6}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>

      {/* Titre de la page */}
      <Text style={styles.title} numberOfLines={1}>
        {displayTitle}
      </Text>

      {/* Icône profil utilisateur */}
      {showProfile ? (
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={onProfilePress}
          activeOpacity={0.6}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      ) : (
        <View style={{ width: 32 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: Theme.colors.warm,
  },
  menuBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 22,
    color: Theme.colors.ink,
    fontWeight: '400',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginLeft: 12,
  },
  profileBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
});

