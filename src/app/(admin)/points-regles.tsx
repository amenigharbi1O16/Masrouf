/**
 * FICHIER : src/app/(admin)/points-regles.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-006
 * ÉCRAN : ECRAN-ADM-04 (Configuration des Règles de Gamification)
 *
 * MISSION DU FICHIER :
 * Permettre à l'administrateur de paramétrer et d'ajuster les règles mathématiques
 * du moteur de fidélité et de gamification de Masrouf (points gagnés lorsqu'un budget est respecté,
 * bonus de série consécutive, et paliers de points nécessaires pour monter de niveau).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il donne la flexibilité d'équilibrer le jeu financier. L'administrateur peut rendre
 * les paliers plus accessibles ou récompenser plus généreusement les utilisateurs assidus,
 * et ces nouvelles règles s'appliquent immédiatement à toute la base SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand titre 'Règles des points' avec un surtitre explicatif 'RÉCOMPENSES ET PALIERS'.
 * - Cinq champs de saisie numérique stylisés :
 *   1. 'Points par période réussie' (ex: 50 points)
 *   2. 'Longueur de la série' (ex: 3 périodes de suite)
 *   3. 'Points bonus de série' (ex: 30 points supplémentaires)
 *   4. 'Seuil du niveau Économe' (ex: 150 points)
 *   5. 'Seuil du niveau Expert' (ex: 450 points)
 * - Une bannière rouge d'erreur si la cohérence n'est pas respectée (ex: si le niveau Expert est inférieur au niveau Économe).
 * - Une bannière verte de succès dès que les règles sont enregistrées.
 * - Un bouton vert d'action 'Enregistrer les règles' qui s'active uniquement si toutes les valeurs sont valides.
 */

import React, { useState } from 'react';
// Composant conteneur d'écran avec gestion du défilement et barre de statut
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonction utilitaire pour convertir un texte en nombre en toute sécurité (sans NaN)
import { toNum } from '@/utils/format';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer le formulaire de réglage des barèmes de gamification.
 *
 * RÔLE DANS L'APPLICATION :
 * Fait le lien entre les tables de paramètres système SQLite et les champs de saisie de l'administrateur.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * L'écran complet avec les 5 champs numériques, les bannières dynamiques et le bouton de sauvegarde.
 */
export default function AdminPointsRulesScreen() {
  // Extraction des données de configuration et des actions du store SQLite
  const { db, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Lecture des règles actuellement en vigueur stockées dans la base SQLite
  const r = db.pointsRules;

  // État local du formulaire : mémorise les valeurs saisies sous forme de chaînes de caractères
  const [f, setF] = useState({
    periodReward: String(r.periodReward),
    streakLength: String(r.streakLength),
    streakBonus: String(r.streakBonus),
    saverAt: String(r.saverAt),
    expertAt: String(r.expertAt),
  });

  // État local : devient true pour afficher la bannière verte dès que la sauvegarde réussit
  const [saved, setSaved] = useState(false);

  // Conversion en nombres réels pour vérifier la validité mathématique
  const n = {
    periodReward: toNum(f.periodReward),
    streakLength: toNum(f.streakLength),
    streakBonus: toNum(f.streakBonus),
    saverAt: toNum(f.saverAt),
    expertAt: toNum(f.expertAt),
  };

  // Règle de validation métier stricte :
  // 1. Tous les nombres doivent être positifs ou nuls
  // 2. La longueur de série minimale est de 1
  // 3. Le palier 'Expert' doit être obligatoirement plus élevé que le palier 'Économe'
  const valid =
    Object.values(n).every((v) => Number.isFinite(v) && v >= 0) &&
    n.streakLength >= 1 &&
    n.expertAt > n.saverAt;

  /**
   * MISSION DE LA FONCTION :
   * Créer un gestionnaire d'événement de saisie pour une clé de formulaire donnée.
   *
   * RÔLE DANS L'APPLICATION :
   * Met à jour l'état du champ modifié et masque immédiatement la bannière de succès précédente.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Actualise le texte tapé dans le champ correspondant et réactive le bouton si la saisie redevient valide.
   */
  const set = (k: keyof typeof f) => (text: string) => {
    setF((prev) => ({ ...prev, [k]: text }));
    setSaved(false);
  };

  /**
   * MISSION DE LA FONCTION :
   * Sauvegarder les nouvelles valeurs du barème dans la base SQLite locale.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.setPointsRules` qui met à jour la table des paramètres de l'application.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Affiche la bannière verte 'Règles enregistrées avec succès' en bas du formulaire.
   */
  const handleSave = () => {
    // Écriture synchrone dans SQLite via le store
    actions.setPointsRules({
      periodReward: n.periodReward,
      streakLength: Math.round(n.streakLength),
      streakBonus: n.streakBonus,
      saverAt: n.saverAt,
      expertAt: n.expertAt,
    });
    // Active l'affichage du message de confirmation vert
    setSaved(true);
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('regles_points_admin')}>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('recompense_periode_succes')}
      </Eyebrow>

      {/* Champ 1 : Points attribués pour chaque période de budget tenue sans déficit */}
      <Input
        label={t('points_par_periode_reussie')}
        value={f.periodReward}
        onChangeText={set('periodReward')}
        keyboardType="number-pad"
      />

      {/* Champ 2 : Nombre de périodes consécutives nécessaires pour toucher le super-bonus */}
      <Input
        label={t('longueur_serie_periodes')}
        value={f.streakLength}
        onChangeText={set('streakLength')}
        keyboardType="number-pad"
      />

      {/* Champ 3 : Nombre de points bonus octroyés lors de la complétion d'une série */}
      <Input
        label={t('points_bonus_serie')}
        value={f.streakBonus}
        onChangeText={set('streakBonus')}
        keyboardType="number-pad"
      />

      {/* Champ 4 : Seuil de points cumulés pour décrocher le badge Économe */}
      <Input
        label={t('seuil_niveau_econome')}
        value={f.saverAt}
        onChangeText={set('saverAt')}
        keyboardType="number-pad"
      />

      {/* Champ 5 : Seuil de points cumulés pour atteindre le rang ultime d'Expert */}
      <Input
        label={t('seuil_niveau_expert')}
        value={f.expertAt}
        onChangeText={set('expertAt')}
        keyboardType="number-pad"
      />

      {/* Bannière rouge d'alerte affichée si une valeur est invalide ou illogique */}
      {!valid ? (
        <AlertBanner
          tone="danger"
          title={t('verifier_les_regles')}
          detail={t('verifier_les_regles_detail')}
        />
      ) : null}

      {/* Bannière verte de succès confirmant la bonne écriture en base de données */}
      {saved ? (
        <AlertBanner tone="success" title={t('regles_points_enregistrees')} />
      ) : null}

      {/* Bouton vert forêt : actif uniquement si toutes les conditions de validation sont respectées */}
      <Button
        label={t('enregistrer_regles')}
        disabled={!valid}
        onPress={handleSave}
      />
    </Screen>
  );
}
