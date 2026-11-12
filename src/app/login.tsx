// ============================================================
// FICHIER : src/app/login.tsx
// RÔLE    : Écran de connexion (Login) de l'application Masrouf.
//           Valide les identifiants avec hachage SHA-256 et sel,
//           gère les messages d'erreur détaillés (compte désactivé,
//           e-mail invalide, mot de passe faux) et dirige vers la bonne interface.
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

// Contexte d'authentification
import { useAuth } from '../utils/auth';

// Internationalisation
import { useTranslation } from '../utils/i18n';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t, langue, changerLangue } = useTranslation();

  const [email, setEmail] = useState('user@masrouf.tn');
  const [motDePasse, setMotDePasse] = useState('user123');
  const [erreur, setErreur] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  // ----------------------------------------------------------
  // FONCTION : handleConnexion
  // ----------------------------------------------------------
  async function handleConnexion() {
    setErreur('');

    if (!email.trim() || !motDePasse.trim()) {
      setErreur(t('erreur_champ_requis'));
      return;
    }

    setEnChargement(true);
    try {
      const res = await login(email, motDePasse);

      if (!res.success) {
        setErreur(t(res.errorKey ?? 'erreur_connexion'));
      }
      // Si la connexion réussit, le composant NavigationGuard dans _layout.tsx
      // redirige automatiquement vers /(tabs) ou /(admin) ou /changer-mot-de-passe
    } catch {
      setErreur(t('erreur_connexion'));
    } finally {
      setEnChargement(false);
    }
  }

  // ----------------------------------------------------------
  // Raccourci démo soutenance
  // ----------------------------------------------------------
  function remplirIdentifiantsTest(role: 'admin' | 'user') {
    if (role === 'admin') {
      setEmail('admin@masrouf.tn');
      setMotDePasse('admin123');
    } else {
      setEmail('user@masrouf.tn');
      setMotDePasse('user123');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* LOGO & TITRE */}
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

          <Text style={styles.logoIcon}>💰</Text>
          <Text style={styles.appTitle}>Masrouf • مَصْرُوف</Text>
          <Text style={styles.appSubtitle}>{t('slogan')}</Text>
        </View>

        {/* CARTE FORMULAIRE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('connexion')}</Text>

          {/* Champ Email */}
          <Text style={styles.inputLabel}>{t('email')}</Text>
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

          {/* Champ Mot de passe */}
          <Text style={styles.inputLabel}>{t('mot_de_passe')}</Text>
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

          {/* Message d'erreur */}
          {erreur ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {erreur}</Text>
            </View>
          ) : null}

          {/* Bouton Se connecter */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleConnexion}
            disabled={enChargement}
            activeOpacity={0.8}
          >
            {enChargement ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>{t('connexion')} →</Text>
            )}
          </TouchableOpacity>

          {/* Lien vers Inscription */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => router.push('/inscription' as any)}
            activeOpacity={0.7}
          >
            <Text style={styles.registerLinkText}>{t('pas_de_compte')}</Text>
          </TouchableOpacity>
        </View>

        {/* RACCOURCIS DE DÉMONSTRATION POUR LE PROFESSEUR */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>💡 Raccourcis de test pour l'évaluation :</Text>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnUser]}
              onPress={() => remplirIdentifiantsTest('user')}
            >
              <Text style={styles.demoBtnUserText}>👤 Rôle Utilisateur</Text>
              <Text style={styles.demoBtnSub}>user@masrouf.tn</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnAdmin]}
              onPress={() => remplirIdentifiantsTest('admin')}
            >
              <Text style={styles.demoBtnAdminText}>👑 Rôle Administrateur</Text>
              <Text style={styles.demoBtnSub}>admin@masrouf.tn</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 24,
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
    fontSize: 52,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1E293B',
  },
  appSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
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
  cardTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 14,
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
  loginButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  registerLink: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  registerLinkText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  demoCard: {
    marginTop: 20,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoBtnUser: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  demoBtnUserText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 11,
  },
  demoBtnAdmin: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  demoBtnAdminText: {
    color: '#7E22CE',
    fontWeight: '700',
    fontSize: 11,
  },
  demoBtnSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 2,
  },
});
