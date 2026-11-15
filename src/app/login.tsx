/**
 * FICHIER : src/app/login.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-022
 * ÉCRAN : ECRAN-AUTH-01 (Écran de Connexion à Masrouf)
 *
 * MISSION DU FICHIER :
 * Permettre aux utilisateurs enregistrés et aux administrateurs de s'authentifier de façon sécurisée :
 * 1. Propose le sélecteur de langue interactif trilingue (`عربي / FR / ANG`) au sommet.
 * 2. Vérifie la présence des identifiants (email et mot de passe).
 * 3. Hache le mot de passe saisi avec le sel stocké et compare au hachage de la table `users` dans SQLite.
 * 4. Contrôle le statut du compte : rejette la connexion si le compte a été suspendu par l'administrateur.
 * 5. Si les identifiants sont valides : initialise la session locale et déclenche la redirection automatique
 *    (vers `/admin` pour l'administrateur, `/onboarding` pour un nouveau compte, ou `/(tabs)` pour l'utilisateur normal).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il est la porte d'entrée sécurisée de Masrouf. Il garantit la protection stricte des données personnelles
 * sans faire appel à un serveur cloud, assurant un fonctionnement 100% hors-ligne.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Le sélecteur de langue trilingue (`LanguageSelector`) au sommet.
 * - Le surtitre 'MASROUF · GESTION DU BUDGET FAMILIAL'.
 * - Un grand cartouche hero banner vert forêt (#102B27) de 176px avec une feuille vert menthe (#D9F0E4) et un mot d'accueil.
 * - Le titre de section 'Se connecter' avec une phrase explicative.
 * - Une bannière d'alerte rouge en cas d'identifiants erronés ou de compte suspendu.
 * - Le champ 'Email' (clavier email optimisé) et le champ 'Mot de passe' (avec masquage des caractères).
 * - Le grand bouton vert 'Se connecter' avec indicateur de chargement (spinner).
 * - Le bouton secondaire clair 'Créer un compte' redirigeant vers `/inscription`.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
// Sélecteur de langue interactif supérieur
import { LanguageSelector } from '@/components/LanguageSelector';
// Conteneur d'écran sans barre supérieure native (mode plain)
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import {
  AlertBanner,
  Body,
  Button,
  Eyebrow,
  Input,
  SectionTitle,
} from '@/components/ui';
// Constantes de thème (couleurs vert forêt, vert menthe, blanc)
import { colors } from '@/constants/theme';
// Hook d'authentification sécurisée connecté à SQLite
import { useAuth } from '@/utils/auth';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'état et l'affichage du formulaire de connexion utilisateur.
 *
 * RÔLE DANS L'APPLICATION :
 * Valide les saisies, déclenche la vérification du hachage de mot de passe dans SQLite et initialise la session.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec le hero banner vert, les champs de connexion et les boutons d'action.
 */
export default function LoginScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Méthode de connexion fournie par le contexte d'authentification
  const { login } = useAuth();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // États locaux des champs de saisie
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // État local du message d'erreur
  const [error, setError] = useState('');
  // État local indiquant si la vérification cryptographique est en cours
  const [busy, setBusy] = useState(false);

  /**
   * MISSION DE LA FONCTION :
   * Authentifier l'utilisateur auprès du moteur de persistance SQLite.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `login(email, password)` qui exécute la requête `SELECT * FROM users WHERE email = ?`,
   * compare les empreintes cryptographiques et vérifie que `status === 'active'`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * En cas d'erreur : affiche la bannière rouge (ex: 'Email ou mot de passe incorrect' ou 'Compte suspendu').
   * En cas de succès : active la session et laisse le gardien `Gate` rediriger automatiquement vers le bon espace.
   */
  const submit = async () => {
    // Vérification que les champs ne sont pas vides
    if (!email.trim() || !password) {
      setError(`${t('erreur')} : ${t('connexion_sous_titre')}`);
      return;
    }

    // Début de l'animation de chargement sur le bouton
    setBusy(true);
    // Exécution de l'authentification dans SQLite
    const res = await login(email, password);
    setBusy(false);

    // Si les identifiants sont invalides ou si le compte est suspendu
    if (!res.ok) {
      setError(res.error ?? t('erreur'));
    }
    // En cas de succès : le gardien de navigation Gate dans _layout.tsx
    // redirige automatiquement l'utilisateur selon son rôle (admin ou utilisateur).
  };

  return (
    // Screen : conteneur plein écran sans en-tête parasite
    <Screen title="MASROUF" plain>
      {/* Sélecteur de langue supérieur : permet de basculer en arabe RTL, français ou anglais à tout moment */}
      <LanguageSelector />

      {/* Surtitre avec slogan de l'application en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('slogan').toUpperCase()}
      </Eyebrow>

      {/* Grand cartouche hero banner vert forêt avec icône de feuille menthe */}
      <View
        style={{
          backgroundColor: colors.forest,
          borderRadius: 24,
          height: 176,
          padding: 24,
          justifyContent: 'space-between',
        }}
      >
        {/* Icône de feuille vert menthe lumineuse */}
        <Ionicons name="leaf" size={42} color={colors.mint} />
        {/* Message d'accueil en lettres blanches */}
        <Text
          style={{
            color: colors.white,
            fontSize: 27,
            lineHeight: 39,
            fontWeight: '600',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {t('connexion_bienvenue')}
        </Text>
      </View>

      {/* Titre de section principal */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('se_connecter')}
      </SectionTitle>

      {/* Sous-titre descriptif */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('connexion_sous_titre')}
      </Body>

      {/* Bannière d'alerte rouge affichée en cas d'erreur d'identifiants */}
      {error ? (
        <AlertBanner tone="danger" title={t('erreur')} detail={error} />
      ) : null}

      {/* Champ de saisie pour l'adresse email */}
      <Input
        label={t('email')}
        value={email}
        onChangeText={(tVal) => {
          setEmail(tVal);
          setError('');
        }}
        keyboardType="email-address"
        placeholder="vous@email.tn"
      />

      {/* Champ de saisie pour le mot de passe secret */}
      <Input
        label={t('mot_de_passe')}
        value={password}
        onChangeText={(tVal) => {
          setPassword(tVal);
          setError('');
        }}
        secure
        placeholder="••••••••"
      />

      {/* Bouton vert forêt : déclenche la tentative de connexion */}
      <Button label={t('se_connecter')} onPress={submit} loading={busy} />

      {/* Bouton secondaire clair : permet aux nouveaux membres d'ouvrir la page d'inscription */}
      <Button
        label={t('creer_compte')}
        variant="secondary"
        onPress={() => router.push('/inscription')}
      />
    </Screen>
  );
}
