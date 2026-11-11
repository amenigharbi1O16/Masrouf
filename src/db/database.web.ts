// ============================================================
// FICHIER : src/db/database.web.ts
// RÔLE    : Moteur de base de données dédié au Web (Navigateur).
//           Remplace les appels synchrones natifs d'expo-sqlite
//           pour éviter l'erreur "Sync operation timeout".
//           Synchronisé avec localStorage pour la persistance dans le navigateur.
// ============================================================

const DEFAULT_ADMIN_HASH =
  '11112222333344445555666677778888:60f3d9f2c7bf6bbd6e6263a454cf9a5d4c0cfd7342a7e5e04ad25be69b1d492b';
const DEFAULT_USER_HASH =
  '11112222333344445555666677778888:e6f2daa877de06e7f3d664fb9d340962466508050464c33f8649876bc10a43aa';

export type WebUtilisateurRow = {
  id: number;
  nom: string;
  email: string;
  mot_de_passe: string;
  password_hash: string;
  role: 'admin' | 'user';
  is_active: number;
  must_change_password: number;
  budget_mensuel: number;
  langue: string;
  created_at: string;
};

export type WebCategorieRow = {
  id: number;
  nom: string;
  icone: string;
  pourcentage_defaut: number;
  est_defaut: number;
  est_visible: number;
  est_systeme: number;
  theme: string;
};

export type WebProduitRow = {
  id: number;
  nom: string;
  marque: string;
  unite: string;
  categorie_id: number;
  created_by: number;
  photo_uri: string;
};

export type WebAchatRow = {
  id: number;
  produit_id: number | null;
  utilisateur_id: number;
  magasin_id: number | null;
  categorie_id: number | null;
  titre: string;
  prix_unitaire: number;
  quantite: number;
  prix_total: number;
  date_achat: string;
  mois: string;
  notes: string;
};

export type WebMonthlyBudgetRow = {
  id: number;
  utilisateur_id: number;
  mois: string;
  montant_total: number;
  est_evalue: number;
};

export type WebCategoryBudgetRow = {
  id: number;
  monthly_budget_id: number;
  categorie_id: number;
  montant: number;
  pourcentage: number;
};

export type WebPointsLogRow = {
  id: number;
  utilisateur_id: number;
  mois: string;
  raison: string;
  points: number;
  created_at: string;
};

export type WebReglagesPointsRow = {
  id: number;
  points_categorie_respectee: number;
  points_bonus_mensuel: number;
  points_bonus_serie: number;
  seuil_debutant: number;
  seuil_econome: number;
  seuil_expert: number;
};

class WebDatabaseStore {
  utilisateurs: WebUtilisateurRow[] = [
    {
      id: 1,
      nom: 'Administrateur',
      email: 'admin@masrouf.tn',
      mot_de_passe: '',
      password_hash: DEFAULT_ADMIN_HASH,
      role: 'admin',
      is_active: 1,
      must_change_password: 1,
      budget_mensuel: 0,
      langue: 'fr',
      created_at: '2026-11-01 10:00:00',
    },
    {
      id: 2,
      nom: 'Ahmed Ben Ali',
      email: 'user@masrouf.tn',
      mot_de_passe: '',
      password_hash: DEFAULT_USER_HASH,
      role: 'user',
      is_active: 1,
      must_change_password: 0,
      budget_mensuel: 800,
      langue: 'fr',
      created_at: '2026-11-02 14:30:00',
    },
  ];

  categories: WebCategorieRow[] = [
    { id: 1, nom: 'Alimentation', icone: '🍞', pourcentage_defaut: 25, est_defaut: 1, est_visible: 1, est_systeme: 0, theme: 'Essentiel' },
    { id: 2, nom: 'Transport', icone: '🚗', pourcentage_defaut: 10, est_defaut: 1, est_visible: 1, est_systeme: 0, theme: 'Essentiel' },
    { id: 3, nom: 'Études', icone: '📚', pourcentage_defaut: 15, est_defaut: 1, est_visible: 1, est_systeme: 0, theme: 'Essentiel' },
    { id: 4, nom: 'Vêtements et chaussures', icone: '👕', pourcentage_defaut: 8, est_defaut: 1, est_visible: 1, est_systeme: 0, theme: 'Personnel' },
    { id: 5, nom: 'Loisirs et sorties', icone: '🎮', pourcentage_defaut: 8, est_defaut: 1, est_visible: 1, est_systeme: 0, theme: 'Personnel' },
    { id: 6, nom: 'Santé', icone: '💊', pourcentage_defaut: 5, est_defaut: 1, est_visible: 1, est_systeme: 0, theme: 'Santé' },
    { id: 7, nom: 'Factures', icone: '🧾', pourcentage_defaut: 14, est_defaut: 1, est_visible: 1, est_systeme: 0, theme: 'Logement' },
    { id: 8, nom: 'Épargne', icone: '💰', pourcentage_defaut: 10, est_defaut: 1, est_visible: 1, est_systeme: 0, theme: 'Argent' },
    { id: 9, nom: 'Autres', icone: '📦', pourcentage_defaut: 5, est_defaut: 1, est_visible: 1, est_systeme: 1, theme: 'Divers' },
    { id: 10, nom: 'Restaurants et cafés', icone: '☕', pourcentage_defaut: 0, est_defaut: 0, est_visible: 1, est_systeme: 0, theme: 'Vie quotidienne' },
    { id: 11, nom: 'Téléphone et internet', icone: '📱', pourcentage_defaut: 0, est_defaut: 0, est_visible: 1, est_systeme: 0, theme: 'Vie quotidienne' },
    { id: 12, nom: 'Hygiène et soins personnels', icone: '🧼', pourcentage_defaut: 0, est_defaut: 0, est_visible: 1, est_systeme: 0, theme: 'Vie quotidienne' },
  ];

  magasins = [
    { id: 1, nom: 'Carrefour' },
    { id: 2, nom: 'Monoprix' },
    { id: 3, nom: 'Aziza' },
    { id: 4, nom: 'MG' },
    { id: 5, nom: 'Autre' },
  ];

  produits: WebProduitRow[] = [
    { id: 1, nom: 'Lait demi-écrémé', marque: 'Délice', unite: 'L', categorie_id: 1, created_by: 2, photo_uri: '' },
    { id: 2, nom: 'Pain de mie', marque: 'Sofia', unite: 'pièce', categorie_id: 1, created_by: 2, photo_uri: '' },
  ];

  achats: WebAchatRow[] = [
    {
      id: 1,
      produit_id: 1,
      utilisateur_id: 2,
      magasin_id: 1,
      categorie_id: 1,
      titre: '',
      prix_unitaire: 1.85,
      quantite: 2,
      prix_total: 3.7,
      date_achat: '2026-11-10',
      mois: '2026-11',
      notes: '',
    },
  ];

  monthly_budgets: WebMonthlyBudgetRow[] = [
    { id: 1, utilisateur_id: 2, mois: '2026-11', montant_total: 800, est_evalue: 0 },
  ];

  category_budgets: WebCategoryBudgetRow[] = [
    { id: 1, monthly_budget_id: 1, categorie_id: 1, montant: 200, pourcentage: 25 },
    { id: 2, monthly_budget_id: 1, categorie_id: 2, montant: 80, pourcentage: 10 },
  ];

  points_log: WebPointsLogRow[] = [];

  reglages_points: WebReglagesPointsRow = {
    id: 1,
    points_categorie_respectee: 10,
    points_bonus_mensuel: 50,
    points_bonus_serie: 20,
    seuil_debutant: 0,
    seuil_econome: 100,
    seuil_expert: 300,
  };

  constructor() {
    this.charger();
  }

  charger() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const d = window.localStorage.getItem('masrouf_web_v2');
        if (d) {
          const parsed = JSON.parse(d);
          if (parsed.utilisateurs) this.utilisateurs = parsed.utilisateurs;
          if (parsed.categories) this.categories = parsed.categories;
          if (parsed.magasins) this.magasins = parsed.magasins;
          if (parsed.produits) this.produits = parsed.produits;
          if (parsed.achats) this.achats = parsed.achats;
          if (parsed.monthly_budgets) this.monthly_budgets = parsed.monthly_budgets;
          if (parsed.category_budgets) this.category_budgets = parsed.category_budgets;
          if (parsed.points_log) this.points_log = parsed.points_log;
          if (parsed.reglages_points) this.reglages_points = parsed.reglages_points;
        }
      }
    } catch {}
  }

  sauvegarder() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'masrouf_web_v2',
          JSON.stringify({
            utilisateurs: this.utilisateurs,
            categories: this.categories,
            magasins: this.magasins,
            produits: this.produits,
            achats: this.achats,
            monthly_budgets: this.monthly_budgets,
            category_budgets: this.category_budgets,
            points_log: this.points_log,
            reglages_points: this.reglages_points,
          })
        );
      }
    } catch {}
  }
}

const store = new WebDatabaseStore();

export const db = {
  execSync: (_sql: string) => {},

  runSync: (sql: string, params: any[] = []): { lastInsertRowId: number; changes: number } => {
    const s = sql.toUpperCase();

    // INSERT INTO utilisateurs
    if (s.includes('INSERT INTO UTILISATEURS')) {
      const [nom, email, hash, role, isActive, mustChange, budget] = params;
      const id = (store.utilisateurs.length > 0 ? Math.max(...store.utilisateurs.map((u) => u.id)) : 0) + 1;
      store.utilisateurs.push({
        id,
        nom,
        email,
        mot_de_passe: '',
        password_hash: hash,
        role: role ?? 'user',
        is_active: isActive ?? 1,
        must_change_password: mustChange ?? 0,
        budget_mensuel: budget ?? 0,
        langue: 'fr',
        created_at: new Date().toISOString(),
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // UPDATE utilisateurs
    if (s.includes('UPDATE UTILISATEURS')) {
      if (s.includes('PASSWORD_HASH = ?')) {
        const [hash, id] = params;
        const u = store.utilisateurs.find((x) => x.id === id);
        if (u) {
          u.password_hash = hash;
          u.must_change_password = 0;
          store.sauvegarder();
        }
      } else if (s.includes('IS_ACTIVE = ?')) {
        const [active, id] = params;
        const u = store.utilisateurs.find((x) => x.id === id);
        if (u) {
          u.is_active = active;
          store.sauvegarder();
        }
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // DELETE FROM utilisateurs
    if (s.includes('DELETE FROM UTILISATEURS')) {
      const [id] = params;
      store.utilisateurs = store.utilisateurs.filter((u) => u.id !== id);
      store.achats = store.achats.filter((a) => a.utilisateur_id !== id);
      store.produits = store.produits.filter((p) => p.created_by !== id);
      store.monthly_budgets = store.monthly_budgets.filter((b) => b.utilisateur_id !== id);
      store.points_log = store.points_log.filter((p) => p.utilisateur_id !== id);
      store.sauvegarder();
      return { lastInsertRowId: 0, changes: 1 };
    }

    // INSERT INTO achats
    if (s.includes('INSERT INTO ACHATS')) {
      const [pId, uId, mId, cId, titre, pUnit, qte, pTot, mois, notes] = params;
      const id = (store.achats.length > 0 ? Math.max(...store.achats.map((a) => a.id)) : 0) + 1;
      store.achats.push({
        id,
        produit_id: pId ?? null,
        utilisateur_id: uId,
        magasin_id: mId ?? null,
        categorie_id: cId ?? null,
        titre: titre ?? '',
        prix_unitaire: pUnit,
        quantite: qte,
        prix_total: pTot,
        date_achat: new Date().toISOString().split('T')[0],
        mois,
        notes: notes ?? '',
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // INSERT INTO categories
    if (s.includes('INSERT INTO CATEGORIES')) {
      const [nom, icone, pct, def, vis, sys, theme] = params;
      const id = (store.categories.length > 0 ? Math.max(...store.categories.map((c) => c.id)) : 0) + 1;
      store.categories.push({
        id,
        nom,
        icone: icone ?? '📦',
        pourcentage_defaut: pct ?? 0,
        est_defaut: def ?? 0,
        est_visible: vis ?? 1,
        est_systeme: sys ?? 0,
        theme: theme ?? 'Divers',
      });
      store.sauvegarder();
      return { lastInsertRowId: id, changes: 1 };
    }

    // UPDATE categories
    if (s.includes('UPDATE CATEGORIES')) {
      if (s.includes('EST_VISIBLE = ?')) {
        const [vis, id] = params;
        const c = store.categories.find((x) => x.id === id);
        if (c) {
          c.est_visible = vis;
          store.sauvegarder();
        }
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    store.sauvegarder();
    return { lastInsertRowId: 0, changes: 1 };
  },

  getFirstSync: <T>(sql: string, params: any[] = []): T | null => {
    const s = sql.toUpperCase();

    // SELECT BY EMAIL
    if (s.includes('FROM UTILISATEURS WHERE EMAIL = ?')) {
      const [email] = params;
      const u = store.utilisateurs.find((x) => x.email.toLowerCase() === String(email).toLowerCase());
      return (u as unknown as T) ?? null;
    }

    // SELECT BY ID
    if (s.includes('FROM UTILISATEURS WHERE ID = ?')) {
      const [id] = params;
      const u = store.utilisateurs.find((x) => x.id === id);
      return (u as unknown as T) ?? null;
    }

    // COUNT ACTIVE ADMINS
    if (s.includes('ROLE = \'ADMIN\' AND IS_ACTIVE = 1')) {
      const count = store.utilisateurs.filter((u) => u.role === 'admin' && u.is_active === 1).length;
      return { cnt: count } as unknown as T;
    }

    // TOTAL MOIS
    if (s.includes('SUM(PRIX_TOTAL)') && s.includes('FROM ACHATS')) {
      const [userId, mois] = params;
      const total = store.achats
        .filter((a) => a.utilisateur_id === userId && a.mois === mois)
        .reduce((acc, a) => acc + a.prix_total, 0);
      return { total } as unknown as T;
    }

    // REGLAGES POINTS
    if (s.includes('FROM REGLAGES_POINTS')) {
      return store.reglages_points as unknown as T;
    }

    return null;
  },

  getAllSync: <T>(sql: string, params: any[] = []): T[] => {
    const s = sql.toUpperCase();

    if (s.includes('FROM CATEGORIES')) {
      return store.categories as unknown as T[];
    }
    if (s.includes('FROM MAGASINS')) {
      return store.magasins as unknown as T[];
    }
    if (s.includes('FROM UTILISATEURS')) {
      return store.utilisateurs as unknown as T[];
    }
    if (s.includes('FROM PRODUITS')) {
      return store.produits.map((p) => {
        const cat = store.categories.find((c) => c.id === p.categorie_id);
        return {
          ...p,
          categorie_nom: cat?.nom ?? 'Autres',
          categorie_icone: cat?.icone ?? '📦',
        };
      }) as unknown as T[];
    }
    if (s.includes('FROM ACHATS')) {
      const [userId, mois] = params;
      const items = store.achats.filter((a) => a.utilisateur_id === userId && a.mois === mois);
      return items.map((a) => {
        const prod = store.produits.find((p) => p.id === a.produit_id);
        const cat = prod
          ? store.categories.find((c) => c.id === prod.categorie_id)
          : store.categories.find((c) => c.id === a.categorie_id);
        const mag = store.magasins.find((m) => m.id === a.magasin_id);
        return {
          ...a,
          produit_nom: prod?.nom ?? a.titre ?? 'Dépense',
          produit_icone: cat?.icone ?? '📦',
          magasin_nom: mag?.nom ?? 'Non précisé',
        };
      }) as unknown as T[];
    }

    return [];
  },
};

export function initDatabase(): void {}
