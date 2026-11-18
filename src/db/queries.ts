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
  /** Nom complet de l'utilisateur affiché sur son profil et le tableau de bord */
  nom: string;
  /** Adresse électronique unique servant d'identifiant de connexion */
  email: string;
  /** Empreinte cryptographique salée du mot de passe (format sel:haché) */
  password_hash: string;
  /** Sel cryptographique individuel pour le salage SHA-256 */
  salt: string;
  /** Rôle de l'utilisateur : privilèges d'administration ('admin') ou usage standard ('user') */
  role: 'admin' | 'user';
  /** Statut d'activation : 1 = compte autorisé, 0 = suspendu par l'administrateur */
  is_active: number;
  /** Drapeau imposant le renouvellement du mot de passe à la prochaine connexion */
  must_change_password: number;
  /** Indicateur d'achèvement de l'assistant de premier démarrage (1 = terminé) */
  onboarding_done: number;
  /** Version de l'algorithme de hachage utilisée */
  hash_version: number;
  /** Montant indicatif du budget mensuel de référence en Dinars Tunisiens */
  budget_mensuel: number;
  /** Préférence de langue d'interface persistée ('fr', 'ar', 'en') */
  langue: string;
  created_at: string;
};

export type Categorie = {
  id: number;
  nom: string;
  type: 'product' | 'expense';
  /** Nom de l'icône vectorielle Ionicons représentant la catégorie */
  icone: string;
  /** Pourcentage recommandé par défaut pour la répartition budgétaire */
  pourcentage_defaut: number;
  /** Vaut 1 si la catégorie fait partie de la sélection recommandée de départ */
  est_defaut: number;
  /** Visibilité de la catégorie : 1 = active, 0 = archivée/masquée */
  est_visible: number;
  /** Vaut 1 pour les catégories protégées ne pouvant être supprimées */
  est_systeme: number;
  /** Thématique de regroupement (ex: "Essentiel", "Logement", "Personnel") */
  theme: string;
};

export type Produit = {
  id: number;
  nom: string;
  /** Marque ou fabricant du produit commercial */
  marque: string;
  /** Unité de mesure physique normalisée (ex: "kg", "L", "pièce") */
  unite: string;
  categorie_id: number;
  /** Libellé traduit de la catégorie de rattachement */
  categorie_nom: string;
  /** Icône vectorielle de la catégorie associée */
  categorie_icone: string;
  /** Identifiant de l'utilisateur ayant créé cet enregistrement */
  created_by: number;
  /** Chemin du fichier local de la photo du produit */
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
  produit_photo?: string | null;
  utilisateur_id: number;
  magasin_id: number | null;
  magasin_nom: string;
  categorie_id: number | null;
  titre: string;
  /** Prix calculé par unité de mesure (prix_total / quantite) */
  prix_unitaire: number;
  /** Quantité achetée selon l'unité de mesure */
  quantite: number;
  /** Montant total payé en Dinars Tunisiens (DT) */
  prix_total: number;
  /** Date calendaire de l'achat au format ISO YYYY-MM-DD */
  date_achat: string;
  mois: string;
  notes: string;
};

export type EnveloppeBudget = {
  categorie_id: number;
  /** Libellé traduit de la catégorie de rattachement */
  categorie_nom: string;
  /** Icône vectorielle de la catégorie associée */
  categorie_icone: string;
  /** Montant financier alloué à cette enveloppe budgétaire en DT */
  montant_alloue: number;
  /** Somme cumulée des dépenses engagées pour cette catégorie sur la période */
  montant_depense: number;
  /** Solde restant disponible dans l'enveloppe (ou déficit si négatif) */
  montant_restant: number;
  /** Part en pourcentage de l'enveloppe par rapport au budget global */
  pourcentage_alloue: number;
  /** Taux de consommation réel de l'enveloppe (dépensé / alloué) en % */
  pourcentage_consomme: number;
};

export type PointsSettings = {
  /** Points attribués pour chaque période budgétaire réussie sans dépassement */
  points_per_period: number;
  /** Points bonus accordés lors de séries consécutives de mois réussis */
  points_streak_bonus: number;
  /** Nombre de périodes successives requises pour débloquer le bonus de régularité */
  streak_length: number;
  /** Seuil de points minimum pour le badge Débutant */
  seuil_debutant: number;
  /** Seuil de points requis pour atteindre le niveau Économe */
  seuil_econome: number;
  /** Seuil de points requis pour décrocher le niveau Expert */
  seuil_expert: number;
  green_until: number;
  orange_from: number;
  red_from: number;
};

export type AdminGlobalStats = {
  /** Nombre total de comptes inscrits dans le système */
  nbUtilisateurs: number;
  /** Nombre d'utilisateurs dont le compte est actif */
  nbUtilisateursActifs: number;
  /** Nombre de comptes suspendus par l'administration */
  nbSuspendus: number;
  /** Nombre de catégories de type "produit" disponibles */
  nbCategoriesProduit: number;
  /** Nombre de catégories de type "dépense" disponibles */
  nbCategoriesDepense: number;
};

/** Vue admin d'un compte : jamais de budget ni de hash. */
export type CompteAdmin = {
  id: number;
  nom: string;
  /** Adresse électronique unique servant d'identifiant de connexion */
  email: string;
  /** Rôle de l'utilisateur : privilèges d'administration ('admin') ou usage standard ('user') */
  role: 'admin' | 'user';
  /** Statut d'activation : 1 = compte autorisé, 0 = suspendu par l'administrateur */
  is_active: number;
  /** Drapeau imposant le renouvellement du mot de passe à la prochaine connexion */
  must_change_password: number;
  created_at: string;
};

export type DepenseParCategorie = {
  categorie_nom: string;
  /** Icône vectorielle de la catégorie associée */
  categorie_icone: string;
  total: number;
};

// ============================================================
// SECTION A — AUTHENTIFICATION & UTILISATEURS
// ============================================================

/**
 * MISSION DE LA FONCTION : getUserByEmail
 *   Recherche et renvoie la fiche utilisateur complète correspondant à une adresse email.
 *   Utilise `COLLATE NOCASE` pour être insensible à la casse (ex: "Admin@Masrouf.tn" = "admin@masrouf.tn").
 *
 * RÔLE DANS L'APPLICATION :
 *   Appelée lors de la connexion sur l'écran `login.tsx` pour vérifier l'existence du compte
 *   et comparer le mot de passe haché.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Si l'utilisateur est trouvé et valide, redirige vers le tableau de bord ou l'espace admin.
 *   Si le compte est introuvable ou suspendu, affiche un message d'erreur rouge sous les champs.
 */
export function getUserByEmail(email: string): Utilisateur | null {
  const row = db.getFirstSync<any>(
    `SELECT id, name as nom, email, password_hash, salt, role, is_active, must_change_password, onboarding_done, hash_version, budget_mensuel, langue, created_at
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
    salt: row.salt ?? '',
    role: row.role,
    is_active: row.is_active,
    must_change_password: row.must_change_password,
    onboarding_done: row.onboarding_done ?? 0,
    hash_version: row.hash_version ?? 1,
    budget_mensuel: row.budget_mensuel ?? 0,
    langue: row.langue ?? 'fr',
    created_at: row.created_at,
  };
}

/**
 * MISSION DE LA FONCTION : getUserById
 *   Charge le profil d'un utilisateur d'après sa clé primaire numérique `id`.
 *
 * RÔLE DANS L'APPLICATION :
 *   Utilisée par le contexte d'authentification `AuthProvider` pour recharger les informations
 *   de session (budget mensuel, langue, statut actif) sans stocker de mot de passe en mémoire vive.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Alimente le nom du profil dans le tiroir latéral, la langue active et le montant du budget.
 */
export function getUserById(id: number): Utilisateur | null {
  const row = db.getFirstSync<any>(
    `SELECT id, name as nom, email, password_hash, salt, role, is_active, must_change_password, onboarding_done, hash_version, budget_mensuel, langue, created_at
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
    salt: row.salt ?? '',
    role: row.role,
    is_active: row.is_active,
    must_change_password: row.must_change_password,
    onboarding_done: row.onboarding_done ?? 0,
    hash_version: row.hash_version ?? 1,
    budget_mensuel: row.budget_mensuel ?? 0,
    langue: row.langue ?? 'fr',
    created_at: row.created_at,
  };
}

/**
 * MISSION DE LA FONCTION : registerUser
 *   Insère un nouveau compte utilisateur dans la table `user` avec son sel de chiffrement et son hash SHA-256.
 *   Le rôle est obligatoirement défini à 'user' et `onboarding_done` à 0.
 *
 * RÔLE DANS L'APPLICATION :
 *   Exécutée lors de la validation du formulaire de création de compte sur l'écran `inscription.tsx`.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Redirige l'utilisateur nouvellement inscrit vers l'assistant de premier démarrage (`onboarding.tsx`).
 */
export function registerUser(
  nom: string,
  email: string,
  passwordHash: string,
  salt: string = '',
  hashVersion: number = 1
): number {
  const result = db.runSync(
    `INSERT INTO user (name, email, password_hash, salt, role, is_active, must_change_password, onboarding_done, hash_version, budget_mensuel, langue)
     VALUES (?, ?, ?, ?, 'user', 1, 0, 0, ?, 0, 'fr')`,
    [nom.trim(), email.trim().toLowerCase(), passwordHash, salt, hashVersion]
  );
  return result.lastInsertRowId;
}

/**
 * MISSION DE LA FONCTION : updateUserOnboarding
 *   Bascule l'indicateur `onboarding_done` à 1 (ou 0) pour un utilisateur.
 *
 * RÔLE DANS L'APPLICATION :
 *   Appelée à la fin de l'étape 3 de l'onboarding pour confirmer que l'utilisateur
 *   a sélectionné ses catégories et peut désormais accéder directement au tableau de bord.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Déverrouille l'accès permanent aux onglets principaux de Masrouf (`/(tabs)/`).
 */
export function updateUserOnboarding(userId: number, done: boolean = true): void {
  db.runSync(
    `UPDATE user SET onboarding_done = ? WHERE id = ?`,
    [done ? 1 : 0, userId]
  );
}

/**
 * MISSION DE LA FONCTION : updateUserPasswordAndVersion
 *   Met à jour le mot de passe chiffré, le sel, la version de hash et réinitialise `must_change_password` à 0.
 *
 * RÔLE DANS L'APPLICATION :
 *   Appelée lorsqu'un utilisateur ou un administrateur remplace son mot de passe provisoire
 *   sur l'écran `changer-mot-de-passe.tsx`.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Affiche une bannière de succès verte et redirige vers le tableau de bord de l'application.
 */
export function updateUserPasswordAndVersion(
  userId: number,
  newPasswordHash: string,
  newSalt: string,
  newVersion: number = 2
): void {
  db.runSync(
    `UPDATE user
     SET password_hash = ?,
         salt = ?,
         hash_version = ?,
         must_change_password = 0
     WHERE id = ?`,
    [newPasswordHash, newSalt, newVersion, userId]
  );
}

/**
 * MISSION DE LA FONCTION : getUserCategories
 *   Récupère la liste des identifiants des catégories activées par un utilisateur dans la table `user_category`.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet d'afficher uniquement les enveloppes budgétaires que la personne a choisies de suivre.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Coche les tuiles correspondantes dans l'écran `gerer-categories.tsx` et affiche les cartes
 *   de catégories sélectionnées sur la page d'accueil.
 */
export function getUserCategories(userId: number): number[] {
  const rows = db.getAllSync<{ category_id: number }>(
    `SELECT category_id FROM user_category WHERE user_id = ? AND enabled = 1`,
    [userId]
  );
  return rows.map((r) => r.category_id);
}

/**
 * MISSION DE LA FONCTION : setUserCategories
 *   Remplace l'ensemble des catégories sélectionnées d'un utilisateur par une nouvelle liste d'IDs.
 *
 * RÔLE DANS L'APPLICATION :
 *   Sauvegarde les choix de l'utilisateur lors de l'onboarding et de la modification dans `gerer-categories.tsx`.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Met à jour instantanément la liste des cartes de dépenses sur le tableau de bord.
 */
export function setUserCategories(userId: number, categoryIds: number[]): void {
  db.runSync(`DELETE FROM user_category WHERE user_id = ?`, [userId]);
  for (const catId of categoryIds) {
    db.runSync(
      `INSERT INTO user_category (user_id, category_id, enabled) VALUES (?, ?, 1)`,
      [userId, catId]
    );
  }
}

/**
 * MISSION DE LA FONCTION : updateUserPassword
 *   Modifie le hash du mot de passe et réinitialise le drapeau `must_change_password`.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet à un utilisateur de modifier son mot de passe depuis ses réglages de profil.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Affiche une alerte de confirmation indiquant que le nouveau mot de passe est enregistré.
 */
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

/**
 * MISSION DE LA FONCTION : verifierPrivilegeAdmin
 *   Contrôle de sécurité strict vérifiant que l'utilisateur connecté possède le rôle 'admin' et est actif.
 *
 * RÔLE DANS L'APPLICATION :
 *   Protège toutes les opérations sensibles d'administration (gestion des utilisateurs,
 *   barèmes de points, réinitialisation de mots de passe, suppression de comptes).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Si l'accès est refusé, lève une exception empêchant toute exécution non autorisée.
 */
export function verifierPrivilegeAdmin(adminUserId?: number): void {
  if (adminUserId !== undefined && adminUserId !== null) {
    const admin = getUserById(adminUserId);
    if (!admin || admin.role !== 'admin' || admin.is_active !== 1) {
      throw new Error(`Accès refusé : l'utilisateur ID ${adminUserId} n'est pas un administrateur actif.`);
    }
    return;
  }
  // Si adminUserId n'est pas spécifié, on s'assure qu'au moins 1 admin actif existe
  const nbAdmins = countActiveAdmins();
  if (nbAdmins === 0) {
    throw new Error('Accès refusé : aucun administrateur actif configuré.');
  }
}

/**
 * MISSION DE LA FONCTION : updateUserActiveStatus
 *   Active (1) ou suspend (0) un compte utilisateur, avec interdiction d'auto-suspension
 *   et protection garantissant qu'au moins un administrateur reste actif.
 *
 * RÔLE DANS L'APPLICATION :
 *   Utilisée par l'administrateur depuis le panneau de gestion des utilisateurs (`utilisateurs.tsx`).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Change le badge d'état (vert "Actif" ou gris "Suspendu") dans le tableau de l'administrateur.
 */
export function updateUserActiveStatus(
  userId: number,
  isActive: boolean,
  adminUserId?: number
): void {
  verifierPrivilegeAdmin(adminUserId);
  if (adminUserId != null && userId === adminUserId && !isActive) {
    throw new Error('Un administrateur ne peut pas se suspendre lui-même.');
  }
  const cible = getUserById(userId);
  if (cible?.role === 'admin' && !isActive && countActiveAdmins() <= 1) {
    throw new Error('Il doit rester au moins un administrateur actif.');
  }
  db.runSync(
    `UPDATE user SET is_active = ? WHERE id = ?`,
    [isActive ? 1 : 0, userId]
  );
}

/**
 * MISSION DE LA FONCTION : resetUserPassword
 *   Génère un mot de passe temporaire pour un utilisateur et force `must_change_password = 1`.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet à l'administrateur de dépanner un utilisateur ayant oublié ses identifiants.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Affiche le mot de passe temporaire à l'administrateur sur l'écran `mot-de-passe-temporaire.tsx`.
 *   Dès la prochaine connexion de cet utilisateur, l'écran `changer-mot-de-passe.tsx` s'ouvrira obligatoirement.
 */
export function resetUserPassword(
  userId: number,
  tempPasswordHash: string,
  adminUserId?: number
): void {
  verifierPrivilegeAdmin(adminUserId);
  db.runSync(
    `UPDATE user
     SET password_hash = ?,
         must_change_password = 1
     WHERE id = ?`,
    [tempPasswordHash, userId]
  );
}

/**
 * MISSION DE LA FONCTION : deleteUserAndData
 *   Supprime un compte utilisateur et l'ensemble de ses données rattachées en cascade.
 *
 * RÔLE DANS L'APPLICATION :
 *   Réservée à l'administrateur avec vérification de sécurité (impossible de supprimer le dernier admin).
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Supprime la ligne de l'utilisateur du tableau récapitulatif de l'écran admin.
 */
export function deleteUserAndData(userId: number, adminUserId?: number): void {
  verifierPrivilegeAdmin(adminUserId);
  if (adminUserId != null && userId === adminUserId) {
    throw new Error('Un administrateur ne peut pas supprimer son propre compte.');
  }
  const cible = getUserById(userId);
  if (cible?.role === 'admin' && cible.is_active === 1 && countActiveAdmins() <= 1) {
    throw new Error('Il doit rester au moins un administrateur actif.');
  }
  db.runSync(`DELETE FROM user WHERE id = ?`, [userId]);
}

/**
 * MISSION DE LA FONCTION : countActiveAdmins
 *   Compte le nombre total d'administrateurs actuellement actifs dans la base.
 *
 * RÔLE DANS L'APPLICATION :
 *   Utilisée par les sécurités pour garantir que le système ne se retrouve jamais orphelin.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Aucun affichage direct : utilisé pour valider les boutons de suspension ou suppression.
 */
export function countActiveAdmins(): number {
  const result = db.getFirstSync<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM user WHERE role = 'admin' AND is_active = 1`
  );
  return result?.cnt ?? 0;
}

  // ============================================================
  // SECTION B — DEPENSES ET ACHATS PERSONNELS (WHERE utilisateur_id = ?)
  // ============================================================

  /**
   * MISSION DE LA FONCTION : getTotalMois
   *   Calcule la somme totale exacte dépensée par un utilisateur pour un mois donné ('YYYY-MM').
   *
   * RÔLE DANS L'APPLICATION :
   *   Utilisée pour alimenter les compteurs de dépenses totales du tableau de bord.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Le montant affiché en gros caractères en haut du tableau de bord (ex: "854,250 DT").
   */
  export function getTotalMois(utilisateurId: number, mois: string): number {
    const result = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(prix_total), 0) as total
     FROM achats
     WHERE utilisateur_id = ? AND mois = ?`,
      [utilisateurId, mois]
    );
    return result?.total ?? 0;
  }

  /**
   * MISSION DE LA FONCTION : getTotalMoisPrecedent
   *   Détermine le mois civil précédent et appelle `getTotalMois` pour en calculer la somme.
   *
   * RÔLE DANS L'APPLICATION :
   *   Sert au calcul de l'évolution des dépenses mois par mois pour la comparaison budgétaire.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Alimente la mention d'évolution comparative (ex: "+12% par rapport au mois dernier").
   */
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

  /**
   * MISSION DE LA FONCTION : getRecentAchats
   *   Récupère les 5 dépenses les plus récentes de l'utilisateur pour le mois en cours.
   *
   * RÔLE DANS L'APPLICATION :
   *   Fournit les données de l'encart "Dernières dépenses" sur la page d'accueil.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Une liste de 5 cartes compactes blanches avec icône de catégorie, titre, magasin et montant en DT.
   */
  export function getRecentAchats(utilisateurId: number, mois: string): Achat[] {
    return db.getAllSync<Achat>(
      `SELECT
       a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
       COALESCE(a.titre, '') as titre,
       a.prix_unitaire, a.quantite, a.prix_total,
       a.date_achat, a.mois, a.notes,
       COALESCE(p.nom, a.titre, 'Dépense') as produit_nom,
       COALESCE(cp.icone, cd.icone, 'cart-outline') as produit_icone,
       (SELECT photo_path FROM product WHERE id = a.produit_id) as produit_photo,
       COALESCE(m.nom, a.magasin_nom, 'Non précisé') as magasin_nom
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

  /**
   * MISSION DE LA FONCTION : getAllAchats
   *   Récupère l'intégralité des dépenses et achats de l'utilisateur pour un mois donné,
   *   triés du plus récent au plus ancien.
   *
   * RÔLE DANS L'APPLICATION :
   *   Alimente la liste complète de l'historique sur l'écran calendrier ou l'écran récapitulatif.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   La liste déroulante complète de tous les tickets de caisse et dépenses directes du mois.
   */
  export function getAllAchats(utilisateurId: number, mois: string): Achat[] {
    return db.getAllSync<Achat>(
      `SELECT
       a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
       COALESCE(a.titre, '') as titre,
       a.prix_unitaire, a.quantite, a.prix_total,
       a.date_achat, a.mois, a.notes,
       COALESCE(p.nom, a.titre, 'Dépense') as produit_nom,
       COALESCE(cp.icone, cd.icone, 'cart-outline') as produit_icone,
       (SELECT photo_path FROM product WHERE id = a.produit_id) as produit_photo,
       COALESCE(m.nom, a.magasin_nom, 'Non précisé') as magasin_nom
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

  /**
   * MISSION DE LA FONCTION : insertAchat
   *   Insère un nouvel achat ou une dépense directe via la vue `achats` (qui déclenche `trg_achats_insert`).
   *
   * RÔLE DANS L'APPLICATION :
   *   Enregistre les formulaires soumis depuis `nouvel-achat.tsx` et `nouvelle-depense.tsx`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Après enregistrement, ferme le formulaire et rafraîchit immédiatement l'accueil et le solde restant.
   */
  export function insertAchat(data: {
    produit_id: number | null;
    utilisateur_id: number;
    magasin_id: number | null;
    categorie_id: number | null;
    titre?: string;
  /** Prix calculé par unité de mesure (prix_total / quantite) */
    prix_unitaire: number;
  /** Quantité achetée selon l'unité de mesure */
    quantite: number;
  /** Montant total payé en Dinars Tunisiens (DT) */
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

  /**
   * MISSION DE LA FONCTION : getAllProduits
   *   Récupère tous les articles de consommation créés par l'utilisateur (ou tous les produits si aucun filtre).
   *
   * RÔLE DANS L'APPLICATION :
   *   Alimente la liste du catalogue d'articles sur l'écran `produits.tsx`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Grille ou liste de cartes blanches avec photo de l'article, marque, unité et nom de catégorie.
   */
  export function getAllProduits(userId?: number): Produit[] {
    if (userId) {
      return db.getAllSync<Produit>(
        `SELECT
         p.id, p.nom, p.marque, p.unite,
         p.categorie_id, p.created_by,
         COALESCE(p.photo_uri, '') as photo_uri,
         COALESCE(c.nom, 'Autres') as categorie_nom,
         COALESCE(c.icone, 'cart-outline')   as categorie_icone
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
       COALESCE(c.icone, 'cart-outline')   as categorie_icone
     FROM produits p
     LEFT JOIN categories c ON p.categorie_id = c.id
     ORDER BY p.nom ASC`
    );
  }

  /**
   * MISSION DE LA FONCTION : getProduitById
   *   Extrait la fiche détaillée d'un produit d'après son identifiant unique.
   *
   * RÔLE DANS L'APPLICATION :
   *   Utilisée par la page de détail produit `produit/[id].tsx` et le formulaire d'édition.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   La photo plein écran, le nom, la marque, l'unité de mesure et le comparateur de prix.
   */
  export function getProduitById(id: number): Produit | null {
    return (
      db.getFirstSync<Produit>(
        `SELECT
         p.id, p.nom, p.marque, p.unite,
         p.categorie_id, p.created_by,
         COALESCE(p.photo_uri, '') as photo_uri,
         COALESCE(c.nom, 'Autres') as categorie_nom,
         COALESCE(c.icone, 'cart-outline')   as categorie_icone
       FROM produits p
       LEFT JOIN categories c ON p.categorie_id = c.id
       WHERE p.id = ?`,
        [id]
      ) ?? null
    );
  }

  /**
   * MISSION DE LA FONCTION : getAchatsByProduit
   *   Retrouve l'historique complet des achats passés pour un produit donné.
   *
   * RÔLE DANS L'APPLICATION :
   *   Permet d'analyser l'évolution dans le temps des prix d'un produit (ex: brique de lait, paquet de pâtes).
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   La liste chronologique des prix relevés par magasin sur l'écran `produit/historique.tsx`.
   */
  export function getAchatsByProduit(produitId: number, userId?: number): Achat[] {
    if (userId) {
      return db.getAllSync<Achat>(
        `SELECT
         a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
         COALESCE(a.titre, '') as titre,
         a.prix_unitaire, a.quantite, a.prix_total,
         a.date_achat, a.mois, a.notes,
         COALESCE(p.nom, 'Produit')     as produit_nom,
         COALESCE(c.icone, 'cart-outline')        as produit_icone,
         (SELECT photo_path FROM product WHERE id = a.produit_id) as produit_photo,
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
       COALESCE(c.icone, 'cart-outline')        as produit_icone,
       (SELECT photo_path FROM product WHERE id = a.produit_id) as produit_photo,
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

  /**
   * MISSION DE LA FONCTION : insertProduit
   *   Crée un nouvel article dans la table `product` via la vue de compatibilité `produits`.
   *
   * RÔLE DANS L'APPLICATION :
   *   Enregistre les données du formulaire `nouveau-produit.tsx` (nom, marque, catégorie, unité, photo).
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Ajoute immédiatement la nouvelle vignette au catalogue d'articles.
   */
  export function insertProduit(data: {
    nom: string;
  /** Marque ou fabricant du produit commercial */
    marque: string;
  /** Unité de mesure physique normalisée (ex: "kg", "L", "pièce") */
    unite: string;
    categorie_id: number;
  /** Identifiant de l'utilisateur ayant créé cet enregistrement */
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

  /** Sans accents ni majuscules, pour les suggestions pendant la frappe. */
  function normaliserTexte(valeur: string): string {
    return valeur
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * MISSION DE LA FONCTION : suggestProduits
   *   Filtre les produits existants selon les lettres tapées par l'utilisateur (auto-complétion).
   *
   * RÔLE DANS L'APPLICATION :
   *   Accélère la saisie d'un ticket lors d'un nouvel achat.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Une liste déroulante sous le champ texte proposant jusqu'à 8 produits correspondants.
   */
  export function suggestProduits(userId: number, saisie: string, limite: number = 8): Produit[] {
    const terme = normaliserTexte(saisie);
    if (!terme) return [];
    return getAllProduits(userId)
      .filter((p) => {
        const nom = normaliserTexte(p.nom);
        const marque = normaliserTexte(p.marque ?? '');
        return nom.includes(terme) || marque.includes(terme);
      })
      .slice(0, limite);
  }

  /**
   * MISSION DE LA FONCTION : getAchatsDuJour
   *   Récupère les dépenses enregistrées pour une date précise (ou aujourd'hui par défaut).
   *
   * RÔLE DANS L'APPLICATION :
   *   Alimente le résumé quotidien et la vue calendrier.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   La liste des achats sous le calendrier lorsqu'un jour précis est touché.
   */
  export function getAchatsDuJour(userId: number, isoDate?: string): Achat[] {
    const jour = isoDate ?? new Date().toISOString().slice(0, 10);
    return db.getAllSync<Achat>(
      `SELECT
         a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
         COALESCE(a.titre, '') as titre,
         a.prix_unitaire, a.quantite, a.prix_total,
         a.date_achat, a.mois, a.notes,
         COALESCE(p.nom, a.titre, 'Dépense') as produit_nom,
         COALESCE(cp.icone, cd.icone, 'cart-outline') as produit_icone,
         (SELECT photo_path FROM product WHERE id = a.produit_id) as produit_photo,
         COALESCE(m.nom, a.magasin_nom, 'Non précisé') as magasin_nom
       FROM achats a
       LEFT JOIN produits p ON a.produit_id = p.id
       LEFT JOIN categories cp ON p.categorie_id = cp.id
       LEFT JOIN categories cd ON a.categorie_id = cd.id
       LEFT JOIN magasins m ON a.magasin_id = m.id
       WHERE a.utilisateur_id = ? AND a.date_achat = ?
       ORDER BY a.id DESC`,
      [userId, jour]
    );
  }

  /**
   * MISSION DE LA FONCTION : getMagasinMoinsCher
   *   Compare tous les achats d'un produit pour trouver l'enseigne proposant le meilleur prix unitaire.
   *
   * RÔLE DANS L'APPLICATION :
   *   Moteur d'aide à la décision économique et de comparaison des prix entre supermarchés.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Un encart vert menthe "Meilleur prix trouvé" indiquant le nom de l'enseigne et le prix en DT.
   */
  export function getMagasinMoinsCher(
    produitId: number,
    userId: number
  ): { magasin: string; prix_unitaire: number; date_achat: string } | null {
    return (
      db.getFirstSync(
        `SELECT COALESCE(m.nom, a.magasin_nom, 'Non précisé') as magasin,
                a.prix_unitaire,
                a.date_achat
         FROM achats a
         LEFT JOIN magasins m ON a.magasin_id = m.id
         WHERE a.produit_id = ? AND a.utilisateur_id = ? AND a.quantite > 0
         ORDER BY a.prix_unitaire ASC, a.date_achat DESC
         LIMIT 1`,
        [produitId, userId]
      ) ?? null
    );
  }

  /**
   * MISSION DE LA FONCTION : updateProduit
   *   Modifie les informations d'un produit (nom, marque, unité, catégorie, photo).
   *
   * RÔLE DANS L'APPLICATION :
   *   Exécutée lors de la validation du formulaire `modifier-produit.tsx`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Met à jour la fiche produit affichée à l'écran.
   */
  export function updateProduit(
    id: number,
    userId: number,
    data: { nom: string; marque: string; unite: string; categorie_id: number; photo_uri?: string }
  ): void {
    db.runSync(
      `UPDATE product
       SET name = ?, brand = ?, unit = ?, category_id = ?, photo_path = COALESCE(?, photo_path)
       WHERE id = ? AND user_id = ?`,
      [data.nom, data.marque, data.unite, data.categorie_id, data.photo_uri ?? null, id, userId]
    );
  }

  /**
   * MISSION DE LA FONCTION : getAchatById
   *   Charge un achat ou une dépense par son ID unique pour l'utilisateur connecté.
   *
   * RÔLE DANS L'APPLICATION :
   *   Pré-remplit les champs de `modifier-achat.tsx` et `modifier-depense.tsx`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Affiche les valeurs actuelles (prix, quantité, magasin, date) dans le formulaire.
   */
  export function getAchatById(id: number, userId: number): Achat | null {
    return (
      db.getFirstSync<Achat>(
        `SELECT
           a.id, a.produit_id, a.utilisateur_id, a.magasin_id, a.categorie_id,
           COALESCE(a.titre, '') as titre,
           a.prix_unitaire, a.quantite, a.prix_total,
           a.date_achat, a.mois, a.notes,
           COALESCE(p.nom, a.titre, 'Dépense') as produit_nom,
           COALESCE(cp.icone, cd.icone, 'cart-outline') as produit_icone,
           (SELECT photo_path FROM product WHERE id = a.produit_id) as produit_photo,
           COALESCE(m.nom, a.magasin_nom, 'Non précisé') as magasin_nom
         FROM achats a
         LEFT JOIN produits p ON a.produit_id = p.id
         LEFT JOIN categories cp ON p.categorie_id = cp.id
         LEFT JOIN categories cd ON a.categorie_id = cd.id
         LEFT JOIN magasins m ON a.magasin_id = m.id
         WHERE a.id = ? AND a.utilisateur_id = ?`,
        [id, userId]
      ) ?? null
    );
  }

  /**
   * MISSION DE LA FONCTION : updateAchat
   *   Met à jour les montants, la date, le magasin ou la catégorie d'un ticket existant.
   *
   * RÔLE DANS L'APPLICATION :
   *   Sauvegarde les corrections faites par l'utilisateur.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Actualise immédiatement les statistiques de dépenses du mois.
   */
  export function updateAchat(
    id: number,
    userId: number,
    data: {
  /** Montant total payé en Dinars Tunisiens (DT) */
      prix_total: number;
      quantite: number;
  /** Date calendaire de l'achat au format ISO YYYY-MM-DD */
      date_achat: string;
      magasin?: string;
      notes?: string;
      label?: string;
      categorie_id?: number | null;
    }
  ): void {
    if (id >= 1000000) {
      const expenseId = id - 1000000;
      db.runSync(
        `UPDATE expense
         SET amount = ?, label = COALESCE(?, label), date = ?, month = substr(?, 1, 7),
             category_id = COALESCE(?, category_id), notes = COALESCE(?, notes)
         WHERE id = ? AND user_id = ?`,
        [
          data.prix_total,
          data.label ?? null,
          data.date_achat,
          data.date_achat,
          data.categorie_id ?? null,
          data.notes ?? null,
          expenseId,
          userId,
        ]
      );
      return;
    }
    const store = data.magasin?.trim() || 'Non précisé';
    db.runSync(
      `UPDATE purchase
       SET price = ?, quantity = ?, date = ?, month = substr(?, 1, 7), store = ?, notes = COALESCE(?, notes)
       WHERE id = ? AND user_id = ?`,
      [
        data.prix_total,
        data.quantite,
        data.date_achat,
        data.date_achat,
        store,
        data.notes ?? null,
        id,
        userId,
      ]
    );
  }

  /**
   * MISSION DE LA FONCTION : deleteAchat
   *   Supprime définitivement un achat (`purchase`) ou une dépense (`expense`) de la base de données.
   *
   * RÔLE DANS L'APPLICATION :
   *   Déclenchée lorsque l'utilisateur appuie sur l'icône de corbeille rouge.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Retire la dépense de la liste et recalcule le solde restant.
   */
  export function deleteAchat(id: number, userId: number): void {
    if (id >= 1000000) {
      db.runSync(`DELETE FROM expense WHERE id = ? AND user_id = ?`, [id - 1000000, userId]);
      return;
    }
    db.runSync(`DELETE FROM purchase WHERE id = ? AND user_id = ?`, [id, userId]);
  }

  /**
   * MISSION DE LA FONCTION : deleteProduit
   *   Supprime un produit du catalogue personnel de l'utilisateur.
   *   En mode 'reassign' (par défaut), convertit automatiquement les anciens achats
   *   de ce produit en dépenses directes afin de ne jamais fausser le budget du mois ni perdre l'historique financier.
   *
   * RÔLE DANS L'APPLICATION :
   *   Protège l'intégrité comptable de l'utilisateur tout en lui permettant de nettoyer son catalogue.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Fait disparaître le produit de la grille des articles tout en préservant le total des dépenses passées.
   */
  export function deleteProduit(
    produitId: number,
    mode: 'reassign' | 'cascade' = 'reassign'
  ): void {
    const p = getProduitById(produitId);
    if (!p) return;
    // Le fichier photo est effacé par l'appelant (supprimerFichierPhoto)
    // pour garder la couche SQL indépendante du système de fichiers.

    if (mode === 'reassign') {
      const catAutres = db.getFirstSync<{ id: number }>(
        `SELECT id FROM category WHERE name_key = 'Autres' OR is_system = 1 LIMIT 1`
      );
      const catFallbackId = p.categorie_id || (catAutres?.id ?? 9);

      // Convertit les achats de ce produit en dépenses directes
      const achatsExistants = db.getAllSync<any>(
        `SELECT * FROM purchase WHERE product_id = ?`,
        [produitId]
      );

      for (const a of achatsExistants) {
        db.runSync(
          `INSERT INTO expense (user_id, category_id, amount, label, date, month, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            a.user_id,
            catFallbackId,
            a.price,
            `${p.nom} (produit supprimé)`,
            a.date,
            a.month,
            a.notes ?? '',
          ]
        );
      }
    }

    // Supprime le produit dans SQLite (les lignes purchase restantes sont supprimées par cascade)
    db.runSync(`DELETE FROM product WHERE id = ?`, [produitId]);
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

  export function findOrCreateMagasin(nom: string): number {
    const propre = nom.trim();
    if (!propre) return 1;
    const exist = db.getFirstSync<{ id: number }>(
      `SELECT id FROM magasins WHERE nom = ? COLLATE NOCASE`,
      [propre]
    );
    if (exist) return exist.id;
    const res = db.runSync(`INSERT INTO magasins (nom) VALUES (?)`, [propre]);
    return res.lastInsertRowId;
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

  export type BudgetPeriode = {
    id: number;
    user_id: number;
    start_date: string;
    end_date: string;
    total: number;
    is_evaluated: number;
    succeeded: number;
  };

  export type LigneEnveloppe = {
    categorie_id: number;
    montant: number;
    pourcentage: number;
  };

  export type BrouillonBudget = {
    total: number;
    enveloppes: LigneEnveloppe[];
    source_start: string;
    source_end: string;
  };

  function dernierJourDuMois(mois: string): string {
    const [annee, m] = mois.split('-').map(Number);
    const fin = new Date(annee, m, 0).getDate();
    return `${mois}-${String(fin).padStart(2, '0')}`;
  }

  function lireBudget(row: {
    id: number;
    user_id: number;
    start_date: string;
    end_date: string;
    total: number;
    is_evaluated: number;
    succeeded: number;
  } | null): BudgetPeriode | null {
    if (!row) return null;
    return row;
  }

  // Budget dont la période contient ce jour. Filtré par user_id.
  export function getBudgetCouvrant(userId: number, isoDate: string): BudgetPeriode | null {
    return lireBudget(
      db.getFirstSync(
        `SELECT id, user_id, start_date, end_date, total, is_evaluated, succeeded
         FROM budget
         WHERE user_id = ? AND start_date <= ? AND end_date >= ?
         ORDER BY start_date DESC
         LIMIT 1`,
        [userId, isoDate, isoDate]
      ) ?? null
    );
  }

  export function getMonthlyBudget(
    userId: number,
    mois: string
  ): { id: number; montant_total: number; est_evalue: number; start_date: string; end_date: string } | null {
    const debut = `${mois}-01`;
    const fin = dernierJourDuMois(mois);
    const row = db.getFirstSync<{
      id: number;
      total: number;
      is_evaluated: number;
      start_date: string;
      end_date: string;
    }>(
      `SELECT id, total, is_evaluated, start_date, end_date
       FROM budget
       WHERE user_id = ?
         AND start_date <= ?
         AND end_date >= ?
       ORDER BY start_date DESC
       LIMIT 1`,
      [userId, fin, debut]
    );
    if (!row) return null;
    return {
      id: row.id,
      montant_total: row.total,
      est_evalue: row.is_evaluated,
      start_date: row.start_date,
      end_date: row.end_date,
    };
  }

  export type ResultatBudget =
    | { ok: true; id: number }
    | { ok: false; code: 'dates' | 'chevauchement' | 'total' | 'somme' };

  /**
   * Enregistre une période. Ne copie jamais une période toute seule :
   * l'appelant doit avoir montré les montants et attendu le bouton.
   */
  export function enregistrerBudget(
    userId: number,
    startDate: string,
    endDate: string,
    total: number,
    enveloppes: LigneEnveloppe[],
    budgetId?: number
  ): ResultatBudget {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return { ok: false, code: 'dates' };
    }
    if (endDate < startDate) return { ok: false, code: 'dates' };
    if (!(total > 0)) return { ok: false, code: 'total' };

    const somme = enveloppes.reduce((s, e) => s + (e.montant > 0 ? e.montant : 0), 0);
    if (somme - total > 0.0005) return { ok: false, code: 'somme' };

    const autre = db.getFirstSync<{ id: number }>(
      `SELECT id FROM budget
       WHERE user_id = ?
         AND id != ?
         AND start_date <= ?
         AND end_date >= ?`,
      [userId, budgetId ?? -1, endDate, startDate]
    );
    if (autre) return { ok: false, code: 'chevauchement' };

    let id = budgetId ?? 0;
    if (budgetId) {
      db.runSync(
        `UPDATE budget SET start_date = ?, end_date = ?, total = ? WHERE id = ? AND user_id = ?`,
        [startDate, endDate, total, budgetId, userId]
      );
    } else {
      const res = db.runSync(
        `INSERT INTO budget (user_id, start_date, end_date, total) VALUES (?, ?, ?, ?)`,
        [userId, startDate, endDate, total]
      );
      id = res.lastInsertRowId;
    }

    db.runSync(`DELETE FROM envelope WHERE budget_id = ?`, [id]);
    for (const env of enveloppes) {
      if (env.montant > 0) {
        db.runSync(
          `INSERT INTO envelope (budget_id, category_id, amount) VALUES (?, ?, ?)`,
          [id, env.categorie_id, env.montant]
        );
      }
    }
    return { ok: true, id };
  }

  export function saveMonthlyBudget(
    userId: number,
    mois: string,
    total: number,
    enveloppes: LigneEnveloppe[]
  ): void {
    const existant = getMonthlyBudget(userId, mois);
    enregistrerBudget(
      userId,
      existant?.start_date ?? `${mois}-01`,
      existant?.end_date ?? dernierJourDuMois(mois),
      total,
      enveloppes,
      existant?.id
    );
  }

  /**
   * Prépare la copie. N'écrit rien. La période source est la dernière
   * qui se termine avant la date de début choisie.
   */
  export function brouillonPeriodePrecedente(
    userId: number,
    startDate: string
  ): BrouillonBudget | null {
    const source = db.getFirstSync<{ id: number; total: number; start_date: string; end_date: string }>(
      `SELECT id, total, start_date, end_date
       FROM budget
       WHERE user_id = ? AND end_date < ?
       ORDER BY end_date DESC
       LIMIT 1`,
      [userId, startDate]
    );
    if (!source) return null;
    const enveloppes = db.getAllSync<LigneEnveloppe>(
      `SELECT category_id as categorie_id, amount as montant,
              CASE WHEN ? > 0 THEN ROUND(amount * 100.0 / ?, 2) ELSE 0 END as pourcentage
       FROM envelope WHERE budget_id = ?`,
      [source.total, source.total, source.id]
    );
    return {
      total: source.total,
      enveloppes,
      source_start: source.start_date,
      source_end: source.end_date,
    };
  }

  // ------------------------------------------------------------
  // getEnveloppesBudget : Calcule la consommation en temps réel de chaque enveloppe
  // ------------------------------------------------------------
  export function getEnveloppesBudget(userId: number, mois: string): EnveloppeBudget[] {
    const budget = getMonthlyBudget(userId, mois);
    if (!budget) return [];

    // Enveloppes de CETTE période, pour CET utilisateur.
    const envelopes = db.getAllSync<{
      categorie_id: number;
  /** Libellé traduit de la catégorie de rattachement */
      categorie_nom: string;
  /** Icône vectorielle de la catégorie associée */
      categorie_icone: string;
  /** Montant financier alloué à cette enveloppe budgétaire en DT */
      montant_alloue: number;
  /** Part en pourcentage de l'enveloppe par rapport au budget global */
      pourcentage_alloue: number;
    }>(
      `SELECT
       e.category_id as categorie_id,
       c.name_key as categorie_nom,
       c.icon as categorie_icone,
       e.amount as montant_alloue,
       CASE WHEN b.total > 0 THEN ROUND(e.amount * 100.0 / b.total, 2) ELSE 0 END as pourcentage_alloue
     FROM envelope e
     JOIN budget b ON b.id = e.budget_id
     JOIN category c ON c.id = e.category_id
     WHERE e.budget_id = ? AND b.user_id = ?
     ORDER BY e.amount DESC`,
      [budget.id, userId]
    );

    return envelopes.map((env) => {
      // Dépenses dont la date tombe dans la période, pas dans le mois civil.
      const depenseRow = db.getFirstSync<{ total: number }>(
        `SELECT COALESCE(SUM(a.prix_total), 0) as total
       FROM achats a
       LEFT JOIN produits p ON a.produit_id = p.id
       WHERE a.utilisateur_id = ?
         AND a.date_achat >= ?
         AND a.date_achat <= ?
         AND (p.categorie_id = ? OR a.categorie_id = ?)`,
        [userId, budget.start_date, budget.end_date, env.categorie_id, env.categorie_id]
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
       AND a.date_achat >= ?
       AND a.date_achat <= ?
       AND COALESCE(p.categorie_id, a.categorie_id) NOT IN (
         SELECT category_id FROM envelope WHERE budget_id = ?
       )`,
      [userId, budget.start_date, budget.end_date, budget.id]
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
    const budget = getMonthlyBudget(userId, mois);
    const debut = budget?.start_date ?? `${mois}-01`;
    const fin = budget?.end_date ?? dernierJourDuMois(mois);
    const depenseRow = db.getFirstSync<{ total: number }>(
      `SELECT COALESCE(SUM(a.prix_total), 0) as total
     FROM achats a
     LEFT JOIN produits p ON a.produit_id = p.id
     WHERE a.utilisateur_id = ?
       AND a.date_achat >= ?
       AND a.date_achat <= ?
       AND (p.categorie_id = ? OR a.categorie_id = ?)`,
      [userId, debut, fin, categorieId, categorieId]
    );

    const dejaDepense = depenseRow?.total ?? 0;
    return nouveauMontant >= dejaDepense;
  }

  // ------------------------------------------------------------
  // copyPreviousMonthBudget : Recopie le budget du mois précédent
  // ------------------------------------------------------------
  /** Ancien nom. Ne sauvegarde plus : renvoie seulement le brouillon. */
  export function copyPreviousMonthBudget(userId: number, moisCourant: string): BrouillonBudget | null {
    return brouillonPeriodePrecedente(userId, `${moisCourant}-01`);
  }

  // ============================================================
  // SECTION F — GAMIFICATION & POINTS
  // ============================================================

  const POINTS_DEFAUT: PointsSettings = {
    points_per_period: 100,
    points_streak_bonus: 50,
    streak_length: 3,
    seuil_debutant: 0,
    seuil_econome: 300,
    seuil_expert: 1000,
    green_until: 79,
    orange_from: 80,
    red_from: 100,
  };

  export function getPointsSettings(): PointsSettings {
    try {
      const s = db.getFirstSync<PointsSettings>(
        `SELECT
           points_per_period,
           points_streak_bonus,
           streak_length,
           threshold_beginner as seuil_debutant,
           threshold_saver as seuil_econome,
           threshold_expert as seuil_expert,
           green_until,
           orange_from,
           red_from
         FROM settings LIMIT 1`
      );
      return s ?? POINTS_DEFAUT;
    } catch {
      return POINTS_DEFAUT;
    }
  }

  export function couleurSelonConsommation(pourcentage: number): 'vert' | 'or' | 'corail' {
    const s = getPointsSettings();
    if (pourcentage >= s.red_from) return 'corail';
    if (pourcentage >= s.orange_from) return 'or';
    return 'vert';
  }

    export function updatePointsSettings(
      settings: PointsSettings,
      adminUserId?: number
    ): void {
      verifierPrivilegeAdmin(adminUserId);
      db.runSync(
        `UPDATE settings
         SET points_per_period = ?,
             points_streak_bonus = ?,
             streak_length = ?,
             points_per_category = 0,
             points_monthly_bonus = 0,
             threshold_beginner = ?,
             threshold_saver = ?,
             threshold_expert = ?,
             green_until = ?,
             orange_from = ?,
             red_from = ?`,
        [
          settings.points_per_period,
          settings.points_streak_bonus,
          settings.streak_length,
          settings.seuil_debutant,
          settings.seuil_econome,
          settings.seuil_expert,
          settings.green_until,
          settings.orange_from,
          settings.red_from,
        ]
      );
    }

    export function getTotalPoints(userId: number): number {
      const result = db.getFirstSync<{ total: number }>(
        `SELECT COALESCE(SUM(points), 0) as total FROM points_log WHERE user_id = ?`,
        [userId]
      );
      return result?.total ?? 0;
    }

    // ------------------------------------------------------------
    // evaluerMoisPrecedent : Évaluation automatique au lancement de l'application
    // ------------------------------------------------------------
    function depenseEntre(userId: number, debut: string, fin: string): number {
      const row = db.getFirstSync<{ total: number }>(
        `SELECT COALESCE(SUM(prix_total), 0) as total
         FROM achats
         WHERE utilisateur_id = ? AND date_achat >= ? AND date_achat <= ?`,
        [userId, debut, fin]
      );
      return row?.total ?? 0;
    }

    /**
     * Une période terminée est notée une seule fois.
     * Réussite = dépenses <= total. 100 points, puis +50 si les N dernières
     * périodes (réglage, 3 par défaut) sont toutes réussies.
     */
    export function evaluerMoisPrecedent(
      userId: number,
      _moisCourant: string
    ): { pointsGagnes: number; evalue: boolean; message: string } {
      const aujourdhui = new Date().toISOString().slice(0, 10);
      const aNoter = db.getAllSync<{
        id: number;
        start_date: string;
        end_date: string;
        total: number;
      }>(
        `SELECT id, start_date, end_date, total
         FROM budget
         WHERE user_id = ? AND end_date < ? AND is_evaluated = 0
         ORDER BY end_date ASC`,
        [userId, aujourdhui]
      );
      if (aNoter.length === 0) {
        return { pointsGagnes: 0, evalue: false, message: '' };
      }

      const settings = getPointsSettings();
      let pointsGagnes = 0;
      let message = '';

      for (const budget of aNoter) {
        const depense = depenseEntre(userId, budget.start_date, budget.end_date);
        const reussie = depense <= budget.total;
        let points = reussie ? settings.points_per_period : 0;

        db.runSync(
          `UPDATE budget SET is_evaluated = 1, succeeded = ? WHERE id = ? AND user_id = ?`,
          [reussie ? 1 : 0, budget.id, userId]
        );

        if (reussie) {
          const serie = db.getFirstSync<{ n: number }>(
            `SELECT COUNT(*) as n FROM (
               SELECT succeeded FROM budget
               WHERE user_id = ? AND end_date <= ?
               ORDER BY end_date DESC
               LIMIT ?
             ) WHERE succeeded = 1`,
            [userId, budget.end_date, settings.streak_length]
          );
          if ((serie?.n ?? 0) >= settings.streak_length) {
            points += settings.points_streak_bonus;
          }
        }

        if (points > 0) {
          db.runSync(
            `INSERT INTO points_log (user_id, month, reason, points, budget_id)
             VALUES (?, ?, ?, ?, ?)`,
            [userId, budget.start_date, reussie ? 'periode_reussie' : 'periode_terminee', points, budget.id]
          );
        }
        pointsGagnes += points;
        message = reussie ? 'periode_reussie' : 'periode_depassee';
      }

      return { pointsGagnes, evalue: true, message };
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
      const budget = getMonthlyBudget(userId, mois);
      if (!budget) return false;
      const r = db.getFirstSync<{ id: number }>(
        `SELECT id FROM alert_log
         WHERE user_id = ? AND budget_id = ? AND category_id = ? AND level = ?`,
        [userId, budget.id, categorieId, seuil]
      );
      return r != null;
    }

    export function logAlerte(
      userId: number,
      mois: string,
      categorieId: number,
      seuil: number
    ): void {
      const budget = getMonthlyBudget(userId, mois);
      if (!budget) return;
      db.runSync(
        `INSERT OR IGNORE INTO alert_log (user_id, month, category_id, level, budget_id)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, mois, categorieId, seuil, budget.id]
      );
    }

    // ============================================================
    // SECTION G — SUPERVISION ADMINISTRATEUR (Totaux anonymes UNIQUEMENT)
    // ============================================================

      export function getAdminGlobalStats(adminUserId?: number): AdminGlobalStats {
        verifierPrivilegeAdmin(adminUserId);
        const usersCount = db.getFirstSync<{ total: number; actifs: number }>(`
    SELECT
      COUNT(*) as total,
      COALESCE(SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END), 0) as actifs
    FROM user
    WHERE role = 'user'
  `);
        const cats = db.getFirstSync<{ produits: number; depenses: number }>(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'product' THEN 1 ELSE 0 END), 0) as produits,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN 1 ELSE 0 END), 0) as depenses
    FROM category
    WHERE is_active = 1
  `);
        const total = usersCount?.total ?? 0;
        const actifs = usersCount?.actifs ?? 0;
        return {
          nbUtilisateurs: total,
          nbUtilisateursActifs: actifs,
          nbSuspendus: Math.max(0, total - actifs),
          nbCategoriesProduit: cats?.produits ?? 0,
          nbCategoriesDepense: cats?.depenses ?? 0,
        };
      }

        export function getAllUsersAdmin(adminUserId?: number): CompteAdmin[] {
          verifierPrivilegeAdmin(adminUserId);
          return db.getAllSync<CompteAdmin>(
            `SELECT id, name as nom, email, role, is_active, must_change_password, created_at
             FROM user
             ORDER BY role DESC, name ASC`
          );
        }

          export function setCategoryType(
            id: number,
            type: 'product' | 'expense',
            adminUserId?: number
          ): void {
            verifierPrivilegeAdmin(adminUserId);
            db.runSync(`UPDATE category SET type = ? WHERE id = ?`, [type, id]);
          }

          export function saveDefaultPercents(
            lignes: { id: number; percent: number }[],
            adminUserId?: number
          ): void {
            verifierPrivilegeAdmin(adminUserId);
            const somme = lignes.reduce((s, l) => s + l.percent, 0);
            if (Math.abs(somme - 100) > 0.05) {
              throw new Error('Le total des pourcentages doit être exactement 100.');
            }
            for (const ligne of lignes) {
              if (ligne.percent < 0 || ligne.percent > 100) {
                throw new Error('Chaque pourcentage doit être entre 0 et 100.');
              }
              db.runSync(
                `UPDATE category SET default_percent = ?, is_default = 1 WHERE id = ?`,
                [ligne.percent, ligne.id]
              );
            }
          }

          export function addCategoryAdmin(
            nom: string,
            icone: string,
            pct: number,
            theme: string,
            type: 'product' | 'expense' = 'product',
            adminUserId?: number
          ): number {
            verifierPrivilegeAdmin(adminUserId);
            const res = db.runSync(
                `INSERT INTO category (name_key, type, icon, default_percent, is_default, is_active, is_system, theme)
     VALUES (?, ?, ?, ?, 0, 1, 0, ?)`,
              [nom.trim(), type, icone.trim() || 'cart-outline', pct, theme.trim() || 'Divers']
            );
            return res.lastInsertRowId;
          }

          export function updateCategoryAdmin(
            id: number,
            nom: string,
            icone: string,
            pct: number,
  isVisible: boolean,
            type: 'product' | 'expense' = 'product',
            adminUserId?: number
          ): void {
            verifierPrivilegeAdmin(adminUserId);
            db.runSync(
    `UPDATE category
     SET name_key = ?, type = ?, icon = ?, default_percent = ?, is_active = ?
              WHERE id = ? `,
    [nom.trim(), type, icone.trim() || 'cart-outline', pct, isVisible ? 1 : 0, id]
  );
}

// ------------------------------------------------------------
// addUserCustomCategory : Permet à un utilisateur de créer sa propre catégorie
//                         avec le type 'product' ou 'expense'
// ------------------------------------------------------------
export function addUserCustomCategory(
  userId: number,
  nom: string,
  icone: string,
  type: 'product' | 'expense' = 'product',
  theme: string = 'Personnalisé'
): number {
  const nomClean = nom.trim();
  const res = db.runSync(
    `INSERT INTO category(name_key, type, icon, default_percent, is_default, is_active, is_system, theme)
     VALUES(?, ?, ?, 0, 0, 1, 0, ?)`,
    [nomClean, type, icone.trim() || 'pricetag-outline', theme.trim() || 'Personnalisé']
  );
  const newCatId = res.lastInsertRowId;
  // Active immédiatement la catégorie pour cet utilisateur
  db.runSync(
    `INSERT OR IGNORE INTO user_category(user_id, category_id, enabled) VALUES(?, ?, 1)`,
    [userId, newCatId]
  );
  return newCatId;
}

export function updateBudget(utilisateurId: number, budget: number): void {
  db.runSync(
    `UPDATE user SET budget_mensuel = ? WHERE id = ? `,
    [budget, utilisateurId]
  );
}

export function updateLangue(utilisateurId: number, langue: string): void {
  db.runSync(
    `UPDATE user SET langue = ? WHERE id = ? `,
    [langue, utilisateurId]
  );
}

export function getDepensesParCategorie(
  utilisateurId: number,
  mois: string
): DepenseParCategorie[] {
  return db.getAllSync<DepenseParCategorie>(
    `SELECT
       COALESCE(c.nom, 'Autres') as categorie_nom,
              COALESCE(c.icone, 'cart-outline') as categorie_icone,
              SUM(a.prix_total) as total
     FROM achats a
     LEFT JOIN produits p   ON a.produit_id = p.id
     LEFT JOIN categories c ON COALESCE(p.categorie_id, a.categorie_id) = c.id
     WHERE a.utilisateur_id = ? AND a.mois = ?
              GROUP BY c.id
     HAVING SUM(a.prix_total) > 0
     ORDER BY total DESC`,
    [utilisateurId, mois]
  );
}

export type TopProduitDepense = {
  produit_id: number;
  produit_nom: string;
  total_depense: number;
  dernier_prix_unitaire: number;
  unite: string;
};

export function getTopProduitsParDepense(
  utilisateurId: number,
  mois?: string,
  limit: number = 3
): TopProduitDepense[] {
  try {
    const sql = mois
      ? `SELECT
           p.id as produit_id,
           p.nom as produit_nom,
           p.unite as unite,
           SUM(a.prix_total) as total_depense,
           COALESCE(MAX(a.prix_unitaire), 0) as dernier_prix_unitaire
         FROM achats a
         JOIN produits p ON a.produit_id = p.id
         WHERE a.utilisateur_id = ? AND a.mois = ?
         GROUP BY p.id
         ORDER BY total_depense DESC
         LIMIT ?`
      : `SELECT
           p.id as produit_id,
           p.nom as produit_nom,
           p.unite as unite,
           SUM(a.prix_total) as total_depense,
           COALESCE(MAX(a.prix_unitaire), 0) as dernier_prix_unitaire
         FROM achats a
         JOIN produits p ON a.produit_id = p.id
         WHERE a.utilisateur_id = ?
         GROUP BY p.id
         ORDER BY total_depense DESC
         LIMIT ?`;
    const params = mois ? [utilisateurId, mois, limit] : [utilisateurId, limit];
    return db.getAllSync<TopProduitDepense>(sql, params);
  } catch {
    return [];
  }
}

// ============================================================
// SECTION H — ANALYSES BUDGÉTAIRES PAR PÉRIODE PRÉCISE
// Calculs en millimes entiers pour une précision comptable absolue
// ============================================================

export type CategoriePeriodeStat = {
  categorie_id: number;
  /** Libellé traduit de la catégorie de rattachement */
  categorie_nom: string;
  /** Icône vectorielle de la catégorie associée */
  categorie_icone: string;
  type: 'product' | 'expense';
  total_millimes: number;
  total_dt: number;
  part_pourcentage: number;
  /** Montant financier alloué à cette enveloppe budgétaire en DT */
  montant_alloue: number;
  /** Taux de consommation réel de l'enveloppe (dépensé / alloué) en % */
  pourcentage_consomme: number;
  depense_precedente_dt: number;
  ecart_dt: number;
  ecart_pct: number | null; // null si période précédente était à 0
  est_nouveau: boolean;
};

/**
 * Calcule le total dépensé sur une période (en millimes entiers et DT).
 */
export function getTotalPeriode(
  userId: number,
  startDate: string,
  endDate: string
): { totalDT: number; totalMillimes: number } {
  const row = db.getFirstSync<{ total_millimes: number }>(
    `SELECT COALESCE(SUM(CAST(ROUND(a.prix_total * 1000) AS INTEGER)), 0) as total_millimes
     FROM achats a
     WHERE a.utilisateur_id = ?
       AND a.date_achat >= ?
       AND a.date_achat <= ?`,
    [userId, startDate, endDate]
  );
  const totalMillimes = row?.total_millimes ?? 0;
  return {
    totalMillimes,
    totalDT: totalMillimes / 1000,
  };
}

/**
 * Retourne le détail de toutes les catégories dépensées pour une période donnée,
 * avec la part du total, la comparaison avec la période précédente, et l'enveloppe budgétaire.
 */
export function getAnalysesParCategoriePeriode(
  userId: number,
  startDate: string,
  endDate: string,
  prevStartDate: string,
  prevEndDate: string,
  budgetId?: number | null
): {
  categories: CategoriePeriodeStat[];
  totalCourantDT: number;
  totalPrecedentDT: number;
  nonBudgetiseDT: number;
  sousTotalProduitsDT: number;
  sousTotalDepensesDT: number;
} {
  // 1. Totaux globaux en millimes
  const totalCourant = getTotalPeriode(userId, startDate, endDate);
  const totalPrecedent = getTotalPeriode(userId, prevStartDate, prevEndDate);

  // 2. Dépenses par catégorie sur la période courante
  const depensesCourantes = db.getAllSync<{
    cat_id: number;
    cat_nom: string;
    cat_icone: string;
    cat_type: string;
    somme_millimes: number;
  }>(
    `SELECT
       COALESCE(c.id, 0) as cat_id,
       COALESCE(c.name_key, 'Non catégorisé') as cat_nom,
       COALESCE(c.icon, 'cart-outline') as cat_icone,
       COALESCE(c.type, 'product') as cat_type,
       SUM(CAST(ROUND(a.prix_total * 1000) AS INTEGER)) as somme_millimes
     FROM achats a
     LEFT JOIN category c ON a.categorie_id = c.id
     WHERE a.utilisateur_id = ?
       AND a.date_achat >= ?
       AND a.date_achat <= ?
     GROUP BY c.id
     HAVING SUM(CAST(ROUND(a.prix_total * 1000) AS INTEGER)) > 0
     ORDER BY somme_millimes DESC`,
    [userId, startDate, endDate]
  );

  // 3. Dépenses par catégorie sur la période précédente (pour calculer l'écart)
  const depensesPrecedentesMap = new Map<number, number>();
  const depensesPrec = db.getAllSync<{
    cat_id: number;
    somme_millimes: number;
  }>(
    `SELECT
       COALESCE(c.id, 0) as cat_id,
       SUM(CAST(ROUND(a.prix_total * 1000) AS INTEGER)) as somme_millimes
     FROM achats a
     LEFT JOIN category c ON a.categorie_id = c.id
     WHERE a.utilisateur_id = ?
       AND a.date_achat >= ?
       AND a.date_achat <= ?
     GROUP BY c.id`,
    [userId, prevStartDate, prevEndDate]
  );
  for (const dp of depensesPrec) {
    depensesPrecedentesMap.set(dp.cat_id, dp.somme_millimes / 1000);
  }

  // 4. Enveloppes du budget couvrant
  const enveloppesMap = new Map<number, number>();
  if (budgetId) {
    const envs = db.getAllSync<{ category_id: number; amount: number }>(
      `SELECT category_id, amount FROM envelope WHERE budget_id = ?`,
      [budgetId]
    );
    for (const e of envs) {
      enveloppesMap.set(e.category_id, e.amount);
    }
  }

  let sousTotalProduitsMillimes = 0;
  let sousTotalDepensesMillimes = 0;
  let nonBudgetiseMillimes = 0;

  const categoriesResultat: CategoriePeriodeStat[] = depensesCourantes.map((dc) => {
    const totalDT = dc.somme_millimes / 1000;
    const partPct = totalCourant.totalMillimes > 0
      ? Math.round((dc.somme_millimes / totalCourant.totalMillimes) * 1000) / 10
      : 0;

    const depPrecDT = depensesPrecedentesMap.get(dc.cat_id) ?? 0;
    const ecartDT = totalDT - depPrecDT;
    const ecartPct = depPrecDT > 0 ? ((ecartDT / depPrecDT) * 100) : null;
    const estNouveau = depPrecDT === 0;

    const montantAlloue = enveloppesMap.get(dc.cat_id) ?? 0;
    const pctConsomme = montantAlloue > 0 ? (totalDT / montantAlloue) * 100 : 0;

    const isExpense = dc.cat_type === 'expense';
    if (isExpense) {
      sousTotalDepensesMillimes += dc.somme_millimes;
    } else {
      sousTotalProduitsMillimes += dc.somme_millimes;
    }

    if (budgetId && montantAlloue === 0) {
      nonBudgetiseMillimes += dc.somme_millimes;
    }

    return {
      categorie_id: dc.cat_id,
      categorie_nom: dc.cat_nom,
      categorie_icone: dc.cat_icone,
      type: (dc.cat_type === 'expense' ? 'expense' : 'product') as 'product' | 'expense',
      total_millimes: dc.somme_millimes,
      total_dt: totalDT,
      part_pourcentage: partPct,
      montant_alloue: montantAlloue,
      pourcentage_consomme: pctConsomme,
      depense_precedente_dt: depPrecDT,
      ecart_dt: ecartDT,
      ecart_pct: ecartPct !== null ? Math.round(ecartPct * 10) / 10 : null,
      est_nouveau: estNouveau,
    };
  });

  return {
    categories: categoriesResultat,
    totalCourantDT: totalCourant.totalDT,
    totalPrecedentDT: totalPrecedent.totalDT,
    nonBudgetiseDT: nonBudgetiseMillimes / 1000,
    sousTotalProduitsDT: sousTotalProduitsMillimes / 1000,
    sousTotalDepensesDT: sousTotalDepensesMillimes / 1000,
  };
}

export type DepenseIndividuelle = {
  id: number;
  titre: string;
  magasin: string;
  /** Date calendaire de l'achat au format ISO YYYY-MM-DD */
  date_achat: string;
  montant_dt: number;
  icone: string;
};

/**
 * Plus grosses dépenses individuelles par montant décroissant.
 */
export function getTopDepensesIndividuellesPeriode(
  userId: number,
  startDate: string,
  endDate: string,
  limit: number = 5
): DepenseIndividuelle[] {
  return db.getAllSync<DepenseIndividuelle>(
    `SELECT
       a.id,
       COALESCE(p.nom, a.titre, 'Dépense') as titre,
       COALESCE(m.nom, a.magasin_nom, 'Non précisé') as magasin,
       a.date_achat,
       a.prix_total as montant_dt,
       COALESCE(cp.icone, cd.icone, 'cart-outline') as icone
     FROM achats a
     LEFT JOIN produits p ON a.produit_id = p.id
     LEFT JOIN categories cp ON p.categorie_id = cp.id
     LEFT JOIN categories cd ON a.categorie_id = cd.id
     LEFT JOIN magasins m ON a.magasin_id = m.id
     WHERE a.utilisateur_id = ?
       AND a.date_achat >= ?
       AND a.date_achat <= ?
     ORDER BY a.prix_total DESC
     LIMIT ?`,
    [userId, startDate, endDate, limit]
  );
}

export type ProduitDepensePeriode = {
  produit_id: number;
  produit_nom: string;
  photo_uri?: string;
  total_dt: number;
  quantite_totale: number;
  unite: string;
};

/**
 * Produits classés par somme dépensée sur la période.
 */
export function getTopProduitsPeriode(
  userId: number,
  startDate: string,
  endDate: string,
  limit: number = 5
): ProduitDepensePeriode[] {
  return db.getAllSync<ProduitDepensePeriode>(
    `SELECT
       p.id as produit_id,
       p.nom as produit_nom,
       p.photo_path as photo_uri,
       SUM(a.prix_total) as total_dt,
       SUM(a.quantite) as quantite_totale,
       p.unite as unite
     FROM achats a
     JOIN produits p ON a.produit_id = p.id
     WHERE a.utilisateur_id = ?
       AND a.date_achat >= ?
       AND a.date_achat <= ?
     GROUP BY p.id
     ORDER BY total_dt DESC
     LIMIT ?`,
    [userId, startDate, endDate, limit]
  );
}

export type PointPrixProduit = {
  date: string;
  label: string;
  /** Prix calculé par unité de mesure (prix_total / quantite) */
  prix_unitaire: number;
  magasin: string;
};

/**
 * Courbe d'évolution du prix d'un produit (historique complet des achats).
 */
export function getEvolutionPrixProduit(
  produitId: number,
  userId: number
): PointPrixProduit[] {
  return db.getAllSync<PointPrixProduit>(
    `SELECT
       a.date_achat as date,
       substr(a.date_achat, 6, 5) as label,
       a.prix_unitaire,
       COALESCE(m.nom, a.magasin_nom, 'Non précisé') as magasin
     FROM achats a
     LEFT JOIN magasins m ON a.magasin_id = m.id
     WHERE a.produit_id = ? AND a.utilisateur_id = ?
     ORDER BY a.date_achat ASC`,
    [produitId, userId]
  );
}


