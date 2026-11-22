// ============================================================
// FICHIER : src/utils/i18n.ts
// RÔLE DANS L'APPLICATION :
//   Moteur d'internationalisation et de localisation (i18n) complet pour Masrouf.
//   Permet une expérience multilingue fluide dans trois langues :
//   - Français (fr) : LTR (gauche à droite), langue de référence par défaut.
//   - Arabe (ar) : RTL (droite à gauche), écriture arabe avec réorganisation visuelle.
//   - Anglais (en) : LTR (gauche à droite), langue internationale.
//
// ANALOGIE DE LA VIE RÉELLE :
//   C'est comme un interprète assermenté trilingue présent en permanence :
//   dès que vous changez de langue sur le tableau de bord ou dans le tiroir de
//   navigation, l'interprète traduit instantanément chaque panneau, chaque bouton
//   et chaque notification, tout en réorientant le sens de lecture si nécessaire.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   1. Tous les libellés textuels visibles (titres, boutons, alertes, formulaires)
//      sont traduits à la volée via la fonction `t('cle')`.
//   2. Les catégories de dépenses et produits (ex: 'Alimentation') s'affichent
//      automatiquement en 'Food' ou en 'تغذية'.
//   3. Le sens de lecture s'adapte avec l'I18nManager pour offrir une ergonomie
//      droite-à-gauche naturelle aux utilisateurs arabophones.
// ============================================================

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, I18nManager, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Importation des 3 fichiers de ressources de traduction JSON
import fr from '../i18n/fr.json';
import ar from '../i18n/ar.json';
import en from '../i18n/en.json';

// Accès au magasin global et requêtes SQLite
import { useStore } from '../state/store';
import { updateLangue } from '../db/queries';
import { isChildrenCategory } from './categoryMatching';

// ------------------------------------------------------------
// TYPES ET DÉFINITIONS DES LANGUES (RÉ-EXPORTÉS DEPUIS languageStorage POUR ÉVITER LE CYCLE)
// ------------------------------------------------------------
// Ré-exportation du type officiel de langue
export type { Langue, LangueConfig } from './languageStorage';
// Ré-exportation des constantes et fonctions partagées
export {
  LANGUES_DISPONIBLES,
  PRE_LOGIN_LANG_KEY,
  getLanguePreLogin,
  setLanguePreLogin,
  appliquerDirectionLangue,
  getModuleLangue,
  setModuleLangue,
} from './languageStorage';
// Importation locale des éléments nécessaires au fournisseur de traduction
import {
  Langue,
  getLanguePreLogin,
  setLanguePreLogin,
  appliquerDirectionLangue,
  getModuleLangue,
  setModuleLangue,
} from './languageStorage';

// Table de correspondance des ressources de traduction
const traductions: Record<Langue, Record<string, string>> = { fr, ar, en };

/**
 * Dictionnaire multilingue complet des catégories système.
 * Permet de traduire instantanément les noms des 28 catégories prédéfinies
 * stockées sous leur clé française dans la table SQLite 'category'.
 */
const NOMS_CATEGORIES_LOCALISES: Record<string, Record<Langue, string>> = {
  'Alimentation': { fr: 'Alimentation', en: 'Food', ar: 'تغذية' },
  'Vêtements et chaussures': { fr: 'Vêtements et chaussures', en: 'Clothing and shoes', ar: 'ملابس وأحذية' },
  'Hygiène et soins': { fr: 'Hygiène et soins', en: 'Personal care', ar: 'عناية شخصية' },
  'Maison et équipement': { fr: 'Maison et équipement', en: 'Home and equipment', ar: 'منزل وتجهيزات' },
  'Matériel informatique': { fr: 'Matériel informatique', en: 'Computer equipment', ar: 'أجهزة إلكترونية' },
  'Santé et médicaments': { fr: 'Santé et médicaments', en: 'Health and medicines', ar: 'صحة وأدوية' },
  'Maison et entretien': { fr: 'Maison et entretien', en: 'Home and cleaning', ar: 'صيانة منزلية' },
  'Beauté et coiffure': { fr: 'Beauté et coiffure', en: 'Beauty and hair', ar: 'تجميل وحلاقة' },
  'Animaux': { fr: 'Animaux', en: 'Pets', ar: 'حيوانات أليفة' },

  'Transport': { fr: 'Transport', en: 'Transport', ar: 'نقل ومواصلات' },
  'Factures': { fr: 'Factures', en: 'Bills', ar: 'فواتير' },
  'Éducation': { fr: 'Éducation', en: 'Education', ar: 'تعليم' },
  'Loisirs': { fr: 'Loisirs', en: 'Entertainment', ar: 'ترفيه' },
  'Enfant': { fr: 'Enfant', en: 'Children', ar: 'أطفال' },
  'Enfants': { fr: 'Enfant', en: 'Children', ar: 'أطفال' },
  'Children': { fr: 'Enfant', en: 'Children', ar: 'أطفال' },
  'Child': { fr: 'Enfant', en: 'Children', ar: 'أطفال' },
  'Aide familiale': { fr: 'Aide familiale', en: 'Family support', ar: 'مساعدة عائلية' },
  'Épargne': { fr: 'Épargne', en: 'Savings', ar: 'ادخار' },
  'Dons': { fr: 'Dons', en: 'Donations', ar: 'تبرعات' },
  'Frais bancaires': { fr: 'Frais bancaires', en: 'Bank fees', ar: 'رسوم بنكية' },
  'Autres': { fr: 'Autres', en: 'Other', ar: 'أخرى' },
  'Restaurants et cafés': { fr: 'Restaurants et cafés', en: 'Restaurants and cafés', ar: 'مطاعم ومقاهي' },
  'Téléphone et internet': { fr: 'Téléphone et internet', en: 'Phone and internet', ar: 'هاتف وإنترنت' },
  'Loyer': { fr: 'Loyer', en: 'Rent', ar: 'إيجار' },
  'Formations et cours en ligne': { fr: 'Formations et cours en ligne', en: 'Online courses and training', ar: 'دورات تدريبية' },
  'Sport et abonnements': { fr: 'Sport et abonnements', en: 'Sports and subscriptions', ar: 'رياضة واشتراكات' },
  'Voyages': { fr: 'Voyages', en: 'Travel', ar: 'سفر ورحلات' },
  'Cadeaux et fêtes': { fr: 'Cadeaux et fêtes', en: 'Gifts and celebrations', ar: 'هدايا ومناسبات' },
  'Dettes et remboursements': { fr: 'Dettes et remboursements', en: 'Debts and repayments', ar: 'ديون وتسديدات' },
  'Imprévus': { fr: 'Imprévus', en: 'Unexpected', ar: 'طوارئ' },
};

/**
 * MISSION DE LA FONCTION : traduireNomCategorie
 *   Convertit le nom clé d'une catégorie (ex: 'Alimentation') vers le texte localisé
 *   dans la langue courante (ex: 'تغذية' en arabe ou 'Food' en anglais).
 */
export function traduireNomCategorie(nom: string, langue: Langue): string {
  if (isChildrenCategory(nom)) {
    return langue === 'ar' ? 'أطفال' : langue === 'en' ? 'Children' : 'Enfant';
  }
  const match = NOMS_CATEGORIES_LOCALISES[nom];
  if (match && match[langue]) {
    return match[langue];
  }
  return nom;
}

/**
 * Traduit un nom de niveau de gamification (Beginner, Saver, Expert) dans la langue active.
 */
export function traduireNiveau(niveau: string, langue: Langue): string {
  const n = (niveau || '').toLowerCase();
  if (n === 'beginner' || n === 'débutant' || n === 'debutant' || n === 'apprenti') {
    return langue === 'ar' ? 'مبتدئ' : langue === 'en' ? 'Beginner' : 'Débutant';
  }
  if (n === 'saver' || n === 'économe' || n === 'econome') {
    return langue === 'ar' ? 'مقتصد' : langue === 'en' ? 'Saver' : 'Économe';
  }
  if (n === 'expert') {
    return langue === 'ar' ? 'خبير' : 'Expert';
  }
  return niveau;
}

/**
 * MISSION DE LA FONCTION : translate
 *   Recherche la valeur d'une clé textuelle dans le fichier de langue actif, avec
 *   remplacement dynamique de paramètres ({nom}, {montant}, etc.) et repli automatique
 *   sur le français si la clé manque dans la langue active.
 */
export function translate(
  cle: string,
  langue: Langue,
  params?: Record<string, string | number>
): string {
  // 1. Recherche dans la langue demandée par l'utilisateur
  let texte = traductions[langue]?.[cle];

  // 2. Repli de sécurité garanti sur le français si la clé est absente ou vide
  if (!texte || texte.trim().length === 0) {
    texte = traductions['fr']?.[cle];
  }

  // 3. Repli de dernier recours absolu : renvoie la clé brute si absente de tous les fichiers
  if (!texte) {
    return cle;
  }

  // 4. Interpolation dynamique des paramètres {nomParam}
  if (params) {
    for (const [paramKey, val] of Object.entries(params)) {
      texte = texte.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
    }
  }

  return texte;
}

// ------------------------------------------------------------
// CONTEXTE ET FOURNISSEUR GLOBAL DE LANGUE (REACT CONTEXT)
// ------------------------------------------------------------

export interface LanguageContextType {
  /** Code ISO de la langue actuellement active ('fr', 'ar', 'en') */
  langue: Langue;
  /** Indicateur booléen vrai si la langue active s'écrit de droite à gauche (arabe) */
  isRTL: boolean;
  /** Fonction asynchrone basculant la langue de l'application et propageant le changement */
  changerLangue: (nouvelleLangue: Langue) => Promise<void>;
  /** Fonction de traduction d'une clé i18n avec interpolation dynamique de paramètres */
  t: (cle: string, params?: Record<string, string | number>) => string;
  /** Traduit le libellé d'une catégorie financière dans la langue courante */
  traduireCategorie: (nom: string) => string;
  /** Traduit le nom d'un palier de points (Débutant, Économe, Expert) */
  traduireNiveau: (niveau: string) => string;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

/**
 * MISSION DU COMPOSANT : LanguageProvider
 *   Fournisseur global d'internationalisation réactive.
 *   Enveloppe l'application entière pour garantir qu'un clic sur une langue
 *   bascule DIRECTEMENT et SYNCHRONIQUEMENT tous les écrans, tiroirs, formulaires
 *   et composants sans délai ni besoin de recharger l'application.
 */
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { me, actions } = useStore();
  const [langue, setLangueState] = useState<Langue>(() => {
    if (me?.langue && (me.langue === 'fr' || me.langue === 'ar' || me.langue === 'en')) {
      return me.langue;
    }
    return getModuleLangue();
  });

  // 1. Initialisation réactive au montage
  useEffect(() => {
    let active = true;
    (async () => {
      // Priorité 1 : préférence de l'utilisateur connecté dans SQLite
      if (me?.langue && (me.langue === 'fr' || me.langue === 'ar' || me.langue === 'en')) {
        if (active) {
          setLangueState(me.langue);
          setModuleLangue(me.langue);
          appliquerDirectionLangue(me.langue);
        }
        return;
      }
      // Priorité 2 : préférence persistée en local (SecureStore / localStorage)
      const saved = await getLanguePreLogin();
      if (active && saved) {
        setLangueState(saved);
        setModuleLangue(saved);
        appliquerDirectionLangue(saved);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // 2. Synchronisation quand l'utilisateur change ou se connecte
  useEffect(() => {
    if (me?.langue && (me.langue === 'fr' || me.langue === 'ar' || me.langue === 'en')) {
      if (me.langue !== langue) {
        setLangueState(me.langue);
        setModuleLangue(me.langue);
        appliquerDirectionLangue(me.langue);
      }
    }
  }, [me?.langue]);

  // 3. Bascule fluide, immédiate et globale de la langue
  const changerLangue = useCallback(
    async (nouvelleLangue: Langue) => {
      // Étape 1 : Mise à jour synchrone de l'état React global -> tous les écrans se re-rendent directement
      setModuleLangue(nouvelleLangue);
      setLangueState(nouvelleLangue);

      // Étape 2 : Application du sens de lecture
      appliquerDirectionLangue(nouvelleLangue);

      // Étape 3 : Persistance locale asynchrone (SecureStore sur mobile, localStorage sur web)
      try {
        await setLanguePreLogin(nouvelleLangue);
      } catch { }

      // Étape 4 : Si un utilisateur est connecté, synchronisation immédiate SQLite et store
      if (me) {
        try {
          updateLangue(Number(me.id) || 1, nouvelleLangue);
        } catch { }
        try {
          actions.setLanguage(nouvelleLangue);
        } catch { }
      }
    },
    [me, actions]
  );

  // Calcul réactif de l'indicateur RTL : vrai uniquement si l'arabe est sélectionné
  const isRTL = langue === 'ar';

  // Mémoïsation de l'objet de contexte pour éviter les rendus inutiles des consommateurs
  const value = useMemo<LanguageContextType>(
    () => ({
      langue,
      isRTL,
      changerLangue,
  /** Fonction de traduction d'une clé i18n avec interpolation dynamique de paramètres */
      t: (cle: string, params?: Record<string, string | number>) => translate(cle, langue, params),
      traduireCategorie: (nom: string) => traduireNomCategorie(nom, langue),
      traduireNiveau: (niveau: string) => traduireNiveau(niveau, langue),
    }),
    [langue, isRTL, changerLangue]
  );

  return React.createElement(LanguageContext.Provider, { value }, children);
}

/**
 * MISSION DE LA FONCTION : useTranslation
 *   Hook React personnalisé fournissant tous les outils de traduction et de gestion
 *   de langue à n'importe quel composant de l'application.
 *   Consomme le LanguageContext global pour une synchronisation directe dans 100% de l'application.
 */
export function useTranslation(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (ctx) {
    return ctx;
  }
  // Repli sécurisé pour exécution hors LanguageProvider (ex: tests automatisés)
  const fallbackLangue = getModuleLangue();
  const isRTL = fallbackLangue === 'ar';
  return {
    langue: fallbackLangue,
    isRTL,
    changerLangue: async (nouvelleLangue: Langue) => {
      setModuleLangue(nouvelleLangue);
      appliquerDirectionLangue(nouvelleLangue);
      await setLanguePreLogin(nouvelleLangue);
    },
  /** Fonction de traduction d'une clé i18n avec interpolation dynamique de paramètres */
    t: (cle: string, params?: Record<string, string | number>) => translate(cle, getModuleLangue(), params),
    traduireCategorie: (nom: string) => traduireNomCategorie(nom, getModuleLangue()),
    traduireNiveau: (niveau: string) => traduireNiveau(niveau, getModuleLangue()),
  };
}
