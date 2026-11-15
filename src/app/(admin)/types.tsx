/**
 * FICHIER : src/app/(admin)/types.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-008
 * ÉCRAN : ECRAN-ADM-03 (Gestion des Types de Catégories)
 *
 * MISSION DU FICHIER :
 * Permettre à l'administrateur de personnaliser les libellés et les descriptions
 * des deux types fondamentaux de dépenses reconnus par Masrouf :
 * 1. Les Produits d'épicerie (`product`) : articles achetés avec quantité, magasin et calcul de prix unitaire.
 * 2. Les Dépenses directes (`expense`) : charges fixes et factures (loyer, électricité, abonnement) sans détail au kilo.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il permet d'adapter le vocabulaire métier affiché aux utilisateurs pour rendre l'application
 * encore plus intuitive et pédagogique selon les retours d'expérience.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand titre 'Types de catégories' avec le surtitre 'PRODUITS ET DÉPENSES DISTINCTS'.
 * - Deux blocs de formulaire verticaux bien distincts :
 *   1. Bloc Produit : champ 'Nom affiché' et champ 'Description'.
 *   2. Bloc Dépense : champ 'Nom affiché' et champ 'Description'.
 * - Une bannière verte de confirmation 'Types de catégories enregistrés' après validation.
 * - Un bouton vert d'action 'Enregistrer les modifications'.
 * - Un bouton secondaire clair 'Retour à la vue d'ensemble'.
 */

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
// Composant conteneur d'écran avec marges physiques et barre de statut
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer le formulaire d'édition des types de catégories.
 *
 * RÔLE DANS L'APPLICATION :
 * Permet la modification textuelle des descripteurs de types enregistrés en base SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec les 4 champs de saisie (2 par type), les messages de confirmation et les boutons.
 */
export default function AdminCategoryTypesScreen() {
  // Hook de navigation Expo Router pour changer d'écran
  const router = useRouter();
  // Extraction des types de catégories depuis la base et de l'action de sauvegarde
  const { db, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // État local : copie modifiable de la liste des types chargés depuis SQLite
  const [types, setTypes] = useState(db.categoryTypes);
  // État local : indique si les modifications ont été enregistrées avec succès
  const [saved, setSaved] = useState(false);

  /**
   * MISSION DE LA FONCTION :
   * Mettre à jour une propriété ('label' ou 'description') d'un type spécifique dans l'état local.
   *
   * RÔLE DANS L'APPLICATION :
   * Conserve les modifications saisies au clavier par l'administrateur sans toucher à SQLite avant confirmation.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Répercute en temps réel le texte tapé dans le champ correspondant et masque la bannière verte de succès précédente.
   */
  const set = (i: number, patch: Partial<(typeof types)[number]>) => {
    setTypes((prev) =>
      prev.map((item, j) => (j === i ? { ...item, ...patch } : item))
    );
    setSaved(false);
  };

  /**
   * MISSION DE LA FONCTION :
   * Persister les nouveaux libellés des types dans la base de données SQLite.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.updateCategoryTypes` qui exécute la mise à jour SQL.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * Affiche la bannière verte de succès 'Types de catégories enregistrés'.
   */
  const handleSave = () => {
    // Nettoyage des espaces superflus et écriture en base
    actions.updateCategoryTypes(
      types.map((typeItem) => ({
        ...typeItem,
        label: typeItem.label.trim(),
      }))
    );
    // Affichage de la confirmation verte
    setSaved(true);
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('types_de_categories')}>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('produits_depenses_distincts')}
      </Eyebrow>

      {/* Boucle de rendu générant un bloc d'édition pour chacun des 2 types fondamentaux */}
      {types.map((typeItem, i) => (
        <React.Fragment key={typeItem.kind}>
          {/* Titre du bloc : 'Produits' ou 'Dépenses' */}
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {typeItem.kind === 'product'
              ? t('type_produit_label')
              : t('type_depense_label')}
          </SectionTitle>

          {/* Champ de saisie pour modifier le titre visible du type */}
          <Input
            label={t('nom_affiche')}
            value={typeItem.label}
            onChangeText={(v) => set(i, { label: v })}
            autoCapitalize="words"
          />

          {/* Champ de saisie pour modifier la phrase explicative d'aide */}
          <Input
            label={t('description')}
            value={typeItem.description}
            onChangeText={(v) => set(i, { description: v })}
            autoCapitalize="sentences"
          />
        </React.Fragment>
      ))}

      {/* Bannière de confirmation verte affichée après la validation */}
      {saved ? (
        <AlertBanner tone="success" title={t('types_categories_enregistres')} />
      ) : null}

      {/* Bouton d'enregistrement vert : désactivé si l'un des libellés est entièrement vide */}
      <Button
        label={t('enregistrer_modifications')}
        disabled={types.some((typeItem) => !typeItem.label.trim())}
        onPress={handleSave}
      />

      {/* Bouton secondaire clair : permet de repartir vers le tableau de bord administrateur */}
      <Button
        label={t('retour_vue_ensemble')}
        variant="secondary"
        onPress={() => router.navigate('/(admin)/dashboard')}
      />
    </Screen>
  );
}
