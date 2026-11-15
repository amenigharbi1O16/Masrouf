/**
 * FICHIER : src/app/felicitations.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-020
 * ÉCRAN : ECRAN-NOTIF-01 (Célébration et Félicitations de Clôture de Période)
 *
 * MISSION DU FICHIER :
 * Récompenser et motiver l'utilisateur lorsqu'une période budgétaire s'achève sans aucun déficit :
 * 1. Marque immédiatement le budget comme 'célébré' dans la base SQLite locale via `actions.markCelebrated`
 *    pour garantir une stricte idempotence (règle anti-triche : une même période ne peut jamais être récompensée deux fois).
 * 2. Calcule les points de base obtenus (+50 pts) et l'éventuel bonus de série consécutive (+30 pts).
 * 3. Affiche le niveau de maîtrise atteint (Apprenti, Économe, Expert).
 * 4. Offre un bouton pour consulter son tableau de chasse des succès (`/points`) ou revenir à l'accueil.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il est le pivot de la gamification positive de Masrouf. Transformer la rigueur budgétaire
 * en un moment de fierté partagée encourage la persévérance des familles dans la durée.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand médaillon circulaire doré or (#E9B66B) de 96px orné d'un trophée vert forêt (#102B27) au centre.
 * - Le grand titre 'Bravo !' avec les dates de la période brillamment maîtrisée (ex: 25/10 au 24/11).
 * - Une ligne d'information verte 'Points gagnés : +80'.
 * - Une ligne de cumul 'Total des points : 240 · Économe'.
 * - Une ligne de bonus de série le cas échéant ('Bonus de série : +30').
 * - Un bouton vert 'Voir mes succès' et un bouton secondaire 'Retour à l'accueil'.
 */

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
// Ligne d'information synthétique bicolore
import { InfoRow } from '@/components/Cards';
// Conteneur d'écran sans barre supérieure native (mode immersif plain)
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Body, Button } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, or ambré)
import { colors } from '@/constants/theme';
// Sélecteur de calcul de gamification SQLite
import { pointsFor } from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonction utilitaire de formatage de plage de dates
import { fmtRange } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de célébration et d'attribution des récompenses de clôture budgétaire.
 *
 * RÔLE DANS L'APPLICATION :
 * Récupère le budget réussi, enregistre son état célébré dans SQLite et affiche le trophée.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue festive avec le médaillon doré, les points attribués et les options de navigation.
 */
export default function CongratulationsScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Identifiant optionnel du budget célébré transmis dans l'URL
  const { id } = useLocalSearchParams<{ id?: string }>();
  // Extraction des données de la base, de l'utilisateur connecté et des actions
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Calcul du solde de points et de l'historique des périodes réussies depuis SQLite
  const pts = me ? pointsFor(db, me) : null;
  const period =
    pts?.periods.find((x) => x.budget.id === id) ??
    [...(pts?.periods ?? [])].reverse().find((x) => x.success);

  /**
   * EFFET DE SÉCURITÉ ANTI-TRICHE (IDEMPOTENCE) :
   * Dès que l'écran s'affiche, on marque immédiatement le budget comme 'célébré' dans la base SQLite.
   * Ainsi, même si l'utilisateur quitte l'application ou recharge la page, les points ne seront plus jamais réattribués.
   */
  useEffect(() => {
    if (period) {
      actions.markCelebrated(period.budget.id);
    }
  }, [period?.budget.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Screen : conteneur plein écran sans en-tête parasite
    <Screen title={t('felicitations_titre')} plain>
      {/* Bloc centré avec le grand trophée doré */}
      <View style={{ alignItems: 'center', gap: 10, paddingVertical: 24 }}>
        {/* Médaillon circulaire doré or (#E9B66B) */}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.gold,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="trophy" size={52} color={colors.forest} />
        </View>

        {/* Grand titre Bravo */}
        <Text
          style={{
            fontSize: 26,
            fontWeight: '600',
            color: colors.forest,
            textAlign: 'center',
          }}
        >
          {t('bravo_titre')}
        </Text>

        {/* Message de félicitations personnalisé avec les dates de la période tenue */}
        {period ? (
          <Body style={{ textAlign: 'center' }}>
            {t('terminee_dans_le_budget')} (
            {fmtRange(period.budget.start, period.budget.end)})
          </Body>
        ) : (
          <Body style={{ textAlign: 'center' }}>
            {t('continuer_effort_recompense')}
          </Body>
        )}
      </View>

      {/* Ligne 1 : Points remportés pour cette période (en vert forêt) */}
      {period ? (
        <InfoRow
          label={t('points_gagnes_label')}
          value={`+${period.points + period.bonus}`}
          tone="good"
        />
      ) : null}

      {/* Ligne 2 : Cumul global des points et niveau actuel atteint */}
      {pts ? (
        <InfoRow
          label={t('total_points_label')}
          value={`${pts.total}  ·  ${pts.level}`}
        />
      ) : null}

      {/* Ligne 3 : Ligne de bonus de fidélité affichée si une série est en cours */}
      {period && period.bonus > 0 ? (
        <InfoRow
          label={t('bonus_serie_label')}
          value={`+${period.bonus}`}
          tone="good"
        />
      ) : null}

      {/* Bouton vert forêt : ouvre l'écran complet des succès et des badges */}
      <Button
        label={t('voir_mes_succes')}
        onPress={() => router.replace('/points')}
      />

      {/* Bouton secondaire clair : retour direct vers le tableau de bord d'accueil */}
      <Button
        label={t('retour_a_accueil')}
        variant="secondary"
        onPress={() => router.replace('/(tabs)')}
      />
    </Screen>
  );
}
