import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== TEST DE VÉRIFICATION : NOTIFICATIONS SUR LE TÉLÉPHONE (SON, BANNIÈRE & BADGE +1) ===');

// 1. Vérification de app.json (permissions Android et plugin expo-notifications)
const appJson = JSON.parse(fs.readFileSync('app.json', 'utf8'));
const androidPerms = appJson.expo.android?.permissions || [];
assert.ok(androidPerms.includes('POST_NOTIFICATIONS'), "app.json doit inclure 'POST_NOTIFICATIONS' dans android.permissions");
assert.ok(androidPerms.includes('VIBRATE'), "app.json doit inclure 'VIBRATE' dans android.permissions");
const plugins = appJson.expo.plugins || [];
const hasNotifPlugin = plugins.some(
  (p) => p === 'expo-notifications' || (Array.isArray(p) && p[0] === 'expo-notifications')
);
assert.ok(hasNotifPlugin, "app.json doit inclure le plugin 'expo-notifications'");
console.log('✓ app.json : Permissions POST_NOTIFICATIONS/VIBRATE et plugin expo-notifications configurés');

// 2. Vérification de src/utils/notifications.ts
const notifUtilCode = fs.readFileSync('src/utils/notifications.ts', 'utf8');
assert.ok(notifUtilCode.includes('initNotificationChannels'), "initNotificationChannels doit être présent");
assert.ok(notifUtilCode.includes("sound: 'default'"), "Le canal Android et les notifications doivent spécifier sound: 'default'");
assert.ok(notifUtilCode.includes('showBadge: true'), "Le canal Android doit spécifier showBadge: true pour afficher la pastille");
assert.ok(notifUtilCode.includes('AndroidImportance.MAX'), "Le canal Android doit être configuré en importance MAX pour afficher la bannière flottante");
assert.ok(notifUtilCode.includes('setBadgeCountAsync'), "sendPhoneNotification doit appeler setBadgeCountAsync pour le badge +1");
assert.ok(notifUtilCode.includes('syncPhoneBadgeCount'), "syncPhoneBadgeCount doit être exporté pour synchroniser les badges");
console.log('✓ src/utils/notifications.ts : Canal Android MAX, son activé, affichage bannière et badge (+1) gérés');

// 3. Vérification de src/state/store.tsx
const storeCode = fs.readFileSync('src/state/store.tsx', 'utf8');
assert.ok(storeCode.includes('sendPhoneNotification'), "store.tsx doit importer et utiliser sendPhoneNotification");
assert.ok(storeCode.includes('syncPhoneBadgeCount(unreadNotificationsCount)'), "store.tsx doit synchroniser le badge du téléphone avec unreadNotificationsCount");
assert.ok(storeCode.includes("data: { type: 'user_registered'"), "store.tsx doit envoyer la notification au téléphone pour l'admin");
assert.ok(storeCode.includes("data: { type: 'system', userId: savedUser.id }"), "store.tsx doit envoyer la notification de bienvenue au téléphone pour l'utilisateur");
console.log('✓ src/state/store.tsx : Notifications smartphone transmises à l’administrateur et au nouvel inscrit');

// 4. Vérification de notifications.tsx : écran épuré sans bouton de test ni bannière
const notifScreenCode = fs.readFileSync('src/app/notifications.tsx', 'utf8');
assert.ok(!notifScreenCode.includes('tester_notification'), "notifications.tsx ne doit plus afficher le bouton de test sonore (retiré à la demande de l'utilisateur)");
assert.ok(!notifScreenCode.includes('notif_banner_info'), "notifications.tsx ne doit plus afficher la bannière informative technique (retirée à la demande de l'utilisateur)");
assert.ok(notifScreenCode.includes('unreadNotificationsCount'), "notifications.tsx doit gérer le statut des notifications non lues");
console.log('✓ src/app/notifications.tsx : Écran épuré et propre (bannière informative et bouton de test sonore retirés avec succès)');

// 5. Vérification i18n
const fr = JSON.parse(fs.readFileSync('src/i18n/fr.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('src/i18n/ar.json', 'utf8'));
assert.ok(fr.tester_notification && en.tester_notification && ar.tester_notification, "La clé tester_notification doit être présente en FR, EN, AR");
assert.ok(fr.test_notif_titre && en.test_notif_titre && ar.test_notif_titre, "La clé test_notif_titre doit être présente en FR, EN, AR");
console.log('✓ i18n : Clés de test sonore multilingues présentes dans les 3 langues');

console.log('============================================================');
console.log('🎉 TOUS LES TESTS DE NOTIFICATIONS TÉLÉPHONE SONT VALIDÉS !');
console.log('============================================================');
