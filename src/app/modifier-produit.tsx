/**
 * FICHIER : src/app/modifier-produit.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-025
 * ÉCRAN : ECRAN-FORM-05 (Modification d'une Fiche Produit)
 *
 * MISSION DU FICHIER :
 * Permettre à l'utilisateur de modifier la fiche descriptive d'un article de consommation :
 * nom du produit, marque commerciale (ex: Délice, Randa, Moulin d'Or), catégorie de rattachement,
 * unité de mesure par défaut (L, kg, g, pièce, pack) et illustration photo.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il permet d'enrichir et de corriger le catalogue personnel de l'utilisateur.
 * Modifier le nom d'un produit met à jour instantanément tous ses tickets d'achats passés
 * et futurs dans l'affichage sans rompre les liaisons relationnelles SQLite.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un en-tête avec titre traduit 'Modifier le produit' et flèche de retour.
 * - Le surtitre 'INFORMATIONS PRODUIT'.
 * - Le champ 'Nom du produit' (ex: Lait demi-écrémé).
 * - Le champ 'Marque' (ex: Délice Danone).
 * - Un sélecteur photo tactile avec aperçu miniature carré de l'image (48x48px avec coins arrondis).
 * - Un sélecteur déroulant pour réassigner la catégorie de produit.
 * - Un sélecteur d'unité standardisée (Litre, Kilogramme, Gramme, Pièce, etc.).
 * - Un grand bouton vert 'Enregistrer les modifications'.
 * - Un bouton secondaire clair 'Annuler'.
 */

import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
// Conteneur d'écran avec retour arrière et gestion du défilement
import { Screen } from '@/components/Screen';
// Sélecteur déroulant personnalisé
import { SelectField } from '@/components/SelectField';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, EmptyState, Eyebrow, Input } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, bordures et arrondis)
import { colors, radius } from '@/constants/theme';
// Liste des unités physiques standardisées (L, kg, g, pièce, pack)
import { UNITS } from '@/constants/units';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Utilitaire d'accès à la galerie photo native du smartphone
import { pickPhoto } from '@/utils/photos';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DU COMPOSANT :
 * Gérer l'écran de modification des métadonnées d'un article d'épicerie.
 *
 * RÔLE DANS L'APPLICATION :
 * Charge les attributs actuels du produit depuis SQLite, permet leur édition et applique les changements.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * Le formulaire pré-rempli avec les champs de texte, le bouton photo et les sélecteurs déroulants.
 */
export default function EditProductScreen() {
  // Hook de navigation Expo Router
  const router = useRouter();
  // Extraction de l'identifiant du produit transmis dans l'URL (ex: /modifier-produit?id=...)
  const { id } = useLocalSearchParams<{ id: string }>();
  // Extraction des données de catalogue, du profil et des actions
  const { db, me, actions } = useStore();
  // Fonctions de traduction et sens de lecture
  const { t, isRTL, traduireCategorie } = useTranslation();

  // Recherche du produit ciblé dans la table SQLite 'products'
  const product = db.products.find((p) => p.id === id);

  // États locaux initialisés avec les valeurs existantes de l'article
  const [name, setName] = useState(product?.name ?? '');
  const [brand, setBrand] = useState(product?.brand ?? '');
  const [photo, setPhoto] = useState(product?.photo);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [unit, setUnit] = useState(product?.unit ?? 'L');
  const [error, setError] = useState('');

  // Sécurité : si le produit a été supprimé ou est introuvable
  if (!product) {
    return (
      <Screen title={t('modifier_produit')} back>
        <EmptyState
          title={t('produit_non_trouve')}
          actionLabel={t('retour')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  // Filtrage des catégories éligibles (rayons de type 'product' uniquement)
  const cats = db.categories.filter(
    (c) =>
      c.kind === 'product' &&
      (me?.categoryIds.includes(c.id) || c.id === product.categoryId)
  );

  /**
   * MISSION DE LA FONCTION :
   * Valider et sauvegarder les nouvelles métadonnées de l'article dans la base SQLite.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle `actions.updateProduct` qui exécute l'UPDATE SQL dans la table `products`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * En cas d'erreur (nom vide) : affiche une alerte rouge. Si valide : enregistre et revient à la fiche produit.
   */
  const save = () => {
    if (!name.trim()) return setError(t('entrer_nom_produit'));
    actions.updateProduct(product.id, {
      name: name.trim(),
      brand: brand.trim(),
      photo,
      categoryId,
      unit,
    });
    router.back();
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('modifier_produit')} back>
      {/* Surtitre explicatif en lettres capitales */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('informations_produit')}
      </Eyebrow>

      {/* Bannière d'alerte rouge affichée si le nom est effacé */}
      {error ? (
        <AlertBanner
          tone="danger"
          title={t('verifier_ce_produit')}
          detail={error}
        />
      ) : null}

      {/* Champ de saisie pour modifier le libellé de l'article */}
      <Input
        label={t('nom_produit_label')}
        value={name}
        onChangeText={setName}
        autoCapitalize="sentences"
      />

      {/* Champ de saisie pour la marque du fabricant */}
      <Input
        label={t('marque_label')}
        value={brand}
        onChangeText={setBrand}
        autoCapitalize="words"
      />

      {/* Bouton tactile de sélection ou remplacement de la photo de l'article */}
      <Pressable
        onPress={async () => {
          // Ouvre le sélecteur d'images natif du smartphone
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
        {/* Aperçu miniature carré de la photo sélectionnée */}
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: 48, height: 48, borderRadius: 12 }}
          />
        ) : null}
      </Pressable>

      {/* Sélecteur déroulant pour changer le rayon de l'article */}
      <SelectField
        label={t('categorie_produit_label')}
        value={categoryId}
        options={cats.map((c) => ({ value: c.id, label: traduireCategorie(c.name) }))}
        onChange={setCategoryId}
      />

      {/* Sélecteur déroulant pour définir l'unité de mesure principale (L, kg, g, etc.) */}
      <SelectField
        label={t('unite_par_defaut')}
        value={unit}
        options={UNITS}
        onChange={setUnit}
      />

      {/* Bouton vert forêt : applique les modifications en base SQLite */}
      <Button label={t('enregistrer_modifications')} onPress={save} />

      {/* Bouton secondaire clair : quitte sans enregistrer */}
      <Button
        label={t('annuler')}
        variant="secondary"
        onPress={() => router.back()}
      />
    </Screen>
  );
}
