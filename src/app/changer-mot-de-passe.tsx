// ============================================================
// FICHIER : src/app/changer-mot-de-passe.tsx
// RÔLE    : Écran obligatoire de renouvellement du mot de passe.
//           S'affiche automatiquement lorsque must_change_password = 1
//           (ex: premier accès de l'administrateur ou réinitialisation
//           effectuée par l'administrateur).
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

// Contexte d'authentification et internationalisation
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';

export default function ChangerMotDePasseScreen() {
  const { user, changePassword, logout } = useAuth();
  const { t } = useTranslation();

  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmationMdp, setConfirmationMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  async function handleValider() {
    setErreur('');

    if (nouveauMdp.length < 6) {
      setErreur(t('erreur_mdp_trop_court'));
      return;
    }

    if (nouveauMdp !== confirmationMdp) {
      setErreur(t('erreur_confirmation_mdp'));
      return;
    }

    setEnChargement(true);
    try {
      const res = await changePassword(nouveauMdp);

      if (!res.success) {
        setErreur(t(res.errorKey ?? 'erreur_connexion'));
      } else {
        Alert.alert(
          'Sécurité',
          'Votre nouveau mot de passe a été enregistré avec succès !'
        );
        // NavigationGuard dans _layout.tsx redirige automatiquement
        // vers /(tabs) ou /(admin) car must_change_password est repassé à 0
      }
    } catch {
      setErreur(t('erreur_connexion'));
    } finally {
      setEnChargement(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBox}>
          <Text style={styles.logoIcon}>🔐</Text>
          <Text style={styles.appTitle}>{t('changer_mot_de_passe')}</Text>
          <Text style={styles.appSubtitle}>
            {t('changer_mot_de_passe_requis')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.userBadge}>
            Compte : {user?.nom} ({user?.email})
          </Text>

          {/* Nouveau mot de passe */}
          <Text style={styles.inputLabel}>
            {t('nouveau_mot_de_passe')} (min. 6 caractères) *
          </Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={nouveauMdp}
            onChangeText={(txt) => {
              setNouveauMdp(txt);
              setErreur('');
            }}
          />

          {/* Confirmation */}
          <Text style={styles.inputLabel}>{t('confirmer_mot_de_passe')} *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={confirmationMdp}
            onChangeText={(txt) => {
              setConfirmationMdp(txt);
              setErreur('');
            }}
          />

          {erreur ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {erreur}</Text>
            </View>
          ) : null}

          {/* Bouton de confirmation */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleValider}
            disabled={enChargement}
            activeOpacity={0.8}
          >
            {enChargement ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>
                {t('enregistrer_nouveau_mdp')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Bouton de déconnexion si besoin */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => logout()}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>🚪 {t('se_deconnecter')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoIcon: {
    fontSize: 52,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#581C87',
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#6B21A8',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    shadowColor: '#7E22CE',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  userBadge: {
    backgroundColor: '#F3E8FF',
    color: '#6B21A8',
    padding: 8,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#7E22CE',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  logoutButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  logoutButtonText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});
