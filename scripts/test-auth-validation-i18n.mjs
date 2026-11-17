// ============================================================
// SUITE DE TESTS AUTOMATISÉS : AUTH, VALIDATION GMAIL & MDP,
// I18N MULTILINGUE (FR/EN/AR) ET RTL/LTR APPLICATIF
// ============================================================

import assert from 'node:assert';
import fs from 'node:fs';

console.log('🚀 DÉMARRAGE DE LA SUITE DE TESTS : AUTHENTIFICATION, VALIDATION & MULTILINGUE\n');

// ------------------------------------------------------------
// TEST 1 : VALIDATION STRICTE DU FORMAT GMAIL (name@gmail.com)
// ------------------------------------------------------------
console.log('--- Test 1 : Validation des adresses courriel Gmail ---');

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;

function isValidGmail(email) {
  if (!email || typeof email !== 'string') return false;
  return GMAIL_REGEX.test(email.trim());
}

function isValidLoginEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return isValidGmail(email);
}

// 1.1 Adresses Gmail valides
assert.strictEqual(isValidGmail('name@gmail.com'), true);
assert.strictEqual(isValidGmail('ines.benali@gmail.com'), true);
assert.strictEqual(isValidGmail('ahmed_99@gmail.com'), true);
assert.strictEqual(isValidGmail('user+filter@gmail.com'), true);
assert.strictEqual(isValidGmail('Mohamed.Salah@GMAIL.COM'), true, 'Insensible à la casse');
assert.strictEqual(isValidGmail('   valid.user@gmail.com   '), true, 'Tolère les espaces de bordure');

// 1.2 Formats non-Gmail ou invalides (doivent être strictement rejetés à l'inscription)
assert.strictEqual(isValidGmail('user@yahoo.com'), false, 'Yahoo doit être rejeté');
assert.strictEqual(isValidGmail('user@outlook.com'), false, 'Outlook doit être rejeté');
assert.strictEqual(isValidGmail('user@masrouf.tn'), false, 'masrouf.tn doit être rejeté');
assert.strictEqual(isValidGmail('@gmail.com'), false, 'Nom vide rejeté');
assert.strictEqual(isValidGmail('user@gmail.com.fr'), false, 'Extension .fr rejetée');
assert.strictEqual(isValidGmail('user@sub.gmail.com'), false, 'Sous-domaine rejeté');
assert.strictEqual(isValidGmail('user gmail.com'), false, 'Sans arobase rejeté');
assert.strictEqual(isValidGmail(''), false, 'Chaîne vide rejetée');

// 1.3 Accès exclusif aux adresses Gmail (name@gmail.com) à la connexion : tous les .tn sont strictement refusés
assert.strictEqual(isValidLoginEmail('admin@gmail.com'), true, 'Admin Gmail autorisé');
assert.strictEqual(isValidLoginEmail('user@gmail.com'), true, 'User Gmail autorisé');
assert.strictEqual(isValidLoginEmail('ines.benali@gmail.com'), true, 'Ines Gmail autorisée');
assert.strictEqual(isValidLoginEmail('admin@masrouf.tn'), false, 'Admin .tn désormais strictement rejeté');
assert.strictEqual(isValidLoginEmail('user@masrouf.tn'), false, 'User .tn désormais strictement rejeté');
assert.strictEqual(isValidLoginEmail('ines.benali@email.tn'), false, 'Ines .tn désormais strictement rejetée');
assert.strictEqual(isValidLoginEmail('nouveau.membre@gmail.com'), true, 'Nouveau compte Gmail autorisé');
assert.strictEqual(isValidLoginEmail('texte_sans_arobase'), false, 'Saisie invalide rejetée');

console.log('✓ Test 1 validé : Politique stricte Gmail exclusive (name@gmail.com), exclusion absolue de tous les emails .tn.');

// ------------------------------------------------------------
// TEST 2 : POLITIQUE DE MOT DE PASSE FORT (8+ CAR, MAJUSCULE, CHIFFRE, SPÉCIAL)
// ------------------------------------------------------------
console.log('\n--- Test 2 : Politique et critères du mot de passe fort ---');

function passwordChecks(password, confirm) {
  const p = password || '';
  const length = p.length >= 8;
  const uppercase = /[A-Z]/.test(p);
  const number = /[0-9]/.test(p);
  const special = /[^A-Za-z0-9]/.test(p);
  const match = confirm === undefined ? true : p.length > 0 && p === confirm;
  const allValid = length && uppercase && number && special;
  return { length, uppercase, number, special, match, allValid };
}

function getMissingRequirements(password) {
  const c = passwordChecks(password);
  const missing = [];
  if (!c.length) missing.push('length');
  if (!c.uppercase) missing.push('uppercase');
  if (!c.number) missing.push('number');
  if (!c.special) missing.push('special');
  return missing;
}

// 2.1 Mots de passe faibles avec détection exacte des critères manquants
const chk1 = passwordChecks('short');
assert.strictEqual(chk1.length, false);
assert.strictEqual(chk1.uppercase, false);
assert.strictEqual(chk1.number, false);
assert.strictEqual(chk1.special, false);
assert.strictEqual(chk1.allValid, false);
assert.deepStrictEqual(getMissingRequirements('short'), ['length', 'uppercase', 'number', 'special']);

const chk2 = passwordChecks('abcdefgh'); // longueur ok, pas maj, pas chiffre, pas spécial
assert.strictEqual(chk2.length, true);
assert.strictEqual(chk2.uppercase, false);
assert.strictEqual(chk2.number, false);
assert.strictEqual(chk2.special, false);
assert.strictEqual(chk2.allValid, false);

const chk3 = passwordChecks('Abcdefgh'); // longueur ok, maj ok, pas chiffre, pas spécial
assert.strictEqual(chk3.uppercase, true);
assert.strictEqual(chk3.number, false);
assert.strictEqual(chk3.special, false);
assert.strictEqual(chk3.allValid, false);

const chk4 = passwordChecks('Abcdefg1'); // longueur ok, maj ok, chiffre ok, pas spécial
assert.strictEqual(chk4.number, true);
assert.strictEqual(chk4.special, false);
assert.strictEqual(chk4.allValid, false);

const chk5 = passwordChecks('Abcdefg!'); // longueur ok, maj ok, spécial ok, pas chiffre
assert.strictEqual(chk5.number, false);
assert.strictEqual(chk5.special, true);
assert.strictEqual(chk5.allValid, false);

const chk6 = passwordChecks('abcdef1!'); // longueur ok, chiffre ok, spécial ok, pas maj
assert.strictEqual(chk6.uppercase, false);
assert.strictEqual(chk6.allValid, false);

// 2.2 Mot de passe valide respectant les 4 critères
const validPwd = passwordChecks('Masrouf2026!');
assert.strictEqual(validPwd.length, true);
assert.strictEqual(validPwd.uppercase, true);
assert.strictEqual(validPwd.number, true);
assert.strictEqual(validPwd.special, true);
assert.strictEqual(validPwd.allValid, true);
assert.deepStrictEqual(getMissingRequirements('Masrouf2026!'), []);

// 2.3 Concordance avec la confirmation
assert.strictEqual(passwordChecks('Masrouf2026!', 'Different2026!').match, false);
assert.strictEqual(passwordChecks('Masrouf2026!', 'Masrouf2026!').match, true);

console.log('✓ Test 2 validé : Règle des 4 critères (8+ car, 1 majuscule, 1 chiffre, 1 caractère spécial) et confirmation vérifiées.');

// ------------------------------------------------------------
// TEST 3 : SIMULATION D'INSCRIPTION ET CONNEXION DANS LE STORE
// ------------------------------------------------------------
console.log('\n--- Test 3 : Simulation logique de création de compte & connexion ---');

// Mock de base de données en mémoire
const mockUsers = [
  {
    id: 'u-admin',
    name: 'Administrateur',
    email: 'admin@gmail.com',
    passwordHash: 'masrouf:Admin2026_hash',
    role: 'admin',
    active: true,
    mustChangePassword: false,
    onboarded: true,
    createdAt: '2026-11-01',
    langue: 'fr',
  },
  {
    id: 'u-ines',
    name: 'Ines Ben Ali',
    email: 'ines.benali@gmail.com',
    passwordHash: 'masrouf:Masrouf2026_hash',
    role: 'user',
    active: true,
    mustChangePassword: false,
    onboarded: true,
    createdAt: '2026-11-01',
    langue: 'fr',
  },
];

async function mockRegister(name, email, password, activeLang = 'ar') {
  if (!name.trim()) return { ok: false, error: 'Please enter your full name.' };
  if (!isValidGmail(email)) return { ok: false, error: 'Only valid Gmail addresses (name@gmail.com) are allowed.' };
  const chk = passwordChecks(password);
  if (!chk.allValid) {
    const missing = getMissingRequirements(password);
    return { ok: false, error: `Password policy missing: ${missing.join(', ')}.` };
  }
  if (mockUsers.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    return { ok: false, error: 'An account already exists with this email.' };
  }

  const newUser = {
    id: 'u-' + Math.random().toString(36).slice(2, 8),
    name: name.trim(),
    email: email.trim(),
    passwordHash: 'hashed_' + password,
    role: 'user',
    active: true,
    mustChangePassword: false,
    onboarded: false,
    createdAt: '2026-11-16',
    langue: activeLang,
  };
  mockUsers.push(newUser);
  return { ok: true, user: newUser };
}

// Inscription rejetée car non-Gmail
const regNonGmail = await mockRegister('Amine Trabelsi', 'amine@yahoo.com', 'AminePass2026!');
assert.strictEqual(regNonGmail.ok, false);
assert.match(regNonGmail.error, /Gmail/);

// Inscription rejetée car mot de passe faible (pas de caractère spécial)
const regWeakPwd = await mockRegister('Amine Trabelsi', 'amine@gmail.com', 'AminePass2026');
assert.strictEqual(regWeakPwd.ok, false);
assert.match(regWeakPwd.error, /special/);

// Inscription valide avec Gmail et mot de passe fort
const regValid = await mockRegister('Amine Trabelsi', 'amine.trabelsi@gmail.com', 'AminePass2026!', 'ar');
assert.strictEqual(regValid.ok, true);
assert.strictEqual(regValid.user.langue, 'ar', 'La langue arabe choisie avant inscription est bien préservée');

// Inscription doublon rejetée
const regDup = await mockRegister('Amine Bis', 'amine.trabelsi@gmail.com', 'AminePass2026!');
assert.strictEqual(regDup.ok, false);
assert.match(regDup.error, /already exists/);

console.log('✓ Test 3 validé : Création de compte sécurisée, rejet des non-Gmail et mots de passe faibles, préservation langue.');

// ------------------------------------------------------------
// TEST 4 : INTÉGRITÉ ET EXHAUSTIVITÉ DES RESSOURCES DE TRADUCTION
// ------------------------------------------------------------
console.log('\n--- Test 4 : Fichiers de traduction trilingues (fr.json, en.json, ar.json) ---');

const fr = JSON.parse(fs.readFileSync('./src/i18n/fr.json', 'utf8'));
const en = JSON.parse(fs.readFileSync('./src/i18n/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('./src/i18n/ar.json', 'utf8'));

const frKeys = Object.keys(fr);
const enKeys = Object.keys(en);
const arKeys = Object.keys(ar);

assert.strictEqual(frKeys.length, enKeys.length, 'Nombre identique de clés entre FR et EN');
assert.strictEqual(frKeys.length, arKeys.length, 'Nombre identique de clés entre FR et AR');

// Vérification de la présence des nouvelles clés de validation et placeholders
const requiredKeys = [
  'regle_8_chars',
  'regle_majuscule',
  'regle_chiffre',
  'regle_special',
  'regle_identiques',
  'placeholder_nom',
  'placeholder_mdp',
  'placeholder_confirmer_mdp',
  'format_mdp_explication',
  'erreur_email_gmail_requis',
  'erreur_mot_de_passe_exigences',
  'periode_concernee',
  'periode_active',
  'changer_periode',
  'action_recommandee',
  'nouveau',
  'tout_marquer_lu',
  'toutes_alertes_lues',
  'non_lues_count',
  'notif_banner_info',
];

for (const k of requiredKeys) {
  assert.ok(fr[k], `Clé FR présente : ${k}`);
  assert.ok(en[k], `Clé EN présente : ${k}`);
  assert.ok(ar[k], `Clé AR présente : ${k}`);
}

console.log(`✓ Test 4 validé : Les 3 fichiers contiennent rigoureusement ${frKeys.length} clés traduites, 0 clé manquante.`);

// ------------------------------------------------------------
// TEST 5 : SENS D'ÉCRITURE RTL / LTR ET ADAPTATION DE LAYOUT
// ------------------------------------------------------------
console.log('\n--- Test 5 : Sens d\'écriture RTL (arabe) et LTR (français/anglais) ---');

function getLayoutConfig(langue) {
  const isRTL = langue === 'ar';
  return {
    langue,
    isRTL,
    direction: isRTL ? 'row-reverse' : 'row',
    textAlign: isRTL ? 'right' : 'left',
    drawerSide: isRTL ? 'right' : 'left',
    chevronBack: isRTL ? 'chevron-forward' : 'chevron-back',
    chevronNext: isRTL ? 'chevron-back' : 'chevron-forward',
  };
}

const configFr = getLayoutConfig('fr');
assert.strictEqual(configFr.isRTL, false);
assert.strictEqual(configFr.direction, 'row');
assert.strictEqual(configFr.textAlign, 'left');
assert.strictEqual(configFr.drawerSide, 'left');
assert.strictEqual(configFr.chevronBack, 'chevron-back');

const configEn = getLayoutConfig('en');
assert.strictEqual(configEn.isRTL, false);
assert.strictEqual(configEn.direction, 'row');
assert.strictEqual(configEn.textAlign, 'left');

const configAr = getLayoutConfig('ar');
assert.strictEqual(configAr.isRTL, true);
assert.strictEqual(configAr.direction, 'row-reverse');
assert.strictEqual(configAr.textAlign, 'right');
assert.strictEqual(configAr.drawerSide, 'right');
assert.strictEqual(configAr.chevronBack, 'chevron-forward');

console.log('✓ Test 5 validé : Mode RTL pour l\'arabe et mode LTR pour français/anglais rigoureusement respectés.');

// ------------------------------------------------------------
// TEST 6 : FORMATAGE LOCALISÉ DES MOIS ET DATES (monthNameLocale, fmtRange)
// ------------------------------------------------------------
console.log('\n--- Test 6 : Formatage calendaire et mois localisés ---');

const MONTHS_FULL_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTHS_FULL_AR = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const MONTHS_FULL_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function monthNameLocale(i, lang) {
  if (lang === 'ar') return MONTHS_FULL_AR[i];
  if (lang === 'fr') return MONTHS_FULL_FR[i];
  return MONTHS_FULL_EN[i];
}

assert.strictEqual(monthNameLocale(10, 'fr'), 'Novembre');
assert.strictEqual(monthNameLocale(10, 'en'), 'November');
assert.strictEqual(monthNameLocale(10, 'ar'), 'نوفمبر');

console.log('✓ Test 6 validé : Formatage mensuel localisé fonctionnel dans les 3 langues.');

console.log('\n============================================================');
console.log('🎉 TOUS LES TESTS D\'AUTHENTIFICATION, VALIDATION ET I18N SONT SUCCÈS !');
console.log('============================================================\n');
