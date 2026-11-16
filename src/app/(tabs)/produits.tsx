/**
 * FICHIER : src/app/(tabs)/produits.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-014
 * ÉCRAN : ECRAN-TAB-02 (Catalogue des Produits Achetés et Essentiels du Quotidien)
 *
 * RÔLE DU COMPOSANT :
 * Présente le répertoire personnel des produits suivis par l'utilisateur connecté :
 * - Recherche instantanée par nom ou marque avec champ stylisé en carte blanche
 * - Filtrage par catégorie produit via des filtres horizontaux
 * - Tri alphabétique direct (A–Z ou Z–A)
 * - Liste des cartes produits avec vignette vert menthe, nom et ligne "Catégorie · Unité · Prix DT"
 * - Consultation de la fiche détaillée d'un produit (`/produit/[id]`) au clic
 * - Gestion de l'état vide avec un seul bouton clair "Ajouter un produit acheté" et la barre de recherche
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * En-tête standard, surtitre 'VOS ESSENTIELS DU QUOTIDIEN', carte blanche de recherche,
 * barre récapitulative du nombre de produits et bouton de tri, cartes produits blanches et bouton vert forêt.
 */

// Outil de routage Expo Router
import { useRouter } from 'expo-router';
// Hooks d'état et de mémorisation React
import React, { useMemo, useState } from 'react';
// Composants de mise en page et interactions tactiles React Native
import { Pressable, StyleSheet, Text, View } from 'react-native';
// Carte visuelle d'un produit avec catégorie, unité et dernier prix
import { ProductCard } from '@/components/Cards';
// Conteneur d'écran avec tiroir latéral et marges de sécurité
import { Screen } from '@/components/Screen';
// Composants atomiques d'interface utilisateur
import { Button, EmptyState, Eyebrow, Hint, Input } from '@/components/ui';
// Constantes de thème officielles
import { colors, radius } from '@/constants/theme';
// Sélecteurs de calcul financier SQLite (nom de catégorie, achats associés, unité de mesure)
import { categoryName, productPurchases, unitOf } from '@/state/selectors';
// Magasin d'état global connecté à SQLite
import { useStore } from '@/state/store';
// Type métier TypeScript d'un produit
import type { Product } from '@/state/types';
// Formatage de date de période
import { fmtRange } from '@/utils/format';
// Système d'internationalisation et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';

/**
 * MISSION DE LA FONCTION : ProductsScreen
 *   Composant principal de l'écran du catalogue des produits (`/(tabs)/produits`).
 *   Gère le moteur de recherche, le filtrage par catégories, l'inversion du tri et l'état vide.
 * RÔLE DANS L'APPLICATION :
 *   Permet à l'utilisateur de consulter l'ensemble des articles achetés et de comparer leurs prix.
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 *   La barre de recherche, la liste filtrable de tous les produits enregistrés ou l'état vide avec le bouton d'ajout.
 */
export default function ProductsScreen() {
  // Hook de redirection Expo Router
  const router = useRouter();
  // Accès aux données de la base SQLite, à l'utilisateur connecté et à la période active
  const { db, me, selectedBudget } = useStore();
  // Fonctions de traduction et sens d'écriture RTL
  const { t, isRTL, traduireCategorie } = useTranslation();

  // État local de la chaîne de recherche textuelle
  const [q, setQ] = useState('');
  // État local du filtre de catégorie ('all' pour toutes les catégories)
  const [cat, setCat] = useState('all');
  // État local de l'ordre de tri (true: A–Z, false: Z–A)
  const [asc, setAsc] = useState(true);

  // Mémorisation de la liste des produits uniques appartenant à l'utilisateur connecté
  // Déduplique automatiquement les produits ayant le même nom (insensible à la casse et aux espaces)
  const mine = useMemo(() => {
    // Récupération des produits rattachés à l'utilisateur connecté
    const raw = db.products.filter((p) => p.userId === me?.id || !p.userId);
    // Table de hachage pour dédupliquer les produits par nom normalisé
    const seen = new Map<string, Product>();
    // Parcours de tous les articles bruts
    for (const p of raw) {
      // Clé normalisée : nom en minuscules sans espaces superflus
      const key = p.name.trim().toLowerCase();
      // Si ce nom n'a pas encore été rencontré
      if (!seen.has(key)) {
        // Enregistrement de la référence principale du produit
        seen.set(key, p);
      } else {
        // Si le produit existe déjà, on complète les métadonnées manquantes (marque ou photo)
        const cur = seen.get(key)!;
        // Enrichissement progressif si la nouvelle entrée contient une marque ou une photo
        if ((!cur.brand && p.brand) || (!cur.photo && p.photo)) {
          seen.set(key, { ...cur, brand: cur.brand || p.brand, photo: cur.photo || p.photo });
        }
      }
    }
    // Transformation de la table en tableau ordonné de produits uniques
    return Array.from(seen.values());
  }, [db.products, me?.id]);

  // Liste des catégories de type 'produit' actives
  const chipCats = useMemo(() => {
    // Extraction des catégories produit associées à l'utilisateur
    return db.categories.filter(
      (c) => c.kind === 'product' && (me?.categoryIds ?? []).includes(c.id)
    );
  }, [db.categories, me?.categoryIds]);

  // Filtrage et tri dynamiques des produits selon la saisie et les sélections
  const list = useMemo(() => {
    // Normalisation de la chaîne de recherche (en minuscules et sans espaces superflus)
    const s = q.trim().toLowerCase();
    // Application des filtres dès le premier caractère saisi
    return mine
      .filter((p) => {
        // Vérification de la catégorie sélectionnée
        const matchesCategory = cat === 'all' || p.categoryId === cat;
        // Si la catégorie ne correspond pas, exclusion
        if (!matchesCategory) return false;
        // Si la recherche est vide, on inclut le produit
        if (!s) return true;
        // Correspondance insensible à la casse dès la première lettre sur le nom du produit
        const nameMatch = p.name.trim().toLowerCase().includes(s);
        // Correspondance insensible à la casse dès la première lettre sur la marque
        const brandMatch = (p.brand ?? '').trim().toLowerCase().includes(s);
        // Inclusion si le nom ou la marque contient la lettre ou suite de lettres saisie
        return nameMatch || brandMatch;
      })
      // Tri alphabétique direct A–Z ou inverse Z–A
      .sort((a, b) =>
        asc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
      );
  }, [mine, q, cat, asc]);

  return (
    // Conteneur Screen standardisé avec titre traduit
    <Screen title={t('produits')}>
      {/* Période de référence centrale active associée au catalogue */}
      {selectedBudget && (
        <View
          style={{
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#EBF4F0',
            paddingVertical: 7,
            paddingHorizontal: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#CDE5DB',
          }}
        >
          <Text style={{ fontSize: 12, color: colors.forest, fontWeight: '600' }}>
            Période active : {fmtRange(selectedBudget.start, selectedBudget.end)}
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/calendrier')} hitSlop={6} accessibilityRole="button">
            <Text style={{ fontSize: 12, color: colors.green, fontWeight: '600' }}>
              Changer ›
            </Text>
          </Pressable>
        </View>
      )}

      {/* Surtitre : VOS ESSENTIELS DU QUOTIDIEN */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('vos_essentiels_du_quotidien')}
      </Eyebrow>

      {/* Carte blanche du champ de recherche par nom ou marque */}
      <Input
        label={t('rechercher_produits')}
        value={q}
        onChangeText={setQ}
        placeholder={t('rechercher_nom_ou_marque')}
        autoCapitalize="none"
      />

      {/* Ligne horizontale de sélection des filtres de catégories si des produits existent */}
      {mine.length > 0 && (
        <View
          style={[
            styles.filterRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Bouton pour afficher tous les produits */}
          <Pressable
            onPress={() => setCat('all')}
            accessibilityRole="button"
          >
            <Text
              style={[
                styles.filterLink,
                cat === 'all' && styles.filterLinkActive,
              ]}
            >
              {t('tous_produits')}
            </Text>
          </Pressable>

          {/* Pastilles pour les deux premières catégories produits de l'utilisateur */}
          {chipCats.slice(0, 2).map((c) => (
            <React.Fragment key={c.id}>
              {/* Point de séparation */}
              <Text style={styles.filterDot}>·</Text>
              {/* Libellé cliquable de la catégorie */}
              <Pressable
                onPress={() => setCat(c.id)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.filterLink,
                    cat === c.id && styles.filterLinkActive,
                  ]}
                >
                  {traduireCategorie(c.name)}
                </Text>
              </Pressable>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Ligne récapitulative : nombre de produits et bouton de tri alphabétique */}
      {mine.length > 0 && (
        <View
          style={[
            styles.countRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          {/* Compteur de produits trouvés */}
          <Text style={styles.countText}>
            {list.length} {list.length === 1 ? t('produit_label') : t('produits')}
          </Text>

          {/* Bouton tactile d'inversion du tri A-Z / Z-A */}
          <Pressable
            onPress={() => setAsc((a) => !a)}
            accessibilityRole="button"
          >
            <Text style={styles.sortText}>
              {asc ? t('tri_nom_az') : t('tri_nom_za')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Affichage de l'état vide si aucun produit n'a été acheté */}
      {mine.length === 0 ? (
        <EmptyState
          icon="bag-outline"
          title={t('aucun_produit_enregistre')}
          detail={t('produits_suivi_detail')}
          actionLabel={t('ajouter_produit_achete')}
          onAction={() => router.push('/nouveau-produit')}
        />
      ) : list.length === 0 ? (
        // État vide si la recherche textuelle ne donne aucun résultat
        <EmptyState
          icon="search-outline"
          title={t('aucun_produit_correspondant')}
          detail={t('produits_suivi_detail')}
        />
      ) : (
        // Rendu de la liste de tous les produits achetés
        list.map((p) => {
          // Récupération du dernier achat enregistré pour cet article
          const last = productPurchases(db, p.id).slice(-1)[0];
          // Rendu de la carte de produit
          return (
            <ProductCard
              key={p.id}
              product={p}
              categoryName={traduireCategorie(categoryName(db, p.categoryId))}
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

      {/* Note informative en bas d'écran sur la distinction produits vs dépenses */}
      <Hint style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('categories_produits_seules')}
      </Hint>

      {/* Bouton d'action principal vert sombre : Ajouter un produit (affiché uniquement lorsqu'il y a déjà des produits dans le catalogue) */}
      {mine.length > 0 && (
        <Button
          // Libellé avec un seul signe plus et nom traduit
          label={`＋ ${t('ajouter_produit')}`}
          // Redirection vers le formulaire d'ajout
          onPress={() => router.push('/nouveau-produit')}
        />
      )}

      {/* Marge de sécurité en bas */}
      <View style={{ height: 16 }} />
    </Screen>
  );
}

// Feuilles de styles du catalogue produits
const styles = StyleSheet.create({
  // Rangée de liens horizontaux de filtrage par catégorie
  filterRow: {
    // Alignement vertical centré
    alignItems: 'center',
    // Espacement horizontal entre les filtres
    gap: 8,
    // Marge verticale
    marginVertical: 2,
    // Débordement masqué
    overflow: 'hidden',
  },
  // Texte d'un filtre de catégorie
  filterLink: {
    // Taille de 13px
    fontSize: 13,
    // Graisse moyenne
    fontWeight: '500',
    // Couleur vert grisé doux
    color: colors.muted,
  },
  // Style actif du filtre de catégorie sélectionné
  filterLinkActive: {
    // Couleur vert forêt
    color: colors.forest,
    // Graisse semi-grasse
    fontWeight: '700',
  },
  // Point séparateur entre les catégories
  filterDot: {
    // Taille de 14px
    fontSize: 14,
    // Couleur atténuée
    color: colors.muted,
  },
  // Ligne contenant le compteur de résultats et le tri
  countRow: {
    // Justification aux deux extrémités
    justifyContent: 'space-between',
    // Alignement vertical
    alignItems: 'center',
    // Marges verticales de respiration
    marginTop: 4,
    marginBottom: 4,
  },
  // Texte du compteur de produits
  countText: {
    // Taille 13px
    fontSize: 13,
    // Graisse semi-grasse 600
    fontWeight: '600',
    // Couleur vert forêt sombre
    color: colors.forest,
  },
  // Texte du bouton de tri
  sortText: {
    // Taille 13px
    fontSize: 13,
    // Couleur vert institutionnel
    color: colors.green,
    // Graisse semi-grasse
    fontWeight: '600',
  },
});
