// ============================================================
// FICHIER : src/db/database.web.ts
// RÔLE    : Moteur de base de données dédié au Web (Navigateur).
//           Remplace les appels synchrones d'expo-sqlite qui
//           bloquent le thread du navigateur (Sync operation timeout).
//
// POURQUOI CE FICHIER EXISTE :
//   Sur mobile (Android/iOS), expo-sqlite utilise le moteur C++ natif (database.ts).
//   Sur navigateur web, le JavaScript est mono-thread et les Workers
//   synchrones déclenchent souvent "Sync operation timeout".
//   React Native / Expo résout automatiquement les fichiers '.web.ts'
//   lors de l'exécution sur navigateur, garantissant une fluidité totale !
// ============================================================

// Structure des données en mémoire
type UtilisateurRow = {
  id: number;
  nom: string;
  email: string;
  mot_de_passe: string;
  role: 'admin' | 'utilisateur';
  budget_mensuel: number;
  langue: string;
  created_at: string;
};

type CategorieRow = {
  id: number;
  nom: string;
  icone: string;
};

type ProduitRow = {
  id: number;
  nom: string;
  marque: string;
  unite: string;
  categorie_id: number;
  created_by: number;
};

type MagasinRow = {
  id: number;
  nom: string;
};

type AchatRow = {
  id: number;
  produit_id: number;
  utilisateur_id: number;
  magasin_id: number | null;
  prix_unitaire: number;
  quantite: number;
  prix_total: number;
  date_achat: string;
  mois: string;
  notes: string;
};

// Stockage en mémoire (avec synchronisation localStorage sur navigateur)
class WebDatabaseStore {
  utilisateurs: UtilisateurRow[] = [
    {
      id: 1,
      nom: 'Administrateur',
      email: 'admin@masrouf.tn',
      mot_de_passe: 'admin123',
      role: 'admin',
      budget_mensuel: 0,
      langue: 'fr',
      created_at: '2026-11-01 10:00:00',
    },
    {
      id: 2,
      nom: 'Ahmed Ben Ali',
      email: 'user@masrouf.tn',
      mot_de_passe: 'user123',
      role: 'utilisateur',
      budget_mensuel: 800,
      langue: 'fr',
      created_at: '2026-11-02 14:30:00',
    },
  ];

  categories: CategorieRow[] = [
    { id: 1, nom: 'Alimentation', icone: '🍞' },
    { id: 2, nom: 'Boissons', icone: '🥤' },
    { id: 3, nom: 'Hygiène', icone: '🧼' },
    { id: 4, nom: 'Nettoyage', icone: '🧹' },
    { id: 5, nom: 'Électronique', icone: '📱' },
    { id: 6, nom: 'Vêtements', icone: '👕' },
    { id: 7, nom: 'Autre', icone: '📦' },
  ];

  magasins: MagasinRow[] = [
    { id: 1, nom: 'Carrefour' },
    { id: 2, nom: 'Monoprix' },
    { id: 3, nom: 'Aziza' },
    { id: 4, nom: 'MG' },
    { id: 5, nom: 'Autre' },
  ];

  produits: ProduitRow[] = [
    {
      id: 1,
      nom: 'Lait demi-écrémé',
      marque: 'Délice',
      unite: 'L',
      categorie_id: 2,
      created_by: 2,
    },
    {
      id: 2,
      nom: 'Pain de mie',
      marque: 'Sofia',
      unite: 'pièce',
      categorie_id: 1,
      created_by: 2,
    },
    {
      id: 3,
      nom: 'Gel douche',
      marque: 'Dove',
      unite: 'pièce',
      categorie_id: 3,
      created_by: 2,
    },
  ];

  achats: AchatRow[] = [
    {
      id: 1,
      produit_id: 1,
      utilisateur_id: 2,
      magasin_id: 1,
      prix_unitaire: 1.85,
      quantite: 2,
      prix_total: 3.7,
      date_achat: '2026-11-10',
      mois: '2026-11',
      notes: '',
    },
    {
      id: 2,
      produit_id: 2,
      utilisateur_id: 2,
      magasin_id: 1,
      prix_unitaire: 2.1,
      quantite: 1,
      prix_total: 2.1,
      date_achat: '2026-11-09',
      mois: '2026-11',
      notes: '',
    },
  ];

  constructor() {
    this.chargerDepuisStorage();
  }

  private chargerDepuisStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = window.localStorage.getItem('masrouf_web_db');
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.utilisateurs) this.utilisateurs = parsed.utilisateurs;
          if (parsed.categories) this.categories = parsed.categories;
          if (parsed.magasins) this.magasins = parsed.magasins;
          if (parsed.produits) this.produits = parsed.produits;
          if (parsed.achats) this.achats = parsed.achats;
        }
      }
    } catch {
      // Ignore les erreurs de lecture storage
    }
  }

  sauvegarder() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          'masrouf_web_db',
          JSON.stringify({
            utilisateurs: this.utilisateurs,
            categories: this.categories,
            magasins: this.magasins,
            produits: this.produits,
            achats: this.achats,
          })
        );
      }
    } catch {
      // Ignore
    }
  }
}

const store = new WebDatabaseStore();

// Objet simulant l'interface SQLite pour le Web
export const db = {
  execSync: (_sql: string) => {
    // Les CREATE TABLE etc. sont no-op sur le web
  },

  runSync: (sql: string, params: any[] = []) => {
    const sqlUpper = sql.toUpperCase();

    // INSERT INTO achats
    if (sqlUpper.includes('INSERT INTO ACHATS')) {
      const [produit_id, utilisateur_id, magasin_id, prix_unitaire, quantite, prix_total, mois, notes] = params;
      const nouvelAchat: AchatRow = {
        id: store.achats.length > 0 ? Math.max(...store.achats.map((a) => a.id)) + 1 : 1,
        produit_id,
        utilisateur_id,
        magasin_id,
        prix_unitaire,
        quantite,
        prix_total,
        date_achat: new Date().toISOString().split('T')[0],
        mois,
        notes: notes || '',
      };
      store.achats.push(nouvelAchat);
      store.sauvegarder();
      return { lastInsertRowId: nouvelAchat.id, changes: 1 };
    }

    // INSERT INTO produits
    if (sqlUpper.includes('INSERT INTO PRODUITS')) {
      const [nom, marque, unite, categorie_id, created_by] = params;
      const nouveauProd: ProduitRow = {
        id: store.produits.length > 0 ? Math.max(...store.produits.map((p) => p.id)) + 1 : 1,
        nom,
        marque,
        unite,
        categorie_id,
        created_by,
      };
      store.produits.push(nouveauProd);
      store.sauvegarder();
      return { lastInsertRowId: nouveauProd.id, changes: 1 };
    }

    // UPDATE utilisateurs SET budget_mensuel = ? WHERE id = ?
    if (sqlUpper.includes('UPDATE UTILISATEURS SET BUDGET_MENSUEL')) {
      const [budget, id] = params;
      const u = store.utilisateurs.find((x) => x.id === id);
      if (u) {
        u.budget_mensuel = budget;
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    // UPDATE utilisateurs SET langue = ? WHERE id = ?
    if (sqlUpper.includes('UPDATE UTILISATEURS SET LANGUE')) {
      const [langue, id] = params;
      const u = store.utilisateurs.find((x) => x.id === id);
      if (u) {
        u.langue = langue;
        store.sauvegarder();
      }
      return { lastInsertRowId: 0, changes: 1 };
    }

    return { lastInsertRowId: 0, changes: 0 };
  },

  getFirstSync: <T>(sql: string, params: any[] = []): T | null => {
    const sqlUpper = sql.toUpperCase();

    // SELECT * FROM utilisateurs WHERE email = ? AND mot_de_passe = ?
    if (sqlUpper.includes('FROM UTILISATEURS WHERE EMAIL = ? AND MOT_DE_PASSE = ?')) {
      const [email, mdp] = params;
      const u = store.utilisateurs.find((x) => x.email === email && x.mot_de_passe === mdp);
      return (u as unknown as T) ?? null;
    }

    // SELECT COUNT(*) FROM utilisateurs
    if (sqlUpper.includes('COUNT(*) AS CNT FROM UTILISATEURS')) {
      return { cnt: store.utilisateurs.length } as unknown as T;
    }

    // SELECT COALESCE(SUM(prix_total), 0) as total FROM achats WHERE utilisateur_id = ? AND mois = ?
    if (sqlUpper.includes('SUM(PRIX_TOTAL)') && sqlUpper.includes('FROM ACHATS')) {
      const [userId, mois] = params;
      const total = store.achats
        .filter((a) => a.utilisateur_id === userId && a.mois === mois)
        .reduce((sum, a) => sum + a.prix_total, 0);
      return { total } as unknown as T;
    }

    // SELECT p.id, ... FROM produits p ... WHERE p.id = ?
    if (sqlUpper.includes('FROM PRODUITS') && sqlUpper.includes('WHERE P.ID = ?')) {
      const [id] = params;
      const p = store.produits.find((x) => x.id === id);
      if (!p) return null;
      const cat = store.categories.find((c) => c.id === p.categorie_id);
      return {
        ...p,
        categorie_nom: cat?.nom ?? 'Autre',
        categorie_icone: cat?.icone ?? '📦',
      } as unknown as T;
    }

    return null;
  },

  getAllSync: <T>(sql: string, params: any[] = []): T[] => {
    const sqlUpper = sql.toUpperCase();

    // SELECT ... FROM categories
    if (sqlUpper.includes('FROM CATEGORIES')) {
      return store.categories as unknown as T[];
    }

    // SELECT ... FROM magasins
    if (sqlUpper.includes('FROM MAGASINS')) {
      return store.magasins as unknown as T[];
    }

    // SELECT ... FROM utilisateurs
    if (sqlUpper.includes('FROM UTILISATEURS')) {
      return store.utilisateurs as unknown as T[];
    }

    // SELECT ... FROM produits
    if (sqlUpper.includes('FROM PRODUITS P')) {
      const res = store.produits.map((p) => {
        const cat = store.categories.find((c) => c.id === p.categorie_id);
        return {
          ...p,
          categorie_nom: cat?.nom ?? 'Autre',
          categorie_icone: cat?.icone ?? '📦',
        };
      });
      return res as unknown as T[];
    }

    // SELECT ... FROM achats WHERE a.produit_id = ?
    if (sqlUpper.includes('WHERE A.PRODUIT_ID = ?')) {
      const [produitId] = params;
      const items = store.achats.filter((a) => a.produit_id === produitId);
      const res = items.map((a) => {
        const p = store.produits.find((x) => x.id === a.produit_id);
        const cat = p ? store.categories.find((c) => c.id === p.categorie_id) : null;
        const mag = store.magasins.find((m) => m.id === a.magasin_id);
        return {
          ...a,
          produit_nom: p?.nom ?? 'Produit',
          produit_icone: cat?.icone ?? '📦',
          magasin_nom: mag?.nom ?? 'Non précisé',
        };
      });
      return res as unknown as T[];
    }

    // SELECT ... FROM achats WHERE a.utilisateur_id = ? AND a.mois = ?
    if (sqlUpper.includes('FROM ACHATS A') && sqlUpper.includes('A.UTILISATEUR_ID = ?')) {
      const [userId, mois] = params;
      const items = store.achats.filter((a) => a.utilisateur_id === userId && a.mois === mois);
      const res = items.map((a) => {
        const p = store.produits.find((x) => x.id === a.produit_id);
        const cat = p ? store.categories.find((c) => c.id === p.categorie_id) : null;
        const mag = store.magasins.find((m) => m.id === a.magasin_id);
        return {
          ...a,
          produit_nom: p?.nom ?? 'Produit',
          produit_icone: cat?.icone ?? '📦',
          magasin_nom: mag?.nom ?? 'Non précisé',
        };
      });
      return res as unknown as T[];
    }

    // getDepensesParCategorie
    if (sqlUpper.includes('GROUP BY C.ID')) {
      const [userId, mois] = params;
      const userAchats = store.achats.filter((a) => a.utilisateur_id === userId && a.mois === mois);
      const groupMap: Record<number, number> = {};
      for (const a of userAchats) {
        const p = store.produits.find((x) => x.id === a.produit_id);
        if (p) {
          groupMap[p.categorie_id] = (groupMap[p.categorie_id] || 0) + a.prix_total;
        }
      }
      const res = Object.entries(groupMap).map(([catId, total]) => {
        const cat = store.categories.find((c) => c.id === Number(catId));
        return {
          categorie_nom: cat?.nom ?? 'Autre',
          categorie_icone: cat?.icone ?? '📦',
          total,
        };
      });
      return res.sort((a, b) => b.total - a.total) as unknown as T[];
    }

    return [];
  },
};

export function initDatabase(): void {
  // Déjà initialisé via le constructeur WebDatabaseStore
}

