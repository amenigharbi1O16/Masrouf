// ============================================================
// FICHIER : src/app/login.tsx
// RÔLE    : Écran de connexion — Design Figma officiel Masrouf.
//
// DESIGN (extrait du Figma) :
//   - Fond : #F5F3ED (warm off-white)
//   - Header : hamburger ☰ | "MASROUF" | icône profil
//   - Sous-titre : "VOTRE ARGENT. VOTRE ÉQUILIBRE." (caps, muted)
//   - Carte hero verte (#102B27) avec icône feuille 🍃 et tagline
//   - "Heureux de vous revoir" (titre section 18px)
//   - Champs : adresse e-mail + mot de passe (inputs blancs, label gris)
//   - Bouton primaire "Se connecter" : #102B27, full-width, 52px
//   - Bouton secondaire "Créer un compte" : #D9F0E4, full-width
//   - Sélecteur langue EN / FR / العربية en bas
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '../utils/auth';
import { useTranslation, Langue } from '../utils/i18n';
import { Theme } from '../constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const { t, langue, changerLangue } = useTranslation();

  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  async function handleConnexion() {
    setErreur('');
    if (!email.trim() || !motDePasse) {
      setErreur(t('erreur_champs_requis'));
      return;
    }
    setEnChargement(true);
    try {
      const res = await login(email.trim(), motDePasse);
      if (!res.success) {
        setErreur(t(res.errorKey ?? 'erreur_connexion'));
      }
    } catch {
      setErreur(t('erreur_connexion'));
    } finally {
      setEnChargement(false);
    }
  }

  // Remplissage rapide pour les tests de soutenance
  function remplirIdentifiants(role: 'user' | 'admin') {
    if (role === 'admin') {
      setEmail('admin@masrouf.tn');
      setMotDePasse('admin123');
    } else {
      setEmail('user@masrouf.tn');
      setMotDePasse('user123');
    }
    setErreur('');
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── EN-TÊTE APPLICATION ── */}
        <View style={styles.appHeader}>
          <Text style={styles.hamburger}>☰</Text>
          <Text style={styles.appName}>MASROUF</Text>
          <Text style={styles.profileIcon}>👤</Text>
        </View>

        {/* ── SOUS-TITRE THÉMATIQUE ── */}
        <Text style={styles.taglineSmall}>
          {t('tagline_court') ?? 'VOTRE ARGENT. VOTRE ÉQUILIBRE.'}
        </Text>

        {/* ── CARTE HERO VERTE ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLeaf}>🍃</Text>
          <Text style={styles.heroText}>
            {t('hero_login') ?? 'Dépensez en conscience.'}
          </Text>
        </View>

        {/* ── TITRE DE SECTION ── */}
        <Text style={styles.sectionTitle}>
          {t('connexion_bienvenue') ?? 'Heureux de vous revoir'}
        </Text>
        <Text style={styles.sectionSub}>
          {t('connexion_sous_titre') ?? 'Une vision plus claire de vos finances au quotidien.'}
        </Text>

        {/* ── CHAMP EMAIL ── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('adresse_email') ?? 'Adresse e-mail'}</Text>
          <TextInput
            style={styles.inputValue}
            value={email}
            onChangeText={(v) => { setEmail(v); setErreur(''); }}
            placeholder="ines.benali@email.tn"
            placeholderTextColor={Theme.colors.subtle}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
        </View>

        {/* ── CHAMP MOT DE PASSE ── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('mot_de_passe') ?? 'Mot de passe'}</Text>
          <TextInput
            style={styles.inputValue}
            value={motDePasse}
            onChangeText={(v) => { setMotDePasse(v); setErreur(''); }}
            placeholder="••••••••••"
            placeholderTextColor={Theme.colors.subtle}
            secureTextEntry
          />
        </View>

        {/* ── MESSAGE D'ERREUR ── */}
        {erreur ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{erreur}</Text>
          </View>
        ) : null}

        {/* ── BOUTON PRINCIPAL ── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleConnexion}
          disabled={enChargement}
          activeOpacity={0.85}
        >
          {enChargement ? (
            <ActivityIndicator color={Theme.colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {t('se_connecter') ?? 'Se connecter'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── BOUTON SECONDAIRE ── */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push('/inscription')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            {t('creer_compte') ?? 'Créer un compte'}
          </Text>
        </TouchableOpacity>

        {/* ── IDENTIFIANTS DE TEST RAPIDES (IDÉAL POUR LA DÉMO / SOUTENANCE) ── */}
        <View style={styles.demoRow}>
          <TouchableOpacity
            style={styles.demoChip}
            onPress={() => remplirIdentifiants('user')}
            activeOpacity={0.7}
          >
            <Text style={styles.demoChipText}>👤 user@masrouf.tn</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.demoChip}
            onPress={() => remplirIdentifiants('admin')}
            activeOpacity={0.7}
          >
            <Text style={styles.demoChipText}>👑 admin@masrouf.tn</Text>
          </TouchableOpacity>
        </View>

        {/* ── SÉLECTEUR DE LANGUE ── */}
        <View style={styles.langRow}>
          {(['en', 'fr', 'ar'] as Langue[]).map((l, i) => (
            <React.Fragment key={l}>
              {i > 0 && <Text style={styles.langSep}> / </Text>}
              <TouchableOpacity onPress={() => changerLangue(l)}>
                <Text style={[styles.langOption, langue === l && styles.langOptionActive]}>
                  {l === 'en' ? 'EN' : l === 'fr' ? 'FR' : 'العربية'}
                </Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 48,
  },

  // En-tête
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  hamburger: {
    fontSize: 22,
    color: Theme.colors.ink,
    marginRight: 12,
  },
  appName: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Theme.colors.ink,
    letterSpacing: 0.5,
  },
  profileIcon: {
    fontSize: 20,
  },

  // Sous-titre
  taglineSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.muted,
    letterSpacing: 1,
    marginBottom: 16,
    textTransform: 'uppercase',
  },

  // Carte hero
  heroCard: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
  },
  heroLeaf: {
    fontSize: 28,
    marginBottom: 12,
  },
  heroText: {
    fontSize: 26,
    fontWeight: '800',
    color: Theme.colors.white,
    lineHeight: 32,
  },

  // Section titre
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 6,
  },
  sectionSub: {
    fontSize: 14,
    color: Theme.colors.muted,
    marginBottom: 24,
    lineHeight: 20,
  },

  // Champs input (style Figma : carte blanche avec label au-dessus)
  inputCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  inputLabel: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginBottom: 4,
  },
  inputValue: {
    fontSize: 15,
    color: Theme.colors.ink,
    fontWeight: '500',
    padding: 0,
  },

  // Erreur
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    color: Theme.colors.coral,
    fontSize: 13,
    fontWeight: '600',
  },

  // Bouton primaire (plein, vert forêt)
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: Theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },

  // Bouton secondaire (menthe)
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  secondaryBtnText: {
    color: Theme.colors.forest,
    fontSize: 15,
    fontWeight: '600',
  },

  // Raccourcis test
  demoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  demoChip: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 12,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoChipText: {
    fontSize: 12,
    color: Theme.colors.muted,
    fontWeight: '600',
  },

  // Sélecteur de langue
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSep: {
    color: Theme.colors.muted,
    fontSize: 13,
  },
  langOption: {
    fontSize: 13,
    color: Theme.colors.muted,
    fontWeight: '500',
  },
  langOptionActive: {
    color: Theme.colors.ink,
    fontWeight: '800',
  },
});
