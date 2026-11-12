// ============================================================
// FICHIER : src/app/changer-mot-de-passe.tsx
// RÔLE    : Changement obligatoire de mot de passe — Design Figma 03.
//
// DESIGN (Figma écran 03) :
//   - Fond : #F5F3ED
//   - Header : hamburger ☰ | "Sécurisez votre compte" | icône profil
//   - Label supérieur : "CHANGEMENT DE MOT DE PASSE REQUIS"
//   - Bannière mint avec ✓ et message explicatif
//   - Champs : Mot de passe temporaire, Nouveau, Confirmer
//   - Validation inline : ✓ 8 caractères, ✓ chiffre, ✓ identiques
//   - Bouton primaire "Enregistrer le mot de passe"
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

import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';
import { Theme } from '../constants/theme';

export default function ChangerMotDePasseScreen() {
  const { user, changePassword, logout } = useAuth();
  const { t } = useTranslation();

  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmMdp, setConfirmMdp] = useState('');
  const [erreur, setErreur] = useState('');
  const [enChargement, setEnChargement] = useState(false);

  // Vérification des règles en temps réel
  const regle8Chars = nouveauMdp.length >= 8;
  const regleChiffre = /\d/.test(nouveauMdp);
  const regleIdentiques = nouveauMdp.length > 0 && nouveauMdp === confirmMdp;

  async function handleValider() {
    setErreur('');
    if (!regle8Chars || !regleChiffre) {
      setErreur(t('erreur_mdp_trop_court'));
      return;
    }
    if (!regleIdentiques) {
      setErreur(t('erreur_confirmation_mdp'));
      return;
    }
    setEnChargement(true);
    try {
      const res = await changePassword(nouveauMdp);
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
          <Text style={styles.hamburger}>☰</Text>
          <Text style={styles.appName}>
            {t('securiser_compte') ?? 'Sécurisez votre compte'}
          </Text>
          <Text style={styles.profileIcon}>👤</Text>
        </View>

        {/* ── LABEL SUPÉRIEUR ── */}
        <Text style={styles.sectionLabel}>
          {t('changement_requis') ?? 'CHANGEMENT DE MOT DE PASSE REQUIS'}
        </Text>

        {/* ── BANNIÈRE EXPLICATIVE ── */}
        <View style={styles.mintBanner}>
          <Text style={styles.mintBannerCheck}>✓</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.mintBannerTitle}>
              {t('remplacer_mdp_temporaire') ?? 'Remplacez votre mot de passe temporaire'}
            </Text>
            <Text style={styles.mintBannerSub}>
              {t('choisir_nouveau_mdp') ?? 'Choisissez un nouveau mot de passe pour continuer.'}
            </Text>
          </View>
        </View>

        {/* ── CHAMP MOT DE PASSE TEMPORAIRE ── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            {t('mot_de_passe_temporaire') ?? 'Mot de passe temporaire'}
          </Text>
          <TextInput
            style={styles.inputValue}
            value={ancienMdp}
            onChangeText={(v) => { setAncienMdp(v); setErreur(''); }}
            placeholder="••••••••••"
            placeholderTextColor={Theme.colors.subtle}
            secureTextEntry
          />
        </View>

        {/* ── CHAMP NOUVEAU MOT DE PASSE ── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            {t('nouveau_mot_de_passe') ?? 'Nouveau mot de passe'}
          </Text>
          <TextInput
            style={styles.inputValue}
            value={nouveauMdp}
            onChangeText={(v) => { setNouveauMdp(v); setErreur(''); }}
            placeholder="••••••••••"
            placeholderTextColor={Theme.colors.subtle}
            secureTextEntry
          />
        </View>

        {/* ── CHAMP CONFIRMATION ── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            {t('confirmer_nouveau_mdp') ?? 'Confirmer le nouveau mot de passe'}
          </Text>
          <TextInput
            style={styles.inputValue}
            value={confirmMdp}
            onChangeText={(v) => { setConfirmMdp(v); setErreur(''); }}
            placeholder="••••••••••"
            placeholderTextColor={Theme.colors.subtle}
            secureTextEntry
          />
        </View>

        {/* ── RÈGLES DE VALIDATION ── */}
        <View style={styles.rulesBox}>
          <RegleItem ok={regle8Chars} label={t('regle_8_chars') ?? 'Au moins 8 caractères'} />
          <RegleItem ok={regleChiffre} label={t('regle_chiffre') ?? 'Contient un chiffre'} />
          <RegleItem ok={regleIdentiques} label={t('regle_identiques') ?? 'Mots de passe identiques'} />
        </View>

        {/* ── ERREUR ── */}
        {erreur ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{erreur}</Text>
          </View>
        ) : null}

        {/* ── BOUTON PRINCIPAL ── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleValider}
          disabled={enChargement}
          activeOpacity={0.85}
        >
          {enChargement ? (
            <ActivityIndicator color={Theme.colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {t('enregistrer_mdp') ?? 'Enregistrer le mot de passe'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── DÉCONNEXION ── */}
        <TouchableOpacity style={styles.logoutLink} onPress={() => logout()}>
          <Text style={styles.logoutText}>{t('se_deconnecter')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Composant auxiliaire : ligne de règle avec ✓ ou ✗
function RegleItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      <Text style={{ color: ok ? Theme.colors.deepGreen : Theme.colors.subtle, fontSize: 13, marginRight: 6 }}>
        {ok ? '✓' : '✗'}
      </Text>
      <Text style={{ fontSize: 13, color: ok ? Theme.colors.ink : Theme.colors.muted }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Theme.colors.warm },
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 48 },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  hamburger: { fontSize: 22, color: Theme.colors.ink, marginRight: 12 },
  appName: { flex: 1, fontSize: 20, fontWeight: '800', color: Theme.colors.ink },
  profileIcon: { fontSize: 20 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 24,
  },
  mintBannerCheck: {
    color: Theme.colors.deepGreen,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  mintBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
    marginBottom: 4,
  },
  mintBannerSub: {
    fontSize: 13,
    color: Theme.colors.muted,
    lineHeight: 18,
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
  inputLabel: { fontSize: 12, color: Theme.colors.muted, marginBottom: 4 },
  inputValue: {
    fontSize: 15,
    color: Theme.colors.ink,
    fontWeight: '500',
    padding: 0,
  },
  rulesBox: { marginBottom: 16, marginTop: 4 },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  errorText: { color: Theme.colors.coral, fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 9999,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  primaryBtnText: { color: Theme.colors.white, fontSize: 15, fontWeight: '700' },
  logoutLink: { alignItems: 'center', paddingVertical: 8 },
  logoutText: { fontSize: 13, color: Theme.colors.muted, fontWeight: '500' },
});
