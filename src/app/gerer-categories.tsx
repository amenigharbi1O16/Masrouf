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
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// Composant réutilisable de sélection de catégories avec cartes tactiles et boutons bascule
import { CategoryPicker } from '@/components/CategoryPicker';
// Modal de création et édition de catégories personnalisées
import { CustomCategoryModal } from '@/components/CustomCategoryModal';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Body, Button, Eyebrow, SectionTitle } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc)
import { colors } from '@/constants/theme';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
import type { Category } from '@/state/types';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de modification des catégories personnalisées de l'utilisateur.
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
  // État local modal création/édition de catégorie
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleOpenAdd = () => {
    setCategoryToEdit(null);
    setDeleteError('');
    setModalVisible(true);
  };

  const handleEdit = (category: Category) => {
    setCategoryToEdit(category);
    setDeleteError('');
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    const cat = db.categories.find((c) => c.id === id);
    const catName = cat?.name ?? '';

    Alert.alert(
      t('confirmer'),
      `Voulez-vous vraiment supprimer la catégorie "${catName}" ?`,
      [
        { text: t('annuler'), style: 'cancel' },
        {
          text: t('supprimer'),
          style: 'destructive',
          onPress: () => {
            const res = actions.deleteCustomCategory(id);
            if (!res.ok) {
              setDeleteError(res.error ?? t('supprimer_categorie_impossible_utilisee'));
            } else {
              setSelected((prev) => prev.filter((x) => x !== id));
            }
          },
        },
      ]
    );
  };

  const handleCategorySuccess = (cat: Category) => {
    // Si c'est une nouvelle catégorie, on la coche automatiquement
    if (!selected.includes(cat.id)) {
      setSelected((prev) => [...prev, cat.id]);
    }
  };

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

      {/* Titre de la section et bouton d'ajout de catégorie */}
      <View
        // Disposition de l'en-tête de section adaptée au sens de lecture
        style={[
          styles.headerRow,
          { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' },
        ]}
      >
        {/* Titre de section 'Vos catégories' */}
        <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left', flex: 1, marginBottom: 0 }}>
          {t('vos_categories')}
        </SectionTitle>

        <TouchableOpacity
          onPress={handleOpenAdd}
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            backgroundColor: colors.mint,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 20,
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={colors.forest} style={{ marginHorizontal: 2 }} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.forest }}>
            {t('ajouter_categorie')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Explication rassurante */}
      <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('categories_separation_explication')}
      </Body>

      {/* Alerte si tentative de suppression d'une catégorie utilisée */}
      {deleteError ? (
        <AlertBanner
          tone="danger"
          title={t('erreur')}
          detail={deleteError}
        />
      ) : null}

      {/* Composant de sélection : affiche la grille des rayons Produits et Dépenses */}
      <CategoryPicker
        categories={db.categories}
        selected={selected}
        onToggle={toggle}
        onEditCategory={handleEdit}
        onDeleteCategory={handleDelete}
      />

      {/* Modal d'ajout / modification de catégorie */}
      <CustomCategoryModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleCategorySuccess}
        categoryToEdit={categoryToEdit}
        scope="personal"
      />

      {/* Bannière d'avertissement jaune si aucune catégorie n'est cochée */}
      {selected.length === 0 ? (
        <AlertBanner
          tone="warning"
          title={t('selectionner_au_moins_une_categorie')}
        />
      ) : null}

      {/* Bouton vert forêt : enregistre la sélection */}
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

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.forest,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  addBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
});
