// ============================================================
// FICHIER : src/app/(tabs)/produits.tsx
// RÔLE    : Écran du catalogue des produits enregistrés.
//
// VISUEL SUR L'ÉCRAN :
//   1. En haut : Grand bouton bleu "+ Créer un nouveau produit"
//      qui ouvre la modale de création.
//   2. Barre de recherche dynamique (champ de saisie) :
//      filtre la liste instantanément pendant que l'utilisateur tape.
//   3. Compteur indiquant le nombre total d'articles trouvés.
//   4. Liste des cartes produits :
//      - Vignette avec l'icône de la catégorie (ex: 🥛, 🍞, 🧼).
//      - Nom du produit en gras et sa marque.
//      - Nom de la catégorie et unité de mesure (ex: L, kg, pièce).
//      - Flèche '›' indiquant qu'on peut cliquer pour ouvrir
//        la fiche détaillée du produit (/produit/[id]).
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

// Fonctions SQLite pour charger les produits réels
import { getAllProduits, Produit } from '../../db/queries';

// Système de traduction et Authentification
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';

export default function ProduitsScreen() {
  const { user } = useAuth();
  // Récupération de la fonction de traduction 't'
  const { t } = useTranslation();

  // ÉTAT LOCAL 1 : Liste complète des produits chargés depuis SQLite
  const [produits, setProduits] = useState<Produit[]>([]);

  // ÉTAT LOCAL 2 : Texte de recherche tapé par l'utilisateur
  const [recherche, setRecherche] = useState<string>('');

  // ----------------------------------------------------------
  // CHARGEMENT DES PRODUITS DEPUIS SQLITE
  // useFocusEffect s'exécute à chaque fois que cet écran devient visible
  // ----------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      // Exécute la requête SELECT dans la base SQLite locale
      const donnees = getAllProduits(user?.id);
      setProduits(donnees);
    }, [user?.id])
  );

  // ----------------------------------------------------------
  // FILTRAGE ÉVÉNEMENTIEL EN TEMPS RÉEL
  // Filtre les produits selon le nom ou la marque saisie
  // ----------------------------------------------------------
  const produitsFiltres = produits.filter((p) => {
    const terme = recherche.toLowerCase().trim();
    return (
      p.nom.toLowerCase().includes(terme) ||
      p.marque.toLowerCase().includes(terme) ||
      p.categorie_nom.toLowerCase().includes(terme)
    );
  });

  return (
    <View style={styles.container}>
      {/* ==================================================== */}
      {/* BOUTON D'ACTION PRINCIPAL : CRÉER UN PRODUIT         */}
      {/* ==================================================== */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/nouveau-produit')}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>{t('creer_produit')}</Text>
      </TouchableOpacity>

      {/* ==================================================== */}
      {/* BARRE DE RECHERCHE DYNAMIQUE                         */}
      {/* ==================================================== */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder={t('rechercher_produit')}
          placeholderTextColor="#94A3B8"
          value={recherche}
          // Événement déclenché à chaque frappe : met à jour le filtre
          onChangeText={(texte) => setRecherche(texte)}
        />
        {recherche.length > 0 ? (
          // Petit bouton pour effacer rapidement la recherche
          <TouchableOpacity onPress={() => setRecherche('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ==================================================== */}
      {/* TITRE DE SECTION ET COMPTEUR D'ARTICLES              */}
      {/* ==================================================== */}
      <View style={styles.headerListRow}>
        <Text style={styles.sectionTitle}>{t('catalogue_produits')}</Text>
        <Text style={styles.counterBadge}>
          {produitsFiltres.length} article(s)
        </Text>
      </View>

      {/* ==================================================== */}
      {/* LISTE DES PRODUITS (FlatList optimisée)              */}
      {/* ==================================================== */}
      <FlatList
        data={produitsFiltres}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          // Message affiché si la recherche ne donne aucun résultat
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 36, marginBottom: 8 }}>📦</Text>
            <Text style={styles.emptyText}>{t('aucun_produit')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          // Carte interactive : un clic redirige vers /produit/[id]
          <TouchableOpacity
            style={styles.productCard}
            onPress={() => router.push(`/produit/${item.id}`)}
            activeOpacity={0.7}
          >
            {/* Vignette avec l'icône de catégorie */}
            <View style={styles.avatar}>
              <Text style={{ fontSize: 24 }}>{item.categorie_icone}</Text>
            </View>

            {/* Informations descriptives */}
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.nom}</Text>
              <Text style={styles.productBrand}>
                {item.marque ? `${item.marque} • ` : ''}
                {item.categorie_nom} ({item.unite})
              </Text>
            </View>

            {/* Flèche indiquant la navigation vers la fiche */}
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// ------------------------------------------------------------
// STYLES GRAPHIQUES
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 16,
    paddingBottom: 0,
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1E293B',
  },
  clearIcon: {
    fontSize: 14,
    color: '#94A3B8',
    padding: 4,
  },
  headerListRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
  },
  counterBadge: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  listContent: {
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  productBrand: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  arrow: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
