// ============================================================
// FICHIER : src/app/(tabs)/produits.tsx
// RÔLE    : Écran catalogue des produits — Design Figma 12.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 12 · FR · Products) :
//   • Header standardisé avec ☰ hamburger + titre "Produits" + icône profil
//   • Label "VOS ESSENTIELS DU QUOTIDIEN" (muted, uppercase)
//   • Carte blanche de recherche : label "Rechercher des produits" + placeholder
//   • Filtres en pills horizontaux : "Tous les produits · Alimentation · Hygiène..."
//   • Ligne "X produits  Nom A–Z"
//   • Liste de cartes blanches : icône mint à gauche, nom gras, sous-titre
//     "Catégorie · unité · prix DT" (3 décimales), flèche › à droite
//   • Note informative : "Catégories de produits uniquement."
//   • FAB pleine largeur en bas : "+ Ajouter un produit"
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

// Données SQLite — produits et dernier prix unitaire
import { getAllProduits, Produit } from '../../db/queries';

// Design System, Authentification & Internationalisation
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

export default function ProduitsScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useDrawer();

  // Liste complète des produits chargés depuis SQLite
  const [produits, setProduits] = useState<Produit[]>([]);

  // Texte tapé dans la barre de recherche
  const [recherche, setRecherche] = useState<string>('');

  // Catégorie sélectionnée pour filtrer la liste (null = tout afficher)
  const [catActive, setCatActive] = useState<string | null>(null);

  // ----------------------------------------------------------
  // CHARGEMENT DES PRODUITS AU FOCUS DE L'ÉCRAN
  // ----------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      const donnees = getAllProduits(user?.id);
      setProduits(donnees);
    }, [user?.id])
  );

  // ----------------------------------------------------------
  // CATÉGORIES UNIQUES POUR LES FILTRES EN PILLS
  // ----------------------------------------------------------
  const categoriesUniques: string[] = Array.from(
    new Set(produits.map((p) => p.categorie_nom))
  );

  // ----------------------------------------------------------
  // FILTRAGE COMBINÉ : recherche textuelle + catégorie sélectionnée
  // ----------------------------------------------------------
  const produitsFiltres = produits.filter((p) => {
    const terme = recherche.toLowerCase().trim();
    const matchTexte =
      !terme ||
      p.nom.toLowerCase().includes(terme) ||
      p.marque.toLowerCase().includes(terme) ||
      p.categorie_nom.toLowerCase().includes(terme);
    const matchCat = !catActive || p.categorie_nom === catActive;
    return matchTexte && matchCat;
  });

  // ----------------------------------------------------------
  // RENDU D'UNE CARTE PRODUIT
  // ----------------------------------------------------------
  const renderProduit = ({ item }: { item: Produit }) => (
    // Pression → navigue vers la fiche détaillée /produit/[id]
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push(`/produit/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Icône catégorie sur fond mint */}
      <View style={styles.avatar}>
        <Text style={styles.avatarIcon}>{item.categorie_icone || '🛍️'}</Text>
      </View>

      {/* Informations textuelles du produit */}
      <View style={styles.productInfo}>
        {/* Nom du produit en gras */}
        <Text style={styles.productName}>{item.nom}</Text>
        {/* Sous-titre : Catégorie · Unité */}
        <Text style={styles.productSub}>
          {item.categorie_nom}
          {item.unite ? ` · ${item.unite}` : ''}
        </Text>
      </View>

      {/* Flèche de navigation */}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* ========================================================= */}
      {/* HEADER : hamburger ☰ + "Produits" + icône profil           */}
      {/* ========================================================= */}
      <AppHeader
        titre={t('produits') ?? 'Produits'}
        onMenuPress={ouvrirDrawer}
      />

      {/* ========================================================= */}
      {/* CORPS PRINCIPAL DÉFILABLE                                 */}
      {/* ========================================================= */}
      <FlatList
        data={produitsFiltres}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}

        // ---- EN-TÊTE DE LA LISTE ----
        ListHeaderComponent={
          <View>
            {/* Label de section uppercase */}
            <Text style={styles.sectionLabel}>
              {t('vos_essentiels') ?? 'VOS ESSENTIELS DU QUOTIDIEN'}
            </Text>

            {/* Carte de recherche */}
            <View style={styles.searchCard}>
              <Text style={styles.searchLabel}>
                {t('rechercher_produits') ?? 'Rechercher des produits'}
              </Text>
              <TextInput
                style={styles.searchInput}
                placeholder={t('rechercher_par_nom') ?? 'Rechercher par nom ou marque'}
                placeholderTextColor={Theme.colors.muted}
                value={recherche}
                onChangeText={setRecherche}
              />
            </View>

            {/* Pills de filtre par catégorie */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pillsScroll}
              contentContainerStyle={styles.pillsContent}
            >
              {/* Pill "Tous les produits" */}
              <TouchableOpacity
                style={[styles.pill, !catActive && styles.pillActive]}
                onPress={() => setCatActive(null)}
              >
                <Text style={[styles.pillText, !catActive && styles.pillTextActive]}>
                  {t('tous_produits') ?? 'Tous les produits'}
                </Text>
              </TouchableOpacity>

              {/* Pills par catégorie */}
              {categoriesUniques.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pill, catActive === cat && styles.pillActive]}
                  onPress={() => setCatActive(catActive === cat ? null : cat)}
                >
                  <Text style={[styles.pillText, catActive === cat && styles.pillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Ligne compteur + tri */}
            <View style={styles.countRow}>
              <Text style={styles.countText}>
                {produitsFiltres.length} {t('produits_nb') ?? 'produits'}
              </Text>
              <Text style={styles.sortText}>Nom A–Z</Text>
            </View>
          </View>
        }

        // ---- ÉTAT VIDE ----
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>
              {t('aucun_produit') ?? 'Aucun produit dans le catalogue.'}
            </Text>
          </View>
        }

        // ---- PIED DE LISTE ----
        ListFooterComponent={
          produitsFiltres.length > 0 ? (
            <Text style={styles.footerNote}>
              {t('categories_produits_note') ??
                'Catégories de produits uniquement. Les dépenses restent séparées.'}
            </Text>
          ) : undefined
        }

        renderItem={renderProduit}
      />

      {/* ========================================================= */}
      {/* FAB PLEINE LARGEUR : "+ Ajouter un produit"               */}
      {/* ========================================================= */}
      <View style={styles.fabWrapper}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/nouveau-produit')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>
            {t('fab_ajouter_produit') ?? '+ Ajouter un produit'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 12
// ------------------------------------------------------------
const styles = StyleSheet.create({
  // Fond warm off-white global
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },

  // Contenu de la FlatList avec espace pour le FAB
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },

  // Label uppercase muted "VOS ESSENTIELS DU QUOTIDIEN"
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },

  // Carte blanche de recherche
  searchCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    ...Theme.shadows.card,
  },
  searchLabel: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginBottom: 4,
  },
  searchInput: {
    fontSize: 15,
    color: Theme.colors.ink,
    padding: 0,
  },

  // Conteneur des pills de filtre
  pillsScroll: {
    marginBottom: 12,
  },
  pillsContent: {
    gap: 8,
    paddingRight: 8,
  },

  // Pill de filtre inactif
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Theme.radius.full,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.white,
  },
  pillText: {
    fontSize: 13,
    color: Theme.colors.ink,
  },

  // Pill actif : fond forest + texte blanc
  pillActive: {
    backgroundColor: Theme.colors.forest,
    borderColor: Theme.colors.forest,
  },
  pillTextActive: {
    color: Theme.colors.white,
    fontWeight: '600',
  },

  // Ligne "X produits  Nom A–Z"
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  countText: {
    fontSize: 14,
    color: Theme.colors.ink,
    fontWeight: '500',
  },
  sortText: {
    fontSize: 14,
    color: Theme.colors.ink,
    fontWeight: '700',
  },

  // Carte produit blanche
  productCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    ...Theme.shadows.card,
  },

  // Vignette icône catégorie sur fond mint
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Theme.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarIcon: {
    fontSize: 22,
  },

  // Bloc texte central
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.ink,
    marginBottom: 2,
  },
  productSub: {
    fontSize: 13,
    color: Theme.colors.muted,
  },

  // Flèche de navigation
  arrow: {
    fontSize: 22,
    color: Theme.colors.muted,
    marginLeft: 8,
  },

  // État vide
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.muted,
    textAlign: 'center',
  },

  // Note de pied de liste
  footerNote: {
    fontSize: 12,
    color: Theme.colors.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 18,
  },

  // Wrapper du FAB pour le fond warm
  fabWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.colors.warm,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },

  // FAB pleine largeur forest green
  fab: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadows.button,
  },
  fabText: {
    color: Theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
