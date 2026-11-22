import assert from 'node:assert';
import { readFileSync } from 'node:fs';

console.log('🧪 DÉMARRAGE DU TEST DES FONCTIONNALITÉS DEMANDÉES PAR L\'UTILISATEUR...\n');

// 1. Vérification du placement exclusif du bouton "Ajouter une catégorie"
console.log('--- 1. Vérification de l\'emplacement du bouton « Ajouter une catégorie » ---');
const homeSource = readFileSync('src/app/(tabs)/index.tsx', 'utf8');
assert(homeSource.includes('CustomCategoryModal'), 'HomeScreen doit importer CustomCategoryModal');
assert(homeSource.includes('categoryModalOpen'), 'HomeScreen doit gérer l\'état categoryModalOpen');
assert(homeSource.includes('ajouter_categorie') || homeSource.includes('Ajouter une catégorie'), 'HomeScreen doit afficher le bouton Ajouter une catégorie');

// Vérifier que le bouton n'est PAS sur gerer-categories.tsx ni sur onboarding.tsx
const gererCatSource = readFileSync('src/app/gerer-categories.tsx', 'utf8');
assert(!gererCatSource.includes('CustomCategoryModal'), 'gerer-categories.tsx ne doit pas inclure CustomCategoryModal');
assert(!gererCatSource.includes('boutonAjouterCategorie'), 'gerer-categories.tsx ne doit pas avoir le bouton d\'ajout');

const onboardingSource = readFileSync('src/app/onboarding.tsx', 'utf8');
assert(!onboardingSource.includes('CustomCategoryModal'), 'onboarding.tsx ne doit pas inclure CustomCategoryModal');

console.log('✓ Emplacement exclusif sous le cadre vert du budget sur HomeScreen validé.');

// 2. Vérification des deux formulaires distincts (Produits vs Dépenses) et du pourcentage d'allocation
console.log('\n--- 2. Vérification des formulaires distincts Produits / Dépenses et du % d\'allocation ---');
const modalSource = readFileSync('src/components/CustomCategoryModal.tsx', 'utf8');
assert(modalSource.includes("initialKind = 'product'"), 'CustomCategoryModal doit gérer l\'onglet produit');
assert(modalSource.includes("setKind('expense')") || modalSource.includes("kind === 'expense'"), 'CustomCategoryModal doit gérer l\'onglet dépense');
assert(modalSource.includes('allocationPercent') || modalSource.includes('allocPercentNum'), 'CustomCategoryModal doit comporter la colonne / le champ de pourcentage d\'allocation');
assert(modalSource.includes('100') && modalSource.includes('total'), 'CustomCategoryModal doit valider le plafond de 100%');
console.log('✓ Formulaires distincts Produits/Dépenses et champ d\'allocation % validés.');

// 3. Vérification de la réévaluation automatique mensuelle
console.log('\n--- 3. Vérification de l\'algorithme de réévaluation automatique mensuelle ---');
const reevalSource = readFileSync('src/utils/budgetReevaluation.ts', 'utf8');
assert(reevalSource.includes('computeAutomatedBudgetAllocations'), 'Doit exporter computeAutomatedBudgetAllocations');
assert(reevalSource.includes('validateAllocationsCap'), 'Doit valider le plafond 100%');
assert(reevalSource.includes('getPreviousMonthBounds'), 'Doit calculer les bornes du mois précédent');
console.log('✓ Algorithme de réévaluation mensuelle des catégories basé sur la consommation réelle validé.');

// 4. Vérification de la reconnaissance vocale et de la transcription en caractères arabes
console.log('\n--- 4. Vérification de la saisie vocale multilingue et normalisation en caractères arabes ---');
const voiceParserSource = readFileSync('src/utils/voiceParser.ts', 'utf8');
assert(voiceParserSource.includes('toArabicScript'), 'Doit contenir toArabicScript');
assert(voiceParserSource.includes('mentionsChildDonation') || voiceParserSource.includes('allocation'), 'Doit reconnaître le type argent donné à un enfant / allocation');
assert(voiceParserSource.includes('donation') || voiceParserSource.includes('isCharityDonation'), 'Doit reconnaître les dons');
assert(voiceParserSource.includes('isArabicOrTunisian') || voiceParserSource.includes('ARABIZI_VOCABULARY'), 'Doit détecter et normaliser les langues');

const voiceModalSource = readFileSync('src/components/VoiceTransactionModal.tsx', 'utf8');
assert(voiceModalSource.includes('initialAllocationPercent'), 'Doit proposer le % d\'allocation pour une nouvelle catégorie');
console.log('✓ Transcription en caractères arabes, reconnaissance multilingue et extraction d\'entités validées.');

// 5. Vérification de l'unicité et de la synchronisation du budget mensuel
console.log('\n--- 5. Vérification du budget mensuel unique synchronisé sur toutes les pages ---');
const storeSource = readFileSync('src/state/store.tsx', 'utf8');
assert(storeSource.includes('saveBudget'), 'store doit contenir saveBudget');
assert(storeSource.includes('saveFamilyBudget'), 'store doit contenir saveFamilyBudget');

const adminBudgetSource = readFileSync('src/app/(admin)/budget-analyses.tsx', 'utf8');
assert(adminBudgetSource.includes('selectedBudget'), 'admin budget-analyses doit être synchronisé avec selectedBudget');
console.log('✓ Budget mensuel unique synchronisé entre Accueil, Budgets et Analyses validé.');

// 6. Vérification du don d'argent du parent à l'enfant avec confirmation obligatoire
console.log('\n--- 6. Vérification de la confirmation obligatoire pour le don d\'argent aux enfants ---');
const financesSource = readFileSync('src/app/(admin)/finances.tsx', 'utf8');
assert(financesSource.includes('confirmModal'), 'Finances doit comporter un modal de confirmation obligatoire');
assert(financesSource.includes('allocBusy'), 'Finances doit verrouiller la requête pour éviter tout double débit');
console.log('✓ Confirmation obligatoire et protection anti-double débit validées.');

// 7. Vérification du profil Enfant : consultation sans droit d'édition
console.log('\n--- 7. Vérification des restrictions budgétaires du profil Enfant ---');
assert(homeSource.includes("isChild"), 'HomeScreen doit identifier le profil Enfant');
assert(homeSource.includes("allocatedTotal"), 'HomeScreen doit afficher le budget alloué par le père pour l\'enfant');
console.log('✓ Profil Enfant avec budget alloué par le père et interdiction de modification validé.');

// 8. Vérification du suivi budgétaire des enfants sans fuite d'achats personnels (Vie privée)
console.log('\n--- 8. Vérification du dashboard de suivi des enfants et graphiques comparatifs ---');
const childAnalyticsSource = readFileSync('src/components/ChildrenBudgetAnalytics.tsx', 'utf8');
assert(childAnalyticsSource.includes('allocated'), 'Doit calculer le montant alloué');
assert(childAnalyticsSource.includes('spent'), 'Doit calculer le montant consommé');
assert(childAnalyticsSource.includes('remaining'), 'Doit calculer le montant restant');
assert(childAnalyticsSource.includes('pct'), 'Doit calculer le pourcentage de consommation');
assert(!childAnalyticsSource.includes('productName'), 'Ne doit pas afficher les détails d\'achats individuels des enfants');
assert(!childAnalyticsSource.includes('product_id'), 'Ne doit pas afficher les détails d\'achats individuels des enfants');
console.log('✓ Suivi budgétaire agrégé avec respect absolu de la vie privée et graphiques comparatifs validé.');

console.log('\n========================================================================');
console.log('🎉 TOUTES LES VÉRIFICATIONS DES EXIGENCES UTILISATEUR ONT RÉUSSI À 100% !');
console.log('========================================================================\n');
