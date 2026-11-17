// ============================================================
// FICHIER : src/utils/languageStorage.ts
// RÔLE DANS L'APPLICATION :
//   Module indépendant de gestion et de persistance du choix de langue.
//   Ce module est extrait pour briser le cycle de dépendances circulaires
//   (Require cycle) entre le store global (store.tsx) et le moteur de traduction (i18n.ts).
//
// ANALOGIE DE LA VIE RÉELLE :
//   Comme un badge d'identification linguistique neutre :
//   plutôt que le magasin central et l'interprète s'interrogent mutuellement en boucle,
//   ils consultent tous deux ce registre indépendant pour savoir en quelle langue parler.
//
// IMPACT DANS L'INTERFACE UTILISATEUR :
//   Permet de mémoriser durablement la langue choisie par l'utilisateur
//   (français, anglais, arabe) dès l'écran d'accueil/connexion, d'orienter
//   le sens de l'interface (LTR pour le français/anglais, RTL pour l'arabe)
//   sans aucun avertissement "Require cycle" dans la console Metro.
// ============================================================

// Détection de la plateforme d'exécution (Android, iOS ou Web)
import { I18nManager, Platform } from 'react-native';
// Coffre-fort sécurisé natif sur mobile pour persister la langue choisie
import * as SecureStore from 'expo-secure-store';

// Type représentant les trois langues officielles supportées par Masrouf
export type Langue = 'fr' | 'ar' | 'en';

// Structure de description d'une langue avec son nom natif et son orientation RTL
export interface LangueConfig {
  // Code identifiant de la langue (fr, ar, en)
  code: Langue;
  // Nom de la langue dans sa propre langue (ex: Français, العربية, English)
  nomNatif: string;
  // Indique si la langue s'écrit de droite à gauche (vrai pour l'arabe)
  isRTL: boolean;
}

// Liste officielle des trois langues proposées à l'utilisateur dans l'interface
export const LANGUES_DISPONIBLES: LangueConfig[] = [
  // Option 1 : Français (de gauche à droite)
  { code: 'fr', nomNatif: 'Français', isRTL: false },
  // Option 2 : Arabe (de droite à gauche avec inversion d'interface)
  { code: 'ar', nomNatif: 'العربية', isRTL: true },
  // Option 3 : Anglais (de gauche à droite)
  { code: 'en', nomNatif: 'English', isRTL: false },
];

// Clé de stockage sécurisé pour sauvegarder la langue choisie avant toute connexion
export const PRE_LOGIN_LANG_KEY = 'masrouf_langue_pre_login';

// Variable de module réactive mémorisant en mémoire vive la langue active
let moduleLangue: Langue = 'fr';

/**
 * MISSION DE LA FONCTION : getModuleLangue
 *   Lit la valeur actuelle de la langue active stockée en mémoire synchrone.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet aux fonctions utilitaires hors composants React d'accéder à la langue.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Fournit la langue pour formater les devises (DT), dates et libellés.
 */
export function getModuleLangue(): Langue {
  // Renvoie le code de langue mémorisé (fr, ar, en)
  return moduleLangue;
}

/**
 * MISSION DE LA FONCTION : setModuleLangue
 *   Met à jour la variable de mémoire vive de la langue active.
 *
 * RÔLE DANS L'APPLICATION :
 *   Synchronise immédiatement l'état global lorsqu'un changement de langue survient.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Prépare la mise à jour des prochains libellés textuels affichés.
 */
export function setModuleLangue(nouvelleLangue: Langue): void {
  // Affecte la nouvelle langue en mémoire
  moduleLangue = nouvelleLangue;
}

/**
 * MISSION DE LA FONCTION : appliquerDirectionLangue
 *   Configure le sens d'affichage global du moteur React Native (LTR vs RTL) via I18nManager.
 *
 * RÔLE DANS L'APPLICATION :
 *   Indique au moteur de rendu si l'interface doit s'aligner à droite ou à gauche.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Lorsque l'arabe est sélectionné, bascule le tiroir latéral à droite et les textes à droite.
 *   Pour le français ou l'anglais, maintient le tiroir à gauche et les textes à gauche.
 */
export function appliquerDirectionLangue(langue: Langue): void {
  // L'arabe est la seule langue s'écrivant de droite à gauche
  const isRTL = langue === 'ar';
  try {
    // Vérifie si le statut RTL actuel diffère du statut souhaité
    if (I18nManager.isRTL !== isRTL) {
      // Autorise le basculement RTL au niveau du système
      I18nManager.allowRTL(isRTL);
      // Force l'alignement RTL ou LTR selon la langue
      I18nManager.forceRTL(isRTL);
    }
  } catch (e) {
    // Avertissement discret si la plateforme ne supporte pas l'ajustement dynamique
    console.warn('[languageStorage] Ajustement RTL non supporté sur cette plateforme :', e);
  }
}

/**
 * MISSION DE LA FONCTION : getLanguePreLogin
 *   Récupère de manière sécurisée la langue choisie par l'utilisateur avant sa connexion.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet à l'écran de bienvenue, de connexion et d'inscription d'apparaître
 *   directement dans la langue préférée de l'utilisateur sans repasser par le français par défaut.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Affiche les formulaires d'accueil dans la langue préalablement sélectionnée.
 */
export async function getLanguePreLogin(): Promise<Langue> {
  try {
    // Variable recevant la valeur brute persistée
    let val: string | null = null;
    // Sur navigateur Web, lecture depuis localStorage
    if (Platform.OS === 'web') {
      // Vérification de la disponibilité de la fenêtre de navigation
      if (typeof window !== 'undefined' && window.localStorage) {
        // Lecture de la clé de stockage
        val = window.localStorage.getItem(PRE_LOGIN_LANG_KEY);
      }
    } else {
      // Sur smartphone Android ou iOS, lecture du coffre sécurisé natif
      val = await SecureStore.getItemAsync(PRE_LOGIN_LANG_KEY);
    }
    // Validation que la valeur lue correspond bien à l'une des trois langues autorisées
    if (val === 'fr' || val === 'ar' || val === 'en') {
      // Renvoie la langue persistée
      return val;
    }
  } catch {
    // En cas d'erreur de lecture, aucune interruption
  }
  // Repli par défaut sur le français si aucune valeur valide n'a été enregistrée
  return 'fr';
}

/**
 * MISSION DE LA FONCTION : setLanguePreLogin
 *   Enregistre de manière durable la langue choisie dans le stockage sécurisé de l'appareil.
 *
 * RÔLE DANS L'APPLICATION :
 *   Garantit que la sélection de langue persiste même après fermeture ou rechargement de l'application.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   Permet aux prochains écrans et sessions de conserver fidèlement la langue choisie.
 */
export async function setLanguePreLogin(langue: Langue): Promise<void> {
  try {
    // Sur navigateur Web, écriture dans localStorage
    if (Platform.OS === 'web') {
      // Vérification de l'environnement navigateur
      if (typeof window !== 'undefined' && window.localStorage) {
        // Écriture de la clé
        window.localStorage.setItem(PRE_LOGIN_LANG_KEY, langue);
      }
    } else {
      // Sur smartphone Android ou iOS, écriture dans SecureStore
      await SecureStore.setItemAsync(PRE_LOGIN_LANG_KEY, langue);
    }
  } catch {
    // Tolérance d'échec pour ne jamais bloquer l'interface
  }
}
