# 06 — Navigation et Hooks React Expliqués

Ce document décortique les mécanismes de navigation avec **Expo Router** ainsi que les hooks React (natifs et personnalisés) utilisés dans **Masrouf**. Il explique leur rôle exact, le moment où ils se déclenchent et leur impact visuel sur l'écran.

---

## 1. La Navigation avec Expo Router : `push`, `replace` et `back`

Expo Router utilise un système de routage basé sur les fichiers (comme Next.js sur le web) : chaque fichier du dossier `src/app/` devient automatiquement un écran de l'application.

Pour naviguer entre les écrans, nous utilisons l'objet `router` importé depuis `expo-router`. Il propose trois actions fondamentales :

### A. `router.push(destination)`
- **Ce qu'il fait** : Empile le nouvel écran **au-dessus** de l'écran actuel (comme poser une nouvelle carte sur un tas).
- **Conséquence** : L'utilisateur peut revenir en arrière via le bouton retour matériel d'Android ou la flèche retour en haut de l'écran.
- **Exemple réel dans Masrouf** :
  ```typescript
  // Depuis la liste des produits vers la fiche détaillée du produit #4
  router.push(`/produit/${produit.id}`);
  ```

### B. `router.replace(destination)`
- **Ce qu'il fait** : Remplace l'écran actuel par le nouvel écran dans la pile d'historique (sans empiler).
- **Conséquence** : L'écran précédent est effacé de l'historique. Si l'utilisateur appuie sur le bouton retour, il ne revient pas sur l'écran remplacé.
- **Exemples réels dans Masrouf** :
  - Après une connexion réussie :
    ```typescript
    router.replace('/(tabs)'); // On empêche l'utilisateur de "revenir" sur l'écran de login !
    ```
  - Après une déconnexion :
    ```typescript
    router.replace('/login');
    ```
  - Lors des redirections forcées de sécurité dans `NavigationGuard`.

### C. `router.back()`
- **Ce qu'il fait** : Dépile l'écran actuel et ramène l'utilisateur à l'écran juste en dessous dans l'historique.
- **Exemple réel dans Masrouf** :
  ```typescript
  // Bouton "Annuler" ou flèche retour sur l'écran d'ajout de produit
  <TouchableOpacity onPress={() => router.back()}>
    <Text>{t('common.cancel')}</Text>
  </TouchableOpacity>
  ```

---

## 2. Les Hooks Standards de React

### `useState`
- **Rôle** : Déclarer une variable d'état locale qui, lorsqu'elle change de valeur, force le composant à se re-rendre à l'écran.
- **Quand il se déclenche** : Lors de la modification par sa fonction de mise à jour (ex. `setMontant(...)`).
- **Exemple dans Masrouf** :
  ```typescript
  const [quantite, setQuantite] = useState<string>('1');
  const [erreur, setErreur] = useState<string | null>(null);
  ```

### `useEffect`
- **Rôle** : Exécuter un effet secondaire (chargement de données, souscription à un événement, minuterie) après que le composant s'est affiché.
- **Quand il se déclenche** : Au montage du composant, puis à chaque fois qu'une variable de son tableau de dépendances `[...]` change.
- **Exemple dans Masrouf** :
  ```typescript
  // Déclenche la recherche et les suggestions à chaque frappe de l'utilisateur
  useEffect(() => {
    if (texteRecherche.trim().length >= 2) {
      const suggestions = trouverProduitsSimilaires(texteRecherche);
      setListeSuggestions(suggestions);
    }
  }, [texteRecherche]);
  ```

### `useContext`
- **Rôle** : Lire une valeur globale partagée par un *Provider* sans avoir à faire passer des props de parent à enfant manuellement (*prop drilling*).
- **Exemple dans Masrouf** : Accéder à la session utilisateur courante ou à la langue active n'importe où dans l'arborescence.

---

## 3. Les Hooks Spécifiques d'Expo Router

### `useRouter`
- **Rôle** : Fournit l'objet de navigation impérative (`push`, `replace`, `back`).
- **Quand il est utilisé** : Dans tout composant qui a besoin de déclencher une transition de page suite à une action utilisateur.

### `useSegments`
- **Rôle** : Renvoie le chemin d'URL découpé sous forme de tableau de chaînes de caractères.
- **Exemple** : Si l'utilisateur est sur `/(admin)/utilisateurs`, `useSegments()` renvoie `['(admin)', 'utilisateurs']`.
- **Rôle dans Masrouf** : Permet au pare-feu `NavigationGuard` de savoir exactement sur quelle section de l'application se trouve l'utilisateur pour bloquer les accès non autorisés.

### `useFocusEffect`
- **Rôle** : S'exécute à chaque fois que l'écran **redevient actif et visible** pour l'utilisateur (par exemple quand il change d'onglet ou revient en arrière).
- **Pourquoi est-il indispensable dans Masrouf ?**  
  Contrairement à `useEffect` qui ne s'exécute qu'une fois au montage initial, `useFocusEffect` recharge les données (achats, jauges, budget disponible) dès que l'utilisateur revient sur l'écran d'accueil après avoir ajouté un achat.
- **Exemple dans Masrouf** :
  ```typescript
  useFocusEffect(
    useCallback(() => {
      // Recharger le budget et les dernières transactions dès que l'écran Accueil s'affiche
      rafraichirDonneesAccueil();
    }, [])
  );
  ```

---

## 4. Les Hooks Personnalisés Métier de Masrouf

### `useAuth()` (`src/utils/auth.tsx`)
- **Rôle** : Gérer la session utilisateur complète.
- **Ce qu'il expose** :
  - `user` : L'objet utilisateur actuellement connecté (`id`, `name`, `email`, `role`, etc.).
  - `isLoading` : `true` pendant que la clé de session est lue depuis SecureStore.
  - `login(email, password)` : Fonction d'authentification.
  - `logout()` : Fonction de déconnexion (nettoie SecureStore et réinitialise l'état).
- **Effet sur l'écran** : Si `user` passe à `null`, `NavigationGuard` renvoie instantanément l'écran à `/login`.

### `useTranslation()` (`src/utils/i18n.ts`)
- **Rôle** : Gérer la localisation dynamique (Français, Arabe, Anglais) et la direction d'écriture (LTR / RTL).
- **Ce qu'il expose** :
  - `t(cle, params)` : Fonction de traduction remplaçant les variables dynamiques (ex: `t('analyses.conclusion_top', { categorie: 'Alimentation' })`).
  - `langue` : Code de la langue active (`fr`, `ar`, `en`).
  - `changerLangue(nouvelleLangue)` : Bascule la langue, sauvegarde le choix dans SQLite/SecureStore et rafraîchit l'interface.
  - `isRTL` : Booléen valant `true` en Arabe (`ar`), inversant l'alignement et les tiroirs.

### `useDrawer()` (`src/components/AppDrawer.tsx`)
- **Rôle** : Piloter l'état d'ouverture du tiroir latéral de navigation (78 % de l'écran).
- **Ce qu'il expose** : `isOpen`, `openDrawer()`, `closeDrawer()`, `toggleDrawer()`.
- **Effet sur l'écran** : Fait glisser le menu latéral avec une animation fluide et applique un fondu sombre sur le reste de la page.

