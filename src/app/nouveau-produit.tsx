/**
 * FICHIER : src/app/nouveau-produit.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-026
 * ÉCRAN : ECRAN-FORM-05 (Création d'un Nouveau Produit et Achat Initial)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur d'ajouter un nouvel article au catalogue personnel de son foyer
 * et d'enregistrer immédiatement son premier ticket d'achat en une seule étape fluide :
 * 1. Informations de l'article : nom (ex: Huile d'olive vierge extra), marque (ex: Châal), photo, catégorie et unité par défaut.
 * 2. Données de l'achat initial : prix total en Dinars Tunisiens (ex: 14.500 DT), quantité (ex: 1), magasin (ex: Monoprix) et date.
 * 3. Affiche en direct le prix unitaire calculé sous les champs.
 * 4. Insère conjointement le produit dans `products` et l'achat dans `purchases` sous une transaction SQLite atomique.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il évite à l'utilisateur de devoir créer d'abord un article vide, puis chercher comment y rattacher un achat.
 * En un seul geste au retour des courses, le nouveau produit est répertorié et le budget est débité.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit 'Ajouter un produit' et flèche de retour.
 * - Le surtitre 'INFORMATIONS PRODUIT' avec le sous-titre 'NOUVEL ARTICLE À SUIVRE'.
 * - Les champs produit : Nom, Marque, Sélecteur de photo avec vignette carrée (48x48px), Sélecteur de rayon.
 * - Les champs d'achat : Prix en DT, Quantité, Unité, Magasin et Date AAAA-MM-JJ.
 * - Une phrase informative calculant en direct le prix unitaire : 'Prix unitaire calculé : 14.500 DT / L'.
 * - Un grand bouton vert 'Enregistrer le produit et l'achat'.
 * - Un bouton d'annulation qui revient à l'écran précédent.
 */

import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Sélecteur déroulant personnalisé
import { SelectField } from '@/components/SelectField';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Body, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, bordures et arrondis)
import { colors, radius } from '@/constants/theme';
// Liste des unités physiques standardisées (L, kg, g, unité, etc.)
import { UNITS } from '@/constants/units';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Fonctions utilitaires de calcul de montants et dates
import { isValidISO, money, todayISO, toNum } from '@/utils/format';
// Utilitaire d'accès à la galerie photo native
import { pickPhoto } from '@/utils/photos';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer le formulaire de création d'un nouveau produit et son ticket d'achat initial.
 *
 * RÔLE DANS L'APPLICATION :
 * Effectue la double insertion atomique dans SQLite (`products` et `purchases`) et débite le budget actif.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec les 8 champs du produit et de l'achat, le calcul du prix unitaire en direct et les boutons.
 */
export default function AddProductScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction des données de catalogue, du profil et des actions d'insertion
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL } = useTranslation();

  // Filtrage des catégories de produits actives sélectionnées par l'utilisateur
  const cats = db.categories.filter(
    (c) => c.kind === 'product' && c.active && me?.categoryIds.includes(c.id)
  );

  // États locaux des attributs du produit et de son premier ticket de caisse
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState(cats[0]?.id ?? '');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('L');
  const [store, setStore] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState('');

  /**
   * MISSION DE LA FONCTION :
   * Valider la saisie et enregistrer conjointement le produit et son premier achat dans SQLite.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.addProduct` puis `actions.addPurchase` dans SQLite et déclenche la redirection vers `/confirmation`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * En cas d'erreur : affiche la bannière rouge (ex: nom vide, quantité non positive, date invalide).
   * En cas de succès : ouvre l'écran de confirmation avec le médaillon de réussite.
   */
  const save = () => {
    const p = toNum(price);
    const q = toNum(quantity);

    // Contrôles de validation métier
    if (!name.trim()) return setError(t('entrer_nom_produit'));
    if (!categoryId) return setError(t('choisir_cat_produit'));
    if (!Number.isFinite(p) || p < 0) return setError(t('entrer_prix_valide'));
    if (!Number.isFinite(q) || q <= 0) return setError(t('quantite_doit_etre_positive'));
    if (!isValidISO(date)) return setError(t('format_date_invalide'));

    // Insertion 1 : Ajout de la fiche de l'article dans la table 'products'
    const productId = actions.addProduct({
      name: name.trim(),
      brand: brand.trim(),
      categoryId,
      unit,
      photo,
    });
    // Insertion 2 : Ajout du premier ticket de caisse dans la table 'purchases'
    const purchaseId = actions.addPurchase({
      productId,
      price: p,
      quantity: q,
      unit,
      store: store.trim(),
      date,
    });

    // Navigation directe vers l'écran récapitulatif de confirmation
    router.replace({
      pathname: '/confirmation',
      params: {
        kind: 'purchase',
        purchaseId,
        productId,
        categoryId,
        amount: String(p),
      },
    } as never);
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('ajouter_produit')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('informations_produit')}
      </Eyebrow>

      {/* Titre de section descriptif */}
      <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('nouvel_article_a_suivre')}
      </SectionTitle>

      {/* Bannière d'alerte rouge affichée en cas d'erreur de validation */}
      {error ? (
        <AlertBanner
          tone="danger"
          title={t('verifier_ce_produit')}
          detail={error}
        />
      ) : null}

      {/* Avertissement jaune si l'utilisateur n'a activé aucun rayon de type produit */}
      {cats.length === 0 ? (
        <AlertBanner
          tone="warning"
          title={t('aucune_cat_produit_selectionnee')}
          detail={t('aucune_cat_produit_detail')}
        />
      ) : null}

      {/* Champ 1 : Nom de l'article */}
      <Input
        label={t('nom_produit_label')}
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
        placeholder="Huile d'olive"
      />

      {/* Champ 2 : Marque commerciale du produit */}
      <Input
        label={t('marque_label')}
        value={brand}
        onChangeText={setBrand}
        autoCapitalize="words"
        placeholder="Châal"
      />

      {/* Bouton tactile de sélection d'une photo dans la galerie du smartphone */}
      <Pressable
        onPress={async () => {
          const u = await pickPhoto();
          if (u) setPhoto(u);
        }}
        accessibilityRole="button"
        style={{
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.control,
          minHeight: 80,
          padding: 15,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={{ fontSize: 11, fontWeight: '500', color: colors.muted }}>
            {t('photo_facultative')}
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: colors.forest,
              marginTop: 6,
            }}
          >
            {photo ? t('changer_photo') : t('ajouter_photo_btn')}
          </Text>
        </View>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: 48, height: 48, borderRadius: 12 }}
          />
        ) : null}
      </Pressable>

      {/* Sélecteur déroulant de la catégorie de l'article */}
      <SelectField
        label={t('categorie_produit_label')}
        value={categoryId}
        options={cats.map((c) => ({ value: c.id, label: c.name }))}
        onChange={setCategoryId}
      />

      {/* Champ 3 : Prix total payé en caisse en Dinars Tunisiens */}
      <Input
        label={t('prix_dt_label')}
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        placeholder="14.500"
      />

      {/* Champ 4 : Quantité achetée */}
      <Input
        label={t('quantite_label')}
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
      />

      {/* Sélecteur déroulant de l'unité de mesure */}
      <SelectField
        label={t('unite_label')}
        value={unit}
        options={UNITS}
        onChange={setUnit}
      />

      {/* Champ 5 : Enseigne ou magasin où a été fait l'achat */}
      <Input
        label={t('magasin_label')}
        value={store}
        onChangeText={setStore}
        autoCapitalize="words"
        placeholder="Monoprix"
      />

      {/* Champ 6 : Date de l'achat au format standard AAAA-MM-JJ */}
      <Input
        label={t('date_achat_label')}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
      />

      {/* Calcul automatique en direct du prix unitaire résultant */}
      {Number.isFinite(toNum(price)) && toNum(quantity) > 0 ? (
        <Body style={{ textAlign: isRTL ? 'right' : 'left' }}>
          {t('prix_unitaire_calcule')} :{' '}
          {money(toNum(price) / toNum(quantity))} / {unit}
        </Body>
      ) : null}

      {/* Bouton vert forêt : insertion conjointe du produit et de son premier ticket dans SQLite */}
      <Button
        label={t('enregistrer_produit_et_achat')}
        onPress={save}
        disabled={cats.length === 0}
      />

      {/* Bouton secondaire clair d'annulation */}
      <Button
        label={t('annuler')}
        variant="secondary"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
