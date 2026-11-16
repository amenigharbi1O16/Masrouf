/**
 * FICHIER : src/app/points.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-030
 * ÉCRAN : ECRAN-USER-01 (Points, Niveaux et Gamification)
 *
 * MISSION DU FICHIER :
 * Présenter le tableau d'honneur et de progression de l'utilisateur :
 * 1. Niveau actuel (Apprenti, Économe, Expert).
 * 2. Solde cumulé de points et points manquants pour passer au niveau supérieur.
 * 3. Jauge de progression visuelle vert menthe proportionnelle au palier suivant.
 * 4. Séries de réussites consécutives (série en cours et record historique).
 * 5. Historique complet de toutes les périodes de budget passées avec le statut (réussi avec trophée ou dépassé avec croix).
 * 6. Bouton d'accès direct au trophée de la dernière période clôturée avec succès (`/felicitations`).
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il valorise la fidélité et la discipline financière de l'utilisateur. En voyant sa jauge monter
 * et son rang s'élever, l'utilisateur prend plaisir à enregistrer ses dépenses avec rigueur.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre 'Points et progrès' et flèche de retour.
 * - Le surtitre 'VOS HABITUDES RÉCOMPENSÉES'.
 * - Un grand cartouche hero banner vert forêt (#102B27) affichant le rang (ex: Économe) en grands caractères blancs,
 *   le total de points et une barre de progression horizontale vert menthe (#D9F0E4).
 * - Deux lignes d'information : 'Série actuelle' (ex: 2 périodes) et 'Meilleure série' (ex: 4 périodes).
 * - Un texte explicatif rappelant les règles d'attribution des points (+50 pts par budget tenu, bonus de série).
 * - La liste des périodes passées sous forme de cartes élégantes avec icône de coupe dorée ou de cercle gris.
 * - Un bouton vert 'Voir ma dernière récompense'.
 */

import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
// Lignes de données bicolores et rangées de transaction réutilisables
import { InfoRow, TransactionRow } from '@/components/Cards';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import {
  Body,
  Button,
  EmptyState,
  Eyebrow,
  SectionTitle,
} from '@/components/ui';
// Constantes de thème (couleurs vert forêt, vert menthe, or ambré et arrondis)
import { colors, radius } from '@/constants/theme';
// Moteur de calcul des points, niveaux et séries dans SQLite
import { pointsFor } from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonction utilitaire de formatage de plage de dates
import { fmtRange } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de progression de gamification de l'utilisateur.
 *
 * RÔLE DANS L'APPLICATION :
 * Exécute l'algorithme d'évaluation des points depuis les tables `budgets` et `purchases`
 * et structure la progression en paliers dynamiques.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec le hero banner de niveau, les compteurs de série et l'historique des trophées.
 */
export default function PointsScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction des données de la base et du profil utilisateur connecté
  const { db, me } = useStore();
  // Fonctions de traduction, sens de lecture et traduction des niveaux de gamification
  const { t, isRTL, traduireNiveau } = useTranslation();

  // Sécurité : si la session est expirée
  if (!me) return null;

  // Calcul instantané du bilan de gamification complet de l'utilisateur
  const p = pointsFor(db, me);
  // Lecture des règles en vigueur dans les paramètres système
  const r = db.pointsRules;

  // Calcul du ratio de remplissage de la jauge (entre 0 et 1) vers le palier supérieur
  const progress = p.next ? Math.min(1, p.total / p.next.at) : 1;
  // Recherche chronologique de la dernière période réussie
  const latest = [...p.periods].reverse().find((x) => x.success);

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('points_et_progres')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('vos_habitudes_recompensees')}
      </Eyebrow>

      {/* Hero banner vert forêt imposant avec le niveau et la jauge de points */}
      <View
        style={{
          backgroundColor: colors.forest,
          borderRadius: radius.hero,
          padding: 24,
          gap: 6,
          // Aligne à droite en arabe, à gauche en français/anglais
          alignItems: isRTL ? 'flex-end' : 'flex-start',
        }}
      >
        {/* Libellé 'Niveau actuel' en vert menthe discret */}
        <Text style={{ color: colors.mint, fontSize: 12, fontWeight: '500' }}>
          {t('niveau_actuel')}
        </Text>
        {/* Nom du rang atteint traduit en arabe ou français (ex: Économe / مقتصد / Saver) en grands caractères blancs */}
        <Text style={{ color: colors.white, fontSize: 30, fontWeight: '700' }}>
          {traduireNiveau(p.level)}
        </Text>
        {/* Détail chiffré des points cumulés et des points manquants pour passer au rang suivant */}
        <Text style={{ color: colors.mint, fontSize: 14 }}>
          {p.total} {t('points').toLowerCase()}
          {p.next
            ? `  ·  ${p.next.at - p.total} ${t('pour_atteindre_niveau')} ${traduireNiveau(p.next.name)}`
            : `  ·  ${t('niveau_maximal_atteint')}`}
        </Text>

        {/* Conteneur de la barre de progression horizontale */}
        <View
          style={{
            width: '100%',
            height: 7,
            borderRadius: 4,
            backgroundColor: colors.track,
            marginTop: 10,
          }}
        >
          {/* Remplissage vert menthe dynamique proportionnel aux points acquis */}
          <View
            style={{
              height: 7,
              borderRadius: 4,
              width: `${progress * 100}%`,
              backgroundColor: colors.mint,
              alignSelf: isRTL ? 'flex-end' : 'flex-start',
            }}
          />
        </View>
      </View>

      {/* Ligne 1 : Série en cours de périodes tenues consécutivement */}
      <InfoRow
        label={t('serie_actuelle')}
        value={`${p.streak} ${
          p.streak === 1 ? t('periode') : t('stat_periodes_budget').toLowerCase()
        }`}
      />

      {/* Ligne 2 : Meilleur record historique de série atteint */}
      <InfoRow
        label={t('meilleure_serie')}
        value={`${p.best} ${
          p.best === 1 ? t('periode') : t('stat_periodes_budget').toLowerCase()
        }`}
      />

      {/* Texte explicatif détaillant les barèmes de points et bonus de série */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('explication_regles_points', {
          reward: r.periodReward,
          bonus: r.streakBonus,
          streak: r.streakLength,
          saver: r.saverAt,
          expert: r.expertAt,
        })}
      </Body>

      {/* Titre de la section historique des périodes passées */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('periodes_terminees')}
      </SectionTitle>

      {/* Rendu des périodes passées ou illustration si aucune période n'est encore clôturée */}
      {p.periods.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title={t('aucune_periode_terminee')}
          detail={t('premiere_recompense_info')}
        />
      ) : (
        // Parcours inversé pour afficher les périodes les plus récentes en haut
        [...p.periods].reverse().map((x) => (
          <TransactionRow
            key={x.budget.id}
            icon={x.success ? 'trophy-outline' : 'close-circle-outline'}
            title={fmtRange(x.budget.start, x.budget.end)}
            detail={
              x.success
                ? x.bonus
                  ? t('dans_budget_bonus_serie')
                  : t('dans_le_budget')
                : t('budget_depasse')
            }
            amount={x.success ? `+${x.points + x.bonus}` : '0'}
          />
        ))
      )}

      {/* Bouton vert forêt : visible si l'utilisateur a au moins une période réussie pour revoir son trophée */}
      {latest ? (
        <Button
          label={t('voir_derniere_recompense')}
          onPress={() =>
            router.push({
              pathname: '/felicitations',
              params: { id: latest.budget.id },
            } as never)
          }
        />
      ) : null}
    </Screen>
  );
}
