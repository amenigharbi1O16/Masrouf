// ============================================================
// FICHIER : src/db/queries.ts
// RÔLE    : Contient TOUTES les fonctions qui interagissent avec
//           la base de données SQLite (lecture et écriture).
//           Les écrans n'écrivent jamais de SQL directement.
//           Ils appellent ces fonctions et reçoivent les données.
//
// ORGANISATION :
//   Section A — Authentification (login)
//   Section B — Achats (lecture et écriture)
//   Section C — Produits (lecture et écriture)
//   Section D — Catégories et Magasins (lecture)
//   Section E — Analyses (statistiques)
//   Section F — Administration (gestion des utilisateurs)
//   Section G — Réglages (mise à jour profil)
// ============================================================

// Importe la connexion à la base de données depuis database.ts
// 'db' est l'objet SQLite déjà ouvert — on le réutilise ici
import { db } from './database';

// ============================================================
// TYPES TypeScript
// Définition de la forme des objets retournés par les requêtes.
// Cela aide TypeScript à vérifier les erreurs de frappe.
// ============================================================

// Un utilisateur tel qu'il est stocké en base
export type Utilisateur = {
  id: number;
  nom: string;
  email: string;
  mot_de_passe: string;
  role: 'admin' | 'utilisateur';
  budget_mensuel: number;
  langue: string;
  created_at: string;
};

// Un achat tel qu'il est retourné par les requêtes (avec nom du produit joint)
export type Achat = {
  id: number;
  produit_id: number;
  produit_nom: string;       // vient du JOIN avec la table produits
  produit_icone: string;     // vient du JOIN avec categories via produits
  utilisateur_id: number;
  magasin_id: number;
  magasin_nom: string;       // vient du JOIN avec la table magasins
  prix_unitaire: number;
  quantite: number;
  prix_total: number;
  date_achat: string;
  mois: string;
  notes: string;
};

// Un produit tel qu'il est retourné (avec nom de catégorie joint)
export type Produit = {
  id: number;
  nom: string;
  marque: string;
  unite: string;
  categorie_id: number;
  categorie_nom: string;     // vient du JOIN avec categories
  categorie_icone: string;   // l'emoji de la catégorie
  created_by: number;
};

// Une catégorie
export type Categorie = {
  id: number;
  nom: string;
  icone: string;
};

// Un magasin
export type Magasin = {
  id: number;
  nom: string;
};

// Résultat d'analyse par catégorie (pour l'écran Analyses)
export type DepenseParCategorie = {
  categorie_nom: string;
  categorie_icone: string;
  total: number;
};

// ============================================================
// SECTION A — AUTHENTIFICATION
// ============================================================

// ----------------------------------------------------------------
// getUserByEmailPassword()
// RÔLE : Vérifie les identifiants de connexion.
//        Cherche dans la table 'utilisateurs' un compte avec
//        cet email ET ce mot de passe exact.
//
// Paramètres :
//   email      = adresse email saisie dans le formulaire
//   password   = mot de passe saisi dans le formulaire
//
// Retourne :
//   L'objet Utilisateur si trouvé, ou null si identifiants incorrects
// ----------------------------------------------------------------
export function getUserByEmailPassword(
  email: string,
  password: string
): Utilisateur | null {
  // getFirstSync = exécute le SELECT et retourne la PREMIÈRE ligne trouvée
  // Les ? sont remplacés par les valeurs du tableau (sécurité anti-injection SQL)
  return db.getFirstSync<Utilisateur>(
    `SELECT * FROM utilisateurs WHERE email = ? AND mot_de_passe = ?`,
    [email, password]
  ) ?? null;
  //  ^^ si getFirstSync retourne undefined (aucun résultat), on retourne null
}

// ============================================================
// SECTION B — ACHATS
// ============================================================

// ----------------------------------------------------------------
// getTotalMois()
// RÔLE : Calcule le total dépensé par un utilisateur pendant un mois.
//        Utilisé sur l'écran Accueil pour afficher le solde.
//
// Paramètres :
//   utilisateurId = l'ID de l'utilisateur connecté
//   mois          = format "AAAA-MM" ex: "2026-11" pour novembre 2026
//
// Retourne :
//   Le total en TND (nombre décimal) ou 0 si aucun achat
// ----------------------------------------------------------------
export function getTotalMois(utilisateurId: number, mois: string): number {
  // SUM(prix_total) = SQL qui additionne tous les prix_total filtrés
  // COALESCE(SUM(...), 0) = si SUM retourne NULL (aucun achat), retourne 0
  const result = db.getFirstSync<{ total: number }>(
    `SELECT COALESCE(SUM(prix_total), 0) as total
     FROM achats
     WHERE utilisateur_id = ? AND mois = ?`,
    [utilisateurId, mois]
  );
  // On retourne le champ 'total' ou 0 par sécurité
  return result?.total ?? 0;
}

// ----------------------------------------------------------------
// getTotalMoisPrecedent()
// RÔLE : Calcule le total du mois PRÉCÉDENT pour comparaison.
//        Utilisé sur l'écran Analyses.
//
// Paramètres :
//   utilisateurId = ID de l'utilisateur
//   moisActuel    = ex: "2026-11"
//
// Logique :
//   "2026-11" → on calcule "2026-10"
//   "2026-01" → on calcule "2025-12" (changement d'année)
// ----------------------------------------------------------------
export function getTotalMoisPrecedent(
  utilisateurId: number,
  moisActuel: string
): number {
  // Découpe le mois actuel en année et numéro de mois
  const [annee, mois] = moisActuel.split('-').map(Number);
  //                                              ^^ .map(Number) convertit strings → numbers

  // Calcule l'année et le mois précédent
  let moisPrec: number;
  let anneePrec: number;

  if (mois === 1) {
    // Si on est en janvier → le mois précédent est décembre de l'année d'avant
    moisPrec = 12;
    anneePrec = annee - 1;
  } else {
    // Sinon, simplement le mois - 1
    moisPrec = mois - 1;
    anneePrec = annee;
  }

  // Reconstruit la chaîne "AAAA-MM" avec padding (ex: 9 → "09")
  const moisPrecedent = `${anneePrec}-${String(moisPrec).padStart(2, '0')}`;
  //                                                      ^^ padStart = ajoute un 0 devant si < 10

  // Réutilise la même fonction de calcul avec le mois précédent
  return getTotalMois(utilisateurId, moisPrecedent);
}

// ----------------------------------------------------------------
// getRecentAchats()
// RÔLE : Retourne les 5 derniers achats d'un utilisateur.
//        Affichés sur l'écran Accueil dans "Dépenses récentes".
//
// Paramètres :
//   utilisateurId = ID de l'utilisateur
//   mois          = mois en cours (ex: "2026-11")
//
// Retourne :
//   Tableau de 5 achats maximum, avec nom du produit et du magasin
// ----------------------------------------------------------------
export function getRecentAchats(
  utilisateurId: number,
  mois: string
): Achat[] {
  // JOIN = réunit plusieurs tables en une seule requête
  //   JOIN produits p ON a.produit_id = p.id
  //     → pour chaque achat, récupère le nom du produit lié
  //   JOIN categories c ON p.categorie_id = c.id
  //     → pour chaque produit, récupère l'icône de sa catégorie
  //   LEFT JOIN magasins m ON a.magasin_id = m.id
  //     → "LEFT" = inclut les achats même si magasin_id est NULL
  //
  // ORDER BY date_achat DESC = trie du plus récent au plus ancien
  // LIMIT 5 = retourne au maximum 5 résultats
  return db.getAllSync<Achat>(
    `SELECT
       a.id, a.produit_id, a.utilisateur_id, a.magasin_id,
       a.prix_unitaire, a.quantite, a.prix_total,
       a.date_achat, a.mois, a.notes,
       p.nom         as produit_nom,
       c.icone       as produit_icone,
       COALESCE(m.nom, 'Non précisé') as magasin_nom
     FROM achats a
     JOIN produits p    ON a.produit_id    = p.id
     JOIN categories c  ON p.categorie_id  = c.id
     LEFT JOIN magasins m ON a.magasin_id  = m.id
     WHERE a.utilisateur_id = ? AND a.mois = ?
     ORDER BY a.date_achat DESC
     LIMIT 5`,
    [utilisateurId, mois]
  );
}

// ----------------------------------------------------------------
// getAllAchats()
// RÔLE : Retourne TOUS les achats d'un utilisateur pour un mois.
//        Utilisé sur l'écran Admin pour voir les dépenses globales.
// ----------------------------------------------------------------
export function getAllAchats(utilisateurId: number, mois: string): Achat[] {
  return db.getAllSync<Achat>(
    `SELECT
       a.id, a.produit_id, a.utilisateur_id, a.magasin_id,
       a.prix_unitaire, a.quantite, a.prix_total,
       a.date_achat, a.mois, a.notes,
       p.nom         as produit_nom,
       c.icone       as produit_icone,
       COALESCE(m.nom, 'Non précisé') as magasin_nom
     FROM achats a
     JOIN produits p    ON a.produit_id    = p.id
     JOIN categories c  ON p.categorie_id  = c.id
     LEFT JOIN magasins m ON a.magasin_id  = m.id
     WHERE a.utilisateur_id = ? AND a.mois = ?
     ORDER BY a.date_achat DESC`,
    [utilisateurId, mois]
  );
}

// ----------------------------------------------------------------
// insertAchat()
// RÔLE : Enregistre un nouvel achat dans la base de données.
//        Appelé quand l'utilisateur soumet le formulaire "Nouvel Achat".
//
// Paramètre : objet contenant toutes les données de l'achat
// ----------------------------------------------------------------
export function insertAchat(data: {
  produit_id: number;
  utilisateur_id: number;
  magasin_id: number | null;
  prix_unitaire: number;
  quantite: number;
  prix_total: number;
  mois: string;
  notes: string;
}): void {
  // runSync = exécute un INSERT/UPDATE/DELETE (modification de données)
  // Les ? sont remplacés dans l'ordre par les valeurs du tableau
  db.runSync(
    `INSERT INTO achats
       (produit_id, utilisateur_id, magasin_id, prix_unitaire,
        quantite, prix_total, mois, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.produit_id,
      data.utilisateur_id,
      data.magasin_id,
      data.prix_unitaire,
      data.quantite,
      data.prix_total,
      data.mois,
      data.notes,
    ]
  );
}

// ============================================================
// SECTION C — PRODUITS
// ============================================================

// ----------------------------------------------------------------
// getAllProduits()
// RÔLE : Retourne tous les produits du catalogue avec leur catégorie.
//        Affiché sur l'écran Produits.
// ----------------------------------------------------------------
export function getAllProduits(): Produit[] {
  return db.getAllSync<Produit>(
    `SELECT
       p.id, p.nom, p.marque, p.unite,
       p.categorie_id, p.created_by,
       c.nom   as categorie_nom,
       c.icone as categorie_icone
     FROM produits p
     JOIN categories c ON p.categorie_id = c.id
     ORDER BY p.nom ASC`
    // ORDER BY p.nom ASC = trie par nom alphabétique (A → Z)
  );
}

// ----------------------------------------------------------------
// getProduitById()
// RÔLE : Retourne un seul produit par son ID.
//        Utilisé sur l'écran de Fiche Produit (/produit/[id]).
// ----------------------------------------------------------------
export function getProduitById(id: number): Produit | null {
  return db.getFirstSync<Produit>(
    `SELECT
       p.id, p.nom, p.marque, p.unite,
       p.categorie_id, p.created_by,
       c.nom   as categorie_nom,
       c.icone as categorie_icone
     FROM produits p
     JOIN categories c ON p.categorie_id = c.id
     WHERE p.id = ?`,
    [id]
  ) ?? null;
}

// ----------------------------------------------------------------
// getAchatsByProduit()
// RÔLE : Retourne tous les achats d'un produit spécifique.
//        Utilisé sur la Fiche Produit pour l'historique des prix.
//
// Retourne les achats triés du plus récent au plus ancien.
// ----------------------------------------------------------------
export function getAchatsByProduit(produitId: number): Achat[] {
  return db.getAllSync<Achat>(
    `SELECT
       a.id, a.produit_id, a.utilisateur_id, a.magasin_id,
       a.prix_unitaire, a.quantite, a.prix_total,
       a.date_achat, a.mois, a.notes,
       p.nom         as produit_nom,
       c.icone       as produit_icone,
       COALESCE(m.nom, 'Non précisé') as magasin_nom
     FROM achats a
     JOIN produits p    ON a.produit_id    = p.id
     JOIN categories c  ON p.categorie_id  = c.id
     LEFT JOIN magasins m ON a.magasin_id  = m.id
     WHERE a.produit_id = ?
     ORDER BY a.date_achat DESC`,
    [produitId]
  );
}

// ----------------------------------------------------------------
// insertProduit()
// RÔLE : Crée un nouveau produit dans la base de données.
//        Appelé quand le formulaire "Nouveau Produit" est soumis.
//
// Retourne : l'ID du nouveau produit inséré (utile pour y naviguer)
// ----------------------------------------------------------------
export function insertProduit(data: {
  nom: string;
  marque: string;
  unite: string;
  categorie_id: number;
  created_by: number;
}): number {
  // runSync retourne un objet avec 'lastInsertRowId' = l'ID auto-généré
  const result = db.runSync(
    `INSERT INTO produits (nom, marque, unite, categorie_id, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [data.nom, data.marque, data.unite, data.categorie_id, data.created_by]
  );
  // lastInsertRowId = l'ID attribué automatiquement par SQLite (AUTOINCREMENT)
  return result.lastInsertRowId;
}

// ============================================================
// SECTION D — CATÉGORIES ET MAGASINS (Données de référence)
// ============================================================

// ----------------------------------------------------------------
// getAllCategories()
// RÔLE : Retourne toutes les catégories disponibles.
//        Utilisé dans les listes déroulantes des formulaires.
// ----------------------------------------------------------------
export function getAllCategories(): Categorie[] {
  // Tri par nom pour un affichage alphabétique dans les listes
  return db.getAllSync<Categorie>(`SELECT * FROM categories ORDER BY nom ASC`);
}

// ----------------------------------------------------------------
// getAllMagasins()
// RÔLE : Retourne tous les magasins disponibles.
//        Utilisé dans la liste déroulante du formulaire Achat.
// ----------------------------------------------------------------
export function getAllMagasins(): Magasin[] {
  return db.getAllSync<Magasin>(`SELECT * FROM magasins ORDER BY nom ASC`);
}

// ============================================================
// SECTION E — ANALYSES (Statistiques et graphiques)
// ============================================================

// ----------------------------------------------------------------
// getDepensesParCategorie()
// RÔLE : Calcule le total dépensé par catégorie pour un mois.
//        Utilisé sur l'écran Analyses pour les barres de dépenses.
//
// Retourne un tableau trié du plus dépensé au moins dépensé.
// ----------------------------------------------------------------
export function getDepensesParCategorie(
  utilisateurId: number,
  mois: string
): DepenseParCategorie[] {
  // GROUP BY c.id = regroupe tous les achats par catégorie
  // SUM(a.prix_total) = additionne les prix de chaque groupe
  // HAVING SUM(...) > 0 = exclut les catégories sans dépenses
  // ORDER BY total DESC = du plus dépensé au moins dépensé
  return db.getAllSync<DepenseParCategorie>(
    `SELECT
       c.nom   as categorie_nom,
       c.icone as categorie_icone,
       SUM(a.prix_total) as total
     FROM achats a
     JOIN produits p   ON a.produit_id    = p.id
     JOIN categories c ON p.categorie_id  = c.id
     WHERE a.utilisateur_id = ? AND a.mois = ?
     GROUP BY c.id
     HAVING SUM(a.prix_total) > 0
     ORDER BY total DESC`,
    [utilisateurId, mois]
  );
}

// ============================================================
// SECTION F — ADMINISTRATION
// ============================================================

// ----------------------------------------------------------------
// getAllUtilisateurs()
// RÔLE : Retourne tous les comptes utilisateurs.
//        Réservé à l'admin sur l'écran Admin > Utilisateurs.
// ----------------------------------------------------------------
export function getAllUtilisateurs(): Utilisateur[] {
  // On n'exporte pas les mots de passe (bonne pratique)
  // mais pour ce projet scolaire on retourne tout
  return db.getAllSync<Utilisateur>(
    `SELECT * FROM utilisateurs ORDER BY role DESC, nom ASC`
    // ORDER BY role DESC = les admins apparaissent en premier ('utilisateur' < 'admin' alphabétiquement DESC)
  );
}

// ============================================================
// SECTION G — RÉGLAGES (Mise à jour du profil)
// ============================================================

// ----------------------------------------------------------------
// updateBudget()
// RÔLE : Modifie le budget mensuel d'un utilisateur.
//        Appelé depuis l'écran Réglages.
// ----------------------------------------------------------------
export function updateBudget(utilisateurId: number, budget: number): void {
  // UPDATE = modifie des lignes existantes
  // SET budget_mensuel = ? → remplace la valeur
  // WHERE id = ? → sur la ligne de cet utilisateur uniquement
  db.runSync(
    `UPDATE utilisateurs SET budget_mensuel = ? WHERE id = ?`,
    [budget, utilisateurId]
  );
}

// ----------------------------------------------------------------
// updateLangue()
// RÔLE : Change la langue préférée d'un utilisateur.
//        Appelé depuis l'écran Réglages quand on choisit FR ou AR.
// ----------------------------------------------------------------
export function updateLangue(utilisateurId: number, langue: string): void {
  db.runSync(
    `UPDATE utilisateurs SET langue = ? WHERE id = ?`,
    [langue, utilisateurId]
  );
}

