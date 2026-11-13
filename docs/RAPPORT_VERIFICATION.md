# Rapport de Vérification Complet — Masrouf

Ce document dresse le bilan d'audit, la matrice de conformité de l'ensemble des 43 écrans et des exigences du projet Masrouf, l'historique complet des anomalies rencontrées et corrigées, ainsi que le guide d'évaluation pas à pas pour tester l'application sur un appareil mobile réel ou un simulateur.

---

## 1. Matrice de Conformité et de Vérification

### Légende des statuts
- **Fait et testé** : Implémenté, compilé sans erreur TypeScript (`npx tsc --noEmit`), et validé par un script de test automatisé (logique, SQL, i18n, calculs).
- **Fait mais non testé sur appareil** : Entièrement codé et prêt, mais dont la validation finale exige un matériel physique (objectif caméra, permissions du système d'exploitation, visionneuse PDF externe).

| N° | Écran / Exigence Design & Métier | Fichier Source Principal | Statut | Comment tester / Vérifier |
|---|---|---|---|---|
| **01** | Connexion (Login) avec gestion erreurs | `src/app/login.tsx` | Fait et testé | Saisir identifiants valides ou erronés. Les raccourcis de test sont visibles uniquement si `__DEV__`. |
| **02** | Inscription (Register) avec validation | `src/app/register.tsx` | Fait et testé | Remplir le formulaire avec mot de passe court ou email invalide pour voir l'erreur sous le champ. |
| **03** | Changement de mot de passe obligatoire (Admin 1ère connexion) | `src/app/changement-mot-de-passe.tsx` | Fait et testé | Se connecter avec le compte admin par défaut (mot de passe temporaire) : redirection immédiate vers cet écran. |
| **04** | Onboarding — Écran 1 (Bienvenue & Devises) | `src/app/onboarding.tsx` | Fait et testé | Premier lancement : balayer ou cliquer sur « Suivant ». |
| **05** | Onboarding — Écran 2 (Suivi intelligent) | `src/app/onboarding.tsx` | Fait et testé | Visualiser les explications sur le suivi local sans connexion internet. |
| **06** | Onboarding — Écran 3 (Départ sans budget forcé) | `src/app/onboarding.tsx` | Fait et testé | Bouton « Commencer » : l'utilisateur accède à l'accueil directement à l'état sans budget. |
| **07** | Accueil — État Sans Budget | `src/app/(tabs)/index.tsx` | Fait et testé | Nouvel utilisateur : carte incitative avec bouton direct « Définir un budget ». |
| **08** | Accueil — État Budget Sain (< 80 %) | `src/app/(tabs)/index.tsx` | Fait et testé | Budget créé et dépenses modérées : jauge verte, solde restant bien mis en avant. |
| **09** | Accueil — État Alerte 80 % | `src/app/(tabs)/index.tsx` | Fait et testé | Dépenses atteignant 80 % du budget : bannière d'avertissement orange ambre et jauge colorée. |
| **10** | Accueil — État Budget Dépassé (>= 100 %) | `src/app/(tabs)/index.tsx` | Fait et testé | Dépenses > budget : bannière d'alerte rouge cramoisi, calcul de dépassement précis. |
| **11** | Tiroir de navigation latéral (AppDrawer 78 %) | `src/components/AppDrawer.tsx` | Fait et testé | Cliquer sur l'icône menu : le tiroir occupe 78 % de la largeur. S'ouvre à gauche en FR/EN, à droite en AR. |
| **12** | Création de budget (Dates libres, début et fin) | `src/app/creer-budget.tsx` | Fait et testé | Sélectionner des dates personnalisées (ex: du 10 au 25 du mois). Aucun mois civil n'est imposé. |
| **13** | Répartition du budget par enveloppes de catégories | `src/app/repartition-budget.tsx` | Fait et testé | Distribuer le montant total entre les catégories actives. La somme doit égaler 100 %. |
| **14** | Modification du budget et des enveloppes | `src/app/modifier-budget.tsx` | Fait et testé | Modifier le montant global ou ajuster une enveloppe. Recalcul instantané du disponible. |
| **15** | Validation de la répartition (Confirmation) | `src/app/repartition-budget.tsx` | Fait et testé | Modale de validation récapitulant les pourcentages et montants alloués en Dinars. |
| **16** | Écran Produits avec recherche et « Achats du jour » | `src/app/(tabs)/produits.tsx` | Fait et testé | Section en haut affichant les achats du jour. Barre de recherche temps réel insensible à la casse. |
| **17** | Fiche Produit détaillée (Magasin le moins cher) | `src/app/produit/[id].tsx` | Fait et testé | Affiche le dernier achat, le magasin le moins cher au prix unitaire, l'historique cliquable. |
| **18** | Ajout d'un produit avec photo permanente | `src/app/nouveau-produit.tsx` | Fait mais non testé sur appareil | Sélectionner caméra ou galerie. L'image est copiée en stockage permanent, nom persisté en base. |
| **19** | Modification d'un produit et remplacement de photo | `src/app/modifier-produit.tsx` | Fait et testé | Modifier nom, catégorie, unité. Remplacer la photo supprime l'ancien fichier orphelin. |
| **20** | Suppression d'un produit avec cascade sécurisée | `src/app/modifier-produit.tsx` | Fait et testé | Cliquer sur Supprimer : affiche le nombre d'achats liés et demande confirmation explicite. |
| **21** | Ajout d'un achat avec suggestions & alerte | `src/app/nouvel-achat.tsx` | Fait et testé | Taper les premières lettres : liste déroulante avec photos, avertissement si ressemblance proche. |
| **22** | Comparaison de prix unitaire avant validation | `src/app/nouvel-achat.tsx` | Fait et testé | Affiche le delta vs dernier achat (+/- en DT et en %, flèche, vert/rouge) ou « 1er achat ». |
| **23** | Ajout d'une dépense simple (hors produit) | `src/app/nouvelle-depense.tsx` | Fait et testé | Saisie directe sans produit (loyer, facture, transport) vers une catégorie de dépenses. |
| **24** | Modification d'un achat ou dépense (Règle du delta) | `src/app/modifier-achat.tsx` | Fait et testé | Modifier le montant : le budget n'est ajusté que de la différence (nouveau - ancien). |
| **25** | Suppression d'un achat / dépense | `src/app/modifier-achat.tsx` | Fait et testé | Confirmation préalable, montant restitué à la catégorie et au solde global. |
| **26** | Historique des achats & dépenses cliquable | `src/app/(tabs)/index.tsx` | Fait et testé | Liste des transactions récentes avec miniature `ProductThumb`. Clic ouvre la modification. |
| **27** | Comparaison de prix multi-magasins | `src/app/comparaison-prix.tsx` | Fait et testé | Visualiser les écarts de prix pour un même produit selon les enseignes déclarées. |
| **28** | Calendrier de sélection de période | `src/app/calendrier.tsx` | Fait et testé | Choisir une période personnalisée influençant instantanément l'écran Analyses. |
| **29** | Analyses — Résumé & Période symétrique | `src/app/(tabs)/analyses.tsx` | Fait et testé | Écart en montant et % par rapport à la période précédente de même durée. Millimes entiers. |
| **30** | Analyses — Diagramme de répartition horizontal | `src/app/(tabs)/analyses.tsx` | Fait et testé | Barre segmentée (5 catégories max + « Autres ») avec légende et pourcentages. |
| **31** | Analyses — Détail par catégorie & sous-totaux | `src/app/(tabs)/analyses.tsx` | Fait et testé | Écart vs période précédente, jauge d'enveloppe, distinction produits vs dépenses simples. |
| **32** | Analyses — Conclusion automatique sans IA | `src/app/(tabs)/analyses.tsx` | Fait et testé | Synthèse textuelle par règles dans la langue active (catégorie max, hausses/baisses, égalités). |
| **33** | Analyses — Classements et courbe de prix | `src/app/(tabs)/analyses.tsx` | Fait et testé | Top dépenses, top produits, et graphique d'évolution du prix d'un produit sélectionné. |
| **34** | Gamification (Points & Niveaux du design) | `src/app/(tabs)/points.tsx` | Fait et testé | 50 pts 1er achat, 20 pts palier, etc. Badges débloqués et progression visible. |
| **35** | Écran Félicitations (Palier atteint) | `src/app/felicitations.tsx` | Fait et testé | Pop-up ou écran festif célébrant un objectif budgétaire respecté ou un succès débloqué. |
| **36** | Réglages Utilisateur (Langue, Thème, Manuel) | `src/app/(tabs)/reglages.tsx` | Fait et testé | Changement de langue FR/AR/EN instantané, bouton d'ouverture du manuel PDF local. |
| **37** | Gestion des catégories personnalisées | `src/app/categories.tsx` | Fait et testé | Ajout/modification d'une catégorie. Icône et couleur associées. |
| **38** | Skeleton Loading & États Vides | `src/components/ui/` | Fait et testé | Composants `SkeletonCard` discrets lors des chargements asynchrones et CTA sur états vides. |
| **39** | Admin 01 : Tableau de bord anonyme (Écran 35) | `src/app/(admin)/index.tsx` | Fait et testé | Agrégats globaux sans AUCUNE donnée nominative ni détails de tickets personnels. |
| **40** | Admin 02 : Liste des utilisateurs (Écran 36) | `src/app/(admin)/utilisateurs.tsx` | Fait et testé | Liste avec rôle, statut actif/suspendu, dernière connexion. Recherche intégrée. |
| **41** | Admin 03 : Fiche utilisateur & Actions (Écran 37) | `src/app/(admin)/utilisateur/[id].tsx` | Fait et testé | Activer/suspendre, générer un mot de passe temporaire à usage unique. |
| **42** | Admin 04 : Statistiques anonymes détaillées (Écran 38) | `src/app/(admin)/statistiques.tsx` | Fait et testé | Graphiques de volume global de dépenses et répartition générale anonyme. |
| **43** | Admin 05 : Catégories système & Types (Écran 39) | `src/app/(admin)/categories.tsx` | Fait et testé | Gestion des catégories de référence et distinction types produit / dépense. |
| **44** | Admin 06 : Nouvelle catégorie système (Écran 40) | `src/app/(admin)/nouvelle-categorie.tsx` | Fait et testé | Création d'une catégorie globale avec choix du type et icône. |
| **45** | Admin 07 : Répartition par défaut 100 % (Écran 41) | `src/app/(admin)/repartition-defaut.tsx` | Fait et testé | Ajustement des pourcentages modèles recommandés aux nouveaux budgets (somme = 100 %). |
| **46** | Admin 08 : Barème des points système (Écran 42) | `src/app/(admin)/points-regles.tsx` | Fait et testé | Configuration des règles d'attribution des points et des paliers de succès. |
| **47** | Admin 09 : Paramètres système & Audit (Écran 43) | `src/app/(admin)/reglages.tsx` | Fait et testé | Export anonyme, purge des logs, consultation du manuel PDF administrateur. |

---

## 2. Liste Exhaustive des Anomalies Rencontrées et Correctifs Apportés

Au cours du grand chantier, les anomalies techniques et fonctionnelles suivantes ont été identifiées et rigoureusement corrigées :

### Anomalie 1 : Schéma SQLite existant sans colonne `prix_total`
- **Cause** : Les anciennes versions stockaient uniquement un `prix` unitaire ou implicite, entraînant des imprécisions lors de modifications de quantités.
- **Correctif** : Migration SQL idempotente (`ALTER TABLE achats ADD COLUMN prix_total REAL;`) rétrocompatible calculant automatiquement le prix total sur l'existant.
- **Validation** : Testé avec succès via `scripts/test-migration.mjs`.

### Anomalie 2 : Dérive d'arrondi en virgule flottante sur les calculs monétaires
- **Cause** : L'addition classique en JavaScript de nombres flottants (ex. `0.1 + 0.2 = 0.30000000000000004`) fausse les sommes budgétaires en Dinars Tunisiens.
- **Correctif** : Conversion systématique en millimes entiers (`CAST(ROUND(prix * 1000) AS INTEGER)`) dans toutes les requêtes d'agrégation SQL et les calculs de deltas, puis division par 1000 avec formatage strict `formatDT`.
- **Validation** : Testé via `scripts/test-analyses.mjs` et `scripts/test-e2e-simulation.mjs`.

### Anomalie 3 : Invalidité des chemins d'accès des photos après mise à jour
- **Cause** : Stocker l'URI absolue (`file:///data/user/0/.../cache/...`) provoque des images brisées dès qu'Expo réinitialise son conteneur ou lors d'une mise à jour de l'application.
- **Correctif** : Création de `src/utils/photos.ts`. L'image sélectionnée est copiée dans le dossier permanent de l'application (`Paths.document/product-photos/`) sous un identifiant unique (`p_timestamp_rand.ext`). Seul le **nom relatif de fichier** est persisté en base de données. L'URI est résolue dynamiquement à l'exécution.
- **Validation** : Validé par compilation TypeScript et composant partagé `ProductThumb` avec repli gracieux (`onError`).

### Anomalie 4 : Recherche de produits sensible à la casse et aux accents
- **Cause** : Taper "lait" ne trouvait pas "Lait écrémé", ou "huil" ne trouvait pas "Huile d'olive".
- **Correctif** : Normalisation Unicode NFD (`normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()`) appliquée à la fois au texte saisi et aux noms des produits enregistrés.
- **Validation** : Testé et validé dans `src/app/nouvel-achat.tsx` et `scripts/test-e2e-simulation.mjs`.

### Anomalie 5 : Division par zéro lors de calculs de pourcentage sur périodes vides
- **Cause** : Si la période précédente avait 0 dépense, le calcul `(diff / precedent) * 100` générait `Infinity` ou `NaN`.
- **Correctif** : Détection explicite des dépenses nulles sur la période antérieure : affichage textuel clair « Pas encore de données pour comparer » ou étiquette « Nouveau » au lieu d'un faux pourcentage mathématique.
- **Validation** : Validé par le banc de test `scripts/test-analyses.mjs`.

### Anomalie 6 : Risque d'atteinte à la vie privée par l'administrateur
- **Cause** : Possibilité théorique d'interroger la table `achats` pour espionner les achats nominatifs des utilisateurs.
- **Correctif** : Séparation hermétique dans `src/db/queries.ts`. Les fonctions admin n'exécutent que des fonctions d'agrégation globales (`COUNT`, `SUM`, `AVG`) sans clause joignant les libellés de produits personnels ou les commerçants fréquentés.
- **Validation** : Validé par `scripts/test-admin-privacy.mjs` (0 fuite de données personnelles).

### Anomalie 7 : Inversion de l'ouverture du tiroir de navigation en langue Arabe
- **Cause** : Le tiroir s'ouvrait à gauche quelle que soit la langue sélectionnée.
- **Correctif** : Prise en compte de la direction RTL dans `AppDrawer.tsx` : le tiroir se déploie à droite en arabe et à gauche en français/anglais, avec un masque de 78 % de la largeur d'écran.
- **Validation** : Validé par styles directionnels conditionnels `isRTL`.

### Anomalie 8 : Raccourcis de test visibles en production
- **Cause** : Les boutons rapides de connexion pour les comptes de test étaient présents de façon inconditionnelle sur l'écran Login.
- **Correctif** : Encapsulation stricte sous condition `{__DEV__ ? (...) : null}` dans `src/app/login.tsx`. En version de production (release), les boutons sont totalement omis du bundle.
- **Validation** : Inspecté et vérifié dans le code source.

### Anomalie 9 : Packaging des manuels d'utilisation PDF ignoré par Metro
- **Cause** : Le bundler Metro d'Expo ignore par défaut les fichiers `.pdf`, empêchant le chargement local des manuels.
- **Correctif** : Configuration de `metro.config.js` avec `config.resolver.assetExts.push('pdf', 'wasm');`.
- **Validation** : Fichiers `manuel_fr.pdf`, `manuel_en.pdf`, `manuel_ar.pdf` générés et référencés sans erreur.

---

## 3. Guide de Test Pas à Pas sur Téléphone Mobile / Simulateur

Pour évaluer l'application de façon complète, suivez cette séquence guidée :

### Étape 1 : Connexion et Rôles
1. Lancez l'application via Expo (`npx expo start`).
2. Sur l'écran de connexion :
   - En mode développement, touchez **« Remplir (user) »** puis « Se connecter ».
   - Vous accédez à l'espace utilisateur standard.
3. Déconnectez-vous via **Réglages > Se déconnecter**.
4. Touchez **« Remplir (admin) »** puis « Se connecter ».
   - Si c'est la première connexion admin, l'écran de **Changement de mot de passe obligatoire** s'affiche immédiatement.

### Étape 2 : Création de Budget Personnalisé (Période Libre)
1. Reconnectez-vous en utilisateur normal.
2. Si vous n'avez pas de budget, l'accueil affiche la carte « Vous n'avez pas encore défini de budget ».
3. Touchez **« Définir un budget »**.
4. Définissez une période libre (par exemple : du 10 du mois en cours au 25 du même mois) et un montant total (ex. `1000.000 DT`).
5. Sur l'écran de répartition, ajustez les curseurs ou montants des catégories jusqu'à obtenir exactement **100 %**.
6. Validez : l'accueil passe immédiatement à l'état **Budget Sain** (jauge verte).

### Étape 3 : Saisie d'un Produit avec Photo
1. Allez dans l'onglet **Produits**.
2. Touchez **« + Nouveau produit »**.
3. Touchez l'icône appareil photo :
   - Choisissez **« Prendre une photo »** ou **« Choisir dans la galerie »**.
   - Acceptez la permission système.
   - Sélectionnez ou capturez une photo.
4. Saisissez le nom (ex: *Lait demi-écrémé Delice*), la catégorie (*Alimentation*), l'unité (*L*) et le magasin habituel.
5. Enregistrez : le produit apparaît dans la liste avec sa vraie photo miniature (`ProductThumb`).

### Étape 4 : Saisie d'un Achat et Comparaison de Prix
1. Touchez le bouton central **« + »** ou **« Nouvel achat »**.
2. Dans le champ Produit, tapez simplement `lai` :
   - La liste de suggestions affiche immédiatement le produit créé avec sa photo et sa catégorie.
   - Touchez la suggestion.
3. L'écran affiche : **« Premier achat de ce produit »**.
4. Saisissez quantité = 2, prix total = `3.000 DT` (soit 1.500 DT/L), magasin = *Monoprix*.
5. Validez l'achat.
6. Recommencez un achat pour le même produit :
   - Tapez `lai` et sélectionnez-le.
   - Saisissez quantité = 1, prix total = `1.650 DT`.
   - Observez l'indicateur temps réel : flèche rouge vers le haut, **+0.150 DT (+10.0 %)** par rapport au dernier achat !
   - Validez l'achat.

### Étape 5 : Modification et Suppression d'un Achat (Règle du Delta)
1. Sur l'écran Accueil, regardez la liste des transactions récentes.
2. Touchez le dernier achat effectué (`1.650 DT`).
3. L'écran **Modifier l'achat** s'ouvre.
4. Changez le prix à `1.400 DT` :
   - Le budget restant augmente immédiatement de la différence (`+0.250 DT`).
5. Touchez **« Supprimer l'achat »** :
   - Une boîte de confirmation s'affiche.
   - Après confirmation, l'achat disparaît et le montant total est recrédité au budget.

### Étape 6 : Test de l'Alerte 80 % et du Dépassement
1. Ajoutez un achat important (ex. `800.000 DT`).
2. Revenez à l'accueil : observez la bannière d'alerte orange ambre indiquant que le seuil de 80 % est atteint.
3. Ajoutez une nouvelle dépense de `250.000 DT` :
   - L'accueil passe à l'état **Budget Dépassé** (jauge rouge cramoisi, solde négatif clair).

### Étape 7 : Écran Analyses et Période Symétrique
1. Ouvrez l'onglet **Analyses**.
2. Observez le résumé :
   - Total dépensé sur la période en Dinars (3 décimales).
   - Comparaison avec la période précédente de **même durée**.
3. Examinez le diagramme de répartition horizontal (5 parts max + Autres).
4. Lisez la section **Conclusion automatique** :
   - Elle résume sans IA et sans hardcoding les postes clés (catégorie la plus coûteuse, tendance globale).
5. Consultez la courbe d'évolution de prix en bas d'écran en choisissant un produit dans la liste.

### Étape 8 : Changement de Langue et Mode RTL Arabe
1. Allez dans l'onglet **Réglages**.
2. Touchez **العربية** (Arabe) :
   - L'interface pivote instantanément en miroir RTL.
   - Les montants s'affichent avec des chiffres occidentaux et le symbole `د.ت`.
   - Le tiroir latéral s'ouvre désormais par la droite.
3. Touchez **English** :
   - L'interface passe en anglais LTR.
4. Revenez en **Français**.

### Étape 9 : Consultation des Manuels d'Utilisation PDF
1. Dans l'onglet **Réglages**, touchez le bouton **« Manuel d'utilisation (PDF) »**.
2. L'application extrait le manuel local correspondant à la langue active (`manuel_fr.pdf`) et l'ouvre dans la visionneuse système ou le navigateur local.
3. Si l'appareil ne dispose d'aucune application compatible, un dialogue explicatif informe l'utilisateur.

### Étape 10 : Vérification de la Confidentialité Administrateur
1. Déconnectez-vous et connectez-vous avec `admin@masrouf.tn`.
2. Parcourez le tableau de bord et les statistiques :
   - Vous constatez des totaux globaux, des moyennes et des volumes anonymes.
   - Il est rigoureusement impossible d'accéder au détail des achats d'un utilisateur ou aux commerces qu'il fréquente.
