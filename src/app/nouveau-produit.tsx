// ============================================================
// FICHIER : src/app/nouveau-produit.tsx
// RÔLE    : Fenêtre modale de création d'un nouveau produit.
//
// VISUEL SUR L'ÉCRAN :
//   S'ouvre par glissement vertical depuis le bas de l'écran.
//   1. Champ de saisie : Nom du produit (ex: Yaourt Nature).
//   2. Champ de saisie : Marque commerciale (ex: Délice, Vitalait).
//   3. Sélecteur d'unité : Boutons interactifs ['pièce', 'kg', 'L', 'g', 'pack'].
//   4. Sélecteur de catégorie : Cartes avec icônes emoji (Alimentation, Boissons, Hygiène, etc.).
//   5. Bouton bleu "Créer le produit" :
//      - Écrit la nouvelle ligne dans la table SQLite 'produits'
//      - Ferme la modale via router.back().
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

// Fonctions SQLite
import { getAllCategories, insertProduit, Categorie } from '../db/queries';

// Contexte et internationalisation
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';

export default function NouveauProduitScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Liste des catégories chargées depuis SQLite
  const [categories, setCategories] = useState<Categorie[]>([]);

  // ÉTATS LOCAUX DU FORMULAIRE :
  const [nom, setNom] = useState<string>('');
  const [marque, setMarque] = useState<string>('');
  const [unite, setUnite] = useState<string>('pièce');
  const [categorieId, setCategorieId] = useState<number | null>(null);

  // Unités courantes proposées sous forme de boutons
  const unitesDisponibles = ['pièce', 'kg', 'L', 'g', 'pack'];

  // Chargement des catégories au montage
  useEffect(() => {
    const cats = getAllCategories();
    setCategories(cats);
    if (cats.length > 0) {
      setCategorieId(cats[0].id); // Sélectionne la 1ère catégorie par défaut
    }
  }, []);

  // ----------------------------------------------------------
  // VALIDATION ET INSERTION DANS SQLITE
  // ----------------------------------------------------------
  function handleCreerProduit() {
    if (!user) return;

    if (!nom.trim()) {
      Alert.alert('Attention', 'Veuillez renseigner le nom du produit.');
      return;
    }

    if (!categorieId) {
      Alert.alert('Attention', 'Veuillez sélectionner une catégorie.');
      return;
    }

    // Insertion du produit dans la base SQLite locale
    insertProduit({
      nom: nom.trim(),
      marque: marque.trim(),
      unite: unite,
      categorie_id: categorieId,
      created_by: user.id,
    });

    // Fermeture de la modale et retour à l'écran précédent
    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ==================================================== */}
      {/* CHAMP 1 : NOM DU PRODUIT                            */}
      {/* ==================================================== */}
      <Text style={styles.label}>{t('nom_produit')} *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Lait demi-écrémé, Riz blanc..."
        placeholderTextColor="#94A3B8"
        value={nom}
        onChangeText={(txt) => setNom(txt)}
      />

      {/* ==================================================== */}
      {/* CHAMP 2 : MARQUE COMMERCIALE                         */}
      {/* ==================================================== */}
      <Text style={styles.label}>{t('marque')}</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: Délice, Vitalait, Randa..."
        placeholderTextColor="#94A3B8"
        value={marque}
        onChangeText={(txt) => setMarque(txt)}
      />

      {/* ==================================================== */}
      {/* CHAMP 3 : UNITÉ DE MESURE                            */}
      {/* ==================================================== */}
      <Text style={styles.label}>{t('unite')}</Text>
      <View style={styles.unitsRow}>
        {unitesDisponibles.map((u) => {
          const estChoisi = unite === u;
          return (
            <TouchableOpacity
              key={u}
              style={[styles.unitBtn, estChoisi && styles.unitBtnActive]}
              onPress={() => setUnite(u)}
            >
              <Text style={[styles.unitText, estChoisi && styles.unitTextActive]}>
                {u}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ==================================================== */}
      {/* CHAMP 4 : CHOIX DE LA CATÉGORIE                     */}
      {/* ==================================================== */}
      <Text style={styles.label}>{t('categorie')} *</Text>
      <View style={styles.categoriesGrid}>
        {categories.map((c) => {
          const estSelectionne = categorieId === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.categoryCard,
                estSelectionne && styles.categoryCardSelected,
              ]}
              onPress={() => setCategorieId(c.id)}
            >
              <Text style={styles.categoryIcon}>{c.icone}</Text>
              <Text
                style={[
                  styles.categoryName,
                  estSelectionne && styles.categoryNameSelected,
                ]}
              >
                {c.nom}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ==================================================== */}
      {/* BOUTONS D'ACTION                                     */}
      {/* ==================================================== */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleCreerProduit}
        activeOpacity={0.8}
      >
        <Text style={styles.submitBtnText}>+ Créer le produit</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.closeBtn}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.closeBtnText}>{t('fermer')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ------------------------------------------------------------
// STYLES GRAPHIQUES
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unitsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  unitBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  unitBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  unitTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCardSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  categoryIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  categoryNameSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
