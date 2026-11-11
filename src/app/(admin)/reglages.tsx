// ============================================================
// FICHIER : src/app/(admin)/reglages.tsx
// RÔLE    : Écran des réglages du profil Administrateur.
//           1. Modification de mot de passe administrateur.
//           2. Bascule de langue (FR / AR) avec impact instantané.
//           3. Déconnexion sécurisée de la session administrateur.
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

// Contexte et internationalisation
import { useAuth } from '../../utils/auth';
import { useTranslation, Langue } from '../../utils/i18n';
import { updateLangue } from '../../db/queries';

export default function AdminReglagesScreen() {
  const { user, updateUser, changePassword, logout } = useAuth();
  const { t, langue } = useTranslation();

  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmationMdp, setConfirmationMdp] = useState('');
  const [messageSucces, setMessageSucces] = useState('');

  // ----------------------------------------------------------
  // CHANGEMENT DE MOT DE PASSE ADMIN
  // ----------------------------------------------------------
  async function handleChangerMdp() {
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
      setMessageSucces('Mot de passe administrateur mis à jour !');
      setTimeout(() => setMessageSucces(''), 3000);
    }
  }

  // ----------------------------------------------------------
  // CHANGEMENT DE LANGUE
  // ----------------------------------------------------------
  function handleChangerLangue(nouvelleLangue: Langue) {
    if (!user) return;
    updateLangue(user.id, nouvelleLangue);
    updateUser({ langue: nouvelleLangue });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* SECTION 1 : PROFIL ADMINISTRATEUR */}
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <Text style={styles.avatar}>👑</Text>
          <View>
            <Text style={styles.adminName}>{user?.nom}</Text>
            <Text style={styles.adminEmail}>{user?.email}</Text>
            <Text style={styles.adminRole}>Rôle : Administrateur Système</Text>
          </View>
        </View>
      </View>

      {/* SECTION 2 : CHANGER MON MOT DE PASSE */}
      <Text style={styles.sectionTitle}>{t('changer_mot_de_passe')}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{t('nouveau_mot_de_passe')} (min. 6 caractères)</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          secureTextEntry
          value={nouveauMdp}
          onChangeText={setNouveauMdp}
        />

        <Text style={styles.label}>{t('confirmer_mot_de_passe')}</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
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
          style={styles.actionBtn}
          onPress={handleChangerMdp}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>{t('sauvegarder')}</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 3 : LANGUE DE L'INTERFACE */}
      <Text style={styles.sectionTitle}>{t('langue')} / اللغة</Text>
      <View style={styles.card}>
        <View style={styles.langRow}>
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
        </View>
      </View>

      {/* SECTION 4 : DECONNEXION */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => logout()}
        activeOpacity={0.8}
      >
        <Text style={styles.logoutBtnText}>🚪 {t('se_deconnecter')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    fontSize: 34,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  adminEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  adminRole: {
    fontSize: 12,
    color: '#7E22CE',
    fontWeight: '700',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#581C87',
    marginBottom: 8,
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionBtn: {
    backgroundColor: '#7E22CE',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    marginTop: 10,
  },
  successText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 12,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  langBtnActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7E22CE',
  },
  langBtnInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  langBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  langBtnTextActive: {
    color: '#7E22CE',
    fontWeight: '700',
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
});

