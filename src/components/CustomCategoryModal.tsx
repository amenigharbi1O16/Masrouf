/**
 * FICHIER : src/components/CustomCategoryModal.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-043-CUSTOM-CATEGORY
 * COMPOSANT : Modal de Sélection et Création de Catégorie (Parent et Enfant)
 *
 * MISSION DU COMPOSANT :
 * Fournir le formulaire interactif d'ajout de catégorie accessible depuis l'accueil :
 * 1. Présenter d'abord la liste des catégories existantes non encore choisies par l'utilisateur.
 * 2. Permettre la sélection directe d'une catégorie existante pour l'ajouter à son profil.
 * 3. Proposer tout en bas l'option 'Créer une catégorie' qui transforme le formulaire en saisie libre.
 * 4. Distinguer clairement les catégories de produits (achats physiques) et de dépenses fixes.
 * 5. Valider rigoureusement : refuser les noms vides et les doublons existants avec des messages explicites.
 * 6. Fonctionner de façon identique et fluide pour les parents et les enfants.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Une feuille modale coulissante avec onglets Produit/Dépense, la liste des catégories suggérées non suivies,
 * le bouton 'Créer une catégorie' révélant le champ texte libre, la palette de couleurs et la grille d'icônes.
 */

// Importation des icônes vectorielles Ionicons
import { Ionicons } from '@expo/vector-icons';
// Importation de React et des hooks d'état et de cycle de vie
import React, { useEffect, useMemo, useState } from 'react';
// Importation des composants graphiques de React Native
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
// Importation des composants d'interface réutilisables du design system Masrouf
import { AlertBanner, Button, Input } from '@/components/ui';
// Importation des couleurs et arrondis du thème
import { colors, radius } from '@/constants/theme';
// Importation du store global relié à SQLite
import { useStore } from '@/state/store';
// Importation des types Category et CategoryKind
import type { Category, CategoryKind } from '@/state/types';
// Importation de l'utilitaire d'icônes par défaut des catégories
import { getCategoryIcon } from '@/utils/categoryIcons';
// Importation du hook de traduction multilingue et détection RTL
import { useTranslation } from '@/utils/i18n';

// Définition des propriétés attendues par le composant modal
interface CustomCategoryModalProps {
  // Indicateur de visibilité de la modale
  visible: boolean;
  // Fonction de fermeture de la modale
  onClose: () => void;
  // Callback optionnel en cas de succès avec la catégorie ajoutée
  onSuccess?: (category: Category) => void;
  // Type initial par défaut ('product' ou 'expense')
  initialKind?: CategoryKind;
  // Catégorie à éditer si en mode modification
  categoryToEdit?: Category | null;
  // Périmètre personnel ou familial
  scope?: 'personal' | 'family';
}

// Palette chromatique officielle harmonisée avec la charte graphique Masrouf
const COLOR_PALETTE = [
  colors.forest, // Vert forêt #102B27
  colors.mint,   // Vert menthe #2EC4B6
  '#1E88E5',     // Bleu royal
  '#F59E0B',     // Ambre vif
  '#8B5CF6',     // Violet moderne
  '#E11D48',     // Rose corail
  '#10B981',     // Émeraude
  '#0284C7',     // Bleu océan
  '#D97706',     // Bronze
  '#4B5563',     // Gris ardoise
];

// Bibliothèque d'icônes vectorielles adaptées aux dépenses et courses quotidiennes
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

/**
 * MISSION DE LA FONCTION : CustomCategoryModal
 * Composant principal de la modale de sélection et de création de catégorie.
 * CE QU'ELLE FAIT :
 * Gère le cycle de vie de sélection parmi les catégories existantes non choisies
 * ou la création d'une nouvelle catégorie sur-mesure avec validation des doublons.
 * CE QU'ELLE AFFICHE À L'ÉCRAN :
 * Une fenêtre modale avec sélecteur de type, liste tactile des choix existants,
 * bouton d'expansion libre, sélecteur de couleur et d'icône.
 */
export function CustomCategoryModal({
  visible,
  onClose,
  onSuccess,
  initialKind = 'product',
  categoryToEdit,
  scope = 'personal',
}: CustomCategoryModalProps) {
  // Accès aux actions et aux données SQLite via le store
  const { actions, db, me } = useStore();
  // Fonctions de traduction et sens d'écriture
  const { t, isRTL, traduireCategorie } = useTranslation();

  // Indicateur si la modale est en mode édition d'une catégorie personnalisée existante
  const isEdit = !!categoryToEdit;

  // Nom textuel de la catégorie
  const [name, setName] = useState('');
  // Description optionnelle
  const [description, setDescription] = useState('');
  // Type de catégorie : produit ou dépense directe
  const [kind, setKind] = useState<CategoryKind>(initialKind);
  // Couleur sélectionnée dans la palette
  const [selectedColor, setSelectedColor] = useState<string>(colors.forest);
  // Icône sélectionnée dans la grille
  const [selectedIcon, setSelectedIcon] = useState<string>('cart-outline');
  // Message d'erreur de validation
  const [error, setError] = useState('');
  // Indicateur de chargement / traitement en cours
  const [busy, setBusy] = useState(false);
  // Mode de saisie libre (activé si l'utilisateur clique sur 'Créer une catégorie')
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  // Identifiants des catégories existantes sélectionnées dans la liste (sélection multiple conforme à la maquette)
  const [selectedExistingIds, setSelectedExistingIds] = useState<string[]>([]);

  // Identifiants des catégories déjà choisies par l'utilisateur connecté
  const userCategoryIds = useMemo(() => {
    // Si l'utilisateur a des catégories, les retourner, sinon tableau vide
    return me?.categoryIds || [];
  }, [me?.categoryIds]);

  // Liste des catégories existantes dans SQLite non encore choisies par l'utilisateur pour le type actif
  const unchosenCategories = useMemo(() => {
    // Filtrage des catégories de la base selon le type (produit/dépense), actives et non suivies
    return db.categories.filter(
      (c) => c.kind === kind && c.active && !userCategoryIds.includes(c.id)
    );
  }, [db.categories, kind, userCategoryIds]);

  // Réinitialisation des champs à l'ouverture ou au changement de cible
  useEffect(() => {
    // Si on édite une catégorie existante
    if (categoryToEdit) {
      // Préremplissage du nom
      setName(categoryToEdit.name);
      // Préremplissage de la description
      setDescription(categoryToEdit.description ?? '');
      // Préremplissage du type
      setKind(categoryToEdit.kind);
      // Préremplissage de la couleur
      setSelectedColor(categoryToEdit.color ?? colors.forest);
      // Préremplissage de l'icône
      setSelectedIcon(categoryToEdit.icon ?? 'cart-outline');
      // Activation directe du mode saisie libre pour l'édition
      setIsCreatingCustom(true);
      // Réinitialisation du choix existant
      setSelectedExistingIds([]);
    } else {
      // Réinitialisation du nom
      setName('');
      // Réinitialisation de la description
      setDescription('');
      // Type initial demandé
      setKind(initialKind);
      // Couleur par défaut vert forêt
      setSelectedColor(colors.forest);
      // Icône par défaut selon le type
      setSelectedIcon(initialKind === 'product' ? 'basket-outline' : 'receipt-outline');
      // Mode saisie libre désactivé si des catégories non choisies sont disponibles
      setIsCreatingCustom(unchosenCategories.length === 0);
      // Sélection existante vide
      setSelectedExistingIds([]);
    }
    // Réinitialisation du message d'erreur
    setError('');
  }, [categoryToEdit, initialKind, visible, unchosenCategories.length]);

  /**
   * MISSION DE LA FONCTION : handleSave
   * Valide les données saisies ou sélectionnées et enregistre dans SQLite.
   * CE QU'ELLE FAIT :
   * - Vérifie l'absence de nom vide et de doublon de nom.
   * - Si catégorie(s) existante(s) choisie(s) : ajoute leurs IDs à la liste de l'utilisateur.
   * - Si nouvelle catégorie créée : l'insère dans SQLite et l'attache à l'utilisateur.
   * CE QU'ELLE AFFICHE À L'ÉCRAN :
   * Affiche une alerte rouge en cas d'erreur ou ferme la modale avec confirmation.
   */
  const handleSave = async () => {
    // Réinitialisation de l'erreur précédente
    setError('');

    // CAS 1 : L'utilisateur a sélectionné une ou plusieurs catégories existantes non encore choisies
    if (!isCreatingCustom && !isEdit) {
      // Vérification qu'au moins une catégorie a bien été cochée
      if (selectedExistingIds.length === 0) {
        // Message d'erreur explicite invitant à choisir ou créer
        setError(
          isRTL
            ? 'يرجى اختيار فئة واحدة على الأقل من القائمة أو الضغط على "إنشاء فئة جديدة".'
            : 'Veuillez sélectionner au moins une catégorie dans la liste ou cliquer sur "Créer une catégorie".'
        );
        return;
      }

      // Activation du témoin de chargement
      setBusy(true);
      // Mise à jour de la liste des catégories suivies par l'utilisateur
      const updatedIds = Array.from(new Set([...userCategoryIds, ...selectedExistingIds]));
      // Sauvegarde durable dans SQLite
      actions.setUserCategories(updatedIds);
      // Fin du chargement
      setBusy(false);

      // Notification du parent en cas de callback fourni
      if (onSuccess) {
        const firstAdded = db.categories.find((c) => selectedExistingIds.includes(c.id));
        if (firstAdded) {
          onSuccess(firstAdded);
        }
      }
      // Fermeture de la modale
      onClose();
      return;
    }

    // CAS 2 : Saisie libre d'une catégorie (nouvelle ou édition)
    const trimmedName = name.trim();
    // Validation du nom non vide
    if (!trimmedName) {
      // Message d'erreur spécifique nom obligatoire
      setError(
        isRTL
          ? 'اسم الفئة مطلوب ولا يمكن أن يكون فارغًا.'
          : 'Le nom de la catégorie est obligatoire et ne peut pas être vide.'
      );
      return;
    }

    // Vérification stricte des doublons : même nom (insensible à la casse) dans le même type
    const normalizedName = trimmedName.toLowerCase();
    // Détection si une catégorie identique existe déjà dans la base
    const duplicate = db.categories.find(
      (c) =>
        c.kind === kind &&
        c.name.trim().toLowerCase() === normalizedName &&
        c.id !== categoryToEdit?.id
    );

    // Si doublon détecté, refus avec message précis
    if (duplicate) {
      // Si la catégorie existe déjà et est déjà suivie par l'utilisateur
      if (userCategoryIds.includes(duplicate.id)) {
        setError(
          isRTL
            ? 'هذه الفئة موجودة ومحددة بالفعل في حسابك.'
            : 'Cette catégorie existe déjà et fait déjà partie de vos catégories suivies.'
        );
      } else {
        // La catégorie existe déjà dans le catalogue global : proposer de l'activer directement
        setError(
          isRTL
            ? `توجد فئة بهذا الاسم بالفعل (${duplicate.name}). يمكنك اختيارها مباشرة من القائمة.`
            : `Une catégorie portant le nom "${duplicate.name}" existe déjà dans le système. Choisissez-la dans la liste ci-dessus.`
        );
      }
      return;
    }

    // Activation du témoin de traitement
    setBusy(true);

    try {
      // Mode édition d'une catégorie personnalisée
      if (isEdit && categoryToEdit) {
        // Mise à jour dans SQLite
        const res = actions.updateCustomCategory(categoryToEdit.id, {
          name: trimmedName,
          description: description.trim() || undefined,
          color: selectedColor,
          icon: selectedIcon,
        });

        // Gestion de l'échec de mise à jour
        if (!res.ok) {
          setError(res.error ?? t('erreur'));
          setBusy(false);
          return;
        }

        // Notification du callback avec la catégorie modifiée
        const updated = db.categories.find((c) => c.id === categoryToEdit.id);
        if (updated && onSuccess) {
          onSuccess(updated);
        }
      } else {
        // Mode création d'une nouvelle catégorie sur-mesure
        const res = actions.addCustomCategory(trimmedName, kind, {
          description: description.trim() || undefined,
          color: selectedColor,
          icon: selectedIcon,
          scope,
        });

        // Gestion de l'erreur d'insertion SQLite
        if (!res.ok) {
          setError(res.error ?? t('erreur_categorie_existe'));
          setBusy(false);
          return;
        }

        // Notification du callback avec la nouvelle catégorie créée
        if (res.data && onSuccess) {
          onSuccess(res.data);
        }
      }

      // Désactivation du témoin
      setBusy(false);
      // Fermeture de la modale
      onClose();
    } catch {
      // Capture d'erreur inattendue
      setError(t('erreur'));
      setBusy(false);
    }
  };

  return (
    // Fenêtre modale native avec glissement depuis le bas
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Arrière-plan semi-transparent cliquable */}
      <View style={styles.backdrop}>
        {/* Conteneur principal de la feuille modale */}
        <View style={styles.sheetContainer}>
          {/* En-tête de la modale avec titre dynamique et bouton de fermeture */}
          <View
            style={[
              styles.sheetHeader,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {/* Zone de titre et sous-titre */}
            <View style={{ flex: 1 }}>
              {/* Titre 'Nouvelle catégorie' ou 'Modifier la catégorie' */}
              <Text
                style={[
                  styles.sheetTitle,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {isEdit ? t('modifier') : t('ajouter_categorie')}
              </Text>
              {/* Sous-titre rassurant */}
              <Text
                style={[
                  styles.sheetSub,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {isCreatingCustom
                  ? t('nouvelle_categorie')
                  : t('choisir_ce_que_vous_suivez')}
              </Text>
            </View>

            {/* Bouton croix pour fermer */}
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('fermer')}
            >
              <Ionicons name="close" size={22} color={colors.forest} />
            </TouchableOpacity>
          </View>

          {/* Défilement du corps du formulaire */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Bannière d'alerte rouge en cas d'erreur de saisie ou doublon */}
            {error ? (
              <AlertBanner tone="danger" title={t('erreur')} detail={error} />
            ) : null}

            {/* Onglets de distinction : Catégorie Produit vs Catégorie Dépense */}
            {!isEdit && (
              <View style={styles.sectionWrap}>
                {/* Libellé de section */}
                <Text
                  style={[
                    styles.fieldLabel,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {t('type_categorie')}
                </Text>
                {/* Sélecteur à deux boutons pour basculer le type */}
                <View
                  style={[
                    styles.kindSelector,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  {/* Onglet Catégorie de Produit (courses et articles physiques) */}
                  <TouchableOpacity
                    style={[
                      styles.kindTab,
                      kind === 'product' && styles.kindTabActive,
                    ]}
                    onPress={() => {
                      setKind('product');
                      setSelectedIcon('basket-outline');
                      setSelectedExistingIds([]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="basket-outline"
                      size={18}
                      color={kind === 'product' ? colors.forest : colors.gray}
                    />
                    <Text
                      style={[
                        styles.kindTabText,
                        kind === 'product' && styles.kindTabTextActive,
                      ]}
                    >
                      {t('articles_et_produits')}
                    </Text>
                  </TouchableOpacity>

                  {/* Onglet Catégorie de Dépense (factures et charges fixes) */}
                  <TouchableOpacity
                    style={[
                      styles.kindTab,
                      kind === 'expense' && styles.kindTabActive,
                    ]}
                    onPress={() => {
                      setKind('expense');
                      setSelectedIcon('receipt-outline');
                      setSelectedExistingIds([]);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="receipt-outline"
                      size={18}
                      color={kind === 'expense' ? colors.forest : colors.gray}
                    />
                    <Text
                      style={[
                        styles.kindTabText,
                        kind === 'expense' && styles.kindTabTextActive,
                      ]}
                    >
                      {t('depenses_et_services')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* =========================================================================
                SECTION 1 : LISTE DES CATÉGORIES NON ENCORE CHOISIES (SI DISPONIBLES)
                ========================================================================= */}
            {!isEdit && !isCreatingCustom && (
              <View style={styles.sectionWrap}>
                {/* Libellé invitant à choisir dans les catégories existantes */}
                <Text
                  style={[
                    styles.fieldLabel,
                    { textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {unchosenCategories.length > 0
                    ? t('vos_categories')
                    : t('aucune_categorie_suggeree')}
                </Text>

                {/* Rendu des catégories non encore choisies */}
                {unchosenCategories.length > 0 ? (
                  <View style={styles.existingList}>
                    {unchosenCategories.map((cat) => {
                      // Détermination si cette catégorie est actuellement sélectionnée
                      const isSelected = selectedExistingIds.includes(cat.id);
                      // Traduction du libellé de la catégorie
                      const label = traduireCategorie(cat.name);

                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.existingItem,
                            isSelected && styles.existingItemSelected,
                            { flexDirection: isRTL ? 'row-reverse' : 'row' },
                          ]}
                          onPress={() => {
                            setSelectedExistingIds((prev) =>
                              prev.includes(cat.id)
                                ? prev.filter((id) => id !== cat.id)
                                : [...prev, cat.id]
                            );
                            setError('');
                          }}
                          activeOpacity={0.7}
                        >
                          {/* Icône de la catégorie */}
                          <View
                            style={[
                              styles.itemIconWrap,
                              { backgroundColor: isSelected ? colors.mint : '#F0F4F8' },
                            ]}
                          >
                            <Ionicons
                              name={getCategoryIcon(cat.name, cat.kind)}
                              size={18}
                              color={colors.forest}
                            />
                          </View>

                          {/* Nom et description de la catégorie */}
                          <View style={{ flex: 1, marginHorizontal: 8 }}>
                            <Text
                              style={[
                                styles.itemName,
                                isSelected && styles.itemNameSelected,
                                { textAlign: isRTL ? 'right' : 'left' },
                              ]}
                            >
                              {label}
                            </Text>
                            {cat.description ? (
                              <Text
                                style={[
                                  styles.itemDesc,
                                  { textAlign: isRTL ? 'right' : 'left' },
                                ]}
                              >
                                {cat.description}
                              </Text>
                            ) : null}
                          </View>

                          {/* Puce de sélection radio avec coche */}
                          <View
                            style={[
                              styles.radioCircle,
                              isSelected && styles.radioCircleActive,
                            ]}
                          >
                            {isSelected && (
                              <Ionicons name="checkmark" size={14} color={colors.white} />
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  // Message informatif si toutes les catégories de base sont déjà choisies
                  <Text
                    style={[
                      styles.emptyUnchosenText,
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {isRTL
                      ? 'لقد قمت بتحديد جميع الفئات الافتراضية. يمكنك إنشاء فئة مخصصة أدناه.'
                      : 'Toutes les catégories suggérées sont déjà dans vos catégories suivies. Créez-en une sur-mesure ci-dessous !'}
                  </Text>
                )}

                {/* Option tout en bas : "Créer une catégorie" pour basculer en saisie libre */}
                <TouchableOpacity
                  style={[
                    styles.createOptionBtn,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                  onPress={() => {
                    setIsCreatingCustom(true);
                    setSelectedExistingIds([]);
                    setError('');
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.createOptionIconWrap}>
                    <Ionicons name="add" size={20} color={colors.forest} />
                  </View>
                  <Text style={styles.createOptionText}>
                    + {t('nouvelle_categorie')} ({isRTL ? 'إدخال حر' : 'Saisie libre'})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* =========================================================================
                SECTION 2 : FORMULAIRE DE SAISIE LIBRE (CRÉATION OU ÉDITION)
                ========================================================================= */}
            {(isCreatingCustom || isEdit) && (
              <>
                {/* Bouton de retour vers la liste existante si des catégories sont disponibles */}
                {!isEdit && unchosenCategories.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.backToListBtn,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                    onPress={() => {
                      setIsCreatingCustom(false);
                      setError('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isRTL ? 'arrow-forward' : 'arrow-back'}
                      size={16}
                      color={colors.forest}
                    />
                    <Text style={styles.backToListText}>
                      {isRTL
                        ? 'العودة إلى قائمة الفئات المقترحة'
                        : 'Choisir parmi les catégories suggérées existantes'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Champ Nom de la catégorie (Saisie libre obligatoire) */}
                <Input
                  label={t('nom_categorie')}
                  value={name}
                  onChangeText={(txt) => {
                    setName(txt);
                    setError('');
                  }}
                  placeholder={
                    kind === 'product'
                      ? 'Ex: Épicerie fine, Produits bio, Fournitures...'
                      : 'Ex: Garderie, Abonnement gym, Cours particuliers...'
                  }
                  autoFocus
                />

                {/* Champ Description optionnelle */}
                <Input
                  label={t('description_categorie')}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Courte note ou explication..."
                />

                {/* Palette de couleurs */}
                <View style={styles.sectionWrap}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {t('couleur_categorie')}
                  </Text>
                  <View style={styles.paletteRow}>
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
                      >
                        {selectedColor === c && (
                          <Ionicons name="checkmark" size={16} color={colors.white} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Grille de sélection de l'icône */}
                <View style={styles.sectionWrap}>
                  <Text
                    style={[
                      styles.fieldLabel,
                      { textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {t('icone_categorie')}
                  </Text>
                  <View style={styles.iconsGrid}>
                    {AVAILABLE_ICONS.map((ico) => (
                      <TouchableOpacity
                        key={ico}
                        style={[
                          styles.iconCell,
                          selectedIcon === ico && {
                            borderColor: selectedColor,
                            backgroundColor: '#F0F9F5',
                          },
                        ]}
                        onPress={() => setSelectedIcon(ico)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={ico as any}
                          size={24}
                          color={selectedIcon === ico ? selectedColor : colors.gray}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}

            {/* Boutons d'Action Principaux */}
            <View style={styles.buttonGroup}>
              {/* Bouton vert de validation */}
              <Button
                label={
                  isCreatingCustom || isEdit
                    ? t('enregistrer')
                    : `${t('selectionner')} (${selectedExistingIds.length})`
                }
                onPress={handleSave}
                loading={busy}
              />
              {/* Bouton secondaire clair d'annulation */}
              <Button
                label={t('annuler')}
                variant="secondary"
                onPress={onClose}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Styles graphiques conformes à la charte de Masrouf
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 43, 39, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.hero,
    borderTopRightRadius: radius.hero,
    maxHeight: '90%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.forest,
  },
  sheetSub: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F4F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
  },
  sectionWrap: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.forest,
  },
  kindSelector: {
    gap: 8,
  },
  kindTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: '#F4F7F6',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  kindTabActive: {
    backgroundColor: '#E8F6F2',
    borderColor: colors.forest,
  },
  kindTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray,
  },
  kindTabTextActive: {
    color: colors.forest,
    fontWeight: '800',
  },
  existingList: {
    gap: 8,
  },
  existingItem: {
    alignItems: 'center',
    backgroundColor: '#F9FBFA',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E8ECEF',
  },
  existingItemSelected: {
    borderColor: colors.forest,
    backgroundColor: '#F0F9F5',
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.forest,
  },
  itemNameSelected: {
    color: colors.forest,
  },
  itemDesc: {
    fontSize: 11,
    color: colors.gray,
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  radioCircleActive: {
    borderColor: colors.forest,
    backgroundColor: colors.forest,
  },
  emptyUnchosenText: {
    fontSize: 13,
    color: colors.gray,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  createOptionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.card,
    backgroundColor: '#EAF7F2',
    borderWidth: 1.5,
    borderColor: colors.forest,
    borderStyle: 'dashed',
  },
  createOptionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createOptionText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.forest,
  },
  backToListBtn: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  backToListText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.forest,
    textDecorationLine: 'underline',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  buttonGroup: {
    gap: 10,
    marginTop: 12,
  },
});
