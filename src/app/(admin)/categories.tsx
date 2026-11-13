// ============================================================
// FICHIER : src/app/(admin)/categories.tsx
// RÔLE    : Gestion des catégories administratives — Design Figma 39, 40 & 41.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN :
//   • Header : ☰ hamburger + "Gestion des catégories" + profil
//   • Label "ADMINISTRATEUR · X CATÉGORIES" (muted, uppercase)
//   • Section "Catégories de produits" :
//       - Lignes : Nom de la catégorie  Produit
//   • Section "Catégories de dépenses" :
//       - Lignes : Nom de la catégorie  Dépense
//   • Formulaire d'ajout en bas :
//       - Carte blanche "Nom de la catégorie"
//       - Carte blanche "Type de catégorie" (sélecteur Produit / Dépense)
//       - Bouton primary forest : "Enregistrer la catégorie"
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getAllCategories,
  addCategoryAdmin,
  Categorie,
} from '../../db/queries';

// Design System & Contexte
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useAdminDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

export default function AdminCategoriesScreen() {
  const { user: adminConnecte } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useAdminDrawer();

  const [categories, setCategories] = useState<Categorie[]>([]);
  const [nom, setNom] = useState<string>('');
  const [type, setType] = useState<'product' | 'expense'>('product');

  const recharger = useCallback(() => {
    const list = getAllCategories(false);
    setCategories(list);
  }, []);

  useFocusEffect(recharger);

  const categoriesProduit = categories.filter((c) => c.type === 'product' || !c.type);
  const categoriesDepense = categories.filter((c) => c.type === 'expense');

  // Enregistrement d'une nouvelle catégorie
  function handleAjouter() {
    const nomClean = nom.trim();
    if (!nomClean) {
      Alert.alert(t('erreur') ?? 'Attention', 'Le nom de la catégorie est obligatoire.');
      return;
    }

    const existe = categories.some(
      (c) => c.nom.localeCompare(nomClean, undefined, { sensitivity: 'accent' }) === 0
    );

    if (existe) {
      Alert.alert('Doublon', 'Une catégorie portant ce nom existe déjà.');
      return;
    }

    addCategoryAdmin(
      nomClean,
      type === 'product' ? '🛍️' : '💳',
      0,
      'Général',
      type,
      adminConnecte?.id
    );

    setNom('');
    recharger();
    Alert.alert('Succès', `La catégorie « ${nomClean} » a été enregistrée.`);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader
        titre={t('gestion_categories')}
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Label uppercase */}
        <Text style={styles.sectionLabel}>
          {t('administrateur').toUpperCase()} · {categories.length} {t('categories_admin').toUpperCase()}
        </Text>

        {/* SECTION 1 : CATÉGORIES DE PRODUITS (Figma 39) */}
        <Text style={styles.sectionTitle}>{t('categories_produits')}</Text>
        <View style={styles.listBlock}>
          {categoriesProduit.map((cat, idx) => (
            <View
              key={cat.id}
              style={[
                styles.categoryRow,
                idx < categoriesProduit.length - 1 && styles.borderBottom,
              ]}
            >
              <Text style={styles.catName}>{cat.nom}</Text>
              <Text style={styles.catType}>{t('produit')}</Text>
            </View>
          ))}
        </View>

        {/* SECTION 2 : CATÉGORIES DE DÉPENSES (Figma 39) */}
        <Text style={styles.sectionTitle}>{t('categories_depenses')}</Text>
        <View style={styles.listBlock}>
          {categoriesDepense.map((cat, idx) => (
            <View
              key={cat.id}
              style={[
                styles.categoryRow,
                idx < categoriesDepense.length - 1 && styles.borderBottom,
              ]}
            >
              <Text style={styles.catName}>{cat.nom}</Text>
              <Text style={styles.catType}>{t('depense_label')}</Text>
            </View>
          ))}
        </View>

        {/* FORMULAIRE D'AJOUT (Figma 39 bottom) */}
        <View style={styles.formContainer}>
          {/* Nom de la catégorie */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>{t('nom_categorie')}</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ex: Loisirs, Équipement..."
              placeholderTextColor={Theme.colors.muted}
              value={nom}
              onChangeText={setNom}
            />
          </View>

          {/* Type de catégorie (Sélecteur Produit / Dépense) */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>{t('types_categories')}</Text>
            <View style={styles.typeSelectorRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === 'product' && styles.typeBtnActive,
                ]}
                onPress={() => setType('product')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    type === 'product' && styles.typeBtnTextActive,
                  ]}
                >
                  {t('produit')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === 'expense' && styles.typeBtnActive,
                ]}
                onPress={() => setType('expense')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    type === 'expense' && styles.typeBtnTextActive,
                  ]}
                >
                  {t('depense_label')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton Enregistrer */}
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleAjouter}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{t('enregistrer_categorie')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 39
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 90,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginTop: 10,
    marginBottom: 12,
  },

  // Bloc de liste
  listBlock: {
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  catName: {
    fontSize: 15,
    fontWeight: '500',
    color: Theme.colors.ink,
  },
  catType: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // Formulaire
  formContainer: {
    marginTop: 20,
  },
  inputCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 10,
    ...Theme.shadows.card,
  },
  inputLabel: {
    fontSize: 11,
    color: Theme.colors.muted,
    marginBottom: 4,
  },
  textInput: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.ink,
    padding: 0,
  },

  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    backgroundColor: Theme.colors.warm,
  },
  typeBtnActive: {
    backgroundColor: Theme.colors.forest,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
  typeBtnTextActive: {
    color: Theme.colors.white,
  },

  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    ...Theme.shadows.button,
  },
  primaryBtnText: {
    color: Theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
