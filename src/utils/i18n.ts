// ============================================================
// FICHIER : src/utils/i18n.ts
// RÔLE    : Système complet de traduction et d'internationalisation.
//           Supporte 3 langues : Français (FR), Arabe (AR), Anglais (EN).
//
// CONCEPTS CLÉS :
//   1. Ressources avec qualificatifs :
//      - fr.json : ressource qualifiée pour le Français (langue de secours par défaut)
//      - ar.json : ressource qualifiée pour l'Arabe (RTL - droite à gauche)
//      - en.json : ressource qualifiée pour l'Anglais (LTR - gauche à droite)
//
//   2. Langue de secours stricte (Fallback) :
//      Si une clé de traduction est absente dans la langue choisie (ex: anglais ou arabe),
//      le système affiche TOUJOURS la traduction française correspondante,
//      jamais une clé brute ou un texte vide.
//
//   3. Persistance de la langue :
//      - Utilisateur connecté : enregistrée dans la table SQLite 'user' (colonne langue).
//      - Avant connexion : enregistrée dans le stockage persistant (SecureStore / localStorage).
//
//   4. Gestion du sens de lecture :
//      - 'ar' => RTL (Right-To-Left via I18nManager.forceRTL)
//      - 'fr' et 'en' => LTR (Left-To-Right)
// ============================================================

import { useState, useEffect } from 'react';
import { I18nManager, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Importation des 3 fichiers de ressources de traduction
import fr from '../i18n/fr.json';
import ar from '../i18n/ar.json';
import en from '../i18n/en.json';

// Contexte et fonctions de base de données
import { useAuth } from './auth';
import { updateLangue } from '../db/queries';

// ------------------------------------------------------------
// TYPE : Langues supportées par Masrouf
// ------------------------------------------------------------
export type Langue = 'fr' | 'ar' | 'en';

const PRE_LOGIN_LANG_KEY = 'masrouf_langue_pre_login';

// Dictionnaire complet des traductions qualifiées
const traductions: Record<Langue, Record<string, string>> = { fr, ar, en };

// ------------------------------------------------------------
// FONCTION : translate
// RÔLE : Traduit une clé avec langue de secours française garantie.
// ------------------------------------------------------------
export function translate(cle: string, langue: Langue): string {
  // 1. Recherche dans la langue demandée
  const texte = traductions[langue]?.[cle];
  if (texte && texte.trim().length > 0) {
    return texte;
  }

  // 2. Repli garanti sur le français
  const repliFrancais = traductions['fr']?.[cle];
  if (repliFrancais && repliFrancais.trim().length > 0) {
    return repliFrancais;
  }

  // 3. Dernier recours si même le français n'a pas la clé
  return cle;
}

// ------------------------------------------------------------
// FONCTION : appliquerDirectionLangue
// RÔLE : Configure la direction du texte (RTL pour l'arabe, LTR sinon)
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// FONCTION : getLanguePreLogin / setLanguePreLogin
// RÔLE : Mémorisation de la langue avant toute connexion d'un utilisateur
// ------------------------------------------------------------
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
  } catch {}
  return 'fr';
}

export async function setLanguePreLogin(langue: Langue): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(PRE_LOGIN_LANG_KEY, langue);
      }
    } else {
      await SecureStore.setItemAsync(PRE_LOGIN_LANG_KEY, langue);
    }
  } catch {}
}

// ------------------------------------------------------------
// HOOK : useTranslation
// RÔLE : Fournit t(), la langue active, le booléen isRTL et la fonction
//        changerLangue() avec synchronisation instantanée SQLite / stockage.
// ------------------------------------------------------------
export function useTranslation() {
  const { user, refreshUser } = useAuth();
  const [langueLocale, setLangueLocale] = useState<Langue>('fr');

  useEffect(() => {
    if (user?.langue) {
      const l = (user.langue === 'ar' || user.langue === 'en') ? user.langue : 'fr';
      setLangueLocale(l);
      appliquerDirectionLangue(l);
    } else {
      getLanguePreLogin().then((l) => {
        setLangueLocale(l);
        appliquerDirectionLangue(l);
      });
    }
  }, [user?.langue]);

  const langueActive: Langue = (
    user?.langue && (user.langue === 'ar' || user.langue === 'en' || user.langue === 'fr')
      ? user.langue
      : langueLocale
  ) as Langue;

  const changerLangue = async (nouvelleLangue: Langue) => {
    appliquerDirectionLangue(nouvelleLangue);
    await setLanguePreLogin(nouvelleLangue);
    setLangueLocale(nouvelleLangue);

    if (user) {
      updateLangue(user.id, nouvelleLangue);
      await refreshUser();
    }
  };

  return {
    t: (cle: string) => translate(cle, langueActive),
    langue: langueActive,
    isRTL: langueActive === 'ar',
    changerLangue,
  };
}
