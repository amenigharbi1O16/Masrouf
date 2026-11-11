// ============================================================
// FICHIER : src/app/(admin)/categories.tsx
// RÔLE    : Gestion des catégories système par l'Administrateur.
//           Permet d'ajouter, renommer, masquer/afficher et ajuster
//           les pourcentages de départ des enveloppes budgétaires.
//
// RÈGLE IMPORTANTE :
//   - La catégorie "Autres" est protégée : impossible de la supprimer
//     ou de la masquer, afin qu'aucune dépense ne soit orpheline.
//   - Le total des pourcentages par défaut ne peut pas dépasser 100 %.
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getAllCategories,
  addCategoryAdmin,
  updateCategoryAdmin,
  reassignerDepensesCategorieVersAutres,
  Categorie,
} from '../../db/queries';

// Internationalisation
import { useTranslation } from '../../utils/i18n';

export default function AdminCategoriesScreen() {
  const { t } = useTranslation();

  const [categories, setCategories] = useState<Categorie[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Champs du formulaire d'ajout
  const [nouveauNom, setNouveauNom] = useState('');
  const [nouvelleIcone, setNouvelleIcone] = useState('📦');
  const [nouveauTheme, setNouveauTheme] = useState('Divers');

  // Catégorie en cours d'édition de pourcentage
  const [categorieEnEdition, setCategorieEnEdition] = useState<Categorie | null>(null);
  const [pctSaisi, setPctSaisi] = useState('');

  const recharger = useCallback(() => {
    // Récupère toutes les catégories (y compris masquées)
    const list = getAllCategories(false);
    setCategories(list);
  }, []);

  useFocusEffect(recharger);

  // Total des pourcentages par défaut actuels
  const totalPourcentagesDefaut = categories
    .filter((c) => c.est_defaut === 1)
    .reduce((sum, c) => sum + c.pourcentage_defaut, 0);

  // ----------------------------------------------------------
  // AJOUT D'UNE CATEGORIE
  // ----------------------------------------------------------
  function handleAjouterCategorie() {
    const nomClean = nouveauNom.trim();
    if (!nomClean) {
      Alert.alert('Erreur', 'Le nom de la catégorie est obligatoire.');
      return;
    }

    // Vérifie les doublons sans tenir compte de la casse ni des accents
    const existe = categories.some(
      (c) =>
        c.nom.localeCompare(nomClean, undefined, { sensitivity: 'accent' }) === 0
    );

    if (existe) {
      Alert.alert('Doublon', 'Une catégorie portant ce nom existe déjà.');
      return;
    }

    addCategoryAdmin(nomClean, nouvelleIcone.trim() || '📦', 0, nouveauTheme);
    setNouveauNom('');
    setNouvelleIcone('📦');
    setModalVisible(false);
    recharger();
    Alert.alert('Succès', 'Nouvelle catégorie créée.');
  }

  // ----------------------------------------------------------
  // BASCULER VISIBILITÉ (Masquer / Afficher)
  // ----------------------------------------------------------
  function handleToggleVisibilite(c: Categorie) {
    if (c.est_systeme === 1) {
      Alert.alert('Action refusée', 'La catégorie Autres ne peut pas être masquée.');
      return;
    }

    const nouvelleVisibilite = c.est_visible === 1 ? false : true;
    updateCategoryAdmin(
      c.id,
      c.nom,
      c.icone,
      c.pourcentage_defaut,
      nouvelleVisibilite
    );
    recharger();
  }

  // ----------------------------------------------------------
  // MODIFIER POURCENTAGE PAR DEFAUT
  // ----------------------------------------------------------
  function handleSauvegarderPct() {
    if (!categorieEnEdition) return;

    const val = parseFloat(pctSaisi);
    if (isNaN(val) || val < 0 || val > 100) {
      Alert.alert('Erreur', 'Veuillez saisir un pourcentage valide entre 0 et 100.');
      return;
    }

    // Vérifie que le total avec ce nouveau pourcentage ne dépasse pas 100 %
    const totalSansElle = categories
      .filter((c) => c.est_defaut === 1 && c.id !== categorieEnEdition.id)
      .reduce((sum, c) => sum + c.pourcentage_defaut, 0);

    if (totalSansElle + val > 100) {
      Alert.alert(
        'Dépassement',
        `Le total des pourcentages par défaut dépasserait 100 % (Actuel sans elle : ${totalSansElle} %).`
      );
      return;
    }

    updateCategoryAdmin(
      categorieEnEdition.id,
      categorieEnEdition.nom,
      categorieEnEdition.icone,
      val,
      categorieEnEdition.est_visible === 1
    );

    setCategorieEnEdition(null);
    recharger();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* SYNTHESE POURCENTAGES */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Enveloppes par défaut au démarrage</Text>
        <Text style={styles.summaryPct}>
          Total alloué d'emblée :{' '}
          <Text
            style={{
              fontWeight: '800',
              color: totalPourcentagesDefaut === 100 ? '#059669' : '#D97706',
            }}
          >
            {totalPourcentagesDefaut} %
          </Text>{' '}
          / 100 %
        </Text>
      </View>

      {/* BOUTON AJOUTER */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.addButtonText}>+ Créer une catégorie</Text>
      </TouchableOpacity>

      {/* LISTE DES CATEGORIES */}
      <Text style={styles.sectionTitle}>Catalogue des catégories ({categories.length})</Text>

      {categories.map((c) => {
        const estVisible = c.est_visible === 1;

        return (
          <View key={c.id} style={[styles.catCard, !estVisible && styles.catCardHidden]}>
            <View style={styles.catLeft}>
              <Text style={styles.catIcon}>{c.icone}</Text>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.catName}>{c.nom}</Text>
                  {c.est_systeme === 1 ? (
                    <Text style={styles.sysTag}>Système</Text>
                  ) : null}
                </View>
                <Text style={styles.catTheme}>
                  Thème : {c.theme} {c.pourcentage_defaut > 0 ? `• ${c.pourcentage_defaut} %` : ''}
                </Text>
              </View>
            </View>

            <View style={styles.catActions}>
              {/* Modifier pourcentage si par défaut */}
              {c.est_defaut === 1 ? (
                <TouchableOpacity
                  style={styles.actionPill}
                  onPress={() => {
                    setCategorieEnEdition(c);
                    setPctSaisi(String(c.pourcentage_defaut));
                  }}
                >
                  <Text style={styles.actionPillText}>{c.pourcentage_defaut}% ✏️</Text>
                </TouchableOpacity>
              ) : null}

              {/* Masquer / Afficher */}
              {c.est_systeme !== 1 ? (
                <TouchableOpacity
                  style={[
                    styles.actionPill,
                    estVisible ? styles.pillVisible : styles.pillHidden,
                  ]}
                  onPress={() => handleToggleVisibilite(c)}
                >
                  <Text
                    style={[
                      styles.actionPillText,
                      estVisible ? styles.textVis : styles.textHid,
                    ]}
                  >
                    {estVisible ? '👁️ Visible' : '🚫 Masquée'}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}

      {/* MODAL AJOUT */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouvelle Catégorie</Text>

            <Text style={styles.label}>Nom de la catégorie *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Sport et loisirs"
              value={nouveauNom}
              onChangeText={setNouveauNom}
            />

            <Text style={styles.label}>Icône (Emoji)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: ⚽"
              value={nouvelleIcone}
              onChangeText={setNouvelleIcone}
            />

            <Text style={styles.label}>Thème / Groupe</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Personnel, Logement..."
              value={nouveauTheme}
              onChangeText={setNouveauTheme}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('fermer')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleAjouterCategorie}
              >
                <Text style={styles.confirmBtnText}>{t('enregistrer')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITION POURCENTAGE */}
      <Modal visible={categorieEnEdition !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Modifier le pourcentage : {categorieEnEdition?.nom}
            </Text>

            <Text style={styles.label}>Pourcentage de départ (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Ex: 15"
              value={pctSaisi}
              onChangeText={setPctSaisi}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCategorieEnEdition(null)}
              >
                <Text style={styles.cancelBtnText}>{t('fermer')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSauvegarderPct}
              >
                <Text style={styles.confirmBtnText}>{t('sauvegarder')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 14,
  },
  summaryTitle: {
    fontSize: 13,
    color: '#6B21A8',
    fontWeight: '700',
  },
  summaryPct: {
    fontSize: 15,
    color: '#1E293B',
    marginTop: 4,
  },
  addButton: {
    backgroundColor: '#7E22CE',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#581C87',
    marginBottom: 12,
  },
  catCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catCardHidden: {
    opacity: 0.5,
    backgroundColor: '#F8FAFC',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catIcon: {
    fontSize: 24,
  },
  catName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  catTheme: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  sysTag: {
    backgroundColor: '#F3E8FF',
    color: '#7E22CE',
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  catActions: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  actionPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  pillVisible: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  pillHidden: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  textVis: {
    color: '#065F46',
  },
  textHid: {
    color: '#991B1B',
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
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#64748B',
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#7E22CE',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
