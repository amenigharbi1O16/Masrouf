// ============================================================
// FICHIER : src/app/budget-mois.tsx
// RÔLE    : Écran de configuration du Budget par Enveloppes du mois.
//           Permet à l'utilisateur :
//           1. De saisir son budget total du mois.
//           2. De répartir le budget par enveloppes « Masrouf [Catégorie] ».
//           3. De voir en temps réel : Total, Somme répartie, Reste à répartir.
//           4. D'ajouter des catégories supplémentaires ou personnalisées.
//           5. De recopier le budget du mois précédent en 1 clic.
//           6. Règle anti-triche : interdit de baisser le budget sous les dépenses déjà faites.
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
  getMonthlyBudget,
  saveMonthlyBudget,
  getEnveloppesBudget,
  copyPreviousMonthBudget,
  canDecreaseBudget,
  reassignerDepensesCategorieVersAutres,
  addUserCustomCategory,
  Categorie,
  EnveloppeBudget,
} from '../db/queries';

// Contexte et internationalisation
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';

type EnveloppeItem = {
  categorie_id: number;
  categorie_nom: string;
  categorie_icone: string;
  montant: number;
  pourcentage: number;
  est_systeme?: number;
};

export default function BudgetMoisScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const maintenant = new Date();
  const moisCourant = `${maintenant.getFullYear()}-${String(
    maintenant.getMonth() + 1
  ).padStart(2, '0')}`;

  const [budgetTotalTexte, setBudgetTotalTexte] = useState<string>('');
  const [enveloppes, setEnveloppes] = useState<EnveloppeItem[]>([]);
  const [categoriesDisponibles, setCategoriesDisponibles] = useState<Categorie[]>([]);
  const [modalAjoutVisible, setModalAjoutVisible] = useState<boolean>(false);

  // Formulaire d'ajout de catégorie personnalisée
  const [afficherFormPerso, setAfficherFormPerso] = useState<boolean>(false);
  const [persoNom, setPersoNom] = useState<string>('');
  const [persoIcone, setPersoIcone] = useState<string>('🏷️');
  const [persoType, setPersoType] = useState<'product' | 'expense'>('product');

  // ----------------------------------------------------------
  // CHARGEMENT INITIAL DU BUDGET DU MOIS
  // ----------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    const toutesCats = getAllCategories(true);
    setCategoriesDisponibles(toutesCats);

    const existant = getMonthlyBudget(user.id, moisCourant);

    if (existant && existant.montant_total > 0) {
      setBudgetTotalTexte(String(existant.montant_total));
      const envs = getEnveloppesBudget(user.id, moisCourant);
      setEnveloppes(
        envs.map((e) => ({
          categorie_id: e.categorie_id,
          categorie_nom: e.categorie_nom,
          categorie_icone: e.categorie_icone,
          montant: e.montant_alloue,
          pourcentage: e.pourcentage_alloue,
        }))
      );
    } else {
      // Si aucun budget n'existe encore, on propose les 9 catégories par défaut
      const budgetBase = user.budget_mensuel > 0 ? user.budget_mensuel : 800;
      setBudgetTotalTexte(String(budgetBase));

      const defauts = toutesCats.filter((c) => c.est_defaut === 1);
      const initialEnvs: EnveloppeItem[] = defauts.map((c) => {
        const montant = (budgetBase * c.pourcentage_defaut) / 100;
        return {
          categorie_id: c.id,
          categorie_nom: c.nom,
          categorie_icone: c.icone,
          montant: Math.round(montant),
          pourcentage: c.pourcentage_defaut,
          est_systeme: c.est_systeme,
        };
      });
      setEnveloppes(initialEnvs);
    }
  }, [user, moisCourant]);

  const totalBudget = parseFloat(budgetTotalTexte) || 0;
  const sommeRepartie = enveloppes.reduce((sum, e) => sum + e.montant, 0);
  const resteARepartir = totalBudget - sommeRepartie;
  const estEnDepassement = sommeRepartie > totalBudget;

  // ----------------------------------------------------------
  // MODIFICATION DU BUDGET GLOBAL (Met à jour les montants selon les %)
  // ----------------------------------------------------------
  function handleChangerBudgetTotal(texte: string) {
    setBudgetTotalTexte(texte);
    const nouveauTotal = parseFloat(texte) || 0;

    if (nouveauTotal > 0) {
      setEnveloppes((prev) =>
        prev.map((e) => ({
          ...e,
          montant: Math.round((nouveauTotal * e.pourcentage) / 100),
        }))
      );
    }
  }

  // ----------------------------------------------------------
  // MODIFICATION DU MONTANT D'UNE ENVELOPPE
  // ----------------------------------------------------------
  function handleModifierMontantEnveloppe(catId: number, texte: string) {
    const val = parseFloat(texte) || 0;
    setEnveloppes((prev) =>
      prev.map((e) => {
        if (e.categorie_id === catId) {
          const pct = totalBudget > 0 ? Math.round((val / totalBudget) * 100) : 0;
          return { ...e, montant: val, pourcentage: pct };
        }
        return e;
      })
    );
  }

  // ----------------------------------------------------------
  // SUPPRESSION D'UNE ENVELOPPE (Sauf 'Autres')
  // ----------------------------------------------------------
  function handleSupprimerEnveloppe(env: EnveloppeItem) {
    if (env.categorie_nom.toLowerCase() === 'autres' || env.est_systeme === 1) {
      Alert.alert('Action refusée', "L'enveloppe 'Autres' est obligatoire et ne peut pas être supprimée.");
      return;
    }

    Alert.alert(
      'Supprimer cette enveloppe',
      `Voulez-vous retirer l'enveloppe ${env.categorie_nom} ?\n${t('categorie_supprimee_info')}`,
      [
        { text: t('fermer'), style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            if (user) {
              reassignerDepensesCategorieVersAutres(env.categorie_id);
            }
            setEnveloppes((prev) => prev.filter((e) => e.categorie_id !== env.categorie_id));
          },
        },
      ]
    );
  }

  // ----------------------------------------------------------
  // AJOUTER UNE NOUVELLE ENVELOPPE
  // ----------------------------------------------------------
  function handleAjouterCategorie(c: Categorie) {
    const dejaPresente = enveloppes.some((e) => e.categorie_id === c.id);
    if (dejaPresente) {
      Alert.alert('Attention', 'Cette catégorie fait déjà partie de vos enveloppes.');
      return;
    }

    const nouvelle: EnveloppeItem = {
      categorie_id: c.id,
      categorie_nom: c.nom,
      categorie_icone: c.icone,
      montant: resteARepartir > 0 ? Math.min(resteARepartir, 50) : 0,
      pourcentage: 0,
      est_systeme: c.est_systeme,
    };

    setEnveloppes((prev) => [...prev, nouvelle]);
    setModalAjoutVisible(false);
  }

  // ----------------------------------------------------------
  // CREER UNE CATEGORIE PERSONNALISEE (AVEC SELECTEUR TYPE PRODUIT / DEPENSE)
  // ----------------------------------------------------------
  function handleCreerCategoriePerso() {
    if (!user) return;
    const nomClean = persoNom.trim();
    if (!nomClean) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour votre catégorie.');
      return;
    }
    const newCatId = addUserCustomCategory(
      user.id,
      nomClean,
      persoIcone.trim() || '🏷️',
      persoType,
      'Perso'
    );
    const updatedCats = getAllCategories(true);
    setCategoriesDisponibles(updatedCats);
    const nouvelleCat = updatedCats.find((c) => c.id === newCatId);
    if (nouvelleCat) {
      handleAjouterCategorie(nouvelleCat);
    }
    setPersoNom('');
    setPersoIcone('🏷️');
    setPersoType('product');
    setAfficherFormPerso(false);
  }

  // ----------------------------------------------------------
  // RECOPIER LE MOIS PRECEDENT
  // ----------------------------------------------------------
  function handleRecopierMoisPrecedent() {
    if (!user) return;
    const ok = copyPreviousMonthBudget(user.id, moisCourant);
    if (ok) {
      const existant = getMonthlyBudget(user.id, moisCourant);
      if (existant) {
        setBudgetTotalTexte(String(existant.montant_total));
        const envs = getEnveloppesBudget(user.id, moisCourant);
        setEnveloppes(
          envs.map((e) => ({
            categorie_id: e.categorie_id,
            categorie_nom: e.categorie_nom,
            categorie_icone: e.categorie_icone,
            montant: e.montant_alloue,
            pourcentage: e.pourcentage_alloue,
          }))
        );
      }
      Alert.alert('Succès', 'Le budget du mois précédent a été recopié avec succès !');
    } else {
      Alert.alert('Information', 'Aucun budget enregistré au mois précédent.');
    }
  }

  // ----------------------------------------------------------
  // ENREGISTREMENT ET VALIDATION STRICTE
  // ----------------------------------------------------------
  function handleSauvegarder() {
    if (!user) return;

    if (totalBudget <= 0) {
      Alert.alert('Erreur', 'Veuillez saisir un budget total supérieur à 0.');
      return;
    }

    if (estEnDepassement) {
      Alert.alert(
        'Dépassement interdit',
        `${t('depassement_total')}\n\nSomme allouée : ${sommeRepartie.toFixed(2)} TND\nBudget max : ${totalBudget.toFixed(2)} TND`
      );
      return;
    }

    // REGLE ANTI-TRICHE : vérifie qu'on ne baisse pas une enveloppe sous les dépenses existantes
    for (const env of enveloppes) {
      const autorise = canDecreaseBudget(user.id, moisCourant, env.categorie_id, env.montant);
      if (!autorise) {
        Alert.alert(
          'Règle Anti-triche',
          `${t('anti_triche_erreur')}\n\nEnveloppe : ${env.categorie_nom}`
        );
        return;
      }
    }

    // Enregistrement dans SQLite
    saveMonthlyBudget(user.id, moisCourant, totalBudget, enveloppes);

    Alert.alert('Succès', 'Vos enveloppes budgétaires ont été enregistrées !', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* SECTION 1 : SAISIE DU BUDGET TOTAL */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('budget_mensuel')} ({moisCourant})</Text>
        <Text style={styles.label}>{t('fixer_budget')}</Text>
        <TextInput
          style={styles.inputTotal}
          keyboardType="numeric"
          placeholder="Ex: 800"
          value={budgetTotalTexte}
          onChangeText={handleChangerBudgetTotal}
        />

        {/* RECOPIER MOIS PRECEDENT */}
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={handleRecopierMoisPrecedent}
          activeOpacity={0.8}
        >
          <Text style={styles.copyBtnText}>🔄 {t('recopier_mois_prec')}</Text>
        </TouchableOpacity>
      </View>

      {/* SECTION 2 : REPARTITION EN DIRECT */}
      <View style={[styles.card, estEnDepassement && styles.cardDanger]}>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>{t('somme_repartie')}</Text>
            <Text style={[styles.statValue, estEnDepassement && styles.textDanger]}>
              {sommeRepartie.toFixed(2)} TND
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>{t('reste_a_repartir')}</Text>
            <Text
              style={[
                styles.statValue,
                { color: resteARepartir < 0 ? '#DC2626' : '#059669' },
              ]}
            >
              {resteARepartir.toFixed(2)} TND
            </Text>
          </View>
        </View>

        {estEnDepassement ? (
          <Text style={styles.dangerNotice}>⚠️ {t('depassement_total')}</Text>
        ) : null}
      </View>

      {/* SECTION 3 : LISTE DES ENVELOPPES « MASROUF + CATEGORIE » */}
      <View style={styles.envelopesHeader}>
        <Text style={styles.sectionTitle}>{t('budget_enveloppes')}</Text>
        <TouchableOpacity
          style={styles.addCategoryBtn}
          onPress={() => setModalAjoutVisible(true)}
        >
          <Text style={styles.addCategoryBtnText}>+ {t('ajouter_categorie')}</Text>
        </TouchableOpacity>
      </View>

      {enveloppes.map((env) => (
        <View key={env.categorie_id} style={styles.envelopeCard}>
          <View style={styles.envelopeLeft}>
            <Text style={styles.envelopeIcon}>{env.categorie_icone}</Text>
            <View>
              <Text style={styles.envelopeName}>
                {t('masrouf_prefix')} {env.categorie_nom}
              </Text>
              <Text style={styles.envelopePct}>
                {env.pourcentage}% du total
              </Text>
            </View>
          </View>

          <View style={styles.envelopeRight}>
            <TextInput
              style={styles.envelopeInput}
              keyboardType="numeric"
              value={String(env.montant)}
              onChangeText={(txt) =>
                handleModifierMontantEnveloppe(env.categorie_id, txt)
              }
            />
            <Text style={styles.currencyTnd}>TND</Text>

            {env.categorie_nom.toLowerCase() !== 'autres' ? (
              <TouchableOpacity
                style={styles.deleteEnvBtn}
                onPress={() => handleSupprimerEnveloppe(env)}
              >
                <Text style={styles.deleteEnvText}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ))}

      {/* BOUTON D'ENREGISTREMENT PRINCIPAL */}
      <TouchableOpacity
        style={[styles.saveButton, estEnDepassement && styles.saveButtonDisabled]}
        onPress={handleSauvegarder}
        disabled={estEnDepassement}
        activeOpacity={0.8}
      >
        <Text style={styles.saveButtonText}>{t('enregistrer_budget')}</Text>
      </TouchableOpacity>

      {/* MODAL AJOUT DE CATEGORIE */}
      <Modal visible={modalAjoutVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('ajouter_categorie')}</Text>

                  {/* BOUTON BASCULE : CREER NOUVELLE CATEGORIE PERSO */ }
                  < TouchableOpacity
              style = { styles.togglePersoBtn }
              onPress = {() => setAfficherFormPerso(!afficherFormPerso)}
            >
              <Text style={styles.togglePersoBtnText}>
                {afficherFormPerso ? '← Choisir parmi les catégories existantes' : '+ Créer une catégorie personnalisée'}
              </Text>
            </TouchableOpacity>

            {afficherFormPerso ? (
              <View style={styles.persoForm}>
                <Text style={styles.persoLabel}>Nom de la catégorie *</Text>
                <TextInput
                  style={styles.persoInput}
                  placeholder="Ex: Animaux, Jardinage..."
                  value={persoNom}
                  onChangeText={setPersoNom}
                />

                <Text style={styles.persoLabel}>Type de catégorie *</Text>
                <View style={styles.persoTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.persoTypeBtn,
                      persoType === 'product' && styles.persoTypeBtnActive,
                    ]}
                    onPress={() => setPersoType('product')}
                  >
                    <Text
                      style={[
                        styles.persoTypeText,
                        persoType === 'product' && styles.persoTypeTextActive,
                      ]}
                    >
                      🛒 Produit (Supermarché)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.persoTypeBtn,
                      persoType === 'expense' && styles.persoTypeBtnActive,
                    ]}
                    onPress={() => setPersoType('expense')}
                  >
                    <Text
                      style={[
                        styles.persoTypeText,
                        persoType === 'expense' && styles.persoTypeTextActive,
                      ]}
                    >
                      🧾 Dépense (Fixe / Facture)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.persoLabel}>Icône (Emoji)</Text>
                <TextInput
                  style={styles.persoInput}
                  placeholder="Ex: 🐱, 🪴"
                  value={persoIcone}
                  onChangeText={setPersoIcone}
                />

                <TouchableOpacity
                  style={styles.persoSubmitBtn}
                  onPress={handleCreerCategoriePerso}
                >
                  <Text style={styles.persoSubmitBtnText}>+ Créer et ajouter à l'enveloppe</Text>
                </TouchableOpacity>
              </View>
          ) : (
          <ScrollView style={{ maxHeight: 350 }}>
            {categoriesDisponibles
              .filter((c) => !enveloppes.some((e) => e.categorie_id === c.id))
              .map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.catOptionItem}
                  onPress={() => handleAjouterCategorie(c)}
                >
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{c.icone}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catOptionName}>{c.nom}</Text>
                    <Text style={styles.catOptionTheme}>
                      Thème : {c.theme} • {c.type === 'expense' ? '🧾 Dépense' : '🛒 Produit'}
                    </Text>
                  </View>
                  <Text style={styles.catOptionAdd}>+ Ajouter</Text>
                </TouchableOpacity>
              ))}
          </ScrollView>
            )}

          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => {
              setModalAjoutVisible(false);
              setAfficherFormPerso(false);
            }}
          >
            <Text style={styles.modalCloseBtnText}>{t('fermer')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </ScrollView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardDanger: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 8,
    marginBottom: 4,
  },
  inputTotal: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  copyBtn: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  copyBtnText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  textDanger: {
    color: '#DC2626',
  },
  dangerNotice: {
    marginTop: 8,
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  envelopesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  addCategoryBtn: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  addCategoryBtnText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  envelopeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  envelopeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  envelopeIcon: {
    fontSize: 24,
  },
  envelopeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  envelopePct: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  envelopeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  envelopeInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    width: 75,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  currencyTnd: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  deleteEnvBtn: {
    padding: 4,
    marginLeft: 4,
  },
  deleteEnvText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 14,
  },
  saveButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  catOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  catOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  catOptionTheme: {
    fontSize: 11,
    color: '#64748B',
  },
  catOptionAdd: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCloseBtn: {
    marginTop: 14,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  modalCloseBtnText: {
    color: '#64748B',
    fontWeight: '700',
  },
  togglePersoBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  togglePersoBtnText: {
    color: '#4F46E5',
    fontSize: 12,
    fontWeight: '700',
  },
  persoForm: {
    paddingVertical: 6,
  },
  persoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    marginTop: 6,
    marginBottom: 4,
  },
  persoInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  persoTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  persoTypeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  persoTypeBtnActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  persoTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  persoTypeTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  persoSubmitBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  persoSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

