// ============================================================
// FICHIER : src/db/database.ts
// RÔLE    : Ouvre la base de données SQLite et crée toutes les
//           tables si elles n'existent pas encore.
//           C'est le "moteur" de la persistance locale.
// ============================================================
//
// SQLite = une base de données stockée dans UN seul fichier
// sur le téléphone. Pas besoin d'internet. Expo-SQLite nous
// donne une API JavaScript pour y faire des requêtes SQL.
//
// expo-sqlite v2 (Expo SDK 50+) utilise des APIs synchrones.
// openDatabaseSync() ouvre (ou crée) le fichier masrouf.db
// dans le dossier documents de l'application.
// ============================================================

import * as SQLite from 'expo-sqlite';

// Ouvre (ou crée) le fichier masrouf.db sur le téléphone.
// Cette variable est exportée pour être réutilisée partout
// dans l'appli sans ré-ouvrir le fichier à chaque fois.
export const db = SQLite.openDatabaseSync('masrouf.db');

// ============================================================
// initDatabase()
// RÔLE : Crée les 5 tables si elles n'existent pas.
//        Appelé une seule fois au démarrage de l'app
//        (dans src/app/_layout.tsx via useEffect).
// ============================================================
export function initDatabase(): void {

  // execSync exécute plusieurs instructions SQL d'un seul coup.
  // "CREATE TABLE IF NOT EXISTS" = crée la table SEULEMENT
  // si elle n'existe pas déjà → pas d'erreur au 2e lancement.
  db.execSync(`
    PRAGMA journal_mode = WAL;

    -- TABLE 1 : utilisateurs
    -- Stocke les comptes (admin ou utilisateur normal)
    CREATE TABLE IF NOT EXISTS utilisateurs (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      nom            TEXT    NOT NULL,
      email          TEXT    NOT NULL UNIQUE,
      mot_de_passe   TEXT    NOT NULL,
      role           TEXT    NOT NULL DEFAULT 'utilisateur',
      budget_mensuel REAL    NOT NULL DEFAULT 0,
      langue         TEXT    NOT NULL DEFAULT 'fr',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    -- TABLE 2 : categories
    -- Alimentation, Hygiène, Électronique, etc.
    CREATE TABLE IF NOT EXISTS categories (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      nom   TEXT NOT NULL,
      icone TEXT NOT NULL DEFAULT '📦'
    );

    -- TABLE 3 : produits
    -- Chaque produit appartient à une catégorie et a été créé par un utilisateur
    CREATE TABLE IF NOT EXISTS produits (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      nom          TEXT    NOT NULL,
      marque       TEXT    NOT NULL DEFAULT '',
      unite        TEXT    NOT NULL DEFAULT 'pièce',
      categorie_id INTEGER REFERENCES categories(id),
      created_by   INTEGER REFERENCES utilisateurs(id)
    );

    -- TABLE 4 : magasins
    -- Carrefour, Monoprix, Aziza, etc.
    CREATE TABLE IF NOT EXISTS magasins (
      id  INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL
    );

    -- TABLE 5 : achats
    -- LA TABLE PRINCIPALE — enregistre chaque achat effectué
    -- prix_total = prix_unitaire * quantite (calculé à l'insert)
    -- mois = "2026-11" pour regrouper par mois facilement
    CREATE TABLE IF NOT EXISTS achats (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      produit_id     INTEGER NOT NULL REFERENCES produits(id),
      utilisateur_id INTEGER NOT NULL REFERENCES utilisateurs(id),
      magasin_id     INTEGER REFERENCES magasins(id),
      prix_unitaire  REAL    NOT NULL,
      quantite       REAL    NOT NULL DEFAULT 1,
      prix_total     REAL    NOT NULL,
      date_achat     TEXT    NOT NULL DEFAULT (date('now')),
      mois           TEXT    NOT NULL,
      notes          TEXT    DEFAULT ''
    );
  `);

  // --------------------------------------------------------
  // Données initiales (seed data)
  // On insère un admin par défaut et des catégories de base
  // SEULEMENT s'il n'y a pas encore d'utilisateurs dans la DB.
  // --------------------------------------------------------
  const userCount = db.getFirstSync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM utilisateurs'
  );

  if (userCount && userCount.cnt === 0) {
    // Crée l'administrateur par défaut
    // Email: admin@masrouf.tn  Mot de passe: admin123
    db.runSync(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, budget_mensuel)
       VALUES (?, ?, ?, ?, ?)`,
      ['Administrateur', 'admin@masrouf.tn', 'admin123', 'admin', 0]
    );

    // Crée un utilisateur de test
    // Email: user@masrouf.tn  Mot de passe: user123
    db.runSync(
      `INSERT INTO utilisateurs (nom, email, mot_de_passe, role, budget_mensuel)
       VALUES (?, ?, ?, ?, ?)`,
      ['Ahmed Ben Ali', 'user@masrouf.tn', 'user123', 'utilisateur', 800]
    );

    // Crée les catégories de base avec leurs icônes emoji
    db.execSync(`
      INSERT INTO categories (nom, icone) VALUES ('Alimentation', '🍞');
      INSERT INTO categories (nom, icone) VALUES ('Boissons', '🥤');
      INSERT INTO categories (nom, icone) VALUES ('Hygiène', '🧼');
      INSERT INTO categories (nom, icone) VALUES ('Nettoyage', '🧹');
      INSERT INTO categories (nom, icone) VALUES ('Électronique', '📱');
      INSERT INTO categories (nom, icone) VALUES ('Vêtements', '👕');
      INSERT INTO categories (nom, icone) VALUES ('Autre', '📦');
    `);

    // Crée des magasins par défaut
    db.execSync(`
      INSERT INTO magasins (nom) VALUES ('Carrefour');
      INSERT INTO magasins (nom) VALUES ('Monoprix');
      INSERT INTO magasins (nom) VALUES ('Aziza');
      INSERT INTO magasins (nom) VALUES ('MG');
      INSERT INTO magasins (nom) VALUES ('Autre');
    `);

    // Crée un produit exemple
    db.runSync(
      `INSERT INTO produits (nom, marque, unite, categorie_id, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      ['Lait demi-écrémé', 'Délice', 'L', 2, 2]
    );
  }
}

