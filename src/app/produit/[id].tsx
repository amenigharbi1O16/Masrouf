// ============================================================
// FICHIER : src/app/produit/[id].tsx
// RÔLE    : Écran de détails d'un produit — Design Figma 13 & 14.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 13 · FR · Product details) :
//   • Header : ‹ retour + Nom du produit (ex: Huile d'olive) + icône profil
//   • Label "DÉTAILS DU PRODUIT" (uppercase, muted)
//   • Hero Card Mint (#D9F0E4) :
//       - Nom uppercase en petit : HUILE D'OLIVE
//       - Marque en grand format gras : Châal
//       - Sous-titre : Alimentation · 1 L
//   • Lignes de données clés :
//       - Dernier prix unitaire : 14.500 DT / L
//       - Dernier achat : 12 nov. 2026
//       - Magasin : Monoprix
//   • Bannière mint de comparaison :
//       - "Moins cher que le dernier achat" (ou Plus cher)
//       - Delta formaté : -0.500 DT / -3.3%
//   • Carte graphique "Évolution du prix" avec les points dans le temps
//   • Bouton secondary mint : "Voir l'historique des achats" (Figma 14)
//   • Bouton primary forest : "+ Ajouter un achat"
//   • Bouton secondary mint : "Supprimer le produit"
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getProduitById,
  getAchatsByProduit,
  getMagasinMoinsCher,
  deleteProduit,
  Produit,
  Achat,
} from '../../db/queries';

// Design System & Contexte
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import AppHeader from '../../components/AppHeader';
import ProductThumb from '../../components/ProductThumb';
import { supprimerFichierPhoto } from '../../utils/photos';

export default function FicheProduitScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [produit, setProduit] = useState<Produit | null>(null);
  const [historique, setHistorique] = useState<Achat[]>([]);
  const [modalHistoriqueVisible, setModalHistoriqueVisible] = useState<boolean>(false);
  const [moinsCher, setMoinsCher] = useState<{
    magasin: string;
    prix_unitaire: number;
    date_achat: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (id && user) {
        const pId = Number(id);
        const p = getProduitById(pId);
        setProduit(p);
        const achats = getAchatsByProduit(pId, user.id);
        setHistorique(achats);
        setMoinsCher(getMagasinMoinsCher(pId, user.id));
      }
    }, [id, user?.id])
  );

  if (!produit) {
    return (
      <View style={styles.container}>
        <AppHeader titre="Produit" onMenuPress={() => router.back()} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Produit introuvable.</Text>
        </View>
      </View>
    );
  }

  // Dernier achat
  const dernierAchat = historique.length > 0 ? historique[0] : null;
  // Achat précédent pour la comparaison de prix
  const avantDernierAchat = historique.length > 1 ? historique[1] : null;

  // Calcul du delta de prix
  let deltaPrix = 0;
  let deltaPct = 0;
  let estMoinsCher = true;

  if (dernierAchat && avantDernierAchat) {
    deltaPrix = dernierAchat.prix_unitaire - avantDernierAchat.prix_unitaire;
    estMoinsCher = deltaPrix <= 0;
    deltaPct = avantDernierAchat.prix_unitaire > 0
      ? (Math.abs(deltaPrix) / avantDernierAchat.prix_unitaire) * 100
      : 0;
  }

  // Points pour le graphique (jusqu'à 4 points)
  const chartPoints = historique
    .slice(0, 4)
    .reverse()
    .map((a) => {
      const parts = a.date_achat.split('-');
      const label = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : a.date_achat;
      return { label, prix: a.prix_unitaire };
    });

  // Suppression
  function handleSupprimer() {
    if (!produit) return;
    Alert.alert(
      'Supprimer ce produit',
      `Que souhaitez-vous faire des ${historique.length} achat(s) existants ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Garder l\'historique',
          onPress: () => {
            supprimerFichierPhoto(produit.photo_uri);
            deleteProduit(produit.id, 'reassign');
            router.back();
          },
        },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: () => {
            supprimerFichierPhoto(produit.photo_uri);
            deleteProduit(produit.id, 'cascade');
            router.back();
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      {/* Header avec bouton retour */}
      <AppHeader
        titre={produit.nom}
        onMenuPress={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Label de section */}
        <Text style={styles.sectionLabel}>DÉTAILS DU PRODUIT</Text>

        {/* HERO CARD MINT (Figma 13) */}
        <View style={styles.heroMintCard}>
          <ProductThumb
            photoPath={produit.photo_uri}
            icone={produit.categorie_icone || '☐'}
            taille={72}
            style={{ marginBottom: 12 }}
          />
          <Text style={styles.heroLabel}>{produit.nom.toUpperCase()}</Text>
          <Text style={styles.heroBrand}>{produit.marque || 'Sans marque'}</Text>
          <Text style={styles.heroSub}>
            {produit.categorie_nom} · {produit.unite}
          </Text>
        </View>

        {/* Lignes de données clés */}
        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Dernier prix unitaire</Text>
          <Text style={styles.dataValue}>
            {dernierAchat
              ? `${dernierAchat.prix_unitaire.toFixed(3)} DT / ${produit.unite}`
              : 'Aucun achat'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Dernier achat</Text>
          <Text style={styles.dataValue}>
            {dernierAchat ? dernierAchat.date_achat : '—'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Magasin (dernier achat)</Text>
          <Text style={styles.dataValue}>
            {dernierAchat ? dernierAchat.magasin_nom : '—'}
          </Text>
        </View>

        <View style={styles.dataRow}>
          <Text style={styles.dataLabel}>Magasin le moins cher</Text>
          <Text style={styles.dataValue}>
            {moinsCher
              ? `${moinsCher.magasin} · ${moinsCher.prix_unitaire.toFixed(3)} DT`
              : '—'}
          </Text>
        </View>

        {/* BANNIÈRE DE COMPARAISON DE PRIX (Figma 13) */}
        {dernierAchat && avantDernierAchat ? (
          <View style={styles.comparisonBanner}>
            <Text style={styles.comparisonLabel}>
              {estMoinsCher
                ? 'Moins cher que le dernier achat'
                : 'Plus cher que le dernier achat'}
            </Text>
            <View style={styles.comparisonValueRow}>
              <Text style={styles.comparisonIcon}>{estMoinsCher ? '📉' : '📈'}</Text>
              <Text style={styles.comparisonValue}>
                {estMoinsCher ? '-' : '+'}{Math.abs(deltaPrix).toFixed(3)} DT / {estMoinsCher ? '-' : '+'}{deltaPct.toFixed(1)}%
              </Text>
            </View>
          </View>
        ) : null}

        {/* CARTE GRAPHIQUE ÉVOLUTION DU PRIX */}
        {chartPoints.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Évolution du prix</Text>
            <Text style={styles.chartSub}>DT / {produit.unite}</Text>

            <View style={styles.chartTrack}>
              {chartPoints.map((pt, idx) => (
                <View key={idx} style={styles.chartColumn}>
                  <Text style={styles.chartVal}>{pt.prix.toFixed(2)}</Text>
                  <View style={styles.chartDot} />
                  <Text style={styles.chartDate}>{pt.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* BOUTON HISTORIQUE DES ACHATS (Figma 14) */}
        {historique.length > 0 && (
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setModalHistoriqueVisible(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryBtnText}>
              {t('historique_prix')} ({historique.length})
            </Text>
          </TouchableOpacity>
        )}

        {/* BOUTON PRIMARY : + AJOUTER UN ACHAT */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push(`/nouvel-achat?produitId=${produit.id}`)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>{t('ajouter_achat')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.push(`/modifier-produit?id=${produit.id}` as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>{t('modifier_produit')}</Text>
        </TouchableOpacity>

        {/* BOUTON SECONDARY : SUPPRIMER LE PRODUIT */}
        <TouchableOpacity
          style={[styles.secondaryBtn, styles.deleteBtn]}
          onPress={handleSupprimer}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>{t('supprimer_produit')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODALE HISTORIQUE DÉTAILLÉ DES ACHATS (Figma 14) */}
      <Modal
        visible={modalHistoriqueVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalHistoriqueVisible(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Historique des achats</Text>
            <TouchableOpacity onPress={() => setModalHistoriqueVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            {historique.map((a) => (
              <TouchableOpacity
                key={a.id}
                style={styles.historyCard}
                onPress={() => {
                  setModalHistoriqueVisible(false);
                  router.push({ pathname: '/modifier-achat' as any, params: { id: a.id } });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.historyTop}>
                  <Text style={styles.historyStore}>{a.magasin_nom}</Text>
                  <Text style={styles.historyTotal}>{a.prix_total.toFixed(3)} DT</Text>
                </View>
                <View style={styles.historyBottom}>
                  <Text style={styles.historyDate}>{a.date_achat}</Text>
                  <Text style={styles.historyUnit}>
                    {a.quantite} × {a.prix_unitaire.toFixed(3)} DT
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 13 & 14
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 90,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    color: Theme.colors.muted,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // HERO CARD MINT (#D9F0E4)
  heroMintCard: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.xl,
    padding: 24,
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.deepGreen,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroBrand: {
    fontSize: 28,
    fontWeight: '800',
    color: Theme.colors.forest,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 14,
    color: Theme.colors.deepGreen,
  },

  // Lignes de données
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  dataLabel: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // Bannière de comparaison (Figma 13)
  comparisonBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.lg,
    padding: 18,
    marginTop: 20,
    marginBottom: 16,
  },
  comparisonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.deepGreen,
    marginBottom: 6,
  },
  comparisonValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  comparisonIcon: {
    fontSize: 18,
  },
  comparisonValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Theme.colors.forest,
  },

  // Carte graphique
  chartCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginTop: 8,
    marginBottom: 20,
    ...Theme.shadows.card,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.ink,
    marginBottom: 2,
  },
  chartSub: {
    fontSize: 12,
    color: Theme.colors.muted,
    marginBottom: 16,
  },
  chartTrack: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 90,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    paddingBottom: 8,
  },
  chartColumn: {
    alignItems: 'center',
    gap: 6,
  },
  chartVal: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.deepGreen,
  },
  chartDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.colors.forest,
  },
  chartDate: {
    fontSize: 11,
    color: Theme.colors.muted,
  },

  // Boutons
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    ...Theme.shadows.button,
  },
  primaryBtnText: {
    color: Theme.colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: Theme.colors.deepGreen,
    fontSize: 15,
    fontWeight: '700',
  },
  deleteBtn: {
    backgroundColor: 'rgba(220, 119, 112, 0.15)',
    marginBottom: 20,
  },

  // Modale historique
  modalRoot: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
  },
  modalClose: {
    fontSize: 20,
    color: Theme.colors.muted,
    padding: 4,
  },
  modalScroll: {
    paddingVertical: 16,
    gap: 10,
  },
  historyCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyStore: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.ink,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: Theme.colors.forest,
  },
  historyBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyDate: {
    fontSize: 13,
    color: Theme.colors.muted,
  },
  historyUnit: {
    fontSize: 13,
    color: Theme.colors.muted,
  },
});
