/**
 * FICHIER : src/app/nouveau-produit.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-026
 * ÉCRAN : ECRAN-FORM-05 (Saisie d'un Produit Acheté et Enregistrement Complet)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur d'enregistrer un article acheté avec tous ses attributs :
 * 1. Informations du produit : nom (ex: Huile d'olive), marque (ex: Châal), photo facultative, catégorie.
 * 2. Données d'achat : prix total en DT (ex: 14.500), quantité (ex: 1), unité (ex: L), magasin (ex: Monoprix) et date.
 * 3. Enregistrement direct et atomique dans SQLite (`products` et `purchases`).
 * 4. Rendu visuel 100% conforme à l'écran de design : cartes de champs blanches, typographie vert forêt,
 *    texte d'aide des catégories, bouton vert sombre 'Enregistrer le produit et l'achat' et bouton menthe 'Annuler'.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * C'est le point d'entrée unique et complet pour saisir un achat en rentrant des courses.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - En-tête avec bouton menu tiroir, titre 'Ajouter un produit' et icône profil.
 * - Surtitre 'INFORMATIONS DU PRODUIT'.
 * - Titre 'Un nouveau produit à suivre.'.
 * - 9 cartes de saisie épurées (Nom, Marque, Photo, Catégorie, Prix, Quantité, Unité, Magasin, Date).
 * - Texte d'aide listant les catégories disponibles.
 * - Bouton primaire vert sombre 'Enregistrer le produit et l'achat'.
 * - Bouton secondaire vert menthe 'Annuler'.
 */

// Outils de navigation Expo Router
import { useRouter } from 'expo-router';
// Hooks d'état React
import React, { useEffect, useMemo, useState } from 'react';
// Composants visuels et interactifs React Native
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
// Icônes vectorielles Ionicons
import { Ionicons } from '@expo/vector-icons';
// Conteneur d'écran avec marges de sécurité et défilement
import { Screen } from '@/components/Screen';
// Sélecteur déroulant modal personnalisé
import { SelectField } from '@/components/SelectField';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, Input } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, menthe, blanc, bordures et arrondis)
import { colors, radius } from '@/constants/theme';
// Liste des unités physiques standardisées (L, kg, g, unité, etc.)
import { UNITS } from '@/constants/units';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul de montants et dates
import { fmtDateLocale, isValidISO, money, todayISO, toNum } from '@/utils/format';
// Utilitaire d'accès à la caméra et à la galerie photo native
import { pickPhotoFromGallery, takePhotoWithCamera } from '@/utils/photos';
// Modal de choix de la source de photo (Caméra vs Galerie)
import { PhotoSourceModal } from '@/components/PhotoSourceModal';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT : AddProductScreen
 *   Gérer le formulaire complet de saisie d'un produit acheté et de son ticket d'achat.
 * RÔLE DANS L'APPLICATION :
 *   Insère le produit et le ticket dans SQLite de manière persistante et met à jour les totaux en temps réel.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   L'écran complet conforme au design avec les 9 cartes de champs, l'aide contextuelle et les deux boutons d'action.
 */
export default function AddProductScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction des données de catalogue, du profil, du budget sélectionné et des actions d'insertion
  const { db, me, selectedBudget, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL, langue, traduireCategorie } = useTranslation();

  // Extraction des catégories sélectionnées par l'utilisateur (onboarding, paramètres, allocations de budget ou créations personnalisées)
  const userCatSet = useMemo(() => {
    const set = new Set<string>();
    (me?.categoryIds ?? []).forEach((id) => set.add(String(id).toLowerCase()));
    if (selectedBudget?.allocations) {
      Object.keys(selectedBudget.allocations).forEach((id) => set.add(String(id).toLowerCase()));
    }
    return set;
  }, [me?.categoryIds, selectedBudget?.allocations]);

  // Toutes les catégories sélectionnées par l'utilisateur qui concernent le type d'achat produits
  const availableCats = useMemo(() => {
    const productCats = db.categories.filter((c) => c.kind === 'product');
    const selected = productCats.filter(
      (c) =>
        userCatSet.has(String(c.id).toLowerCase()) ||
        userCatSet.has(c.name.toLowerCase()) ||
        (me?.id && c.userId === me.id)
    );
    // Si l'utilisateur a des catégories de produits sélectionnées, toutes les afficher ; sinon afficher toutes les catégories de produits
    return selected.length > 0 ? selected : productCats;
  }, [db.categories, userCatSet, me?.id]);

  // États locaux des champs du produit et de son ticket de caisse
  // Nom de l'article (ex: Huile d'olive)
  const [name, setName] = useState('');
  // Marque commerciale de l'article (ex: Châal)
  const [brand, setBrand] = useState('');
  // Photo enregistrée (optionnelle)
  const [photo, setPhoto] = useState<string | undefined>();
  // Contrôle d'affichage de la modal de sélection de source photo (Caméra vs Galerie)
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  // Catégorie sélectionnée (par défaut la première disponible)
  const [categoryId, setCategoryId] = useState(availableCats[0]?.id ?? '');

  // Synchronisation de la catégorie sélectionnée avec les catégories disponibles
  useEffect(() => {
    if (availableCats.length > 0 && !availableCats.some((c) => c.id === categoryId)) {
      setCategoryId(availableCats[0].id);
    }
  }, [availableCats, categoryId]);

  // Prix total payé en Dinars Tunisiens (ex: 14.500)
  const [price, setPrice] = useState('');
  // Quantité achetée (par défaut 1)
  const [quantity, setQuantity] = useState('1');
  // Unité physique (optionnelle, vide par défaut pour vêtements/articles sans unité)
  const [unit, setUnit] = useState('');
  // Magasin d'achat (ex: Monoprix)
  const [store, setStore] = useState('');

  // Date par défaut rattachée à la période budgétaire sélectionnée
  const defaultDate = useMemo(() => {
    const today = todayISO();
    if (selectedBudget) {
      if (today >= selectedBudget.start && today <= selectedBudget.end) {
        return today;
      }
      return selectedBudget.start;
    }
    return today;
  }, [selectedBudget]);

  // Date d'achat au format ISO
  const [date, setDate] = useState(defaultDate);
  // Message d'erreur de validation éventuel
  const [error, setError] = useState('');

  // Vérification stricte : une période doit être sélectionnée et un budget doit lui être alloué
  const hasBudget = Boolean(selectedBudget && Number(selectedBudget.total) > 0);

  // Détection si la date choisie est en dehors de la période budgétaire sélectionnée
  const isOutsidePeriod = !!selectedBudget && !!date && (date < selectedBudget.start || date > selectedBudget.end);
  const targetCorrectionDate = selectedBudget
    ? (todayISO() >= selectedBudget.start && todayISO() <= selectedBudget.end ? todayISO() : selectedBudget.start)
    : todayISO();

  /**
   * MISSION DE LA FONCTION : save
   *   Valider la saisie et enregistrer conjointement le produit et son premier achat dans SQLite.
   * RÔLE DANS L'APPLICATION :
   *   Alimente la base de données SQLite locale, met à jour le solde et redirige vers la fiche détaillée du produit.
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   *   Affiche une bannière rouge en cas de champ incomplet ou bascule vers la fiche produit créée.
   */
  const save = () => {
    // Blocage strict : création interdite sans période sélectionnée et budget alloué
    if (!hasBudget) return setError(t('selectionner_periode_et_budget_dabord'));

    // Conversion numérique du prix
    const p = toNum(price);
    // Conversion numérique de la quantité
    const q = toNum(quantity);

    // Contrôle : le nom du produit est obligatoire
    if (!name.trim()) return setError(t('entrer_nom_produit'));
    // Contrôle : la catégorie est requise
    if (!categoryId) return setError(t('choisir_cat_produit'));
    // Contrôle : le prix doit être un nombre positif
    if (!Number.isFinite(p) || p < 0) return setError(t('entrer_prix_valide'));
    // Contrôle : la quantité doit être strictement positive
    if (!Number.isFinite(q) || q <= 0) return setError(t('quantite_doit_etre_positive'));
    // Contrôle : la date doit être au format valide
    if (!isValidISO(date)) return setError(t('format_date_invalide'));

    // Insertion du produit dans la table SQLite 'products'
    const productId = actions.addProduct({
      name: name.trim(),
      brand: brand.trim(),
      categoryId,
      unit: (unit || '').trim(),
      photo,
    });

    // Insertion du ticket de caisse dans la table SQLite 'purchases'
    actions.addPurchase({
      productId,
      price: p,
      quantity: q,
      unit: (unit || '').trim(),
      store: store.trim(),
      date,
    });

    // Redirection directe vers la fiche détaillée du produit créé
    router.replace({
      pathname: '/produit/[id]',
      params: { id: productId },
    } as never);
  };

  return (
    // Conteneur Screen avec en-tête standardisé (menu burger à gauche, profil à droite)
    <Screen title={t('ajouter_produit')}>
      {/* Surtitre discret en majuscules 'INFORMATIONS DU PRODUIT' */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('informations_du_produit')}
      </Eyebrow>

      {/* Titre principal de la section 'Un nouveau produit à suivre.' */}
      <Text
        style={[
          styles.mainHeadline,
          { textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {t('un_nouveau_produit_suivre')}
      </Text>

      {/* Message explicatif clair si aucune période n'est sélectionnée ou aucun budget alloué */}
      {!hasBudget && (
        <View style={{ gap: 8, marginVertical: 6 }}>
          <AlertBanner
            tone="warning"
            title={t('selectionner_periode_et_budget_dabord')}
            detail={t('selectionner_periode_et_budget_detail')}
          />
          <Button
            label={t('definir_periode_budget')}
            variant="secondary"
            onPress={() => router.push('/budget-mois')}
          />
        </View>
      )}

      {/* Bannière d'alerte rouge affichée si une erreur survient */}
      {error ? (
        <AlertBanner
          tone="danger"
          title={t('verifier_ce_produit')}
          detail={error}
        />
      ) : null}

      {/* Champ 1 : Nom du produit */}
      <Input
        label={t('nom_produit_label')}
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
        placeholder="Huile d’olive"
      />

      {/* Champ 2 : Marque */}
      <Input
        label={t('marque_label')}
        value={brand}
        onChangeText={setBrand}
        autoCapitalize="words"
        placeholder="Châal"
      />

      {/* Champ 3 : Carte tactile pour la sélection de la photo */}
      <Pressable
        onPress={() => setPhotoModalOpen(true)}
        accessibilityRole="button"
        style={[
          styles.photoCard,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {/* Colonne textuelle du champ photo */}
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          {/* Label supérieur discret */}
          <Text style={styles.photoLabel}>
            {t('photo_facultative_label')}
          </Text>
          {/* Ligne d'action avec bouton d'ajout */}
          <View
            style={[
              styles.photoActionRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {/* Icône plus ou appareil photo */}
            <Ionicons name="camera-outline" size={18} color={colors.forest} />
            {/* Texte de l'action */}
            <Text style={styles.photoActionText}>
              {photo ? t('changer_photo') : t('ajouter_une_photo')}
            </Text>
          </View>
        </View>
        {/* Vignette miniature de la photo si sélectionnée */}
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={styles.photoPreview}
          />
        ) : null}
      </Pressable>

      {/* Feuille modale de sélection de la source photo (Caméra vs Galerie) */}
      <PhotoSourceModal
        visible={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        hasPhoto={!!photo}
        onSelectCamera={async () => {
          setPhotoModalOpen(false);
          const photoUri = await takePhotoWithCamera();
          if (photoUri) setPhoto(photoUri);
        }}
        onSelectGallery={async () => {
          setPhotoModalOpen(false);
          const photoUri = await pickPhotoFromGallery();
          if (photoUri) setPhoto(photoUri);
        }}
        onRemovePhoto={() => {
          setPhotoModalOpen(false);
          setPhoto(undefined);
        }}
      />

      {/* Champ 4 : Sélecteur déroulant de la catégorie de produit */}
      <SelectField
        label={t('categorie_de_produit')}
        value={categoryId}
        options={availableCats.map((c) => ({
          value: c.id,
          label: traduireCategorie(c.name),
        }))}
        onChange={setCategoryId}
      />

      {/* Champ 5 : Prix en Dinars Tunisiens (DT) */}
      <Input
        label={t('prix_dt_format')}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="14.500"
      />

      {/* Champ 6 : Quantité */}
      <Input
        label={t('quantite_simple')}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
        placeholder="1"
      />

      {/* Champ 7 : Sélecteur de l'unité physique */}
      <SelectField
        label={t('unite_simple')}
        value={unit}
        options={UNITS}
        onChange={setUnit}
      />

      {/* Champ 8 : Magasin ou enseigne d'achat */}
      <Input
        label={t('magasin_simple')}
        value={store}
        onChangeText={setStore}
        autoCapitalize="words"
        placeholder="Monoprix"
      />

      {/* Champ 9 : Date d'achat */}
      <Input
        label={t('date_achat_champ')}
        value={date}
        onChangeText={setDate}
        placeholder={fmtDateLocale(todayISO(), langue)}
        keyboardType="numbers-and-punctuation"
      />

      {/* Alerte et action rapide si la date est hors de la période budgétaire sélectionnée */}
      {isOutsidePeriod && selectedBudget ? (
        <View style={{ gap: 6, marginVertical: 4 }}>
          <AlertBanner
            tone="warning"
            title={t('date_hors_periode')}
            detail={t('date_hors_periode_detail', {
              date,
              start: selectedBudget.start,
              end: selectedBudget.end,
            })}
          />
          <Button
            label={t('ajuster_date_periode', { date: targetCorrectionDate })}
            variant="secondary"
            onPress={() => setDate(targetCorrectionDate)}
          />
        </View>
      ) : null}

      {/* Texte d'aide listant les catégories disponibles sous le formulaire */}
      <Text
        style={[
          styles.categoriesHelp,
          { textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {t('categories_produits_liste_aide')}
      </Text>

      {/* Bouton d'action primaire : Enregistrer le produit et l'achat (désactivé si aucune période/budget) */}
      <Button
        label={t('enregistrer_produit_et_achat')}
        onPress={save}
        disabled={!hasBudget}
      />

      {/* Bouton d'action secondaire : Annuler */}
      <Button
        label={t('annuler')}
        variant="secondary"
        onPress={() => router.back()}
      />

      {/* Espace bas de sécurité pour le défilement */}
      <View style={{ height: 16 }} />
    </Screen>
  );
}

// Feuilles de styles StyleSheet du formulaire
const styles = StyleSheet.create({
  // Titre principal de la page
  mainHeadline: {
    // Taille de police généreuse
    fontSize: 22,
    // Graisse très affirmée 700
    fontWeight: '700',
    // Couleur vert forêt sombre institutionnelle
    color: colors.forest,
    // Marge basse de respiration
    marginBottom: 4,
  },
  // Carte de sélection de photo
  photoCard: {
    // Fond blanc immaculé
    backgroundColor: colors.white,
    // Bordure fine grise
    borderWidth: 1,
    // Couleur de bordure standard
    borderColor: colors.border,
    // Rayon de courbure des angles de 16px
    borderRadius: radius.control,
    // Hauteur minimale harmonieuse avec les autres champs
    minHeight: 80,
    // Espacement intérieur horizontal
    paddingHorizontal: 15,
    // Espacement intérieur vertical
    paddingVertical: 12,
    // Centrage des éléments
    alignItems: 'center',
    // Espacement interne
    gap: 12,
  },
  // Label discret du champ photo
  photoLabel: {
    // Taille de 11px
    fontSize: 11,
    // Graisse moyenne 500
    fontWeight: '500',
    // Couleur verte grisée discrète
    color: colors.muted,
  },
  // Ligne contenant l'icône et le texte d'action photo
  photoActionRow: {
    // Alignement horizontal
    alignItems: 'center',
    // Espacement entre l'icône et le libellé
    gap: 8,
    // Marge supérieure
    marginTop: 6,
  },
  // Texte du bouton d'ajout photo
  photoActionText: {
    // Taille de 15px
    fontSize: 15,
    // Graisse semi-grasse 600
    fontWeight: '600',
    // Couleur vert forêt
    color: colors.forest,
  },
  // Aperçu miniature de la photo sélectionnée
  photoPreview: {
    // Largeur de 50px
    width: 50,
    // Hauteur de 50px
    height: 50,
    // Angles arrondis de 12px
    borderRadius: 12,
  },
  // Note textuelle informative sur les catégories
  categoriesHelp: {
    // Taille de 12px
    fontSize: 12,
    // Hauteur de ligne aérée
    lineHeight: 18,
    // Couleur atténuée
    color: colors.muted,
    // Marges verticales de respiration
    marginVertical: 4,
  },
});
