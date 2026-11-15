/**
 * FICHIER : src/app/(admin)/utilisateurs.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-010
 * ÉCRAN : ECRAN-ADM-05 (Répertoire et Recherche des Utilisateurs)
 *
 * MISSION DU FICHIER :
 * Fournir à l'administrateur l'annuaire complet de tous les utilisateurs enregistrés dans Masrouf,
 * avec une barre de recherche instantanée (filtrage en temps réel sur le nom et l'adresse email)
 * et des pastilles visuelles claires pour repérer les comptes actifs et les comptes suspendus.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il permet à l'administrateur de retrouver un utilisateur en moins de deux secondes
 * (même s'il y a des centaines d'inscrits) pour consulter sa fiche, modifier son accès ou réinitialiser son mot de passe.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand titre 'Utilisateurs' avec le surtitre 'ADMINISTRATION DES COMPTES'.
 * - Un champ de recherche textuel avec loupe et texte d'aide 'Nom ou e-mail...'.
 * - Si aucun compte ne correspond : une grande icône de carnet vide avec le message 'Aucun utilisateur trouvé'.
 * - Sinon : une liste de cartes blanches tactiles (minHeight: 72px) affichant à gauche le nom en vert foncé gras
 *   et l'adresse email en gris, et à droite une pastille arrondie vert menthe 'Actif' ou rose corail 'Suspendu'.
 * - Au toucher d'une carte, l'administrateur est immédiatement redirigé vers la fiche détaillée `/(admin)/utilisateur`.
 */

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
// Composant conteneur d'écran assurant le défilement et l'en-tête
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { EmptyState, Eyebrow, Input } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, menthe, corail doux et arrondis)
import { colors, radius } from '@/constants/theme';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'affichage et la recherche interactive dans l'annuaire des utilisateurs.
 *
 * RÔLE DANS L'APPLICATION :
 * Filtre les données de la table SQLite 'users' selon la saisie au clavier et dirige l'administrateur vers la fiche individuelle.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La barre de recherche en haut et la liste scrollable des cartes utilisateurs filtrées.
 */
export default function AdminUsersScreen() {
  // Hook de navigation Expo Router pour ouvrir la fiche détaillée d'un compte
  const router = useRouter();
  // Extraction de la liste des utilisateurs depuis SQLite
  const { db } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // État local : texte saisi dans la barre de recherche
  const [q, setQ] = useState('');
  // Préparation du mot-clé en minuscules sans espaces superflus
  const s = q.trim().toLowerCase();

  // Filtrage intelligent :
  // 1. On ignore les comptes administrateurs (`role === 'user'` uniquement)
  // 2. Si un mot-clé est saisi, on vérifie s'il apparaît dans le nom ou dans l'email
  const list = db.users.filter(
    (u) =>
      u.role === 'user' &&
      (!s || `${u.name} ${u.email}`.toLowerCase().includes(s))
  );

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('utilisateurs_admin')}>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('administration_comptes')}
      </Eyebrow>

      {/* Champ de recherche dynamique avec filtrage à chaque lettre tapée */}
      <Input
        label={t('rechercher_utilisateurs')}
        value={q}
        onChangeText={setQ}
        placeholder={t('nom_ou_email_placeholder')}
      />

      {/* État vide stylisé avec illustration si la recherche ne donne aucun résultat */}
      {list.length === 0 ? (
        <EmptyState icon="people-outline" title={t('aucun_utilisateur_trouve')} />
      ) : null}

      {/* Liste des cartes d'utilisateurs générées dynamiquement */}
      {list.map((u) => (
        <Pressable
          key={u.id}
          // Redirection tactile vers la fiche détaillée avec passage de l'ID en paramètre d'URL
          onPress={() =>
            router.push({
              pathname: '/(admin)/utilisateur',
              params: { id: u.id },
            } as never)
          }
          accessibilityRole="button"
          style={{
            // Inverse l'ordre horizontal en mode arabe (RTL)
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.white,
            borderRadius: radius.card,
            padding: 14,
            minHeight: 72,
          }}
        >
          {/* Bloc gauche : identité de l'utilisateur (nom et email) */}
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.forest,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {u.name}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.muted,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {u.email}
            </Text>
          </View>

          {/* Bloc droit : pastille de statut colorée (vert menthe si actif, rose corail si suspendu) */}
          <View
            style={{
              backgroundColor: u.active ? colors.mint : colors.coralSoft,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: u.active ? colors.green : '#9B3B35',
              }}
            >
              {u.active ? t('statut_actif') : t('stat_suspendus')}
            </Text>
          </View>
        </Pressable>
      ))}
    </Screen>
  );
}
