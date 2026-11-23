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
// Détection de l'environnement d'exécution (Expo Go vs build autonome)
import Constants, { ExecutionEnvironment } from 'expo-constants';
// Détection de la plateforme d'exécution (Android, iOS ou Web)
import { Platform } from 'react-native';
// Types métier TypeScript de l'application
import type { Budget, Category, DB, Expense, InAppNotification, Product, Purchase } from '@/state/types';
// Fonctions utilitaires de calcul monétaire et de formatage
import { fmtRange, money, todayISO } from './format';

// ------------------------------------------------------------
// CONFIGURATION DU COMPORTEMENT VISUEL DES NOTIFICATIONS
// ------------------------------------------------------------
// Définit comment le système d'exploitation présente la notification lorsque l'app est active au premier plan.
// Garde stricte : exécuté uniquement sur mobile (Android / iOS), jamais sur Web.
if (Platform.OS !== 'web') {
  try {
    // Configuration globale d'affichage des notifications réelles sur smartphone
    Notifications.setNotificationHandler({
      // Fonction asynchrone déterminant les options d'affichage natives
      handleNotification: async () => ({
        // Émet le signal sonore par défaut de l'appareil
        shouldPlaySound: true,
        // Met à jour la pastille numérique (badge) sur l'icône de l'application
        shouldSetBadge: true,
        // Affiche la bannière popup en haut de l'écran (nouvelle API Expo Notifications)
        shouldShowBanner: true,
        // Intègre l'alerte dans la liste du tiroir des notifications système (nouvelle API Expo Notifications)
        shouldShowList: true,
        // Priorité maximale pour garantir l'affichage immédiat
        priority: Notifications.AndroidNotificationPriority.MAX,
      } as any),
    });
  } catch (e) {
    // Journalisation discrète si non supporté sur l'environnement
    console.warn('[Notifications] setNotificationHandler notice:', e);
  }
}

// Variable booléenne au niveau module garantissant que la création du canal Android n'est exécutée qu'une seule fois
let channelInitAttempted = false;

/**
 * MISSION DE LA FONCTION : initNotificationChannels
 *   Crée et configure le canal de notification Android pour garantir une sonnerie et une priorité maximale.
 * RÔLE DANS L'APPLICATION :
 *   Sur Android 8.0+, chaque notification doit obligatoirement être rattachée à un canal système.
 *   Exécutée une seule et unique fois, protégée par try/catch pour Expo Go sur Android.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Définit le nom du canal ("Alertes Masrouf") visible dans les paramètres système du téléphone.
 */
export async function initNotificationChannels(): Promise<void> {
  // Exclusion stricte : exécuté uniquement sur Android, et une seule fois au total
  if (Platform.OS !== 'android' || channelInitAttempted) return;
  // Marque immédiatement le canal comme tenté pour éviter les appels concurrents ou répétés
  channelInitAttempted = true;

  // Détection Expo Go : passer la configuration du canal sous Expo Go pour éviter les avertissements et instabilités
  const isExpoGo =
    Constants.appOwnership === 'expo' ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  if (isExpoGo) return;

  try {
    // Enregistrement du canal Android haute importance avec son et badge
    await Notifications.setNotificationChannelAsync('masrouf_budget', {
      // Nom lisible affiché dans les paramètres du téléphone
      name: 'Alertes Masrouf',
      // Description détaillée du canal
      description: 'Notifications pour seuils de budget (80%, 100%), fin de période, inscriptions et alertes système.',
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
      // Active le son par défaut
      sound: 'default',
      // Affiche la pastille badge (+1)
      showBadge: true,
      // Visibilité sur l'écran verrouillé
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      // Ne contourne pas Ne Pas Déranger
      bypassDnd: false,
    });
  } catch (err) {
    // Protégé par try/catch sans polluer la console ni bloquer l'application
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
      // Demande d'alerte visuelle, sonore et de badge
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
 *   Envoie une véritable notification locale sur le smartphone de l'utilisateur avec son, vibration et badge.
 * RÔLE DANS L'APPLICATION :
 *   Fait vibrer et sonner le téléphone avec le titre et le message financier explicatif, et incrémente le badge (+1).
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Une bannière système native flottante en haut de l'écran du smartphone et une pastille +1 sur l'icône de l'app.
 */
export async function sendPhoneNotification(params: {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}): Promise<string | null> {
  // En environnement Web, simulation en console uniquement
  if (Platform.OS === 'web') {
    console.log('[NOTIFICATION-WEB]', params.title, params.body);
    return null;
  }

  try {
    // Calcul et incrément de la pastille badge (+1)
    let nextBadge = params.badge;
    if (typeof nextBadge !== 'number') {
      try {
        const currentBadge = await Notifications.getBadgeCountAsync();
        nextBadge = (currentBadge || 0) + 1;
      } catch {
        nextBadge = 1;
      }
    }

    // Mise à jour de la pastille badge système sur l'icône de l'application
    try {
      await Notifications.setBadgeCountAsync(nextBadge);
    } catch (e) {
      console.warn('Set badge error:', e);
    }

    // Assurer l'existence et la configuration haute importance du canal Android
    if (Platform.OS === 'android') {
      await initNotificationChannels();
    }

    // Déclenchement immédiat de la notification locale sur le smartphone avec son et bannière
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: params.data ?? {},
        sound: 'default',
        badge: nextBadge,
        vibrate: [0, 250, 250, 250],
        priority: 'max',
        color: '#1B4332',
      } as any,
      trigger: Platform.OS === 'android' ? ({ channelId: 'masrouf_budget' } as any) : null,
    });
    return id;
  } catch (err) {
    console.warn('Notification schedule error:', err);
    return null;
  }
}

/**
 * MISSION DE LA FONCTION : syncPhoneBadgeCount
 *   Synchronise la pastille numérique de l'icône de l'application avec le nombre réel d'alertes non lues.
 */
export async function syncPhoneBadgeCount(count: number): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch (err) {
    // Silencieux
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
  purchases?: Purchase[];
  expenses?: Expense[];
  categories?: Category[];
  products?: Product[];
}

/**
 * MISSION DE LA FONCTION : evaluateBudgetAlerts
 *   Analyse mathématiquement l'état d'un budget par rapport aux dépenses réelles
 *   et déclenche les notifications sur le smartphone pour les événements clés :
 *   1. Seuil de 80% atteint au niveau global (alerte préventive).
 *   2. Seuil de 100% dépassé au niveau global (alerte critique de dépassement).
 *   3. Fin de période imminente (dans les 3 derniers jours).
 *   4. Alertes par catégorie allouée : 80% et 100% / dépassement de l'enveloppe de catégorie.
 *
 * RÔLE DANS L'APPLICATION :
 *   Surveille en permanence le budget sélectionné lors de chaque ajout ou modification de transaction.
 *   Empêche les doublons en vérifiant la liste des notifications déjà émises pour ce cycle.
 */
export function evaluateBudgetAlerts({
  userId,
  budget,
  spent,
  existingNotifications,
  onTriggerNotification,
  purchases,
  expenses,
  categories,
  products,
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
      const title = 'Dépassement de budget : 100% franchi ⚠️';
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
    }
  } else if (ratio >= 0.8) {
    // ------------------------------------------------------------
    // CAS 2 : ALERTE 80% DU BUDGET ATTEINT (Prévention)
    // ------------------------------------------------------------
    const alreadySent80 = existingNotifications.some(
      (n) => n.userId === userId && n.periodId === budget.id && n.type === 'alert_80'
    );

    if (!alreadySent80) {
      const remain = budget.total - spent;
      const title = 'Seuil d’alerte : 80% du budget atteint 🔔';
      const body = `Période ${periodLabel} : Vous avez consommé ${(ratio * 100).toFixed(1)}% de votre budget (${money(spent)} sur ${money(budget.total)}). Il vous reste ${money(remain)}. Action conseillée : Modérez vos dépenses quotidiennes pour terminer la période sereinement.`;
      const actionRecommended = 'Surveillez vos achats au supermarché et privilégiez les produits essentiels.';

      sendPhoneNotification({
        title,
        body,
        data: { type: 'alert_80', budgetId: budget.id, spent, total: budget.total },
      });

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
  } else if (ratio >= 0.5) {
    // ------------------------------------------------------------
    // CAS 2b : ÉVOLUTION DE LA CONSOMMATION : 50% DU BUDGET ATTEINT
    // ------------------------------------------------------------
    const alreadySent50 = existingNotifications.some(
      (n) => n.userId === userId && n.periodId === budget.id && n.type === 'alert_50'
    );

    if (!alreadySent50) {
      const remain = budget.total - spent;
      const title = 'Évolution du budget : 50% consommé 📊';
      const body = `Période ${periodLabel} : Vous avez atteint la moitié de votre budget (${(ratio * 100).toFixed(0)}% consommé, soit ${money(spent)} sur ${money(budget.total)}). Il vous reste ${money(remain)} pour la suite.`;
      const actionRecommended = 'Votre rythme de consommation est bien maîtrisé. Continuez à suivre vos dépenses.';

      sendPhoneNotification({
        title,
        body,
        data: { type: 'alert_50', budgetId: budget.id, spent, total: budget.total },
      });

      onTriggerNotification({
        userId,
        type: 'alert_50',
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
  const dToday = new Date(today);
  const dEnd = new Date(budget.end);
  const diffDays = Math.ceil((dEnd.getTime() - dToday.getTime()) / (1000 * 3600 * 24));

  if (diffDays >= 0 && diffDays <= 3 && today >= budget.start) {
    const alreadySentEnd = existingNotifications.some(
      (n) => n.userId === userId && n.periodId === budget.id && n.type === 'period_end'
    );

    if (!alreadySentEnd) {
      const remain = Math.max(0, budget.total - spent);
      const title = 'Fin de période budgétaire imminente ⏳';
      const body = `Votre période ${periodLabel} se termine dans ${diffDays === 0 ? "aujourd'hui" : diffDays === 1 ? '1 jour' : `${diffDays} jours`}. Montant restant disponible : ${money(remain)}. Action conseillée : Préparez dès maintenant votre prochaine période de budget.`;
      const actionRecommended = 'Planifiez vos prochaines enveloppes budgétaires dans le calendrier.';

      sendPhoneNotification({
        title,
        body,
        data: { type: 'period_end', budgetId: budget.id, diffDays },
      });

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

  // ------------------------------------------------------------
  // CAS 4 : ALERTES SUR LES ENVELOPPES ALLOUÉES AUX CATÉGORIES
  // ------------------------------------------------------------
  if (budget.allocations && purchases && expenses) {
    for (const [catId, allocAmount] of Object.entries(budget.allocations)) {
      const allocated = Number(allocAmount) || 0;
      if (allocated <= 0) continue;

      const catObj = categories?.find((c) => c.id === catId);
      const catName = catObj?.name || catId;

      // Calcul des dépenses pour cette catégorie dans cette période
      const pCat = purchases
        .filter((p) => {
          if (p.userId !== userId || p.date < budget.start || p.date > budget.end) return false;
          const prod = products?.find((pr) => pr.id === p.productId);
          return prod?.categoryId === catId;
        })
        .reduce((sum, p) => sum + p.price, 0);

      const eCat = expenses
        .filter((e) => e.userId === userId && e.date >= budget.start && e.date <= budget.end && e.categoryId === catId)
        .reduce((sum, e) => sum + e.amount, 0);

      const totalCatSpent = pCat + eCat;
      const catRatio = totalCatSpent / allocated;

      // 4A : Dépassement de l'enveloppe allouée à la catégorie (100% franchi)
      if (catRatio >= 1.0) {
        const alreadySentCat100 = existingNotifications.some(
          (n) =>
            n.userId === userId &&
            n.periodId === budget.id &&
            n.type === 'category_alert_100' &&
            (n.categoryId === catId || n.body.includes(`"${catName}"`))
        );

        if (!alreadySentCat100) {
          const over = totalCatSpent - allocated;
          const title = `Dépassement : Catégorie "${catName}" ⚠️`;
          const body = `Période ${periodLabel} : Le budget alloué à "${catName}" (${money(allocated)}) a été dépassé de ${money(over)} (Dépensé : ${money(totalCatSpent)}). Pensez à rééquilibrer vos dépenses.`;
          const actionRecommended = `Ajustez vos allocations ou limitez les prochains achats dans le rayon ${catName}.`;

          sendPhoneNotification({
            title,
            body,
            data: { type: 'category_alert_100', budgetId: budget.id, categoryId: catId, totalCatSpent, allocated },
          });

          onTriggerNotification({
            userId,
            type: 'category_alert_100',
            title,
            body,
            periodLabel,
            periodId: budget.id,
            categoryId: catId,
            categoryName: catName,
            amountSpent: totalCatSpent,
            budgetTotal: allocated,
            actionRecommended,
            isRead: false,
          });
        }
      } else if (catRatio >= 0.8) {
        // 4B : Seuil d'alerte préventif de 80% sur l'enveloppe de catégorie
        const alreadySentCat80 = existingNotifications.some(
          (n) =>
            n.userId === userId &&
            n.periodId === budget.id &&
            n.type === 'category_alert_80' &&
            (n.categoryId === catId || n.body.includes(`"${catName}"`))
        );

        if (!alreadySentCat80) {
          const remain = allocated - totalCatSpent;
          const title = `Alerte 80% : Catégorie "${catName}" 🔔`;
          const body = `Période ${periodLabel} : Vous avez consommé ${(catRatio * 100).toFixed(0)}% du budget alloué à "${catName}" (${money(totalCatSpent)} sur ${money(allocated)}). Il vous reste ${money(remain)}.`;
          const actionRecommended = `Surveillez vos achats dans la catégorie ${catName} pour ne pas dépasser votre enveloppe.`;

          sendPhoneNotification({
            title,
            body,
            data: { type: 'category_alert_80', budgetId: budget.id, categoryId: catId, totalCatSpent, allocated },
          });

          onTriggerNotification({
            userId,
            type: 'category_alert_80',
            title,
            body,
            periodLabel,
            periodId: budget.id,
            categoryId: catId,
            categoryName: catName,
            amountSpent: totalCatSpent,
            budgetTotal: allocated,
            actionRecommended,
            isRead: false,
          });
        }
      }
    }
  }
}

// Variables anti-rebond pour éviter le spam lors d'enregistrements rapides
let lastBudgetNotifyKey = '';
let lastBudgetNotifyTime = 0;

/**
 * MISSION DE LA FONCTION : notifyBudgetChange
 *   Envoie une notification sur le smartphone lorsqu'un budget est créé ou modifié.
 * RÔLE DANS L'APPLICATION :
 *   Confirme à l'utilisateur la prise en compte de sa modification de plafond budgétaire.
 */
export function notifyBudgetChange(
  userId: string,
  budget: Budget,
  isCreation: boolean,
  onTriggerNotification: (n: Omit<InAppNotification, 'id' | 'createdAt'>) => void
): void {
  const now = Date.now();
  const key = `${userId}_${budget.id}_${budget.total}_${isCreation}`;
  if (key === lastBudgetNotifyKey && now - lastBudgetNotifyTime < 2500) {
    return;
  }
  lastBudgetNotifyKey = key;
  lastBudgetNotifyTime = now;

  const periodLabel = fmtRange(budget.start, budget.end);
  const title = isCreation
    ? 'Nouvelle période budgétaire créée 📅'
    : 'Période budgétaire modifiée 🔄';
  
  const allocCount = Object.keys(budget.allocations || {}).filter((k) => (budget.allocations?.[k] ?? 0) > 0).length;
  const allocInfo = allocCount > 0 ? ` réparti sur ${allocCount} catégorie(s)` : '';
  const body = `Le budget pour la période ${periodLabel} a été fixé à ${money(budget.total)}${allocInfo}. Toutes vos jauges et enveloppes sont actives.`;
  const actionRecommended = 'Consultez votre tableau de bord d’accueil pour suivre l’évolution de vos dépenses.';

  sendPhoneNotification({
    title,
    body,
    data: { type: 'budget_change', budgetId: budget.id, total: budget.total },
  });

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

/**
 * MISSION DE LA FONCTION : notifyNewPurchase
 *   Envoie une notification lorsqu'un nouvel achat de produit est enregistré.
 */
export function notifyNewPurchase({
  userId,
  productName,
  categoryName,
  price,
  store,
  onTriggerNotification,
}: {
  userId: string;
  productName: string;
  categoryName: string;
  price: number;
  store?: string;
  onTriggerNotification: (n: Omit<InAppNotification, 'id' | 'createdAt'>) => void;
}): void {
  const title = 'Nouvel achat enregistré 🛒';
  const storeInfo = store ? ` chez ${store}` : '';
  const body = `Achat de "${productName}" (${money(price)})${storeInfo} dans la catégorie "${categoryName}" ajouté à vos dépenses.`;
  const actionRecommended = 'Vos jauges de consommation ont été actualisées en temps réel.';

  sendPhoneNotification({
    title,
    body,
    data: { type: 'new_purchase', price, productName, categoryName },
  });

  onTriggerNotification({
    userId,
    type: 'new_purchase',
    title,
    body,
    categoryName,
    amountSpent: price,
    actionRecommended,
    isRead: false,
  });
}

/**
 * MISSION DE LA FONCTION : notifyNewExpense
 *   Envoie une notification lorsqu'une nouvelle dépense directe est enregistrée.
 */
export function notifyNewExpense({
  userId,
  title: expenseTitle,
  categoryName,
  amount,
  onTriggerNotification,
}: {
  userId: string;
  title: string;
  categoryName: string;
  amount: number;
  onTriggerNotification: (n: Omit<InAppNotification, 'id' | 'createdAt'>) => void;
}): void {
  const notifTitle = 'Nouvelle dépense enregistrée 🧾';
  const body = `Dépense de "${expenseTitle}" (${money(amount)}) dans la catégorie "${categoryName}" ajoutée à votre consommation.`;
  const actionRecommended = 'Votre solde et vos jauges budgétaires ont été mis à jour.';

  sendPhoneNotification({
    title: notifTitle,
    body,
    data: { type: 'new_expense', amount, title: expenseTitle, categoryName },
  });

  onTriggerNotification({
    userId,
    type: 'new_expense',
    title: notifTitle,
    body,
    categoryName,
    amountSpent: amount,
    actionRecommended,
    isRead: false,
  });
}
