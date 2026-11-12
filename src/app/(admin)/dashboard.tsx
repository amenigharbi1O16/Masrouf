// ============================================================
// FICHIER : src/app/(admin)/dashboard.tsx
// RÔLE    : Vue d'ensemble Administrateur — Design Figma 35.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 35 · FR · Admin dashboard) :
//   • Header : ☰ hamburger + "Vue d'ensemble admin" + profil
//   • Label "ADMINISTRATEUR · STATISTIQUES GLOBALES" (muted, uppercase)
//   • Carte Hero Forest (#102B27) :
//       - Label "COMPTES ACTIFS"
//       - Nombre grand format (ex: 248)
//       - Sous-titre : "X au total · Y suspendus"
//   • Bannière Mint de confidentialité :
//       - "✓ Statistiques anonymes uniquement"
//       - "Aucun accès aux budgets ou transactions personnels."
//   • Ligne d'information : "Catégories de produits     6"
//   • Ligne d'information : "Catégories de dépenses    10"
//   • 6 Boutons secondaires mint :
//       1. "Gérer les utilisateurs"
//       2. "Gérer les catégories"
//       3. "Types de catégories"
//       4. "Pourcentages par défaut"
//       5. "Règles des points"
//       6. "Paramètres admin"
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getAdminGlobalStats,
  getAllCategories,
  AdminGlobalStats,
} from '../../db/queries';

// Design System & Contexte
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useAdminDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useAdminDrawer();

  const [stats, setStats] = useState<AdminGlobalStats>({
    nbUtilisateurs: 0,
    nbUtilisateursActifs: 0,
    nbProduits: 0,
    nbAchats: 0,
    volumeTotalTND: 0,
    topCategorieNom: '...',
  });

  const [nbCatsProduit, setNbCatsProduit] = useState<number>(6);
  const [nbCatsDepense, setNbCatsDepense] = useState<number>(10);

  useFocusEffect(
    useCallback(() => {
      const s = getAdminGlobalStats(user?.id);
      setStats(s);

      const cats = getAllCategories(false);
      setNbCatsProduit(cats.filter((c) => c.type === 'product').length);
      setNbCatsDepense(cats.filter((c) => c.type === 'expense').length);
    }, [user?.id])
  );

  const nbSuspendus = Math.max(0, stats.nbUtilisateurs - stats.nbUtilisateursActifs);

  return (
    <View style={styles.container}>
      {/* Header avec bouton hamburger */}
      <AppHeader
        titre="Vue d'ensemble admin"
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Label uppercase */}
        <Text style={styles.sectionLabel}>
          ADMINISTRATEUR · STATISTIQUES GLOBALES
        </Text>

        {/* CARTE HERO : COMPTES ACTIFS (Forest Green #102B27) */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>COMPTES ACTIFS</Text>
          <Text style={styles.heroNumber}>{stats.nbUtilisateursActifs}</Text>
          <Text style={styles.heroSub}>
            {stats.nbUtilisateurs} au total · {nbSuspendus} suspendus
          </Text>
        </View>

        {/* BANNIÈRE MINT DE CONFIDENTIALITÉ */}
        <View style={styles.mintBanner}>
          <View style={styles.bannerHeaderRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.bannerTitle}>
              Statistiques anonymes uniquement
            </Text>
          </View>
          <Text style={styles.bannerSub}>
            Aucun accès aux budgets ou transactions personnels.
          </Text>
        </View>

        {/* LIGNES D'INFORMATIONS RÉFÉRENTIEL */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Catégories de produits</Text>
          <Text style={styles.infoValue}>{nbCatsProduit}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Catégories de dépenses</Text>
          <Text style={styles.infoValue}>{nbCatsDepense}</Text>
        </View>

        {/* 6 BOUTONS D'ACCÈS RAPIDE (Figma 35) */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(admin)/utilisateurs')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Gérer les utilisateurs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(admin)/categories')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Gérer les catégories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(admin)/categories')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Types de catégories</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(admin)/categories')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Pourcentages par défaut</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(admin)/points-regles')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Règles des points</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push('/(admin)/reglages')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>Paramètres admin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 35
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // HERO CARD FOREST GREEN (#102B27)
  heroCard: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.xl,
    padding: 24,
    marginBottom: 20,
    ...Theme.shadows.card,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.mint,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroNumber: {
    fontSize: 44,
    fontWeight: '800',
    color: Theme.colors.white,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(217, 240, 228, 0.8)',
  },

  // BANNIÈRE MINT
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.lg,
    padding: 18,
    marginBottom: 20,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
  },
  bannerSub: {
    fontSize: 13,
    color: Theme.colors.forest,
    lineHeight: 18,
  },

  // LIGNES D'INFORMATIONS
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // CONTENEUR BOUTONS
  buttonsContainer: {
    marginTop: 20,
    gap: 12,
  },
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Theme.colors.deepGreen,
    fontSize: 15,
    fontWeight: '700',
  },
});
