/**
 * FICHIER : src/app/gerer-categories.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-021
 * ÉCRAN : ECRAN-USER-02 (Gestion des Catégories Suivies par l'Utilisateur)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur de modifier à tout moment la sélection des catégories
 * de courses et de dépenses qu'il souhaite suivre activement dans son tableau de bord.
 * - Réutilise le sélecteur `CategoryPicker` à bascule 'Choisir' / '✓ Sélectionné'.
 * - Préserve l'intégrité des données passées : décocher une catégorie ne supprime aucun achat historique dans SQLite.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il offre une personnalisation continue de l'expérience financière. Si les besoins du foyer
 * évoluent (ex: arrivée d'un bébé, emménagement dans un nouveau logement), l'utilisateur
 * active ou désactive les rayons concernés en un clic.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit 'Gérer les catégories' et flèche de retour arrière.
 * - Le surtitre 'CHOISISSEZ CE QUE VOUS SUIVEZ' avec une phrase explicative rassurante.
 * - La liste des catégories réparties entre 'Produits d'épicerie' et 'Dépenses fixes',
 *   avec un bouton tactile réactif à droite de chaque ligne basculant entre 'Choisir' et '✓ Sélectionné'.
 * - Une bannière d'alerte jaune si l'utilisateur décoche tout ('Sélectionnez au moins une catégorie').
 * - Un grand bouton vert 'Enregistrer les catégories (X)' affichant le nombre d'éléments sélectionnés.
 * - Un bouton secondaire clair 'Annuler'.
 */

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
// Composant réutilisable de sélection de catégories avec cartes tactiles et boutons bascule
import { CategoryPicker } from '@/components/CategoryPicker';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Body, Button, Eyebrow, SectionTitle } from '@/components/ui';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de modification des catégories personnalisées de l'utilisateur.
 *
 * RÔLE DANS L'APPLICATION :
 * Charge les catégories actuellement cochées dans le profil SQLite et enregistre les modifications.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec les deux rayons de catégories, le compteur dynamique et les boutons d'action.
 */
export default function ManageCategoriesScreen() {
  // Hook de navigation Expo Router pour revenir à l'écran précédent
  const router = useRouter();
  // Extraction des données de catalogue, du profil utilisateur et des actions
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // État local : tableau contenant les IDs des catégories actuellement sélectionnées par l'utilisateur
  const [selected, setSelected] = useState<string[]>(me?.categoryIds ?? []);

  /**
   * MISSION DE LA FONCTION :
   * Inverser l'état de sélection d'une catégorie (l'ajouter si elle était absente, la retirer si elle était présente).
   *
   * RÔLE DANS L'APPLICATION :
   * Met à jour la liste en mémoire locale avant la validation finale.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Fait basculer instantanément le texte du bouton de la catégorie entre 'Choisir' et '✓ Sélectionné',
   * et met à jour le chiffre entre parenthèses dans le bouton vert du bas.
   */
  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /**
   * MISSION DE LA FONCTION :
   * Enregistrer la liste définitive des catégories choisies dans la base SQLite locale.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.setUserCategories` qui met à jour la colonne `category_ids` du profil utilisateur,
   * puis referme l'écran.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Sauvegarde les données et revient immédiatement à l'écran précédent avec le tableau de bord actualisé.
   */
  const handleSave = () => {
    actions.setUserCategories(selected);
    router.back();
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('gerer_categories')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('choisissez_ce_que_vous_suivez')}
      </Eyebrow>

      {/* Titre de la section */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('vos_categories')}
      </SectionTitle>

      {/* Explication rassurante : décocher une catégorie ne supprime aucun historique passé */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('categories_separation_explication')}
      </Body>

      {/* Composant de sélection : affiche la grille des rayons Produits et Dépenses */}
      <CategoryPicker
        categories={db.categories}
        selected={selected}
        onToggle={toggle}
      />

      {/* Bannière d'avertissement jaune si aucune catégorie n'est cochée */}
      {selected.length === 0 ? (
        <AlertBanner
          tone="warning"
          title={t('selectionner_au_moins_une_categorie')}
        />
      ) : null}

      {/* Bouton vert forêt : enregistre la sélection et affiche le nombre de catégories actives */}
      <Button
        label={`${t('enregistrer_nb_categories')} (${selected.length})`}
        disabled={selected.length === 0}
        onPress={handleSave}
      />

      {/* Bouton secondaire clair pour annuler et revenir sans enregistrer */}
      <Button
        label={t('annuler')}
        variant="secondary"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
