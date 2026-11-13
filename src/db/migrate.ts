// ============================================================
// FICHIER : src/db/migrate.ts
// MISSION : Faire passer une base déjà installée vers les périodes
//           libres, sans perdre les lignes, et pouvoir relancer
//           ce script sans erreur.
//
// POURQUOI : l'ancienne base rangeait le budget par mois civil
// (month_budget). Le produit demande une date de début et une
// date de fin choisies par la personne.
// ============================================================

import type { SQLiteDatabase } from 'expo-sqlite';

function dejaFaite(db: SQLiteDatabase, id: string): boolean {
  const row = db.getFirstSync<{ id: string }>(
    `SELECT id FROM schema_migrations WHERE id = ?`,
    [id]
  );
  return row != null;
}

function marquer(db: SQLiteDatabase, id: string): void {
  db.runSync(`INSERT INTO schema_migrations (id) VALUES (?)`, [id]);
}

function ajouterColonne(db: SQLiteDatabase, sql: string): void {
  try {
    db.execSync(sql);
  } catch {
    // La colonne existe déjà : on continue.
  }
}

/**
 * Migration du prix.
 * L'ancien déclencheur écrivait le prix UNITAIRE dans purchase.price
 * (voir trg_achats_insert : NEW.prix_unitaire).
 * On lit d'abord les lignes réelles. S'il n'y en a pas, on ne touche à rien.
 * S'il y en a, on multiplie par la quantité, une seule fois :
 * quand la quantité vaut 1, le nombre ne change pas.
 */
function migrerPrixTotal(db: SQLiteDatabase): void {
  if (dejaFaite(db, 'purchase_price_is_total_v1')) return;

  const lignes = db.getAllSync<{ id: number; price: number; quantity: number }>(
    `SELECT id, price, quantity FROM purchase`
  );

  for (const ligne of lignes) {
    const quantite = ligne.quantity > 0 ? ligne.quantity : 1;
    const total = ligne.price * quantite;
    db.runSync(`UPDATE purchase SET price = ? WHERE id = ?`, [total, ligne.id]);
  }

  marquer(db, 'purchase_price_is_total_v1');
}

function nomDeFichier(chemin: string): string {
  const morceaux = chemin.split(/[/\\]/);
  return morceaux[morceaux.length - 1] ?? '';
}

function migrerNomPhoto(db: SQLiteDatabase): void {
  if (dejaFaite(db, 'photo_filename_only_v1')) return;
  const lignes = db.getAllSync<{ id: number; photo_path: string }>(
    `SELECT id, photo_path FROM product WHERE photo_path != ''`
  );
  for (const ligne of lignes) {
    const nom = nomDeFichier(ligne.photo_path);
    if (nom !== ligne.photo_path) {
      db.runSync(`UPDATE product SET photo_path = ? WHERE id = ?`, [nom, ligne.id]);
    }
  }
  marquer(db, 'photo_filename_only_v1');
}

function creerVuesPrixTotal(db: SQLiteDatabase): void {
  // On recrée la vue à chaque démarrage : CREATE VIEW IF NOT EXISTS
  // ne mettrait pas à jour une vue déjà fausse.
  db.execSync(`
    DROP TRIGGER IF EXISTS trg_achats_insert;
    DROP VIEW IF EXISTS achats;

    CREATE VIEW achats AS
    SELECT
      p.id,
      p.product_id as produit_id,
      p.user_id as utilisateur_id,
      NULL as magasin_id,
      p.category_id as categorie_id,
      p.notes as titre,
      CASE WHEN p.quantity IS NULL OR p.quantity = 0 THEN 0
           ELSE p.price / p.quantity END as prix_unitaire,
      p.quantity as quantite,
      p.price as prix_total,
      p.date as date_achat,
      substr(p.date, 1, 7) as mois,
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
      substr(e.date, 1, 7) as mois,
      e.notes,
      '' as magasin_nom
    FROM expense e;

    CREATE TRIGGER trg_achats_insert
    INSTEAD OF INSERT ON achats
    BEGIN
      INSERT INTO purchase (user_id, product_id, category_id, price, quantity, unit, store, date, month, notes)
      SELECT
        NEW.utilisateur_id,
        NEW.produit_id,
        COALESCE(NEW.categorie_id, (SELECT category_id FROM product WHERE id = NEW.produit_id), 1),
        COALESCE(NEW.prix_total, NEW.prix_unitaire * COALESCE(NEW.quantite, 1)),
        COALESCE(NEW.quantite, 1),
        COALESCE((SELECT unit FROM product WHERE id = NEW.produit_id), 'pièce'),
        COALESCE(
          (SELECT nom FROM magasins WHERE id = NEW.magasin_id),
          'Non précisé'
        ),
        COALESCE(NEW.date_achat, date('now')),
        substr(COALESCE(NEW.date_achat, date('now')), 1, 7),
        COALESCE(NEW.notes, '')
      WHERE NEW.produit_id IS NOT NULL;

      INSERT INTO expense (user_id, category_id, amount, label, date, month, notes)
      SELECT
        NEW.utilisateur_id,
        COALESCE(NEW.categorie_id, 9),
        COALESCE(NEW.prix_total, NEW.prix_unitaire),
        COALESCE(NULLIF(NEW.titre, ''), 'Dépense'),
        COALESCE(NEW.date_achat, date('now')),
        substr(COALESCE(NEW.date_achat, date('now')), 1, 7),
        COALESCE(NEW.notes, '')
      WHERE NEW.produit_id IS NULL;
    END;
  `);
}

/**
 * Point d'entrée. Relançable : chaque étape est notée dans schema_migrations.
 */
export function migrateDatabase(db: SQLiteDatabase): void {
  db.execSync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS budget (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id      INTEGER NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      start_date   TEXT    NOT NULL,
      end_date     TEXT    NOT NULL,
      total        REAL    NOT NULL,
      is_evaluated INTEGER NOT NULL DEFAULT 0,
      succeeded    INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS envelope (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id   INTEGER NOT NULL REFERENCES budget(id) ON DELETE CASCADE,
      category_id INTEGER NOT NULL REFERENCES category(id) ON DELETE CASCADE,
      amount      REAL    NOT NULL DEFAULT 0,
      UNIQUE(budget_id, category_id)
    );
  `);

  ajouterColonne(db, `ALTER TABLE alert_log ADD COLUMN budget_id INTEGER REFERENCES budget(id) ON DELETE CASCADE;`);
  ajouterColonne(db, `ALTER TABLE points_log ADD COLUMN budget_id INTEGER REFERENCES budget(id) ON DELETE CASCADE;`);
  ajouterColonne(db, `ALTER TABLE settings ADD COLUMN points_per_period INTEGER NOT NULL DEFAULT 100;`);
  ajouterColonne(db, `ALTER TABLE settings ADD COLUMN green_until INTEGER NOT NULL DEFAULT 79;`);
  ajouterColonne(db, `ALTER TABLE settings ADD COLUMN orange_from INTEGER NOT NULL DEFAULT 80;`);
  ajouterColonne(db, `ALTER TABLE settings ADD COLUMN red_from INTEGER NOT NULL DEFAULT 100;`);
  ajouterColonne(db, `ALTER TABLE settings ADD COLUMN streak_length INTEGER NOT NULL DEFAULT 3;`);

  if (!dejaFaite(db, 'settings_design_v1')) {
    db.execSync(`
      UPDATE settings SET
        points_per_period = 100,
        points_streak_bonus = 50,
        streak_length = 3,
        points_per_category = 0,
        points_monthly_bonus = 0,
        threshold_beginner = 0,
        threshold_saver = 300,
        threshold_expert = 1000,
        green_until = 79,
        orange_from = 80,
        red_from = 100;
    `);
    marquer(db, 'settings_design_v1');
  }

  if (!dejaFaite(db, 'categories_screen41_v1')) {
    const officiels: [string, number, string][] = [
      ['Alimentation', 40, 'product'],
      ['Vêtements et chaussures', 5, 'product'],
      ['Hygiène et soins', 4, 'product'],
      ['Maison et équipement', 4, 'product'],
      ['Matériel informatique', 2, 'product'],
      ['Santé et médicaments', 5, 'product'],
      ['Transport', 10, 'expense'],
      ['Factures', 12, 'expense'],
      ['Éducation', 3, 'expense'],
      ['Loisirs', 4, 'expense'],
      ['Enfants', 2, 'expense'],
      ['Aide familiale', 2, 'expense'],
      ['Épargne', 4, 'expense'],
      ['Dons', 1, 'expense'],
      ['Frais bancaires', 1, 'expense'],
      ['Autres', 1, 'expense'],
    ];
    for (const [nom, pct, type] of officiels) {
      db.runSync(
        `UPDATE category SET default_percent = ?, is_default = 1, type = ? WHERE name_key = ? COLLATE NOCASE`,
        [pct, type, nom]
      );
    }
    marquer(db, 'categories_screen41_v1');
  }

  if (!dejaFaite(db, 'month_budget_to_budget_v1')) {
    // Un mois civil devient une période du 1er au dernier jour.
    db.execSync(`
      INSERT INTO budget (user_id, start_date, end_date, total, is_evaluated, created_at)
      SELECT
        mb.user_id,
        mb.month || '-01',
        date(mb.month || '-01', '+1 month', '-1 day'),
        mb.total,
        mb.is_evaluated,
        mb.created_at
      FROM month_budget mb
      WHERE NOT EXISTS (
        SELECT 1 FROM budget b
        WHERE b.user_id = mb.user_id
          AND b.start_date = mb.month || '-01'
      );
    `);

    db.execSync(`
      INSERT INTO envelope (budget_id, category_id, amount)
      SELECT b.id, cb.category_id, cb.amount
      FROM category_budget cb
      JOIN budget b
        ON b.user_id = cb.user_id
       AND b.start_date = cb.month || '-01'
      WHERE NOT EXISTS (
        SELECT 1 FROM envelope e
        WHERE e.budget_id = b.id AND e.category_id = cb.category_id
      );
    `);

    db.execSync(`
      UPDATE alert_log
      SET budget_id = (
        SELECT b.id FROM budget b
        WHERE b.user_id = alert_log.user_id
          AND b.start_date = alert_log.month || '-01'
      )
      WHERE budget_id IS NULL;
    `);

    db.execSync(`
      UPDATE points_log
      SET budget_id = (
        SELECT b.id FROM budget b
        WHERE b.user_id = points_log.user_id
          AND b.start_date = points_log.month || '-01'
      )
      WHERE budget_id IS NULL;
    `);

    marquer(db, 'month_budget_to_budget_v1');
  }

  migrerPrixTotal(db);
  migrerNomPhoto(db);
  creerVuesPrixTotal(db);
}
