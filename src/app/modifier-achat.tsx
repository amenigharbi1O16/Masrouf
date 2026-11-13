// ============================================================
// FICHIER : src/app/modifier-achat.tsx
// MISSION : Modifier ou supprimer un achat de produit ou une dépense simple.
//           Affiche les erreurs précises sous chaque champ.
//           Met à jour le budget de la différence seulement.
//           Propose un bouton Supprimer avec modale de confirmation.
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

import {
  getAchatById,
  updateAchat,
  deleteAchat,
  getAllCategories,
  getAllMagasins,
  getEnveloppesBudget,
  Achat,
  Categorie,
  Magasin,
  EnveloppeBudget,
} from '../db/queries';

import { Theme } from '../constants/theme';
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';
import AppHeader from '../components/AppHeader';
import ProductThumb from '../components/ProductThumb';

export default function ModifierAchatScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string }>();
  const achatId = Number(params.id);

  const [achat, setAchat] = useState<Achat | null>(null);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [magasins, setMagasins] = useState<Magasin[]>([]);
  const [enveloppes, setEnveloppes] = useState<EnveloppeBudget[]>([]);

  // Champs de formulaire
  const [prixTotal, setPrixTotal] = useState('');
  const [quantite, setQuantite] = useState('1');
  const [magasinNom, setMagasinNom] = useState('');
  const [dateAchat, setDateAchat] = useState('');
  const [description, setDescription] = useState('');
  const [categorieId, setCategorieId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');

  // Erreurs précises sous les champs
  const [erreurPrix, setErreurPrix] = useState('');
  const [erreurQte, setErreurQte] = useState('');
  const [erreurDate, setErreurDate] = useState('');
  const [erreurDesc, setErreurDesc] = useState('');

  // Modale catégorie pour dépense simple
  const [modalCatVisible, setModalCatVisible] = useState(false);

  useEffect(() => {
    if (!user || !achatId) return;
    const a = getAchatById(achatId, user.id);
    if (!a) return;

    setAchat(a);
    setPrixTotal(a.prix_total ? a.prix_total.toString() : '');
    setQuantite(a.quantite ? a.quantite.toString() : '1');
    setMagasinNom(a.magasin_nom || '');
    setDateAchat(a.date_achat || '');
    setDescription(a.titre || a.produit_nom || '');
    setCategorieId(a.categorie_id || null);
    setNotes(a.notes || '');

    const cats = getAllCategories(true);
    setCategories(cats);
    setMagasins(getAllMagasins());

    const moisCle = a.date_achat ? a.date_achat.substring(0, 7) : '';
    if (moisCle) {
      setEnveloppes(getEnveloppesBudget(user.id, moisCle));
    }
  }, [user, achatId]);

  if (!user || !achat) {
    return (
      <View style={styles.container}>
        <AppHeader titre="Modifier la transaction" onMenuPress={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.emptyText}>Transaction introuvable.</Text>
        </View>
      </View>
    );
  }

  const estProduit = Boolean(achat.produit_id);
  const prixInitial = achat.prix_total || 0;
  const prixNum = parseFloat(prixTotal.replace(',', '.'));
  const qteNum = parseFloat(quantite.replace(',', '.'));
  const differenceBudget = !isNaN(prixNum) ? prixNum - prixInitial : 0;
  const prixUnitaireCalcule =
    !isNaN(prixNum) && !isNaN(qteNum) && qteNum > 0 ? (prixNum / qteNum).toFixed(3) : '0.000';

  const catChoisie = categories.find((c) => c.id === categorieId);
  const envActive = enveloppes.find((e) => e.categorie_id === categorieId);

  // ------------------------------------------------------------
  // Validation rigoureuse avec message d'erreur sous chaque champ
  // ------------------------------------------------------------
  function valider(): boolean {
    let valide = true;
    setErreurPrix('');
    setErreurQte('');
    setErreurDate('');
    setErreurDesc('');

    // Vérification du prix / montant
    if (prixTotal.trim() === '') {
      setErreurPrix('Le montant ne peut pas être vide.');
      valide = false;
    } else if (isNaN(prixNum)) {
      setErreurPrix('Format de nombre invalide.');
      valide = false;
    } else if (prixNum <= 0) {
      setErreurPrix('Le montant doit être strictement supérieur à zéro.');
      valide = false;
    }

    // Vérification de la quantité (si achat produit)
    if (estProduit) {
      if (quantite.trim() === '') {
        setErreurQte('La quantité ne peut pas être vide.');
        valide = false;
      } else if (isNaN(qteNum)) {
        setErreurQte('Quantité invalide.');
        valide = false;
      } else if (qteNum <= 0) {
        setErreurQte('La quantité doit être supérieure à zéro.');
        valide = false;
      }
    } else {
      if (!description.trim()) {
        setErreurDesc('La description est obligatoire.');
        valide = false;
      }
    }

    // Vérification de la date
    if (!dateAchat.trim()) {
      setErreurDate('La date est obligatoire.');
      valide = false;
    } else {
      const d = new Date(dateAchat);
      if (isNaN(d.getTime())) {
        setErreurDate('Format de date invalide (ex: 2026-11-13).');
        valide = false;
      }
    }

    return valide;
  }

  function handleEnregistrer() {
    if (!valider() || !user || !achat) return;

    updateAchat(achat.id, user.id, {
      prix_total: prixNum,
      quantite: estProduit ? qteNum : 1,
      date_achat: dateAchat.trim(),
      magasin: magasinNom.trim(),
      label: !estProduit ? description.trim() : undefined,
      categorie_id: categorieId,
      notes: notes.trim() || undefined,
    });

    Alert.alert(
      'Transaction modifiée',
      differenceBudget !== 0
        ? `L'enveloppe a été ajustée de ${differenceBudget > 0 ? '+' : ''}${differenceBudget.toFixed(3)} DT.`
        : 'Modifications enregistrées avec succès.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }

  function handleSupprimer() {
    if (!user || !achat) return;

    Alert.alert(
      'Supprimer la transaction',
      `Êtes-vous sûr de vouloir supprimer cette dépense de ${prixInitial.toFixed(3)} DT ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteAchat(achat.id, user.id);
            Alert.alert('Supprimée', 'La transaction a été supprimée.', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        titre={estProduit ? "Modifier l'achat" : 'Modifier la dépense'}
        onMenuPress={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>
          {estProduit ? 'ACHAT DE PRODUIT' : 'DÉPENSE SIMPLE'}
        </Text>

        {/* Aperçu produit ou titre dépense */}
        {estProduit ? (
          <View style={styles.productCard}>
            <ProductThumb
              photoPath={achat.produit_photo}
              icone={achat.produit_icone || '🛍️'}
              taille={48}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{achat.produit_nom}</Text>
              <Text style={styles.productSub}>{achat.magasin_nom || 'Non précisé'}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Description de la dépense</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={(txt) => {
                setDescription(txt);
                setErreurDesc('');
              }}
              placeholder="Ex: Facture d'électricité, transport..."
              placeholderTextColor={Theme.colors.muted}
            />
            {erreurDesc ? <Text style={styles.erreur}>{erreurDesc}</Text> : null}
          </View>
        )}

        {/* Montant / Prix total */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>
            {estProduit ? 'Prix total payé (DT)' : 'Montant dépensé (DT)'}
          </Text>
          <TextInput
            style={styles.textInput}
            value={prixTotal}
            keyboardType="decimal-pad"
            onChangeText={(txt) => {
              setPrixTotal(txt);
              setErreurPrix('');
            }}
            placeholder="0.000"
            placeholderTextColor={Theme.colors.muted}
          />
          {erreurPrix ? <Text style={styles.erreur}>{erreurPrix}</Text> : null}
        </View>

        {/* Quantité (pour produit) */}
        {estProduit && (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Quantité</Text>
            <TextInput
              style={styles.textInput}
              value={quantite}
              keyboardType="numeric"
              onChangeText={(txt) => {
                setQuantite(txt);
                setErreurQte('');
              }}
              placeholder="1"
              placeholderTextColor={Theme.colors.muted}
            />
            {erreurQte ? <Text style={styles.erreur}>{erreurQte}</Text> : null}
          </View>
        )}

        {/* Prix unitaire calculé (pour produit) */}
        {estProduit && (
          <View style={styles.unitPriceRow}>
            <Text style={styles.unitPriceLabel}>Nouveau prix unitaire calculé</Text>
            <Text style={styles.unitPriceValue}>{prixUnitaireCalcule} DT</Text>
          </View>
        )}

        {/* Magasin */}
        {estProduit && (
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>Magasin</Text>
            <TextInput
              style={styles.textInput}
              value={magasinNom}
              onChangeText={setMagasinNom}
              placeholder="Ex: Carrefour, Épicerie..."
              placeholderTextColor={Theme.colors.muted}
            />
          </View>
        )}

        {/* Catégorie (pour dépense simple) */}
        {!estProduit && (
          <TouchableOpacity
            style={styles.inputCard}
            onPress={() => setModalCatVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.inputLabel}>Catégorie</Text>
            <View style={styles.catRow}>
              <Text style={styles.catText}>
                {catChoisie ? `${catChoisie.icone} ${catChoisie.nom}` : 'Sélectionner...'}
              </Text>
              <Text style={styles.chevron}>▾</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Date */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Date (AAAA-MM-JJ)</Text>
          <TextInput
            style={styles.textInput}
            value={dateAchat}
            onChangeText={(txt) => {
              setDateAchat(txt);
              setErreurDate('');
            }}
            placeholder="Ex: 2026-11-13"
            placeholderTextColor={Theme.colors.muted}
          />
          {erreurDate ? <Text style={styles.erreur}>{erreurDate}</Text> : null}
        </View>

        {/* Notes */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Notes (facultatif)</Text>
          <TextInput
            style={styles.textInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Remarques..."
            placeholderTextColor={Theme.colors.muted}
          />
        </View>

        {/* Impact budgétaire */}
        <View style={styles.mintBanner}>
          <Text style={styles.mintIcon}>✓</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.mintTitle}>Impact sur le budget</Text>
            <Text style={styles.mintSub}>
              {differenceBudget === 0
                ? 'Aucune variation du montant total alloué.'
                : `Ajustement de l'enveloppe de ${differenceBudget > 0 ? '+' : ''}${differenceBudget.toFixed(3)} DT (différence seule).`}
            </Text>
            {envActive && (
              <Text style={[styles.mintSub, { marginTop: 4, fontWeight: '600' }]}>
                Enveloppe {catChoisie?.nom} : alloué {envActive.montant_alloue.toFixed(3)} DT
              </Text>
            )}
          </View>
        </View>

        {/* Bouton Enregistrer */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleEnregistrer} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Enregistrer la modification</Text>
        </TouchableOpacity>

        {/* Bouton Supprimer */}
        <TouchableOpacity style={styles.dangerBtn} onPress={handleSupprimer} activeOpacity={0.85}>
          <Text style={styles.dangerBtnText}>Supprimer cette transaction</Text>
        </TouchableOpacity>

        {/* Bouton Annuler */}
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.secondaryBtnText}>Annuler</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modale choix catégorie */}
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
                    setCategorieId(c.id);
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.warm },
  scroll: { padding: 16, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 15, color: Theme.colors.muted },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Theme.colors.white,
    padding: 14,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 14,
  },
  productName: { fontSize: 16, fontWeight: '700', color: Theme.colors.ink },
  productSub: { fontSize: 13, color: Theme.colors.muted },
  inputCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 12,
    ...Theme.shadows.card,
  },
  inputLabel: { fontSize: 12, color: Theme.colors.muted, marginBottom: 4 },
  textInput: { fontSize: 15, fontWeight: '600', color: Theme.colors.ink, padding: 0 },
  erreur: { color: Theme.colors.coral, fontSize: 12, marginTop: 4, fontWeight: '500' },
  unitPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
    marginBottom: 10,
  },
  unitPriceLabel: { fontSize: 14, color: Theme.colors.muted },
  unitPriceValue: { fontSize: 15, fontWeight: '800', color: Theme.colors.ink },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catText: { fontSize: 15, fontWeight: '600', color: Theme.colors.ink },
  chevron: { fontSize: 16, color: Theme.colors.muted },
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 20,
  },
  mintIcon: { fontSize: 16, fontWeight: '800', color: Theme.colors.deepGreen, marginTop: 1 },
  mintTitle: { fontSize: 14, fontWeight: '800', color: Theme.colors.deepGreen, marginBottom: 2 },
  mintSub: { fontSize: 13, color: Theme.colors.forest, lineHeight: 18 },
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.full,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...Theme.shadows.button,
  },
  primaryBtnText: { color: Theme.colors.white, fontSize: 15, fontWeight: '700' },
  dangerBtn: {
    backgroundColor: Theme.colors.coral,
    borderRadius: Theme.radius.full,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dangerBtnText: { color: Theme.colors.white, fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.full,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: Theme.colors.deepGreen, fontSize: 15, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.xl,
    padding: 20,
    maxHeight: 400,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Theme.colors.ink, marginBottom: 14 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalItemIcon: { fontSize: 20 },
  modalItemName: { fontSize: 15, fontWeight: '600', color: Theme.colors.ink },
});
