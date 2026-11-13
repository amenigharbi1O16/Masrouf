# Guide des Explications Techniques et Pédagogiques — Masrouf

Ce dossier rassemble l'ensemble des explications nécessaires pour comprendre le fonctionnement interne de l'application **Masrouf**, maîtriser son architecture technique et préparer la soutenance orale devant le jury ou le professeur.

L'ensemble de la documentation a été rédigé en français simple, structuré et sans jargon superflu, avec des schémas, des tableaux comparatifs, des requêtes SQL réelles et des exemples chiffrés concrets.

---

## 🗺️ Plan de la Documentation

1. **[01_ecrans.md](./01_ecrans.md) — Les 43 types d'écrans du design**
   - Inventaire détaillé écran par écran.
   - Fichiers source, composants affichés dans l'ordre visuel.
   - Rôles, requêtes SQL exécutées, événements déclenchés.
   - Gestion des états particuliers : chargement (Skeleton), vide, erreur, alerte.

2. **[02_analyses.md](./02_analyses.md) — L'écran Analyses et le moteur décisionnel**
   - Calcul de la période précédente symétrique de même durée.
   - Requête d'agrégation monétaire en millimes entiers pour zéro dérive d'arrondi.
   - Algorithme de conclusion automatique 100 % déterministe (sans IA ni réseau).
   - Traductions paramétrées dans les 3 langues (FR, AR, EN).

3. **[03_photos.md](./03_photos.md) — Cycle de vie complet des photos de produits**
   - Sélecteur natif (caméra et galerie) et gestion des permissions.
   - Pourquoi le stockage permanent diffère du stockage temporaire du sélecteur.
   - Pourquoi seul le **nom relatif du fichier** est enregistré dans SQLite.
   - Le composant partagé `ProductThumb`, le repli par défaut et le nettoyage des fichiers orphelins.

4. **[04_database.md](./04_database.md) — Base de données SQLite et architecture SQL**
   - Les 12 tables et vues relationnelles, clés primaires et clés étrangères.
   - Système de migrations incrémentales et idempotentes.
   - Mode WAL (*Write-Ahead Logging*) pour la concurrence et les performances.
   - Guide pratique : comment ajouter une nouvelle table, requête ou migration.

5. **[05_securite_auth.md](./05_securite_auth.md) — Sécurité, Authentification et Rôles**
   - Hachage cryptographique PBKDF2 v2 (10 000 itérations + sel) et migration transparente v1 → v2.
   - Persistance sécurisée de la session via Expo SecureStore.
   - Algorithme de navigation conditionnelle dans `_layout.tsx` (ordre strict des priorités).
   - Double protection des routes d'administration.
   - Garantie de confidentialité absolue : ce que l'administrateur peut voir vs ce qu'il ne verra jamais.
   - Tableau comparatif complet Utilisateur vs Administrateur.

6. **[06_navigation_hooks.md](./06_navigation_hooks.md) — Navigation et Hooks React**
   - Routage déclaratif basé sur les fichiers avec `expo-router` (`push`, `replace`, `back`).
   - Décorticage des hooks standards (`useState`, `useEffect`, `useContext`).
   - Hooks de routage et cycle de vie (`useRouter`, `useSegments`, `useFocusEffect`).
   - Hooks métier du projet (`useAuth`, `useTranslation`, `useDrawer`).

7. **[07_paquets.md](./07_paquets.md) — Analyse exhaustive des dépendances (`package.json`)**
   - Rôle de chaque bibliothèque installée et justification de son choix.
   - Fichiers du projet qui l'utilisent.
   - Conséquences directes si le paquet était retiré.

8. **[08_calculs_et_metier.md](./08_calculs_et_metier.md) — Logique métier, Calculs et Règles financières**
   - Cycle de vie complet d'un achat (de la frappe au clavier à la jauge d'alerte).
   - Formules et exemples numériques (prix unitaire, deltas, seuils d'alerte à 80 % et 100 %).
   - Système de gamification (points, paliers, badges).
   - Distinction conceptuelle et visuelle entre produit et dépense simple.
   - Système de design (couleurs, composants UI réutilisables, formatage `formatDT`).
   - Internationalisation, support RTL (arabe de droite à gauche) et manuels PDF embarqués.

9. **[09_questions_jury_et_limites.md](./09_questions_jury_et_limites.md) — Préparation à la soutenance et Limites**
   - Réponses directes et claires aux questions typiques du jury / professeur.
   - Justification des choix architecturaux (100 % local vs cloud).
   - Limites réelles et honnêtes de l'application (sauvegarde locale, absence de synchronisation, sécurité sur téléphone rooté).

---

## 🎯 Comment utiliser ces fiches pour la soutenance ?

1. **Si le prof vous demande : *« Montrez-moi comment marche le calcul du budget et des analyses »***
   → Ouvrez directement `02_analyses.md` et `08_calculs_et_metier.md`.
2. **Si le prof inspecte la base de données ou le code SQL :**
   → Référez-vous à `04_database.md`.
3. **Si le prof pose une question sur la sécurité ou la protection des données :**
   → Développez avec `05_securite_auth.md`.
4. **Si le prof teste la prise de photo ou vous demande pourquoi les images ne se cassent pas :**
   → Expliquez la règle du nom relatif décrite dans `03_photos.md`.
5. **Si le prof vous challenge sur les limites du système ou vos choix techniques :**
   → Piochez les réponses clé en main dans `09_questions_jury_et_limites.md`.
