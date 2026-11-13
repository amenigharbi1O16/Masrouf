# 05 — Sécurité, Authentification et Contrôle d'Accès (RBAC)

Masrouf étant une application locale gérant des données financières personnelles, la sécurité des identifiants et la séparation des rôles obéissent aux standards industriels les plus stricts.

---

## 1. La Table `user` et le Stockage des Mots de Passe

Dans SQLite, la table `user` contient les colonnes de sécurité suivantes :
```sql
CREATE TABLE IF NOT EXISTS user (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  name                 TEXT    NOT NULL,
  email                TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash        TEXT    NOT NULL,
  salt                 TEXT    NOT NULL DEFAULT '',
  role                 TEXT    NOT NULL DEFAULT 'user', -- 'admin' ou 'user'
  is_active            INTEGER NOT NULL DEFAULT 1,      -- 1 = actif, 0 = suspendu
  must_change_password INTEGER NOT NULL DEFAULT 0,      -- 1 = changement forcé
  onboarding_done      INTEGER NOT NULL DEFAULT 0,
  hash_version         INTEGER NOT NULL DEFAULT 1       -- 1 = sha256 v1, 2 = pbkdf2 v2
);
```

### Le sel cryptographique unique (`salt`)
- Chaque compte possède son propre sel de 16 octets aléatoires (généré via `Crypto.getRandomValues`, et **jamais** avec `Math.random`).
- **Pourquoi ?** Si deux utilisateurs choisissent le même mot de passe (ex. `azerty123`), leurs empreintes enregistrées en base sont totalement différentes. Cela neutralise les attaques par tables précalculées (*Rainbow Tables*).

---

## 2. Hachage Fort PBKDF2 v2 et Migration Transparente v1 → v2

### Pourquoi PBKDF2 et non pas SHA-256 simple ?
- Un hachage **SHA-256 simple** s'exécute en une fraction de microseconde. Un pirate équipé d'une carte graphique moderne peut tester des milliards de mots de passe par seconde.
- **PBKDF2-HMAC-SHA256 (10 000 itérations)** : Applique 10 000 rondes de calcul successives.
  - Pour un attaquant : chaque tentative coûte 10 000 fois plus cher en calcul.
  - Pour l'utilisateur légitime : le calcul prend environ 30 à 60 millisecondes sur son smartphone, ce qui est imperceptible lors de la saisie.

```typescript
// Extrait de src/utils/security.ts
export const PBKDF2_ITERATIONS = 10000;
export const PBKDF2_KEY_LENGTH = 32; // 256 bits

export function hashPasswordV2(password: string, salt: string): string {
  const derivedBytes = pbkdf2(sha256, password, salt, {
    c: PBKDF2_ITERATIONS,
    dkLen: PBKDF2_KEY_LENGTH,
  });
  return bytesToHex(derivedBytes);
}
```

### La mise à niveau automatique v1 → v2
Les comptes historiques créés avec la version 1 (SHA-256 simple) ne sont pas bloqués :
1. Lors de la saisie du mot de passe à la connexion, le système vérifie si `hash_version === 1`.
2. Si le mot de passe correspond au hash v1 historique, la connexion est acceptée.
3. **Instantanément et en tâche de fond**, le mot de passe en clair (encore disponible en mémoire) est recalculé en PBKDF2 v2 avec 10 000 itérations, et mis à jour dans SQLite :
   ```sql
   UPDATE user SET password_hash = :hashV2, hash_version = 2 WHERE id = :userId;
   ```
4. L'utilisateur est monté en gamme de sécurité **sans aucune action requise de sa part**.

---

## 3. Gestion de la Session avec Expo SecureStore

Pour maintenir la connexion sans demander le mot de passe à chaque ouverture d'application, l'identifiant de session est conservé dans le **chiffrement matériel du téléphone** :
- **Sur iOS** : Trousseau sécurisé (*Keychain*).
- **Sur Android** : Données chiffrées avec la clé matérielle *Android Keystore* (AES-256-GCM).

La bibliothèque `expo-secure-store` est utilisée de préférence à un simple `AsyncStorage` non chiffré.

---

## 4. Les Règles du Pare-feu de Navigation (`_layout.tsx`) dans l'Ordre Exact

Le composant `NavigationGuard` s'exécute à chaque changement d'état ou d'URL. L'ordre des vérifications est fondamental :

```
[Chargement initial de la session depuis SecureStore]
       │
   isLoading === true ───► [Affichage d'un spinner de chargement propre]
       │
   isLoading === false
       ▼
[RÈGLE 1 : Utilisateur non connecté ?]
   !user ───► Si hors de /login ou /inscription ───► router.replace('/login')
       │
      OUI (connecté)
       ▼
[RÈGLE 2 : Changement de mot de passe obligatoire ?]
   user.must_change_password === 1 ───► Si hors de /changer-mot-de-passe ───► router.replace('/changer-mot-de-passe')
       │
      NON
       ▼
[RÈGLE 3 : Rôle 'user' standard]
   user.role === 'user'
       ├── 3a. Onboarding non fait ? ───► router.replace('/onboarding')
       └── 3b. Tentative d'accès à /(admin), /login, /onboarding ? ───► Bloqué ───► router.replace('/(tabs)')
       │
       ▼
[RÈGLE 4 : Rôle 'admin' administrateur]
   user.role === 'admin'
       └── Tentative d'accès à /(tabs), /login, /onboarding ? ───► Bloqué ───► router.replace('/(admin)/dashboard')
```

---

## 5. La Double Protection des Routes Admin

Pour empêcher tout contournement de sécurité :
1. **Protection 1 (Route Guard)** : `NavigationGuard` intercepte tout segment commençant par `(admin)` et redirige immédiatement l'utilisateur si `user.role !== 'admin'`.
2. **Protection 2 (Écran Guard)** : Chaque composant d'écran sous `src/app/(admin)/` effectue une vérification interne de redondance :
   ```typescript
   if (!user || user.role !== 'admin') {
     return <AccesRefuse />;
   }
   ```
Même si un lien profond (*deep link*) parvenait à forcer le composant, l'écran refuserait d'afficher la moindre donnée.

---

## 6. Garantie de Confidentialité Absolue : Ce que l'Admin Peut Voir vs Ne Verra Jamais

C'est un engagement déontologique et technique capital dans Masrouf :

### Ce que l'Administrateur PEUT voir :
- Le nombre total d'utilisateurs inscrits sur l'appareil.
- Le nombre de comptes actifs et suspendus.
- Le volume financier global dépensé à l'échelle de toute l'application.
- La part globale des catégories en pourcentage (ex. : 42 % de toutes les dépenses concernent l'alimentation).
- L'historique d'audit technique (dates de connexion, erreurs de mot de passe).

### Ce que l'Administrateur ne PEUT JAMAIS voir :
- **Aucun nom de produit individuel** acheté par un utilisateur.
- **Aucun ticket de caisse** ou détail de transaction nominatif.
- **Aucun nom de magasin ou commerçant spécifique** fréquenté par un utilisateur particulier.
- **Aucun solde bancaire personnel**.

Techniquement, aucune fonction sous `src/app/(admin)/` n'exécute de requête SQL reliant un `user_id` spécifique à la table `purchase` avec sélection de libellés. Le script d'audit `scripts/test-admin-privacy.mjs` vérifie cette cloison de manière automatisée.

---

## 7. Tableau Comparatif Complet : Utilisateur vs Administrateur

| Fonctionnalité / Capacité | Utilisateur Standard (`user`) | Administrateur (`admin`) |
|---|:---:|:---:|
| Créer et modifier son propre budget libre | ✅ Oui | ❌ Non (espace personnel distinct) |
| Enregistrer des articles avec photo | ✅ Oui | ❌ Non |
| Saisir des achats et comparer les prix | ✅ Oui | ❌ Non |
| Voir ses analyses et sa conclusion auto | ✅ Oui | ❌ Non |
| Gagner des points et succès (Gamification) | ✅ Oui | ❌ Non (configure le barème) |
| Suspendre ou réactiver un compte utilisateur | ❌ Non | ✅ Oui |
| Générer un mot de passe temporaire | ❌ Non | ✅ Oui |
| Configurer la répartition recommandée (100 %) | ❌ Non | ✅ Oui |
| Modifier le barème de points système | ❌ Non | ✅ Oui |
| Consulter les statistiques macro anonymisées | ❌ Non | ✅ Oui |
| Accéder au menu tiroir utilisateur (`/(tabs)`) | ✅ Oui | ❌ Redirigé vers `/(admin)` |
| Accéder à l'espace de gestion (`/(admin)`) | ❌ Strictement interdit | ✅ Oui |
