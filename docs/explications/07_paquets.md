# 07 — Analyse Exhaustive des Dépendances (`package.json`)

Chaque bibliothèque présente dans le fichier `package.json` de **Masrouf** répond à un besoin précis dicté par les contraintes d'une application **100 % locale, performante et fluide**.

Ce document détaille pour chaque paquet : son utilité, la raison de son choix, les fichiers du projet qui l'utilisent, et l'impact direct si on venait à le retirer.

---

## 📦 1. Moteur de l'Application et Runtime

### `expo` (~58.0.19)
- **À quoi il sert** : Socle d'exécution universel et boîte à outils fournissant les ponts natifs pour iOS, Android et le web.
- **Pourquoi on l'a choisi** : Permet de compiler et d'exécuter l'application sur n'importe quel smartphone sans configurer manuellement Xcode ou Android Studio.
- **Fichiers concernés** : Point d'entrée de l'application, `metro.config.js`.
- **Si on l'enlevait** : L'application ne pourrait plus démarrer ni accéder à aucune API native.

### `react` (19.3.0) & `react-native` (0.88.0)
- **À quoi ils servent** : Framework déclaratif de composants et moteur traduisant le JSX en composants d'interface natifs (boutons, listes, textes).
- **Pourquoi on les a choisis** : Standard mondial du développement mobile multiplateforme garantissant 60 images par seconde.
- **Fichiers concernés** : Tous les fichiers `.tsx` du projet dans `src/app/` et `src/components/`.
- **Si on les enlevait** : Aucun composant d'interface ne pourrait exister.

---

## 🗄️ 2. Persistance et Base de Données

### `expo-sqlite` (~58.0.15)
- **À quoi il sert** : Moteur de base de données relationnelle SQLite locale embarquée sur le téléphone.
- **Pourquoi on l'a choisi** : Fournit la nouvelle API synchrone `openDatabaseSync` qui élimine la lourdeur des promesses asynchrones pour les requêtes courantes, tout en supportant les clés étrangères et le mode de journalisation rapide **WAL**.
- **Fichiers concernés** : `src/db/database.ts`, `src/db/queries.ts`, `src/db/migrate.ts`.
- **Si on l'enlevait** : Impossibilité totale de stocker les comptes, les budgets, les produits et les achats : l'application perdrait toutes ses données à chaque fermeture.

---

## 🔒 3. Sécurité et Cryptographie

### `@noble/hashes` (1.7.1)
- **À quoi il sert** : Bibliothèque cryptographique moderne en TypeScript pur fournissant l'algorithme de dérivation de clé **PBKDF2-HMAC-SHA256**.
- **Pourquoi on l'a choisi** : Ultra-légère, auditée, sans dépendance native, elle permet d'exécuter 10 000 itérations de hachage de façon déterministe sur toutes les plateformes.
- **Fichiers concernés** : `src/utils/security.ts`.
- **Si on l'enlevait** : Impossibilité de générer et de vérifier les mots de passe sécurisés PBKDF2 v2.

### `expo-crypto` (~58.0.8)
- **À quoi il sert** : Génération de nombres aléatoires cryptographiques au niveau matériel (`Crypto.getRandomValues`) et calcul de digests SHA-256.
- **Pourquoi on l'a choisi** : Indispensable pour créer des sels aléatoires imprédictibles, contrairement à `Math.random()` qui est prévisible et non sécurisé.
- **Fichiers concernés** : `src/utils/security.ts`.
- **Si on l'enlevait** : Les sels des mots de passe deviendraient prévisibles, exposant les utilisateurs aux attaques par dictionnaire.

### `expo-secure-store` (~58.0.3)
- **À quoi il sert** : Stockage chiffré de clés-valeurs dans le coffre-fort matériel de l'appareil (iOS Keychain / Android Keystore).
- **Pourquoi on l'a choisi** : Conserve la session de connexion active de façon inviolable même en cas de vol du téléphone, contrairement à un simple `AsyncStorage` en clair.
- **Fichiers concernés** : `src/utils/auth.tsx`, `src/utils/session.ts`.
- **Si on l'enlevait** : L'utilisateur devrait retaper son mot de passe à chaque fois qu'il ouvre l'application.

---

## 🧭 4. Navigation et Gestuelle

### `expo-router` (~58.0.26)
- **À quoi il sert** : Routage déclaratif basé sur l'arborescence des fichiers avec gestion automatique de la pile de navigation.
- **Pourquoi on l'a choisi** : Intégration native des onglets (`(tabs)`), des sous-groupes administratifs (`(admin)`), des paramètres d'URL dynamiques (`produit/[id]`) et du typage statique TypeScript.
- **Fichiers concernés** : `src/app/_layout.tsx`, et tous les fichiers sous `src/app/`.
- **Si on l'enlevait** : L'application n'aurait plus aucun système de changement de page ou de gestion des écrans.

### `react-native-gesture-handler` (~3.3.0) & `react-native-reanimated` (4.7.1)
- **À quoi ils servent** : Gestion tactile native fluide (glissements, appuis longs) et animations exécutées directement sur le fil d'exécution graphique (UI thread à 60 fps).
- **Pourquoi on les a choisis** : Permettent au tiroir latéral (**AppDrawer**) d'effectuer son animation d'ouverture/fermeture sans aucune saccade.
- **Fichiers concernés** : `src/components/AppDrawer.tsx`, jauges animées.
- **Si on les enlevait** : Le tiroir de navigation et les jauges deviendraient statiques ou souffriraient de ralentissements visuels.

### `react-native-screens` (~4.30.0) & `react-native-safe-area-context` (~5.10.1)
- **À quoi ils servent** : Optimisation de la mémoire vive en détruisant les vues inactives et adaptation automatique aux encoches d'écran (*notches*), barres d'état et barres de geste.
- **Pourquoi on les a choisis** : Évitent que le contenu ne passe sous l'îlot dynamique d'un iPhone ou la caméra poinçon d'un smartphone Android.
- **Fichiers concernés** : `src/app/_layout.tsx`, composants d'en-tête.
- **Si on les enlevait** : Des boutons ou du texte seraient masqués par la caméra ou la barre de navigation du système.

---

## 📸 5. Multimédia, Photos et Documents

### `expo-image-picker` (~58.0.10)
- **À quoi il sert** : Ouverture de l'appareil photo natif et de la galerie multimédia pour prendre ou sélectionner une photo.
- **Pourquoi on l'a choisi** : Gère automatiquement les demandes de permissions système et permet de forcer un format carré (1:1) et une compression optimisée (0.7).
- **Fichiers concernés** : `src/app/nouveau-produit.tsx`, `src/app/modifier-produit.tsx`.
- **Si on l'enlevait** : Impossible d'ajouter des photos réelles aux produits.

### `expo-file-system` (~58.0.13)
- **À quoi il sert** : Lecture, écriture et gestion des fichiers dans l'espace de stockage permanent de l'application (`Paths.document`).
- **Pourquoi on l'a choisi** : Permet de déplacer les photos de produits du répertoire de cache temporaire vers un dossier permanent, et d'accéder aux manuels d'utilisation PDF locaux.
- **Fichiers concernés** : `src/utils/photos.ts`, `src/utils/pdf.ts`.
- **Si on l'enlevait** : Les photos seraient purgées par le système d'exploitation au bout de quelques jours.

### `expo-image` (~58.0.17)
- **À quoi il sert** : Composant de rendu d'image haute performance remplaçant le composant `Image` standard de React Native.
- **Pourquoi on l'a choisi** : Offre une mise en mémoire cache matérielle ultra-rapide et un décodage asynchrone des vignettes de produits.
- **Fichiers concernés** : `src/components/ProductThumb.tsx`.
- **Si on l'enlevait** : Les listes de produits saccaderaient lors d'un défilement rapide avec des dizaines d'images.

### `expo-linking` (~58.0.14) & `expo-web-browser` (~58.0.6)
- **À quoi ils servent** : Déclenchement des intentions système (*intents*) pour ouvrir un document externe ou une visionneuse PDF.
- **Pourquoi on les a choisis** : Permettent d'ouvrir les manuels d'utilisation `manuel_fr.pdf`, `manuel_ar.pdf` dans l'application PDF par défaut de l'utilisateur.
- **Fichiers concernés** : `src/utils/pdf.ts`.
- **Si on les enlevait** : L'utilisateur ne pourrait pas consulter les guides d'utilisation intégrés.

---

## 🌐 6. Internationalisation et Typographie

### `i18n-js` (^4.5.4)
- **À quoi il sert** : Moteur de dictionnaires de traduction gérant le remplacement de paramètres textuels (`{param}`).
- **Pourquoi on l'a choisi** : Léger, synchrone et rapide, il supporte le basculement instantané entre Français, Arabe et Anglais sans redémarrer l'application.
- **Fichiers concernés** : `src/utils/i18n.ts`, `src/i18n/fr.json`, `src/i18n/ar.json`, `src/i18n/en.json`.
- **Si on l'enlevait** : L'application n'aurait plus de support multilingue et afficherait des clés de traduction brutes.

