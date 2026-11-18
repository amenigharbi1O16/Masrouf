/**
 * FICHIER : src/app/(admin)/reglages.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-007
 * ÉCRAN : ECRAN-ADM-07 (Paramètres de l'Application Administrateur)
 *
 * MISSION DU FICHIER :
 * Fournir le centre de contrôle des paramètres système de l'espace administrateur :
 * - Autoriser ou verrouiller les nouvelles inscriptions sur l'appareil.
 * - Basculer la langue d'affichage globale (Français, Arabe, Anglais).
 * - Accéder au formulaire de modification du mot de passe de l'administrateur.
 * - Clôturer la session d'administration en toute sécurité.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il donne la maîtrise complète du cycle de vie de l'application. Par exemple, si l'administrateur
 * prépare une démonstration ou souhaite figer la base de données, il peut fermer les inscriptions
 * en un clic sans toucher au code source.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand titre 'Réglages (Admin)' avec le surtitre 'PARAMÈTRES DE L'APPLICATION'.
 * - Une carte blanche avec un interrupteur à bascule vert (Switch) permettant d'activer/bloquer les inscriptions.
 * - Le sélecteur de langue interactif trilingue.
 * - Une ligne discrète affichant l'email de l'administrateur en session et la mention 'Devise : Dinar tunisien (3 décimales)'.
 * - Un bouton secondaire clair 'Changer mon mot de passe'.
 * - Un bouton d'action rouge 'Se déconnecter' qui ramène immédiatement à l'écran de login.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { Switch, Text, View } from 'react-native';
// Sélecteur de langue universel réutilisable (FR, AR, EN)
import { LanguageSelector } from '@/components/LanguageSelector';
// Composant conteneur d'écran avec marges physiques et barre de statut
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Body, Button, Eyebrow } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, bordures et arrondis)
import { colors, radius } from '@/constants/theme';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';
// Gestionnaire d'ouverture du guide d'utilisation PDF
import { ouvrirManuelUtilisation } from '@/utils/pdf';

/**
 * MISSION DU COMPOSANT :
 * Afficher et gérer l'écran de réglages administrateur.
 *
 * RÔLE DANS L'APPLICATION :
 * Connecte les bascules de sécurité et les préférences de session avec SQLite et le stockage local.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'écran complet avec la carte de switch d'inscriptions, les boutons de langue, et les boutons de mot de passe/déconnexion.
 */
export default function AdminSettingsScreen() {
  // Hook de navigation Expo Router pour changer d'écran
  const router = useRouter();
  // Extraction des données de configuration, du profil connecté et des actions
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture (LTR/RTL)
  const { t, isRTL, langue } = useTranslation();

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('reglages_admin')}>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('parametres_application')}
      </Eyebrow>

      {/* Carte blanche de contrôle du verrouillage des inscriptions */}
      <View
        style={{
          // Inverse la disposition en ligne si la langue active est l'arabe
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12,
          backgroundColor: colors.white,
          borderRadius: radius.card,
          padding: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          {/* Titre du paramètre avec taille de police légèrement augmentée (16.5) pour lisibilité optimale */}
          <Text
            style={{
              fontSize: 16.5,
              fontWeight: '600',
              color: colors.forest,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {t('autoriser_nouvelles_inscriptions')}
          </Text>
          {/* Texte d'aide avec taille de police légèrement augmentée (13.5) expliquant l'impact du verrouillage */}
          <Text
            style={{
              fontSize: 13.5,
              color: colors.muted,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {t('inscriptions_desactivees_detail')}
          </Text>
        </View>

        {/* Interrupteur Switch vert : met à jour instantanément la table 'app_settings' dans SQLite */}
        <Switch
          value={db.settings.allowRegistration}
          onValueChange={(val) =>
            actions.setSettings({ ...db.settings, allowRegistration: val })
          }
          trackColor={{ true: colors.green, false: colors.border }}
        />
      </View>

      {/* Sélecteur de langue trilingue avec boutons interactifs */}
      <LanguageSelector />

      {/* Informations contextuelles sur l'administrateur connecté et le format monétaire */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {me?.email ? `${me.email} · ` : ''}
        {t('devise')} : {t('devise_locale')} (3 décimales)
      </Body>

      {/* Bouton secondaire clair : ouvre l'écran de modification du mot de passe */}
      <Button
        label={t('changer_mon_mot_de_passe')}
        variant="secondary"
        onPress={() => router.push('/changer-mot-de-passe')}
      />

      {/* Bouton secondaire clair : ouvre le guide d'utilisation officiel PDF */}
      <Button
        label={t('manuel_utilisation')}
        variant="secondary"
        onPress={() => ouvrirManuelUtilisation(langue as any)}
      />

      {/* Bouton rouge danger : efface la session en mémoire et renvoie vers /login */}
      <Button
        label={t('se_deconnecter')}
        variant="danger"
        onPress={actions.logout}
      />
    </Screen>
  );
}
