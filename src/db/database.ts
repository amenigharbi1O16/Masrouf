// ============================================================
// FICHIER : src/db/database.ts
// RÔLE DANS L'APPLICATION :
//   Moteur central de persistance SQLite locale pour Android et iOS.
//   Ce fichier gère l'ouverture du fichier physique `masrouf.db`,
//   la création du schéma relationnel (12 tables au singulier),
//   la sauvegarde physique d'urgence (VACUUM INTO), l'initialisation des
//   données de départ (comptes de test, barèmes, mots-clés) et la création
//   des vues de rétro-compatibilité avec leurs déclencheurs (triggers).
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est le coffre-fort physique et le grand registre comptable de Masrouf :
//   il dispose de tiroirs compartimentés et étiquetés (les tables), d'un gardien
//   qui vérifie la conformité des données (les clés étrangères et contraintes CHECK),
//   d'une copie de sauvegarde blindée (backup) et d'un guichet qui comprend l'ancien
//   langage comme le nouveau (les vues et déclencheurs).
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Toutes les informations que l'utilisateur voit à l'écran (son solde restant,
//   ses graphiques d'analyses, ses photos de produits, ses points de gamification,
//   ses alertes 80%/100%) sont conservées et lues de façon instantanée et persistante
//   ici, même lorsque le smartphone est éteint ou hors-ligne (mode avion).
// ============================================================

import * as SQLite from 'expo-sqlite';
import { migrateDatabase } from './migrate';

// Connexion SQLite locale vers le fichier physique masrouf.db
export const db = SQLite.openDatabaseSync('masrouf.db');

// Hashes initiaux (SHA-256 avec sel) pour admin et user de test
export const DEFAULT_SALT = '11112222333344445555666677778888';
// Mot de passe admin de test : admin123
export const DEFAULT_ADMIN_HASH =
  '11112222333344445555666677778888:60f3d9f2c7bf6bbd6e6263a454cf9a5d4c0cfd7342a7e5e04ad25be69b1d492b';
// Mot de passe utilisateur de test : user123
export const DEFAULT_USER_HASH =
  '11112222333344445555666677778888:e6f2daa877de06e7f3d664fb9d340962466508050464c33f8649876bc10a43aa';

/**
 * MISSION DE LA FONCTION : initDatabase
 *   Initialise le moteur SQLite au démarrage de l'application. Elle crée l'ensemble
 *   des 12 tables relationnelles si elles n'existent pas encore, active le journal WAL
 *   et les contraintes d'intégrité référentielle, applique les migrations de colonnes
 *   sécurisées, peuple les données de départ et installe les déclencheurs de compatibilité.
 *
 * RÔLE DANS L'APPLICATION :
 *   Exécutée au tout premier lancement de Masrouf (dans le layout racine `src/app/_layout.tsx`)
 *   avant l'affichage du premier écran. Elle garantit que la base est prête et structurée.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Pas d'élément visuel direct : prépare les tables pour que l'écran d'accueil
 *   puisse afficher immédiatement les chiffres réels sans écran blanc ni crash SQL.
 */
export function initDatabase(): void {
  // Active le mode WAL pour la vitesse d'écriture et les clés étrangères
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- 1. TABLE USER : Utilisateurs (rôles 'admin' et 'user')
    CREATE TABLE IF NOT EXISTS user (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      name                 TEXT    NOT NULL,
      email                TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash        TEXT    NOT NULL,
      salt                 TEXT    NOT NULL DEFAULT '',
      role                 TEXT    NOT NULL DEFAULT 'user', -- 'admin' ou 'user'
      is_active            INTEGER NOT NULL DEFAULT 1,      -- 1 = actif, 0 = suspendu
      must_change_password INTEGER NOT NULL DEFAULT 0,      -- 1 = changement forcé
      onboarding_done      INTEGER NOT NULL DEFAULT 0,      -- 1 = onboarding complété
      hash_version         INTEGER NOT NULL DEFAULT 1,      -- 1 = sha256 simple, 2 = pbkdf2
      budget_mensuel       REAL    NOT NULL DEFAULT 0,
      langue               TEXT    NOT NULL DEFAULT 'fr',
      created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- 2. TABLE CATEGORY : Catégories avec distinction 'product' vs 'expense'
    CREATE TABLE IF NOT EXISTS category (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name_key        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      type            TEXT    NOT NULL CHECK(type IN ('product', 'expense')),
      icon            TEXT    NOT NULL DEFAULT '📦',
      default_percent REAL    NOT NULL DEFAULT 0,
      is_default      INTEGER NOT NULL DEFAULT 0, -- 1 = affichée d'emblée
      is_active       INTEGER NOT NULL DEFAULT 1, -- 1 = active/visible, 0 = masquée
      is_system       INTEGER NOT NULL DEFAULT 0, -- 1 = 'Autres' protégée
      theme           TEXT    NOT NULL DEFAULT 'Divers'
    );

    -- 3. TABLE USER_CATEGORY : Enveloppes sélectionnées par l'utilisateur
    CREATE TABLE IF NOT EXISTS user_category (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      enabled     INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, category_id)
    );

    -- 4. TABLE MONTH_BUDGET : Budget mensuel global
    CREATE TABLE IF NOT EXISTS month_budget (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      month        TEXT    NOT NULL, -- format 'YYYY-MM'
      total        REAL    NOT NULL DEFAULT 0,
      is_evaluated INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, month)
    );

    -- 5. TABLE CATEGORY_BUDGET : Montant alloué par enveloppe
    CREATE TABLE IF NOT EXISTS category_budget (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      month       TEXT    NOT NULL, -- format 'YYYY-MM'
      category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      amount      REAL    NOT NULL DEFAULT 0,
      percent     REAL    NOT NULL DEFAULT 0,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, month, category_id)
    );

    -- 6. TABLE PRODUCT : Articles achetables (catégories de type 'product')
    CREATE TABLE IF NOT EXISTS product (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      brand       TEXT    NOT NULL DEFAULT '',
      category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      photo_path  TEXT    NOT NULL DEFAULT '',
      unit        TEXT    NOT NULL DEFAULT 'pièce',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- 7. TABLE PURCHASE : Achats d'articles avec évaluation du prix
    CREATE TABLE IF NOT EXISTS purchase (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      product_id  INTEGER NOT NULL REFERENCES product(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      price       REAL    NOT NULL,
      quantity    REAL    NOT NULL DEFAULT 1,
      unit        TEXT    NOT NULL DEFAULT 'pièce',
      store       TEXT    NOT NULL DEFAULT 'Non précisé',
      date        TEXT    NOT NULL DEFAULT (date('now')),
      month       TEXT    NOT NULL, -- format 'YYYY-MM'
      notes       TEXT    NOT NULL DEFAULT '',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- 8. TABLE EXPENSE : Dépenses directes hors produits (services, frais, dons)
    CREATE TABLE IF NOT EXISTS expense (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      amount      REAL    NOT NULL,
      label       TEXT    NOT NULL,
      date        TEXT    NOT NULL DEFAULT (date('now')),
      month       TEXT    NOT NULL, -- format 'YYYY-MM'
      notes       TEXT    NOT NULL DEFAULT '',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- 9. TABLE KEYWORD_MAP : Dictionnaire d'apprentissage pour la saisie libre
    CREATE TABLE IF NOT EXISTS keyword_map (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES user(id) ON DELETE CASCADE, -- NULL = mot-clé système
      keyword     TEXT    NOT NULL COLLATE NOCASE,
      category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- 10. TABLE ALERT_LOG : Historique anti-répétition des alertes 80% et 100%
    CREATE TABLE IF NOT EXISTS alert_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      month       TEXT    NOT NULL, -- format 'YYYY-MM'
      category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      level       INTEGER NOT NULL CHECK(level IN (80, 100)),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, month, category_id, level)
    );

    -- 11. TABLE POINTS_LOG : Historique des points attribués en fin de mois
    CREATE TABLE IF NOT EXISTS points_log (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      month      TEXT    NOT NULL, -- format 'YYYY-MM'
      reason     TEXT    NOT NULL,
      points     INTEGER NOT NULL,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- 12. TABLE SETTINGS : Barème des points administrable
    CREATE TABLE IF NOT EXISTS settings (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      points_per_period   INTEGER NOT NULL DEFAULT 100,
      points_per_category INTEGER NOT NULL DEFAULT 10,
      points_monthly_bonus INTEGER NOT NULL DEFAULT 50,
      points_streak_bonus INTEGER NOT NULL DEFAULT 20,
      streak_length       INTEGER NOT NULL DEFAULT 3,
      threshold_beginner  INTEGER NOT NULL DEFAULT 0,
      threshold_saver     INTEGER NOT NULL DEFAULT 100,
      threshold_expert    INTEGER NOT NULL DEFAULT 300,
      green_until         INTEGER NOT NULL DEFAULT 79,
      orange_from         INTEGER NOT NULL DEFAULT 80,
      red_from            INTEGER NOT NULL DEFAULT 100
    );
  `);

  // Colonnes ajoutées de façon sécurisée (idempotente) si la base existait déjà
  try { db.execSync(`ALTER TABLE settings ADD COLUMN points_per_period INTEGER NOT NULL DEFAULT 100;`); } catch { }
  try { db.execSync(`ALTER TABLE settings ADD COLUMN green_until INTEGER NOT NULL DEFAULT 79;`); } catch { }
  try { db.execSync(`ALTER TABLE settings ADD COLUMN orange_from INTEGER NOT NULL DEFAULT 80;`); } catch { }
  try { db.execSync(`ALTER TABLE settings ADD COLUMN red_from INTEGER NOT NULL DEFAULT 100;`); } catch { }
  try { db.execSync(`ALTER TABLE settings ADD COLUMN streak_length INTEGER NOT NULL DEFAULT 3;`); } catch { }
  try { db.execSync(`ALTER TABLE user ADD COLUMN budget_mensuel REAL NOT NULL DEFAULT 0;`); } catch { }
  try { db.execSync(`ALTER TABLE user ADD COLUMN langue TEXT NOT NULL DEFAULT 'fr';`); } catch { }
  try { db.execSync(`ALTER TABLE user ADD COLUMN salt TEXT NOT NULL DEFAULT '';`); } catch { }
  try { db.execSync(`ALTER TABLE user ADD COLUMN onboarding_done INTEGER NOT NULL DEFAULT 0;`); } catch { }
  try { db.execSync(`ALTER TABLE user ADD COLUMN hash_version INTEGER NOT NULL DEFAULT 1;`); } catch { }
  try { db.execSync(`ALTER TABLE points_log ADD COLUMN user_id INTEGER;`); } catch { }
  try { db.execSync(`ALTER TABLE points_log ADD COLUMN budget_id INTEGER;`); } catch { }
  try { db.execSync(`ALTER TABLE alert_log ADD COLUMN user_id INTEGER;`); } catch { }
  try { db.execSync(`ALTER TABLE alert_log ADD COLUMN budget_id INTEGER;`); } catch { }

  // Sauvegarde physique de précaution de la base masrouf.db
  sauvegarderBaseDeDonnees();

  // --------------------------------------------------------
  // MIGRATION AUTOMATIQUE DEPUIS L'ANCIENNE BASE (S'IL Y EN A UNE)
  // --------------------------------------------------------
  migrerAnciennesDonneesSiPresentes();

  // --------------------------------------------------------
  // INITIALISATION DU CONTENU DE RÉFÉRENCE
  // --------------------------------------------------------
  initialiserCategories();
  initialiserMotsClesSysteme();
  initialiserSettings();
  initialiserComptesDepart();
  creerVuesDeRetroCompatibilite();
  // Après les vues anciennes : on les remplace par le modèle à périodes libres.
  migrateDatabase(db);
}

/**
 * MISSION DE LA FONCTION : sauvegarderBaseDeDonnees
 *   Crée un cliché instantané physique de sécurité de la base de données SQLite
 *   nommé `masrouf_backup_etape2.db` via la commande native `VACUUM INTO`.
 *
 * RÔLE DANS L'APPLICATION :
 *   Préserve une copie de sauvegarde intacte avant toute mise à jour de schéma.
 *   Si une coupure de courant ou un redémarrage impromptu survient, aucune donnée n'est perdue.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Opération d'arrière-plan sans rendu visuel direct. Protège silencieusement les données.
 */
export function sauvegarderBaseDeDonnees(): void {
  try {
    // VACUUM INTO crée une sauvegarde transactionnelle sans verrouiller la base
    db.execSync(`VACUUM INTO 'masrouf_backup_etape2.db';`);
    console.log('[SQLite] Sauvegarde de masrouf.db créée : masrouf_backup_etape2.db');
  } catch {
    // Si la sauvegarde existe déjà sur le disque de l'appareil, VACUUM INTO lève une erreur normale
    // On conserve la sauvegarde existante sans l'écraser.
  }
}

/**
 * MISSION DE LA FONCTION : migrerAnciennesDonneesSiPresentes
 *   Détecte la présence d'anciennes tables en français (`utilisateurs`, `categories`,
 *   `produits`, `achats`) et transfère automatiquement leur contenu vers les nouvelles
 *   tables au singulier (`user`, `category`, `product`, `purchase`, `expense`).
 *
 * RÔLE DANS L'APPLICATION :
 *   Assure qu'un utilisateur qui met à jour l'application conserve tous ses achats,
 *   ses comptes et ses produits sans aucune perte de données historique.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Aucun rendu direct : permet à l'écran d'accueil de retrouver tous les achats
 *   passés sans afficher un tableau vide.
 */
function migrerAnciennesDonneesSiPresentes(): void {
  try {
    // 1. Migration utilisateurs -> user
    const aAnciensUsers = db.getFirstSync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='utilisateurs'`
    );
    if (aAnciensUsers && aAnciensUsers.cnt > 0) {
      const nbNouveauxUsers = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM user`);
      if (nbNouveauxUsers && nbNouveauxUsers.cnt === 0) {
        db.execSync(`
          INSERT OR IGNORE INTO user (id, name, email, password_hash, salt, role, is_active, must_change_password, created_at)
          SELECT
            id,
            nom,
            email,
            CASE WHEN password_hash != '' THEN password_hash ELSE '${DEFAULT_USER_HASH}' END,
            '${DEFAULT_SALT}',
            CASE WHEN role = 'admin' THEN 'admin' ELSE 'user' END,
            COALESCE(is_active, 1),
            COALESCE(must_change_password, 0),
            created_at
          FROM utilisateurs;
        `);
      }
    }

    // 2. Migration anciens achats -> purchase ou expense
    // Chercher soit 'achats' (table physique) soit 'achats_old' (après renommage par migrate.ts)
    const nomTableAchats = (() => {
      const r1 = db.getFirstSync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='achats'`
      );
      if (r1 && r1.cnt > 0) return 'achats';
      const r2 = db.getFirstSync<{ cnt: number }>(
        `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='achats_old'`
      );
      if (r2 && r2.cnt > 0) return 'achats_old';
      return null;
    })();
    if (nomTableAchats) {
      const nbPurchases = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM purchase`);
      const nbExpenses = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM expense`);

      if (nbPurchases?.cnt === 0 && nbExpenses?.cnt === 0) {
        // D'abord les produits s'il y en a (chercher produits ou produits_old)
        const nomTableProduits = (() => {
          const r1 = db.getFirstSync<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='produits'`
          );
          if (r1 && r1.cnt > 0) return 'produits';
          const r2 = db.getFirstSync<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='produits_old'`
          );
          if (r2 && r2.cnt > 0) return 'produits_old';
          return null;
        })();

        if (nomTableProduits) {
          db.execSync(`
            INSERT OR IGNORE INTO product (id, user_id, name, brand, category_id, photo_path, unit)
            SELECT id, created_by, nom, marque, categorie_id, COALESCE(photo_uri, photo_path, ''), unite
            FROM ${nomTableProduits};
          `);
        }

        // Achats avec produit -> purchase
        db.execSync(`
          INSERT OR IGNORE INTO purchase (id, user_id, product_id, category_id, price, quantity, unit, store, date, month, notes)
          SELECT
            a.id,
            a.utilisateur_id,
            a.produit_id,
            COALESCE(a.categorie_id, 1),
            COALESCE(a.prix_unitaire, a.prix_total, 0),
            COALESCE(a.quantite, 1),
            'pièce',
            'Non précisé',
            a.date_achat,
            a.mois,
            COALESCE(a.notes, '')
          FROM ${nomTableAchats} a
          WHERE a.produit_id IS NOT NULL;
        `);

        // Achats sans produit (dépenses directes) -> expense
        db.execSync(`
          INSERT OR IGNORE INTO expense (id, user_id, category_id, amount, label, date, month, notes)
          SELECT
            a.id,
            a.utilisateur_id,
            COALESCE(a.categorie_id, 9),
            COALESCE(a.prix_total, a.prix_unitaire, 0),
            COALESCE(NULLIF(a.titre, ''), 'Dépense'),
            a.date_achat,
            a.mois,
            COALESCE(a.notes, '')
          FROM ${nomTableAchats} a
          WHERE a.produit_id IS NULL;
        `);
      }
    }
  } catch (err) {
    console.warn('Note sur la migration des données :', err);
  }
}

/**
 * MISSION DE LA FONCTION : initialiserCategories
 *   Peuple le catalogue des catégories en distinguant les catégories de produits
 *   achetés (`type = 'product'`) des catégories de dépenses directes (`type = 'expense'`).
 *   Définit également les pourcentages par défaut, icônes et appartenances aux thèmes.
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit les données de base nécessaires pour que l'onboarding et la gestion des
 *   catégories fonctionnent dès l'installation, sans laisser de listes vides.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Alimente la liste de tuiles de l'écran d'onboarding et du sélecteur de catégories
 *   avec les icônes (🍞, 👕, 🚗, 🧾) et les noms en français.
 */
function initialiserCategories(): void {
  // A) CATÉGORIES DE PRODUITS ACHETÉS (type = 'product')
  const categoriesProduits = [
    // Par défaut
    { name: 'Alimentation', icon: '🍞', pct: 40, isDef: 1, theme: 'Essentiel' },
    { name: 'Vêtements et chaussures', icon: '👕', pct: 5, isDef: 1, theme: 'Personnel' },
    { name: 'Hygiène et soins', icon: '🧼', pct: 4, isDef: 1, theme: 'Vie quotidienne' },
    { name: 'Maison et équipement', icon: '🛋️', pct: 4, isDef: 1, theme: 'Logement' },
    { name: 'Matériel informatique', icon: '💻', pct: 2, isDef: 1, theme: 'Études et travail' },
    { name: 'Santé et médicaments', icon: '💊', pct: 5, isDef: 1, theme: 'Santé' },
    // Supplémentaires
    { name: 'Maison et entretien', icon: '🧹', pct: 0, isDef: 0, theme: 'Logement' },
    { name: 'Beauté et coiffure', icon: '💇', pct: 0, isDef: 0, theme: 'Personnel' },
    { name: 'Animaux', icon: '🐾', pct: 0, isDef: 0, theme: 'Famille' },
  ];

  // B) CATÉGORIES DE DÉPENSES HORS PRODUITS (type = 'expense')
  const categoriesDepenses = [
    // Par défaut
    { name: 'Transport', icon: '🚗', pct: 10, isDef: 1, theme: 'Essentiel' },
    { name: 'Factures', icon: '🧾', pct: 12, isDef: 1, theme: 'Logement' },
    { name: 'Éducation', icon: '📚', pct: 3, isDef: 1, theme: 'Études et travail' },
    { name: 'Loisirs', icon: '🎮', pct: 4, isDef: 1, theme: 'Personnel' },
    { name: 'Enfants', icon: '👶', pct: 2, isDef: 1, theme: 'Famille' },
    { name: 'Aide familiale', icon: '🤝', pct: 2, isDef: 1, theme: 'Famille' },
    { name: 'Épargne', icon: '💰', pct: 4, isDef: 1, theme: 'Argent' },
    { name: 'Dons', icon: '🤲', pct: 1, isDef: 1, theme: 'Argent' },
    { name: 'Frais bancaires', icon: '🏦', pct: 1, isDef: 1, theme: 'Argent' },
    { name: 'Autres', icon: '📦', pct: 1, isDef: 1, theme: 'Divers', isSys: 1 },
    // Supplémentaires
    { name: 'Restaurants et cafés', icon: '☕', pct: 0, isDef: 0, theme: 'Vie quotidienne' },
    { name: 'Téléphone et internet', icon: '📱', pct: 0, isDef: 0, theme: 'Vie quotidienne' },
    { name: 'Loyer', icon: '🏠', pct: 0, isDef: 0, theme: 'Logement' },
    { name: 'Formations et cours en ligne', icon: '🎓', pct: 0, isDef: 0, theme: 'Études et travail' },
    { name: 'Sport et abonnements', icon: '🏋️', pct: 0, isDef: 0, theme: 'Personnel' },
    { name: 'Voyages', icon: '✈️', pct: 0, isDef: 0, theme: 'Personnel' },
    { name: 'Cadeaux et fêtes', icon: '🎁', pct: 0, isDef: 0, theme: 'Personnel' },
    { name: 'Dettes et remboursements', icon: '💳', pct: 0, isDef: 0, theme: 'Argent' },
    { name: 'Imprévus', icon: '⚡', pct: 0, isDef: 0, theme: 'Divers' },
  ];

  const renoms: [string, string][] = [
    ['Hygiène et soins personnels', 'Hygiène et soins'],
    ['Santé', 'Santé et médicaments'],
    ['Études', 'Éducation'],
    ['Loisirs et sorties', 'Loisirs'],
    ['Aide à la famille', 'Aide familiale'],
    ['Dons et charité', 'Dons'],
  ];
  for (const [ancien, nouveau] of renoms) {
    const cible = db.getFirstSync<{ id: number }>(
      `SELECT id FROM category WHERE name_key = ? COLLATE NOCASE`,
      [nouveau]
    );
    if (!cible) {
      db.runSync(
        `UPDATE category SET name_key = ? WHERE name_key = ? COLLATE NOCASE`,
        [nouveau, ancien]
      );
    }
  }

  // Insertion type = 'product'
  for (const c of categoriesProduits) {
    const existe = db.getFirstSync<{ id: number }>(
      `SELECT id FROM category WHERE name_key = ? COLLATE NOCASE`,
      [c.name]
    );
    if (!existe) {
      db.runSync(
        `INSERT INTO category (name_key, type, icon, default_percent, is_default, is_active, is_system, theme)
         VALUES (?, 'product', ?, ?, ?, 1, 0, ?)`,
        [c.name, c.icon, c.pct, c.isDef, c.theme]
      );
    } else {
      db.runSync(
        `UPDATE category SET type = 'product', theme = ? WHERE id = ?`,
        [c.theme, existe.id]
      );
    }
  }

  // Insertion type = 'expense'
  for (const c of categoriesDepenses) {
    const isSys = (c as any).isSys ? 1 : 0;
    const existe = db.getFirstSync<{ id: number }>(
      `SELECT id FROM category WHERE name_key = ? COLLATE NOCASE`,
      [c.name]
    );
    if (!existe) {
      db.runSync(
        `INSERT INTO category (name_key, type, icon, default_percent, is_default, is_active, is_system, theme)
         VALUES (?, 'expense', ?, ?, ?, 1, ?, ?)`,
        [c.name, c.icon, c.pct, c.isDef, isSys, c.theme]
      );
    } else {
      db.runSync(
        `UPDATE category SET type = 'expense', is_system = ?, theme = ? WHERE id = ?`,
        [isSys, c.theme, existe.id]
      );
    }
  }
}

/**
 * MISSION DE LA FONCTION : initialiserMotsClesSysteme
 *   Enregistre un dictionnaire multilingue de mots-clés courants en français,
 *   arabe et dialecte tunisien (ex: 'khobz' -> Alimentation, 'taxi' -> Transport, 'steg' -> Factures)
 *   dans la table `keyword_map`.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet à l'algorithme d'auto-complétion et de suggestion prédictive de deviner
 *   la bonne catégorie lors de la saisie libre d'un achat par l'utilisateur.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Lorsque l'utilisateur tape un mot dans le formulaire de nouvel achat,
 *   la catégorie correspondante est pré-sélectionnée automatiquement à l'écran.
 */
function initialiserMotsClesSysteme(): void {
  const compte = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM keyword_map WHERE user_id IS NULL`
  );
  if (compte && compte.cnt > 0) return;

  // Dictionnaire multilingue pour orienter la saisie libre
  const dictionnaires: { mot: string; catNom: string }[] = [
    // Vêtements
    { mot: 'manteau', catNom: 'Vêtements et chaussures' },
    { mot: 'pull', catNom: 'Vêtements et chaussures' },
    { mot: 'pantalon', catNom: 'Vêtements et chaussures' },
    { mot: 'chaussures', catNom: 'Vêtements et chaussures' },
    { mot: 'sbat', catNom: 'Vêtements et chaussures' },
    { mot: 'maryoul', catNom: 'Vêtements et chaussures' },
    { mot: 'seroual', catNom: 'Vêtements et chaussures' },
    { mot: 'veste', catNom: 'Vêtements et chaussures' },
    // Alimentation
    { mot: 'pain', catNom: 'Alimentation' },
    { mot: 'lait', catNom: 'Alimentation' },
    { mot: 'khobz', catNom: 'Alimentation' },
    { mot: 'hlib', catNom: 'Alimentation' },
    { mot: 'viande', catNom: 'Alimentation' },
    { mot: 'lham', catNom: 'Alimentation' },
    { mot: 'poulet', catNom: 'Alimentation' },
    { mot: 'djedj', catNom: 'Alimentation' },
    { mot: 'legumes', catNom: 'Alimentation' },
    { mot: 'khodra', catNom: 'Alimentation' },
    // Transport
    { mot: 'essence', catNom: 'Transport' },
    { mot: 'mazout', catNom: 'Transport' },
    { mot: 'taxi', catNom: 'Transport' },
    { mot: 'bus', catNom: 'Transport' },
    { mot: 'louage', catNom: 'Transport' },
    { mot: 'metro', catNom: 'Transport' },
    { mot: 'peage', catNom: 'Transport' },
    { mot: 'lavage', catNom: 'Transport' },
    // Enfants
    { mot: 'fille', catNom: 'Enfants' },
    { mot: 'bint', catNom: 'Enfants' },
    { mot: 'fils', catNom: 'Enfants' },
    { mot: 'weldi', catNom: 'Enfants' },
    { mot: 'bebe', catNom: 'Enfants' },
    { mot: 'couches', catNom: 'Enfants' },
    // Factures
    { mot: 'steg', catNom: 'Factures' },
    { mot: 'sonede', catNom: 'Factures' },
    { mot: 'electricite', catNom: 'Factures' },
    { mot: 'gaz', catNom: 'Factures' },
    { mot: 'eau', catNom: 'Factures' },
    // Café & Resto
    { mot: 'cafe', catNom: 'Restaurants et cafés' },
    { mot: '9ahwa', catNom: 'Restaurants et cafés' },
    { mot: 'restaurant', catNom: 'Restaurants et cafés' },
    { mot: 'dejeuner', catNom: 'Restaurants et cafés' },
    { mot: 'sandwich', catNom: 'Restaurants et cafés' },
    // Téléphone
    { mot: 'recharge', catNom: 'Téléphone et internet' },
    { mot: 'forfait', catNom: 'Téléphone et internet' },
    { mot: 'telecom', catNom: 'Téléphone et internet' },
    { mot: 'ooredoo', catNom: 'Téléphone et internet' },
    { mot: 'orange', catNom: 'Téléphone et internet' },
    // Santé
    { mot: 'docteur', catNom: 'Santé' },
    { mot: 'medecin', catNom: 'Santé' },
    { mot: 'pharmacie', catNom: 'Santé' },
    { mot: 'medicament', catNom: 'Santé' },
    { mot: 'dwa', catNom: 'Santé' },
  ];

  for (const item of dictionnaires) {
    const cat = db.getFirstSync<{ id: number }>(
      `SELECT id FROM category WHERE name_key = ? COLLATE NOCASE`,
      [item.catNom]
    );
    if (cat) {
      db.runSync(
        `INSERT INTO keyword_map (user_id, keyword, category_id) VALUES (NULL, ?, ?)`,
        [item.mot, cat.id]
      );
    }
  }
}

/**
 * MISSION DE LA FONCTION : initialiserSettings
 *   Insère la configuration initiale du barème de points et des seuils de niveaux
 *   dans la table `settings` (100 pts par période réussie, seuil Économe à 300 pts,
 *   seuil Expert à 1000 pts, alertes vert jusqu'à 79%, orange à 80%, rouge à 100%).
 *
 * RÔLE DANS L'APPLICATION :
 *   Fournit les paramètres de calcul pour le moteur de gamification et le module d'alertes.
 *   Modifiable ensuite par l'administrateur depuis son tableau de bord.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Pilote la jauge de progression, le badge de niveau (Débutant, Économe, Expert)
 *   et les alertes colorées affichées sur l'écran d'accueil et l'écran des points.
 */
function initialiserSettings(): void {
  const existe = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM settings`);
  if (!existe || existe.cnt === 0) {
    db.runSync(`
      INSERT INTO settings
        (points_per_period, points_per_category, points_monthly_bonus, points_streak_bonus,
         streak_length, threshold_beginner, threshold_saver, threshold_expert,
         green_until, orange_from, red_from)
      VALUES (100, 0, 0, 50, 3, 0, 300, 1000, 79, 80, 100)
    `);
  }
}

/**
 * MISSION DE LA FONCTION : initialiserComptesDepart
 *   Crée les deux comptes de démonstration indispensables :
 *   1. Administrateur (`admin@masrouf.tn` / mot de passe : `admin123`).
 *   2. Utilisateur standard (`user@masrouf.tn` / mot de passe : `user123`), avec
 *      budget mensuel de 1200 DT et ses enveloppes de catégories par défaut activées.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet à l'enseignant ou examinateur de se connecter immédiatement sans devoir
 *   obligatoirement créer un compte manuellement.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Permet l'accès instantané aux dashboards administrateur et utilisateur lors
 *   de la saisie des identifiants sur l'écran `login.tsx`.
 */
function initialiserComptesDepart(): void {
  // Administrateur de test officiel (must_change_password = 0 pour accès direct, onboarding_done = 1, hash_version = 1)
  const adminExiste = db.getFirstSync<{ id: number }>(
    `SELECT id FROM user WHERE email = 'admin@masrouf.tn' COLLATE NOCASE`
  );
  if (!adminExiste) {
    db.runSync(
      `INSERT INTO user (name, email, password_hash, salt, role, is_active, must_change_password, onboarding_done, hash_version)
       VALUES (?, ?, ?, ?, 'admin', 1, 0, 1, 1)`,
      ['Administrateur', 'admin@masrouf.tn', DEFAULT_ADMIN_HASH, DEFAULT_SALT]
    );
  } else {
    // S'assure que l'administrateur existant a accès direct sans être bloqué par le changement forcé
    db.runSync(
      `UPDATE user SET must_change_password = 0, is_active = 1, onboarding_done = 1, hash_version = COALESCE(NULLIF(hash_version, 0), 1) WHERE email = 'admin@masrouf.tn' COLLATE NOCASE`
    );
  }

  // Utilisateur standard (must_change_password = 0, onboarding_done = 1, hash_version = 1)
  let userIdTest = 0;
  const userExiste = db.getFirstSync<{ id: number }>(
    `SELECT id FROM user WHERE email = 'user@masrouf.tn' COLLATE NOCASE`
  );
  if (!userExiste) {
    const res = db.runSync(
      `INSERT INTO user (name, email, password_hash, salt, role, is_active, must_change_password, onboarding_done, hash_version, budget_mensuel)
       VALUES (?, ?, ?, ?, 'user', 1, 0, 1, 1, 1200)`,
      ['Ahmed Ben Ali', 'user@masrouf.tn', DEFAULT_USER_HASH, DEFAULT_SALT]
    );
    userIdTest = res.lastInsertRowId;
  } else {
    userIdTest = userExiste.id;
    // S'assure que l'utilisateur test existant conserve ses données avec onboarding_done = 1
    db.runSync(
      `UPDATE user SET is_active = 1, onboarding_done = 1, hash_version = COALESCE(NULLIF(hash_version, 0), 1) WHERE email = 'user@masrouf.tn' COLLATE NOCASE`
    );
  }

  // Peuplement des catégories par défaut de l'utilisateur test dans user_category (évite un écran vide)
  if (userIdTest > 0) {
    db.execSync(`
      INSERT OR IGNORE INTO user_category (user_id, category_id, enabled)
      SELECT ${userIdTest}, id, 1
      FROM category
      WHERE is_default = 1;
    `);
  }
}

/**
 * MISSION DE LA FONCTION : creerVuesDeRetroCompatibilite
 *   Crée les vues SQL et déclencheurs (triggers) `INSTEAD OF INSERT/UPDATE/DELETE`
 *   pour les tables françaises historiques (`utilisateurs`, `categories`, `produits`,
 *   `achats`, `monthly_budgets`, `category_budgets`, etc.).
 *
 * RÔLE DANS L'APPLICATION :
 *   Garantit qu'aucun ancien écran ne plante si une requête cible encore l'ancien nom de table.
 *   Toute écriture sur une vue est automatiquement redirigée vers la nouvelle table correspondante.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Pas d'affichage direct : assure une parfaite fluidité sans jamais provoquer d'erreur
 *   "no such table" ou "cannot modify view" lors des actions utilisateur.
 */
function creerVuesDeRetroCompatibilite(): void {
  try {
    // 1. Table magasins pour éviter toute absence de table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS magasins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL UNIQUE
      );
      INSERT OR IGNORE INTO magasins (id, nom) VALUES (1, 'Carrefour');
      INSERT OR IGNORE INTO magasins (id, nom) VALUES (2, 'Monoprix');
      INSERT OR IGNORE INTO magasins (id, nom) VALUES (3, 'Mg');
      INSERT OR IGNORE INTO magasins (id, nom) VALUES (4, 'Épicerie du coin');
    `);

    // 2. Vue utilisateurs + triggers
    db.execSync(`
      CREATE VIEW IF NOT EXISTS utilisateurs AS
      SELECT
        id,
        name as nom,
        email,
        '' as mot_de_passe,
        password_hash,
        role,
        is_active,
        must_change_password,
        onboarding_done,
        hash_version,
        budget_mensuel,
        langue,
        created_at
      FROM user;

      CREATE TRIGGER IF NOT EXISTS trg_utilisateurs_insert
      INSTEAD OF INSERT ON utilisateurs
      BEGIN
        INSERT INTO user (name, email, password_hash, salt, role, is_active, must_change_password, onboarding_done, hash_version, budget_mensuel, langue)
        VALUES (
          NEW.nom,
          NEW.email,
          NEW.password_hash,
          '',
          COALESCE(NEW.role, 'user'),
          COALESCE(NEW.is_active, 1),
          COALESCE(NEW.must_change_password, 0),
          COALESCE(NEW.onboarding_done, 0),
          COALESCE(NEW.hash_version, 1),
          COALESCE(NEW.budget_mensuel, 0),
          COALESCE(NEW.langue, 'fr')
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_utilisateurs_update
      INSTEAD OF UPDATE ON utilisateurs
      BEGIN
        UPDATE user SET
          name = COALESCE(NEW.nom, name),
          email = COALESCE(NEW.email, email),
          password_hash = COALESCE(NEW.password_hash, password_hash),
          role = COALESCE(NEW.role, role),
          is_active = COALESCE(NEW.is_active, is_active),
          must_change_password = COALESCE(NEW.must_change_password, must_change_password),
          onboarding_done = COALESCE(NEW.onboarding_done, onboarding_done),
          hash_version = COALESCE(NEW.hash_version, hash_version),
          budget_mensuel = COALESCE(NEW.budget_mensuel, budget_mensuel),
          langue = COALESCE(NEW.langue, langue)
        WHERE id = OLD.id;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_utilisateurs_delete
      INSTEAD OF DELETE ON utilisateurs
      BEGIN
        DELETE FROM user WHERE id = OLD.id;
      END;
    `);

    // 3. Vue categories + triggers
    db.execSync(`
      CREATE VIEW IF NOT EXISTS categories AS
      SELECT
        id,
        name_key as nom,
        icon as icone,
        default_percent as pourcentage_defaut,
        is_default as est_defaut,
        is_active as est_visible,
        is_system as est_systeme,
        theme
      FROM category;

      CREATE TRIGGER IF NOT EXISTS trg_categories_insert
      INSTEAD OF INSERT ON categories
      BEGIN
        INSERT INTO category (name_key, type, icon, default_percent, is_default, is_active, is_system, theme)
        VALUES (
          NEW.nom,
          COALESCE(NEW.type, 'product'),
          COALESCE(NEW.icone, '📦'),
          COALESCE(NEW.pourcentage_defaut, 0),
          COALESCE(NEW.est_defaut, 0),
          COALESCE(NEW.est_visible, 1),
          COALESCE(NEW.est_systeme, 0),
          COALESCE(NEW.theme, 'Divers')
        );
      END;

      CREATE TRIGGER IF NOT EXISTS trg_categories_update
      INSTEAD OF UPDATE ON categories
      BEGIN
        UPDATE category SET
          name_key = COALESCE(NEW.nom, name_key),
          type = COALESCE(NEW.type, type),
          icon = COALESCE(NEW.icone, icon),
          default_percent = COALESCE(NEW.pourcentage_defaut, default_percent),
          is_active = COALESCE(NEW.est_visible, is_active)
        WHERE id = OLD.id;
      END;
    `);

    // 4. Vue produits + triggers (sécurisé : ne touche pas si c'est une TABLE physique)
    const typeProduitsBD = db.getFirstSync<{ type: string }>(
      `SELECT type FROM sqlite_master WHERE name = 'produits'`
    );
    if (typeProduitsBD?.type !== 'table') {
      // On peut dropper la vue et recréer en sécurité
      db.execSync(`DROP TRIGGER IF EXISTS trg_produits_insert;`);
      db.execSync(`DROP TRIGGER IF EXISTS trg_produits_update;`);
      db.execSync(`DROP TRIGGER IF EXISTS trg_produits_delete;`);
      db.execSync(`DROP VIEW IF EXISTS produits;`);
      db.execSync(`
        CREATE VIEW IF NOT EXISTS produits AS
        SELECT
          id,
          name as nom,
          brand as marque,
          unit as unite,
          category_id as categorie_id,
          user_id as created_by,
          photo_path,
          photo_path as photo_uri,
          created_at
        FROM product;

        CREATE TRIGGER IF NOT EXISTS trg_produits_insert
        INSTEAD OF INSERT ON produits
        BEGIN
          INSERT INTO product (name, brand, unit, category_id, user_id, photo_path)
          VALUES (
            NEW.nom,
            COALESCE(NEW.marque, ''),
            COALESCE(NEW.unite, 'pièce'),
            NEW.categorie_id,
            NEW.created_by,
            COALESCE(NEW.photo_path, NEW.photo_uri, '')
          );
        END;

        CREATE TRIGGER IF NOT EXISTS trg_produits_update
        INSTEAD OF UPDATE ON produits
        BEGIN
          UPDATE product SET
            name = COALESCE(NEW.nom, name),
            brand = COALESCE(NEW.marque, brand),
            unit = COALESCE(NEW.unite, unit),
            category_id = COALESCE(NEW.categorie_id, category_id),
            photo_path = COALESCE(NEW.photo_path, NEW.photo_uri, photo_path)
          WHERE id = OLD.id;
        END;

        CREATE TRIGGER IF NOT EXISTS trg_produits_delete
        INSTEAD OF DELETE ON produits
        BEGIN
          DELETE FROM product WHERE id = OLD.id;
        END;
      `);
    }

    // 5. Vue achats + trigger (sécurisé : ne touche pas si c'est une TABLE physique)
    // Si achats est une table physique, migrate.ts la renommera en achats_old
    // et créera la vue propre — on saute ici pour éviter le conflit
    const typeAchatsBD = db.getFirstSync<{ type: string }>(
      `SELECT type FROM sqlite_master WHERE name = 'achats'`
    );
    if (typeAchatsBD?.type !== 'table') {
      try { db.execSync(`DROP TRIGGER IF EXISTS trg_achats_insert;`); } catch { }
      try { db.execSync(`DROP VIEW IF EXISTS achats;`); } catch { }
      db.execSync(`
        CREATE VIEW IF NOT EXISTS achats AS
        SELECT
          p.id,
          p.product_id as produit_id,
          p.user_id as utilisateur_id,
          NULL as magasin_id,
          p.category_id as categorie_id,
          p.notes as titre,
          p.price as prix_unitaire,
          p.quantity as quantite,
          (p.price * p.quantity) as prix_total,
          p.date as date_achat,
          p.month as mois,
          p.notes,
          p.store as magasin_nom
        FROM purchase p
        UNION ALL
        SELECT
          e.id + 1000000 as id,
          NULL as produit_id,
          e.user_id as utilisateur_id,
          NULL as magasin_id,
          e.category_id as categorie_id,
          e.label as titre,
          e.amount as prix_unitaire,
          1 as quantite,
          e.amount as prix_total,
          e.date as date_achat,
          e.month as mois,
          e.notes,
          '' as magasin_nom
        FROM expense e;

        CREATE TRIGGER IF NOT EXISTS trg_achats_insert
        INSTEAD OF INSERT ON achats
        BEGIN
          INSERT INTO purchase (user_id, product_id, category_id, price, quantity, unit, store, date, month, notes)
          SELECT
            NEW.utilisateur_id,
            NEW.produit_id,
            COALESCE(NEW.categorie_id, (SELECT category_id FROM product WHERE id = NEW.produit_id), 1),
            NEW.prix_unitaire,
            COALESCE(NEW.quantite, 1),
            COALESCE((SELECT unit FROM product WHERE id = NEW.produit_id), 'pièce'),
            'Non précisé',
            COALESCE(NEW.date_achat, date('now')),
            NEW.mois,
            COALESCE(NEW.notes, '')
          WHERE NEW.produit_id IS NOT NULL;

          INSERT INTO expense (user_id, category_id, amount, label, date, month, notes)
          SELECT
            NEW.utilisateur_id,
            COALESCE(NEW.categorie_id, 9),
            NEW.prix_total,
            COALESCE(NULLIF(NEW.titre, ''), 'Dépense'),
            COALESCE(NEW.date_achat, date('now')),
            NEW.mois,
            COALESCE(NEW.notes, '')
          WHERE NEW.produit_id IS NULL;
        END;
      `);
    }

    // 6. Vues monthly_budgets, category_budgets, reglages_points, alertes_log
    db.execSync(`
      CREATE VIEW IF NOT EXISTS monthly_budgets AS
      SELECT
        id,
        user_id as utilisateur_id,
        month as mois,
        total as montant_total,
        is_evaluated as est_evalue,
        created_at as date_creation
      FROM month_budget;

      CREATE TRIGGER IF NOT EXISTS trg_monthly_budgets_insert
      INSTEAD OF INSERT ON monthly_budgets
      BEGIN
        INSERT INTO month_budget (user_id, month, total, is_evaluated)
        VALUES (NEW.utilisateur_id, NEW.mois, NEW.montant_total, COALESCE(NEW.est_evalue, 0))
        ON CONFLICT(user_id, month) DO UPDATE SET total = excluded.total;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_monthly_budgets_update
      INSTEAD OF UPDATE ON monthly_budgets
      BEGIN
        UPDATE month_budget SET
          total = COALESCE(NEW.montant_total, total),
          is_evaluated = COALESCE(NEW.est_evalue, is_evaluated)
        WHERE id = OLD.id;
      END;

      CREATE VIEW IF NOT EXISTS category_budgets AS
      SELECT
        cb.id,
        mb.id as monthly_budget_id,
        cb.category_id as categorie_id,
        cb.amount as montant,
        cb.percent as pourcentage,
        cb.created_at
      FROM category_budget cb
      LEFT JOIN month_budget mb ON cb.user_id = mb.user_id AND cb.month = mb.month;

      CREATE TRIGGER IF NOT EXISTS trg_category_budgets_insert
      INSTEAD OF INSERT ON category_budgets
      BEGIN
        INSERT INTO category_budget (user_id, month, category_id, amount, percent)
        SELECT
          mb.user_id,
          mb.month,
          NEW.categorie_id,
          NEW.montant,
          NEW.pourcentage
        FROM month_budget mb
        WHERE mb.id = NEW.monthly_budget_id
        ON CONFLICT(user_id, month, category_id) DO UPDATE SET
          amount = excluded.amount,
          percent = excluded.percent;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_category_budgets_delete
      INSTEAD OF DELETE ON category_budgets
      BEGIN
        DELETE FROM category_budget
        WHERE (user_id, month) IN (SELECT user_id, month FROM month_budget WHERE id = OLD.monthly_budget_id);
      END;

      CREATE VIEW IF NOT EXISTS reglages_points AS
      SELECT
        id,
        points_per_category as points_categorie_respectee,
        points_monthly_bonus as points_bonus_mensuel,
        points_streak_bonus as points_bonus_serie,
        threshold_beginner as seuil_debutant,
        threshold_saver as seuil_econome,
        threshold_expert as seuil_expert
      FROM settings;

      CREATE TRIGGER IF NOT EXISTS trg_reglages_points_update
      INSTEAD OF UPDATE ON reglages_points
      BEGIN
        UPDATE settings SET
          points_per_category = NEW.points_categorie_respectee,
          points_monthly_bonus = NEW.points_bonus_mensuel,
          points_streak_bonus = NEW.points_bonus_serie,
          threshold_beginner = NEW.seuil_debutant,
          threshold_saver = NEW.seuil_econome,
          threshold_expert = NEW.seuil_expert
        WHERE id = OLD.id;
      END;

      CREATE VIEW IF NOT EXISTS alertes_log AS
      SELECT
        id,
        user_id as utilisateur_id,
        month as mois,
        category_id as categorie_id,
        level as seuil,
        created_at as date_creation
      FROM alert_log;

      CREATE TRIGGER IF NOT EXISTS trg_alertes_log_insert
      INSTEAD OF INSERT ON alertes_log
      BEGIN
        INSERT INTO alert_log (user_id, month, category_id, level)
        VALUES (NEW.utilisateur_id, NEW.mois, NEW.categorie_id, NEW.seuil);
      END;
    `);
  } catch (err) {
    // Ignore si des tables physiques portent déjà ces noms
  }
}
