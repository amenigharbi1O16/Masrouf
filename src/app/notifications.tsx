/**
 * FICHIER : src/app/notifications.tsx
 * IDENTIFIANT INVENTAIRE : ECRAN-NOTIFICATIONS-CENTRE
 * MODULE : Centre de Notifications Budgétaires et Historique des Alertes Smartphone
 *
 * RÔLE DU MODULE :
 * Fournit une interface complète et soignée pour visualiser et gérer l'ensemble des notifications :
 * 1. Présentation des alertes de seuils (80%, 100% de dépassement, fin de période imminente ≤ 3j, ajustements).
 * 2. Distinction visuelle immédiate entre notifications non lues (pastille colorée "Nouveau") et lues.
 * 3. Affichage explicite pour chaque notification :
 *    - La période budgétaire concernée (dates exactes de début et fin).
 *    - Les montants financiers précis (dépensé, budget global, dépassement éventuel).
 *    - La raison exacte de l'envoi de la notification.
 *    - L'action corrective ou préventive recommandée.
 * 4. Bouton d'action pour marquer toutes les alertes comme lues d'un seul clic.
 * 5. Bannière informative expliquant l'architecture des notifications locales natives sur smartphone.
 */

// Importation de la bibliothèque d'icônes vectorielles standard
import { Ionicons } from '@expo/vector-icons';
// Outil de routage Expo Router
import { useRouter } from 'expo-router';
// Importation de React et des hooks d'état et mémoïsation
import React, { useMemo } from 'react';
// Composants graphiques de base React Native
import { Pressable, StyleSheet, Text, View } from 'react-native';
// Gabarit d'écran unifié Masrouf avec en-tête et zone de défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Button, EmptyState } from '@/components/ui';
// Constantes de thème (palette de couleurs écologiques)
import { colors } from '@/constants/theme';
// Accès au store global Masrouf (SQLite + StoreContext)
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul monétaire et de formatage
import { money } from '@/utils/format';
// Système d'internationalisation et support RTL
import { useTranslation } from '@/utils/i18n';
// Type d'entité d'une notification
import type { InAppNotification } from '@/state/types';

/**
 * MISSION DU COMPOSANT : NotificationsScreen
 * RÔLE : Affiche le centre de notifications avec distinction lu / non lu et détails financiers complets.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - En-tête avec flèche retour et titre "Notifications".
 *   - Bannière explicative sur le fonctionnement local des notifications sans serveur backend.
 *   - Bouton "Tout marquer comme lu".
 *   - Liste des alertes ordonnées chronologiquement (de la plus récente à la plus ancienne).
 */
export default function NotificationsScreen() {
  // Outil de navigation
  const router = useRouter();
  // Accès aux notifications, profil connecté et aux actions de mutation du store
  const { notifications, unreadNotificationsCount, actions, me } = useStore();
  // Outils de traduction et détection du sens d'écriture
  const { t, isRTL, langue } = useTranslation();

  // Liste triée des notifications : les plus récentes en premier
  const list = useMemo(() => {
    return [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications]);

  /**
   * Retourne l'icône et la couleur adaptées selon le type d'alerte financière.
   */
  const getVisual = (type: InAppNotification['type']) => {
    switch (type) {
      case 'user_registered':
        return { icon: 'person-add' as const, color: colors.forest, bg: '#E8F5E9' };
      case 'system':
        return { icon: 'information-circle' as const, color: colors.forest, bg: '#EBF4F0' };
      case 'alert_100':
        return { icon: 'alert-circle' as const, color: colors.coral, bg: '#FDF0ED' };
      case 'alert_80':
        return { icon: 'warning' as const, color: '#D97706', bg: '#FEF3C7' };
      case 'period_end':
        return { icon: 'time' as const, color: colors.forest, bg: '#E8F5E9' };
      case 'budget_change':
      default:
        return { icon: 'calculator' as const, color: colors.forest, bg: '#EBF4F0' };
    }
  };

  return (
    <Screen
      // Titre affiché dans l'en-tête
      title={t('notifications')}
      // Bouton flèche retour vers la page précédente
      back
      // Action de retour adaptée selon le rôle de l'utilisateur
      onBack={() => {
        if (me?.role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }}
    >
      {/* 1. Bannière explicative sur l'architecture locale native sans backend */}
      <View style={[styles.banner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="information-circle-outline" size={20} color={colors.forest} />
        <Text style={[styles.bannerText, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('notif_banner_info')}
        </Text>
      </View>

      {/* 2. Barre d'action supérieure : compteur et bouton tout marquer comme lu */}
      {list.length > 0 && (
        <View
          style={[
            styles.actionBar,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Nombre de notifications non lues */}
          <Text style={styles.countText}>
            {unreadNotificationsCount > 0
              ? t('non_lues_count', { count: unreadNotificationsCount })
              : t('toutes_alertes_lues')}
          </Text>

          {/* Bouton pour tout marquer comme lu si nécessaire */}
          {unreadNotificationsCount > 0 && (
            <Pressable
              onPress={() => actions.markAllNotificationsRead()}
              hitSlop={8}
              accessibilityRole="button"
            >
              <Text style={styles.markAllText}>{t('tout_marquer_lu')}</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* 3. Liste des notifications ou état vide */}
      {list.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title={t('aucune_notification')}
          detail={t('aucune_notification_detail')}
        />
      ) : (
        list.map((item) => {
          const vis = getVisual(item.type);
          return (
            <Pressable
              key={item.id}
              // Toucher une notification non lue la marque instantanément comme lue
              onPress={() => {
                if (!item.isRead) actions.markNotificationRead(item.id);
              }}
              style={[
                styles.card,
                !item.isRead && styles.unreadCard,
              ]}
              accessibilityRole="button"
            >
              {/* En-tête de la carte : icône de type, titre et pastille "Nouveau" */}
              <View
                style={[
                  styles.cardHeader,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={[styles.iconBox, { backgroundColor: vis.bg }]}>
                  <Ionicons name={vis.icon} size={18} color={vis.color} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.titleText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {item.title}
                  </Text>
                  {item.periodLabel ? (
                    <Text style={[styles.periodText, { textAlign: isRTL ? 'right' : 'left' }]}>
                      {t('periode_concernee')} : {item.periodLabel}
                    </Text>
                  ) : null}
                </View>

                {/* Pastille visuelle pour les alertes non lues */}
                {!item.isRead && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{t('nouveau')}</Text>
                  </View>
                )}
              </View>

              {/* Corps explicatif de la notification */}
              <Text style={[styles.bodyText, { textAlign: isRTL ? 'right' : 'left' }]}>
                {item.body}
              </Text>

              {/* Encadré d'action recommandée */}
              {item.actionRecommended ? (
                <View style={styles.actionBox}>
                  <Text style={[styles.actionLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {t('action_recommandee')} :
                  </Text>
                  <Text style={[styles.actionDesc, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {item.actionRecommended}
                  </Text>
                </View>
              ) : null}

              {/* Horodatage discret en bas de carte */}
              <Text style={[styles.dateText, { textAlign: isRTL ? 'left' : 'right' }]}>
                {new Date(item.createdAt).toLocaleDateString(
                  langue === 'ar' ? 'ar-TN' : langue === 'en' ? 'en-US' : 'fr-TN',
                  {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                )}
              </Text>
            </Pressable>
          );
        })
      )}

      {/* Marge de sécurité inférieure */}
      <View style={{ height: 20 }} />
    </Screen>
  );
}

// Feuilles de styles du centre de notifications
const styles = StyleSheet.create({
  // Bannière informative
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EBF4F0',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CDE5DB',
  },
  // Texte de la bannière
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.forest,
  },
  // Rangée d'actions
  actionBar: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  // Compteur d'alertes non lues
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.muted,
  },
  // Lien tout marquer comme lu
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
  },
  // Carte de notification standard
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  // Style accentué pour les cartes non encore consultées
  unreadCard: {
    borderColor: colors.mint,
    backgroundColor: '#FAFAF7',
    shadowColor: colors.forest,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  // En-tête de la carte
  cardHeader: {
    alignItems: 'center',
    gap: 10,
  },
  // Conteneur de l'icône de type
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Titre principal
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.forest,
  },
  // Libellé de la période
  periodText: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  // Pastille "Nouveau"
  newBadge: {
    backgroundColor: colors.coral,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  // Texte de la pastille
  newBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  // Corps explicatif
  bodyText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.forest,
  },
  // Encadré d'action conseillée
  actionBox: {
    backgroundColor: '#F5F3ED',
    padding: 10,
    borderRadius: 8,
    marginTop: 2,
  },
  // Libellé action recommandée
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forest,
    marginBottom: 2,
  },
  // Description de l'action
  actionDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.forest,
  },
  // Horodatage discret
  dateText: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
});