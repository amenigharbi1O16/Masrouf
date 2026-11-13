// ============================================================
// FICHIER : src/app/changer-mot-de-passe.tsx
// RÔLE    : Écran de changement obligatoire de mot de passe — Design Figma 03.
//
// MISSION DANS L'APPLICATION :
//   1. Déclenché obligatoirement lorsque la colonne `must_change_password` vaut 1
//      dans la table SQLite `user` (suite à une réinitialisation par l'administrateur).
//   2. Interdire l'accès au reste de l'application tant que l'utilisateur n'a pas
//      défini un nouveau mot de passe personnel conforme aux règles de sécurité.
//   3. Hacher le nouveau mot de passe avec PBKDF2-HMAC-SHA256 (10 000 itérations),
//      mettre à jour SQLite, remettre `must_change_password = 0`, et libérer l'accès.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 03) :
//   • 1. EN-TÊTE (appHeader) : Hamburger ☰ à gauche, titre "Sécurisez votre compte",
//        icône profil 👤 à droite.
//   • 2. LABEL DISCRET (sectionLabel) : Texte gris en majuscules :
//        "CHANGEMENT DE MOT DE PASSE REQUIS".
//   • 3. BANNIÈRE D'INFORMATION (mintBanner) : Fond vert menthe (#D9F0E4), coche verte ✓ :
//        - Titre : "Remplacez votre mot de passe temporaire".
//        - Sous-titre : "Choisissez un nouveau mot de passe pour continuer.".
//   • 4. CHAMP 1 (inputCard) : Carte blanche avec label "Mot de passe temporaire",
//        champ masqué (••••••••).
//   • 5. CHAMP 2 (inputCard) : Carte blanche avec label "Nouveau mot de passe",
//        champ masqué.
//   • 6. CHAMP 3 (inputCard) : Carte blanche avec label "Confirmer le nouveau mot de passe",
//        champ masqué.
//   • 7. LISTE D'INDICATEURS DYNAMIQUES EN TEMPS RÉEL (rulesBox) :
//        - [✓ ou ✗] Au moins 8 caractères (vert si satisfait, gris sinon).
//        - [✓ ou ✗] Contient un chiffre (vert si satisfait, gris sinon).
//        - [✓ ou ✗] Mots de passe identiques (vert si satisfait, gris sinon).
//   • 8. BANDEAU D'ERREUR CONDITIONNEL (errorBox) : Fond rouge pâle avec message en corail.
//   • 9. BOUTON PRIMAIRE (primaryBtn) : Capsule vert forêt (#102B27) de 52dp :
//        texte blanc gras "Enregistrer le mot de passe" (ou spinner animé).
//   • 10. LIEN DE SECOURS (logoutLink) : Texte gris "Se déconnecter" pour pouvoir quitter.
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

// Modules de contexte d'authentification et de traduction
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';
import { Theme } from '../constants/theme';

export default function ChangerMotDePasseScreen() {
  // Récupération des méthodes de session : validation du mot de passe et déconnexion
  const { user, changePassword, logout } = useAuth();
  const { t } = useTranslation();

  // ----------------------------------------------------------
  // VARIABLES D'ÉTAT : valeurs des champs et gestion du chargement
  // ----------------------------------------------------------
  const [ancienMdp, setAncienMdp] = useState('');     // Mot de passe temporaire saisi
  const [nouveauMdp, setNouveauMdp] = useState('');   // Nouveau mot de passe souhaité
  const [confirmMdp, setConfirmMdp] = useState('');   // Confirmation de vérification
  const [erreur, setErreur] = useState('');           // Message d'erreur éventuel
  const [enChargement, setEnChargement] = useState(false); // Indicateur de traitement PBKDF2

  // ----------------------------------------------------------
  // VALIDATION EN TEMPS RÉEL (Feedback immédiat à l'écran)
  // ----------------------------------------------------------
  // Règle 1 : longueur minimale de 8 caractères
  const regle8Chars = nouveauMdp.length >= 8;
  // Règle 2 : présence d'au moins un chiffre décimal (0 à 9)
  const regleChiffre = /\d/.test(nouveauMdp);
  // Règle 3 : correspondance exacte entre le nouveau mot de passe et sa confirmation
  const regleIdentiques = nouveauMdp.length > 0 && nouveauMdp === confirmMdp;

  // ----------------------------------------------------------
  // FONCTION : handleValider()
  // BUT : Valider les règles, hacher en PBKDF2 et persister dans SQLite.
  // AFFICHAGE :
  //   - Si règles non satisfaites : affiche le bandeau rouge d'erreur.
  //   - Pendant l'exécution : affiche le spinner blanc sur le bouton.
  //   - Si succès : NavigationGuard détecte must_change_password = 0 et
  //     redirige automatiquement vers l'accueil /(tabs) ou le dashboard /(admin).
  // ----------------------------------------------------------
  async function handleValider() {
    setErreur('');

    // Vérification des règles de complexité
    if (!regle8Chars || !regleChiffre) {
      setErreur(t('erreur_mdp_trop_court') ?? 'Le mot de passe doit comporter au moins 8 caractères dont un chiffre.');
      return;
    }

    // Vérification de la confirmation
    if (!regleIdentiques) {
      setErreur(t('erreur_confirmation_mdp') ?? 'Les deux mots de passe ne correspondent pas.');
      return;
    }

    setEnChargement(true);
    try {
      // Déclenche le hachage PBKDF2 et la mise à jour de la table SQLite 'user'
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

  // ----------------------------------------------------------
  // RENDU VISUEL DE L'ÉCRAN
  // ----------------------------------------------------------
  return (
    // KeyboardAvoidingView : remonte le formulaire lors de l'apparition du clavier virtuel
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── 1. EN-TÊTE : ☰ hamburger + Titre "Sécurisez votre compte" + Profil 👤 ── */}
        <View style={styles.appHeader}>
          <Text style={styles.hamburger}>☰</Text>
          <Text style={styles.appName}>
            {t('securiser_compte') ?? 'Sécurisez votre compte'}
          </Text>
          <Text style={styles.profileIcon}>👤</Text>
        </View>

        {/* ── 2. LABEL SUPÉRIEUR DISCRET ── */}
        <Text style={styles.sectionLabel}>
          {t('changement_requis') ?? 'CHANGEMENT DE MOT DE PASSE REQUIS'}
        </Text>

        {/* ── 3. BANNIÈRE VERTE MENTHE PÉDAGOGIQUE ── */}
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

        {/* ── 4. CHAMP : Mot de passe temporaire reçu de l'admin ── */}
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
            secureTextEntry // Masque les caractères sous forme de points noirs
          />
        </View>

        {/* ── 5. CHAMP : Nouveau mot de passe personnel ── */}
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

        {/* ── 6. CHAMP : Confirmation du mot de passe ── */}
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

        {/* ── 7. LISTE DES 3 RÈGLES DE VALIDATION VISUELLES EN TEMPS RÉEL ── */}
        <View style={styles.rulesBox}>
          {/* Règle 1 : Au moins 8 caractères */}
          <RegleItem ok={regle8Chars} label={t('regle_8_chars') ?? 'Au moins 8 caractères'} />
          {/* Règle 2 : Contient un chiffre */}
          <RegleItem ok={regleChiffre} label={t('regle_chiffre') ?? 'Contient un chiffre'} />
          {/* Règle 3 : Mots de passe identiques */}
          <RegleItem ok={regleIdentiques} label={t('regle_identiques') ?? 'Mots de passe identiques'} />
        </View>

        {/* ── 8. BANDEAU D'ERREUR (affiché uniquement en cas d'anomalie) ── */}
        {erreur ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{erreur}</Text>
          </View>
        ) : null}

        {/* ── 9. BOUTON PRIMAIRE CAPSULE : "Enregistrer le mot de passe" ── */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleValider}
          disabled={enChargement}
          activeOpacity={0.85}
        >
          {enChargement ? (
            // Affiche le spinner animé blanc pendant le calcul PBKDF2
            <ActivityIndicator color={Theme.colors.white} />
          ) : (
            <Text style={styles.primaryBtnText}>
              {t('enregistrer_mdp') ?? 'Enregistrer le mot de passe'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── 10. LIEN DE DÉCONNEXION : Permet de quitter si l'utilisateur n'a pas son MDP temporaire ── */}
        <TouchableOpacity style={styles.logoutLink} onPress={() => logout()}>
          <Text style={styles.logoutText}>{t('se_deconnecter')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ------------------------------------------------------------
// COMPOSANT AUXILIAIRE : RegleItem
// BUT : Affiche une ligne de critère avec ✓ en vert foncé si validé, ou ✗ en gris si non atteint.
// ------------------------------------------------------------
function RegleItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      {/* Icône ✓ ou ✗ avec couleur dynamique */}
      <Text style={{ color: ok ? Theme.colors.deepGreen : Theme.colors.subtle, fontSize: 13, marginRight: 6 }}>
        {ok ? '✓' : '✗'}
      </Text>
      {/* Libellé du critère */}
      <Text style={{ fontSize: 13, color: ok ? Theme.colors.ink : Theme.colors.muted }}>
        {label}
      </Text>
    </View>
  );
}

// ------------------------------------------------------------
// FEUILLE DE STYLES : Design Figma 03
// ------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Theme.colors.warm, // Fond beige chaud #F5F3ED
  },
  scroll: {
    paddingHorizontal: 24, // Marge latérale généreuse de 24dp
    paddingTop: 12,
    paddingBottom: 48,
  },

  // En-tête
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  hamburger: { fontSize: 22, color: Theme.colors.ink, marginRight: 12 },
  appName: { flex: 1, fontSize: 20, fontWeight: '800', color: Theme.colors.ink },
  profileIcon: { fontSize: 20 },

  // Label supérieur
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  // Bannière menthe
  mintBanner: {
    backgroundColor: Theme.colors.mint, // Vert menthe douce #D9F0E4
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

  // Cartes blanches des champs de saisie
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

  // Boîte des règles
  rulesBox: { marginBottom: 16, marginTop: 4 },

  // Boîte d'erreur
  errorBox: {
    backgroundColor: '#FEE2E2', // Fond rouge très pâle
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  errorText: { color: Theme.colors.coral, fontSize: 13, fontWeight: '600' },

  // Bouton capsule primaire
  primaryBtn: {
    backgroundColor: Theme.colors.forest, // Vert forêt #102B27
    borderRadius: 9999, // Forme pilule capsule
    height: 52, // Hauteur standard 52dp
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  primaryBtnText: { color: Theme.colors.white, fontSize: 15, fontWeight: '700' },

  // Lien de déconnexion
  logoutLink: { alignItems: 'center', paddingVertical: 8 },
  logoutText: { fontSize: 13, color: Theme.colors.muted, fontWeight: '500' },
});
