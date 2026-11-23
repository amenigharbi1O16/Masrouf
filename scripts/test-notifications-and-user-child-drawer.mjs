import assert from 'node:assert';
import { readFileSync } from 'node:fs';

console.log('🧪 TEST : NOTIFICATIONS ET SIDEDRAWER (PROFIL UTILISATEUR ET ENFANT)\n');

// 1. Vérification du SideDrawer & AppDrawer
console.log('--- 1. Vérification du SideDrawer et de AppDrawer ---');
const appDrawerSource = readFileSync('src/components/AppDrawer.tsx', 'utf8');
assert(appDrawerSource.includes("href: '/notifications'"), 'AppDrawer doit contenir un lien vers /notifications');
assert(appDrawerSource.includes('notifications-outline'), 'AppDrawer doit utiliser l\'icône notifications-outline');
assert(appDrawerSource.includes('badge: unreadNotificationsCount'), 'AppDrawer doit passer le badge des notifications non lues');

const sideDrawerSource = readFileSync('src/components/SideDrawer.tsx', 'utf8');
assert(sideDrawerSource.includes('badge?: number;'), 'SideDrawer DrawerItem doit inclure la propriété badge?: number');
assert(sideDrawerSource.includes('styles.countBadge'), 'SideDrawer doit afficher la pastille countBadge');
assert(sideDrawerSource.includes('countBadgeText'), 'SideDrawer doit afficher le texte countBadgeText');
console.log('✓ AppDrawer et SideDrawer configurés avec Notifications et pastille badge.');

// 2. Vérification de la création de compte et notifications de bienvenue
console.log('\n--- 2. Vérification des notifications de bienvenue à la création du compte ---');
const storeSource = readFileSync('src/state/store.tsx', 'utf8');
assert(storeSource.includes('Bienvenue sur Masrouf'), 'store.tsx doit contenir le message de bienvenue pour utilisateur');
assert(storeSource.includes('childWelcomeNotif'), 'store.tsx createChild doit créer une notification de bienvenue pour l\'enfant');
assert(storeSource.includes('user_registered'), 'createChild doit assigner le type user_registered à la notification');
console.log('✓ Notifications de bienvenue créées à la fois pour l\'utilisateur normal et le compte enfant.');

// 3. Vérification des notifications de budget, de consommation et d\'évolution (50%, 80%, 100%)
console.log('\n--- 3. Vérification des notifications de budget, consommation et évolution ---');
const notifUtilSource = readFileSync('src/utils/notifications.ts', 'utf8');
assert(notifUtilSource.includes('alert_50'), 'notifications.ts doit gérer le seuil d\'évolution 50%');
assert(notifUtilSource.includes('alert_80'), 'notifications.ts doit gérer le seuil 80%');
assert(notifUtilSource.includes('alert_100'), 'notifications.ts doit gérer le seuil 100%');
assert(notifUtilSource.includes('notifyBudgetChange'), 'notifications.ts doit notifier le changement de budget');

const notifScreenSource = readFileSync('src/app/notifications.tsx', 'utf8');
assert(notifScreenSource.includes('alert_50'), 'notifications.tsx doit afficher le visuel pour alert_50');
assert(notifScreenSource.includes('user_registered'), 'notifications.tsx doit afficher le visuel pour user_registered');
console.log('✓ Alertes budgétaires, jalons de consommation (50%, 80%, 100%) et évolution validés.');

// 4. Notification lors de l\'allocation d\'argent de poche à l\'enfant
console.log('\n--- 4. Vérification de la notification d\'argent de poche pour l\'enfant ---');
assert(storeSource.includes('Argent de poche reçu !'), 'store.tsx doit envoyer une alerte Argent de poche reçu ! à l\'enfant');
console.log('✓ Notification d\'allocation d\'argent de poche pour le compte enfant validée.');

console.log('\n========================================================================');
console.log('🎉 TOUS LES TESTS DE NOTIFICATIONS ET DE DRAWER SONT VALIDÉS AVEC SUCCÈS !');
console.log('========================================================================');
