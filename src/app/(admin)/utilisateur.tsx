/**
 * FICHIER : src/app/(admin)/utilisateur.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-009
 * ÉCRAN : ECRAN-ADM-05 (Fiche Détail Utilisateur et Gestion de Compte)
 *
 * MISSION DU FICHIER :
 * Afficher la fiche administrative complète d'un utilisateur spécifique et permettre à l'administrateur
 * de modérer son accès (suspendre temporairement son compte en cas d'impayé ou de demande,
 * réactiver un compte suspendu, ou déclencher l'émission d'un mot de passe temporaire).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il donne à l'administrateur le contrôle sur le cycle de vie des comptes utilisateurs.
 * La suspension s'enregistre dans SQLite (`status = 'suspended'`) et bloque immédiatement
 * la connexion de l'utilisateur à l'écran de login avec un message d'alerte rouge explicite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand titre 'Compte' avec le surtitre 'ACTIVATION ET SUSPENSION'.
 * - Quatre lignes d'information stylisées (`InfoRow`) :
 *   1. 'Nom' : nom complet de l'utilisateur.
 *   2. 'Email' : adresse de connexion.
 *   3. 'Membre depuis' : date formatée d'inscription (ex: 14/11/2026).
 *   4. 'Statut' : pastille verte 'Actif' ou pastille rouge 'Suspendu'.
 * - Une bannière d'alerte jaune si un mot de passe temporaire est actuellement en attente de changement.
 * - Un grand bouton d'action contextuel : rouge 'Désactiver le compte' si l'utilisateur est actif,
 *   ou vert 'Activer le compte' s'il est actuellement suspendu (avec dialogue natif de confirmation).
 * - Un bouton secondaire clair 'Émettre un mot de passe temporaire' pour dépanner l'utilisateur.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert } from 'react-native';
// Composant d'affichage d'une ligne d'information bicolore
import { InfoRow } from '@/components/Cards';
// Composant conteneur d'écran avec flèche de retour arrière
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, EmptyState, Eyebrow } from '@/components/ui';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonction utilitaire de formatage de date en format lisible tunisien
import { fmtDate } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer la consultation et la modération du compte utilisateur sélectionné.
 *
 * RÔLE DANS L'APPLICATION :
 * Récupère les données du compte ciblé via son ID passé en paramètre d'URL et synchronise les actions de modération avec SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La fiche détaillée de l'utilisateur avec ses informations clés, ses badges d'état et ses boutons d'action.
 */
export default function AdminUserScreen() {
  // Hook de navigation Expo Router pour changer d'écran ou revenir en arrière
  const router = useRouter();
  // Récupération de l'ID passé dans l'URL (ex: /(admin)/utilisateur?id=...)
  const { id } = useLocalSearchParams<{ id: string }>();
  // Accès aux données de la base SQLite et aux actions de modération
  const { db, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Recherche de l'utilisateur ciblé dans la liste en mémoire
  const user = db.users.find((u) => u.id === id);

  // Sécurité : si l'identifiant ne correspond à aucun utilisateur, affiche une vue vide avec bouton retour
  if (!user) {
    return (
      <Screen title={t('compte')} back>
        <EmptyState
          title={t('aucun_utilisateur_trouve')}
          actionLabel={t('retour')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  /**
   * MISSION DE LA FONCTION :
   * Basculer l'état du compte entre 'actif' et 'suspendu' avec confirmation de sécurité.
   *
   * RÔLE DANS L'APPLICATION :
   * Déclenche une alerte native système pour éviter les suspensions accidentelles,
   * puis appelle `actions.setUserActive` qui exécute l'UPDATE en base SQLite.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Affiche la boîte de dialogue modale du smartphone ('Voulez-vous suspendre ce compte ?').
   * Si confirmé, la pastille de statut bascule instantanément au rouge ou au vert et le libellé du bouton s'inverse.
   */
  const toggle = () => {
    // Formulation adaptée du message selon l'état actuel du compte
    const title = user.active
      ? t('suspendre_ce_compte_question')
      : t('activer_ce_compte_question');
    const msg = user.active
      ? `${user.name} ${t('suspendre_explication')}`
      : `${user.name} ${t('activer_explication')}`;

    // Boîte de dialogue système native avec bouton d'annulation et bouton d'action
    Alert.alert(title, msg, [
      { text: t('annuler'), style: 'cancel' },
      {
        text: user.active ? t('desactiver_compte') : t('activer_compte'),
        style: user.active ? 'destructive' : 'default',
        onPress: () => {
          // Mise à jour de la colonne 'status' dans la table 'users' de SQLite
          actions.setUserActive(user.id, !user.active);
        },
      },
    ]);
  };

  return (
    // Screen : conteneur avec titre 'Compte' et bouton de retour arrière
    <Screen title={t('compte')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('activation_et_suspension')}
      </Eyebrow>

      {/* Ligne 1 : Nom complet */}
      <InfoRow label={t('nom_label')} value={user.name} />

      {/* Ligne 2 : Adresse email */}
      <InfoRow label={t('email')} value={user.email} />

      {/* Ligne 3 : Date de création du compte formatée */}
      <InfoRow label={t('membre_depuis')} value={fmtDate(user.createdAt)} />

      {/* Ligne 4 : Statut avec couleur sémantique (vert si actif, rouge si suspendu) */}
      <InfoRow
        label={t('statut_label')}
        value={user.active ? t('statut_actif') : t('stat_suspendus')}
        tone={user.active ? 'good' : 'danger'}
      />

      {/* Bannière jaune d'avertissement si un mot de passe temporaire doit être changé à la prochaine connexion */}
      {user.mustChangePassword ? (
        <AlertBanner
          tone="warning"
          title={t('mdp_temporaire_emis')}
          detail={t('mdp_temp_prochaine_connexion')}
        />
      ) : null}

      {/* Bouton de modération d'état : rouge danger si actif, vert primaire si suspendu */}
      <Button
        label={
          user.active ? t('desactiver_compte') : t('activer_compte')
        }
        variant={user.active ? 'danger' : 'primary'}
        onPress={toggle}
      />

      {/* Bouton secondaire clair : redirige vers le générateur de mot de passe éphémère */}
      <Button
        label={t('emettre_mdp_temporaire')}
        variant="secondary"
        onPress={() =>
          router.push({
            pathname: '/(admin)/mot-de-passe-temporaire',
            params: { id: user.id },
          } as never)
        }
      />
    </Screen>
  );
}
