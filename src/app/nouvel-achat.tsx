// ============================================================
// FICHIER : src/app/nouvel-achat.tsx
// RÔLE    : Écran d'enregistrement d'un achat de produit ou d'une dépense simple.
//           Conforme aux designs Figma 16 (Achat produit) & 17 (Dépense simple).
//
// VISUEL SUR L'ÉCRAN :
//   • Header : ‹ retour + "Ajouter un achat / une dépense" + icône profil
//   • Sélecteur de mode ergonomique : [ Achat produit ]  [ Dépense simple ]
//   • Mode Achat produit (Figma 16) :
//       - Label "ENREGISTRER L'ACHAT D'UN PRODUIT"
//       - Carte aperçu produit mint : icône + nom + marque · catégorie · unité
//       - Champs : Produit, Prix total DT, Quantité, Unité, Magasin, Date
//       - Ligne "Prix unitaire calculé   X DT / unité"
//       - Bouton primary "Enregistrer l'achat" + secondary "Annuler"
//   • Mode Dépense simple (Figma 17) :
//       - Label "AUCUN PRODUIT NÉCESSAIRE"
//       - Titre "Gardez vos essentiels en vue."
//       - Champs : Montant DT, Description, Catégorie, Date
//       - Bannière mint d'impact budgétaire
//       - Bouton primary "Enregistrer la dépense" + secondary "Annuler"
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
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

// Fonctions SQLite
import {
  getAllProduits,
  getAllMagasins,
  getAllCategories,
  insertAchat,
  findOrCreateMagasin,
  getEnveloppesBudget,
  suggestProduits,
  getAchatsByProduit,
  Produit,
  Magasin,
  Categorie,
  EnveloppeBudget,
} from '../db/queries';

// Design System & Contexte
import { Theme } from '../constants/theme';
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';
import AppHeader from '../components/AppHeader';
import ProductThumb from '../components/ProductThumb';

const MOIS_ABR = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

export default function NouvelAchatScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ produitId?: string; mode?: string }>();

  const aujourdhui = new Date();
  const dateFormatee = `${aujourdhui.getDate()} ${MOIS_ABR[aujourdhui.getMonth()]} ${aujourdhui.getFullYear()}`;
  const moisCle = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}`;

  // Mode actif : 'produit' (Figma 16) ou 'direct' (Figma 17)
  const [mode, setMode] = useState<'produit' | 'direct'>(
    params.mode === 'direct' ? 'direct' : 'produit'
  );

  // Données de référence SQLite
  const [produits, setProduits] = useState<Produit[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [enveloppes, setEnveloppes] = useState<EnveloppeBudget[]>([]);

  // Champs de saisie MODE PRODUIT
  const [produitChoisi, setProduitChoisi] = useState<Produit | null>(null);
  const [saisieProduit, setSaisieProduit] = useState('');
  const [prixTotal, setPrixTotal] = useState<string>('');
  const [quantite, setQuantite] = useState<string>('1');
  const [unite, setUnite] = useState<string>('');
  const [magasinNom, setMagasinNom] = useState<string>('');
  const [dateAchat, setDateAchat] = useState<string>(dateFormatee);
  const [erreurPrix, setErreurPrix] = useState('');
  const [erreurQte, setErreurQte] = useState('');

  // Champs de saisie MODE DÉPENSE DIRECTE
  const [montantDirect, setMontantDirect] = useState<string>('');
  const [descriptionDirecte, setDescriptionDirecte] = useState<string>('');
  const [categorieDirecte, setCategorieDirecte] = useState<Categorie | null>(null);

  // Modales
  const [modalProdVisible, setModalProdVisible] = useState<boolean>(false);
  const [modalCatVisible, setModalCatVisible] = useState<boolean>(false);
  const [rechercheProd, setRechercheProd] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    const p = getAllProduits(user.id);
    const m = getAllMagasins();
    const c = getAllCategories(true);
    const envs = getEnveloppesBudget(user.id, moisCle);

    setProduits(p);
    setMagasins(m);
    setCategories(c);
    setEnveloppes(envs);

    if (params.produitId) {
      const trouvé = p.find((item) => item.id === Number(params.produitId));
      if (trouvé) {
        setProduitChoisi(trouvé);
        setSaisieProduit(trouvé.nom);
        setUnite(trouvé.unite);
        setMode('produit');
      }
    } else if (p.length > 0) {
      setProduitChoisi(p[0]);
      setSaisieProduit(p[0].nom);
      setUnite(p[0].unite);
    }

    // Catégorie directe par défaut (type 'expense')
    const catDepense = c.filter((x) => x.type === 'expense');
    if (catDepense.length > 0) {
      setCategorieDirecte(catDepense[0]);
    } else if (c.length > 0) {
      setCategorieDirecte(c[0]);
    }
  }, [user, params.produitId, params.mode]);

  // Calcul du prix unitaire en direct
  const prixNum = parseFloat(prixTotal.replace(',', '.'));
  const qteNum = parseFloat(quantite.replace(',', '.'));
  const prixUnitaireCalcule =
    !isNaN(prixNum) && !isNaN(qteNum) && qteNum > 0 ? (prixNum / qteNum).toFixed(3) : '0.000';
  const suggestions = user ? suggestProduits(user.id, saisieProduit) : [];
  const dernierAchat =
    user && produitChoisi ? getAchatsByProduit(produitChoisi.id, user.id)[0] : undefined;
  const unitesCompatibles = !dernierAchat || !produitChoisi || unite.trim() === produitChoisi.unite;
  const nouveauUnitaire = !isNaN(prixNum) && !isNaN(qteNum) && qteNum > 0 ? prixNum / qteNum : 0;

  // Recherche de produits dans la modale
  const produitsFiltres = produits.filter((p) =>
    p.nom.toLowerCase().includes(rechercheProd.toLowerCase()) ||
    p.marque.toLowerCase().includes(rechercheProd.toLowerCase())
  );

  // Enveloppe budgétaire correspondante pour la dépense directe
  const enveloppeActive = categorieDirecte
    ? enveloppes.find((e) => e.categorie_id === categorieDirecte.id)
    : null;

  // ----------------------------------------------------------
  // VALIDATION ET ENREGISTREMENT
  // ----------------------------------------------------------
  function handleEnregistrer() {
    if (!user) return;

    if (mode === 'produit') {
      setErreurPrix('');
      setErreurQte('');
      if (!produitChoisi) {
        Alert.alert(t('erreur') ?? 'Attention', 'Choisissez un produit dans les suggestions.');
        return;
      }
      if (prixTotal.trim() === '' || isNaN(prixNum) || prixNum <= 0) {
        setErreurPrix('Saisissez un prix total supérieur à zéro.');
        return;
      }
      if (quantite.trim() === '' || isNaN(qteNum) || qteNum <= 0) {
        setErreurQte('La quantité doit être supérieure à zéro.');
        return;
      }

      let magId: number | null = null;
      if (magasinNom.trim()) {
        magId = findOrCreateMagasin(magasinNom.trim());
      }

      insertAchat({
        produit_id: produitChoisi.id,
        utilisateur_id: user.id,
        magasin_id: magId,
        categorie_id: produitChoisi.categorie_id,
        prix_unitaire: prixNum / qteNum,
        quantite: qteNum,
        prix_total: prixNum,
        mois: moisCle,
        notes: `Achat de ${produitChoisi.nom}`,
      });
    } else {
      const montantNum = parseFloat(montantDirect.replace(',', '.')) || 0;
      if (montantNum <= 0) {
        Alert.alert(t('erreur') ?? 'Attention', 'Veuillez saisir un montant valide.');
        return;
      }
      if (!descriptionDirecte.trim()) {
        Alert.alert(t('erreur') ?? 'Attention', 'Veuillez renseigner une description.');
        return;
      }

      insertAchat({
        produit_id: null,
        utilisateur_id: user.id,
        magasin_id: null,
        categorie_id: categorieDirecte ? categorieDirecte.id : null,
        titre: descriptionDirecte.trim(),
        prix_unitaire: montantNum,
        quantite: 1,
        prix_total: montantNum,
        mois: moisCle,
        notes: descriptionDirecte.trim(),
      });
    }

    router.back();
  }

  return (
    <View style={styles.container}>
      {/* Header avec action retour */}
      <AppHeader
        titre={mode === 'produit' ? 'Ajouter un achat' : 'Ajouter une dépense'}
        onMenuPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Toggle Mode Achat produit vs Dépense simple */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'produit' && styles.toggleBtnActive]}
            onPress={() => setMode('produit')}
          >
            <Text style={[styles.toggleText, mode === 'produit' && styles.toggleTextActive]}>
              Achat produit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, mode === 'direct' && styles.toggleBtnActive]}
            onPress={() => setMode('direct')}
          >
            <Text style={[styles.toggleText, mode === 'direct' && styles.toggleTextActive]}>
              Dépense simple
            </Text>
          </TouchableOpacity>
        </View>

        {mode === 'produit' ? (
          /* ==================================================== */
          /* DESIGN FIGMA 16 : AJOUTER UN ACHAT DE PRODUIT        */
          /* ==================================================== */
          <View>
            <Text style={styles.sectionLabel}>
              ENREGISTRER L'ACHAT D'UN PRODUIT
            </Text>

            {/* Carte aperçu produit sélectionné (Figma 16 top card) */}
            {produitChoisi && (
              <TouchableOpacity
                style={styles.previewCard}
                onPress={() => setModalProdVisible(true)}
                activeOpacity={0.8}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarIcon}>
                    {produitChoisi.categorie_icone || '🛍️'}
                  </Text>
                </View>
                <View style={styles.previewInfo}>
                  <Text style={styles.previewName}>{produitChoisi.nom}</Text>
                  <Text style={styles.previewSub}>
                    {produitChoisi.marque ? `${produitChoisi.marque} · ` : ''}
                    {produitChoisi.categorie_nom} · {produitChoisi.unite}
                  </Text>
                </View>
                <Text style={styles.chevronSmall}>▾</Text>
              </TouchableOpacity>
            )}

            {/* Champ Produit */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Produit</Text>
              <TextInput
                style={styles.textInput}
                value={saisieProduit}
                placeholder="Tapez un nom…"
                placeholderTextColor={Theme.colors.muted}
                onChangeText={(texte) => {
                  setSaisieProduit(texte);
                  if (!produitChoisi || produitChoisi.nom !== texte) {
                    setProduitChoisi(null);
                  }
                }}
              />
            </View>
            {suggestions.length > 0 && saisieProduit.trim().length > 0 && (
              <View style={styles.inputCard}>
                {suggestions.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: 10 }}
                    onPress={() => {
                      setProduitChoisi(p);
                      setSaisieProduit(p.nom);
                      setUnite(p.unite);
                    }}
                  >
                    <ProductThumb photoPath={p.photo_uri} icone={p.categorie_icone} taille={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.previewName}>{p.nom}</Text>
                      <Text style={styles.previewSub}>{p.categorie_nom}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!produitChoisi && saisieProduit.trim().length > 1 && suggestions.length > 0 && (
              <Text style={styles.hintText}>Ce nom ressemble à un produit déjà enregistré.</Text>
            )}

            {/* Prix total · DT */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Prix total · DT</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 14.500"
                placeholderTextColor={Theme.colors.muted}
                keyboardType="decimal-pad"
                value={prixTotal}
                onChangeText={(v) => {
                  setPrixTotal(v);
                  setErreurPrix('');
                }}
              />
              {erreurPrix ? <Text style={{ color: Theme.colors.coral, marginTop: 6 }}>{erreurPrix}</Text> : null}
            </View>

            {/* Quantité */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Quantité</Text>
              <TextInput
                style={styles.textInput}
                placeholder="1"
                placeholderTextColor={Theme.colors.muted}
                keyboardType="numeric"
                value={quantite}
                onChangeText={(v) => {
                  setQuantite(v);
                  setErreurQte('');
                }}
              />
              {erreurQte ? <Text style={{ color: Theme.colors.coral, marginTop: 6 }}>{erreurQte}</Text> : null}
            </View>

            {/* Unité */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Unité</Text>
              <TextInput
                style={styles.textInput}
                value={unite}
                onChangeText={setUnite}
                placeholder="L, kg, pièce..."
                placeholderTextColor={Theme.colors.muted}
              />
            </View>

            {/* Magasin */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Magasin</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Monoprix, Carrefour, Épicerie..."
                placeholderTextColor={Theme.colors.muted}
                value={magasinNom}
                onChangeText={setMagasinNom}
              />
            </View>

            {/* Date */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.textInput}
                value={dateAchat}
                onChangeText={setDateAchat}
              />
            </View>

            {/* Ligne Prix unitaire calculé (Figma 16) */}
            <View style={styles.unitPriceRow}>
              <Text style={styles.unitPriceLabel}>Prix unitaire calculé</Text>
              <Text style={styles.unitPriceValue}>
                {prixUnitaireCalcule} DT / {unite || 'unité'}
              </Text>
            </View>

            <Text style={styles.hintText}>
              Prix unitaire = prix total ÷ quantité. Comparez au précédent achat avant de valider.
            </Text>

            {produitChoisi && prixNum > 0 && qteNum > 0 && (
              <View style={styles.previewCard}>
                {!dernierAchat ? (
                  <Text style={styles.previewName}>Premier achat de ce produit</Text>
                ) : !unitesCompatibles ? (
                  <Text style={styles.previewName}>
                    {dernierAchat.prix_unitaire.toFixed(3)} DT / {produitChoisi.unite} puis {nouveauUnitaire.toFixed(3)} DT / {unite}. Unités différentes : pas de pourcentage.
                  </Text>
                ) : (
                  <Text style={styles.previewName}>
                    {(nouveauUnitaire - dernierAchat.prix_unitaire) <= 0 ? '↓' : '↑'}{' '}
                    {(nouveauUnitaire - dernierAchat.prix_unitaire).toFixed(3)} DT /{' '}
                    {dernierAchat.prix_unitaire > 0
                      ? `${(((nouveauUnitaire - dernierAchat.prix_unitaire) / dernierAchat.prix_unitaire) * 100).toFixed(1)} %`
                      : '—'}
                  </Text>
                )}
              </View>
            )}

            {/* Boutons d'action */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleEnregistrer}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {prixNum > 0 ? 'Enregistrer l\'achat' : 'Comparer le prix'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>
                {t('annuler') ?? 'Annuler'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* ==================================================== */
          /* DESIGN FIGMA 17 : AJOUTER UNE DÉPENSE SIMPLE         */
          /* ==================================================== */
          <View>
            <Text style={styles.sectionLabel}>
              AUCUN PRODUIT NÉCESSAIRE
            </Text>
            <Text style={styles.screenTitle}>
              Gardez vos essentiels en vue.
            </Text>

            {/* Montant · DT */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Montant · DT</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 35.000"
                placeholderTextColor={Theme.colors.muted}
                keyboardType="decimal-pad"
                value={montantDirect}
                onChangeText={setMontantDirect}
              />
            </View>

            {/* Description */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Abonnement mensuel de bus, Facture..."
                placeholderTextColor={Theme.colors.muted}
                value={descriptionDirecte}
                onChangeText={setDescriptionDirecte}
              />
            </View>

            {/* Catégorie de dépense */}
            <TouchableOpacity
              style={styles.inputCard}
              onPress={() => setModalCatVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.inputLabel}>Catégorie de dépense</Text>
              <View style={styles.catSelectedRow}>
                <Text style={styles.fieldValue}>
                  {categorieDirecte ? `${categorieDirecte.icone} ${categorieDirecte.nom}` : 'Sélectionner...'}
                </Text>
                <Text style={styles.chevronSmall}>▾</Text>
              </View>
            </TouchableOpacity>

            {/* Date */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Date</Text>
              <TextInput
                style={styles.textInput}
                value={dateAchat}
                onChangeText={setDateAchat}
              />
            </View>

            {/* Liste de catégories sous forme de note (Figma 17) */}
            <Text style={styles.catsListNote}>
              Transport · Factures · Éducation · Loisirs · Enfants · Aide familiale · Épargne · Dons · Frais bancaires · Autres
            </Text>

            {/* Bannière mint budgétaire après validation (Figma 17) */}
            {enveloppeActive && (
              <View style={styles.mintBanner}>
                <View style={styles.bannerHeaderRow}>
                  <Text style={styles.checkIcon}>✓</Text>
                  <Text style={styles.bannerTitle}>
                    Budget {categorieDirecte?.nom.toLowerCase()} après validation
                  </Text>
                </View>
                <Text style={styles.bannerSub}>
                  {(enveloppeActive.montant_depense + (parseFloat(montantDirect) || 0)).toFixed(3)} / {enveloppeActive.montant_alloue.toFixed(3)} DT · reste {Math.max(0, enveloppeActive.montant_alloue - (enveloppeActive.montant_depense + (parseFloat(montantDirect) || 0))).toFixed(3)} DT
                </Text>
              </View>
            )}

            {/* Boutons d'action */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleEnregistrer}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                Enregistrer la dépense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>
                {t('annuler') ?? 'Annuler'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* MODALE CHOIX PRODUIT */}
      <Modal
        visible={modalProdVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalProdVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sélectionner un produit</Text>
            <TextInput
              style={styles.searchModalInput}
              placeholder="Rechercher par nom..."
              placeholderTextColor={Theme.colors.muted}
              value={rechercheProd}
              onChangeText={setRechercheProd}
            />
            <ScrollView style={{ maxHeight: 300 }}>
              {produitsFiltres.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setProduitChoisi(p);
                    setUnite(p.unite);
                    setModalProdVisible(false);
                  }}
                >
                  <Text style={styles.modalItemIcon}>{p.categorie_icone}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemName}>{p.nom}</Text>
                    <Text style={styles.modalItemSub}>{p.marque} · {p.categorie_nom}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODALE CHOIX CATÉGORIE DÉPENSE */}
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
                    setCategorieDirecte(c);
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
// STYLES — Design Figma 16 & 17
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // Toggle de mode
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: Theme.radius.full,
    padding: 4,
    marginBottom: 20,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Theme.radius.full,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Theme.colors.forest,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.muted,
  },
  toggleTextActive: {
    color: Theme.colors.white,
    fontWeight: '700',
  },

  // Label section uppercase
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginBottom: 20,
  },

  // Carte aperçu produit (Figma 16)
  previewCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarIcon: {
    fontSize: 22,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.ink,
  },
  previewSub: {
    fontSize: 13,
    color: Theme.colors.muted,
  },
  chevronSmall: {
    fontSize: 16,
    color: Theme.colors.muted,
  },

  // Carte de champ de saisie
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
  fieldValue: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.colors.ink,
  },
  catSelectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Prix unitaire calculé (Figma 16)
  unitPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    marginTop: 8,
  },
  unitPriceLabel: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  unitPriceValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.ink,
  },
  hintText: {
    fontSize: 12,
    color: Theme.colors.muted,
    lineHeight: 18,
    marginBottom: 20,
  },
  catsListNote: {
    fontSize: 12,
    color: Theme.colors.muted,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 16,
  },

  // Bannière mint d'impact budgétaire (Figma 17)
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.lg,
    padding: 16,
    marginBottom: 20,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
  },
  bannerSub: {
    fontSize: 13,
    color: Theme.colors.forest,
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

  // Modales
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
    marginBottom: 14,
  },
  searchModalInput: {
    backgroundColor: Theme.colors.warm,
    borderRadius: Theme.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
    color: Theme.colors.ink,
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
  modalItemSub: {
    fontSize: 12,
    color: Theme.colors.muted,
  },
});
