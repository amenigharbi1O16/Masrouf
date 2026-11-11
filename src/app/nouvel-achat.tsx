// ============================================================
// FICHIER : src/app/nouvel-achat.tsx
// RÔLE    : Fenêtre modale pour enregistrer une nouvelle dépense.
//           Supporte :
//           1. Achat d'un produit du catalogue (avec prix et quantité).
//           2. Dépense directe sans produit (ex: Facture STEG, Transport).
//           3. Déduction immédiate de l'enveloppe budgétaire correspondante.
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
  getAllCategories,
  insertAchat,
  Produit,
  Magasin,
  Categorie,
} from '../db/queries';

// Contexte et internationalisation
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';

export default function NouvelAchatScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // Listes de référence chargées depuis SQLite
  const [produits, setProduits] = useState<Produit[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);

  // Mode de saisie : 'produit' ou 'direct'
  const [modeSaisie, setModeSaisie] = useState<'produit' | 'direct'>('produit');

  // Champs du formulaire
  const [produitChoisi, setProduitChoisi] = useState<Produit | null>(null);
  const [categorieIdChoisie, setCategorieIdChoisie] = useState<number | null>(null);
  const [titreDirect, setTitreDirect] = useState<string>('');
  const [magasinIdChoisi, setMagasinIdChoisi] = useState<number | null>(null);
  const [prixUnitaire, setPrixUnitaire] = useState<string>('');
  const [quantite, setQuantite] = useState<string>('1');
  const [notes, setNotes] = useState<string>('');
  const [rechercheProduit, setRechercheProduit] = useState<string>('');

  useEffect(() => {
    const p = getAllProduits(user?.id);
    const m = getAllMagasins();
    const c = getAllCategories(true);
    setProduits(p);
    setMagasins(m);
    setCategories(c);

    if (m.length > 0) setMagasinIdChoisi(m[0].id);
    if (c.length > 0) setCategorieIdChoisie(c[0].id);
  }, [user]);

  const pUnit = parseFloat(prixUnitaire) || 0;
  const qte = parseFloat(quantite) || 0;
  const totalCalcule = pUnit * qte;

  const produitsFiltres = produits.filter((p) =>
    p.nom.toLowerCase().includes(rechercheProduit.toLowerCase())
  );

  function handleEnregistrer() {
    if (!user) return;

    if (modeSaisie === 'produit' && !produitChoisi) {
      Alert.alert('Attention', 'Veuillez sélectionner un produit dans la liste.');
      return;
    }

    if (modeSaisie === 'direct' && !titreDirect.trim()) {
      Alert.alert('Attention', 'Veuillez donner un libellé à votre dépense.');
      return;
    }

    if (pUnit <= 0) {
      Alert.alert('Attention', 'Veuillez saisir un montant ou prix unitaire valide.');
      return;
    }

    if (qte <= 0) {
      Alert.alert('Attention', 'La quantité doit être supérieure à 0.');
      return;
    }

    const maintenant = new Date();
    const mois = `${maintenant.getFullYear()}-${String(
      maintenant.getMonth() + 1
    ).padStart(2, '0')}`;

    const catId =
      modeSaisie === 'produit'
        ? produitChoisi?.categorie_id ?? null
        : categorieIdChoisie;

    insertAchat({
      produit_id: modeSaisie === 'produit' ? (produitChoisi?.id ?? null) : null,
      utilisateur_id: user.id,
      magasin_id: magasinIdChoisi,
      categorie_id: catId,
      titre: modeSaisie === 'direct' ? titreDirect.trim() : (produitChoisi?.nom ?? ''),
      prix_unitaire: pUnit,
      quantite: qte,
      prix_total: totalCalcule,
      mois: mois,
      notes: notes.trim(),
    });

    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* SÉLECTEUR DE MODE (Avec produit ou dépense directe) */}
      <View style={styles.modeToggleRow}>
        <TouchableOpacity
          style={[
            styles.modeToggleBtn,
            modeSaisie === 'produit' && styles.modeToggleActive,
          ]}
          onPress={() => setModeSaisie('produit')}
        >
          <Text
            style={[
              styles.modeToggleText,
              modeSaisie === 'produit' && styles.modeToggleTextActive,
            ]}
          >
            📦 Article du catalogue
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.modeToggleBtn,
            modeSaisie === 'direct' && styles.modeToggleActive,
          ]}
          onPress={() => setModeSaisie('direct')}
        >
          <Text
            style={[
              styles.modeToggleText,
              modeSaisie === 'direct' && styles.modeToggleTextActive,
            ]}
          >
            ⚡ Dépense directe
          </Text>
        </TouchableOpacity>
      </View>

      {/* MODE 1 : PRODUIT */}
      {modeSaisie === 'produit' ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>1. Sélectionner un produit *</Text>

          {produitChoisi ? (
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
              <TouchableOpacity onPress={() => setProduitChoisi(null)}>
                <Text style={styles.changeLink}>Changer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={styles.searchInput}
                placeholder={t('rechercher_produit')}
                placeholderTextColor="#94A3B8"
                value={rechercheProduit}
                onChangeText={setRechercheProduit}
              />
              <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                {produitsFiltres.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.productListItem}
                    onPress={() => setProduitChoisi(p)}
                  >
                    <Text style={{ fontSize: 20, marginRight: 8 }}>
                      {p.categorie_icone}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productListName}>{p.nom}</Text>
                      <Text style={styles.productListCat}>
                        {p.categorie_nom} • {p.marque}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      ) : (
        /* MODE 2 : DÉPENSE DIRECTE */
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>1. Libellé de la dépense *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Facture électricité, Taxi centre-ville..."
            value={titreDirect}
            onChangeText={setTitreDirect}
          />

          <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
            Catégorie rattachée *
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.catChipsRow}>
              {categories.map((c) => {
                const estChoisi = c.id === categorieIdChoisie;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.catChip, estChoisi && styles.catChipActive]}
                    onPress={() => setCategorieIdChoisie(c.id)}
                  >
                    <Text style={{ fontSize: 16 }}>{c.icone}</Text>
                    <Text
                      style={[
                        styles.catChipText,
                        estChoisi && styles.catChipTextActive,
                      ]}
                    >
                      {c.nom}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      )}

      {/* MAGASIN / ENSEIGNE */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>2. Enseigne / Magasin</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.catChipsRow}>
            {magasins.map((m) => {
              const estChoisi = m.id === magasinIdChoisi;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.catChip, estChoisi && styles.catChipActive]}
                  onPress={() => setMagasinIdChoisi(m.id)}
                >
                  <Text
                    style={[
                      styles.catChipText,
                      estChoisi && styles.catChipTextActive,
                    ]}
                  >
                    🏪 {m.nom}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* MONTANT ET QUANTITÉ */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>3. Montant & Quantité</Text>
        <View style={styles.row}>
          <View style={{ flex: 2 }}>
            <Text style={styles.inputLabel}>
              {modeSaisie === 'produit' ? t('prix_unitaire') : 'Montant (TND)'} *
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 2.850"
              keyboardType="numeric"
              value={prixUnitaire}
              onChangeText={setPrixUnitaire}
            />
          </View>

          {modeSaisie === 'produit' ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>{t('quantite')} *</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={quantite}
                onChangeText={setQuantite}
              />
            </View>
          ) : null}
        </View>

        {/* TOTAL CALCULÉ */}
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>{t('total')} à déduire :</Text>
          <Text style={styles.totalAmount}>
            {totalCalcule.toFixed(3)} <Text style={{ fontSize: 14 }}>TND</Text>
          </Text>
        </View>

        {/* NOTES */}
        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Notes (facultatif)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Promotion spéciale..."
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* BOUTON ENREGISTRER */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleEnregistrer}
        activeOpacity={0.8}
      >
        <Text style={styles.submitBtnText}>✓ {t('enregistrer')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  modeToggleRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  modeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeToggleActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeToggleTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 8,
  },
  productListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  productListName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  productListCat: {
    fontSize: 11,
    color: '#64748B',
  },
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 10,
    padding: 10,
  },
  selectedProductName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  selectedProductSub: {
    fontSize: 11,
    color: '#3B82F6',
  },
  changeLink: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  catChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  catChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  catChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  catChipTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  totalBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#059669',
  },
  submitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
