/**
 * FICHIER : src/components/CustomCategoryModal.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-043-CUSTOM-CATEGORY
 * COMPOSANT : Modal Distinct d'Ajout de Catégorie avec Formulaires Produits / Dépenses
 *
 * MISSION DU COMPOSANT :
 * Formulaire d'ajout d'une catégorie accessible exclusivement depuis l'accueil (sous le cadre vert du budget)
 * pour les trois profils (Parent, Enfant, Utilisateur normal) :
 * 1. Deux formulaires d'ajout distincts : Produits (articles physiques) et Dépenses (charges pures).
 * 2. Maintien de l'accessibilité intégrale de TOUTES les catégories proposées par l'application non sélectionnées initialement.
 * 3. Ajout d'une SEULE catégorie à la fois : soit choix parmi les suggestions, soit saisie manuelle d'un nouveau nom.
 * 4. Colonne / champ dédié au pourcentage d'allocation du budget pour la catégorie ajoutée.
 * 5. Contrôle strict : la somme totale des allocations ne doit JAMAIS dépasser 100 % du budget mensuel.
 * 6. Enregistrement persistant dans SQLite et mise à jour dynamique immédiate sur l'ensemble des pages.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertBanner, Button, Input } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { useStore } from '@/state/store';
import type { Category, CategoryKind } from '@/state/types';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { useTranslation } from '@/utils/i18n';

interface CustomCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (category: Category) => void;
  initialKind?: CategoryKind;
  scope?: 'personal' | 'family';
}

// Palette chromatique officielle harmonisée
const COLOR_PALETTE = [
  colors.forest,
  colors.mint,
  '#1E88E5',
  '#F59E0B',
  '#8B5CF6',
  '#E11D48',
  '#10B981',
  '#0284C7',
  '#D97706',
  '#4B5563',
];

const AVAILABLE_ICONS = [
  'cart-outline',
  'basket-outline',
  'receipt-outline',
  'wallet-outline',
  'car-outline',
  'restaurant-outline',
  'cafe-outline',
  'home-outline',
  'medkit-outline',
  'school-outline',
  'fitness-outline',
  'gift-outline',
  'game-controller-outline',
  'airplane-outline',
  'sparkles-outline',
  'cash-outline',
] as const;

export function CustomCategoryModal({
  visible,
  onClose,
  onSuccess,
  initialKind = 'product',
  scope = 'personal',
}: CustomCategoryModalProps) {
  const { actions, db, me, selectedBudget } = useStore();
  const { t, isRTL, traduireCategorie } = useTranslation();

  // Onglet de formulaire actif : 'product' pour Produits, 'expense' pour Dépenses
  const [kind, setKind] = useState<CategoryKind>(initialKind);

  // Mode de sélection : 'proposed' (choisir 1 suggestion) ou 'manual' (saisir nouveau nom)
  const [mode, setMode] = useState<'proposed' | 'manual'>('proposed');

  // Une seule catégorie proposée sélectionnée
  const [selectedProposedId, setSelectedProposedId] = useState<string | null>(null);

  // Saisie manuelle d'un nouveau nom de catégorie
  const [manualName, setManualName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(colors.forest);
  const [selectedIcon, setSelectedIcon] = useState<string>('cart-outline');

  // Colonne dédiée au pourcentage d'allocation du budget pour cette catégorie
  const [allocationPercent, setAllocationPercent] = useState<string>('5');

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Catégories déjà suivies par l'utilisateur connecté
  const userCategoryIds = useMemo(() => me?.categoryIds || [], [me?.categoryIds]);

  // TOUTES les catégories proposées par l'application pour ce type qui ne sont PAS encore sélectionnées
  const unselectedProposedCategories = useMemo(() => {
    return db.categories.filter(
      (c) => c.kind === kind && c.active && !userCategoryIds.includes(c.id)
    );
  }, [db.categories, kind, userCategoryIds]);

  // Calcul du cumul actuel des pourcentages d'allocation pour l'utilisateur
  const currentTotalAllocatedPct = useMemo(() => {
    if (!selectedBudget || !selectedBudget.total || selectedBudget.total <= 0) {
      // Si aucun budget défini, calcul basé sur db.defaultPercentages
      return userCategoryIds.reduce((sum, cid) => sum + (db.defaultPercentages[cid] || 0), 0);
    }
    // Calcul basé sur les allocations réelles du budget actif
    const totalB = selectedBudget.total;
    let sum = 0;
    for (const cid of userCategoryIds) {
      const amount = selectedBudget.allocations[cid] || 0;
      sum += (amount / totalB) * 100;
    }
    return Math.round(sum * 10) / 10;
  }, [selectedBudget, userCategoryIds, db.defaultPercentages]);

  // Pourcentage saisi converti en nombre
  const numAllocPercent = parseFloat(allocationPercent.replace(',', '.')) || 0;
  // Nouveau total projeté si la catégorie est ajoutée
  const projectedTotalPercent = Math.round((currentTotalAllocatedPct + numAllocPercent) * 10) / 10;
  const isOver100 = projectedTotalPercent > 100;

  // Réinitialisation de l'état lors de l'ouverture ou du basculement d'onglet
  useEffect(() => {
    if (visible) {
      setKind(initialKind);
      setMode(unselectedProposedCategories.length > 0 ? 'proposed' : 'manual');
      setSelectedProposedId(null);
      setManualName('');
      setDescription('');
      setSelectedColor(colors.forest);
      setSelectedIcon(initialKind === 'product' ? 'basket-outline' : 'receipt-outline');
      setAllocationPercent('5');
      setError('');
      setSuccessMessage('');
    }
  }, [visible, initialKind]);

  // Quand on bascule entre formulaire Produits et Dépenses
  const handleSwitchKind = (newKind: CategoryKind) => {
    setKind(newKind);
    setError('');
    setSelectedProposedId(null);
    setManualName('');
    const available = db.categories.filter(
      (c) => c.kind === newKind && c.active && !userCategoryIds.includes(c.id)
    );
    setMode(available.length > 0 ? 'proposed' : 'manual');
    setSelectedIcon(newKind === 'product' ? 'basket-outline' : 'receipt-outline');
    // Récupération d'un pourcentage par défaut suggéré raisonnable
    setAllocationPercent(newKind === 'product' ? '10' : '5');
  };

  // Sélection d'une catégorie proposée
  const handleSelectProposed = (catId: string) => {
    setSelectedProposedId(catId);
    setError('');
    // Pré-remplir la colonne de pourcentage avec le pourcentage par défaut de cette catégorie
    const defaultPct = db.defaultPercentages[catId];
    if (defaultPct && defaultPct > 0) {
      setAllocationPercent(String(defaultPct));
    } else {
      setAllocationPercent('5');
    }
  };

  // Enregistrement de la catégorie et de son allocation dans la BDD
  const handleSave = async () => {
    setError('');

    // Vérification de validité du pourcentage d'allocation
    if (numAllocPercent <= 0) {
      setError(
        isRTL
          ? 'يرجى تحديد نسبة مئوية لتخصيص الميزانية أكبر من 0%.'
          : 'Veuillez saisir un pourcentage d’allocation du budget supérieur à 0%.'
      );
      return;
    }

    if (isOver100) {
      setError(
        isRTL
          ? `المجموع (${projectedTotalPercent}%) يتجاوز 100% من الميزانية. يرجى تخفيض النسبة المحددة.`
          : `Le total des allocations (${projectedTotalPercent}%) dépasse 100% du budget mensuel. Veuillez ajuster le pourcentage.`
      );
      return;
    }

    setBusy(true);

    try {
      if (mode === 'proposed') {
        // --- CAS 1 : CHOIX D'UNE CATÉGORIE PROPOSÉE ---
        if (!selectedProposedId) {
          setError(
            isRTL
              ? 'يرجى اختيار فئة مقترحة واحدة من القائمة.'
              : 'Veuillez sélectionner une catégorie proposée dans la liste.'
          );
          setBusy(false);
          return;
        }

        const targetCat = db.categories.find((c) => c.id === selectedProposedId);
        if (!targetCat) {
          setError('Catégorie introuvable.');
          setBusy(false);
          return;
        }

        // 1. Ajouter l'ID à la liste des catégories suivies par l'utilisateur
        const updatedCategoryIds = Array.from(new Set([...userCategoryIds, targetCat.id]));
        actions.setUserCategories(updatedCategoryIds);

        // 2. Mettre à jour son pourcentage d'allocation
        const updatedDefaultPcts = {
          ...db.defaultPercentages,
          [targetCat.id]: numAllocPercent,
        };
        actions.setDefaultPercentages(updatedDefaultPcts);

        // 3. Mettre à jour l'enveloppe du budget actif s'il existe
        if (selectedBudget) {
          const allocAmount = selectedBudget.total > 0
            ? Math.round(((selectedBudget.total * numAllocPercent) / 100) * 1000) / 1000
            : 0;
          const updatedAllocations = {
            ...selectedBudget.allocations,
            [targetCat.id]: allocAmount,
          };
          actions.saveBudget({
            ...selectedBudget,
            allocations: updatedAllocations,
          });
        }

        setBusy(false);
        const catName = traduireCategorie(targetCat.name);
        const successMsg = isRTL
          ? `تمت إضافة فئة "${catName}" بنجاح!`
          : `La catégorie "${catName}" a été ajoutée avec succès !`;
        setSuccessMessage(successMsg);
        Alert.alert(
          isRTL ? 'تمت إضافة الفئة' : 'Catégorie ajoutée',
          isRTL
            ? `تمت إضافة فئة "${catName}" بنجاح مع تخصيص ${numAllocPercent}%.`
            : `La catégorie "${catName}" a été ajoutée avec succès avec une allocation de ${numAllocPercent}%.`
        );
        if (onSuccess) onSuccess(targetCat);
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1200);
      } else {
        // --- CAS 2 : SAISIE MANUELLE D'UN NOUVEAU NOM ---
        const trimmed = manualName.trim();
        if (!trimmed) {
          setError(
            isRTL
              ? 'يرجى إدخال اسم الفئة الجديدة.'
              : 'Veuillez saisir le nom de la nouvelle catégorie.'
          );
          setBusy(false);
          return;
        }

        // Vérification de doublon
        const duplicate = db.categories.find(
          (c) => c.kind === kind && c.name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
          setError(
            isRTL
              ? `هذه الفئة موجودة بالفعل (${duplicate.name}). اخترها من القائمة المقترحة.`
              : `Une catégorie portant le nom "${duplicate.name}" existe déjà. Veuillez la choisir dans la liste proposée.`
          );
          setBusy(false);
          return;
        }

        // Création de la catégorie sur-mesure dans SQLite
        const res = actions.addCustomCategory(trimmed, kind, {
          description: description.trim() || undefined,
          color: selectedColor,
          icon: selectedIcon,
          scope,
        });

        if (!res.ok || !res.data) {
          setError(res.error || 'Erreur lors de la création de la catégorie.');
          setBusy(false);
          return;
        }

        const newCat = res.data;

        // Mettre à jour le pourcentage d'allocation
        const updatedDefaultPcts = {
          ...db.defaultPercentages,
          [newCat.id]: numAllocPercent,
        };
        actions.setDefaultPercentages(updatedDefaultPcts);

        // Mettre à jour l'enveloppe du budget actif s'il existe
        if (selectedBudget) {
          const allocAmount = selectedBudget.total > 0
            ? Math.round(((selectedBudget.total * numAllocPercent) / 100) * 1000) / 1000
            : 0;
          const updatedAllocations = {
            ...selectedBudget.allocations,
            [newCat.id]: allocAmount,
          };
          actions.saveBudget({
            ...selectedBudget,
            allocations: updatedAllocations,
          });
        }

        setBusy(false);
        const successMsg = isRTL
          ? `تم إنشاء وإضافة فئة "${newCat.name}" بنجاح!`
          : `La catégorie "${newCat.name}" a été créée et ajoutée avec succès !`;
        setSuccessMessage(successMsg);
        Alert.alert(
          isRTL ? 'فئة جديدة' : 'Nouvelle catégorie enregistrée',
          isRTL
            ? `تم إنشاء فئة "${newCat.name}" وإضافتها بنجاح مع تخصيص ${numAllocPercent}%.`
            : `La catégorie "${newCat.name}" a été créée et ajoutée avec une allocation de ${numAllocPercent}%.`
        );
        if (onSuccess) onSuccess(newCat);
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setBusy(false);
      setError(err?.message || 'Erreur inattendue.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* EN-TÊTE MODAL */}
          <View
            style={[
              styles.header,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}
              >
                {t('ajouter_categorie')}
              </Text>
              <Text
                style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}
              >
                Ajouter une catégorie avec son allocation budgétaire
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            >
              <Ionicons name="close" size={20} color={colors.forest} />
            </TouchableOpacity>
          </View>

          {/* SÉLECTEUR DES DEUX FORMULAIRES DISTINCTS (PRODUITS VS DÉPENSES) */}
          <View
            style={[
              styles.kindTabs,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.kindTab,
                kind === 'product' && styles.kindTabActive,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => handleSwitchKind('product')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="basket-outline"
                size={16}
                color={kind === 'product' ? colors.white : colors.forest}
              />
              <Text
                style={[
                  styles.kindTabText,
                  kind === 'product' && styles.kindTabTextActive,
                ]}
              >
                Produits (Achats)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.kindTab,
                kind === 'expense' && styles.kindTabActive,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => handleSwitchKind('expense')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="receipt-outline"
                size={16}
                color={kind === 'expense' ? colors.white : colors.forest}
              />
              <Text
                style={[
                  styles.kindTabText,
                  kind === 'expense' && styles.kindTabTextActive,
                ]}
              >
                Dépenses directes
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {successMessage ? (
              <AlertBanner tone="success" title={isRTL ? 'نجاح' : 'Succès'} detail={successMessage} />
            ) : null}
            {error ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={error} />
            ) : null}

            {/* CHOIX DU MODE : PROPOSÉE OU MANUELLE */}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeOption,
                  mode === 'proposed' && styles.modeOptionActive,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                onPress={() => {
                  setMode('proposed');
                  setError('');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={mode === 'proposed' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={mode === 'proposed' ? colors.forest : colors.gray}
                />
                <Text
                  style={[
                    styles.modeOptionText,
                    mode === 'proposed' && styles.modeOptionTextActive,
                  ]}
                >
                  Choisir parmi les catégories proposées ({unselectedProposedCategories.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeOption,
                  mode === 'manual' && styles.modeOptionActive,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                onPress={() => {
                  setMode('manual');
                  setSelectedProposedId(null);
                  setError('');
                }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={mode === 'manual' ? 'radio-button-on' : 'radio-button-off'}
                  size={18}
                  color={mode === 'manual' ? colors.forest : colors.gray}
                />
                <Text
                  style={[
                    styles.modeOptionText,
                    mode === 'manual' && styles.modeOptionTextActive,
                  ]}
                >
                  Saisir manuellement un nouveau nom
                </Text>
              </TouchableOpacity>
            </View>

            {/* CONTENU SELON LE MODE */}
            {mode === 'proposed' ? (
              <View style={styles.proposedSection}>
                <Text style={[styles.sectionSubtitle, { textAlign: isRTL ? 'right' : 'left' }]}>
                  Sélectionnez une seule catégorie proposée :
                </Text>

                {unselectedProposedCategories.length === 0 ? (
                  <View style={styles.emptyNotice}>
                    <Ionicons name="checkmark-done-circle" size={32} color={colors.mint} />
                    <Text style={styles.emptyNoticeText}>
                      Toutes les catégories proposées de ce type font déjà partie de votre profil.
                    </Text>
                    <Text style={styles.emptyNoticeSub}>
                      Basculez sur « Saisir manuellement un nouveau nom » pour en créer une sur mesure.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.proposedGrid}>
                    {unselectedProposedCategories.map((c) => {
                      const isSelected = selectedProposedId === c.id;
                      const iconName = getCategoryIcon(c.name);
                      const defaultPct = db.defaultPercentages[c.id] || 0;

                      return (
                        <TouchableOpacity
                          key={c.id}
                          style={[
                            styles.proposedCard,
                            isSelected && styles.proposedCardSelected,
                            { flexDirection: isRTL ? 'row-reverse' : 'row' },
                          ]}
                          onPress={() => handleSelectProposed(c.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? colors.forest : colors.gray}
                          />
                          <View
                            style={[
                              styles.proposedIconBox,
                              isSelected && { backgroundColor: colors.forest },
                            ]}
                          >
                            <Ionicons
                              name={iconName as any}
                              size={18}
                              color={isSelected ? colors.mint : colors.forest}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.proposedCardName,
                                isSelected && styles.proposedCardNameSelected,
                                { textAlign: isRTL ? 'right' : 'left' },
                              ]}
                            >
                              {traduireCategorie(c.name)}
                            </Text>
                            <Text
                              style={[
                                styles.proposedCardSub,
                                { textAlign: isRTL ? 'right' : 'left' },
                              ]}
                            >
                              Défaut suggéré : {defaultPct}%
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              /* SAISIE MANUELLE */
              <View style={styles.manualSection}>
                <Input
                  label="Nom exact de la nouvelle catégorie"
                  value={manualName}
                  onChangeText={(txt) => {
                    setManualName(txt);
                    setError('');
                  }}
                  placeholder={
                    kind === 'product'
                      ? 'Ex: Poissonnerie, Boulangerie...'
                      : 'Ex: Assurance auto, Frais de scolarité...'
                  }
                  autoFocus
                />

                <Input
                  label="Description / Note pédagogique (optionnel)"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Ex: Achats de fruits de mer frais du marché..."
                />

                {/* Sélecteur de couleur */}
                <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                  Couleur d’identification :
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.colorRow}
                >
                  {COLOR_PALETTE.map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorCircle,
                        { backgroundColor: c },
                        selectedColor === c && styles.colorCircleSelected,
                      ]}
                      onPress={() => setSelectedColor(c)}
                      activeOpacity={0.8}
                    />
                  ))}
                </ScrollView>

                {/* Sélecteur d'icône */}
                <Text style={[styles.fieldLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
                  Icône représentative :
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.iconRow}
                >
                  {AVAILABLE_ICONS.map((ic) => (
                    <TouchableOpacity
                      key={ic}
                      style={[
                        styles.iconSquare,
                        selectedIcon === ic && styles.iconSquareSelected,
                      ]}
                      onPress={() => setSelectedIcon(ic)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={ic as any}
                        size={20}
                        color={selectedIcon === ic ? colors.white : colors.forest}
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* COLONNE DÉDIÉE AU POURCENTAGE D'ALLOCATION DU BUDGET */}
            <View style={styles.allocationBox}>
              <View
                style={[
                  styles.allocationHeaderRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons name="pie-chart-outline" size={20} color={colors.forest} />
                <Text style={styles.allocationBoxTitle}>
                  Pourcentage d’allocation du budget
                </Text>
              </View>

              <Text style={[styles.allocationBoxSub, { textAlign: isRTL ? 'right' : 'left' }]}>
                Définissez la part du budget mensuel qui sera assignée à cette catégorie.
              </Text>

              <View
                style={[
                  styles.allocationInputRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <TextInput
                  style={[
                    styles.percentInput,
                    isOver100 && { borderColor: colors.coral },
                  ]}
                  value={allocationPercent}
                  onChangeText={(val) => {
                    setAllocationPercent(val);
                    setError('');
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Ex: 5"
                />
                <Text style={styles.percentSymbol}>% du budget</Text>
              </View>

              {/* Jauge de contrôle budgétaire */}
              <View style={styles.allocationGauge}>
                <View
                  style={[
                    styles.allocationGaugeHeader,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Text style={styles.gaugeLbl}>
                    Actuel : {currentTotalAllocatedPct}%  +  Ajouté : {numAllocPercent}%
                  </Text>
                  <Text
                    style={[
                      styles.gaugeVal,
                      isOver100 && { color: colors.coral, fontWeight: '700' },
                    ]}
                  >
                    Nouveau total : {projectedTotalPercent}% / 100%
                  </Text>
                </View>

                <View style={styles.gaugeTrack}>
                  <View
                    style={[
                      styles.gaugeFill,
                      { width: `${Math.min(projectedTotalPercent, 100)}%` },
                      isOver100 && { backgroundColor: colors.coral },
                    ]}
                  />
                </View>

                {isOver100 ? (
                  <Text style={styles.overBudgetNotice}>
                    ⚠️ Dépassement de {Math.round((projectedTotalPercent - 100) * 10) / 10}%. Le total des allocations ne doit jamais dépasser 100 % du budget mensuel.
                  </Text>
                ) : (
                  <Text style={styles.withinBudgetNotice}>
                    ✓ Allocation valide (reste {Math.round((100 - projectedTotalPercent) * 10) / 10}% disponible).
                  </Text>
                )}
              </View>
            </View>

            {/* BOUTON D'ENREGISTREMENT */}
            <View style={{ marginTop: 14 }}>
              <Button
                label={
                  isOver100
                    ? 'Total dépasse 100%'
                    : mode === 'proposed'
                      ? 'Ajouter la catégorie proposée'
                      : 'Créer et ajouter la catégorie'
                }
                onPress={handleSave}
                loading={busy}
                disabled={isOver100 || (mode === 'proposed' && !selectedProposedId)}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 43, 39, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    maxHeight: '92%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.forest,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindTabs: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  kindTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kindTabActive: {
    backgroundColor: colors.forest,
    borderColor: colors.forest,
  },
  kindTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
  },
  kindTabTextActive: {
    color: colors.white,
  },
  body: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modeSelector: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  modeOption: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  modeOptionActive: {
    backgroundColor: '#E8F7F5',
  },
  modeOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    flex: 1,
  },
  modeOptionTextActive: {
    fontWeight: '700',
    color: colors.forest,
  },
  proposedSection: {
    marginVertical: 6,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
    marginBottom: 8,
  },
  emptyNotice: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  emptyNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.forest,
    textAlign: 'center',
  },
  emptyNoticeSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
  },
  proposedGrid: {
    gap: 8,
  },
  proposedCard: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  proposedCardSelected: {
    borderColor: colors.forest,
    backgroundColor: '#F0F9F7',
    borderWidth: 1.5,
  },
  proposedIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposedCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.forest,
  },
  proposedCardNameSelected: {
    fontWeight: '700',
  },
  proposedCardSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 2,
  },
  manualSection: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.forest,
    marginTop: 4,
  },
  colorRow: {
    gap: 8,
    paddingVertical: 6,
  },
  colorCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.forest,
    transform: [{ scale: 1.15 }],
  },
  iconRow: {
    gap: 8,
    paddingVertical: 6,
  },
  iconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F4F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSquareSelected: {
    backgroundColor: colors.forest,
  },
  allocationBox: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allocationHeaderRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  allocationBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  allocationBoxSub: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 10,
  },
  allocationInputRow: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  percentInput: {
    width: 80,
    height: 44,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.forest,
    fontSize: 16,
    fontWeight: '700',
    color: colors.forest,
    textAlign: 'center',
  },
  percentSymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.forest,
  },
  allocationGauge: {
    backgroundColor: '#F7F6F2',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  allocationGaugeHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gaugeLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  gaugeVal: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.forest,
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: colors.forest,
  },
  overBudgetNotice: {
    fontSize: 11,
    color: colors.coral,
    fontWeight: '600',
    marginTop: 2,
  },
  withinBudgetNotice: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
});
