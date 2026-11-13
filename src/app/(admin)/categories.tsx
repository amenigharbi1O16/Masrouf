// ============================================================
// FICHIER : src/app/(admin)/categories.tsx
// RÔLE    : Gestion des catégories administratives — Design Figma 39, 40 & 41.
//
// MISSION DANS L'APPLICATION :
//   1. Permettre à l'administrateur de visualiser toutes les catégories existantes du système.
//   2. Séparer visuellement les « Catégories de produits » (supermarché, alimentation, hygiène)
//      des « Catégories de dépenses » (loyer, factures, transport, etc.).
//   3. Fournir un formulaire d'ajout complet permettant de créer une nouvelle catégorie,
//      de lui attribuer un type ('product' ou 'expense'), et de l'insérer dans la table SQLite `category`.
//   4. Empêcher les doublons grâce à une comparaison insensible à la casse et aux accents.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN :
//   • 1. HEADER (AppHeader) : Icône hamburger ☰ à gauche (ouvre le tiroir admin),
//        titre centré "Gestion des catégories", icône profil 👤 à droite.
//   • 2. LABEL SUPÉRIEUR (sectionLabel) : Texte gris en majuscules :
//        "ADMINISTRATEUR · X CATÉGORIES" (ex: ADMINISTRATEUR · 16 CATÉGORIES).
//   • 3. SECTION 1 - PRODUITS (sectionTitle) : Titre "Catégories de produits".
//        Bloc blanc avec lignes séparées par une bordure fine :
//        - Colonne gauche : Nom de la catégorie (ex: Alimentation).
//        - Colonne droite : Badge textuel "Produit".
//   • 4. SECTION 2 - DÉPENSES (sectionTitle) : Titre "Catégories de dépenses".
//        Bloc blanc avec lignes séparées par une bordure fine :
//        - Colonne gauche : Nom de la catégorie (ex: Logement & Factures).
//        - Colonne droite : Badge textuel "Dépense".
//   • 5. FORMULAIRE D'AJOUT (formContainer) :
//        - Carte 1 : Carte blanche avec petit label gris "Nom de la catégorie",
//          champ de saisie avec placeholder "Ex: Loisirs, Équipement...".
//        - Carte 2 : Carte blanche avec label "Type de catégorie",
//          suivi de 2 boutons onglets : [ Produit ] et [ Dépense ].
//          Le bouton actif est rempli en vert forêt (#102B27) avec texte blanc.
//        - Bouton d'action (primaryBtn) : Capsule vert forêt de 52dp de haut avec ombre :
//          texte blanc gras centré "Enregistrer la catégorie".
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

// Fonctions SQLite pour la gestion des catégories
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

// ------------------------------------------------------------
// COMPOSANT PRINCIPAL : AdminCategoriesScreen()
// BUT : Affiche l'écran de consultation et de création des catégories.
// ------------------------------------------------------------
export default function AdminCategoriesScreen() {
  // Récupère l'administrateur connecté pour tracer qui crée la catégorie
  const { user: adminConnecte } = useAuth();
  // Hook d'internationalisation pour les textes traduits
  const { t } = useTranslation();
  // Hook pour ouvrir le tiroir de navigation admin
  const { ouvrirDrawer } = useAdminDrawer();

  // ----------------------------------------------------------
  // VARIABLES D'ÉTAT LOCALES
  // ----------------------------------------------------------
  // Liste de toutes les catégories chargées depuis SQLite
  const [categories, setCategories] = useState<Categorie[]>([]);
  // Texte saisi dans le champ "Nom de la catégorie"
  const [nom, setNom] = useState<string>('');
  // Type sélectionné : 'product' (produit de supermarché) ou 'expense' (facture/dépense directe)
  const [type, setType] = useState<'product' | 'expense'>('product');

  // ----------------------------------------------------------
  // FONCTION : recharger()
  // BUT : Lit la table SQLite `category` et met à jour l'état local.
  // AFFICHAGE : Met à jour immédiatement la liste des catégories affichées à l'écran.
  // ----------------------------------------------------------
  const recharger = useCallback(() => {
    // false = charge TOUTES les catégories même celles non actives ou non par défaut
    const list = getAllCategories(false);
    setCategories(list);
  }, []);

  // Déclenche le rechargement dès que l'écran reprend le focus
  useFocusEffect(recharger);

  // Séparation en deux listes distinctes pour l'affichage en deux sections
  const categoriesProduit = categories.filter((c) => c.type === 'product' || !c.type);
  const categoriesDepense = categories.filter((c) => c.type === 'expense');

  // ----------------------------------------------------------
  // FONCTION : handleAjouter()
  // BUT : Valide la saisie et insère la nouvelle catégorie dans SQLite.
  // AFFICHAGE :
  //   - En cas d'erreur : Alerte pop-up native "Attention : Le nom est obligatoire" ou "Doublon".
  //   - En cas de succès : Alerte "Succès : La catégorie a été enregistrée",
  //     le champ texte est vidé et la liste à l'écran s'actualise avec la nouvelle ligne.
  // ----------------------------------------------------------
  function handleAjouter() {
    const nomClean = nom.trim();
    // 1. Validation du champ obligatoire
    if (!nomClean) {
      Alert.alert(t('erreur') ?? 'Attention', 'Le nom de la catégorie est obligatoire.');
      return;
    }

    // 2. Détection de doublons (insensible à la casse et aux accents)
    const existe = categories.some(
      (c) => c.nom.localeCompare(nomClean, undefined, { sensitivity: 'accent' }) === 0
    );

    if (existe) {
      Alert.alert('Doublon', 'Une catégorie portant ce nom existe déjà.');
      return;
    }

    // 3. Insertion SQLite avec icône par défaut appropriée
    addCategoryAdmin(
      nomClean,
      type === 'product' ? '🛍️' : '💳',
      0,
      'Général',
      type,
      adminConnecte?.id
    );

    // 4. Réinitialisation du champ et rafraîchissement visuel
    setNom('');
    recharger();
    Alert.alert('Succès', `La catégorie « ${nomClean} » a été enregistrée.`);
  }

  // ----------------------------------------------------------
  // RENDU VISUEL DE L'ÉCRAN
  // ----------------------------------------------------------
  return (
    // Conteneur racine plein écran fond beige chaud (#F5F3ED)
    <View style={styles.container}>
      {/* ── 1. EN-TÊTE : Hamburger ☰ + Titre "Gestion des catégories" + Profil 👤 ── */}
      <AppHeader
        titre={t('gestion_categories')}
        onMenuPress={ouvrirDrawer}
      />

      {/* Conteneur défilable vertical pour accommoder la liste et le formulaire */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── 2. LABEL DISCRET : "ADMINISTRATEUR · 16 CATÉGORIES" ── */}
        <Text style={styles.sectionLabel}>
          {t('administrateur').toUpperCase()} · {categories.length} {t('categories_admin').toUpperCase()}
        </Text>

        {/* ── 3. SECTION 1 : CATÉGORIES DE PRODUITS (Figma 39) ── */}
        <Text style={styles.sectionTitle}>{t('categories_produits')}</Text>
        <View style={styles.listBlock}>
          {/* Boucle sur les catégories de produits */}
          {categoriesProduit.map((cat, idx) => (
            <View
              key={cat.id}
              style={[
                styles.categoryRow,
                // Ajoute une bordure séparatrice sous chaque ligne sauf la dernière
                idx < categoriesProduit.length - 1 && styles.borderBottom,
              ]}
            >
              {/* Nom de la catégorie (ex: Alimentation) */}
              <Text style={styles.catName}>{cat.nom}</Text>
              {/* Badge indicatif du type "Produit" */}
              <Text style={styles.catType}>{t('produit')}</Text>
            </View>
          ))}
        </View>

        {/* ── 4. SECTION 2 : CATÉGORIES DE DÉPENSES (Figma 39) ── */}
        <Text style={styles.sectionTitle}>{t('categories_depenses')}</Text>
        <View style={styles.listBlock}>
          {/* Boucle sur les catégories de dépenses */}
          {categoriesDepense.map((cat, idx) => (
            <View
              key={cat.id}
              style={[
                styles.categoryRow,
                idx < categoriesDepense.length - 1 && styles.borderBottom,
              ]}
            >
              {/* Nom de la catégorie (ex: Logement) */}
              <Text style={styles.catName}>{cat.nom}</Text>
              {/* Badge indicatif du type "Dépense" */}
              <Text style={styles.catType}>{t('depense_label')}</Text>
            </View>
          ))}
        </View>

        {/* ── 5. FORMULAIRE DE CRÉATION D'UNE NOUVELLE CATÉGORIE ── */}
        <View style={styles.formContainer}>
          {/* Carte blanche de saisie du nom */}
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

          {/* Carte blanche du sélecteur de type : [ Produit ] ou [ Dépense ] */}
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>{t('types_categories')}</Text>
            <View style={styles.typeSelectorRow}>
              {/* Bouton onglet 'Produit' */}
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === 'product' && styles.typeBtnActive, // Fond vert forêt si actif
                ]}
                onPress={() => setType('product')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    type === 'product' && styles.typeBtnTextActive, // Texte blanc si actif
                  ]}
                >
                  {t('produit')}
                </Text>
              </TouchableOpacity>

              {/* Bouton onglet 'Dépense' */}
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  type === 'expense' && styles.typeBtnActive, // Fond vert forêt si actif
                ]}
                onPress={() => setType('expense')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    type === 'expense' && styles.typeBtnTextActive, // Texte blanc si actif
                  ]}
                >
                  {t('depense_label')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bouton primaire : capsule vert forêt pleine largeur pour soumettre */}
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
// FEUILLE DE STYLES : Design Figma 39
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1, // Plein écran
    backgroundColor: Theme.colors.warm, // Fond beige chaud #F5F3ED
  },
  scroll: {
    paddingHorizontal: 20, // Marge latérale de 20dp
    paddingTop: 20,
    paddingBottom: 90, // Espace de sécurité en bas pour Samsung S22
  },

  // Libellé de métadonnées en haut
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted, // Gris moyen #61746D
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  // Titres des deux sections
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800', // Gras marqué
    color: Theme.colors.ink, // Encre sombre #102B27
    marginTop: 10,
    marginBottom: 12,
  },

  // Conteneur de liste des catégories
  listBlock: {
    marginBottom: 16,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Nom à gauche, type à droite
    alignItems: 'center',
    paddingVertical: 12,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border, // Ligne fine de séparation #E2E6DF
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

  // Formulaire d'ajout
  formContainer: {
    marginTop: 20,
  },
  inputCard: {
    backgroundColor: Theme.colors.white, // Carte blanche
    borderRadius: Theme.radius.lg, // Coins arrondis 16dp
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 10,
    ...Theme.shadows.card, // Légère ombre portée
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

  // Sélecteur de type Produit / Dépense
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
    backgroundColor: Theme.colors.warm, // Fond inactif beige
  },
  typeBtnActive: {
    backgroundColor: Theme.colors.forest, // Fond actif vert forêt #102B27
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
  typeBtnTextActive: {
    color: Theme.colors.white, // Texte blanc contrasté sur fond actif
  },

  // Bouton de validation capsule
  primaryBtn: {
    backgroundColor: Theme.colors.forest, // Vert forêt #102B27
    borderRadius: Theme.radius.full, // Pilule capsule (9999dp)
    height: 52, // Hauteur optimale 52dp pour accessibilité tactile
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
