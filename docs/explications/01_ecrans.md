# 01 — Les 43 Types d'Écrans du Design Masrouf

Ce document détaille chacun des 43 types d'écrans de l'application Masrouf, leur organisation visuelle, les fichiers sources associés, les requêtes SQL invoquées, les interactions utilisateur et le traitement des états particuliers (chargement, vide, alerte, erreur).

---

## 🧭 Vue d'ensemble de la navigation

La navigation de Masrouf repose sur **Expo Router** (routage déclaratif basé sur l'arborescence des fichiers) :
- Les écrans publics d'authentification (`/login`, `/register`).
- Le sas de sécurité obligatoire (`/changement-mot-de-passe`).
- L'assistant de premier lancement (`/onboarding`).
- L'espace utilisateur avec onglets et tiroir (`/(tabs)/index`, `/(tabs)/produits`, `/(tabs)/analyses`, `/(tabs)/points`, `/(tabs)/reglages`).
- Les écrans de flux modal ou plein écran (`/creer-budget`, `/repartition-budget`, `/modifier-budget`, `/nouvel-achat`, `/nouvelle-depense`, `/nouveau-produit`, `/modifier-achat`, `/modifier-produit`, `/produit/[id]`, `/calendrier`, `/comparaison-prix`, `/categories`, `/felicitations`).
- L'espace d'administration réservé (`/(admin)/index`, `/(admin)/utilisateurs`, `/(admin)/utilisateur/[id]`, `/(admin)/statistiques`, `/(admin)/categories`, `/(admin)/nouvelle-categorie`, `/(admin)/repartition-defaut`, `/(admin)/points-regles`, `/(admin)/reglages`).

Le tiroir latéral (**AppDrawer**) s'ouvre sur simple pression de l'icône menu ou glissement, à 78 % de la largeur d'écran :
- **À gauche** en français et anglais.
- **À droite** en arabe (RTL).

---

## 📱 Détail des 43 Types d'Écrans

### 1. Écran de Connexion (`src/app/login.tsx`)
- **Rôle** : Authentification par email et mot de passe.
- **Composants dans l'ordre** :
  1. En-tête avec logo Masrouf et titre d'accueil.
  2. Champ email (`Input`) avec clavier adapté (`keyboardType="email-address"`).
  3. Champ mot de passe (`Input`) sécurisé avec bascule de visibilité.
  4. Message d'erreur dynamique sous le champ en cas d'échec.
  5. Bouton « Se connecter » (`Button`).
  6. Lien textuel vers l'inscription (« Pas encore de compte ? S'inscrire »).
  7. Raccourcis de remplissage rapide de test (visibles uniquement si `__DEV__`).
- **Requêtes SQL appelées** : `SELECT * FROM users WHERE email = ?` via `loginUser()`.
- **Événements** : Soumission du formulaire, bascule de visibilité mot de passe, clic sur inscription.
- **États particuliers** : Erreur de mot de passe incorrect, utilisateur suspendu, indicateur de chargement sur le bouton.

### 2. Écran d'Inscription (`src/app/register.tsx`)
- **Rôle** : Création d'un nouveau compte utilisateur local.
- **Composants dans l'ordre** : En-tête, champ nom complet, champ email, champ mot de passe (avec contrôle de longueur >= 6 caractères), confirmation de mot de passe, bouton « S'inscrire », lien retour connexion.
- **Requêtes SQL appelées** : `INSERT INTO users (nom, email, password_hash, role, actif) VALUES (?, ?, ?, 'user', 1)`.
- **Événements** : Validation des contraintes en temps réel, création de compte et connexion automatique.
- **États particuliers** : Erreur « Cet email est déjà utilisé », erreur de confirmation dissemblable.

### 3. Changement de Mot de Passe Obligatoire (`src/app/changement-mot-de-passe.tsx`)
- **Rôle** : Sas de sécurité forcé lorsqu'un compte admin ou un compte réinitialisé possède le flag `must_change_password = 1`.
- **Composants dans l'ordre** : Bannière d'avertissement jaune ambre, champ nouveau mot de passe, champ confirmation, bouton « Enregistrer et continuer ».
- **Requêtes SQL appelées** : `UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`.
- **Événements** : Soumission avec validation de sécurité (minimum 6 caractères).
- **États particuliers** : L'accès aux autres écrans est strictement bloqué par le guard de `_layout.tsx` tant que le mot de passe n'est pas renouvelé.

### 4, 5, 6. Onboarding en 3 Écrans (`src/app/onboarding.tsx`)
- **Rôle** : Découverte pédagogique des 3 piliers de Masrouf (100 % local, comparaison de prix, maîtrise des dépenses) sans forcer la création de budget.
- **Composants dans l'ordre** : Indicateur de progression (3 points), grande illustration thématique, titre fort, paragraphe explicatif, bouton d'action (« Suivant » sur les écrans 1 et 2, « Commencer » sur l'écran 3).
- **Requêtes SQL appelées** : Aucune (persistance de l'état `has_seen_onboarding` dans SecureStore/AsyncStorage).
- **Événements** : Balayage tactile horizontal ou clic sur le bouton de navigation.
- **États particuliers** : Affiché une seule fois à l'installation, saut possible.

### 7. Accueil — État Sans Budget (`src/app/(tabs)/index.tsx`)
- **Rôle** : État initial quand l'utilisateur n'a pas encore défini de budget pour la période active.
- **Composants dans l'ordre** :
  1. En-tête avec bouton menu tiroir et avatar utilisateur.
  2. Carte d'invitation avec illustration : « Aucun budget actif ».
  3. Bouton principal d'action : « + Définir un budget ».
  4. Liste des derniers achats déjà enregistrés (si existants) avec bouton de saisie rapide.
- **Requêtes SQL appelées** : `SELECT * FROM budgets WHERE user_id = ? AND date_fin >= date('now') ORDER BY date_fin DESC LIMIT 1`.
- **États particuliers** : État vide pédagogique incitant à créer son enveloppe.

### 8. Accueil — État Budget Sain (< 80 %) (`src/app/(tabs)/index.tsx`)
- **Rôle** : Visualisation du budget lorsque les dépenses sont sous contrôle.
- **Composants dans l'ordre** :
  1. Carte du budget : solde restant en gros (`formatDT`), jauge circulaire ou barre de progression de couleur verte (`#1B4332`), total dépensé et budget total.
  2. Raccourcis d'action : « + Achat » et « + Dépense ».
  3. Enveloppes des catégories avec mini-jauges individuelles.
  4. Liste des 5 transactions les plus récentes avec miniatures `ProductThumb`.
- **Requêtes SQL appelées** : `getActiveBudget()`, `getCategoriesEnveloppes()`, `getRecentAchats()`.
- **États particuliers** : Tout est au vert, pas de message d'alerte.

### 9. Accueil — État Alerte 80 % (`src/app/(tabs)/index.tsx`)
- **Rôle** : Alerter dès que le ratio `depenses / total >= 0.80` et `< 1.00`.
- **Composants dans l'ordre** : Mêmes composants que l'état sain, avec l'insertion d'une **Bannière d'alerte orange ambre** (`#B07D00`) : « Attention, vous avez consommé plus de 80 % de votre budget ! » et barre de progression virant à l'orange.
- **États particuliers** : Déclenchement automatique selon le calcul réactif en temps réel.

### 10. Accueil — État Budget Dépassé (>= 100 %) (`src/app/(tabs)/index.tsx`)
- **Rôle** : Alerte critique dès que les dépenses dépassent l'enveloppe globale.
- **Composants dans l'ordre** :
  1. Bannière d'alerte rouge cramoisi (`#B3261E`) : « Budget dépassé de X.XXX DT ».
  2. Barre de progression pleine couleur rouge danger.
  3. Solde restant affiché en négatif rouge.
  4. Indicateur rouge sur chaque catégorie ayant excédé son quota.
- **États particuliers** : Calcul immédiat du montant du déficit.

### 11. Tiroir de Navigation (`src/components/AppDrawer.tsx`)
- **Rôle** : Menu principal coulissant à 78 % de largeur.
- **Composants dans l'ordre** : Profil connecté (nom, email, badge rôle), séparateur visuel, liste des liens (Accueil, Produits, Analyses, Succès/Points, Réglages, Calendrier, Gestion des catégories, Administration si admin), bouton déconnexion.
- **Gestion RTL** : Coulisse depuis la gauche en FR et EN, depuis la droite en AR (`isRTL ? styles.drawerRight : styles.drawerLeft`).

### 12. Création de Budget — Périodes Libres (`src/app/creer-budget.tsx`)
- **Rôle** : Définition d'un budget avec dates entièrement libres (pas de mois civil imposé).
- **Composants dans l'ordre** : Titre, sélecteur date de début, sélecteur date de fin, champ montant global en Dinars (`Input`), bouton « Continuer vers la répartition ».
- **Requêtes SQL appelées** : Vérification de non-chevauchement de dates sur la table `budgets`.
- **Validation** : Date de fin postérieure à la date de début, montant strictement supérieur à zéro.

### 13. Répartition du Budget par Catégories (`src/app/repartition-budget.tsx`)
- **Rôle** : Allocation du budget total entre les différentes catégories de dépenses.
- **Composants dans l'ordre** : Montant total à répartir, jauge de total alloué (doit atteindre exactement 100 %), curseurs/champs de saisie pour chaque catégorie avec calcul dynamique du montant en Dinars, bouton de validation.
- **Validation** : Blocage avec message d'erreur explicite sous le total si la somme est différente de 100 %.
- **Requêtes SQL appelées** : `INSERT INTO budgets (...)` puis `INSERT INTO budget_categories (...)`.

### 14. Modification du Budget et des Enveloppes (`src/app/modifier-budget.tsx`)
- **Rôle** : Ajuster les montants alloués sans supprimer l'historique des dépenses.
- **Composants dans l'ordre** : Rappel des dépenses déjà engagées, ajustement du montant global, rééquilibrage des enveloppes, bouton de sauvegarde.
- **Requêtes SQL appelées** : `UPDATE budgets SET montant_total = ?`, `UPDATE budget_categories SET montant_alloue = ?`.

### 15. Validation de la Répartition (`src/app/repartition-budget.tsx`)
- **Rôle** : Modale récapitulative affichant la liste des catégories et leur allocation en DT avant enregistrement définitif.

### 16. Écran Produits (`src/app/(tabs)/produits.tsx`)
- **Rôle** : Catalogue des articles suivis par l'utilisateur.
- **Composants dans l'ordre** :
  1. Section supérieure **« Achats du jour »** avec défilement horizontal des articles achetés aujourd'hui.
  2. Barre de recherche en temps réel (insensible aux accents et majuscules).
  3. Liste des produits avec miniature `ProductThumb`, nom, catégorie, dernier prix unitaire payé.
  4. Bouton flottant ou d'en-tête « + Nouveau produit ».
- **Requêtes SQL appelées** : `getProduits()`, `getAchatsDuJour()`.
- **États particuliers** : État vide avec CTA invitant à enregistrer un premier article si aucun produit n'existe.

### 17. Fiche Produit Détaillée (`src/app/produit/[id].tsx`)
- **Rôle** : Historique et aide à la décision pour un produit spécifique.
- **Composants dans l'ordre** :
  1. Grande photo ou icône du produit.
  2. Titre, catégorie et unité de mesure.
  3. Carte statistique : **Magasin le moins cher** (enseigne et prix unitaire le plus bas constaté) calculé via `getMagasinMoinsCher(produit_id)`.
  4. Carte statistique : **Dernier achat effectué** (date, magasin, prix unitaire).
  5. Liste de l'historique complet de tous les achats passés (cliquables vers modification).
  6. Bouton « Modifier le produit ».
- **Requêtes SQL appelées** : `getProduitById()`, `getMagasinMoinsCher()`, `getAchatsByProduitId()`.

### 18. Ajout d'un Produit (`src/app/nouveau-produit.tsx`)
- **Rôle** : Enregistrement d'un nouvel article dans le référentiel personnel.
- **Composants dans l'ordre** : Zone photo interactive (« + Ajouter une photo » avec choix caméra / galerie), champ Nom du produit, sélecteur de Catégorie, sélecteur d'Unité (pièce, kg, L, paquet, etc.), champ Magasin habituel, bouton « Enregistrer ».
- **Stockage photo** : Fichier permanent stocké dans `product-photos/` et persistance du nom seul en base.
- **Validation** : Messages d'erreur sous les champs obligatoires vides.

### 19. Modification d'un Produit (`src/app/modifier-produit.tsx`)
- **Rôle** : Mise à jour des informations d'un produit et de sa photo.
- **Composants dans l'ordre** : Photo actuelle avec option de remplacement ou suppression, champs pré-remplis, bouton « Enregistrer les modifications », bouton rouge « Supprimer le produit ».
- **Gestion des photos** : Remplacer la photo supprime l'ancien fichier permanent pour éviter d'encombrer le stockage.

### 20. Suppression de Produit avec Cascade (`src/app/modifier-produit.tsx`)
- **Rôle** : Suppression contrôlée avec protection contre la perte de données.
- **Composants** : Modale d'avertissement dénombrant le nombre d'achats liés qui seront supprimés, explication de la règle, boutons « Annuler » et « Confirmer la suppression ».
- **Requêtes SQL appelées** : `DELETE FROM achats WHERE produit_id = ?` puis `DELETE FROM produits WHERE id = ?`.

### 21. Ajout d'un Achat (`src/app/nouvel-achat.tsx`)
- **Rôle** : Saisie d'un achat de produit avec assistance intelligente.
- **Composants dans l'ordre** :
  1. Champ Produit avec recherche à la frappe.
  2. Liste des suggestions déroulantes affichant la photo `ProductThumb` et la catégorie.
  3. Bannière d'avertissement de ressemblance si le texte saisi est proche d'un article déjà connu.
  4. Champ Quantité et champ Prix total payé (en Dinars).
  5. Sélecteur de magasin et date d'achat.
  6. **Module de comparaison de prix unitaire** : affiche instantanément la comparaison avec le dernier achat (montant et %, flèche verte ou rouge) ou la mention « Premier achat de ce produit ».
  7. Indicateur d'impact sur le budget de la catégorie.
  8. Bouton « Enregistrer l'achat ».
- **Requêtes SQL appelées** : `getDernierAchatProduit()`, `insertAchat()`.

### 22. Ajout d'une Dépense Simple (`src/app/nouvelle-depense.tsx`)
- **Rôle** : Saisie d'une charge ou d'un coût sans article ni quantité (loyer, électricité, transport).
- **Composants dans l'ordre** : Champ libellé/titre, champ montant en Dinars, sélecteur de catégorie de dépenses simples, sélecteur de date, bouton de validation.
- **Requêtes SQL appelées** : `insertDepenseSimple()` (avec `quantite = 1` et `produit_id = NULL`).

### 23. Modification d'un Achat ou d'une Dépense (`src/app/modifier-achat.tsx`)
- **Rôle** : Correction d'une transaction existante.
- **Composants dans l'ordre** : Formulaire pré-rempli, bouton « Sauvegarder », bouton « Supprimer l'achat » avec modale de confirmation.
- **Règle financière** : Le budget et l'enveloppe ne sont ajustés que de la **différence nette** (`nouveau_prix - ancien_prix`).

### 24. Comparaison Multi-Magasins (`src/app/comparaison-prix.tsx`)
- **Rôle** : Comparer les prix pratiqués pour les mêmes articles entre différentes enseignes (ex: Carrefour vs Monoprix vs Épicerie).
- **Composants dans l'ordre** : Sélecteur de produit, tableau comparatif par magasin ordonné du moins cher au plus cher, écart en dinars.

### 25. Calendrier de Sélection de Période (`src/app/calendrier.tsx`)
- **Rôle** : Naviguer dans le temps pour consulter les historiques et orienter les analyses.
- **Composants dans l'ordre** : Vue calendrier mensuel, sélection d'une plage personnalisée, boutons de raccourci (« Ce mois », « 30 derniers jours », « Année en cours »).

### 26, 27, 28, 29, 30. Écran Analyses Complet (`src/app/(tabs)/analyses.tsx`)
- **Rôle** : Diagnostic budgétaire poussé sur la période sélectionnée.
- **Composants dans l'ordre** :
  1. **En-tête de période & Résumé financier** : dates, total dépensé en millimes formaté avec `formatDT`, comparaison avec la période précédente de **même durée** (delta en DT, %, flèche et couleur, ou « Pas encore de données »).
  2. **Diagramme de répartition horizontal** : barre segmentée proportionnelle (5 premières catégories + regroupement automatique « Autres ») avec légende interactive.
  3. **Tableau détaillé par catégorie** : montant dépensé, part du total (%), écart vs période précédente, jauge d'enveloppe budgétaire, catégorie « Non budgétisé », sous-totaux distinguant produits et dépenses simples.
  4. **Conclusion automatique sans IA** : phrases explicatives par règles déterministes dans la langue active (catégorie la plus coûteuse, hausses/baisses notables, catégories dépassant leur quota, égalités).
  5. **Classements et Évolution de prix** : top dépenses individuelles, top produits par volume dépensé, sélecteur de produit et courbe de fluctuation du prix unitaire dans le temps.
- **États particuliers** : État vide avec bouton « + Ajouter un achat » si aucune transaction n'a été saisie sur la période.

### 31. Gamification — Points et Niveaux (`src/app/(tabs)/points.tsx`)
- **Rôle** : Engagement de l'utilisateur à travers des récompenses pour sa rigueur budgétaire.
- **Composants dans l'ordre** : Niveau actuel de l'utilisateur, jauge de progression vers le niveau suivant, total des points accumulés, historique des gains de points, liste des badges de succès (débloqués ou verrouillés).
- **Barème respecté** : +50 pts premier achat, +20 pts palier atteint, etc.

### 32. Félicitations (`src/app/felicitations.tsx`)
- **Rôle** : Écran festif célébrant un objectif financier atteint (ex: enveloppe respectée en fin de période) ou un nouveau niveau de gamification débloqué.

### 33. Réglages Utilisateur (`src/app/(tabs)/reglages.tsx`)
- **Rôle** : Préférences de l'application et accès aux ressources.
- **Composants dans l'ordre** :
  1. Sélecteur de langue (Français, Arabe, Anglais) avec bascule instantanée.
  2. Sélecteur de thème visuel (clair, sombre, système).
  3. Bouton « Manuel d'utilisation (PDF) » ouvrant le document local selon la langue.
  4. Informations sur l'application (version, stockage 100 % local, respect de la vie privée).
  5. Bouton rouge de déconnexion.

### 34. Gestion des Catégories (`src/app/categories.tsx`)
- **Rôle** : Personnalisation de l'arborescence budgétaire de l'utilisateur.
- **Composants dans l'ordre** : Liste des catégories avec icône, couleur et type (produit ou dépense simple), formulaire d'ajout et d'édition.

### 35 à 43. Les 9 Écrans d'Administration (`src/app/(admin)/*`)
- **35. Tableau de bord anonyme (`index.tsx`)** : Statistiques globales du parc (total utilisateurs, dépenses cumulées, panier moyen) sans AUCUNE donnée personnelle ni ticket de caisse individuel.
- **36. Liste des utilisateurs (`utilisateurs.tsx`)** : Annuaire des comptes locaux avec recherche, statut actif/suspendu et date de création.
- **37. Fiche utilisateur (`utilisateur/[id].tsx`)** : Consultation du profil, suspension/réactivation du compte, génération d'un mot de passe temporaire à usage unique.
- **38. Statistiques anonymes approfondies (`statistiques.tsx`)** : Répartition macro-économique des dépenses globales et tendances d'usage.
- **39. Catégories système (`categories.tsx`)** : Référentiel des catégories fournies par défaut à la création de compte.
- **40. Nouvelle catégorie système (`nouvelle-categorie.tsx`)** : Création d'une catégorie globale avec icône et type.
- **41. Répartition par défaut (`repartition-defaut.tsx`)** : Définition des pourcentages modèles de répartition du budget recommandés aux nouveaux arrivants (somme rigoureusement égale à 100 %).
- **42. Barème des points (`points-regles.tsx`)** : Configuration des points de gamification accordés lors des actions des utilisateurs.
- **43. Paramètres système & Audit (`reglages.tsx`)** : Options de maintenance locale, consultation du manuel PDF administrateur et déconnexion.
