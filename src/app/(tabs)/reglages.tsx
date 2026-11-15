/**
 * FICHIER : src/app/(tabs)/reglages.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-015
 * ÉCRAN : ECRAN-TAB-05 (Réglages et Préférences Utilisateur)
 *
 * RÔLE DU COMPOSANT :
 * Permet à l'utilisateur de gérer son identité et ses préférences personnelles :
 * - Modification du nom d'affichage (`actions.updateProfile`)
 * - Consultation de l'adresse e-mail associée
 * - Liens d'accès direct vers le budget en cours, la gestion des catégories, les points et le changement de mot de passe
 * - Sélecteur de langue d'interface trilingue (Français, Arabe, Anglais)
 * - Déconnexion sécurisée de la session (`actions.logout`)
 *
 * ACTIONS ASSOCIÉES :
 * - Mise à jour du profil dans SQLite
 * - ACTION-USER-15 : Déconnexion de la session
 * - Navigation vers les sous-modules
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Formulaire de profil avec bouton d'enregistrement secondaire, liste de rangées d'options
 * blanches arrondies avec icônes vertes et chevrons dynamiques, sélecteur de langue en pastilles
 * et bouton rouge de déconnexion.
 */

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LanguageSelector } from '@/components/LanguageSelector';
import { Screen } from '@/components/Screen';
import { AlertBanner, Body, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DE LA FONCTION : Row
 *   Composant atomique de ligne d'option de réglage avec icône vectorielle à gauche,
 *   titre et sous-titre au centre, et chevron directionnel à droite (adapté au mode RTL/LTR).
 *
 * RÔLE DANS L'APPLICATION :
 *   Sert de brique de navigation interne vers les sous-écrans de configuration.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Boîte blanche de 60px min avec contour arrondi fin, icône verte et texte vert forêt.
 */
function Row({
  icon,
  label,
  detail,
  onPress,
  isRTL,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
  isRTL?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: isRTL ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: colors.white,
        borderRadius: radius.card,
        padding: 16,
        minHeight: 60,
      }}
    >
      <Ionicons name={icon} size={22} color={colors.green} />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: '600',
            color: colors.forest,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {label}
        </Text>
        {detail ? (
          <Text
            style={{
              fontSize: 12,
              color: colors.muted,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {detail}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={colors.muted}
      />
    </Pressable>
  );
}

/**
 * MISSION DE LA FONCTION : SettingsScreen
 *   Composant principal de l'écran des Réglages (`/(tabs)/reglages`).
 *   Gère l'affichage du profil de l'utilisateur, la mise à jour de son nom,
 *   l'accès aux sous-écrans de gestion et la déconnexion sécurisée.
 *
 * RÔLE DANS L'APPLICATION :
 *   Centralise toutes les préférences du compte utilisateur connecté.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - Champ de modification du nom avec bouton vert "Enregistrer".
 *   - Lignes de navigation cliquables vers le budget, les catégories, les points et le mot de passe.
 *   - Sélecteur de langue trilingue sous forme de pastilles (Français / العربية / English).
 *   - Bouton d'action rouge de déconnexion "Se déconnecter".
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { me, actions } = useStore();
  const { t, isRTL } = useTranslation();
  const [name, setName] = useState(me?.name ?? '');
  const [saved, setSaved] = useState(false);

  if (!me) return null;

  return (
    <Screen title={t('reglages')}>
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('compte_personnel').toUpperCase()}
      </Eyebrow>
      <Input
        label={t('nom_complet')}
        value={name}
        onChangeText={(textVal) => {
          setName(textVal);
          setSaved(false);
        }}
        autoCapitalize="words"
      />
      <Input label={t('email')} value={me.email} editable={false} />
      {saved ? <AlertBanner tone="success" title={t('profil_enregistre')} /> : null}
      <Button
        label={t('enregistrer')}
        variant="secondary"
        disabled={!name.trim() || name.trim() === me.name}
        onPress={() => {
          actions.updateProfile(name);
          setSaved(true);
        }}
      />

      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('preferences')}
      </SectionTitle>

      <Row
        icon="wallet-outline"
        label={t('budget_du_mois')}
        detail={t('modifier_budget_detail')}
        onPress={() =>
          router.push({ pathname: '/budget-mois', params: { mode: 'edit' } } as never)
        }
        isRTL={isRTL}
      />
      <Row
        icon="pricetags-outline"
        label={t('gerer_categories')}
        detail={t('gerer_categories_detail')}
        onPress={() => router.push('/gerer-categories')}
        isRTL={isRTL}
      />
      <Row
        icon="trophy-outline"
        label={t('points')}
        detail={t('points_succes_detail')}
        onPress={() => router.push('/points')}
        isRTL={isRTL}
      />
      <Row
        icon="lock-closed-outline"
        label={t('changer_mot_de_passe')}
        onPress={() => router.push('/changer-mot-de-passe')}
        isRTL={isRTL}
      />

      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('langue')}
      </SectionTitle>
      <LanguageSelector />

      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('stockage_local_info')}
      </Body>
      <Button label={t('se_deconnecter')} variant="danger" onPress={actions.logout} />
    </Screen>
  );
}
