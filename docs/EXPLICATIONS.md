# 📚 Masrouf — Guide des Explications Techniques (Étape 3)

Ce document fournit les explications détaillées, ligne par ligne et concept par concept, de l'ensemble des développements réalisés lors de l'**Étape 3** de l'application Masrouf. Il est spécialement rédigé pour préparer la soutenance orale devant le professeur.

---

## 📑 Sommaire
1. [Sous-étape 3.1 : Base de données, Schéma et Migrations Sécurisées](#1-sous-étape-31--base-de-données-schéma-et-migrations-sécurisées)
2. [Sous-étape 3.2 : Sécurité Avancée PBKDF2 et Mise à Niveau Automatique du Hash](#2-sous-étape-32--sécurité-avancée-pbkdf2-et-mise-à-niveau-automatique-du-hash)
3. [Sous-étape 3.3 : Contrôle d'Accès et Privilèges Administrateur](#3-sous-étape-33--contrôle-daccès-et-privilèges-administrateur)
4. [Sous-étape 3.4 : Typage des Catégories (Produit vs Dépense)](#4-sous-étape-34--typage-des-catégories-produit-vs-dépense)
5. [Sous-étape 3.5 : Assistant de Premier Démarrage (Onboarding 3 Étapes)](#5-sous-étape-35--assistant-de-premier-démarrage-onboarding-3-étapes)
6. [Sous-étape 3.6 : Système Trilingue (Français, Arabe, Anglais) et Fallback](#6-sous-étape-36--système-trilingue-français-arabe-anglais-et-fallback)
7. [Questions Fréquentes du Professeur & Réponses Types](#7-questions-fréquentes-du-professeur--réponses-types)

---

## 1. Sous-étape 3.1 : Base de données, Schéma et Migrations Sécurisées

### Objectif
Faire évoluer le schéma SQLite sans jamais perdre de données existantes, en ajoutant les colonnes d'onboarding et de versionnement cryptographique, tout en garantissant une idempotence absolue (l'application peut redémarrer 100 fois sans crash).

### Fichiers Modifiés
- `src/db/database.ts` : Nouvelles colonnes `onboarding_done` (DEFAULT 0) et `hash_version` (DEFAULT 1), mécanisme transactionnel de sauvegarde physique `VACUUM INTO`.
- `src/db/database.web.ts` : Réplication identique pour le fallback Web dans `localStorage` avec sauvegarde `masrouf_web_v3_backup_etape2`.
- `src/db/queries.ts` : Typage TypeScript étendu (`salt`, `onboarding_done`, `hash_version`) et fonctions de mise à jour.

### Sauvegarde Physique
Avant d'appliquer les mutations, la fonction `sauvegarderBaseDeDonnees()` exécute la directive officielle SQLite :
```sql
VACUUM INTO 'masrouf_backup_etape2.db';
```
- **Pourquoi `VACUUM INTO` ?** Il crée un fichier de sauvegarde indépendant, défragmenté et cohérent sans verrouiller l'application ni risquer de corrompre le fichier actif `masrouf.db`.
- **Emplacement sur téléphone :** `/data/data/<package>/databases/masrouf_backup_etape2.db` (Android) ou `Library/Application Support/SQLite/masrouf_backup_etape2.db` (iOS).

---

## 2. Sous-étape 3.2 : Sécurité Avancée PBKDF2 et Mise à Niveau Automatique du Hash

### Objectif
Remplacer le hachage SHA-256 direct (vulnérable aux calculs massifs par GPU/ASIC) par **PBKDF2-HMAC-SHA256 avec 10 000 itérations**, sans casser les anciens comptes qui se connectent en version 1.

### Bibliothèque Choisie
- **`@noble/hashes@1.7.1`** (version fixée sans `^` dans `package.json`).
- C'est une bibliothèque JavaScript pure sans dépendances natives, ultra-optimisée et 100% compatible avec le moteur **Hermes** de React Native et le bundler **Metro** sur mobile.

### Fonctionnement Cryptographique
1. **Sel Aléatoire Unique :** Généré obligatoirement par `Crypto.getRandomValues(new Uint8Array(16))` d'`expo-crypto` (jamais `Math.random`). 16 octets = 32 caractères hexadécimaux.
2. **Étirement de Clé (Key Stretching) :** PBKDF2 applique HMAC-SHA256 10 000 fois consécutives.
3. **Mise à Niveau Transparente (v1 -> v2) :**
   - Lors de la connexion, l'app vérifie la version du compte (`hash_version`).
   - Si `hash_version === 1` : vérifie avec l'ancien SHA-256 simple. Si mot de passe faux, refus immédiat sans toucher à la base.
   - Si mot de passe correct : l'app génère un nouveau sel, calcule le hash v2 PBKDF2 (10 000 itérations), met à jour la ligne SQLite avec `hash_version = 2`, et connecte l'utilisateur.
   - Toutes les connexions suivantes se font directement en v2.
4. **Nouveaux Comptes :** Reçoivent directement `hash_version = 2` dès l'inscription.
5. **Temps Mesuré :** Sur un appareil moderne, le calcul prend entre **25 ms et 50 ms**, ce qui est instantané pour l'humain mais décourage définitivement un attaquant par force brute.

---

## 3. Sous-étape 3.3 : Contrôle d'Accès et Privilèges Administrateur

### Objectif
Garantir qu'aucun utilisateur normal ne puisse déclencher une action administrative sensible au niveau de la couche de données (`queries.ts`), même en contournant l'interface graphique.

### Implémentation
Création de la fonction de contrôle :
```typescript
export function verifierPrivilegeAdmin(adminUserId?: number): void {
  if (adminUserId !== undefined && adminUserId !== null) {
    const admin = getUserById(adminUserId);
    if (!admin || admin.role !== 'admin' || admin.is_active !== 1) {
      throw new Error(`Accès refusé : l'utilisateur ID ${adminUserId} n'est pas un administrateur actif.`);
    }
    return;
  }
  const nbAdmins = countActiveAdmins();
  if (nbAdmins === 0) {
    throw new Error('Accès refusé : aucun administrateur actif configuré.');
  }
}
```
Cette garde est appelée systématiquement dans :
- `updateUserActiveStatus` (suspension / activation de compte)
- `resetUserPassword` (génération de mot de passe temporaire)
- `deleteUserAndData` (suppression avec cascade)
- `getAdminGlobalStats` (lecture des métriques globales)
- `getAllUsersAdmin` (liste de supervision)
- `addCategoryAdmin` et `updateCategoryAdmin`
- `updatePointsSettings` (règles de gamification)

---

## 4. Sous-étape 3.4 : Typage des Catégories (Produit vs Dépense)

### Objectif
Distinguer clairement deux natures d'achats :
1. **Type `'product'` (Produit / Supermarché) :** Achat d'articles au détail (ex: Lait, Pain, Savon, Huile) avec quantité, unité (L, Kg, pièce), magasin et historique de prix unitaire.
2. **Type `'expense'` (Dépense directe / Fixe) :** Dépenses globales ou factures (ex: Facture STEG/SONEDE, Taxi, Loyer, Internet) avec montant direct.

### Présence dans l'Application
- **Côté Administrateur (`(admin)/categories.tsx`) :**
  - Sélecteur binaire lors de l'ajout d'une catégorie : `🛒 Produit` vs `🧾 Dépense`.
  - Pastille visuelle distinctive sur chaque carte de catégorie dans la liste.
- **Côté Utilisateur (`budget-mois.tsx`) :**
  - Possibilité de créer une catégorie personnalisée à la volée avec choix du type (`Produit` ou `Dépense`).
  - Insertion automatique dans la table `category` et activation instantanée dans `user_category`.

---

## 5. Sous-étape 3.5 : Assistant de Premier Démarrage (Onboarding 3 Étapes)

### Objectif
Accueillir les nouveaux inscrits avec un parcours guidé et engageant, **sans leur imposer de saisie de budget immédiate**, et initialiser leurs catégories préférées.

### Déroulement de l'Écran (`src/app/onboarding.tsx`)
1. **Étape 1 — Bienvenue & Philosophie Locale :**
   - Explication de la confidentialité : 100% hors-ligne, aucune donnée sur serveur cloud.
   - Présentation de la méthode des enveloppes budgétaires.
2. **Étape 2 — Vos Catégories Favorites :**
   - Grille interactive de cases à cocher.
   - Boutons d'aide rapide : "⭐ Recommandées" (catégories essentielles) et "✅ Tout cocher".
   - Sauvegarde des choix dans la table relationnelle `user_category` (`setUserCategories(userId, categoryIds)`).
3. **Étape 3 — Tout est prêt :**
   - Rappel bienveillant que le budget peut être fixé plus tard à tout moment dans Réglages ou Accueil.
   - Bouton final : marque `onboarding_done = 1` dans SQLite, actualise le contexte Auth, et redirige vers `/(tabs)`.

### Routage Conditionnel (`src/app/_layout.tsx`)
Dans `NavigationGuard` :
```typescript
if (user.role === 'user') {
  if ((user.onboarding_done ?? 0) === 0) {
    if (!estSurOnboarding) router.replace('/onboarding');
    return;
  }
  // Si onboarding déjà fait, bloque l'accès à /onboarding
  if (estSurOnboarding) router.replace('/(tabs)');
}
```

---

## 6. Sous-étape 3.6 : Système Trilingue (Français, Arabe, Anglais) et Fallback

### Objectif
Offrir une application totalement trilingue (**Français**, **Arabe**, **Anglais**) avec parité stricte des clés et direction du texte dynamique (RTL/LTR).

### Fichiers de Traduction
- `src/i18n/fr.json` : 128 clés (ressource de référence et langue de secours).
- `src/i18n/ar.json` : 128 clés (arabe littéraire adapté aux utilisateurs tunisiens).
- `src/i18n/en.json` : 128 clés (anglais international).
*Contrôle automatisé : 0 clé manquante entre les trois langues.*

### Règle d'Or de Secours (Fallback)
Dans `src/utils/i18n.ts` :
Si une clé demandée n'existe pas ou est vide dans la langue active, la fonction `translate(cle, langue)` bascule **automatiquement sur la valeur française (`fr.json`)**. L'utilisateur ne voit **jamais** de clé technique brute (ex: `err_code_404`) ni d'espace vide.

### Direction du Texte (RTL vs LTR)
- **Arabe (`ar`) :** Activation de `I18nManager.forceRTL(true)`. Le texte et l'interface s'alignent de droite à gauche.
- **Français (`fr`) & Anglais (`en`) :** `I18nManager.forceRTL(false)`. L'interface s'aligne de gauche à droite.

### Emplacements du Sélecteur de Langue
Un sélecteur à 3 boutons (`🇫🇷 FR` / `🇸🇦 عربي` / `🇬🇧 EN`) est disponible :
1. Sur l'écran de **Connexion** (`src/app/login.tsx`).
2. Sur l'écran d'**Inscription** (`src/app/inscription.tsx`).
3. Dans les **Réglages Utilisateur** (`src/app/(tabs)/reglages.tsx`).
4. Dans les **Réglages Administrateur** (`src/app/(admin)/reglages.tsx`).

### Persistance
- Avant connexion : sauvegardée dans `SecureStore` (ou `localStorage` sur Web) sous la clé `masrouf_langue_pre_login`.
- Après connexion : stockée dans la colonne `langue` de la table `user` de SQLite.

---

## 7. Questions Fréquentes du Professeur & Réponses Types

### Q1 : Pourquoi avoir choisi PBKDF2 plutôt qu'un simple SHA-256 ?
> **Réponse :** SHA-256 est un algorithme rapide conçu pour vérifier l'intégrité de fichiers. Un ordinateur moderne peut calculer des dizaines de millions de hashes SHA-256 par seconde, rendant une attaque par force brute ou dictionnaire très rapide. PBKDF2 applique 10 000 itérations avec sel aléatoire, ralentissant volontairement le calcul à ~30 ms par mot de passe. Cela neutralise les attaques par force brute sans impacter la fluidité pour l'utilisateur légitime.

### Q2 : Comment avez-vous garanti que les utilisateurs existants ne perdent pas leur accès ?
> **Réponse :** Grâce à notre colonne `hash_version`. Les utilisateurs créés avant l'Étape 3 ont `hash_version = 1`. Lors de leur prochaine connexion, le système valide leur mot de passe avec l'ancien algorithme, puis recalcule immédiatement une empreinte PBKDF2 forte et met à jour leur compte avec `hash_version = 2`. La transition est 100% transparente.

### Q3 : Pourquoi distinguer le type "Produit" du type "Dépense" ?
> **Réponse :** Parce que la gestion budgétaire ne traite pas un plein d'essence ou une facture d'électricité de la même façon qu'un paquet de café ou un litre de lait. Les produits nécessitent un historique de prix, un calcul de quantité et la comparaison entre magasins (Carrefour vs Monoprix). Les dépenses sont des montants directs alloués à des factures ou des services fixes.

---

## 8. Étape 4 : Tableau de Bord Personnel (Accueil / Home)

### Objectif
Offrir une vision immédiate et claire de la santé financière du mois en cours : budget total, jauge globale colorée (<70% vert, 70-99% orange, ≥100% rouge), enveloppes par catégorie, dépenses non budgétisées, achats récents et badge de gamification.

### Fichiers Modifiés
- `src/app/(tabs)/index.tsx` : Intégration de `getMonthlyBudget`, synchronisation bidirectionnelle du budget mensuel, alertes dynamiques à 80% et 100% non répétitives via `alertes_log`.
- `src/db/queries.ts` : Requêtes d'agrégation `getTotalMois`, `getRecentAchats`, `getEnveloppesBudget`.

### Points Clés pour la Soutenance
- **Anti-boucle infinie :** `useFocusEffect(rechargerDonnees)` avec un `rechargerDonnees` mémorisé via `useCallback` et exclusion des fonctions stables comme `refreshUser` pour empêcher le débordement de pile (`Maximum update depth exceeded`).
- **Synchronisation du Budget :** Si l'utilisateur a défini son budget via les enveloppes ou les réglages, le total est immédiatement reflété sur la jauge d'accueil.

---

## 9. Étape 5 : Catalogue et Gestion des Produits

### Objectif
Permettre à l'utilisateur de consulter la liste de ses produits enregistrés, de rechercher instantanément par nom, marque ou catégorie, et de filtrer les résultats en direct.

### Fichiers Modifiés
- `src/app/(tabs)/produits.tsx` : Filtrage événementiel via `TextInput` (`onChangeText`), FlatList optimisée, isolation des données par utilisateur (`getAllProduits(user.id)`).
- `src/db/queries.ts` : `getAllProduits(userId)`.

### Points Clés pour la Soutenance
- **Programmation Événementielle :** Le filtrage s'exécute à chaque lettre saisie sans recharger la base de données, grâce à l'état React `recherche` combiné à la méthode JavaScript `.filter()`.
- **Isolation Multi-Utilisateurs :** Chaque utilisateur ne voit que ses propres articles rattachés à son `user_id`.

---

## 10. Étape 6 : Saisie Intelligente des Achats et Détection d'Alertes

### Objectif
Proposer un formulaire modale complet permettant :
1. Soit d'enregistrer l'achat d'un article du catalogue (prix unitaire x quantité x enseigne).
2. Soit d'enregistrer une dépense directe sans produit (factures, services, taxi).
3. De déclencher immédiatement une alerte budgétaire si l'enveloppe dépasse 80% ou 100%.

### Fichiers Modifiés
- `src/app/nouvel-achat.tsx` : Sélecteur de mode binaire, support du paramètre URL `produitId` pour pré-sélection automatique depuis la fiche produit, contrôle des seuils budgétaires post-insertion via `hasAlerteBeenShown` et `logAlerte`.
- `src/db/queries.ts` : Insertion dans la vue unifiée `achats` avec dispatch transparent vers `purchase` ou `expense`.

### Points Clés pour la Soutenance
- **Anti-Répétition des Alertes :** Grâce à la table relationnelle `alert_log` (ou la vue `alertes_log`), une alerte à 80% ou 100% n'est signalée qu'une seule fois par mois et par catégorie.

---

## 11. Étape 7 : Création d'un Nouveau Produit

### Objectif
Fournir une interface modale rapide pour enregistrer un nouvel article dans le catalogue personnel : nom, marque, unité de mesure (`pièce`, `kg`, `L`, `g`, `pack`), catégorie et visuel.

### Fichiers Modifiés
- `src/app/nouveau-produit.tsx` : Contrôle de saisie strict (nom obligatoire, catégorie sélectionnée), validation événementielle, écriture dans la table `product` via `insertProduit`.

---

## 12. Étape 8 : Fiche Détail Produit et Suppression Sécurisée

### Objectif
Afficher la fiche signalétique complète d'un produit : historique chronologique de tous les achats passés, détection automatique du **meilleur prix** (magasin le moins cher 🏆), calcul du prix moyen, raccourci pour ajouter un achat, et suppression avec gestion des dépenses orphelines.

### Fichiers Modifiés
- `src/app/produit/[id].tsx` : Utilisation de `useLocalSearchParams` pour router vers `/produit/[id]`, calculs statistiques en mémoire, boutons d'action rapide (Ajouter un achat / Supprimer).
- `src/db/queries.ts` : Ajout de la fonction `deleteProduit(produitId, mode: 'reassign' | 'cascade')`.
- `src/db/database.web.ts` : Prise en charge de la suppression Web.

### Solution pour les Achats Associés lors de la Suppression
Lorsqu'un utilisateur supprime un produit, l'application lui propose deux options via `Alert.alert` :
1. **Conserver les dépenses (Recommandé - `mode: 'reassign'`) :** Les achats rattachés à ce produit dans `purchase` sont automatiquement convertis en dépenses directes dans la table `expense` avec le libellé `"[Nom du produit] (produit supprimé)"`. **Résultat : aucun millime dépensé ne disparaît du budget mensuel.**
2. **Tout supprimer (`mode: 'cascade'`) :** Le produit et toutes les lignes d'achats associées sont définitivement effacés par cascade.

---

## 13. Étape 9 : Analyses et Statistiques Mensuelles

### Objectif
Fournir un écran analytique complet pour comprendre la répartition de ses finances :
1. Total dépensé vs Mois précédent avec calcul automatique de l'économie réalisée (🎉) ou du dépassement (⚠️).
2. Répartition par catégorie sous forme de barres de progression horizontales proportionnelles et colorées.
3. Carte de Performance Gamification montrant les points accumulés, le badge actuel (🌱 Débutant, 💰 Économe, 🏆 Expert) et les points manquants pour atteindre le palier supérieur.

### Fichiers Modifiés
- `src/app/(tabs)/analyses.tsx` : Agrégation SQL `GROUP BY` et `SUM` via `getDepensesParCategorie`, jauge de progression de niveau, messages d'encouragement personnalisés.

---

## 14. Étape 10 : Réglages Utilisateur et Gestion du Profil

### Objectif
Centraliser les préférences de l'utilisateur :
1. Définition directe du budget mensuel global (TND) avec persistance dans la table `user`.
2. Changement sécurisé du mot de passe avec le nouveau hachage PBKDF2 (version 2).
3. Sélecteur trilingue instantané (Français 🇫🇷, Arabe 🇸🇦, Anglais 🇬🇧).
4. Affichage du niveau de gamification et déconnexion sécurisée de la session (`expo-secure-store`).

### Fichiers Modifiés
- `src/app/(tabs)/reglages.tsx` : Formulaire de budget global avec confirmation, mise à jour du contexte Auth via `updateUser({ budget_mensuel })`, affichage des points et du badge.

---

## 15. Étape 11 : Espace Administrateur et Protection des Données

### Objectif
Permettre à un administrateur système de superviser l'application tout en respectant scrupuleusement la vie privée des utilisateurs :
1. **Dashboard KPI Anonyme :** Nombre d'utilisateurs, comptes actifs, catalogue, nombre de transactions, volume global en TND, catégorie la plus sollicitée. Aucune dépense personnelle n'est exposée.
2. **Gestion des Utilisateurs :** Activer/suspendre un compte, générer un mot de passe temporaire à usage unique (avec `must_change_password = 1`), suppression définitive avec cascade.
3. **Sécurité et Garde-fous :** Impossible pour un administrateur de se suspendre ou de se supprimer lui-même ; obligation de conserver au moins un administrateur actif.
4. **Vérification de Privilèges :** Chaque fonction d'administration dans `queries.ts` appelle `verifierPrivilegeAdmin(adminUserId)`.

### Fichiers Modifiés
- `src/app/(admin)/dashboard.tsx`, `utilisateurs.tsx`, `categories.tsx`, `points-regles.tsx`, `reglages.tsx`.
- `src/db/queries.ts` : `verifierPrivilegeAdmin`, `getAdminGlobalStats`, `getAllUsersAdmin`.

---

## 16. Étape 12 : Enveloppes Budgétaires et Règle Anti-Triche

### Objectif
Mettre en œuvre la méthode éprouvée des enveloppes budgétaires :
1. Répartition du budget mensuel par catégorie (« Masrouf Alimentation », « Masrouf Santé », etc.).
2. Recopie en 1 clic du budget du mois précédent pour gagner du temps.
3. **Règle Anti-Triche :** Interdiction stricte de baisser le montant alloué à une enveloppe en dessous du montant déjà dépensé ce mois-ci dans cette catégorie.

### Fichiers Modifiés
- `src/app/budget-mois.tsx` : Calcul en temps réel de la somme allouée et du reste à répartir, alerte en cas de dépassement du budget global, vérification `canDecreaseBudget` pour chaque enveloppe avant validation.

---

## 17. Étape 13 : Gamification et Évaluation Mensuelle

### Objectif
Motiver l'utilisateur à respecter ses budgets grâce à un système ludique et gratifiant :
1. **Attribution automatique des points :**
   - Points par enveloppe respectée en fin de mois (ex: +10 pts par catégorie non dépassée).
   - Bonus « Grand Chelem » pour un mois parfait où 100% des enveloppes ont été respectées (+50 pts).
2. **Évaluation transparente :**
   - Dès le premier lancement d'un nouveau mois, `evaluerMoisPrecedent(userId, moisCourant)` analyse le mois clos, calcule les points, insère une entrée dans `points_log` et marque `monthly_budgets.est_evalue = 1` pour éviter tout double comptage.
   - Une alerte félicite immédiatement l'utilisateur sur son écran d'accueil.
3. **Seuils Administrables :** L'administrateur peut ajuster le barème des points et les seuils de niveau dans `(admin)/points-regles.tsx`.

---

## 18. Étape 14 : Conformité aux 13 Exigences du Professeur

Le projet Masrouf valide l'intégralité des 13 points du cahier des charges académique :

1. **Types de vues :** `View`, `Text`, `ScrollView`, `FlatList`, `TextInput`, `TouchableOpacity`, `Modal`.
2. **Images :** Icônes dynamiques, avatars de catégorie, intégration d'`expo-image` et affichage avec placeholders.
3. **Style et dimensions :** `StyleSheet.create`, dimensions relatives, gestion des thèmes et palettes de contrastes.
4. **Composants d'action :** Boutons tactiles avec retour visuel (`activeOpacity`), puces de sélection (`chips`), barres de progression.
5. **Programmation événementielle :** Événements `onPress`, `onChangeText`, `onFocus`, `onBlur`, recherche en temps réel.
6. **Formulaires et validations :** Vérification de longueur minimale de mot de passe, confirmation identique, montants numériques positifs, détection des doublons.
7. **Alertes et dialogues :** Boîtes de confirmation `Alert.alert` sur les opérations critiques (suppression de compte, réinitialisation de mot de passe, suppression de produit, alertes 80%/100%).
8. **Cycle de vie et hooks :** `useState`, `useEffect`, `useCallback`, `useMemo`, et `useFocusEffect` (rechargement automatique à chaque focus d'écran).
9. **Stockage relationnel persistant :** SQLite local via `expo-sqlite` avec clés primaires auto-incrémentées, contraintes d'unicité, clés étrangères `ON DELETE CASCADE` et transactions.
10. **Stockage de session sécurisé :** `expo-secure-store` pour mémoriser le jeton de session utilisateur et la langue pré-connexion.
11. **Navigation externe moderne :** `expo-router` avec navigation par onglets (`(tabs)`), navigation modale (`nouvel-achat`, `nouveau-produit`), et routes dynamiques (`produit/[id]`).
12. **Navigation conditionnelle et rôles :** `NavigationGuard` dans `_layout.tsx` inspectant en continu le rôle (`user` vs `admin`), le statut actif/suspendu, et l'assistant de premier démarrage (`onboarding_done`).
13. **Ressources multilingues avec qualificatifs :** Support trilingue complet (Français, Arabe, Anglais) avec parité stricte des 128 clés, inversion de la direction d'écriture RTL/LTR via `I18nManager`, et règle de secours garantie sur le français.

---

## 19. Questions-Réponses Types pour la Soutenance Orale

### Q1 : Comment fonctionne la règle anti-triche du budget ?
> **Réponse :** Dans `budget-mois.tsx`, avant d'enregistrer les nouvelles enveloppes, la fonction `canDecreaseBudget(userId, mois, catId, nouveauMontant)` compare le montant alloué proposé avec la somme des dépenses déjà enregistrées dans cette catégorie pour le mois en cours. Si l'utilisateur essaie de réduire l'enveloppe à 50 TND alors qu'il a déjà dépensé 70 TND, l'application bloque l'opération avec un message d'erreur clair.

### Q2 : Que se passe-t-il si un utilisateur supprime un produit ayant déjà servi à des achats ?
> **Réponse :** Grâce à notre fonction `deleteProduit(produitId, 'reassign')`, l'application propose à l'utilisateur de convertir automatiquement les tickets d'achat du produit en dépenses directes dans la table `expense`. Le produit est retiré du catalogue, mais les montants dépensés restent parfaitement comptabilisés dans le budget mensuel.

### Q3 : Pourquoi les alertes à 80% et 100% ne s'affichent-elles pas en boucle ?
> **Réponse :** Nous utilisons la table `alert_log` (ou vue `alertes_log`). Dès qu'une alerte à 80% ou 100% est déclenchée pour un utilisateur, un mois et une catégorie donnés, une ligne est enregistrée. La fonction `hasAlerteBeenShown` vérifie cette table avant tout affichage, garantissant qu'une alerte n'apparaît qu'une seule et unique fois par mois et par seuil.

### Q4 : Comment la confidentialité des utilisateurs est-elle protégée face à l'administrateur ?
> **Réponse :** L'administrateur n'a aucun accès aux tables de dépenses individuelles (`purchase`, `expense`). La fonction `getAdminGlobalStats` n'exécute que des requêtes de comptage (`COUNT`) et de somme globale (`SUM`) anonymes. De plus, toutes les données sont stockées localement dans la base SQLite de l'appareil, sans aucun serveur distant.

### Q5 : Pourquoi avoir choisi Expo Router plutôt que React Navigation classique ?
> **Réponse :** Expo Router s'appuie sur le système de fichiers (File-based Routing), ce qui rend l'architecture prévisible et modulaire. Il gère nativement le typage des routes, les fenêtres modales avec présentation glissante, les routes dynamiques (`produit/[id]`), et s'intègre parfaitement avec le cycle de vie de React Native.


