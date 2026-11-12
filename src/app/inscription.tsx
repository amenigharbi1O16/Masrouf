// ============================================================
// FICHIER : src/app/inscription.tsx
// RÔLE    : Écran de création de compte — Design Figma officiel.
//
// DESIGN (Figma écran 02) :
//   - Fond : #F5F3ED
//   - Header : hamburger ☰ | "Créer un compte" | icône profil
//   - Sous-titre : "Un peu de clarté, chaque jour."
//   - Titre : "Commencez avec MASROUF"
//   - Champs : Nom complet, Adresse e-mail, Mot de passe, Confirmer
//   - Validation : "Utilisez au moins 8 caractères, dont un chiffre."
//   - Bouton primaire "Créer un compte" : #102B27
//   - Bouton secondaire "Déjà inscrit ? Se connecter" : #D9F0E4
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

export default function InscriptionScreen() {
  const { register } = useAuth();
  const { t, langue, changerLangue } = useTranslation();

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  async function handleInscription() {
    setErreur('');
    if (!nom.trim() || !email.trim() || !motDePasse || !confirmation) {
      setErreur(t('erreur_champs_requis'));
      return;
    }
    if (motDePasse !== confirmation) {
      setErreur(t('erreur_confirmation_mdp'));
      return;
    }
    if (motDePasse.length < 8 || !/\d/.test(motDePasse)) {
      setErreur(t('erreur_mdp_trop_court'));
      return;
    }
    setEnChargement(true);
    try {
      const res = await register(nom.trim(), email.trim(), motDePasse);
      if (!res.success) {
        setErreur(t(res.errorKey ?? 'erreur_connexion'));
      }
    } catch {
      setErreur(t('erreur_connexion'));
    } finally {
      setEnChargement(false);
    }
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
        {/* ── EN-TÊTE ── */}
        <View style={styles.appHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.hamburger}>←</Text>
          </TouchableOpacity>
          <Text style={styles.appName}>{t('creer_compte') ?? 'Créer un compte'}</Text>
          <Text style={styles.profileIcon}>👤</Text>
        </View>

        {/* ── SOUS-TITRE ET TITRE ── */}
        <Text style={styles.taglineSub}>
          {t('inscription_sous_titre') ?? 'Un peu de clarté, chaque jour.'}
        </Text>
        <Text style={styles.mainTitle}>
          {t('inscription_titre') ?? 'Commencez avec MASROUF'}
        </Text>

        {/* ── CHAMP NOM ── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('nom_complet') ?? 'Nom complet'}</Text>
          <TextInput
            style={styles.inputValue}
            value={nom}
            onChangeText={(v) => { setNom(v); setErreur(''); }}
            placeholder="Ines Ben Ali"
            placeholderTextColor={Theme.colors.subtle}
            autoCapitalize="words"
          />
        </View>

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

        {/* ── CHAMP CONFIRMATION ── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            {t('confirmer_mot_de_passe') ?? 'Confirmer le mot de passe'}
          </Text>
          <TextInput
            style={styles.inputValue}
            value={confirmation}
            onChangeText={(v) => { setConfirmation(v); setErreur(''); }}
            placeholder="••••••••••"
            placeholderTextColor={Theme.colors.subtle}
            secureTextEntry
          />
        </View>

        {/* ── RÈGLE DE MOT DE PASSE ── */}
        <Text style={styles.ruleText}>
          {t('regle_mot_de_passe') ?? 'Utilisez au moins 8 caractères, dont un chiffre.'}
        </Text>

        {/* ── ERREUR ── */}
        {erreur ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{erreur}</Text>
          </View>
        ) : null}

        {/* ── BOUTON PRIMAIRE ── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleInscription}
          disabled={enChargement}
          activeOpacity={0.85}
        >
          {enChargement ? (
            <ActivityIndicator color={Theme.colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {t('creer_compte') ?? 'Créer un compte'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── BOUTON SECONDAIRE ── */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            {t('deja_inscrit') ?? 'Déjà inscrit ? Se connecter'}
          </Text>
        </TouchableOpacity>

        {/* ── SÉLECTEUR LANGUE ── */}
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
  },
  profileIcon: { fontSize: 20 },
  taglineSub: {
    fontSize: 14,
    color: Theme.colors.muted,
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 24,
  },
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
  ruleText: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginBottom: 16,
    marginTop: 4,
  },
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
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  secondaryBtnText: {
    color: Theme.colors.forest,
    fontSize: 15,
    fontWeight: '600',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  langSep: { color: Theme.colors.muted, fontSize: 13 },
  langOption: { fontSize: 13, color: Theme.colors.muted, fontWeight: '500' },
  langOptionActive: { color: Theme.colors.ink, fontWeight: '800' },
});
