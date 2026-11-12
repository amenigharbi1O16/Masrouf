// ============================================================
// FICHIER : src/app/(tabs)/reglages.tsx
// RÔLE    : Écran des réglages et préférences de l'utilisateur normal.
//
// VISUEL SUR L'ÉCRAN :
//   1. Section "Budget & Enveloppes" :
//      - Raccourci vers l'écran complet de gestion des enveloppes.
//   2. Section "Changer mon mot de passe" :
//      - Formulaire sécurisé avec hachage SHA-256 + sel.
//   3. Section "Langue / اللغة" :
//      - Sélecteur bilingue Français / Arabe.
//   4. Section "Documentation" :
//      - Manuel d'utilisation PDF.
//   5. Section "Mon Compte & Déconnexion" :
//      - Profil et déconnexion sécurisée de la session.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

// Fonctions SQLite
import {
  updateBudget,
  updateLangue,
  getTotalPoints,
  getPointsSettings,
} from '../../db/queries';

// Contexte et internationalisation
import { useAuth } from '../../utils/auth';
import { useTranslation, Langue } from '../../utils/i18n';

export default function ReglagesScreen() {
  const { user, updateUser, changePassword, logout } = useAuth();
  const { t, langue, changerLangue } = useTranslation();

  const [budgetInput, setBudgetInput] = useState('');
  const [messageBudget, setMessageBudget] = useState('');
  const [pointsTotal, setPointsTotal] = useState<number>(0);
  const [niveauBadge, setNiveauBadge] = useState<string>('🌱 Débutant');

  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmationMdp, setConfirmationMdp] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  React.useEffect(() => {
    if (user) {
      setBudgetInput(user.budget_mensuel > 0 ? String(user.budget_mensuel) : '');
      const pts = getTotalPoints(user.id);
      setPointsTotal(pts);
      const s = getPointsSettings();
      if (pts >= s.seuil_expert) {
        setNiveauBadge(`🏆 ${t('niveau_expert') ?? 'Expert'}`);
      } else if (pts >= s.seuil_econome) {
        setNiveauBadge(`💰 ${t('niveau_econome') ?? 'Économe'}`);
      } else {
        setNiveauBadge(`🌱 ${t('niveau_debutant') ?? 'Débutant'}`);
      }
    }
  }, [user, t]);

  // ----------------------------------------------------------
  // MODIFICATION DU BUDGET MENSUEL GLOBAL
  // ----------------------------------------------------------
  function handleSauvegarderBudget() {
    if (!user) return;
    const montant = parseFloat(budgetInput);
    if (isNaN(montant) || montant <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant de budget valide.');
      return;
    }
    updateBudget(user.id, montant);
    updateUser({ budget_mensuel: montant });
    setMessageBudget('Budget mensuel mis à jour avec succès !');
    setTimeout(() => setMessageBudget(''), 3000);
  }

  // ----------------------------------------------------------
  // CHANGEMENT DE MOT DE PASSE UTILISATEUR
  // ----------------------------------------------------------
  async function handleChangerMotDePasse() {
    if (nouveauMdp.length < 6) {
      Alert.alert('Erreur', t('erreur_mdp_trop_court'));
      return;
    }

    if (nouveauMdp !== confirmationMdp) {
      Alert.alert('Erreur', t('erreur_confirmation_mdp'));
      return;
    }

    const res = await changePassword(nouveauMdp);
    if (res.success) {
      setNouveauMdp('');
      setConfirmationMdp('');
      setMessageSucces('Mot de passe modifié avec succès !');
      setTimeout(() => setMessageSucces(''), 3000);
    }
  }

  // ----------------------------------------------------------
  // BASCULE DE LANGUE (FR, AR, EN)
  // ----------------------------------------------------------
  function handleChangerLangue(nouvelleLangue: Langue) {
    changerLangue(nouvelleLangue);
    updateUser({ langue: nouvelleLangue });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* SECTION 1 : GESTION DES ENVELOPPES DU BUDGET */}
      <Text style={styles.sectionTitle}>{t('budget_enveloppes')}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{t('fixer_budget')} (TND) :</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ex: 800"
          placeholderTextColor="#94A3B8"
          value={budgetInput}
          onChangeText={setBudgetInput}
        />
        {messageBudget ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ {messageBudget}</Text>
          </View>
        ) : null}
        <TouchableOpacity
          style={styles.savePasswordBtn}
          onPress={handleSauvegarderBudget}
          activeOpacity={0.8}
        >
          <Text style={styles.savePasswordBtnText}>{t('sauvegarder')}</Text>
        </TouchableOpacity>

        <View style={{ height: 1, backgroundColor: '#E2E8F0', marginVertical: 14 }} />

        <Text style={styles.label}>
          Configurez vos enveloppes « Masrouf [Catégorie] » et vos pourcentages :
        </Text>
        <TouchableOpacity
          style={styles.envelopeBtn}
          onPress={() => router.push('/budget-mois')}
          activeOpacity={0.8}
        >
          <Text style={styles.envelopeBtnText}>💼 {t('gerer_enveloppes')} →</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 2 : CHANGER MON MOT DE PASSE */}
      <Text style={styles.sectionTitle}>{t('changer_mot_de_passe')}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{t('nouveau_mot_de_passe')} (min. 6 caractères)</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={nouveauMdp}
          onChangeText={setNouveauMdp}
        />

        <Text style={styles.label}>{t('confirmer_mot_de_passe')}</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#94A3B8"
          secureTextEntry
          value={confirmationMdp}
          onChangeText={setConfirmationMdp}
        />

        {messageSucces ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ {messageSucces}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.savePasswordBtn}
          onPress={handleChangerMotDePasse}
          activeOpacity={0.8}
        >
          <Text style={styles.savePasswordBtnText}>{t('sauvegarder')}</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 3 : LANGUE (FR / AR / EN) */}
      <Text style={styles.sectionTitle}>{t('langue')} / Language / اللغة</Text>
      <View style={styles.card}>
        <View style={styles.languageRow}>
          <TouchableOpacity
            style={[
              styles.langBtn,
              langue === 'fr' ? styles.langBtnActive : styles.langBtnInactive,
            ]}
            onPress={() => handleChangerLangue('fr')}
          >
            <Text
              style={[
                styles.langBtnText,
                langue === 'fr' && styles.langBtnTextActive,
              ]}
            >
              🇫🇷 Français
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langBtn,
              langue === 'ar' ? styles.langBtnActive : styles.langBtnInactive,
            ]}
            onPress={() => handleChangerLangue('ar')}
          >
            <Text
              style={[
                styles.langBtnText,
                langue === 'ar' && styles.langBtnTextActive,
              ]}
            >
              🇸🇦 عربي
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.langBtn,
              langue === 'en' ? styles.langBtnActive : styles.langBtnInactive,
            ]}
            onPress={() => handleChangerLangue('en')}
          >
            <Text
              style={[
                styles.langBtnText,
                langue === 'en' && styles.langBtnTextActive,
              ]}
            >
              🇬🇧 English
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SECTION 4 : DOCUMENTATION PDF */}
      <Text style={styles.sectionTitle}>{t('documentation')}</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => {
            Alert.alert(
              '📖 Manuel d\'utilisation (PDF)',
              'Le manuel complet avec architecture, cas d\'utilisation et schéma de base de données est disponible dans le fichier RAPPORT_PROJET.html.\n\nVous pouvez l\'imprimer en PDF à tout moment avec Ctrl + P !'
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.manualButtonText}>📄 Ouvrir le {t('manuel_utilisation')}</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 5 : PROFIL & DECONNEXION */}
      <Text style={styles.sectionTitle}>{t('compte')}</Text>
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <Text style={styles.profileAvatar}>👤</Text>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user?.nom}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>Rôle : Utilisateur Personnel</Text>
          </View>
        </View>

        {/* Badge de Gamification & Points */}
        <View style={styles.profileGamificationBox}>
          <Text style={styles.profileBadgeText}>{niveauBadge}</Text>
          <Text style={styles.profilePointsText}>
            {pointsTotal} {t('points') ?? 'points'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => logout()}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>🚪 {t('se_deconnecter')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
    marginTop: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  envelopeBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  envelopeBtnText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  savePasswordBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  savePasswordBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    marginBottom: 8,
  },
  successText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 12,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  langBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  langBtnInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  langBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  manualButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  profileAvatar: {
    fontSize: 32,
    marginRight: 12,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  profileRole: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  profileGamificationBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  profileBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  profilePointsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
});
