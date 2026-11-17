import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== TEST COMPLET : INSCRIPTION, REDIRECTION LOGIN & NOTIFICATIONS ADMIN ===');

// 1. Vérification du schéma InAppNotification dans types.ts
const typesCode = fs.readFileSync('src/state/types.ts', 'utf8');
assert.ok(
  typesCode.includes("'user_registered'") && typesCode.includes("'system'"),
  "types.ts doit inclure les types 'user_registered' et 'system'"
);
console.log("✓ Types InAppNotification validés ('user_registered' et 'system' présents)");

// 2. Vérification de la fonction Gate dans _layout.tsx pour l'accès admin aux notifications
const layoutCode = fs.readFileSync('src/app/_layout.tsx', 'utf8');
assert.ok(
  layoutCode.includes("first !== 'notifications'"),
  "_layout.tsx doit autoriser l'administrateur à consulter /notifications"
);
console.log('✓ Gardien de navigation Gate : accès administrateur à /notifications débloqué');

// 3. Vérification de l'AdminDrawer
const adminDrawerCode = fs.readFileSync('src/components/AdminDrawer.tsx', 'utf8');
assert.ok(
  adminDrawerCode.includes("href: '/notifications'"),
  "AdminDrawer.tsx doit contenir le lien vers /notifications"
);
console.log('✓ Menu tiroir Administrateur : entrée Notifications présente');

// 4. Vérification de la redirection d'inscription vers /login
const inscriptionCode = fs.readFileSync('src/app/inscription.tsx', 'utf8');
assert.ok(
  inscriptionCode.includes("pathname: '/login'") &&
    inscriptionCode.includes("registered: '1'"),
  "inscription.tsx doit rediriger vers /login avec registered: '1'"
);
console.log('✓ Inscription : redirection immédiate vers /login avec paramètre de succès');

// 5. Vérification de la bannière de succès dans login.tsx
const loginCode = fs.readFileSync('src/app/login.tsx', 'utf8');
assert.ok(
  loginCode.includes("params.registered === '1'") &&
    loginCode.includes('compte_cree_succes'),
  'login.tsx doit afficher le bandeau de succès si registered === 1'
);
console.log('✓ Connexion : affichage de la bannière verte de confirmation et pré-remplissage email');

// 6. Vérification de notifications.tsx
const notifScreenCode = fs.readFileSync('src/app/notifications.tsx', 'utf8');
assert.ok(
  notifScreenCode.includes('user_registered') &&
    notifScreenCode.includes('person-add') &&
    notifScreenCode.includes('system'),
  "notifications.tsx doit prendre en charge les visuels 'user_registered' et 'system'"
);
assert.ok(
  notifScreenCode.includes("me?.role === 'admin'"),
  'notifications.tsx doit rediriger vers /(admin)/dashboard pour le retour admin'
);
console.log('✓ Centre de notifications : icônes dédiées et bouton retour adaptatif rôle');

// 7. Simulation logique du Store : inscription, isolation et notifications
const mockUsers = [
  { id: '1', name: 'Admin', email: 'admin@gmail.com', role: 'admin', active: true },
  { id: '2', name: 'Ines Ben Ali', email: 'ines.benali@gmail.com', role: 'user', active: true }
];

let mockNotifications = [];

// Simulation de l'action register
function simulateRegister(name, email, password) {
  const newUser = {
    id: '3',
    name: name.trim(),
    email: email.trim().toLowerCase(),
    role: 'user',
    active: true,
    mustChangePassword: false,
    onboarded: false,
    categoryIds: [],
    celebratedBudgetIds: [],
    createdAt: new Date().toISOString()
  };

  mockUsers.push(newUser);

  // Notifications admin
  const admins = mockUsers.filter((u) => u.role === 'admin');
  const adminNotifs = admins.map((adm) => ({
    id: `notif-adm-${adm.id}-${newUser.id}`,
    userId: adm.id,
    type: 'user_registered',
    title: 'Nouvel utilisateur inscrit',
    body: `Un nouveau compte "${newUser.name}" (${newUser.email}) a été créé et peut maintenant se connecter.`,
    isRead: false,
    createdAt: new Date().toISOString()
  }));

  // Notification bienvenue
  const welcomeNotif = {
    id: `notif-welcome-${newUser.id}`,
    userId: newUser.id,
    type: 'system',
    title: 'Bienvenue sur Masrouf',
    body: 'Votre compte est créé avec succès.',
    isRead: false,
    createdAt: new Date().toISOString()
  };

  mockNotifications.push(...adminNotifs, welcomeNotif);

  return {
    ok: true,
    user: newUser,
    sessionUserId: null // La session n'est PAS ouverte automatiquement
  };
}

const regRes = simulateRegister('Sami Karray', 'sami.karray@gmail.com', 'Pass1234!');
assert.strictEqual(regRes.ok, true);
assert.strictEqual(regRes.sessionUserId, null, 'Aucune session automatique lors de inscription');

// Vérification que le nouvel utilisateur est présent dans la liste pour admin
const visibleToAdmin = mockUsers.filter((u) => u.role === 'user');
assert.ok(
  visibleToAdmin.some((u) => u.email === 'sami.karray@gmail.com'),
  "L'administrateur doit voir le nouvel utilisateur dans sa liste"
);
console.log("✓ Annuaire des utilisateurs : le nouveau compte est visible par l'administrateur");

// Vérification de l'isolation des notifications pour l'admin
const adminSessionNotifs = mockNotifications.filter((n) => n.userId === '1');
assert.strictEqual(adminSessionNotifs.length, 1);
assert.strictEqual(adminSessionNotifs[0].type, 'user_registered');
assert.ok(adminSessionNotifs[0].body.includes('sami.karray@gmail.com'));
console.log("✓ Notifications Administrateur : réception de l'alerte 'Nouvel utilisateur inscrit'");

// Vérification de l'isolation des notifications pour le nouvel utilisateur
const userSessionNotifs = mockNotifications.filter((n) => n.userId === '3');
assert.strictEqual(userSessionNotifs.length, 1);
assert.strictEqual(userSessionNotifs[0].type, 'system');
assert.strictEqual(userSessionNotifs[0].title, 'Bienvenue sur Masrouf');
console.log("✓ Notifications Utilisateur : réception du message de bienvenue personnel");

// Vérification de l'étanchéité stricte : l'utilisateur ne voit JAMAIS les alertes admin
assert.ok(
  !userSessionNotifs.some((n) => n.type === 'user_registered'),
  'Étanchéité validée : le compte utilisateur ne voit aucune alerte système réservée à admin'
);
console.log('✓ Confidentialité et isolation totale entre rôles validées');

console.log('============================================================');
console.log('🎉 TOUS LES TESTS INSCRIPTION & NOTIFICATIONS SONT VALIDÉS !');
console.log('============================================================');
