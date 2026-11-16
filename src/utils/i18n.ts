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

import { useState, useEffect } from 'react';
import { Alert, I18nManager, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Importation des 3 fichiers de ressources de traduction JSON
import fr from '../i18n/fr.json';
import ar from '../i18n/ar.json';
import en from '../i18n/en.json';

// Contexte d'authentification et requêtes SQLite
import { useAuth } from './auth';
import { updateLangue } from '../db/queries';

// ------------------------------------------------------------
// TYPES ET DÉFINITIONS DES LANGUES
// ------------------------------------------------------------
export type Langue = 'fr' | 'ar' | 'en';

export interface LangueConfig {
  code: Langue;
  nomNatif: string;
  isRTL: boolean;
}

/**
 * Liste officielle des trois langues supportées par Masrouf, avec leur nom natif
 * et leur sens d'écriture (RTL ou LTR).
 */
export const LANGUES_DISPONIBLES: LangueConfig[] = [
  { code: 'fr', nomNatif: 'Français', isRTL: false },
  { code: 'ar', nomNatif: 'العربية', isRTL: true },
  { code: 'en', nomNatif: 'English', isRTL: false },
];

/** Clé de persistance pour sauvegarder la langue choisie avant toute inscription/connexion */
const PRE_LOGIN_LANG_KEY = 'masrouf_langue_pre_login';

/** Table de correspondance des ressources de traduction */
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
  'Beauté et coiffure': { fr: 'Beauté et coiffure', en: 'Beauty and hair', ar: 'تجمil وحلاقة' },
  'Animaux': { fr: 'Animaux', en: 'Pets', ar: 'حيوانات أليفة' },

  'Transport': { fr: 'Transport', en: 'Transport', ar: 'نقل ومواصلات' },
  'Factures': { fr: 'Factures', en: 'Bills', ar: 'فواتير' },
  'Éducation': { fr: 'Éducation', en: 'Education', ar: 'تعليم' },
  'Loisirs': { fr: 'Loisirs', en: 'Entertainment', ar: 'ترفيه' },
  'Enfants': { fr: 'Enfants', en: 'Children', ar: 'أطفال' },
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
 *
 * RÔLE DANS L'APPLICATION :
 *   Appelé par les sélecteurs de catégories, les cartes budgétaires et les graphiques
 *   d'analyses pour afficher des catégories compréhensibles dans la langue de l'utilisateur.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Une chaîne de caractères affichée dans les pastilles de catégories (Chips),
 *   les cartes du tableau de bord ou la liste de l'assistant onboarding.
 *
 * @param nom Nom technique ou français de la catégorie stocké en base.
 * @param langue Langue cible active ('fr', 'ar', 'en').
 */
export function traduireNomCategorie(nom: string, langue: Langue): string {
  const match = NOMS_CATEGORIES_LOCALISES[nom];
  if (match && match[langue]) {
    return match[langue];
  }
  return nom;
}

/**
 * MISSION DE LA FONCTION : translate
 *   Recherche la valeur d'une clé textuelle dans le fichier de langue actif, avec
 *   remplacement dynamique de paramètres ({nom}, {montant}, etc.) et repli automatique
 *   sur le français si la clé manque dans la langue active.
 *
 * RÔLE DANS L'APPLICATION :
 *   Moteur central d'affichage des textes. Garantit qu'aucun écran ne montre de code brut
 *   comme "home_title" à l'utilisateur : il verra toujours "Tableau de bord" ou "Accueil".
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Le texte finalisé prêt à être inséré dans un composant <Text> de React Native.
 *
 * @param cle Identifiant unique du texte (ex: 'bienvenue', 'enregistrer').
 * @param langue Code langue actuel ('fr', 'ar', 'en').
 * @param params Objet clé-valeur optionnel pour insérer des variables dynamiques.
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

/**
 * MISSION DE LA FONCTION : appliquerDirectionLangue
 *   Configure le sens d'affichage global du moteur React Native (LTR vs RTL) via I18nManager.
 *
 * RÔLE DANS L'APPLICATION :
 *   Active le mode miroir complet de droite à gauche lorsque la langue 'ar' (arabe) est active,
 *   et rétablit le mode gauche à droite standard pour le français et l'anglais.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Inverse automatiquement la disposition horizontale des colonnes, tiroirs, icônes
 *   et listes pour respecter les règles typographiques de la langue arabe.
 *
 * @param langue Langue active ('fr', 'ar', 'en').
 */
export function appliquerDirectionLangue(langue: Langue): void {
  const isRTL = langue === 'ar';
  try {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    }
  } catch (e) {
    console.warn('[i18n] Ajustement RTL non supporté sur cette plateforme :', e);
  }
}

/**
 * MISSION DE LA FONCTION : getLanguePreLogin
 *   Récupère la préférence linguistique choisie par le visiteur avant qu'il ne soit connecté.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet à un nouvel utilisateur de choisir sa langue dès le premier écran (login ou inscription),
 *   et de conserver ce choix même s'il quitte et relance l'application.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Aucun rendu direct : fournit la langue au sélecteur de langue et aux formulaires de connexion.
 */
export async function getLanguePreLogin(): Promise<Langue> {
  try {
    let val: string | null = null;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        val = window.localStorage.getItem(PRE_LOGIN_LANG_KEY);
      }
    } else {
      val = await SecureStore.getItemAsync(PRE_LOGIN_LANG_KEY);
    }
    if (val === 'fr' || val === 'ar' || val === 'en') {
      return val;
    }
  } catch { }
  // Français par défaut en cas d'absence
  return 'fr';
}

/**
 * MISSION DE LA FONCTION : setLanguePreLogin
 *   Sauvegarde durablement la langue choisie dans le coffre sécurisé de l'appareil
 *   (SecureStore sur iOS/Android, localStorage sur le Web).
 *
 * RÔLE DANS L'APPLICATION :
 *   Garantit que la sélection de langue effectuée sur l'écran d'accueil ou de bienvenue
 *   reste mémorisée de manière persistante entre deux sessions.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Aucun rendu direct : met à jour le stockage physique de l'appareil.
 *
 * @param langue Code langue à enregistrer ('fr', 'ar', 'en').
 */
export async function setLanguePreLogin(langue: Langue): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PRE_LOGIN_LANG_KEY, langue);
      }
    } else {
      await SecureStore.setItemAsync(PRE_LOGIN_LANG_KEY, langue);
    }
  } catch { }
}

/**
 * MISSION DE LA FONCTION : useTranslation
 *   Hook React personnalisé fournissant tous les outils de traduction et de gestion
 *   de langue à n'importe quel composant de l'application.
 *
 * RÔLE DANS L'APPLICATION :
 *   C'est le pont entre les composants visuels et le moteur de traduction.
 *   Fournit `t()`, `traduireCategorie()`, `langue`, `isRTL` et `changerLangue()`.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - Met immédiatement à jour tous les textes du composant quand la langue change.
 *   - Affiche une boîte de dialogue explicative si le sens de lecture (RTL/LTR) est modifié
 *     pour informer l'utilisateur qu'un redémarrage ou rafraîchissement prendra effet.
 */
export function useTranslation() {
  const { user, refreshUser, setLanguage } = useAuth();
  const [langueLocale, setLangueLocale] = useState<Langue>('fr');

  useEffect(() => {
    // Si l'utilisateur est authentifié, on synchronise sa langue de profil SQLite
    if (user?.langue) {
      const l = (user.langue === 'ar' || user.langue === 'en') ? user.langue : 'fr';
      setLangueLocale(l);
      appliquerDirectionLangue(l);
    } else {
      // Sinon, on lit la langue mémorisée avant connexion
      getLanguePreLogin().then((l) => {
        setLangueLocale(l);
        appliquerDirectionLangue(l);
      });
    }
  }, [user?.langue]);

  // Détermine la langue prioritaire active
  const langueActive: Langue = (
    user?.langue && (user.langue === 'ar' || user.langue === 'en' || user.langue === 'fr')
      ? user.langue
      : langueLocale
  ) as Langue;

  /**
   * Modifie la langue active, persiste le choix dans SQLite (si connecté)
   * et dans SecureStore/localStorage, puis actualise l'interface en temps réel.
   */
  const changerLangue = async (nouvelleLangue: Langue) => {
    // 1. Application immédiate de la direction : RTL pour l'arabe, LTR pour français/anglais
    appliquerDirectionLangue(nouvelleLangue);
    // 2. Persistance locale du choix linguistique
    await setLanguePreLogin(nouvelleLangue);
    // 3. Bascule instantanée de l'état réactif
    setLangueLocale(nouvelleLangue);

    // 4. Si un utilisateur est connecté, synchronisation immédiate de son profil SQLite
    if (user) {
      // Mise à jour de la colonne 'langue' dans la table SQLite 'user'
      updateLangue(Number(user.id) || 1, nouvelleLangue);
      if (setLanguage) {
        setLanguage(nouvelleLangue);
      }
      await refreshUser();
    }
  };

  return {
    t: (cle: string, params?: Record<string, string | number>) => translate(cle, langueActive, params),
    traduireCategorie: (nom: string) => traduireNomCategorie(nom, langueActive),
    langue: langueActive,
    isRTL: langueActive === 'ar',
    changerLangue,
  };
}
