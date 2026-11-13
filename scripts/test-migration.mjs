// Test de la migration des périodes et du prix total.
// Reprend le SQL de src/db/migrate.ts sur une base en mémoire.
import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync(':memory:');

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE user (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
  );
  CREATE TABLE category (
    id INTEGER PRIMARY KEY,
    name_key TEXT NOT NULL
  );
  CREATE TABLE month_budget (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    total REAL NOT NULL,
    is_evaluated INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE category_budget (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    percent REAL NOT NULL DEFAULT 0
  );
  CREATE TABLE purchase (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    price REAL NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    store TEXT NOT NULL,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE product (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    photo_path TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE alert_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    level INTEGER NOT NULL
  );
  CREATE TABLE points_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    reason TEXT NOT NULL,
    points INTEGER NOT NULL
  );
  INSERT INTO user (id, name) VALUES (1, 'Ines');
  INSERT INTO category (id, name_key) VALUES (1, 'Alimentation');
  INSERT INTO month_budget (user_id, month, total, is_evaluated) VALUES (1, '2026-11', 1200, 0);
  INSERT INTO category_budget (user_id, month, category_id, amount, percent) VALUES (1, '2026-11', 1, 480, 40);
  INSERT INTO purchase (user_id, product_id, category_id, price, quantity, unit, store, date, month)
  VALUES (1, 1, 1, 10, 2, 'L', 'Monoprix', '2026-11-12', '2026-11');
  INSERT INTO purchase (user_id, product_id, category_id, price, quantity, unit, store, date, month)
  VALUES (1, 1, 1, 14.5, 1, 'L', 'Monoprix', '2026-11-13', '2026-11');
  INSERT INTO product (id, user_id, name, photo_path) VALUES (1, 1, 'Huile', 'file:///data/photos/huile.jpg');
  INSERT INTO alert_log (user_id, month, category_id, level) VALUES (1, '2026-11', 1, 80);
`);

function migrer(base) {
  base.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS budget (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total REAL NOT NULL,
      is_evaluated INTEGER NOT NULL DEFAULT 0,
      succeeded INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS envelope (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      budget_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      UNIQUE(budget_id, category_id)
    );
  `);
  const faite = (id) => base.prepare(`SELECT id FROM schema_migrations WHERE id = ?`).get(id);
  const marquer = (id) => base.prepare(`INSERT INTO schema_migrations (id) VALUES (?)`).run(id);

  if (!faite('month_budget_to_budget_v1')) {
    base.exec(`
      INSERT INTO budget (user_id, start_date, end_date, total, is_evaluated, created_at)
      SELECT mb.user_id, mb.month || '-01', date(mb.month || '-01', '+1 month', '-1 day'),
             mb.total, mb.is_evaluated, mb.created_at
      FROM month_budget mb
      WHERE NOT EXISTS (
        SELECT 1 FROM budget b WHERE b.user_id = mb.user_id AND b.start_date = mb.month || '-01'
      );
      INSERT INTO envelope (budget_id, category_id, amount)
      SELECT b.id, cb.category_id, cb.amount
      FROM category_budget cb
      JOIN budget b ON b.user_id = cb.user_id AND b.start_date = cb.month || '-01'
      WHERE NOT EXISTS (
        SELECT 1 FROM envelope e WHERE e.budget_id = b.id AND e.category_id = cb.category_id
      );
    `);
    marquer('month_budget_to_budget_v1');
  }

  if (!faite('purchase_price_is_total_v1')) {
    const lignes = base.prepare(`SELECT id, price, quantity FROM purchase`).all();
    const maj = base.prepare(`UPDATE purchase SET price = ? WHERE id = ?`);
    for (const ligne of lignes) {
      const quantite = ligne.quantity > 0 ? ligne.quantity : 1;
      maj.run(ligne.price * quantite, ligne.id);
    }
    marquer('purchase_price_is_total_v1');
  }

  if (!faite('photo_filename_only_v1')) {
    const photos = base.prepare(`SELECT id, photo_path FROM product WHERE photo_path != ''`).all();
    const maj = base.prepare(`UPDATE product SET photo_path = ? WHERE id = ?`);
    for (const ligne of photos) {
      const nom = ligne.photo_path.split(/[/\\]/).pop();
      if (nom !== ligne.photo_path) maj.run(nom, ligne.id);
    }
    marquer('photo_filename_only_v1');
  }
}

function assert(cond, message) {
  if (!cond) {
    console.error('ECHEC:', message);
    process.exit(1);
  }
}

migrer(db);
const budget = db.prepare(`SELECT start_date, end_date, total FROM budget`).get();
assert(budget.start_date === '2026-11-01', 'début du mois');
assert(budget.end_date === '2026-11-30', 'fin du mois de 30 jours');
assert(budget.total === 1200, 'total conservé');

const env = db.prepare(`SELECT amount FROM envelope`).get();
assert(env.amount === 480, 'enveloppe conservée');

const prix = db.prepare(`SELECT price, quantity FROM purchase ORDER BY id`).all();
assert(prix[0].price === 20, '10 DT unitaire x 2 = 20 DT total');
assert(prix[1].price === 14.5, 'quantité 1 : le total ne change pas');

const photo = db.prepare(`SELECT photo_path FROM product`).get();
assert(photo.photo_path === 'huile.jpg', 'seul le nom du fichier reste');

const avant = db.prepare(`SELECT COUNT(*) AS n FROM budget`).get().n;
migrer(db);
const apres = db.prepare(`SELECT COUNT(*) AS n FROM budget`).get().n;
const prixApres = db.prepare(`SELECT price FROM purchase ORDER BY id`).all();
assert(avant === apres, 'relance : pas de second budget');
assert(prixApres[0].price === 20, 'relance : le prix n est pas remultiplié');

const chevauche = db.prepare(`
  SELECT id FROM budget
  WHERE user_id = ? AND id != ? AND start_date <= ? AND end_date >= ?
`).get(1, -1, '2026-11-20', '2026-11-10');
assert(chevauche != null, 'une période du 10 au 20 novembre chevauche novembre');

console.log('Migration testée : périodes, prix total, photo, relance, chevauchement.');
