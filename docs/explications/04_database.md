# 04 — La Base de Données SQLite et l'Architecture SQL

L'application **Masrouf** fonctionne sur un principe fondamental : **100 % local**. Aucune donnée ne quitte le smartphone de l'utilisateur, aucun serveur cloud n'est interrogé. La persistance des données repose intégralement sur le moteur relationnel **SQLite**, piloté via la bibliothèque officielle `expo-sqlite` (mode synchrone moderne `openDatabaseSync`).

---

## 1. Pourquoi SQLite et le Mode WAL ?

Dès l'initialisation de la base (`src/db/database.ts`), deux directives SQLite cruciales (*PRAGMA*) sont exécutées :

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
```

### Le mode WAL (*Write-Ahead Logging*)
Par défaut, SQLite utilise un journal de rollback (`DELETE` ou `TRUNCATE`) qui verrouille toute la base lors d'une écriture : les lectures doivent attendre la fin des écritures.
- **En mode WAL** : Les écritures sont consignées dans un fichier journal séparé (`masrouf.db-wal`).
- **Avantage majeur** : Les requêtes de lecture (**SELECT**) ne bloquent jamais les écritures (**INSERT/UPDATE/DELETE**), et les écritures ne bloquent jamais les lectures. Sur mobile, cela évite les micros-saccades de l'interface utilisateur.

### L'activation des clés étrangères (`foreign_keys = ON`)
Par défaut dans SQLite, les contraintes de clés étrangères sont désactivées pour des raisons de compatibilité historique. L'activation explicite garantit l'intégrité référentielle : si un utilisateur ou une catégorie est supprimé, la suppression en cascade (`ON DELETE CASCADE`) nettoie automatiquement les achats et enveloppes associés.

---

## 2. Les 12 Tables Relationnelles et Leurs Rôles

Le schéma unifié utilise des noms de tables au singulier :

| N° | Table | Rôle métier | Clés étrangères & Contraintes |
|---|---|---|---|
| **1** | `user` | Comptes utilisateurs et administrateurs locaux | `email UNIQUE COLLATE NOCASE`, `role CHECK(role IN ('admin', 'user'))`, `is_active`, `must_change_password`, `hash_version` |
| **2** | `category` | Référentiel des catégories de dépenses | `type CHECK(type IN ('product', 'expense'))`, `is_system`, `default_percent` |
| **3** | `user_category` | Catégories activées/choisies par l'utilisateur | `user_id -> user(id)`, `category_id -> category(id)`, `UNIQUE(user_id, category_id)` |
| **4** | `month_budget` | Ancien budget mensuel civil (maintenu pour compatibilité) | `user_id -> user(id)`, `UNIQUE(user_id, month)` |
| **5** | `category_budget` | Montant alloué par enveloppe mensuelle | `user_id -> user(id)`, `category_id -> category(id)` |
| **6** | `product` | Catalogue des articles achetables (articles de consommation) | `user_id -> user(id)`, `category_id -> category(id)`, `photo_path` (nom seul) |
| **7** | `purchase` | Achats réels d'articles avec prix total, quantité et magasin | `user_id -> user(id)`, `product_id -> product(id)`, `category_id -> category(id)` |
| **8** | `expense` | Dépenses directes hors catalogue (loyer, transport, factures) | `user_id -> user(id)`, `category_id -> category(id)` |
| **9** | `keyword_map` | Dictionnaire d'apprentissage local pour l'auto-catégorisation | `category_id -> category(id)`, `keyword COLLATE NOCASE` |
| **10** | `alert_log` | Registre anti-répétition des alertes de seuil (80 % et 100 %) | `user_id -> user(id)`, `category_id -> category(id)`, `level CHECK(level IN (80, 100))` |
| **11** | `points_log` | Historique d'audit des points de gamification accordés | `user_id -> user(id)` |
| **12** | `settings` | Table singleton de configuration du barème de points système | `points_per_category`, `threshold_beginner`, `threshold_saver`, etc. |

### Les Vues de Compatibilité et le Modèle à Périodes Libres
Pour concilier l'ancien modèle par mois civil et la nouvelle exigence de **périodes budgétaires libres** (choix précis d'une date de début et de fin) :
- Les tables modernes `budgets` et `budget_categories` enregistrent les plages personnalisées :
  ```sql
  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
    date_debut TEXT NOT NULL,
    date_fin TEXT NOT NULL,
    montant_total REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```
- Des vues SQL (`achats`, `categories`, `produits`, `utilisateurs`) assurent une rétrocompatibilité totale pour les requêtes sans rupture de code.

---

## 3. Le Système de Migrations Automatiques et Idempotentes

Pour faire évoluer la base de données au fil des mises à jour sans **jamais écraser les données réelles de l'utilisateur**, Masrouf intègre un moteur de migration dans `src/db/migrate.ts`.

### Principe de fonctionnement :
1. Une table technique `schema_migrations` mémorise l'identifiant unique de chaque migration exécutée :
   ```sql
   CREATE TABLE IF NOT EXISTS schema_migrations (
     id TEXT PRIMARY KEY,
     applied_at TEXT NOT NULL DEFAULT (datetime('now'))
   );
   ```
2. Avant d'exécuter une modification, la fonction `dejaFaite(db, id)` vérifie si l'identifiant est déjà enregistré.
3. Si la migration n'a pas encore été appliquée, elle s'exécute dans une transaction puis s'enregistre avec `marquer(db, id)`.
4. Si la base est redémarrée 100 fois, la migration ne s'exécutera qu'une seule fois : c'est le principe d'**idempotence**.

### Exemples de migrations appliquées :
- `purchase_price_is_total_v1` : Migration assurant que la colonne de prix enregistre le prix total payé, en recalculant les anciennes lignes (`prix_total = prix_unitaire * quantite`).
- `photo_filename_only_v1` : Nettoyage des anciens chemins absolus de photos pour ne conserver que le nom de fichier relatif (`p_123.jpg`).
- `free_period_budgets_v1` : Création des tables de budget à dates libres et report des anciens budgets mensuels.

---

## 4. Sauvegarde Physique de Précaution (`VACUUM INTO`)

Avant toute opération de migration structurelle, la base SQLite déclenche une sauvegarde transactionnelle automatique :
```typescript
db.execSync(`VACUUM INTO 'masrouf_backup_etape2.db';`);
```
La commande officielle SQLite `VACUUM INTO` produit une copie binaire fidèle, cohérente et compressée de la base de données sans interrompre l'application et sans bloquer les lectures.

---

## 5. Guide Pratique : Comment Ajouter une Nouvelle Table, Requête ou Migration ?

### Cas A : Ajouter une nouvelle requête SQL
Toutes les requêtes de l'application sont centralisées dans `src/db/queries.ts`.
1. Toujours utiliser des **requêtes préparées paramétrées** avec `?` ou `:param` pour éviter toute injection SQL.
2. Utiliser `db.getFirstSync<T>(sql, params)` pour une ligne unique, ou `db.getAllSync<T>(sql, params)` pour une liste.
3. Pour les montants monétaires, toujours sommer en millimes entiers :
   ```typescript
   export function getDepensesParMagasin(userId: number): Array<{ magasin: string; total: number }> {
     const sql = `
       SELECT 
         store AS magasin, 
         CAST(ROUND(SUM(price) * 1000) AS INTEGER) / 1000.0 AS total
       FROM purchase
       WHERE user_id = ?
       GROUP BY store
       ORDER BY total DESC
     `;
     return db.getAllSync(sql, [userId]);
   }
   ```

### Cas B : Ajouter une migration de schéma
1. Ouvrir `src/db/migrate.ts`.
2. Définir une fonction avec un nom de version explicite :
   ```typescript
   function migrerNouvelleFonctionnalite(db: SQLiteDatabase): void {
     const MIGRATION_ID = 'ajout_colonne_fidelite_v1';
     if (dejaFaite(db, MIGRATION_ID)) return;

     db.execSync(`ALTER TABLE product ADD COLUMN code_barre TEXT NOT NULL DEFAULT '';`);
     marquer(db, MIGRATION_ID);
   }
   ```
3. Appeler la fonction dans `migrateDatabase(db)`.

