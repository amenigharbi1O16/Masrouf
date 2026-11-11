// ============================================================
// FICHIER : src/utils/i18n.ts
// RÔLE    : Système de traduction (internationalisation) de l'app.
//           Charge le bon fichier JSON selon la langue choisie
//           par l'utilisateur (français ou arabe).
//
// CONCEPT "RESSOURCES AVEC QUALIFICATEURS" :
//   fr.json = ressource qualifiée pour la langue FRANÇAISE
//   ar.json = ressource qualifiée pour la langue ARABE
//   On charge la bonne ressource selon le qualificateur "langue".
//
// UTILISATION DANS LES ÉCRANS :
//   const { t } = useTranslation();
//   <Text>{t('budget_du_mois')}</Text>
//   → Affiche "Budget du mois" si langue = 'fr'
//   → Affiche "ميزانية الشهر"  si langue = 'ar'
// ============================================================

// Importation des deux fichiers de ressources (qualifiés par langue)
// Chaque fichier JSON est un objet clé → valeur traduite
import fr from '../i18n/fr.json';
import ar from '../i18n/ar.json';

// ----------------------------------------------------------------
// TYPE : définit les langues supportées par l'application
// 'fr' = Français  |  'ar' = Arabe
// ----------------------------------------------------------------
export type Langue = 'fr' | 'ar';

// ----------------------------------------------------------------
// DICTIONNAIRE : contient TOUTES les traductions
// Structure : { 'fr': { clé: 'valeur en français', ... },
//              'ar': { clé: 'valeur en arabe', ... } }
// ----------------------------------------------------------------
const traductions: Record<Langue, Record<string, string>> = { fr, ar };

// ----------------------------------------------------------------
// FONCTION translate()
// RÔLE : Reçoit une clé et une langue, retourne le texte traduit.
//
// Paramètres :
//   cle    = la clé dans le fichier JSON (ex: 'budget_du_mois')
//   langue = 'fr' ou 'ar'
//
// Retourne :
//   Le texte traduit OU la clé elle-même si la traduction manque
//   (comportement de secours pour éviter les écrans vides)
// ----------------------------------------------------------------
export function translate(cle: string, langue: Langue): string {
  // On accède au dictionnaire de la langue choisie
  // puis on cherche la traduction pour cette clé
  return traductions[langue]?.[cle] ?? cle;
  //                            ^^ ?? = "si null/undefined, utilise la valeur de droite"
  //                                     ici : retourne la clé elle-même comme secours
}

// ----------------------------------------------------------------
// HOOK useTranslation()
// RÔLE : Un hook React pratique qui lit la langue de l'utilisateur
//        depuis le contexte Auth et retourne une fonction t().
//
// UTILISATION DANS LES ÉCRANS :
//   const { t, langue } = useTranslation();
//   <Text>{t('accueil')}</Text>
//
// NOTE : Ce hook est défini ICI mais il importe useAuth()
//        (défini dans auth.ts). React permet cette organisation.
// ----------------------------------------------------------------
import { useAuth } from './auth';  // importe le contexte d'authentification

// Le hook retourne un objet avec :
//   t()    = fonction de traduction liée à la langue de l'utilisateur
//   langue = la langue actuelle ('fr' ou 'ar')
export function useTranslation() {
  // Récupère l'utilisateur connecté depuis le contexte Auth
  const { user } = useAuth();

  // Détermine la langue : celle de l'utilisateur OU 'fr' par défaut
  // L'opérateur 'as Langue' indique à TypeScript le type attendu
  const langue = (user?.langue ?? 'fr') as Langue;

  // Retourne un objet pratique
  return {
    // t() = raccourci pour translate() pré-configuré avec la langue
    t: (cle: string) => translate(cle, langue),
    // langue = exposée pour d'autres besoins (ex: ajuster textAlign en arabe)
    langue,
    // isRTL = true si la langue s'écrit de droite à gauche (l'arabe)
    isRTL: langue === 'ar',
  };
}

