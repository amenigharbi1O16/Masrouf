// ============================================================
// FICHIER : src/app/nouvel-achat.tsx
// RÔLE    : Fenêtre modale pour enregistrer une nouvelle dépense.
//
// VISUEL SUR L'ÉCRAN :
//   S'ouvre par glissement vertical depuis le bas de l'écran.
//   1. Étape 1 - Sélection du produit :
//      - Liste de recherche rapide ou sélection parmi le catalogue existant.
//      - Bouton pour créer un produit à la volée s'il n'existe pas.
//   2. Étape 2 - Choix du magasin :
//      - Boutons pilules (Carrefour, Monoprix, Aziza, MG, etc.).
//   3. Étape 3 - Saisie du prix unitaire et de la quantité :
//      - Champs avec clavier numérique.
//      - Calcul automatique et instantané du Total = Prix × Quantité.
//   4. Bouton de soumission vert "Enregistrer l'achat" :
//      - Écrit la transaction dans la table SQLite 'achats'
//      - Ferme la modale et revient à l'accueil via router.back().
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

// Fonctions SQLite
import {
  getAllProduits,
  getAllMagasins,
  insertAchat,
  Produit,
  Magasin,
} from '../db/queries';

// Contexte et internationalisation
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';

export default function NouvelAchatScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // LISTES DE RÉFÉRENCE CHARGÉES DEPUIS SQLITE
  const [produits, setProduits] = useState<Produit[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);

  // ÉTATS LOCAUX DU FORMULAIRE :
  const [produitChoisi, setProduitChoisi] = useState<Produit | null>(null);
  const [magasinIdChoisi, setMagasinIdChoisi] = useState<number | null>(null);
  const [prixUnitaire, setPrixUnitaire] = useState<string>('');
  const [quantite, setQuantite] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [rechercheProduit, setRechercheProduit] = useState<string>('');

  // Chargement des données au montage du composant
  useEffect(() => {
    const p = getAllProduits();
    const m = getAllMagasins();
    setProduits(p);
    setMagasins(m);
    if (m.length > 0) {
      setMagasinIdChoisi(m[0].id); // Sélectionne le 1er magasin par défaut
    }
  }, []);

  // ----------------------------------------------------------
  // CALCUL DYNAMIQUE DU MONTANT TOTAL
  // ----------------------------------------------------------
  const pUnit = parseFloat(prixUnitaire) || 0;
  const qte = parseFloat(quantite) || 0;
  const totalCalcule = pUnit * qte;

  // ----------------------------------------------------------
  // FILTRAGE DES PRODUITS POUR LA SÉLECTION
  // ----------------------------------------------------------
  const produitsFiltres = produits.filter((p) =>
    p.nom.toLowerCase().includes(rechercheProduit.toLowerCase())
  );

  // ----------------------------------------------------------
  // VALIDATION ET INSERTION DANS SQLITE
  // ----------------------------------------------------------
  function handleEnregistrer() {
    if (!user) return;

    if (!produitChoisi) {
      Alert.alert('Attention', 'Veuillez sélectionner un produit dans la liste.');
      return;
    }

    if (pUnit <= 0) {
      Alert.alert('Attention', 'Veuillez saisir un prix unitaire valide.');
      return;
    }

    if (qte <= 0) {
      Alert.alert('Attention', 'La quantité doit être supérieure à 0.');
      return;
    }

    // Format du mois en cours pour le regroupement mensuel (AAAA-MM)
    const maintenant = new Date();
    const mois = `${maintenant.getFullYear()}-${String(
      maintenant.getMonth() + 1
    ).padStart(2, '0')}`;

    // Exécute l'insertion dans SQLite
    insertAchat({
      produit_id: produitChoisi.id,
      utilisateur_id: user.id,
      magasin_id: magasinIdChoisi,
      prix_unitaire: pUnit,
      quantite: qte,
      prix_total: totalCalcule,
      mois: mois,
      notes: notes.trim(),
    });

    // Ferme la modale et redescend vers l'écran précédent
    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ==================================================== */}
      {/* ÉTAPE 1 : SÉLECTION DU PRODUIT                       */}
      {/* ==================================================== */}
      <Text style={styles.sectionLabel}>1. Sélectionner un produit *</Text>

      {produitChoisi ? (
        // Carte du produit sélectionné avec possibilité de changer
        <View style={styles.selectedProductCard}>
          <Text style={{ fontSize: 26, marginRight: 10 }}>
            {produitChoisi.categorie_icone}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedProductName}>{produitChoisi.nom}</Text>
            <Text style={styles.selectedProductSub}>
              {produitChoisi.marque} • Unité : {produitChoisi.unite}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.changeProductBtn}
            onPress={() => setProduitChoisi(null)}
          >
            <Text style={styles.changeProductText}>Changer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Liste de sélection de produit
        <View style={styles.card}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Filtrer les produits..."
            placeholderTextColor="#94A3B8"
            value={rechercheProduit}
            onChangeText={(txt) => setRechercheProduit(txt)}
          />

          <ScrollView style={styles.productListScroll} nestedScrollEnabled={true}>
            {produitsFiltres.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.productPickerItem}
                onPress={() => {
                  setProduitChoisi(p);
                  setRechercheProduit('');
                }}
              >
                <Text style={{ fontSize: 18, marginRight: 8 }}>
                  {p.categorie_icone}
                </Text>
                <Text style={styles.productPickerName}>{p.nom}</Text>
                <Text style={styles.productPickerUnit}>({p.unite})</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Raccourci vers la modale de création d'un nouveau produit */}
          <TouchableOpacity
            style={styles.quickCreateBtn}
            onPress={() => router.push('/nouveau-produit')}
          >
            <Text style={styles.quickCreateText}>
              + Produit introuvable ? Créer un nouveau produit
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ==================================================== */}
      {/* ÉTAPE 2 : CHOIX DU MAGASIN                           */}
      {/* ==================================================== */}
      <Text style={styles.sectionLabel}>2. Magasin / Lieu d'achat</Text>
      <ScrollView
        horizontal={true}
        showsHorizontalScrollIndicator={false}
        style={styles.storesRow}
      >
        {magasins.map((m) => {
          const estSelectionne = magasinIdChoisi === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              style={[
                styles.storePill,
                estSelectionne && styles.storePillSelected,
              ]}
              onPress={() => setMagasinIdChoisi(m.id)}
            >
              <Text
                style={[
                  styles.storePillText,
                  estSelectionne && styles.storePillTextSelected,
                ]}
              >
                🏬 {m.nom}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ==================================================== */}
      {/* ÉTAPE 3 : PRIX ET QUANTITÉ                           */}
      {/* ==================================================== */}
      <Text style={styles.sectionLabel}>3. Prix & Quantité</Text>
      <View style={styles.card}>
        <View style={styles.rowInputs}>
          {/* Champ Prix unitaire */}
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.inputTitle}>Prix unitaire (TND) *</Text>
            <TextInput
              style={styles.numericInput}
              placeholder="Ex: 1.850"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={prixUnitaire}
              onChangeText={(txt) => setPrixUnitaire(txt)}
            />
          </View>

          {/* Champ Quantité */}
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.inputTitle}>Quantité *</Text>
            <TextInput
              style={styles.numericInput}
              placeholder="Ex: 2"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={quantite}
              onChangeText={(txt) => setQuantite(txt)}
            />
          </View>
        </View>

        {/* AFFICHAGE DU TOTAL CALCULÉ EN TEMPS RÉEL */}
        <View style={styles.totalBox}>
          <Text style={styles.totalBoxLabel}>{t('total')} :</Text>
          <Text style={styles.totalBoxAmount}>
            {totalCalcule.toFixed(3)} <Text style={{ fontSize: 16 }}>TND</Text>
          </Text>
        </View>
      </View>

      {/* ==================================================== */}
      {/* ÉTAPE 4 : REMARQUES OPTIONNELLES                     */}
      {/* ==================================================== */}
      <Text style={styles.sectionLabel}>4. Notes (Optionnel)</Text>
      <TextInput
        style={styles.notesInput}
        placeholder="Ex: Promo pack familial..."
        placeholderTextColor="#94A3B8"
        value={notes}
        onChangeText={(txt) => setNotes(txt)}
      />

      {/* ==================================================== */}
      {/* BOUTONS D'ACTION (ENREGISTRER OU FERMER)             */}
      {/* ==================================================== */}
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleEnregistrer}
        activeOpacity={0.8}
      >
        <Text style={styles.submitButtonText}>✓ {t('enregistrer')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.cancelButtonText}>{t('fermer')}</Text>
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
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  selectedProductCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedProductName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  selectedProductSub: {
    fontSize: 12,
    color: '#2563EB',
    marginTop: 2,
  },
  changeProductBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  changeProductText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  searchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#1E293B',
    marginBottom: 8,
  },
  productListScroll: {
    maxHeight: 160,
  },
  productPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  productPickerName: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
  },
  productPickerUnit: {
    fontSize: 12,
    color: '#94A3B8',
  },
  quickCreateBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickCreateText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  storesRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  storePill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  storePillSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  storePillText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  storePillTextSelected: {
    color: '#FFFFFF',
  },
  rowInputs: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  inputTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  numericInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalBoxLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  totalBoxAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2563EB',
  },
  notesInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: '#10B981', // Vert émeraude
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
