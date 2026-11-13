// ============================================================
// FICHIER : src/app/(admin)/reglages.tsx
// RÔLE    : Paramètres de l'administrateur — Design Figma 43.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 43 · FR · Admin Settings) :
//   • Header : ☰ hamburger + "Paramètres admin" + profil
//   • Label "ADMINISTRATEUR" (muted, uppercase)
//   • Carte blanche "Langue" :
//       - Label "Langue"
//       - "Anglais · Français · العربية" (cliquables)
//   • Carte blanche "Devise" :
//       - Label "Devise"
//       - "Dinar tunisien · DT"
//   • Titre de section "Limites d'accès"
//   • Bannière Mint de sécurité :
//       - "✓ Finances privées inaccessibles"
//       - "Seules les statistiques globales anonymes sont disponibles."
//   • Ligne d'information : "Rôle                     Administrateur"
//   • Ligne d'information : "Version de l'application  1.0.0"
//   • Bouton secondary mint : "Changer le mot de passe"
//   • Bouton secondary mint : "Se déconnecter"
// ============================================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

// Design System & Contexte
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation, Langue } from '../../utils/i18n';
import { ouvrirManuelUtilisation } from '../../utils/pdf';
import { useAdminDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

export default function AdminReglagesScreen() {
  const { user, logout } = useAuth();
  const { t, langue, changerLangue } = useTranslation();
  const { ouvrirDrawer } = useAdminDrawer();

  function handleLogout() {
    Alert.alert(
      t('se_deconnecter') ?? 'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter de la session administrateur ?',
      [
        { text: t('annuler') ?? 'Annuler', style: 'cancel' },
        {
          text: t('se_deconnecter') ?? 'Se déconnecter',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader
        titre="Paramètres admin"
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Label uppercase */}
        <Text style={styles.sectionLabel}>ADMINISTRATEUR</Text>

        {/* CARTE : LANGUE (Figma 43) */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('langue') ?? 'Langue'}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity onPress={() => changerLangue('en')}>
              <Text style={[styles.langText, langue === 'en' && styles.langActive]}>
                Anglais
              </Text>
            </TouchableOpacity>
            <Text style={styles.langSep}>·</Text>
            <TouchableOpacity onPress={() => changerLangue('fr')}>
              <Text style={[styles.langText, langue === 'fr' && styles.langActive]}>
                Français
              </Text>
            </TouchableOpacity>
            <Text style={styles.langSep}>·</Text>
            <TouchableOpacity onPress={() => changerLangue('ar')}>
              <Text style={[styles.langText, langue === 'ar' && styles.langActive]}>
                العربية
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* CARTE : DEVISE (Figma 43) */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('devise') ?? 'Devise'}</Text>
          <Text style={styles.fieldValue}>Dinar tunisien · DT</Text>
        </View>

        {/* SECTION LIMITES D'ACCÈS */}
        <Text style={styles.sectionTitle}>Limites d'accès</Text>

        {/* Bannière Mint de sécurité */}
        <View style={styles.mintBanner}>
          <View style={styles.bannerHeaderRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.bannerTitle}>
              Finances privées inaccessibles
            </Text>
          </View>
          <Text style={styles.bannerSub}>
            Seules les statistiques globales anonymes sont disponibles.
          </Text>
        </View>

        {/* Lignes d'informations */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Rôle</Text>
          <Text style={styles.infoValue}>Administrateur</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version de l'application</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>

        {/* BOUTON SECONDARY MINT : CHANGER LE MOT DE PASSE */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/changer-mot-de-passe')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            {t('changer_mot_de_passe') ?? 'Changer le mot de passe'}
          </Text>
        </TouchableOpacity>

        {/* BOUTON SECONDARY MINT : MANUEL D'UTILISATION (PDF) */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => ouvrirManuelUtilisation(langue)}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            📄 {t('manuel_utilisation')}
          </Text>
        </TouchableOpacity>

        {/* BOUTON SECONDARY MINT : SE DÉCONNECTER */}
        <TouchableOpacity
          style={[styles.secondaryBtn, styles.logoutBtn]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            {t('se_deconnecter') ?? 'Se déconnecter'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 43
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

  // Carte blanche
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 12,
    ...Theme.shadows.card,
  },
  fieldLabel: {
    fontSize: 11,
    color: Theme.colors.muted,
    marginBottom: 6,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // Langues
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langText: {
    fontSize: 15,
    color: Theme.colors.muted,
    fontWeight: '500',
  },
  langActive: {
    color: Theme.colors.ink,
    fontWeight: '800',
  },
  langSep: {
    fontSize: 14,
    color: Theme.colors.muted,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginTop: 24,
    marginBottom: 14,
  },

  // Bannière Mint
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.lg,
    padding: 18,
    marginBottom: 18,
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

  // Boutons
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryBtnText: {
    color: Theme.colors.deepGreen,
    fontSize: 15,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 14,
  },
});
