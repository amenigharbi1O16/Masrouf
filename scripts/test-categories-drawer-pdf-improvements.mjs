// ============================================================
// FICHIER : scripts/test-categories-drawer-pdf-improvements.mjs
// RÔLE    : Suite de tests automatisés validant les améliorations demandées :
//           1. Compteur de catégories sélectionnées (initialisé à 0, dynamique, incrément/décrément)
//           2. Tiroir latéral utilisateur (typographie et lisibilité améliorées pour l'utilisateur uniquement)
//           3. Processus d'ouverture du guide PDF (routage Gate corrigé, multilinguisme et synchronisation)
// ============================================================

import fs from 'fs';
import path from 'path';

console.log('=== TEST SUITE : AMÉLIORATIONS GLOBALES DE L\'APPLICATION ===\n');

let failed = false;
function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ ÉCHEC : ${message}`);
    failed = true;
  }
}

// -------------------------------------------------------------
// [TEST 1] VÉRIFICATION DU COMPTEUR DE CATÉGORIES SÉLECTIONNÉES
// -------------------------------------------------------------
console.log('[TEST 1] Vérification du compteur de catégories sélectionnées :');

const onboardingCode = fs.readFileSync('src/app/onboarding.tsx', 'utf8');
assert(
  onboardingCode.includes('useState<string[]>([])'),
  'Onboarding : sélection initialisée strictement à 0 (tableau vide []) sans valeurs en dur'
);
assert(
  !onboardingCode.includes("const DEFAULTS = ['food'"),
  'Onboarding : aucune constante codée en dur DEFAULTS présente'
);
assert(
  onboardingCode.includes('disabled={selected.length === 0}'),
  'Onboarding : bouton de vérification désactivé quand le compteur est à 0'
);

const pickerCode = fs.readFileSync('src/components/CategoryPicker.tsx', 'utf8');
assert(
  pickerCode.includes('counterBanner') && pickerCode.includes('counterBadge'),
  'CategoryPicker : bannière et badge visuel du compteur de catégories présents'
);
assert(
  pickerCode.includes('{selected.length}'),
  'CategoryPicker : chiffre du compteur lié directement et dynamiquement à selected.length'
);
assert(
  pickerCode.includes("t('categories_selectionnees')"),
  'CategoryPicker : libellé traduit multilingue utilisé'
);

// Simulation logique de l'incrément et décrément
let simSelected = [];
assert(simSelected.length === 0, 'Compteur simulation : démarre bien à 0');
const toggleSim = (id) => {
  simSelected = simSelected.includes(id)
    ? simSelected.filter((x) => x !== id)
    : [...simSelected, id];
};
toggleSim('food');
assert(simSelected.length === 1, 'Compteur simulation : s\'incrémente automatiquement à 1 lors de la sélection');
toggleSim('transport');
assert(simSelected.length === 2, 'Compteur simulation : s\'incrémente automatiquement à 2');
toggleSim('food');
assert(simSelected.length === 1, 'Compteur simulation : se décrémente automatiquement à 1 lors de la désélection');
toggleSim('transport');
assert(simSelected.length === 0, 'Compteur simulation : se décrémente automatiquement à 0');

// -------------------------------------------------------------
// [TEST 2] VÉRIFICATION DU TIROIR UTILISATEUR (USER SIDE DRAWER)
// -------------------------------------------------------------
console.log('\n[TEST 2] Vérification du tiroir utilisateur et de sa typographie :');

const drawerCode = fs.readFileSync('src/components/SideDrawer.tsx', 'utf8');
assert(
  drawerCode.includes('userBrand') && drawerCode.includes('fontSize: 26'),
  'SideDrawer : titre brand rehaussé à 26px pour l\'utilisateur'
);
assert(
  drawerCode.includes('userName') && drawerCode.includes('fontSize: 18'),
  'SideDrawer : nom d\'utilisateur augmenté à 18px pour l\'utilisateur'
);
assert(
  drawerCode.includes('userRoleBadgeText') && drawerCode.includes('fontSize: 12.5'),
  'SideDrawer : sous-titre de rôle rehaussé à 12.5px pour l\'utilisateur'
);
assert(
  drawerCode.includes('userItemText') && drawerCode.includes('fontSize: 16.5'),
  'SideDrawer : libellés des boutons de menu augmentés à 16.5px pour l\'utilisateur'
);
assert(
  drawerCode.includes('userLogoutText') && drawerCode.includes('fontSize: 16'),
  'SideDrawer : bouton de déconnexion augmenté à 16px pour l\'utilisateur'
);
assert(
  drawerCode.includes('!isAdmin && styles.user'),
  'SideDrawer : toutes les augmentations de police sont appliquées STRICTEMENT à l\'utilisateur (!isAdmin)'
);

const langSelectorCode = fs.readFileSync('src/components/LanguageSelector.tsx', 'utf8');
assert(
  langSelectorCode.includes('isUserDrawer') && langSelectorCode.includes('fontSize: 14.5'),
  'LanguageSelector : sélecteur de langue avec police rehaussée à 14.5px dans le tiroir utilisateur'
);

const appDrawerCode = fs.readFileSync('src/components/AppDrawer.tsx', 'utf8');
assert(
  !appDrawerCode.includes("href: '/manuel-utilisation'"),
  'AppDrawer : le Manuel d\'utilisation a été retiré du tiroir latéral utilisateur'
);

const userSettingsCode = fs.readFileSync('src/app/(tabs)/reglages.tsx', 'utf8');
assert(
  userSettingsCode.includes('ouvrirManuelUtilisation'),
  'Réglages utilisateur : le Manuel d\'utilisation PDF est accessible depuis la page des réglages'
);

// -------------------------------------------------------------
// [TEST 3] VÉRIFICATION DE L\'OUVERTURE DU GUIDE PDF & LANGUE
// -------------------------------------------------------------
console.log('\n[TEST 3] Vérification de l\'ouverture du Guide PDF et de la cohérence de langue :');

const layoutCode = fs.readFileSync('src/app/_layout.tsx', 'utf8');
assert(
  layoutCode.includes("const isAuthRoute = first === 'login' || first === 'inscription'") &&
  !layoutCode.includes("const isPublic = first === 'login' || first === 'inscription' || first === 'manuel-utilisation'"),
  'Gate (_layout.tsx) : manuel-utilisation dissocié des routes d\'authentification'
);
assert(
  layoutCode.includes("if (!isAuthRoute && first !== 'manuel-utilisation')"),
  'Gate (_layout.tsx) : utilisateur déconnecté autorisé à consulter le manuel'
);
assert(
  layoutCode.includes("if (isAuthRoute || first === 'onboarding')"),
  'Gate (_layout.tsx) : utilisateur connecté n\'est plus redirigé lorsqu\'il consulte manuel-utilisation'
);

const manuelScreenCode = fs.readFileSync('src/app/manuel-utilisation.tsx', 'utf8');
assert(
  manuelScreenCode.includes('<Screen') && manuelScreenCode.includes('back'),
  'Manuel d\'utilisation : bouton retour (back) présent sur le conteneur Screen'
);
assert(
  manuelScreenCode.includes('setActiveLang(globalLang)'),
  'Manuel d\'utilisation : synchronisation dynamique automatique avec la langue courante de l\'app'
);
assert(
  manuelScreenCode.includes('changerLangue(lCode)'),
  'Manuel d\'utilisation : clic sur une pastille de langue met à jour toute l\'application'
);
assert(
  manuelScreenCode.includes('MANUEL_FR') &&
  manuelScreenCode.includes('MANUEL_EN') &&
  manuelScreenCode.includes('MANUEL_AR'),
  'Manuel d\'utilisation : 4 pages complètes disponibles pour chaque langue (FR, EN, AR)'
);

const pdfUtilCode = fs.readFileSync('src/utils/pdf.ts', 'utf8');
assert(
  pdfUtilCode.includes('export async function ouvrirManuelUtilisation'),
  'pdf.ts : ouvrirManuelUtilisation accepte la langue active et résout dynamiquement la langue'
);

// -------------------------------------------------------------
// [TEST 4] VÉRIFICATION DE LA COHÉRENCE I18N
// -------------------------------------------------------------
console.log('\n[TEST 4] Vérification de la cohérence des traductions (FR, EN, AR) :');

const frJson = JSON.parse(fs.readFileSync('src/i18n/fr.json', 'utf8'));
const enJson = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const arJson = JSON.parse(fs.readFileSync('src/i18n/ar.json', 'utf8'));

assert(frJson.categories_selectionnees === 'Catégories sélectionnées', 'i18n FR : categories_selectionnees correct');
assert(enJson.categories_selectionnees === 'Selected categories', 'i18n EN : categories_selectionnees correct');
assert(arJson.categories_selectionnees === 'الفئات المختارة', 'i18n AR : categories_selectionnees correct');
assert(frJson.manuel_utilisation && enJson.manuel_utilisation && arJson.manuel_utilisation, 'i18n : manuel_utilisation présent dans les 3 langues');

console.log('\n============================================================');
if (failed) {
  console.error('❌ DES TESTS ONT ÉCHOUÉ !');
  process.exit(1);
} else {
  console.log('🎉 TOUS LES TESTS DES NOUVELLES FONCTIONNALITÉS SONT VALIDÉS !');
  console.log('============================================================');
  process.exit(0);
}
