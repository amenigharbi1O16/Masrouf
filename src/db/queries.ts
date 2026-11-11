// ============================================================
// FICHIER : src/db/queries.ts
// RÔLE    : Fonctions d'accès aux données SQLite pour Masrouf.
//           Toutes les requêtes sont paramétrées (anti-injection SQL).
//
// ORGANISATION :
//   Section A — Authentification, Sécurité & Utilisateurs
//   Section B — Dépenses & Achats personnels (WHERE utilisateur_id = ?)
//   Section C — Produits personnels (WHERE created_by = ?)
//   Section D — Catégories & Magasins (Référentiel)
//   Section E — Budgets par enveloppes & Analyses mensuelles
//   Section F — Gamification & Historique des points
//   Section G — Supervision Administrateur (Statistiques globales 100% anonymes)
// ============================================================

import { db } from './database';

// ============================================================
// TYPES TYPESCRIPT
// ============================================================

export type Utilisateur = {
  id: number;
  nom: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  is_active: number;
  must_change_password: number;
  budget_mensuel: number;
  langue: string;
  created_at: string;
};

export type Categorie = {
  id: number;
  nom: string;
  icone: string;
  pourcentage_defaut: number;
  est_defaut: number;
  est_visible: number;
  est_systeme: number;
  theme: string;
};

export type Produit = {
  id: number;
  nom: string;
  marque: string;
  unite: string;
  categorie_id: number;
  categorie_nom: string;
  categorie_icone: string;
  created_by: number;
  photo_uri: string;
};

export type Magasin = {
  id: number;
  nom: string;
};

export type Achat = {
  id: number;
  produit_id: number | null;
  produit_nom: string;
  produit_icone: string;
  utilisateur_id: number;
  magasin_id: number | null;
  magasin_nom: string;
  categorie_id: number | null;
  titre: string;
  prix_unitaire: number;
  quantite: number;
  prix_total: number;
  date_achat: string;
  mois: string;
  notes: string;
};

export type EnveloppeBudget = {
  categorie_id: number;
  categorie_nom: string;
  categorie_icone: string;
  montant_alloue: number;
  montant_depense: number;
  montant_restant: number;
  pourcentage_alloue: number;
  pourcentage_consomme: number;
};

export type PointsSettings = {
  points_categorie_respectee: number;
  points_bonus_mensuel: number;
  points_bonus_serie: number;
  seuil_debutant: number;
  seuil_econome: number;
  seuil_expert: number;
};

export type AdminGlobalStats = {
  nbUtilisateurs: number;
  nbUtilisateursActifs: number;
  nbProduits: number;
  nbAchats: number;
  volumeTotalTND: number;
  topCategorieNom: string;
};

export type DepenseParCategorie = {
  categorie_nom: string;
  categorie_icone: string;
  total: number;
};

// ============================================================
// SECTION A — AUTHENTIFICATION & UTILISATEURS
// ============================================================

// ------------------------------------------------------------
// getUserByEmail : Recherche un compte par e-mail (insensible à la casse)
// ------------------------------------------------------------
export function getUserByEmail(email: string): Utilisateur | null {
  const row = db.getFirstSync<any>(
    `SELECT id, name as nom, email, password_hash, role, is_active, must_change_password, budget_mensuel, langue, created_at
     FROM user
     WHERE email = ? COLLATE NOCASE`,
    [email.trim().toLowerCase()]
  );
  if (!row) return null;
  return {
    id: row.id,
    nom: row.nom,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role,
    is_active: row.is_active,
    must_change_password: row.must_change_password,
    budget_mensuel: row.budget_mensuel ?? 0,
    langue: row.langue ?? 'fr',
    created_at: row.created_at,
  };
}

// ------------------------------------------------------------
// getUserById : Recherche un utilisateur par son identifiant unique
// ------------------------------------------------------------
export function getUserById(id: number): Utilisateur | null {
  const row = db.getFirstSync<any>(
    `SELECT id, name as nom, email, password_hash, role, is_active, must_change_password, budget_mensuel, langue, created_at
     FROM user
     WHERE id = ?`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id,
    nom: row.nom,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role,
    is_active: row.is_active,
    must_change_password: row.must_change_password,
    budget_mensuel: row.budget_mensuel ?? 0,
    langue: row.langue ?? 'fr',
    created_at: row.created_at,
  };
}

// ------------------------------------------------------------
// registerUser : Crée un compte utilisateur normal (rôle 'user' UNIQUEMENT)
// ------------------------------------------------------------
export function registerUser(
  nom: string,
  email: string,
  passwordHash: string
): number {
  const result = db.runSync(
    `INSERT INTO user (name, email, password_hash, salt, role, is_active, must_change_password, budget_mensuel, langue)
     VALUES (?, ?, ?, '', 'user', 1, 0, 0, 'fr')`,
    [nom.trim(), email.trim().toLowerCase(), passwordHash]
  );
  return result.lastInsertRowId;
}

// ------------------------------------------------------------
// updateUserPassword : Met à jour le mot de passe et réinitialise must_change_password
// ------------------------------------------------------------
export function updateUserPassword(
  userId: number,
  newPasswordHash: string
): void {
  db.runSync(
    `UPDATE user
     SET password_hash = ?,
         must_change_password = 0
     WHERE id = ?`,
    [newPasswordHash, userId]
  );
}

// ------------------------------------------------------------
// updateUserActiveStatus : Active ou suspend l'accès d'un compte
// ------------------------------------------------------------
export function updateUserActiveStatus(
  userId: number,
  isActive: boolean
): void {
  db.runSync(
    `UPDATE user SET is_active = ? WHERE id = ?`,
    [isActive ? 1 : 0, userId]
  );
}

// ------------------------------------------------------------
// resetUserPassword : Génère un mot de passe temporaire et force son changement
// ------------------------------------------------------------
export function resetUserPassword(
  userId: number,
  tempPasswordHash: string
): void {
  db.runSync(
    `UPDATE user
     SET password_hash = ?,
         must_change_password = 1
     WHERE id = ?`,
    [tempPasswordHash, userId]
  );
}

// ------------------------------------------------------------
// deleteUserAndData : Supprime un utilisateur et l'ensemble de ses données
// ------------------------------------------------------------
export function deleteUserAndData(userId: number): void {
  // Les contraintes ON DELETE CASCADE suppriment automatiquement
  // produits, achats, budgets et logs rattachés à cet utilisateur
  db.runSync(`DELETE FROM user WHERE id = ?`, [userId]);
}

// ------------------------------------------------------------
// countActiveAdmins : Compte le nombre d'administrateurs actifs
// ------------------------------------------------------------
export function countActiveAdmins(): number {
  const result = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM user WHERE role = 'admin' AND is_active = 1`
  );
  return result?.cnt ?? 0;
}

// ============================================================
// SECTION B — DEPENSES ET ACHATS PERSONNELS (WHERE utilisateur_id = ?)
// ============================================================

export function getTotalMois(utilisateurId: number, mois: string): number {
  const result = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(prix_total), 0) as total
     FROM achats
     WHERE utilisateur_id = ? AND mois = ?`,
    [utilisateurId, mois]
  );
  return result?.total ?? 0;
}

export function getTotalMoisPrecedent(
  utilisateurId: number,
  moisActuel: string
): number {
  const [annee, mois] = moisActuel.split('-').map(Number);
  let moisPrec = mois === 1 ? 12 : mois - 1;
  let anneePrec = mois === 1 ? annee - 1 : annee;
  const moisPrecedent = `${anneePrec}-${String(moisPrec).padStart(2, '0')}`;
  return getTotalMois(utilisateurId, moisPrecedent);
}

export function getRecentAchats(utilisateurId: number, mois: string): Achat[] {
  return db.getAllSync<Achat>(
    `SELECT
       a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
       COALESCE(a.titre, '') as titre,
       a.prix_unitaire, a.quantite, a.prix_total,
       a.date_achat, a.mois, a.notes,
       COALESCE(p.nom, a.titre, 'Dépense') as produit_nom,
       COALESCE(cp.icone, cd.icone, '📦') as produit_icone,
       COALESCE(m.nom, 'Non précisé')      as magasin_nom
     FROM achats a
     LEFT JOIN produits p   ON a.produit_id   = p.id
     LEFT JOIN categories cp ON p.categorie_id = cp.id
     LEFT JOIN categories cd ON a.categorie_id = cd.id
     LEFT JOIN magasins m   ON a.magasin_id   = m.id
     WHERE a.utilisateur_id = ? AND a.mois = ?
     ORDER BY a.date_achat DESC, a.id DESC
     LIMIT 5`,
    [utilisateurId, mois]
  );
}

export function getAllAchats(utilisateurId: number, mois: string): Achat[] {
  return db.getAllSync<Achat>(
    `SELECT
       a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
       COALESCE(a.titre, '') as titre,
       a.prix_unitaire, a.quantite, a.prix_total,
       a.date_achat, a.mois, a.notes,
       COALESCE(p.nom, a.titre, 'Dépense') as produit_nom,
       COALESCE(cp.icone, cd.icone, '📦') as produit_icone,
       COALESCE(m.nom, 'Non précisé')      as magasin_nom
     FROM achats a
     LEFT JOIN produits p   ON a.produit_id   = p.id
     LEFT JOIN categories cp ON p.categorie_id = cp.id
     LEFT JOIN categories cd ON a.categorie_id = cd.id
     LEFT JOIN magasins m   ON a.magasin_id   = m.id
     WHERE a.utilisateur_id = ? AND a.mois = ?
     ORDER BY a.date_achat DESC, a.id DESC`,
    [utilisateurId, mois]
  );
}

export function insertAchat(data: {
  produit_id: number | null;
  utilisateur_id: number;
  magasin_id: number | null;
  categorie_id: number | null;
  titre?: string;
  prix_unitaire: number;
  quantite: number;
  prix_total: number;
  mois: string;
  notes: string;
}): void {
  db.runSync(
    `INSERT INTO achats
       (produit_id, utilisateur_id, magasin_id, categorie_id, titre, prix_unitaire,
        quantite, prix_total, mois, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.produit_id,
      data.utilisateur_id,
      data.magasin_id,
      data.categorie_id,
      data.titre ?? '',
      data.prix_unitaire,
      data.quantite,
      data.prix_total,
      data.mois,
      data.notes,
    ]
  );
}

// ============================================================
// SECTION C — PRODUITS (WHERE created_by = ? OU Globaux)
// ============================================================

export function getAllProduits(userId?: number): Produit[] {
  if (userId) {
    return db.getAllSync<Produit>(
      `SELECT
         p.id, p.nom, p.marque, p.unite,
         p.categorie_id, p.created_by,
         COALESCE(p.photo_uri, '') as photo_uri,
         COALESCE(c.nom, 'Autres') as categorie_nom,
         COALESCE(c.icone, '📦')   as categorie_icone
       FROM produits p
       LEFT JOIN categories c ON p.categorie_id = c.id
       WHERE p.created_by = ?
       ORDER BY p.nom ASC`,
      [userId]
    );
  }

  return db.getAllSync<Produit>(
    `SELECT
       p.id, p.nom, p.marque, p.unite,
       p.categorie_id, p.created_by,
       COALESCE(p.photo_uri, '') as photo_uri,
       COALESCE(c.nom, 'Autres') as categorie_nom,
       COALESCE(c.icone, '📦')   as categorie_icone
     FROM produits p
     LEFT JOIN categories c ON p.categorie_id = c.id
     ORDER BY p.nom ASC`
  );
}

export function getProduitById(id: number): Produit | null {
  return (
    db.getFirstSync<Produit>(
      `SELECT
         p.id, p.nom, p.marque, p.unite,
         p.categorie_id, p.created_by,
         COALESCE(p.photo_uri, '') as photo_uri,
         COALESCE(c.nom, 'Autres') as categorie_nom,
         COALESCE(c.icone, '📦')   as categorie_icone
       FROM produits p
       LEFT JOIN categories c ON p.categorie_id = c.id
       WHERE p.id = ?`,
      [id]
    ) ?? null
  );
}

export function getAchatsByProduit(produitId: number, userId?: number): Achat[] {
  if (userId) {
    return db.getAllSync<Achat>(
      `SELECT
         a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
         COALESCE(a.titre, '') as titre,
         a.prix_unitaire, a.quantite, a.prix_total,
         a.date_achat, a.mois, a.notes,
         COALESCE(p.nom, 'Produit')     as produit_nom,
         COALESCE(c.icone, '📦')        as produit_icone,
         COALESCE(m.nom, 'Non précisé') as magasin_nom
       FROM achats a
       LEFT JOIN produits p   ON a.produit_id   = p.id
       LEFT JOIN categories c ON p.categorie_id = c.id
       LEFT JOIN magasins m   ON a.magasin_id   = m.id
       WHERE a.produit_id = ? AND a.utilisateur_id = ?
       ORDER BY a.date_achat DESC`,
      [produitId, userId]
    );
  }

  return db.getAllSync<Achat>(
    `SELECT
       a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
       COALESCE(a.titre, '') as titre,
       a.prix_unitaire, a.quantite, a.prix_total,
       a.date_achat, a.mois, a.notes,
       COALESCE(p.nom, 'Produit')     as produit_nom,
       COALESCE(c.icone, '📦')        as produit_icone,
       COALESCE(m.nom, 'Non précisé') as magasin_nom
     FROM achats a
     LEFT JOIN produits p   ON a.produit_id   = p.id
     LEFT JOIN categories c ON p.categorie_id = c.id
     LEFT JOIN magasins m   ON a.magasin_id   = m.id
     WHERE a.produit_id = ?
     ORDER BY a.date_achat DESC`,
    [produitId]
  );
}

export function insertProduit(data: {
  nom: string;
  marque: string;
  unite: string;
  categorie_id: number;
  created_by: number;
  photo_uri?: string;
}): number {
  const result = db.runSync(
    `INSERT INTO produits (nom, marque, unite, categorie_id, created_by, photo_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.nom, data.marque, data.unite, data.categorie_id, data.created_by, data.photo_uri ?? '']
  );
  return result.lastInsertRowId;
}

// ============================================================
// SECTION D — CATEGORIES ET MAGASINS
// ============================================================

export function getAllCategories(uniquementVisibles: boolean = true): Categorie[] {
  if (uniquementVisibles) {
    return db.getAllSync<Categorie>(
      `SELECT * FROM categories WHERE est_visible = 1 ORDER BY est_defaut DESC, nom ASC`
    );
  }
  return db.getAllSync<Categorie>(`SELECT * FROM categories ORDER BY nom ASC`);
}

export function getAllMagasins(): Magasin[] {
  return db.getAllSync<Magasin>(`SELECT * FROM magasins ORDER BY nom ASC`);
}

export function reassignerDepensesCategorieVersAutres(ancienneCategorieId: number): void {
  const autresCat = db.getFirstSync<{ id: number }>(
    `SELECT id FROM categories WHERE nom = 'Autres' COLLATE NOCASE`
  );
  if (!autresCat) return;

  // 1. Réassigne les produits
  db.runSync(
    `UPDATE produits SET categorie_id = ? WHERE categorie_id = ?`,
    [autresCat.id, ancienneCategorieId]
  );

  // 2. Réassigne les achats directs
  db.runSync(
    `UPDATE achats SET categorie_id = ? WHERE categorie_id = ?`,
    [autresCat.id, ancienneCategorieId]
  );
}

// ============================================================
// SECTION E — BUDGETS PAR ENVELOPPES
// ============================================================

export function getMonthlyBudget(
  userId: number,
  mois: string
): { id: number; montant_total: number; est_evalue: number } | null {
  return (
    db.getFirstSync<{ id: number; montant_total: number; est_evalue: number }>(
      `SELECT id, montant_total, est_evalue
       FROM monthly_budgets
       WHERE utilisateur_id = ? AND mois = ?`,
      [userId, mois]
    ) ?? null
  );
}

export function saveMonthlyBudget(
  userId: number,
  mois: string,
  total: number,
  enveloppes: { categorie_id: number; montant: number; pourcentage: number }[]
): void {
  // 1. Met à jour la table user
  db.runSync(
    `UPDATE user SET budget_mensuel = ? WHERE id = ?`,
    [total, userId]
  );

  // 2. Insère ou remplace le budget mensuel
  db.runSync(
    `INSERT INTO monthly_budgets (utilisateur_id, mois, montant_total)
     VALUES (?, ?, ?)
     ON CONFLICT(utilisateur_id, mois) DO UPDATE SET montant_total = excluded.montant_total`,
    [userId, mois, total]
  );

  const budget = getMonthlyBudget(userId, mois);
  if (!budget) return;

  // 3. Supprime les anciennes enveloppes de ce mois
  db.runSync(`DELETE FROM category_budgets WHERE monthly_budget_id = ?`, [budget.id]);

  // 4. Réinsère les nouvelles enveloppes
  for (const env of enveloppes) {
    if (env.montant > 0) {
      db.runSync(
        `INSERT INTO category_budgets (monthly_budget_id, categorie_id, montant, pourcentage)
         VALUES (?, ?, ?, ?)`,
        [budget.id, env.categorie_id, env.montant, env.pourcentage]
      );
    }
  }
}

// ------------------------------------------------------------
// getEnveloppesBudget : Calcule la consommation en temps réel de chaque enveloppe
// ------------------------------------------------------------
export function getEnveloppesBudget(userId: number, mois: string): EnveloppeBudget[] {
  const budget = getMonthlyBudget(userId, mois);
  if (!budget) return [];

  // Récupère les enveloppes allouées
  const envelopes = db.getAllSync<{
    categorie_id: number;
    categorie_nom: string;
    categorie_icone: string;
    montant_alloue: number;
    pourcentage_alloue: number;
  }>(
    `SELECT
       cb.categorie_id,
       c.nom   as categorie_nom,
       c.icone as categorie_icone,
       cb.montant     as montant_alloue,
       cb.pourcentage as pourcentage_alloue
     FROM category_budgets cb
     JOIN categories c ON cb.categorie_id = c.id
     WHERE cb.monthly_budget_id = ?
     ORDER BY cb.montant DESC`,
    [budget.id]
  );

  return envelopes.map((env) => {
    // Calcule les dépenses liées à cette catégorie (via le produit ou directes)
    const depenseRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(a.prix_total), 0) as total
       FROM achats a
       LEFT JOIN produits p ON a.produit_id = p.id
       WHERE a.utilisateur_id = ?
         AND a.mois = ?
         AND (p.categorie_id = ? OR a.categorie_id = ?)`,
      [userId, mois, env.categorie_id, env.categorie_id]
    );

    const depense = depenseRow?.total ?? 0;
    const restant = Math.max(0, env.montant_alloue - depense);
    const pctConsomme = env.montant_alloue > 0 ? (depense / env.montant_alloue) * 100 : 0;

    return {
      categorie_id: env.categorie_id,
      categorie_nom: env.categorie_nom,
      categorie_icone: env.categorie_icone,
      montant_alloue: env.montant_alloue,
      montant_depense: depense,
      montant_restant: restant,
      pourcentage_alloue: env.pourcentage_alloue,
      pourcentage_consomme: pctConsomme,
    };
  });
}

// ------------------------------------------------------------
// getNonBudgetedDepenses : Dépenses faites dans des catégories sans enveloppe
// ------------------------------------------------------------
export function getNonBudgetedDepenses(userId: number, mois: string): number {
  const budget = getMonthlyBudget(userId, mois);
  if (!budget) return 0;

  const result = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(a.prix_total), 0) as total
     FROM achats a
     LEFT JOIN produits p ON a.produit_id = p.id
     WHERE a.utilisateur_id = ?
       AND a.mois = ?
       AND COALESCE(p.categorie_id, a.categorie_id) NOT IN (
         SELECT categorie_id FROM category_budgets WHERE monthly_budget_id = ?
       )`,
    [userId, mois, budget.id]
  );

  return result?.total ?? 0;
}

// ------------------------------------------------------------
// canDecreaseBudget : Règle Anti-triche
// Interdit de baisser le budget d'une catégorie sous le montant déjà dépensé
// ------------------------------------------------------------
export function canDecreaseBudget(
  userId: number,
  mois: string,
  categorieId: number,
  nouveauMontant: number
): boolean {
  const depenseRow = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(a.prix_total), 0) as total
     FROM achats a
     LEFT JOIN produits p ON a.produit_id = p.id
     WHERE a.utilisateur_id = ?
       AND a.mois = ?
       AND (p.categorie_id = ? OR a.categorie_id = ?)`,
    [userId, mois, categorieId, categorieId]
  );

  const dejaDepense = depenseRow?.total ?? 0;
  return nouveauMontant >= dejaDepense;
}

// ------------------------------------------------------------
// copyPreviousMonthBudget : Recopie le budget du mois précédent
// ------------------------------------------------------------
export function copyPreviousMonthBudget(userId: number, moisCourant: string): boolean {
  const [annee, mois] = moisCourant.split('-').map(Number);
  const moisPrec = mois === 1 ? 12 : mois - 1;
  const anneePrec = mois === 1 ? annee - 1 : annee;
  const moisPrecedent = `${anneePrec}-${String(moisPrec).padStart(2, '0')}`;

  const ancienBudget = getMonthlyBudget(userId, moisPrecedent);
  if (!ancienBudget) return false;

  const anciennesEnveloppes = db.getAllSync<{
    categorie_id: number;
    montant: number;
    pourcentage: number;
  }>(
    `SELECT categorie_id, montant, pourcentage
     FROM category_budgets
     WHERE monthly_budget_id = ?`,
    [ancienBudget.id]
  );

  saveMonthlyBudget(userId, moisCourant, ancienBudget.montant_total, anciennesEnveloppes);
  return true;
}

// ============================================================
// SECTION F — GAMIFICATION & POINTS
// ============================================================

export function getPointsSettings(): PointsSettings {
  const s = db.getFirstSync<PointsSettings>(`SELECT * FROM reglages_points LIMIT 1`);
  return (
    s ?? {
      points_categorie_respectee: 10,
      points_bonus_mensuel: 50,
      points_bonus_serie: 20,
      seuil_debutant: 0,
      seuil_econome: 100,
      seuil_expert: 300,
    }
  );
}

export function updatePointsSettings(settings: PointsSettings): void {
  db.runSync(
    `UPDATE reglages_points
     SET points_categorie_respectee = ?,
         points_bonus_mensuel = ?,
         points_bonus_serie = ?,
         seuil_debutant = ?,
         seuil_econome = ?,
         seuil_expert = ?`,
    [
      settings.points_categorie_respectee,
      settings.points_bonus_mensuel,
      settings.points_bonus_serie,
      settings.seuil_debutant,
      settings.seuil_econome,
      settings.seuil_expert,
    ]
  );
}

export function getTotalPoints(userId: number): number {
  const result = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(points), 0) as total FROM points_log WHERE utilisateur_id = ?`,
    [userId]
  );
  return result?.total ?? 0;
}

// ------------------------------------------------------------
// evaluerMoisPrecedent : Évaluation automatique au lancement de l'application
// ------------------------------------------------------------
export function evaluerMoisPrecedent(
  userId: number,
  moisCourant: string
): { pointsGagnes: number; evalue: boolean; message: string } {
  const [annee, mois] = moisCourant.split('-').map(Number);
  const moisPrec = mois === 1 ? 12 : mois - 1;
  const anneePrec = mois === 1 ? annee - 1 : annee;
  const moisPrecedent = `${anneePrec}-${String(moisPrec).padStart(2, '0')}`;

  const budget = getMonthlyBudget(userId, moisPrecedent);

  // Si pas de budget défini ou mois déjà évalué -> rien à faire
  if (!budget || budget.est_evalue === 1) {
    return { pointsGagnes: 0, evalue: false, message: '' };
  }

  const settings = getPointsSettings();
  const enveloppes = getEnveloppesBudget(userId, moisPrecedent);

  let points = 0;
  let categoriesReussies = 0;

  for (const env of enveloppes) {
    if (env.montant_depense <= env.montant_alloue) {
      points += settings.points_categorie_respectee;
      categoriesReussies++;
    }
  }

  const grandChelem = categoriesReussies === enveloppes.length && enveloppes.length > 0;
  if (grandChelem) {
    points += settings.points_bonus_mensuel;
  }

  // Enregistre dans le journal des points
  if (points > 0) {
    db.runSync(
      `INSERT INTO points_log (utilisateur_id, mois, raison, points)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        moisPrecedent,
        grandChelem ? 'Mois parfait (Bonus Grand Chelem)' : 'Budgets respectés',
        points,
      ]
    );
  }

  // Marque le mois comme évalué pour ne jamais recommencer
  db.runSync(
    `UPDATE monthly_budgets SET est_evalue = 1 WHERE id = ?`,
    [budget.id]
  );

  return {
    pointsGagnes: points,
    evalue: true,
    message: grandChelem
      ? 'Félicitations ! Vous avez respecté toutes vos enveloppes ce mois-ci !'
      : `Bravo ! Vous avez respecté ${categoriesReussies} enveloppe(s) budgétaire(s).`,
  };
}

// ------------------------------------------------------------
// Gestion des alertes 80% et 100% (jamais répétées dans le même mois)
// ------------------------------------------------------------
export function hasAlerteBeenShown(
  userId: number,
  mois: string,
  categorieId: number,
  seuil: number
): boolean {
  const r = db.getFirstSync<{ id: number }>(
    `SELECT id FROM alertes_log
     WHERE utilisateur_id = ? AND mois = ? AND categorie_id = ? AND seuil = ?`,
    [userId, mois, categorieId, seuil]
  );
  return r !== null;
}

export function logAlerte(
  userId: number,
  mois: string,
  categorieId: number,
  seuil: number
): void {
  db.runSync(
    `INSERT OR IGNORE INTO alertes_log (utilisateur_id, mois, categorie_id, seuil)
     VALUES (?, ?, ?, ?)`,
    [userId, mois, categorieId, seuil]
  );
}

// ============================================================
// SECTION G — SUPERVISION ADMINISTRATEUR (Totaux anonymes UNIQUEMENT)
// ============================================================

export function getAdminGlobalStats(): AdminGlobalStats {
  const usersCount = db.getFirstSync<{ total: number; actifs: number }>(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) as actifs
    FROM user
    WHERE role = 'user'
  `);

  const prodsCount = db.getFirstSync<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM produits`);
  const achatsCount = db.getFirstSync<{ cnt: number; vol: number }>(`
    SELECT COUNT(*) as cnt, COALESCE(SUM(prix_total), 0) as vol FROM achats
  `);

  const topCat = db.getFirstSync<{ nom: string }>(`
    SELECT c.nom
    FROM achats a
    LEFT JOIN produits p ON a.produit_id = p.id
    LEFT JOIN categories c ON COALESCE(p.categorie_id, a.categorie_id) = c.id
    GROUP BY c.id
    ORDER BY COUNT(a.id) DESC
    LIMIT 1
  `);

  return {
    nbUtilisateurs: usersCount?.total ?? 0,
    nbUtilisateursActifs: usersCount?.actifs ?? 0,
    nbProduits: prodsCount?.cnt ?? 0,
    nbAchats: achatsCount?.cnt ?? 0,
    volumeTotalTND: achatsCount?.vol ?? 0,
    topCategorieNom: topCat?.nom ?? 'Non définie',
  };
}

export function getAllUsersAdmin(): Utilisateur[] {
  const rows = db.getAllSync<any>(
    `SELECT id, name as nom, email, password_hash, role, is_active, must_change_password, budget_mensuel, langue, created_at
     FROM user
     ORDER BY role DESC, name ASC`
  );
  return rows.map((row) => ({
    id: row.id,
    nom: row.nom,
    email: row.email,
    password_hash: row.password_hash,
    role: row.role,
    is_active: row.is_active,
    must_change_password: row.must_change_password,
    budget_mensuel: row.budget_mensuel ?? 0,
    langue: row.langue ?? 'fr',
    created_at: row.created_at,
  }));
}

export function addCategoryAdmin(nom: string, icone: string, pct: number, theme: string): number {
  const res = db.runSync(
    `INSERT INTO categories (nom, icone, pourcentage_defaut, est_defaut, est_visible, est_systeme, theme)
     VALUES (?, ?, ?, 0, 1, 0, ?)`,
    [nom.trim(), icone.trim() || '📦', pct, theme.trim() || 'Divers']
  );
  return res.lastInsertRowId;
}

export function updateCategoryAdmin(
  id: number,
  nom: string,
  icone: string,
  pct: number,
  isVisible: boolean
): void {
  db.runSync(
    `UPDATE categories
     SET nom = ?, icone = ?, pourcentage_defaut = ?, est_visible = ?
     WHERE id = ?`,
    [nom.trim(), icone.trim(), pct, isVisible ? 1 : 0, id]
  );
}

export function updateBudget(utilisateurId: number, budget: number): void {
  db.runSync(
    `UPDATE user SET budget_mensuel = ? WHERE id = ?`,
    [budget, utilisateurId]
  );
}

export function updateLangue(utilisateurId: number, langue: string): void {
  db.runSync(
    `UPDATE user SET langue = ? WHERE id = ?`,
    [langue, utilisateurId]
  );
}

export function getDepensesParCategorie(
  utilisateurId: number,
  mois: string
): DepenseParCategorie[] {
  return db.getAllSync<DepenseParCategorie>(
    `SELECT
       COALESCE(c.nom, 'Autres')   as categorie_nom,
       COALESCE(c.icone, '📦')     as categorie_icone,
       SUM(a.prix_total)           as total
     FROM achats a
     LEFT JOIN produits p   ON a.produit_id   = p.id
     LEFT JOIN categories c ON COALESCE(p.categorie_id, a.categorie_id) = c.id
     WHERE a.utilisateur_id = ? AND a.mois = ?
     GROUP BY c.id
     HAVING SUM(a.prix_total) > 0
     ORDER BY total DESC`,
    [utilisateurId, mois]
  );
}
