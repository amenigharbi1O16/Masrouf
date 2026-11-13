// ============================================================
// FICHIER : src/app/nouveau-produit.tsx
// RÔLE    : Écran de création d'un produit — Design Figma 15.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 15 · FR · Add product) :
//   • Header : ☰ / ‹ retour + "Ajouter un produit" + icône profil
//   • Label "INFORMATIONS DU PRODUIT" (uppercase, muted)
//   • Titre "Un nouveau produit à suivre." (bold, ink)
//   • Cartes blanches de saisie avec label 11px muted + valeur/input :
//       1. "Nom du produit" (ex: Huile d'olive)
//       2. "Marque" (ex: Châal)
//       3. "Photo · facultative" (+ Ajouter une photo)
//       4. "Catégorie de produit" (sélecteur parmi les catégories de produits)
//       5. "Prix · DT" (ex: 14.500)
//       6. "Quantité" (ex: 1)
//       7. "Unité" (ex: L, kg, pièce...)
//       8. "Magasin" (ex: Monoprix)
//       9. "Date d'achat" (format JJ mmm. AAAA)
//   • Note descriptive des catégories
//   • Bouton primary forest : "Enregistrer le produit et l'achat"
//   • Bouton secondary mint : "Annuler"
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
  Modal,
} from 'react-native';
import { router } from 'expo-router';

// Fonctions SQLite
import {
  getAllCategories,
  getAllMagasins,
  insertProduit,
  insertAchat,
  findOrCreateMagasin,
  Categorie,
  Magasin,
} from '../db/queries';

// Design System & Contexte
import { Theme } from '../constants/theme';
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';
import AppHeader from '../components/AppHeader';
import ProductThumb from '../components/ProductThumb';
import { choisirPhotoProduit } from '../utils/photos';

const MOIS_ABR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export default function NouveauProduitScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const aujourdhui = new Date();
  const dateFormatee = `${aujourdhui.getDate()} ${MOIS_ABR[aujourdhui.getMonth()]} ${aujourdhui.getFullYear()}`;
  const moisCle = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}`;

  // Liste des catégories SQLite (uniquement type 'product')
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);

  // Champs de saisie
  const [nom, setNom] = useState<string>('');
  const [marque, setMarque] = useState<string>('');
  const [categorieChoisie, setCategorieChoisie] = useState<Categorie | null>(null);
  const [prix, setPrix] = useState<string>('');
  const [quantite, setQuantite] = useState<string>('1');
  const [unite, setUnite] = useState<string>('pièce');
  const [magasinNom, setMagasinNom] = useState<string>('');
  const [dateAchat, setDateAchat] = useState<string>(dateFormatee);
  const [photoNom, setPhotoNom] = useState<string>('');
  const [erreurNom, setErreurNom] = useState('');
  const [erreurPrix, setErreurPrix] = useState('');
  const [erreurQte, setErreurQte] = useState('');

  // Modale de sélection de catégorie
  const [modalCatVisible, setModalCatVisible] = useState<boolean>(false);

  useEffect(() => {
    const cats = getAllCategories(true);
    // Filtrer par les catégories de type 'product' (ou toutes si non typé)
    const catsProd = cats.filter((c) => c.type === 'product' || !c.type);
    setCategories(catsProd.length > 0 ? catsProd : cats);
    if (catsProd.length > 0) {
      setCategorieChoisie(catsProd[0]);
    } else if (cats.length > 0) {
      setCategorieChoisie(cats[0]);
    }

    const mags = getAllMagasins();
    setMagasins(mags);
  }, []);

  // ----------------------------------------------------------
  // ENREGISTREMENT DU PRODUIT ET DE L'ACHAT INITIAL
  // ----------------------------------------------------------
  async function handleChoisirPhoto() {
    const nomFichier = await choisirPhotoProduit();
    if (nomFichier) setPhotoNom(nomFichier);
  }

  function handleEnregistrer() {
    if (!user) return;
    setErreurNom('');
    setErreurPrix('');
    setErreurQte('');

    if (!nom.trim()) {
      setErreurNom('Saisissez le nom du produit.');
      return;
    }

    if (!categorieChoisie) {
      Alert.alert(t('erreur') ?? 'Attention', 'Veuillez choisir une catégorie.');
      return;
    }

    const montantPrix = parseFloat(prix.replace(',', '.'));
    const qte = parseFloat(quantite.replace(',', '.'));
    if (prix.trim() && (isNaN(montantPrix) || montantPrix < 0)) {
      setErreurPrix('Le prix doit être un nombre positif ou zéro.');
      return;
    }
    if (quantite.trim() && (isNaN(qte) || qte <= 0)) {
      setErreurQte('La quantité doit être supérieure à zéro.');
      return;
    }

    const produitId = insertProduit({
      nom: nom.trim(),
      marque: marque.trim(),
      unite: unite.trim() || 'pièce',
      categorie_id: categorieChoisie.id,
      created_by: user.id,
      photo_uri: photoNom,
    });

    if (!isNaN(montantPrix) && montantPrix > 0) {
      let magId: number | null = null;
      if (magasinNom.trim()) {
        magId = findOrCreateMagasin(magasinNom.trim());
      }
      const quantiteValide = !isNaN(qte) && qte > 0 ? qte : 1;
      insertAchat({
        produit_id: produitId,
        utilisateur_id: user.id,
        magasin_id: magId,
        categorie_id: categorieChoisie.id,
        prix_unitaire: montantPrix / quantiteValide,
        quantite: quantiteValide,
        prix_total: montantPrix,
        mois: moisCle,
        notes: marque.trim() ? `Marque : ${marque.trim()}` : '',
      });
    }

    router.back();
  }

  return (
    <View style={styles.container}>
      {/* Header avec action retour */}
      <AppHeader
        titre={t('ajouter_produit') ?? 'Ajouter un produit'}
        onMenuPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Label uppercase */}
        <Text style={styles.sectionLabel}>
          {t('infos_produit') ?? 'INFORMATIONS DU PRODUIT'}
        </Text>

        {/* Titre principal */}
        <Text style={styles.screenTitle}>
          {t('un_nouveau_produit') ?? 'Un nouveau produit à suivre.'}
        </Text>

        {/* 1. Nom du produit */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('nom_produit') ?? 'Nom du produit'}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Huile d'olive"
            placeholderTextColor={Theme.colors.muted}
            value={nom}
            onChangeText={setNom}
          />
        </View>

        {/* 2. Marque */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('marque') ?? 'Marque'}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Châal"
            placeholderTextColor={Theme.colors.muted}
            value={marque}
            onChangeText={setMarque}
          />
        </View>

        {/* 3. Photo facultative */}
        <TouchableOpacity
          style={styles.inputCard}
          activeOpacity={0.8}
          onPress={handleChoisirPhoto}
        >
          <Text style={styles.inputLabel}>Photo · facultative</Text>
          {photoNom ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <ProductThumb photoPath={photoNom} icone="☐" taille={56} />
              <Text style={styles.photoAddText}>Changer la photo</Text>
            </View>
          ) : (
            <Text style={styles.photoAddText}>+ Ajouter une photo</Text>
          )}
        </TouchableOpacity>

        {/* 4. Catégorie de produit */}
        <TouchableOpacity
          style={styles.inputCard}
          activeOpacity={0.8}
          onPress={() => setModalCatVisible(true)}
        >
          <Text style={styles.inputLabel}>{t('categorie')}</Text>
          <View style={styles.catSelectedRow}>
            <Text style={styles.catValueText}>
              {categorieChoisie ? `${categorieChoisie.icone} ${categorieChoisie.nom}` : (t('selectionner') ?? 'Sélectionner...')}
            </Text>
            <Text style={styles.chevron}>▾</Text>
          </View>
        </TouchableOpacity>

        {/* 5. Prix · DT */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('prix_unitaire')}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: 14.500"
            placeholderTextColor={Theme.colors.muted}
            keyboardType="decimal-pad"
            value={prix}
            onChangeText={setPrix}
          />
        </View>

        {/* 6. Quantité */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('quantite') ?? 'Quantité'}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="1"
            placeholderTextColor={Theme.colors.muted}
            keyboardType="numeric"
            value={quantite}
            onChangeText={setQuantite}
          />
        </View>

        {/* 7. Unité */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('unite') ?? 'Unité'}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: L, kg, pièce, boite..."
            placeholderTextColor={Theme.colors.muted}
            value={unite}
            onChangeText={setUnite}
          />
        </View>

        {/* 8. Magasin */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('lieu_achat') ?? 'Magasin'}</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Ex: Monoprix, Carrefour, Épicerie..."
            placeholderTextColor={Theme.colors.muted}
            value={magasinNom}
            onChangeText={setMagasinNom}
          />
        </View>

        {/* 9. Date d'achat */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('date_achat_label')}</Text>
          <TextInput
            style={styles.textInput}
            value={dateAchat}
            onChangeText={setDateAchat}
          />
        </View>

        {/* Note informative en bas de formulaire */}
        <Text style={styles.formNote}>
          Catégories : alimentation ; vêtements et chaussures ; hygiène et soins ; maison et équipement ; matériel informatique ; santé et médicaments.
        </Text>

        {/* Bouton primary : Enregistrer le produit et l'achat */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleEnregistrer}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>
            {t('enregistrer')}
          </Text>
        </TouchableOpacity>

        {/* Bouton secondary mint : Annuler */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>
            {t('annuler') ?? 'Annuler'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODALE DE SÉLECTION DE CATÉGORIE */}
      <Modal
        visible={modalCatVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalCatVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalCatVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir une catégorie</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {categories.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setCategorieChoisie(c);
                    setModalCatVisible(false);
                  }}
                >
                  <Text style={styles.modalItemIcon}>{c.icone}</Text>
                  <Text style={styles.modalItemName}>{c.nom}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 15
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

  // Label uppercase muted
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // Titre principal
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 20,
  },

  // Cartes blanches de champ
  inputCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    color: Theme.colors.ink,
    fontWeight: '600',
    padding: 0,
  },

  photoAddText: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  catSelectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catValueText: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
  chevron: {
    fontSize: 14,
    color: Theme.colors.muted,
  },

  // Note de bas de page
  formNote: {
    fontSize: 12,
    color: Theme.colors.muted,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 20,
  },

  // Boutons
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Theme.shadows.button,
  },
  primaryBtnText: {
    color: Theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Theme.colors.deepGreen,
    fontSize: 15,
    fontWeight: '700',
  },

  // Modale sélecteur
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: 20,
    ...Theme.shadows.card,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalItemIcon: {
    fontSize: 20,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
});
