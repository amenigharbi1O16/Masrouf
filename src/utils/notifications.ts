/**
 * FICHIER : src/utils/notifications.ts
 * IDENTIFIANT INVENTAIRE : FICHIER-UTIL-NOTIF
 * MODULE : Service de Notifications Locales Natives Expo et Gestionnaire d'Alertes Budgétaires
 *
 * RÔLE DU MODULE :
 * Gère l'intégralité du cycle de vie des notifications réelles envoyées sur le téléphone de l'utilisateur :
 * 1. Configuration du gestionnaire d'affichage Expo Notifications (`setNotificationHandler`).
 * 2. Création du canal de notification Android haute importance avec son et vibration.
 * 3. Demande explicite de permission système (`requestPermissionsAsync`).
 * 4. Déclenchement de vraies notifications locales sur l'appareil (même en arrière-plan ou fermée si supporté par l'OS).
 * 5. Prévention anti-doublon pour éviter de spammer l'utilisateur sur une même période ou une même journée.
 * 6. Explication de l'absence de push distant : Masrouf étant une application locale décentralisée sans serveur backend,
 *    les notifications locales natives sont la solution officielle, sécurisée et respectueuse de la vie privée.
 */

// Importation de la bibliothèque officielle Expo Notifications
import * as Notifications from 'expo-notifications';
// Détection de la plateforme d'exécution (Android, iOS ou Web)
import { Platform } from 'react-native';
// Types métier TypeScript de l'application
import type { Budget, DB, InAppNotification } from '@/state/types';
// Fonctions utilitaires de calcul monétaire et de formatage
import { fmtRange, money, todayISO } from './format';

// ------------------------------------------------------------
// CONFIGURATION DU COMPORTEMENT VISUEL DES NOTIFICATIONS
// ------------------------------------------------------------
// Définit comment le système d'exploitation présente la notification lorsque l'app est active au premier plan
try {
  // Configuration globale d'affichage des notifications réelles
  Notifications.setNotificationHandler({
    // Fonction asynchrone déterminant les options d'affichage sur smartphone
    handleNotification: async () => ({
      // Affiche la bannière visuelle en haut de l'écran du smartphone
      shouldShowAlert: true,
      // Émet le signal sonore par défaut de l'appareil
      shouldPlaySound: true,
      // Met à jour la pastille numérique (badge) sur l'icône de l'application
      shouldSetBadge: true,
      // Affiche la bannière popup
      shouldShowBanner: true,
      // Intègre l'alerte dans la liste du tiroir des notifications système
      shouldShowList: true,
      // Priorité maximale
      priority: Notifications.AndroidNotificationPriority.MAX,
    } as any),
  });
} catch (e) {
  // Journalisation silencieuse en environnement Web ou restreint
  console.warn('Notifications handler init info:', e);
}

/**
 * MISSION DE LA FONCTION : initNotificationChannels
 *   Crée et configure le canal de notification Android pour garantir une sonnerie et une priorité maximale.
 * RÔLE DANS L'APPLICATION :
 *   Sur Android 8.0+, chaque notification doit obligatoirement être rattachée à un canal système.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Définit le nom du canal ("Alertes Budgétaires Masrouf") visible dans les paramètres système du téléphone.
 */
export async function initNotificationChannels(): Promise<void> {
  // Vérification de la plateforme Android
  if (Platform.OS === 'android') {
    try {
      // Enregistrement du canal Android
      await Notifications.setNotificationChannelAsync('masrouf_budget', {
        // Nom lisible affiché dans les paramètres du téléphone
        name: 'Alertes Budgétaires Masrouf',
        // Description détaillée du canal
        description: 'Notifications pour seuils de budget (80%, 100%), fin de période et ajustements financiers.',
        // Niveau d'importance maximal pour afficher la bannière et émettre un son
        importance: Notifications.AndroidImportance.MAX,
        // Schéma de vibration : silence initial puis 3 impulsions de 250ms
        vibrationPattern: [0, 250, 250, 250],
        // Couleur de la LED de notification (vert forêt de Masrouf)
        lightColor: '#1B4332',
        // Active le voyant lumineux
        enableLights: true,
        // Active la vibration
        enableVibrate: true,
      });
    } catch (err) {
      // Journalisation d'erreur éventuelle
      console.warn('Channel creation error:', err);
    }
  }
}

/**
 * MISSION DE LA FONCTION : requestNotificationPermissions
 *   Demande à l'utilisateur l'autorisation d'envoyer des notifications sur son téléphone.
 * RÔLE DANS L'APPLICATION :
 *   Exécutée au démarrage ou lors du premier budget pour s'assurer que le smartphone autorise les alertes.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Déclenche la boîte de dialogue système native d'Android ou iOS demandant "Autoriser Masrouf à envoyer des notifications".
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Exclusion du Web où les notifications natives mobiles ne s'appliquent pas
  if (Platform.OS === 'web') return false;

  try {
    // Vérification de l'état actuel des permissions
    const settings = await Notifications.getPermissionsAsync();
    // Si la permission est déjà accordée
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
      // Initialisation du canal Android
      await initNotificationChannels();
      // Retourne vrai : permissions accordées
      return true;
    }

    // Demande de permission active auprès de l'utilisateur
    const request = await Notifications.requestPermissionsAsync({
      // Demande d'alerte visuelle
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });

    // Initialisation du canal Android si accepté
    if (request.granted) {
      await initNotificationChannels();
    }

    // Retourne le statut final accordé ou refusé
    return request.granted;
  } catch (err) {
    // Repli de sécurité en cas d'impossibilité d'accès aux APIs natives
    console.warn('Permissions request warning:', err);
    return false;
  }
}

/**
 * MISSION DE LA FONCTION : sendPhoneNotification
 *   Envoie une véritable notification locale sur le smartphone de l'utilisateur.
 * RÔLE DANS L'APPLICATION :
 *   Fait vibrer et sonner le téléphone avec le titre et le message financier explicatif.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Une bannière système native dans le centre de notifications du smartphone.
 */
export async function sendPhoneNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<string | null> {
  // En environnement Web, simulation en console uniquement
  if (Platform.OS === 'web') {
    console.log('[NOTIFICATION-WEB]', params.title, params.body);
    return null;
  }

  try {
    // Planification immédiate de la notification locale sur le smartphone
    const id = await Notifications.scheduleNotificationAsync({
      // Contenu complet de la notification locale
      content: {
        // Titre de l'alerte
        title: params.title,
        // Corps explicatif détaillé
        body: params.body,
        // Données d'accompagnement transmises à la notification
        data: params.data ?? {},
        // Son par défaut
        sound: true,
        // Rattachement au canal Android haute priorité
        channelId: 'masrouf_budget',
      } as any,
      // Déclenchement instantané (trigger = null signifie envoi immédiat)
      trigger: null,
    });
    // Retour de l'identifiant de la notification programmée
    return id;
  } catch (err) {
    // Journalisation d'erreur sans faire crasher l'application
    console.warn('Notification schedule error:', err);
    return null;
  }
}

/**
 * Interface des paramètres d'évaluation budgétaire pour génération d'alertes.
 */
export interface BudgetAlertCheckParams {
  userId: string;
  budget: Budget;
  spent: number;
  existingNotifications: InAppNotification[];
  onTriggerNotification: (n: Omit<InAppNotification, 'id' | 'createdAt'>) => void;
}

/**
 * MISSION DE LA FONCTION : evaluateBudgetAlerts
 *   Analyse mathématiquement l'état d'un budget par rapport aux dépenses réelles
 *   et déclenche les notifications sur le smartphone pour les événements clés :
 *   1. Seuil de 80% atteint (alerte préventive).
 *   2. Seuil de 100% dépassé (alerte critique de dépassement).
 *   3. Fin de période imminente (dans les 3 derniers jours).
 *
 * RÔLE DANS L'APPLICATION :
 *   Surveille en permanence le budget sélectionné lors de chaque ajout ou modification de transaction.
 *   Empêche les doublons en vérifiant la liste des notifications déjà émises pour ce cycle.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Déclenche une vraie notification locale sur le téléphone et crée une entrée dans le centre de notifications de l'application.
 */
export function evaluateBudgetAlerts({
  userId,
  budget,
  spent,
  existingNotifications,
  onTriggerNotification,
}: BudgetAlertCheckParams): void {
  // Sécurité : si le budget total est nul ou négatif, aucune alerte n'est pertinente
  if (!budget || budget.total <= 0) return;

  // Libellé clair de la période concernée (ex: "01 nov. – 30 nov. 2026")
  const periodLabel = fmtRange(budget.start, budget.end);
  // Date du jour au format ISO
  const today = todayISO();
  // Ratio de consommation budgétaire (dépensé / total)
  const ratio = spent / budget.total;

  // ------------------------------------------------------------
  // CAS 1 : ALERTE 100% DÉPASSÉ (Priorité Haute)
  // ------------------------------------------------------------
  if (ratio >= 1.0) {
    // Vérification anti-doublon : cette alerte 100% a-t-elle déjà été envoyée pour cette période ?
    const alreadySent100 = existingNotifications.some(
      (n) => n.userId === userId && n.periodId === budget.id && n.type === 'alert_100'
    );

    // Si l'alerte n'a pas encore été transmise
    if (!alreadySent100) {
      // Calcul du dépassement exact
      const overAmount = spent - budget.total;
      // Titre explicatif
      const title = 'Dépassement de budget : 100% franchi';
      // Corps détaillé indiquant la période, les montants et l'action recommandée
      const body = `Période ${periodLabel} : Vous avez dépassé votre budget de ${money(budget.total)} (Dépensé : ${money(spent)}, soit +${money(overAmount)} de dépassement). Action conseillée : Ajustez vos allocations ou limitez les dépenses imprévues pour cette période.`;
      // Action recommandée
      const actionRecommended = 'Réduisez vos sorties non indispensables ou rééquilibrez vos enveloppes budgétaires.';

      // Envoi de la notification réelle sur le smartphone
      sendPhoneNotification({
        title,
        body,
        data: { type: 'alert_100', budgetId: budget.id, spent, total: budget.total },
      });

      // Enregistrement dans le centre de notifications de l'application
      onTriggerNotification({
        userId,
        type: 'alert_100',
        title,
        body,
        periodLabel,
        periodId: budget.id,
        amountSpent: spent,
        budgetTotal: budget.total,
        actionRecommended,
        isRead: false,
      });
      // Fin de vérification (l'alerte 100% supplante l'alerte 80%)
      return;
    }
  }

  // ------------------------------------------------------------
  // CAS 2 : ALERTE 80% DU BUDGET ATTEINT (Prévention)
  // ------------------------------------------------------------
  if (ratio >= 0.8 && ratio < 1.0) {
    // Vérification anti-doublon pour l'alerte 80%
    const alreadySent80 = existingNotifications.some(
      (n) => n.userId === userId && n.periodId === budget.id && n.type === 'alert_80'
    );

    // Si l'alerte 80% n'a pas encore été envoyée
    if (!alreadySent80) {
      // Montant restant disponible
      const remain = budget.total - spent;
      // Titre clair
      const title = 'Seuil d’alerte : 80% du budget atteint';
      // Corps détaillé
      const body = `Période ${periodLabel} : Vous avez consommé ${(ratio * 100).toFixed(1)}% de votre budget (${money(spent)} sur ${money(budget.total)}). Il vous reste ${money(remain)}. Action conseillée : Modérez vos dépenses quotidiennes pour terminer la période sereinement.`;
      // Action recommandée
      const actionRecommended = 'Surveillez vos achats au supermarché et privilégiez les produits essentiels.';

      // Envoi de la notification réelle sur le smartphone
      sendPhoneNotification({
        title,
        body,
        data: { type: 'alert_80', budgetId: budget.id, spent, total: budget.total },
      });

      // Enregistrement dans le centre de notifications in-app
      onTriggerNotification({
        userId,
        type: 'alert_80',
        title,
        body,
        periodLabel,
        periodId: budget.id,
        amountSpent: spent,
        budgetTotal: budget.total,
        actionRecommended,
        isRead: false,
      });
    }
  }

  // ------------------------------------------------------------
  // CAS 3 : FIN DE PÉRIODE BUDGÉTAIRE IMMINENTE (≤ 3 jours restants)
  // ------------------------------------------------------------
  // Calcul de la différence en jours entre aujourd'hui et la date de fin
  const dToday = new Date(today);
  const dEnd = new Date(budget.end);
  const diffDays = Math.ceil((dEnd.getTime() - dToday.getTime()) / (1000 * 3600 * 24));

  // Si nous sommes dans les 3 derniers jours de la période active et pas encore expirée
  if (diffDays >= 0 && diffDays <= 3 && today >= budget.start) {
    // Anti-doublon quotidien pour la fin de période
    const alreadySentEnd = existingNotifications.some(
      (n) => n.userId === userId && n.periodId === budget.id && n.type === 'period_end'
    );

    if (!alreadySentEnd) {
      // Solde disponible à l'instant T
      const remain = Math.max(0, budget.total - spent);
      // Titre
      const title = 'Fin de période budgétaire imminente';
      // Corps explicatif
      const body = `Votre période ${periodLabel} se termine dans ${diffDays === 0 ? "aujourd'hui" : diffDays === 1 ? '1 jour' : `${diffDays} jours`}. Montant restant disponible : ${money(remain)}. Action conseillée : Préparez dès maintenant votre prochaine période de budget.`;
      // Action recommandée
      const actionRecommended = 'Planifiez vos prochaines enveloppes budgétaires dans le calendrier.';

      // Envoi de la notification réelle sur le smartphone
      sendPhoneNotification({
        title,
        body,
        data: { type: 'period_end', budgetId: budget.id, diffDays },
      });

      // Enregistrement in-app
      onTriggerNotification({
        userId,
        type: 'period_end',
        title,
        body,
        periodLabel,
        periodId: budget.id,
        amountSpent: spent,
        budgetTotal: budget.total,
        actionRecommended,
        isRead: false,
      });
    }
  }
}

/**
 * MISSION DE LA FONCTION : notifyBudgetChange
 *   Envoie une notification sur le smartphone lorsqu'un budget est créé ou modifié.
 * RÔLE DANS L'APPLICATION :
 *   Confirme à l'utilisateur la prise en compte de sa modification de plafond budgétaire.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Une bannière système indiquant la nouvelle enveloppe globale fixée pour la période.
 */
export function notifyBudgetChange(
  userId: string,
  budget: Budget,
  isCreation: boolean,
  onTriggerNotification: (n: Omit<InAppNotification, 'id' | 'createdAt'>) => void
): void {
  // Libellé de la période
  const periodLabel = fmtRange(budget.start, budget.end);
  // Titre de la notification
  const title = isCreation
    ? 'Nouvelle période budgétaire créée'
    : 'Période budgétaire modifiée';
  // Corps détaillé
  const body = `Le budget pour la période ${periodLabel} a été fixé à ${money(budget.total)}. Toutes vos jauges et enveloppes par catégorie sont maintenant actives.`;
  // Action recommandée
  const actionRecommended = 'Consultez votre tableau de bord d’accueil pour suivre vos dépenses sur cette période.';

  // Envoi de la notification réelle sur le téléphone
  sendPhoneNotification({
    title,
    body,
    data: { type: 'budget_change', budgetId: budget.id, total: budget.total },
  });

  // Enregistrement in-app
  onTriggerNotification({
    userId,
    type: 'budget_change',
    title,
    body,
    periodLabel,
    periodId: budget.id,
    amountSpent: 0,
    budgetTotal: budget.total,
    actionRecommended,
    isRead: false,
  });
}
