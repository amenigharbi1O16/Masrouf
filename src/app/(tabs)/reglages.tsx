// ============================================================
// FICHIER : src/app/(tabs)/reglages.tsx
// RÔLE    : Écran des paramètres — Design Figma 22.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 22 · FR · Settings) :
//   • Header standardisé avec ☰ hamburger + "Paramètres" + icône profil
//   • Label "MASROUF À VOTRE IMAGE" (muted, uppercase)
//   • Nom de l'utilisateur en grand format gras (ex: Ines Ben Ali)
//   • Adresse e-mail de l'utilisateur
//   • Carte blanche "Langue" :
//       - "Langue"
//       - "Anglais · Français · العربية" (cliquables)
//   • Carte blanche "Devise" :
//       - "Devise"
//       - "Dinar tunisien · DT"
//   • Bouton secondary mint "Gérer les catégories"
//   • Bouton secondary mint "Changer le mot de passe"
//   • Section "La confidentialité avant tout" :
//       - Bannière mint avec coche ✓ : "Vos finances restent sur cet appareil \n Budgets et transactions stockés localement."
//   • Ligne d'information : "Stockage local   SQLite"
//   • Ligne d'information : "Version de l'application   1.0.0"
//   • Bouton secondary mint "Se déconnecter"
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';

// Fonctions SQLite
import { getAllCategories, Categorie } from '../../db/queries';

// Design System, Auth & Internationalisation
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation, Langue } from '../../utils/i18n';
import { ouvrirManuelUtilisation } from '../../utils/pdf';
import { useDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

export default function ReglagesScreen() {
  const { user, logout } = useAuth();
  const { t, langue, changerLangue } = useTranslation();
  const { ouvrirDrawer } = useDrawer();

  // Modale pour voir les catégories gérées
  const [modalCategories, setModalCategories] = useState(false);
  const [categories, setCategories] = useState<Categorie[]>([]);

  function ouvrirGestionCategories() {
    const cats = getAllCategories(false);
    setCategories(cats);
    setModalCategories(true);
  }

  function handleLogout() {
    Alert.alert(
      t('se_deconnecter') ?? 'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
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
      {/* ========================================================= */}
      {/* HEADER : hamburger ☰ + "Paramètres" + profil              */}
      {/* ========================================================= */}
      <AppHeader
        titre={t('parametres') ?? 'Paramètres'}
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* LABEL : MASROUF À VOTRE IMAGE                            */}
        {/* ========================================================= */}
        <Text style={styles.sectionLabel}>
          {t('a_votre_image') ?? 'MASROUF À VOTRE IMAGE'}
        </Text>

        {/* ========================================================= */}
        {/* PROFIL UTILISATEUR                                        */}
        {/* ========================================================= */}
        <Text style={styles.userName}>{user?.nom ?? 'Utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.email ?? 'compte@masrouf.tn'}</Text>

        {/* ========================================================= */}
        {/* CARTE : LANGUE                                            */}
        {/* ========================================================= */}
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

        {/* ========================================================= */}
        {/* CARTE : DEVISE                                            */}
        {/* ========================================================= */}
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>{t('devise') ?? 'Devise'}</Text>
          <Text style={styles.fieldValue}>Dinar tunisien · DT</Text>
        </View>

        {/* ========================================================= */}
        {/* BOUTON SECONDARY MINT : GÉRER LES CATÉGORIES              */}
        {/* ========================================================= */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={ouvrirGestionCategories}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            {t('gerer_categories') ?? 'Gérer les catégories'}
          </Text>
        </TouchableOpacity>

        {/* ========================================================= */}
        {/* BOUTON SECONDARY MINT : CHANGER LE MOT DE PASSE          */}
        {/* ========================================================= */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/changer-mot-de-passe')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            {t('changer_mot_de_passe') ?? 'Changer le mot de passe'}
          </Text>
        </TouchableOpacity>

        {/* ========================================================= */}
        {/* BOUTON SECONDARY MINT : MANUEL D'UTILISATION (PDF)        */}
        {/* ========================================================= */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => ouvrirManuelUtilisation(langue)}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            📄 {t('manuel_utilisation')}
          </Text>
        </TouchableOpacity>

        {/* ========================================================= */}
        {/* SECTION : LA CONFIDENTIALITÉ AVANT TOUT                   */}
        {/* ========================================================= */}
        <Text style={styles.privacySectionTitle}>
          {t('confidentialite_avant_tout') ?? 'La confidentialité avant tout'}
        </Text>

        {/* Bannière Mint de confidentialité */}
        <View style={styles.mintBanner}>
          <View style={styles.bannerHeaderRow}>
            <Text style={styles.checkIcon}>✓</Text>
            <Text style={styles.bannerTitle}>
              {t('finances_restent_appareil') ?? 'Vos finances restent sur cet appareil'}
            </Text>
          </View>
          <Text style={styles.bannerSub}>
            {t('stockage_local_desc') ?? 'Budgets et transactions stockés localement.'}
          </Text>
        </View>

        {/* Lignes d'informations système */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Stockage local</Text>
          <Text style={styles.infoValue}>SQLite</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Version de l'application</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>

        {/* ========================================================= */}
        {/* BOUTON SECONDARY MINT : SE DÉCONNECTER                    */}
        {/* ========================================================= */}
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

      {/* ========================================================= */}
      {/* MODALE : LISTE DES CATÉGORIES ENREGISTRÉES                */}
      {/* ========================================================= */}
      <Modal
        visible={modalCategories}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalCategories(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t('vos_categories') ?? 'Vos Catégories'}
            </Text>
            <TouchableOpacity onPress={() => setModalCategories(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {categories.map((c) => (
              <View key={c.id} style={styles.modalCatRow}>
                <View style={styles.modalCatLeft}>
                  <Text style={styles.modalCatIcon}>{c.icone}</Text>
                  <Text style={styles.modalCatName}>{c.nom}</Text>
                </View>
                <Text style={styles.modalCatType}>
                  {c.type === 'product' ? 'Produit' : 'Dépense'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 22
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },

  // Label uppercase muted
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  // Identité utilisateur
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Theme.colors.muted,
    marginBottom: 20,
  },

  // Carte blanche pour paramètre
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

  // Sélecteur de langues en ligne
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

  // Boutons secondaires mint
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.deepGreen,
  },
  logoutBtn: {
    marginTop: 24,
  },

  // Titre section confidentialité
  privacySectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginTop: 32,
    marginBottom: 14,
  },

  // Bannière mint
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
    marginBottom: 6,
  },
  checkIcon: {
    fontSize: 16,
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

  // Lignes d'informations
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // Modale
  modalRoot: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.ink,
  },
  modalClose: {
    fontSize: 20,
    color: Theme.colors.muted,
    fontWeight: 'bold',
    padding: 6,
  },
  modalScroll: {
    paddingVertical: 16,
    gap: 10,
  },
  modalCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Theme.colors.white,
    padding: 14,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  modalCatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalCatIcon: {
    fontSize: 20,
  },
  modalCatName: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
  modalCatType: {
    fontSize: 13,
    color: Theme.colors.muted,
  },
});
