/**
 * FICHIER : src/app/changer-mot-de-passe.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-017
 * ÉCRAN : ECRAN-AUTH-03 (Changement et Sécurisation de Mot de Passe)
 *
 * MISSION DU FICHIER :
 * Permettre à un utilisateur ou à un administrateur de définir un nouveau mot de passe secret :
 * 1. Cas obligatoire : suite à l'émission d'un mot de passe temporaire par l'administrateur
 *    (`mustChangePassword = 1`). Dans ce cas, la flèche de retour arrière est verrouillée pour obliger
 *    l'utilisateur à sécuriser son compte avant d'accéder à ses données financières.
 * 2. Cas volontaire : initié depuis les paramètres du compte (`/reglages`).
 * 3. Vérifie l'ancien mot de passe, applique les règles de sécurité en temps réel (8 caractères min, 1 chiffre, concordance),
 *    génère un nouveau sel cryptographique, met à jour le hash SHA-256 dans SQLite et remet `mustChangePassword` à 0.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il est le garant de la sécurité des comptes dans Masrouf. Il empêche l'utilisation prolongée
 * d'un mot de passe temporaire connu de l'administrateur et garantit le secret absolu de l'utilisateur.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre 'Sécuriser le compte' (si obligatoire) ou 'Changer le mot de passe' (si volontaire).
 * - Une bannière bleue d'information si le changement est imposé par le système.
 * - Trois champs de formulaire avec masquage de sécurité des caractères :
 *   1. 'Mot de passe actuel' (ou 'Mot de passe temporaire').
 *   2. 'Nouveau mot de passe'.
 *   3. 'Confirmer le nouveau mot de passe'.
 * - Trois indicateurs dynamiques de règles de sécurité avec coches vertes '✓' ou cercles gris '○' :
 *   'Au moins 8 caractères', 'Contient au moins un chiffre' et 'Mots de passe identiques'.
 * - Un grand bouton vert 'Enregistrer le nouveau mot de passe', désactivé tant que les 3 règles ne sont pas vertes.
 * - Un bouton secondaire 'Se déconnecter' si le changement est obligatoire.
 */

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
// Icônes vectorielles Ionicons pour remplacer les caractères emojis et coches textuelles
import { Ionicons } from '@expo/vector-icons';
// Conteneur d'écran avec retour conditionnel et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, vert menthe, gris)
import { colors } from '@/constants/theme';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';
// Moteur de validation des règles de sécurité de mot de passe
import { passwordChecks } from '@/utils/security';

/**
 * MISSION DU COMPOSANT :
 * Gérer le formulaire de mise à jour du mot de passe avec validation dynamique.
 *
 * RÔLE DANS L'APPLICATION :
 * Contrôle la solidité du mot de passe et synchronise la nouvelle empreinte de sécurité avec SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec les 3 champs masqués, la liste de contrôle des règles de sécurité et les boutons d'action.
 */
export default function ChangePasswordScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction du profil utilisateur connecté et des actions de sécurité
  const { me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Détermine si le changement est obligatoire suite à une réinitialisation administrative
  const mandatory = !!me?.mustChangePassword;

  // États locaux des champs du formulaire
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Évaluation en temps réel de la conformité des règles de sécurité
  const c = passwordChecks(next, confirm);

  /**
   * MISSION DE LA FONCTION :
   * Valider l'ancien mot de passe et persister la nouvelle empreinte cryptographique dans SQLite.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.changePassword(current, next)` qui vérifie le mot de passe actuel contre SQLite,
   * calcule le nouveau hachage salé et repasse `mustChangePassword` à 0.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * En cas d'ancien mot de passe erroné : affiche la bannière rouge d'erreur.
   * En cas de succès : redirige automatiquement vers le tableau de bord sans écran blanc.
   */
  const submit = async () => {
    // Début de l'animation de chargement
    setBusy(true);
    const res = await actions.changePassword(current, next);
    setBusy(false);

    // Si l'ancien mot de passe ne correspond pas au hash SQLite
    if (!res.ok) {
      setError(res.error ?? t('mdp_non_modifie'));
      return;
    }

    // Si le changement était imposé : le gardien Gate détecte la fin de mustChangePassword et redirige
    if (mandatory) return;
    // Si c'était un changement volontaire : on revient à l'écran précédent des réglages
    router.back();
  };

  return (
    // Screen : conteneur plein écran (bouton retour désactivé si changement obligatoire)
    <Screen
      title={mandatory ? t('securiser_compte') : t('changer_mot_de_passe')}
      back={!mandatory}
      plain={mandatory}
    >
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {mandatory
          ? t('mise_a_jour_mdp_requise')
          : t('securite_compte')}
      </Eyebrow>

      {/* Bannière d'information bleue affichée si le changement est obligatoire */}
      {mandatory ? (
        <AlertBanner
          tone="info"
          title={t('remplacer_mdp_temporaire')}
          detail={t('choisir_nouveau_mdp_continuer')}
        />
      ) : null}

      {/* Bannière rouge d'alerte affichée si l'ancien mot de passe est incorrect */}
      {error ? (
        <AlertBanner
          tone="danger"
          title={t('mdp_non_modifie')}
          detail={error}
        />
      ) : null}

      {/* Champ 1 : Mot de passe actuel (ou code temporaire) */}
      <Input
        label={
          mandatory
            ? t('mot_de_passe_temporaire_titre')
            : t('mot_de_passe_actuel')
        }
        value={current}
        onChangeText={setCurrent}
        secure
      />

      {/* Champ 2 : Nouveau mot de passe secret */}
      <Input
        label={t('nouveau_mot_de_passe')}
        value={next}
        onChangeText={setNext}
        secure
      />

      {/* Champ 3 : Confirmation du nouveau mot de passe secret */}
      <Input
        label={t('confirmer_nouveau_mdp')}
        value={confirm}
        onChangeText={setConfirm}
        secure
      />

      {/* Indicateurs dynamiques des 5 critères de conformité avec icônes vectorielles Ionicons sans aucun emoji */}
      <View style={{ gap: 6, marginVertical: 8 }}>
        {(
          [
            [t('regle_8_chars'), c.length],
            [t('regle_majuscule'), c.uppercase],
            [t('regle_chiffre'), c.number],
            [t('regle_special'), c.special],
            [t('regle_identiques'), c.match && confirm.length > 0],
          ] as const
        ).map(([label, ok]) => (
          // Ligne d'indicateur avec icône vectorielle à gauche (ou à droite en arabe)
          <View
            key={label}
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {/* Icône de validation vectorielle (coche verte si rempli, cercle vide si non rempli) */}
            <Ionicons
              name={ok ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={ok ? colors.forest : colors.muted}
            />
            {/* Libellé textuel de la règle */}
            <Text
              style={{
                fontSize: 13,
                lineHeight: 19,
                fontWeight: '500',
                color: ok ? colors.forest : colors.muted,
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Bouton vert forêt : actif uniquement si toutes les règles de sécurité sont au vert */}
      <Button
        label={t('enregistrer_nouveau_mdp')}
        onPress={submit}
        loading={busy}
        disabled={!current || !c.allValid || !c.match}
      />

      {/* Bouton secondaire clair : permet de se déconnecter si on ne souhaite pas changer son mot de passe maintenant */}
      {mandatory ? (
        <Button
          label={t('se_deconnecter')}
          variant="secondary"
          onPress={actions.logout}
        />
      ) : null}
    </Screen>
  );
}
