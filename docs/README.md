# 📚 GUIDE CENTRAL DE LA DOCUMENTATION TECHNIQUE — MASROUF (مصروف)

> **Application :** MASROUF — Gestion budgétaire familiale & observatoire des prix en Dinars Tunisiens (3 décimales).  
> **Technologies :** React Native 0.88, Expo 58, Expo Router 58, SQLite local (`expo-sqlite` 16), TypeScript Strict, i18n trilingue (Français, Arabe RTL, Anglais).  
> **Architecture :** 100 % Hors-Ligne (Offline First), Zéro Serveur Cloud, Respect absolu de la vie privée.  
> **Statut de l'Audit Académique :** 100 % des exigences du professeur sont **PLEINEMENT IMPLÉMENTÉES** (*Fully Implemented*).

---

## 🗺️ TABLE D'ORIENTATION THÉMATIQUE DE LA DOCUMENTATION

Pour préparer et réussir votre soutenance orale devant le professeur, l'ensemble des explications techniques est classé en **10 documents de référence exhaustifs**, accessibles directement via les liens ci-dessous :

```text
docs/
├── README.md                            <-- Ce document : Le hub central d'orientation
├── 01_SCREENS_AND_UI.md                 <-- Sujet 1 : Écrans, composants visuels et correspondances UI-to-Code
├── 02_COMPONENTS_AND_FUNCTIONS.md       <-- Sujet 2 : Composants réutilisables, primitives UI et fonctions utilitaires
├── 03_DATABASE_AND_PERSISTENCE.md       <-- Sujet 3 : Schéma SQLite à 12 tables, requêtes ACID et persistance
├── 04_NAVIGATION_AND_GUARDS.md          <-- Sujet 4 : Moteur Expo Router, arborescence, tiroir et gardes de session
├── 05_NOTIFICATIONS_AND_TRIGGERS.md     <-- Sujet 5 : Notifications smartphone, canal Android, son, vibration et badge
├── 06_EVENTS_AND_INTERACTIONS.md        <-- Sujet 6 : Programmation événementielle (Press, Input, Scroll, Switch, Modals)
├── 07_USER_ROLES_AND_PERMISSIONS.md     <-- Sujet 7 : Rôles Admin vs User, matrice des permissions et pare-feu privé
├── 08_LANGUAGES_AND_RESOURCES.md        <-- Sujet 8 : Internationalisation trilingue, mode miroir RTL et manuel PDF
├── 09_LIBRARIES_AND_ARCHITECTURE.md     <-- Sujet 9 : Architecture en 4 couches et audit des bibliothèques de package.json
└── 10_TEACHER_REQUIREMENTS_AUDIT.md     <-- Sujet 10 : Preuves formelles des 5 exigences académiques du professeur
```

---

## 📖 RÉPERTOIRE DÉTAILLÉ DES SUJETS

| N° | Sujet d'Étude | Document de Référence | Ce que vous y découvrirez |
| :---: | :--- | :--- | :--- |
| **1** | **Écrans & Interface Utilisateur** | [`docs/01_SCREENS_AND_UI.md`](file:///c:/Users/USER/Documents/react-native-project/docs/01_SCREENS_AND_UI.md) | Description de chaque écran, chaque bouton, carte, champ, graphique, modal et notification avec son rôle, ses styles et ses liaisons SQL. |
| **2** | **Composants & Fonctions** | [`docs/02_COMPONENTS_AND_FUNCTIONS.md`](file:///c:/Users/USER/Documents/react-native-project/docs/02_COMPONENTS_AND_FUNCTIONS.md) | Catalogue des briques de design (`AppHeader`, `SideDrawer`, `Cards`, `Button`, `Input`, `PriceChart`, `Skeleton`) et des utilitaires mathématiques/sécurité. |
| **3** | **Base de Données & Persistance** | [`docs/03_DATABASE_AND_PERSISTENCE.md`](file:///c:/Users/USER/Documents/react-native-project/docs/03_DATABASE_AND_PERSISTENCE.md) | Schéma des 12 tables relationnelles, intégrité référentielle, journal WAL, versionnage `PRAGMA user_version` et requêtes paramétrées. |
| **4** | **Navigation & Gardiens de Sécurité** | [`docs/04_NAVIGATION_AND_GUARDS.md`](file:///c:/Users/USER/Documents/react-native-project/docs/04_NAVIGATION_AND_GUARDS.md) | Routage déclaratif Expo Router, 4 layouts, arborescence complète, tiroir latéral bidirectionnel et Route Guards étanches. |
| **5** | **Notifications & Déclencheurs** | [`docs/05_NOTIFICATIONS_AND_TRIGGERS.md`](file:///c:/Users/USER/Documents/react-native-project/docs/05_NOTIFICATIONS_AND_TRIGGERS.md) | Canal Android haute importance `masrouf_alerts`, alertes de seuil 80%/100%, vibration, sonnerie, badge d'icône +1 et centre in-app. |
| **6** | **Programmation Événementielle** | [`docs/06_EVENTS_AND_INTERACTIONS.md`](file:///c:/Users/USER/Documents/react-native-project/docs/06_EVENTS_AND_INTERACTIONS.md) | Gestion des événements tactiles (`Pressable`), de saisie (`TextInput`), de défilement (`FlatList`), d'interrupteurs (`Switch`) et multimédias (`ImagePicker`). |
| **7** | **Rôles & Permissions (RBAC)** | [`docs/07_USER_ROLES_AND_PERMISSIONS.md`](file:///c:/Users/USER/Documents/react-native-project/docs/07_USER_ROLES_AND_PERMISSIONS.md) | Ségrégation étanche entre l'Administrateur et l'Utilisateur : le pare-feu empêche formellement l'administrateur de voir les dépenses privées. |
| **8** | **Langues, Ressources & Mode RTL** | [`docs/08_LANGUAGES_AND_RESOURCES.md`](file:///c:/Users/USER/Documents/react-native-project/docs/08_LANGUAGES_AND_RESOURCES.md) | 100% de parité entre les 3 dictionnaires (726 clés chacun), inversion miroir en Arabe (RTL), persistance `SecureStore` et manuel PDF localisé. |
| **9** | **Architecture & Bibliothèques** | [`docs/09_LIBRARIES_AND_ARCHITECTURE.md`](file:///c:/Users/USER/Documents/react-native-project/docs/09_LIBRARIES_AND_ARCHITECTURE.md) | Patron en 4 couches découplées et justification de chaque dépendance installée dans `package.json` avec l'impact en cas de suppression. |
| **10** | **Audit des Exigences Professeur** | [`docs/10_TEACHER_REQUIREMENTS_AUDIT.md`](file:///c:/Users/USER/Documents/react-native-project/docs/10_TEACHER_REQUIREMENTS_AUDIT.md) | Démonstration point par point des 5 exigences académiques avec extraits de code, lignes précises et script de présentation orale en 5 minutes. |

---

## 💡 RÉSUMÉ EXÉCUTIF POUR LA SOUTENANCE ORALE

Si le professeur vous pose des questions imprévues pendant la soutenance, gardez en tête ces 5 arguments fondamentaux :

1. **Pourquoi avoir choisi SQLite en local plutôt qu'une API Firebase ou Cloud ?**
   > *« Pour garantir un secret bancaire familial absolu à nos utilisateurs tunisiens : aucune dépense privée ne transite sur Internet, l'application fonctionne parfaitement dans le désert ou en mode avion sans connexion, et les temps de réponse sont quasi instantanés (moins de 2 millisecondes grâce au journal WAL). »*
2. **Comment fonctionne le système des deux rôles ?**
   > *« Nous avons implémenté un modèle RBAC strict. Si l'administrateur se connecte, notre Route Guard l'aiguille vers `/(admin)/dashboard` avec un menu tiroir de 8 options. Les requêtes SQL vers les tables d'achats comportent toutes un filtre obligatoire `WHERE utilisateur_id = ?`, ce qui rend techniquement impossible pour l'administrateur d'espionner les dépenses des familles. »*
3. **Comment l'application gère-t-elle l'Arabe (RTL) sans redémarrer le smartphone ?**
   > *« Dès que l'utilisateur clique sur 'عربي', le hook `useTranslation` active `isRTL: true`. Nos composants adaptent dynamiquement leurs propriétés Flexbox en `row-reverse`, les textes s'alignent à droite, les chevrons s'inversent, et le menu tiroir glisse depuis le bord droit de l'écran, le tout synchronisé sur nos 726 clés de traduction rigoureusement identiques. »*
4. **Comment fonctionne le calcul des prix unitaires et le suivi d'inflation ?**
   > *« Lors de la saisie d'un ticket de caisse, l'application divise le montant total payé par la quantité achetée (ex: 8.100 DT pour 6 L de lait donne 1.350 DT/L). Elle compare ensuite ce prix unitaire avec le relevé précédent du même article dans la table `purchase`, et trace une courbe vectorielle SVG pour visualiser la tendance haussière ou baissière. »*
5. **Comment les notifications locales sont-elles sécurisées sur Android ?**
   > *« Nous utilisons `expo-notifications` avec un canal Android dédié de priorité MAX (`masrouf_alerts`). Lors de l'exécution sous Expo Go, nous détectons l'environnement via `Constants.appOwnership === 'expo'` et encapsulons l'appel dans un `try/catch` afin d'éviter tout blocage d'exécution. Les alertes à 80% et 100% sonnent et vibrent nativement sur le smartphone. »*
