/**
 * FICHIER : src/app/(tabs)/produits.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-014
 * ÉCRAN : ECRAN-TAB-02 (Catalogue des Produits et Suivi des Prix)
 *
 * RÔLE DU COMPOSANT :
 * Présente le répertoire personnel des produits suivis par l'utilisateur connecté avec :
 * - Recherche instantanée par nom ou marque
 * - Filtrage par catégorie produit via des pastilles `Chips` horizontales
 * - Tri alphabétique direct (A–Z ou Z–A)
 * - Affichage du dernier prix unitaire calculé et de l'unité de mesure
 *
 * ACTIONS ASSOCIÉES :
 * - ACTION-USER-06 : Filtrage par texte, sélection de catégorie et inversion du sens de tri
 * - ACTION-USER-07 : Consultation de la fiche produit détaillée (`/produit/[id]`)
 * - Raccourci vers la création d'un nouveau produit (`/nouveau-produit`)
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * En-tête avec titre traduit, champ de recherche avec placeholder, barre de pastilles
 * déroulante, barre de statut indiquant le nombre d'articles trouvés et le bouton de tri vert,
 * liste des cartes produits `ProductCard` et bouton d'ajout en bas.
 */

import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
// Carte visuelle d'un produit avec catégorie, unité et dernier prix
import { ProductCard } from '@/components/Cards';
// Barre de sélection horizontale par pastilles
import { Chips } from '@/components/Chips';
// Conteneur d'écran avec tiroir latéral
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Button, EmptyState, Eyebrow, Hint, Input } from '@/components/ui';
// Constantes de thème (couleurs écologiques)
import { colors } from '@/constants/theme';
// Sélecteurs de données SQLite (nom de catégorie, achats associés, unité de mesure)
import { categoryName, productPurchases, unitOf } from '@/state/selectors';
// Magasin d'état global SQLite
import { useStore } from '@/state/store';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DE LA FONCTION : ProductsScreen
 *   Composant principal de l'écran du catalogue des produits (`/(tabs)/produits`).
 *   Gère le moteur de recherche multi-critères, le filtrage par pastilles de catégories,
 *   l'inversion du tri alphabétique et la navigation vers les fiches détaillées d'articles.
 *
 * RÔLE DANS L'APPLICATION :
 *   Permet à l'utilisateur de suivre précisément l'évolution des prix unitaires de ses produits
 *   de consommation courante (lait, huile, semoule, café) et de préparer ses achats.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   - Champ de recherche Input avec icône loupe.
 *   - Rangée horizontale de filtres par pastilles `<Chips />`.
 *   - Barre récapitulative affichant le nombre de résultats et le bouton d'inversion A-Z / Z-A.
 *   - Liste des cartes produits blanches `<ProductCard />` avec vignette, marque et dernier prix en DT.
 *   - Bouton d'action en bas de liste "＋ Ajouter un produit" ou `<EmptyState />` si aucun article trouvé.
 */
export default function ProductsScreen() {
  const router = useRouter();
  const { db, me } = useStore();
  const { t, isRTL } = useTranslation();

  // État local de recherche textuelle
  const [q, setQ] = useState('');
  // État local du filtre de catégorie ('all' pour toutes les catégories)
  const [cat, setCat] = useState('all');
  // État local de l'ordre de tri (true: A–Z, false: Z–A)
  const [asc, setAsc] = useState(true);

  // Mémorisation de la liste des produits appartenant à l'utilisateur connecté
  const mine = useMemo(
    () => db.products.filter((p) => p.userId === me?.id),
    [db.products, me?.id]
  );

  // Liste des catégories de type 'produit' sélectionnées par l'utilisateur
  const chipCats = db.categories.filter(
    (c) => c.kind === 'product' && (me?.categoryIds ?? []).includes(c.id)
  );

  // Filtrage et tri dynamiques des produits selon la saisie et les sélections
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return mine
      .filter(
        (p) =>
          (cat === 'all' || p.categoryId === cat) &&
          (!s || `${p.name} ${p.brand}`.toLowerCase().includes(s))
      )
      .sort((a, b) =>
        asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
  }, [mine, q, cat, asc]);

  return (
    // ECRAN-TAB-02-01 : Conteneur principal avec titre traduit
    <Screen title={t('produits')}>
      {/* ECRAN-TAB-02-02 : En-tête surtitre */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('vos_essentiels_quotidiens')}
      </Eyebrow>

      {/* ECRAN-TAB-02-03 : Champ de recherche par nom ou marque */}
      <Input
        label={t('rechercher')}
        value={q}
        onChangeText={setQ}
        placeholder={t('nom_ou_email_placeholder')}
        autoCapitalize="none"
      />

      {/* ECRAN-TAB-02-04 : Barre de pastilles de filtrage par catégorie */}
      <Chips
        value={cat}
        onChange={setCat}
        options={[
          { value: 'all', label: t('tous_produits') },
          ...chipCats.map((c) => ({ value: c.id, label: c.name })),
        ]}
      />

      {/* ECRAN-TAB-02-05 : Ligne d'en-tête de résultats (compteur et bouton de tri) */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Compteur de produits trouvés */}
        <Text style={{ fontSize: 14, fontWeight: '600', color: colors.forest }}>
          {list.length} {list.length === 1 ? t('produit_label') : t('produits')}
        </Text>

        {/* ACTION-USER-06 : Bouton d'inversion du tri alphabétique */}
        <Pressable
          onPress={() => setAsc((a) => !a)}
          accessibilityRole="button"
        >
          <Text style={{ fontSize: 13, color: colors.green, fontWeight: '600' }}>
            {asc ? t('tri_nom_az') : t('tri_nom_za')}
          </Text>
        </Pressable>
      </View>

      {/* ECRAN-TAB-02-06 : Liste des cartes produits ou état vide */}
      {list.length === 0 ? (
        <EmptyState
          icon="bag-outline"
          title={
            mine.length
              ? t('aucun_produit_correspondant')
              : t('aucun_produit_enregistre')
          }
          detail={t('produits_suivi_detail')}
          actionLabel={t('ajouter_produit')}
          onAction={() => router.push('/nouveau-produit')}
        />
      ) : (
        list.map((p) => {
          const last = productPurchases(db, p.id).slice(-1)[0];
          return (
            // ACTION-USER-07 : Consultation de la fiche au clic
            <ProductCard
              key={p.id}
              product={p}
              categoryName={categoryName(db, p.categoryId)}
              unit={last?.unit ?? p.unit}
              latestUnitPrice={last ? unitOf(last) : undefined}
              onPress={() =>
                router.push({
                  pathname: '/produit/[id]',
                  params: { id: p.id },
                } as never)
              }
            />
          );
        })
      )}

      {/* ECRAN-TAB-02-07 : Note pédagogique sur l'isolation produits vs dépenses */}
      <Hint style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('categories_produits_seules')}
      </Hint>

      {/* ECRAN-TAB-02-08 : Bouton d'ajout d'un nouveau produit */}
      <Button
        label={`＋ ${t('ajouter_produit')}`}
        onPress={() => router.push('/nouveau-produit')}
      />
    </Screen>
  );
}
