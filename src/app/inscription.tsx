/**
 * FICHIER : src/app/inscription.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-023
 * ÉCRAN : ECRAN-AUTH-02 (Création de Compte et Enregistrement Utilisateur)
 *
 * MISSION DU FICHIER :
 * Permettre à un nouveau membre de créer son profil local dans Masrouf :
 * 1. Propose le sélecteur de langue dès le haut de page (`عربي / FR / ANG`) avant même la création de compte.
 * 2. Valide les champs requis (nom complet, email valide, mot de passe de 8 caractères minimum et confirmation identique).
 * 3. Hache de manière cryptographique le mot de passe avec un sel sécurisé avant écriture dans SQLite.
 * 4. Insère le compte dans la table `users` avec le rôle `user`, le statut `active` et `onboarded = 0`.
 * 5. Initialise la session et déclenche l'aiguillage automatique vers le parcours de bienvenue (`/onboarding`).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il est le point d'entrée pour les nouveaux utilisateurs. Il assure un enregistrement 100% hors-ligne
 * et autonome, sans nécessiter de serveur distant ni d'accès internet.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Le sélecteur de langue trilingue (`LanguageSelector`) au sommet.
 * - Le surtitre 'MASROUF · GESTION BUDGÉTAIRE FAMILIALE' et le grand titre 'Créer un compte'.
 * - Une phrase d'information sur la sécurité locale des données privées.
 * - Une bannière d'alerte rouge si les deux mots de passe divergent ou si l'email existe déjà.
 * - Quatre champs de formulaire avec icônes :
 *   1. Nom complet (ex: Ines Ben Ali).
 *   2. Adresse email (clavier adapté).
 *   3. Mot de passe secret (avec masquage des caractères).
 *   4. Confirmation du mot de passe secret.
 * - Une ligne d'aide rappelant la règle de sécurité (8 caractères minimum).
 * - Un grand bouton vert 'Créer mon compte' avec indicateur de chargement.
 * - Un bouton secondaire clair 'Déjà un compte ? Se connecter' renvoyant vers `/login`.
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Sélecteur de langue universel interactif (FR, AR, EN)
import { LanguageSelector } from '@/components/LanguageSelector';
// Conteneur d'écran avec retour arrière vers le login
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Body, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, vert menthe, gris)
import { colors } from '@/constants/theme';
// Hook d'authentification connecté au store SQLite
import { useAuth } from '@/utils/auth';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';
// Fonctions de validation de sécurité strictes (Gmail et mot de passe fort)
import {
  getMissingPasswordRequirements,
  isValidGmail,
  passwordChecks,
} from '@/utils/security';

/**
 * MISSION DU COMPOSANT :
 * Gérer le formulaire d'inscription d'un nouvel utilisateur avec politique stricte Gmail
 * et exigences de mot de passe fort (8+ caractères, majuscule, chiffre, caractère spécial).
 *
 * RÔLE DANS L'APPLICATION :
 * Contrôle en temps réel la conformité des données saisies et déclenche l'enregistrement en base SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue d'inscription complète avec le sélecteur de langue en haut, les champs de saisie clarifiés,
 * la liste de contrôle dynamique des exigences et les boutons d'action.
 */
export default function RegistrationScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  // Méthode d'enregistrement de compte fournie par le contexte d'authentification
  const { register } = useAuth();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Type de compte choisi : Personnel par défaut ou Famille selon la sélection de l'accueil
  const [accountType, setAccountType] = useState<'personal' | 'family'>(
    params.type === 'family' ? 'family' : 'personal'
  );

  // États locaux des champs du formulaire
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // État local du message d'erreur
  const [error, setError] = useState('');
  // État local indiquant si le hachage et l'insertion SQL sont en cours
  const [busy, setBusy] = useState(false);

  // Évaluation en temps réel des règles de sécurité du mot de passe
  const c = useMemo(() => passwordChecks(password, confirm), [password, confirm]);
  // Validation immédiate de l'adresse Gmail
  const emailIsGmail = useMemo(() => isValidGmail(email), [email]);

  /**
   * MISSION DE LA FONCTION :
   * Valider rigoureusement les identifiants et enregistrer le nouvel utilisateur dans SQLite.
   */
  const submit = async () => {
    // Règle 1 : Présence obligatoire du nom complet
    if (!name.trim()) {
      setError(t('erreur_nom_requis'));
      return;
    }

    // Règle 2 : L'adresse email doit être une adresse Gmail valide (nom@gmail.com)
    if (!emailIsGmail) {
      setError(t('erreur_email_gmail_requis'));
      return;
    }

    // Règle 3 : Le mot de passe doit respecter l'intégralité des 4 critères de solidité
    if (!c.allValid) {
      const missing = getMissingPasswordRequirements(password, t);
      setError(`${t('erreur_mot_de_passe_exigences')} : ${missing.join(', ')}`);
      return;
    }

    // Règle 4 : Vérification de stricte égalité entre mot de passe et confirmation
    if (password !== confirm) {
      setError(t('regle_identiques'));
      return;
    }

    // Effacement de l'éventuelle erreur précédente et animation de chargement
    setError('');
    setBusy(true);

    // Appel du service d'inscription cryptographique SQLite avec le type de compte
    const res = await register(name, email, password, accountType);
    setBusy(false);

    // En cas d'échec retourné par SQLite (ex: adresse email déjà enregistrée)
    if (!res.ok) {
      setError(res.error ?? t('erreur'));
    } else {
      // Redirection immédiate vers l'écran de connexion avec message de succès et pré-remplissage de l'email
      router.replace({
        pathname: '/login',
        params: { registered: '1', email: email.trim().toLowerCase() },
      } as never);
    }
  };

  return (
    // Screen : conteneur avec titre 'Créer un compte' et flèche retour vers /welcome ou /login
    <Screen title={t('creer_compte')} back onBack={() => router.replace('/welcome')}>
      {/* Sélecteur de langue supérieur universel */}
      <LanguageSelector />

      {/* Surtitre institutionnel en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('slogan').toUpperCase()}
      </Eyebrow>

      {/* Titre principal de la page */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('creer_compte')}
      </SectionTitle>

      {/* Sélecteur de Type de Compte Interactif */}
      <View style={styles.typeSelectorContainer}>
        <TouchableOpacity
          style={[
            styles.typeOption,
            accountType === 'personal' && styles.typeOptionActivePersonal,
          ]}
          onPress={() => setAccountType('personal')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="person"
            size={18}
            color={accountType === 'personal' ? colors.forest : colors.gray}
          />
          <Text
            style={[
              styles.typeOptionText,
              accountType === 'personal' && styles.typeOptionTextActive,
            ]}
          >
            {t('compte_personnel_titre')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeOption,
            accountType === 'family' && styles.typeOptionActiveFamily,
          ]}
          onPress={() => setAccountType('family')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="people"
            size={18}
            color={accountType === 'family' ? '#1565C0' : colors.gray}
          />
          <Text
            style={[
              styles.typeOptionText,
              accountType === 'family' && [styles.typeOptionTextActive, { color: '#1565C0' }],
            ]}
          >
            {t('compte_famille_titre')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bandeau d'information sur le mode choisi */}
      <View
        style={[
          styles.accountNotice,
          accountType === 'family'
            ? { backgroundColor: '#E3F2FD', borderColor: '#90CAF9' }
            : { backgroundColor: '#EAF7F0', borderColor: '#A5D6A7' },
        ]}
      >
        <Ionicons
          name={accountType === 'family' ? 'information-circle' : 'person-circle'}
          size={18}
          color={accountType === 'family' ? '#1565C0' : colors.forest}
        />
        <Text
          style={[
            styles.accountNoticeText,
            { color: accountType === 'family' ? '#0D47A1' : colors.forest },
          ]}
        >
          {accountType === 'family'
            ? 'Compte Parent : Accès complet à l’Espace Personnel et à l’Espace Familial'
            : 'Compte Personnel : Gestion individuelle autonome de vos achats et budgets'}
        </Text>
      </View>

      {/* Explication rassurante sur le stockage 100% local sur le smartphone */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('stockage_local_info')}
      </Body>

      {/* Bannière d'alerte rouge affichée en cas d'erreur de validation ou doublon d'email */}
      {error ? (
        <AlertBanner tone="danger" title={t('erreur')} detail={error} />
      ) : null}

      {/* Champ 1 : Nom et prénom de l'utilisateur avec placeholder clair */}
      <Input
        label={t('nom_complet')}
        value={name}
        onChangeText={(val) => {
          setName(val);
          setError('');
        }}
        autoCapitalize="words"
        placeholder={t('placeholder_nom')}
      />

      {/* Champ 2 : Adresse email de connexion avec format Gmail strict */}
      <Input
        label={t('email')}
        value={email}
        onChangeText={(val) => {
          setEmail(val);
          setError('');
        }}
        keyboardType="email-address"
        placeholder="name@gmail.com"
        hint={
          email.length > 0 && !emailIsGmail
            ? t('erreur_email_gmail_requis')
            : undefined
        }
      />

      {/* Champ 3 : Mot de passe secret avec explication claire du format requis */}
      <Input
        label={t('mot_de_passe')}
        value={password}
        onChangeText={(val) => {
          setPassword(val);
          setError('');
        }}
        secure
        placeholder={t('placeholder_mdp')}
      />

      {/* Champ 4 : Confirmation du mot de passe secret */}
      <Input
        label={t('confirmer_mot_de_passe')}
        value={confirm}
        onChangeText={(val) => {
          setConfirm(val);
          setError('');
        }}
        secure
        placeholder={t('placeholder_confirmer_mdp')}
      />

      {/* Bouton vert forêt : soumission du formulaire et création du compte */}
      <Button label={t('creer_compte')} onPress={submit} loading={busy} />

      {/* Bouton secondaire clair : lien vers la page de connexion pour les utilisateurs déjà inscrits */}
      <Button
        label={t('se_connecter')}
        variant="secondary"
        onPress={() => router.replace('/login')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  typeSelectorContainer: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  typeOptionActivePersonal: {
    borderColor: colors.forest,
    backgroundColor: '#EAF7F0',
  },
  typeOptionActiveFamily: {
    borderColor: '#1565C0',
    backgroundColor: '#E3F2FD',
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray,
  },
  typeOptionTextActive: {
    color: colors.forest,
    fontWeight: '700',
  },
  accountNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  accountNoticeText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
});
