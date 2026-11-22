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
import { getCategoryIcon } from '@/utils/categoryIcons';
import { ouvrirManuelUtilisation } from '@/utils/pdf';

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
  // Outil de routage déclaratif Expo Router pour les transitions d'écran
  const router = useRouter();
  // Données de l'utilisateur connecté, catalogue de base et actions
  const { db, me, actions } = useStore();
  // Hook de traduction multilingue, détection RTL et langue courante
  const { t, isRTL, langue, traduireCategorie } = useTranslation();
  // État local du champ nom complet synchronisé avec le profil utilisateur
  const [name, setName] = useState(me?.name ?? '');
  // État local indiquant si la confirmation de sauvegarde doit être affichée
  const [saved, setSaved] = useState(false);

  if (!me) return null;

  // Catégories suivies par l'utilisateur
  const userCategories = (me.categoryIds ?? [])
    .map((cid) => db.categories.find((c) => c.id === cid))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <Screen title={t('reglages')}>
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('compte_personnel').toUpperCase()}
      </Eyebrow>
      {/* Champ de saisie pour modifier le nom complet de l'utilisateur */}
      <Input
        label={t('nom_complet')}
        value={name}
        onChangeText={(textVal) => {
          setName(textVal);
          setSaved(false);
        }}
        autoCapitalize="words"
      />
      {/* Champ d'affichage en lecture seule de l'adresse e-mail de connexion */}
      <Input label={t('email')} value={me.email} editable={false} />
      {/* Bannière de confirmation verte affichée dès que les modifications sont enregistrées */}
      {saved ? <AlertBanner tone="success" title={t('profil_enregistre')} /> : null}
      {/* Bouton d'action pour enregistrer le nouveau nom (actif uniquement si le nom a changé) */}
      <Button
        label={t('enregistrer')}
        variant="secondary"
        disabled={!name.trim() || name.trim() === me.name}
        onPress={() => {
          actions.updateProfile(name);
          setSaved(true);
        }}
      />

      {/* Section : Vos Catégories Suivies dans le Profil */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('vos_categories')}
      </SectionTitle>

      <View
        style={{
          backgroundColor: colors.white,
          borderRadius: radius.card,
          padding: 16,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Ionicons name="pricetags-outline" size={20} color={colors.forest} />
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.forest }}>
              {isRTL ? 'الفئات المحددة' : 'Catégories sélectionnées'}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colors.mint,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.forest }}>
              {userCategories.length} {isRTL ? 'فئات' : 'suivies'}
            </Text>
          </View>
        </View>

        {userCategories.length > 0 ? (
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 12,
            }}
          >
            {userCategories.map((c) => {
              const iconName = getCategoryIcon(c.name, c.icon);
              return (
                <View
                  key={c.id}
                  style={{
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#F4F7F5',
                    borderRadius: radius.pill,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderWidth: 1,
                    borderColor: '#E2EBE5',
                  }}
                >
                  <Ionicons name={iconName} size={15} color={colors.forest} />
                  <Text style={{ fontSize: 12, fontWeight: '600', color: colors.forest }}>
                    {traduireCategorie(c.name)}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text
            style={{
              fontSize: 13,
              color: colors.muted,
              textAlign: isRTL ? 'right' : 'left',
              marginBottom: 10,
            }}
          >
            {isRTL
              ? 'لم تحدد أي فئات بعد في ملفك الشخصي.'
              : 'Aucune catégorie suivie pour le moment.'}
          </Text>
        )}

        <Pressable
          onPress={() => router.push('/gerer-categories')}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 10,
            borderTopWidth: 1,
            borderTopColor: '#F0F4F8',
          }}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.forest }}>
            {isRTL ? 'تعديل الفئات ومتابعتها' : 'Modifier ma sélection de catégories'}
          </Text>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={16}
            color={colors.forest}
          />
        </Pressable>
      </View>

      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('preferences')}
      </SectionTitle>

      {/* Ligne cliquable vers l'écran de modification du budget mensuel */}
      <Row
        icon="wallet-outline"
        label={t('budget_du_mois')}
        detail={t('modifier_budget_detail')}
        onPress={() =>
          router.push({ pathname: '/budget-mois', params: { mode: 'edit' } } as never)
        }
        isRTL={isRTL}
      />
      {/* Ligne cliquable vers l'écran d'activation/désactivation des catégories */}
      <Row
        icon="pricetags-outline"
        label={t('gerer_categories')}
        detail={t('gerer_categories_detail')}
        onPress={() => router.push('/gerer-categories')}
        isRTL={isRTL}
      />
      {/* Ligne cliquable vers l'écran de gamification et d'historique des points */}
      <Row
        icon="trophy-outline"
        label={t('points')}
        detail={t('points_succes_detail')}
        onPress={() => router.push('/points')}
        isRTL={isRTL}
      />
      {/* Ligne cliquable vers l'écran de changement sécurisé du mot de passe */}
      <Row
        icon="lock-closed-outline"
        label={t('changer_mot_de_passe')}
        onPress={() => router.push('/changer-mot-de-passe')}
        isRTL={isRTL}
      />
      {/* Cadre cliquable du Manuel d'utilisation PDF dans la langue active (FR, AR, EN) */}
      <Row
        icon="document-text-outline"
        label={t('manuel_utilisation')}
        detail={t('ouvrir_manuel_pdf')}
        onPress={() => ouvrirManuelUtilisation(langue as any)}
        isRTL={isRTL}
      />

      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('langue')}
      </SectionTitle>
      {/* Sélecteur visuel sous forme de pastilles pour basculer instantanément de langue */}
      <LanguageSelector />

      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('stockage_local_info')}
      </Body>
      {/* Bouton d'action rouge pour fermer la session utilisateur en toute sécurité */}
      <Button label={t('se_deconnecter')} variant="danger" onPress={actions.logout} />
    </Screen>
  );
}
