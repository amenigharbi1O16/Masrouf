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

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
// Sélecteur de langue universel interactif (FR, AR, EN)
import { LanguageSelector } from '@/components/LanguageSelector';
// Conteneur d'écran avec retour arrière vers le login
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Body, Button, Eyebrow, Hint, Input, SectionTitle } from '@/components/ui';
// Hook d'authentification connecté au store SQLite
import { useAuth } from '@/utils/auth';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer le formulaire d'inscription d'un nouvel utilisateur.
 *
 * RÔLE DANS L'APPLICATION :
 * Contrôle la conformité des données saisies et déclenche l'enregistrement en base SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue d'inscription complète avec le sélecteur de langue en haut, les champs de saisie et les boutons.
 */
export default function RegistrationScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Méthode d'enregistrement de compte fournie par le contexte d'authentification
  const { register } = useAuth();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // États locaux des champs du formulaire
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  // État local du message d'erreur
  const [error, setError] = useState('');
  // État local indiquant si le hachage et l'insertion SQL sont en cours
  const [busy, setBusy] = useState(false);

  /**
   * MISSION DE LA FONCTION :
   * Valider les mots de passe et enregistrer le nouvel utilisateur dans SQLite.
   *
   * RÔLE DANS L'APPLICATION :
   * Vérifie la concordance des deux saisies de mot de passe, puis appelle `register(name, email, password)`
   * qui hache le mot de passe et insère la ligne dans la table `users`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Si les mots de passe ne concordent pas : affiche une alerte rouge immédiate.
   * Si succès : déclenche automatiquement la redirection vers `/onboarding` sans écran blanc.
   */
  const submit = async () => {
    // Règle 1 : Vérification de stricte égalité entre mot de passe et confirmation
    if (password !== confirm) {
      setError(t('regle_identiques'));
      return;
    }

    // Début de l'animation de chargement sur le bouton
    setBusy(true);
    // Appel du service d'inscription cryptographique
    const res = await register(name, email, password);
    setBusy(false);

    // En cas d'échec retourné par SQLite (ex: adresse email déjà enregistrée)
    if (!res.ok) {
      setError(res.error ?? t('erreur'));
    }
    // En cas de succès : le gardien de navigation Gate redirige automatiquement vers /onboarding
  };

  return (
    // Screen : conteneur avec titre 'Créer un compte' et flèche retour vers /login
    <Screen title={t('creer_compte')} back onBack={() => router.replace('/login')}>
      {/* Sélecteur de langue supérieur universel : permet de choisir l'arabe, le français ou l'anglais dès le départ */}
      <LanguageSelector />

      {/* Surtitre institutionnel en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('slogan').toUpperCase()}
      </Eyebrow>

      {/* Titre principal de la page */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('creer_compte')}
      </SectionTitle>

      {/* Explication rassurante sur le stockage 100% local sur le smartphone */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('stockage_local_info')}
      </Body>

      {/* Bannière d'alerte rouge affichée en cas d'erreur de validation ou doublon d'email */}
      {error ? (
        <AlertBanner tone="danger" title={t('erreur')} detail={error} />
      ) : null}

      {/* Champ 1 : Nom et prénom de l'utilisateur */}
      <Input
        label={t('nom_complet')}
        value={name}
        onChangeText={(val) => {
          setName(val);
          setError('');
        }}
        autoCapitalize="words"
        placeholder="Ines Ben Ali"
      />

      {/* Champ 2 : Adresse email de connexion */}
      <Input
        label={t('email')}
        value={email}
        onChangeText={(val) => {
          setEmail(val);
          setError('');
        }}
        keyboardType="email-address"
        placeholder="vous@email.tn"
      />

      {/* Champ 3 : Mot de passe secret */}
      <Input
        label={t('mot_de_passe')}
        value={password}
        onChangeText={(val) => {
          setPassword(val);
          setError('');
        }}
        secure
        placeholder="••••••••"
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
        placeholder="••••••••"
      />

      {/* Indication d'aide sur la longueur minimale du mot de passe */}
      <Hint style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('regle_8_chars')}
      </Hint>

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
