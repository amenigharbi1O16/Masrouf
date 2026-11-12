// ============================================================
// FICHIER : src/app/produit/[id].tsx
// RÔLE    : Écran de détail dynamique d'un produit spécifique.
//           Accessible via l'URL /produit/1, /produit/2, etc.
//
// VISUEL SUR L'ÉCRAN :
//   1. En-tête : Badge avec l'ID SQLite, nom complet du produit,
//      sa marque commerciale et l'icône de sa catégorie.
//   2. Cartes de statistiques intelligentes :
//      - Trophée 🏆 "Meilleur prix" avec le nom du magasin le moins cher !
//      - Prix moyen calculé sur l'ensemble des achats passés.
//   3. Historique chronologique des prix :
//      - Liste de tous les tickets d'achat enregistrés pour ce produit
//        avec date, enseigne, prix unitaire, quantité et total.
//   4. Bouton de retour vers le catalogue des produits.
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getProduitById,
  getAchatsByProduit,
  deleteProduit,
  Produit,
  Achat,
} from '../../db/queries';

// Contexte et internationalisation
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';

export default function FicheProduitScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  // useLocalSearchParams : extrait le paramètre [id] présent dans l'URL
  // Exemple : /produit/2 → id = "2"
  const { id } = useLocalSearchParams<{ id: string }>();

  // ÉTATS LOCAUX :
  const [produit, setProduit] = useState<Produit | null>(null);
  const [historique, setHistorique] = useState<Achat[]>([]);

  // ----------------------------------------------------------
  // CHARGEMENT DES DONNÉES DU PRODUIT DEPUIS SQLITE
  // ----------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (id) {
        const pId = Number(id);
        // Récupère la fiche signalétique du produit
        const p = getProduitById(pId);
        setProduit(p);

        // Récupère tous les achats passés de ce produit
        const achats = getAchatsByProduit(pId, user?.id);
        setHistorique(achats);
      }
    }, [id, user?.id])
  );

  // ----------------------------------------------------------
  // CALCULS STATISTIQUES SUR LES PRIX
  // ----------------------------------------------------------
  let meilleurPrix = 0;
  let meilleurMagasin = 'Non déterminé';
  let prixMoyen = 0;

  if (historique.length > 0) {
    // Recherche de l'achat avec le prix unitaire le plus bas
    const achatMoinsCher = historique.reduce((min, cur) =>
      cur.prix_unitaire < min.prix_unitaire ? cur : min
    );
    meilleurPrix = achatMoinsCher.prix_unitaire;
    meilleurMagasin = achatMoinsCher.magasin_nom;

    // Calcul de la moyenne des prix unitaires
    const somme = historique.reduce((sum, a) => sum + a.prix_unitaire, 0);
    prixMoyen = somme / historique.length;
  }

  // ----------------------------------------------------------
  // SUPPRESSION DU PRODUIT AVEC GESTION DES ACHATS ASSOCIES
  // ----------------------------------------------------------
  function handleSupprimerProduit() {
    if (!produit) return;

    Alert.alert(
      'Supprimer ce produit',
      `Que souhaitez-vous faire des ${historique.length} achat(s) associés à « ${produit.nom} » ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Conserver les dépenses (Recommandé)',
          onPress: () => {
            deleteProduit(produit.id, 'reassign');
            Alert.alert('Succès', 'Produit supprimé. Les dépenses ont été conservées dans le budget.');
            router.back();
          },
        },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => {
            deleteProduit(produit.id, 'cascade');
            Alert.alert('Supprimé', 'Le produit et son historique ont été définitivement effacés.');
            router.back();
          },
        },
      ]
    );
  }

  if (!produit) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.notFoundText}>Produit introuvable.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>{t('retour_liste')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ==================================================== */}
      {/* SECTION 1 : EN-TÊTE FICHE PRODUIT                    */}
      {/* ==================================================== */}
      <View style={styles.headerCard}>
        <View style={styles.badgeRow}>
          <Text style={styles.idBadge}>ID Produit : #{produit.id}</Text>
          <Text style={styles.categoryBadge}>
            {produit.categorie_icone} {produit.categorie_nom}
          </Text>
        </View>

        <Text style={styles.productName}>{produit.nom}</Text>
        <Text style={styles.productMeta}>
          {produit.marque ? `Marque : ${produit.marque} • ` : ''}
          Conditionnement : {produit.unite}
        </Text>
      </View>

      {/* ==================================================== */}
      {/* SECTION 2 : STATISTIQUES INTELLIGENTES               */}
      {/* ==================================================== */}
      {historique.length > 0 ? (
        <View style={styles.statsRow}>
          {/* Bloc Meilleur Prix (Magasin le moins cher) */}
          <View style={[styles.statBox, styles.statBoxBest]}>
            <Text style={styles.statLabel}>🏆 {t('meilleur_prix')}</Text>
            <Text style={styles.statValueBest}>
              {meilleurPrix.toFixed(3)} TND
            </Text>
            <Text style={styles.statSubBest}>chez {meilleurMagasin}</Text>
          </View>

          {/* Bloc Prix Moyen */}
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>📊 Prix Moyen</Text>
            <Text style={styles.statValue}>{prixMoyen.toFixed(3)} TND</Text>
            <Text style={styles.statSub}>
              sur {historique.length} achat(s)
            </Text>
          </View>
        </View>
      ) : null}

      {/* ==================================================== */}
      {/* SECTION 3 : HISTORIQUE CHRONOLOGIQUE DES PRIX        */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('historique_prix')}</Text>

      {historique.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyNote}>
            Aucun achat enregistré pour ce produit.
          </Text>
        </View>
      ) : (
        historique.map((achat) => (
          <View key={achat.id} style={styles.historyItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyStore}>🏬 {achat.magasin_nom}</Text>
              <Text style={styles.historyDate}>
                Date : {achat.date_achat} • Qté : {achat.quantite}
              </Text>
              {achat.notes ? (
                <Text style={styles.historyNotes}>💬 "{achat.notes}"</Text>
              ) : null}
            </View>

            <View style={styles.historyPriceBox}>
              <Text style={styles.historyUnitPrice}>
                {achat.prix_unitaire.toFixed(3)} TND
              </Text>
              <Text style={styles.historyTotalPrice}>
                Total : {achat.prix_total.toFixed(3)} TND
              </Text>
            </View>
          </View>
        ))
      )}

      {/* ==================================================== */}
      {/* SECTION 4 : ACTIONS SUR LE PRODUIT                   */}
      {/* ==================================================== */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.addPurchaseBtn}
          onPress={() =>
            router.push({
              pathname: '/nouvel-achat',
              params: { produitId: String(produit.id) },
            })
          }
          activeOpacity={0.8}
        >
          <Text style={styles.addPurchaseBtnText}>➕ {t('ajouter_achat')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteProductBtn}
          onPress={handleSupprimerProduit}
          activeOpacity={0.8}
        >
          <Text style={styles.deleteProductBtnText}>🗑️ Supprimer le produit</Text>
        </TouchableOpacity>
      </View>

      {/* ==================================================== */}
      {/* BOUTON RETOUR                                        */}
      {/* ==================================================== */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.8}
      >
        <Text style={styles.backText}>{t('retour_liste')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ------------------------------------------------------------
// STYLES GRAPHIQUES
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  idBadge: {
    backgroundColor: '#F1F5F9',
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  productName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
  productMeta: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statBoxBest: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
  },
  statValueBest: {
    fontSize: 17,
    fontWeight: '800',
    color: '#065F46',
  },
  statSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statSubBest: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '600',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  emptyNote: {
    fontSize: 13,
    color: '#94A3B8',
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  historyStore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  historyDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  historyNotes: {
    fontSize: 12,
    color: '#2563EB',
    fontStyle: 'italic',
    marginTop: 2,
  },
  historyPriceBox: {
    alignItems: 'flex-end',
  },
  historyUnitPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyTotalPrice: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  backText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  addPurchaseBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addPurchaseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  deleteProductBtn: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  deleteProductBtnText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
});
