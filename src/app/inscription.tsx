// ============================================================
// FICHIER : src/app/inscription.tsx
// RÔLE    : Écran d'inscription pour créer un compte utilisateur.
//           RÈGLE DE SÉCURITÉ ABSOLUE :
//           Crée UNIQUEMENT des comptes de rôle 'user'.
//           Il est rigoureusement impossible de créer un compte 'admin' ici.
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
} from 'react-native';
import { router } from 'expo-router';

// Contexte d'authentification et internationalisation
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';

export default function InscriptionScreen() {
  const { register } = useAuth();
  const { t, langue, changerLangue } = useTranslation();

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmationMdp, setConfirmationMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  // ----------------------------------------------------------
  // VALIDATION ET INSCRIPTION
  // ----------------------------------------------------------
  async function handleInscription() {
    setErreur('');

    if (!nom.trim()) {
      setErreur(t('erreur_nom_requis'));
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErreur(t('erreur_email_invalide'));
      return;
    }

    if (motDePasse.length < 6) {
      setErreur(t('erreur_mdp_trop_court'));
      return;
    }

    if (motDePasse !== confirmationMdp) {
      setErreur(t('erreur_confirmation_mdp'));
      return;
    }

    setEnChargement(true);
    try {
      const res = await register(nom, email, motDePasse);

      if (!res.success) {
        setErreur(t(res.errorKey ?? 'erreur_connexion'));
      }
      // Si succès, NavigationGuard redirige automatiquement vers /(tabs)
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
        {/* LOGO */}
        <View style={styles.headerBox}>
          {/* SELECTEUR DE LANGUE RAPIDE (FR / AR / EN) */}
          <View style={styles.langSwitchRow}>
            <TouchableOpacity
              style={[styles.langChip, langue === 'fr' && styles.langChipActive]}
              onPress={() => changerLangue('fr')}
            >
              <Text
                style={[
                  styles.langChipText,
                  langue === 'fr' && styles.langChipTextActive,
                ]}
              >
                FR
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langChip, langue === 'ar' && styles.langChipActive]}
              onPress={() => changerLangue('ar')}
            >
              <Text
                style={[
                  styles.langChipText,
                  langue === 'ar' && styles.langChipTextActive,
                ]}
              >
                عربي
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langChip, langue === 'en' && styles.langChipActive]}
              onPress={() => changerLangue('en')}
            >
              <Text
                style={[
                  styles.langChipText,
                  langue === 'en' && styles.langChipTextActive,
                ]}
              >
                EN
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.logoIcon}>📝</Text>
          <Text style={styles.appTitle}>{t('inscription')}</Text>
          <Text style={styles.appSubtitle}>Rejoignez Masrouf pour maîtriser votre budget</Text>
        </View>

        {/* CARTE FORMULAIRE */}
        <View style={styles.card}>
          {/* Nom complet */}
          <Text style={styles.inputLabel}>{t('nom_complet')} *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Mohamed Trabelsi"
            placeholderTextColor="#94A3B8"
            value={nom}
            onChangeText={(txt) => {
              setNom(txt);
              setErreur('');
            }}
          />

          {/* E-mail */}
          <Text style={styles.inputLabel}>{t('email')} *</Text>
          <TextInput
            style={styles.input}
            placeholder="exemple@email.tn"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(txt) => {
              setEmail(txt);
              setErreur('');
            }}
          />

          {/* Mot de passe */}
          <Text style={styles.inputLabel}>{t('mot_de_passe')} (min. 6 caractères) *</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={motDePasse}
            onChangeText={(txt) => {
              setMotDePasse(txt);
              setErreur('');
            }}
          />

          {/* Confirmation mot de passe */}
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

          {/* Message d'erreur */}
          {erreur ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {erreur}</Text>
            </View>
          ) : null}

          {/* Bouton de validation */}
          <TouchableOpacity
            style={styles.registerButton}
            onPress={handleInscription}
            disabled={enChargement}
            activeOpacity={0.8}
          >
            {enChargement ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.registerButtonText}>{t('inscription')} →</Text>
            )}
          </TouchableOpacity>

          {/* Retour au Login */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.replace('/login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>{t('deja_compte')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  langSwitchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#F1F5F9',
    padding: 4,
    borderRadius: 20,
  },
  langChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  langChipActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  langChipTextActive: {
    color: '#2563EB',
    fontWeight: '800',
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 6,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1E293B',
  },
  appSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F1F5F9',
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
  registerButton: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  loginLinkText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
});

