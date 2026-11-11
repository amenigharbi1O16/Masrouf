// ============================================================
// FICHIER : src/db/database.ts
// RÔLE    : Moteur de base de données locale SQLite (Android & iOS).
//           Crée, met à jour et gère les tables avec intégrité relationnelle
//           et clés étrangères (Foreign Keys ON DELETE CASCADE).
//
// CONCEPTS CLÉS :
//   - Sécurité : Table 'utilisateurs' avec password_hash (sel + SHA-256),
//     is_active (compte activé/suspendu), must_change_password (forcé si temporaire).
//   - Multi-utilisateurs : Chaque table de données contient utilisateur_id.
//   - Gamification : Table reglages_points configurable par l'administrateur.
//   - Budget par enveloppes : Tables monthly_budgets et category_budgets.
// ============================================================

import * as SQLite from 'expo-sqlite';

// Ouvre (ou crée) la base masrouf.db
export const db = SQLite.openDatabaseSync('masrouf.db');

// Hashes pré-calculés (SHA-256 avec sel) pour les deux comptes de test
// admin123 -> sel:hash
const DEFAULT_ADMIN_HASH =
  '11112222333344445555666677778888:60f3d9f2c7bf6bbd6e6263a454cf9a5d4c0cfd7342a7e5e04ad25be69b1d492b';
// user123 -> sel:hash
const DEFAULT_USER_HASH =
  '11112222333344445555666677778888:e6f2daa877de06e7f3d664fb9d340962466508050464c33f8649876bc10a43aa';

// ------------------------------------------------------------
// FONCTION : initDatabase
// RÔLE : Initialise le schéma et applique les migrations incrémentales
// ------------------------------------------------------------
export function initDatabase(): void {
  // Active le mode journal WAL pour la rapidité et active les contraintes FOREIGN KEY
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- 1. TABLE UTILISATEURS (Comptes 'admin' et 'user')
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      nom                  TEXT    NOT NULL,
      email                TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      mot_de_passe         TEXT    NOT NULL DEFAULT '',
      password_hash        TEXT    NOT NULL DEFAULT '',
      role                 TEXT    NOT NULL DEFAULT 'user', -- 'admin' ou 'user'
      is_active            INTEGER NOT NULL DEFAULT 1,      -- 1 = Actif, 0 = Suspendu
      must_change_password INTEGER NOT NULL DEFAULT 0,      -- 1 = Obligation de changer le mdp
      budget_mensuel       REAL    NOT NULL DEFAULT 0,
      langue               TEXT    NOT NULL DEFAULT 'fr',
      created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- 2. TABLE CATEGORIES
    CREATE TABLE IF NOT EXISTS categories (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      nom                 TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      icone               TEXT    NOT NULL DEFAULT '📦',
      pourcentage_defaut  REAL    NOT NULL DEFAULT 0,
      est_defaut          INTEGER NOT NULL DEFAULT 0, -- 1 = affichée d'emblée
      est_visible         INTEGER NOT NULL DEFAULT 1, -- 0 = masquée par l'admin
      est_systeme         INTEGER NOT NULL DEFAULT 0, -- 1 = 'Autres' protégée
      theme               TEXT    NOT NULL DEFAULT 'Divers'
    );

    -- 3. TABLE PRODUITS
    CREATE TABLE IF NOT EXISTS produits (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nom          TEXT    NOT NULL,
      marque       TEXT    NOT NULL DEFAULT '',
      unite        TEXT    NOT NULL DEFAULT 'pièce',
      categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      created_by   INTEGER REFERENCES utilisateurs(id) ON DELETE CASCADE,
      photo_uri    TEXT    DEFAULT ''
    );

    -- 4. TABLE MAGASINS
    CREATE TABLE IF NOT EXISTS magasins (
      id  INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL UNIQUE COLLATE NOCASE
    );

    -- 5. TABLE ACHATS & DEPENSES DIRECTES
    CREATE TABLE IF NOT EXISTS achats (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      produit_id     INTEGER REFERENCES produits(id) ON DELETE SET NULL,
      utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
      magasin_id     INTEGER REFERENCES magasins(id) ON DELETE SET NULL,
      categorie_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
      titre          TEXT    DEFAULT '',
      prix_unitaire  REAL    NOT NULL,
      quantite       REAL    NOT NULL DEFAULT 1,
      prix_total     REAL    NOT NULL,
      date_achat     TEXT    NOT NULL DEFAULT (date('now')),
      mois           TEXT    NOT NULL, -- 'AAAA-MM'
      notes          TEXT    DEFAULT ''
    );

    -- 6. TABLE BUDGET MENSUEL GLOBAL
    CREATE TABLE IF NOT EXISTS monthly_budgets (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
      mois           TEXT    NOT NULL,
      montant_total  REAL    NOT NULL,
      est_evalue     INTEGER NOT NULL DEFAULT 0,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(utilisateur_id, mois)
    );

    -- 7. TABLE ENVELOPPES PAR CATEGORIE
    CREATE TABLE IF NOT EXISTS category_budgets (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      monthly_budget_id INTEGER NOT NULL REFERENCES monthly_budgets(id) ON DELETE CASCADE,
      categorie_id      INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      montant           REAL    NOT NULL,
      pourcentage       REAL    NOT NULL,
      created_at        TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(monthly_budget_id, categorie_id)
    );

    -- 8. TABLE JOURNAL DES POINTS GAGNES
    CREATE TABLE IF NOT EXISTS points_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
      mois           TEXT    NOT NULL,
      raison         TEXT    NOT NULL,
      points         INTEGER NOT NULL,
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- 9. TABLE HISTORIQUE DES ALERTES (anti-répétition)
    CREATE TABLE IF NOT EXISTS alertes_log (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
      mois           TEXT    NOT NULL,
      categorie_id   INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      seuil          INTEGER NOT NULL, -- 80 ou 100
      created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE(utilisateur_id, mois, categorie_id, seuil)
    );

    -- 10. TABLE REGLAGES DU BAREME DES POINTS (Géré par l'Administrateur)
    CREATE TABLE IF NOT EXISTS reglages_points (
      id                          INTEGER PRIMARY KEY AUTOINCREMENT,
      points_categorie_respectee  INTEGER NOT NULL DEFAULT 10,
      points_bonus_mensuel        INTEGER NOT NULL DEFAULT 50,
      points_bonus_serie          INTEGER NOT NULL DEFAULT 20,
      seuil_debutant              INTEGER NOT NULL DEFAULT 0,
      seuil_econome               INTEGER NOT NULL DEFAULT 100,
      seuil_expert                INTEGER NOT NULL DEFAULT 300
    );
  `);

  // --------------------------------------------------------
  // MIGRATION DES COLONNES SUR UNE BASE EXISTANTE
  // --------------------------------------------------------
  migrerColonnesSiBesoin();

  // --------------------------------------------------------
  // INSERTION / MISE A JOUR DES DONNEES PAR DEFAUT
  // --------------------------------------------------------
  initialiserCategories();
  initialiserReglagesPoints();
  initialiserUtilisateurs();
  initialiserMagasins();
}

// ------------------------------------------------------------
// FONCTION AUXILIAIRE : migrerColonnesSiBesoin
// RÔLE : Vérifie la présence des nouvelles colonnes et les ajoute si nécessaire
// ------------------------------------------------------------
function migrerColonnesSiBesoin(): void {
  try {
    const colonnesUsers = db.getAllSync<{ name: string }>(
      `PRAGMA table_info(utilisateurs)`
    );
    const nomsColonnes = colonnesUsers.map((c) => c.name);

    if (!nomsColonnes.includes('password_hash')) {
      db.execSync(`ALTER TABLE utilisateurs ADD COLUMN password_hash TEXT NOT NULL DEFAULT ''`);
    }
    if (!nomsColonnes.includes('is_active')) {
      db.execSync(`ALTER TABLE utilisateurs ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
    }
    if (!nomsColonnes.includes('must_change_password')) {
      db.execSync(`ALTER TABLE utilisateurs ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`);
    }

    // Normalise l'ancien rôle 'utilisateur' vers 'user'
    db.execSync(`UPDATE utilisateurs SET role = 'user' WHERE role = 'utilisateur'`);

    // Colonnes pour catégories
    const colonnesCats = db.getAllSync<{ name: string }>(`PRAGMA table_info(categories)`).map((c) => c.name);
    if (!colonnesCats.includes('pourcentage_defaut')) {
      db.execSync(`ALTER TABLE categories ADD COLUMN pourcentage_defaut REAL NOT NULL DEFAULT 0`);
    }
    if (!colonnesCats.includes('est_defaut')) {
      db.execSync(`ALTER TABLE categories ADD COLUMN est_defaut INTEGER NOT NULL DEFAULT 0`);
    }
    if (!colonnesCats.includes('est_visible')) {
      db.execSync(`ALTER TABLE categories ADD COLUMN est_visible INTEGER NOT NULL DEFAULT 1`);
    }
    if (!colonnesCats.includes('est_systeme')) {
      db.execSync(`ALTER TABLE categories ADD COLUMN est_systeme INTEGER NOT NULL DEFAULT 0`);
    }
    if (!colonnesCats.includes('theme')) {
      db.execSync(`ALTER TABLE categories ADD COLUMN theme TEXT NOT NULL DEFAULT 'Divers'`);
    }

    // Colonnes pour achats
    const colonnesAchats = db.getAllSync<{ name: string }>(`PRAGMA table_info(achats)`).map((c) => c.name);
    if (!colonnesAchats.includes('categorie_id')) {
      db.execSync(`ALTER TABLE achats ADD COLUMN categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL`);
    }
    if (!colonnesAchats.includes('titre')) {
      db.execSync(`ALTER TABLE achats ADD COLUMN titre TEXT DEFAULT ''`);
    }

    // Colonnes pour produits
    const colonnesProds = db.getAllSync<{ name: string }>(`PRAGMA table_info(produits)`).map((c) => c.name);
    if (!colonnesProds.includes('photo_uri')) {
      db.execSync(`ALTER TABLE produits ADD COLUMN photo_uri TEXT DEFAULT ''`);
    }
  } catch (error) {
    console.warn('Avertissement lors de la migration des colonnes SQLite :', error);
  }
}

// ------------------------------------------------------------
// FONCTION AUXILIAIRE : initialiserUtilisateurs
// ------------------------------------------------------------
function initialiserUtilisateurs(): void {
  // Administrateur de départ : doit obligatoirement changer son mot de passe au 1er accès
  const adminExiste = db.getFirstSync<{ id: number }>(
    `SELECT id FROM utilisateurs WHERE email = 'admin@masrouf.tn' COLLATE NOCASE`
  );

  if (!adminExiste) {
    db.runSync(
      `INSERT INTO utilisateurs (nom, email, password_hash, role, is_active, must_change_password, budget_mensuel)
       VALUES (?, ?, ?, 'admin', 1, 1, 0)`,
      ['Administrateur', 'admin@masrouf.tn', DEFAULT_ADMIN_HASH]
    );
  } else {
    // S'assure que son hash et son rôle sont à jour
    db.runSync(
      `UPDATE utilisateurs
       SET role = 'admin',
           password_hash = CASE WHEN password_hash = '' THEN ? ELSE password_hash END
       WHERE id = ?`,
      [DEFAULT_ADMIN_HASH, adminExiste.id]
    );
  }

  // Utilisateur normal de test
  const userExiste = db.getFirstSync<{ id: number }>(
    `SELECT id FROM utilisateurs WHERE email = 'user@masrouf.tn' COLLATE NOCASE`
  );

  if (!userExiste) {
    db.runSync(
      `INSERT INTO utilisateurs (nom, email, password_hash, role, is_active, must_change_password, budget_mensuel)
       VALUES (?, ?, ?, 'user', 1, 0, 800)`,
      ['Ahmed Ben Ali', 'user@masrouf.tn', DEFAULT_USER_HASH]
    );
  } else {
    db.runSync(
      `UPDATE utilisateurs
       SET role = 'user',
           password_hash = CASE WHEN password_hash = '' THEN ? ELSE password_hash END
       WHERE id = ?`,
      [DEFAULT_USER_HASH, userExiste.id]
    );
  }
}

// ------------------------------------------------------------
// FONCTION AUXILIAIRE : initialiserCategories
// ------------------------------------------------------------
function initialiserCategories(): void {
  // 1. Liste des 9 catégories PAR DÉFAUT (total = 100 %)
  const categoriesParDefaut = [
    { nom: 'Alimentation', icone: '🍞', pct: 25, theme: 'Essentiel' },
    { nom: 'Transport', icone: '🚗', pct: 10, theme: 'Essentiel' },
    { nom: 'Études', icone: '📚', pct: 15, theme: 'Essentiel' },
    { nom: 'Vêtements et chaussures', icone: '👕', pct: 8, theme: 'Personnel' },
    { nom: 'Loisirs et sorties', icone: '🎮', pct: 8, theme: 'Personnel' },
    { nom: 'Santé', icone: '💊', pct: 5, theme: 'Santé' },
    { nom: 'Factures', icone: '🧾', pct: 14, theme: 'Logement' },
    { nom: 'Épargne', icone: '💰', pct: 10, theme: 'Argent' },
    { nom: 'Autres', icone: '📦', pct: 5, theme: 'Divers' }, // Protégée contre la suppression
  ];

  // 2. Liste des catégories SUPPLÉMENTAIRES (proposées dans "Ajouter une catégorie")
  const categoriesSupplementaires = [
    // Vie quotidienne
    { nom: 'Restaurants et cafés', icone: '☕', theme: 'Vie quotidienne' },
    { nom: 'Téléphone et internet', icone: '📱', theme: 'Vie quotidienne' },
    { nom: 'Hygiène et soins personnels', icone: '🧼', theme: 'Vie quotidienne' },
    // Logement
    { nom: 'Loyer', icone: '🏠', theme: 'Logement' },
    { nom: 'Maison et équipement', icone: '🛋️', theme: 'Logement' },
    { nom: 'Entretien et réparations', icone: '🔧', theme: 'Logement' },
    // Études et travail
    { nom: 'Cantine et repas à l’école', icone: '🍲', theme: 'Études et travail' },
    { nom: 'Formations et cours en ligne', icone: '🎓', theme: 'Études et travail' },
    { nom: 'Matériel informatique', icone: '💻', theme: 'Études et travail' },
    // Personnel
    { nom: 'Beauté et coiffure', icone: '💇', theme: 'Personnel' },
    { nom: 'Sport et abonnements', icone: '🏋️', theme: 'Personnel' },
    { nom: 'Voyages', icone: '✈️', theme: 'Personnel' },
    { nom: 'Cadeaux et fêtes', icone: '🎁', theme: 'Personnel' },
    // Famille
    { nom: 'Enfants', icone: '👶', theme: 'Famille' },
    { nom: 'Aide à la famille', icone: '🤝', theme: 'Famille' },
    { nom: 'Animaux', icone: '🐾', theme: 'Famille' },
    // Argent
    { nom: 'Dons et charité', icone: '🤲', theme: 'Argent' },
    { nom: 'Dettes et remboursements', icone: '💳', theme: 'Argent' },
    { nom: 'Frais bancaires', icone: '🏦', theme: 'Argent' },
    // Divers
    { nom: 'Imprévus', icone: '⚡', theme: 'Divers' },
  ];

  // Insère ou met à jour les catégories par défaut
  for (const c of categoriesParDefaut) {
    const existe = db.getFirstSync<{ id: number }>(
      `SELECT id FROM categories WHERE nom = ? COLLATE NOCASE`,
      [c.nom]
    );

    const estSysteme = c.nom.toLowerCase() === 'autres' ? 1 : 0;

    if (!existe) {
      db.runSync(
        `INSERT INTO categories (nom, icone, pourcentage_defaut, est_defaut, est_visible, est_systeme, theme)
         VALUES (?, ?, ?, 1, 1, ?, ?)`,
        [c.nom, c.icone, c.pct, estSysteme, c.theme]
      );
    } else {
      db.runSync(
        `UPDATE categories
         SET pourcentage_defaut = ?,
             est_defaut = 1,
             est_systeme = ?,
             theme = ?
         WHERE id = ?`,
        [c.pct, estSysteme, c.theme, existe.id]
      );
    }
  }

  // Insère les catégories supplémentaires sans écraser si elles existent
  for (const c of categoriesSupplementaires) {
    const existe = db.getFirstSync<{ id: number }>(
      `SELECT id FROM categories WHERE nom = ? COLLATE NOCASE`,
      [c.nom]
    );

    if (!existe) {
      db.runSync(
        `INSERT INTO categories (nom, icone, pourcentage_defaut, est_defaut, est_visible, est_systeme, theme)
         VALUES (?, ?, 0, 0, 1, 0, ?)`,
        [c.nom, c.icone, c.theme]
      );
    }
  }

  // Renomme l'ancienne catégorie singulière 'Autre' vers 'Autres' si elle existe
  db.runSync(`UPDATE categories SET nom = 'Autres', est_systeme = 1 WHERE nom = 'Autre' COLLATE NOCASE`);
}

// ------------------------------------------------------------
// FONCTION AUXILIAIRE : initialiserReglagesPoints
// ------------------------------------------------------------
function initialiserReglagesPoints(): void {
  const compte = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM reglages_points`
  );

  if (!compte || compte.cnt === 0) {
    db.runSync(`
      INSERT INTO reglages_points
        (points_categorie_respectee, points_bonus_mensuel, points_bonus_serie,
         seuil_debutant, seuil_econome, seuil_expert)
      VALUES (10, 50, 20, 0, 100, 300)
    `);
  }
}

// ------------------------------------------------------------
// FONCTION AUXILIAIRE : initialiserMagasins
// ------------------------------------------------------------
function initialiserMagasins(): void {
  const magasins = ['Carrefour', 'Monoprix', 'Aziza', 'MG', 'Boutique locale', 'Autre'];
  for (const m of magasins) {
    const existe = db.getFirstSync<{ id: number }>(
      `SELECT id FROM magasins WHERE nom = ? COLLATE NOCASE`,
      [m]
    );
    if (!existe) {
      db.runSync(`INSERT INTO magasins (nom) VALUES (?)`, [m]);
    }
  }
}
