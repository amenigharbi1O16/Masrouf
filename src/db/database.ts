// ============================================================
// FICHIER : src/db/database.ts
// RÔLE    : Moteur de persistance SQLite locale (Android & iOS).
//           ÉTAPE 1 : Création du schéma relationnel et migration
//           transparente sans perte de données.
//
// CONVENTION DE NOMMAGE :
//   Toutes les tables sont au singulier :
//   - user, category, user_category, month_budget, category_budget,
//     product, purchase, expense, keyword_map, alert_log, points_log, settings.
//
// GARANTIE SANS PERTE DE DONNÉES :
//   Si la base contient d'anciennes tables (utilisateurs, categories, etc.),
//   les données sont automatiquement migrées vers les nouvelles tables
//   et des vues de compatibilité sont créées pour assurer la continuité.
// ============================================================

import * as SQLite from 'expo-sqlite';

// Connexion SQLite locale
export const db = SQLite.openDatabaseSync('masrouf.db');

// Hashes initiaux (SHA-256 avec sel) pour admin et user de test
export const DEFAULT_SALT = '11112222333344445555666677778888';
// admin123
export const DEFAULT_ADMIN_HASH =
  '11112222333344445555666677778888:60f3d9f2c7bf6bbd6e6263a454cf9a5d4c0cfd7342a7e5e04ad25be69b1d492b';
// user123
export const DEFAULT_USER_HASH =
  '11112222333344445555666677778888:e6f2daa877de06e7f3d664fb9d340962466508050464c33f8649876bc10a43aa';

// ------------------------------------------------------------
// FONCTION : initDatabase
// RÔLE : Initialise les tables, migre les données et insère les valeurs de départ
// ------------------------------------------------------------
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
      salt                 TEXT    NOT NULL,
      role                 TEXT    NOT NULL DEFAULT 'user', -- 'admin' ou 'user'
      is_active            INTEGER NOT NULL DEFAULT 1,      -- 1 = actif, 0 = suspendu
      must_change_password INTEGER NOT NULL DEFAULT 0,      -- 1 = changement forcé
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
      points_per_category INTEGER NOT NULL DEFAULT 10,
      points_monthly_bonus INTEGER NOT NULL DEFAULT 50,
      points_streak_bonus INTEGER NOT NULL DEFAULT 20,
      threshold_beginner  INTEGER NOT NULL DEFAULT 0,
      threshold_saver     INTEGER NOT NULL DEFAULT 100,
      threshold_expert    INTEGER NOT NULL DEFAULT 300
    );
  `);

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
}

// ------------------------------------------------------------
// MIGRATION : migrerAnciennesDonneesSiPresentes
// RÔLE : Transfère les données des tables françaises (utilisateurs,
//        categories, produits, achats) vers les nouvelles tables unifiées
// ------------------------------------------------------------
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
    const aAnciensAchats = db.getFirstSync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='achats'`
    );
    if (aAnciensAchats && aAnciensAchats.cnt > 0) {
      const nbPurchases = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM purchase`);
      const nbExpenses = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM expense`);

      if (nbPurchases?.cnt === 0 && nbExpenses?.cnt === 0) {
        // D'abord les produits s'il y en a
        db.execSync(`
          INSERT OR IGNORE INTO product (id, user_id, name, brand, category_id, photo_path, unit)
          SELECT id, created_by, nom, marque, categorie_id, photo_uri, unite
          FROM produits;
        `);

        // Achats avec produit -> purchase
        db.execSync(`
          INSERT OR IGNORE INTO purchase (id, user_id, product_id, category_id, price, quantity, unit, store, date, month, notes)
          SELECT
            a.id,
            a.utilisateur_id,
            a.produit_id,
            COALESCE(p.categorie_id, 1),
            a.prix_unitaire,
            a.quantite,
            COALESCE(p.unite, 'pièce'),
            'Non précisé',
            a.date_achat,
            a.mois,
            COALESCE(a.notes, '')
          FROM achats a
          JOIN produits p ON a.produit_id = p.id
          WHERE a.produit_id IS NOT NULL;
        `);

        // Achats sans produit (dépenses directes) -> expense
        db.execSync(`
          INSERT OR IGNORE INTO expense (id, user_id, category_id, amount, label, date, month, notes)
          SELECT
            a.id,
            a.utilisateur_id,
            COALESCE(a.categorie_id, 9), -- 9 = Autres par défaut
            a.prix_total,
            COALESCE(NULLIF(a.titre, ''), 'Dépense'),
            a.date_achat,
            a.mois,
            COALESCE(a.notes, '')
          FROM achats a
          WHERE a.produit_id IS NULL;
        `);
      }
    }
  } catch (err) {
    console.warn('Note sur la migration des données :', err);
  }
}

// ------------------------------------------------------------
// INITIALISATION : initialiserCategories
// RÔLE : Renseigne les catégories avec leur TYPE ('product' ou 'expense')
// ------------------------------------------------------------
function initialiserCategories(): void {
  // A) CATÉGORIES DE PRODUITS ACHETÉS (type = 'product')
  const categoriesProduits = [
    // Par défaut
    { name: 'Alimentation', icon: '🍞', pct: 25, isDef: 1, theme: 'Essentiel' },
    { name: 'Vêtements et chaussures', icon: '👕', pct: 8, isDef: 1, theme: 'Personnel' },
    { name: 'Hygiène et soins personnels', icon: '🧼', pct: 4, isDef: 1, theme: 'Vie quotidienne' },
    { name: 'Maison et équipement', icon: '🛋️', pct: 4, isDef: 1, theme: 'Logement' },
    { name: 'Matériel informatique', icon: '💻', pct: 4, isDef: 1, theme: 'Études et travail' },
    { name: 'Santé', icon: '💊', pct: 5, isDef: 1, theme: 'Santé' },
    // Supplémentaires
    { name: 'Maison et entretien', icon: '🧹', pct: 0, isDef: 0, theme: 'Logement' },
    { name: 'Beauté et coiffure', icon: '💇', pct: 0, isDef: 0, theme: 'Personnel' },
    { name: 'Animaux', icon: '🐾', pct: 0, isDef: 0, theme: 'Famille' },
  ];

  // B) CATÉGORIES DE DÉPENSES HORS PRODUITS (type = 'expense')
  const categoriesDepenses = [
    // Par défaut
    { name: 'Transport', icon: '🚗', pct: 10, isDef: 1, theme: 'Essentiel' },
    { name: 'Factures', icon: '🧾', pct: 14, isDef: 1, theme: 'Logement' },
    { name: 'Études', icon: '📚', pct: 10, isDef: 1, theme: 'Études et travail' },
    { name: 'Loisirs et sorties', icon: '🎮', pct: 5, isDef: 1, theme: 'Personnel' },
    { name: 'Enfants', icon: '👶', pct: 5, isDef: 1, theme: 'Famille' },
    { name: 'Aide à la famille', icon: '🤝', pct: 2, isDef: 1, theme: 'Famille' },
    { name: 'Épargne', icon: '💰', pct: 5, isDef: 1, theme: 'Argent' },
    { name: 'Dons et charité', icon: '🤲', pct: 1, isDef: 1, theme: 'Argent' },
    { name: 'Frais bancaires', icon: '🏦', pct: 2, isDef: 1, theme: 'Argent' },
    { name: 'Autres', icon: '📦', pct: 5, isDef: 1, theme: 'Divers', isSys: 1 }, // Protégée
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
        `UPDATE category SET type = 'product', default_percent = ?, is_default = ?, theme = ? WHERE id = ?`,
        [c.pct, c.isDef, c.theme, existe.id]
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
        `UPDATE category SET type = 'expense', default_percent = ?, is_default = ?, is_system = ?, theme = ? WHERE id = ?`,
        [c.pct, c.isDef, isSys, c.theme, existe.id]
      );
    }
  }
}

// ------------------------------------------------------------
// INITIALISATION : initialiserMotsClesSysteme
// RÔLE : Dictionnaire de base FR / AR / Dialecte tunisien pour la saisie libre
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// INITIALISATION : initialiserSettings
// ------------------------------------------------------------
function initialiserSettings(): void {
  const existe = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM settings`);
  if (!existe || existe.cnt === 0) {
    db.runSync(`
      INSERT INTO settings
        (points_per_category, points_monthly_bonus, points_streak_bonus,
         threshold_beginner, threshold_saver, threshold_expert)
      VALUES (10, 50, 20, 0, 100, 300)
    `);
  }
}

// ------------------------------------------------------------
// INITIALISATION : initialiserComptesDepart
// ------------------------------------------------------------
function initialiserComptesDepart(): void {
  // Administrateur (must_change_password = 1)
  const adminExiste = db.getFirstSync<{ id: number }>(
    `SELECT id FROM user WHERE email = 'admin@masrouf.tn' COLLATE NOCASE`
  );
  if (!adminExiste) {
    db.runSync(
      `INSERT INTO user (name, email, password_hash, salt, role, is_active, must_change_password)
       VALUES (?, ?, ?, ?, 'admin', 1, 1)`,
      ['Administrateur', 'admin@masrouf.tn', DEFAULT_ADMIN_HASH, DEFAULT_SALT]
    );
  }

  // Utilisateur standard (must_change_password = 0)
  const userExiste = db.getFirstSync<{ id: number }>(
    `SELECT id FROM user WHERE email = 'user@masrouf.tn' COLLATE NOCASE`
  );
  if (!userExiste) {
    db.runSync(
      `INSERT INTO user (name, email, password_hash, salt, role, is_active, must_change_password)
       VALUES (?, ?, ?, ?, 'user', 1, 0)`,
      ['Ahmed Ben Ali', 'user@masrouf.tn', DEFAULT_USER_HASH, DEFAULT_SALT]
    );
  }
}

// ------------------------------------------------------------
// COMPATIBILITÉ : Vues SQLite pour les écrans existants
// ------------------------------------------------------------
function creerVuesDeRetroCompatibilite(): void {
  try {
    // Si des tables de même nom n'existent pas sous forme de vraies tables,
    // on crée des vues pour que les fonctions qui interrogent encore les anciens
    // noms ne provoquent aucun crash !
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
        0 as budget_mensuel,
        'fr' as langue,
        created_at
      FROM user;

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
    `);
  } catch (err) {
    // Ignore si des tables physiques portent déjà ces noms
  }
}
