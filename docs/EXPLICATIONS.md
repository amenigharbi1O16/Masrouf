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

### Q4 : Que se passe-t-il si une traduction manque en anglais ou en arabe ?
> **Réponse :** Notre système implémente le patron "Fallback". La fonction `translate()` vérifie d'abord la clé dans la langue active, et si elle est absente ou vide, elle extrait la valeur du fichier `fr.json`. L'écran reste toujours lisible et compréhensible.
