/**
 * FICHIER : src/app/(admin)/mot-de-passe-temporaire.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-005
 * ÉCRAN : ECRAN-ADM-06 (Génération de Mot de Passe Temporaire)
 *
 * MISSION DU FICHIER :
 * Permettre à l'administrateur de dépanner un utilisateur ayant oublié son mot de passe.
 * Ce fichier génère de façon aléatoire et sécurisée un mot de passe éphémère, met à jour
 * le hachage cryptographique dans SQLite et active l'obligation de changement de mot de passe
 * (`mustChangePassword = 1`) dès la prochaine connexion de l'utilisateur.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il résout le problème critique de perte d'accès au compte dans un système 100% hors-ligne
 * (où il n'y a pas de serveur d'email automatique pour envoyer un lien de réinitialisation).
 * L'administrateur peut ainsi transmettre le code directement à l'utilisateur (en main propre ou par SMS/WhatsApp).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Avant génération : un texte explicatif bienveillant rappelant l'impact de la réinitialisation,
 *   un bouton d'action vert 'Générer un mot de passe temporaire' et un bouton d'annulation.
 * - Après génération : une bannière jaune d'avertissement 'Visible une seule fois',
 *   un cartouche vert foncé majestueux affichant le mot de passe en très gros caractères blancs (sélectionnables),
 *   un bouton 'Partager le mot de passe' ouvrant la fenêtre de partage native du smartphone, et un bouton 'Terminer'.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
// Composant conteneur d'écran avec retour arrière intégré
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Body, Button, EmptyState, Eyebrow } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, arrondis)
import { colors, radius } from '@/constants/theme';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'état et l'affichage du flux de génération de mot de passe temporaire.
 *
 * RÔLE DANS L'APPLICATION :
 * Assure la transition visuelle sécurisée entre l'intention d'administrateur et l'émission du secret.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'écran avec ses deux états exclusifs (avant génération ou après génération du code).
 */
export default function TemporaryPasswordScreen() {
  // Hook de navigation Expo Router pour gérer les retours arrières
  const router = useRouter();
  // Extraction de l'identifiant de l'utilisateur cible transmis via l'URL (ex: /mot-de-passe-temporaire?id=...)
  const { id } = useLocalSearchParams<{ id: string }>();
  // Accès aux données et actions du magasin SQLite
  const { db, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Recherche de l'utilisateur cible dans la liste en mémoire hydratée depuis SQLite
  const user = db.users.find((u) => u.id === id);

  // État local : contient la chaîne du mot de passe clair généré (null tant qu'on n'a pas cliqué)
  const [pw, setPw] = useState<string | null>(null);
  // État local : indique si le calcul cryptographique et l'écriture SQLite sont en cours
  const [busy, setBusy] = useState(false);

  // Sécurité : si l'utilisateur est introuvable (ex: supprimé entre-temps), on affiche un écran vide propre
  if (!user) {
    return (
      <Screen title={t('mot_de_passe_temporaire_titre')} back>
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
   * Déclencher la génération d'un mot de passe aléatoire et l'enregistrer dans la base SQLite.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.issueTemporaryPassword` qui hache le mot de passe avec sel cryptographique
   * et positionne le drapeau `mustChangePassword` à 1 pour cet utilisateur.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Active l'indicateur de chargement (spinner) sur le bouton, puis fait basculer l'écran
   * vers l'état de révélation du code secret.
   */
  const generate = async () => {
    // 1. Déclenche l'animation de chargement sur le bouton
    setBusy(true);
    // 2. Génération cryptographique et mise à jour en base SQLite
    const newPw = await actions.issueTemporaryPassword(user.id);
    // 3. Stockage du mot de passe en mémoire pour affichage unique
    setPw(newPw);
    // 4. Fin du chargement
    setBusy(false);
  };

  /**
   * MISSION DE LA FONCTION :
   * Ouvrir la feuille de partage native du téléphone (Android Share / iOS ShareSheet).
   *
   * RÔLE DANS L'APPLICATION :
   * Permet à l'administrateur d'envoyer le mot de passe temporaire en un clic via WhatsApp, SMS ou email.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Ouvre la fenêtre système native du smartphone proposant les applications de messagerie installées.
   */
  const handleShare = () => {
    if (!pw) return;
    // Appel de l'API standard React Native Share avec un message poli préformaté
    Share.share({
      message: `${t('message_partage_mdp')}${pw}`,
    });
  };

  return (
    // Screen : conteneur assurant les marges et l'en-tête avec flèche retour
    <Screen title={t('mot_de_passe_temporaire_titre')} back>
      {/* Surtitre affichant le nom de l'utilisateur concerné en lettres majuscules */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {user.name.toUpperCase()}
      </Eyebrow>

      {/* Rendu conditionnel selon que le mot de passe a déjà été généré ou non */}
      {pw ? (
        <>
          {/* Bannière d'avertissement ambre rappelant que le code ne sera plus jamais réaffiché */}
          <AlertBanner
            tone="warning"
            title={t('visible_une_seule_fois')}
            detail={t('visible_une_seule_fois_detail')}
          />

          {/* Cartouche vert forêt imposant mettant en valeur le mot de passe généré */}
          <View
            style={{
              backgroundColor: colors.forest,
              borderRadius: radius.hero,
              padding: 24,
              alignItems: 'center',
            }}
          >
            {/* Texte sélectionnable en gros caractères blancs espacés avec taille légèrement augmentée (29.5) pour une clarté et lisibilité parfaite */}
            <Text
              selectable
              style={{
                color: colors.white,
                fontSize: 29.5,
                fontWeight: '700',
                letterSpacing: 2,
              }}
            >
              {pw}
            </Text>
          </View>

          {/* Bouton d'action principal pour partager le mot de passe à l'utilisateur */}
          <Button label={t('partager_mot_de_passe')} onPress={handleShare} />

          {/* Bouton secondaire clair pour quitter l'écran et revenir à la liste */}
          <Button
            label={t('terminer')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </>
      ) : (
        <>
          {/* Explication pédagogique sur le fonctionnement de la réinitialisation */}
          <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {t('remplace_mdp_explication')}
          </Body>

          {/* Bouton vert forêt pour lancer la génération */}
          <Button
            label={t('generer_mot_de_passe_temp')}
            onPress={generate}
            loading={busy}
          />

          {/* Bouton d'annulation pour revenir en arrière sans rien modifier */}
          <Button
            label={t('annuler')}
            variant="secondary"
            onPress={() => router.back()}
          />
        </>
      )}
    </Screen>
  );
}
