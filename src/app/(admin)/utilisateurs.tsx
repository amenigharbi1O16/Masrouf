// ============================================================
// FICHIER : src/app/(admin)/utilisateurs.tsx
// RÔLE    : Écran d'administration de la plateforme Masrouf.
//           Réservé exclusivement au compte Administrateur.
//
// VISUEL SUR L'ÉCRAN :
//   1. En-tête : Carte de synthèse système avec :
//      - Nombre total de comptes inscrits.
//      - Nombre total d'articles au catalogue.
//      - Volume financier total des transactions enregistrées.
//   2. Liste des utilisateurs de la communauté :
//      - Nom complet, email et rôle (Admin ou Utilisateur).
//      - Date d'inscription et statut du compte (🟢 Actif ou 🔴 Suspendu).
//      - Bouton de modération pour activer ou suspendre l'accès au compte.
//   3. Bouton pour retourner à l'application.
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
import { router, useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getAllUtilisateurs,
  getAllProduits,
  getTotalMois,
  Utilisateur,
} from '../../db/queries';

export default function AdminUtilisateursScreen() {
  // Liste des utilisateurs chargés depuis SQLite
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);

  // Nombre de produits au catalogue
  const [nbProduits, setNbProduits] = useState<number>(0);

  // Dépenses calculées par ID utilisateur : { [userId]: totalTND }
  const [depensesMap, setDepensesMap] = useState<Record<number, number>>({});

  // Statuts des comptes gérés par l'administrateur (Actif ou Suspendu)
  const [statutsComptes, setStatutsComptes] = useState<Record<number, 'Actif' | 'Suspendu'>>({});

  // Mois en cours (ex: "2026-11")
  const maintenant = new Date();
  const moisCourant = `${maintenant.getFullYear()}-${String(
    maintenant.getMonth() + 1
  ).padStart(2, '0')}`;

  // ----------------------------------------------------------
  // CHARGEMENT DES STATISTIQUES GLOBALES DU SYSTÈME
  // ----------------------------------------------------------
  const rechargerDonnees = useCallback(() => {
    // 1. Récupère tous les comptes inscrits
    const users = getAllUtilisateurs();
    setUtilisateurs(users);

    // 2. Récupère les articles du catalogue
    const prods = getAllProduits();
    setNbProduits(prods.length);

    // 3. Calcule les volumes de dépenses
    const map: Record<number, number> = {};
    const statuts: Record<number, 'Actif' | 'Suspendu'> = {};
    for (const u of users) {
      map[u.id] = getTotalMois(u.id, moisCourant);
      statuts[u.id] = 'Actif'; // Par défaut tous les comptes sont actifs
    }
    setDepensesMap(map);
    setStatutsComptes((prev) => ({ ...statuts, ...prev }));
  }, [moisCourant]);

  useFocusEffect(rechargerDonnees);

  // ----------------------------------------------------------
  // ACTION MODÉRATION : BASCULER LE STATUT D'UN COMPTE
  // ----------------------------------------------------------
  function handleBasculerStatut(u: Utilisateur) {
    if (u.role === 'admin') {
      Alert.alert('Action non autorisée', 'Le compte Administrateur principal ne peut pas être suspendu.');
      return;
    }

    const statutActuel = statutsComptes[u.id] ?? 'Actif';
    const nouveauStatut = statutActuel === 'Actif' ? 'Suspendu' : 'Actif';

    setStatutsComptes((prev) => ({
      ...prev,
      [u.id]: nouveauStatut,
    }));

    Alert.alert(
      'Statut mis à jour',
      `Le compte de ${u.nom} est maintenant marqué comme ${nouveauStatut}.`
    );
  }

  // Calcul du volume total cumulé des transactions sur la plateforme
  const volumeTotal = Object.values(depensesMap).reduce((a, b) => a + b, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ==================================================== */}
      {/* CARTE 1 : TABLEAU DE BORD DE LA PLATEFORME           */}
      {/* ==================================================== */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Supervision Globale de la Plateforme</Text>
        
        <View style={styles.summaryStatsRow}>
          {/* Stat 1 : Comptes */}
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatNumber}>{utilisateurs.length}</Text>
            <Text style={styles.summaryStatLabel}>Comptes Inscrits</Text>
          </View>

          {/* Stat 2 : Catalogue */}
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatNumber}>{nbProduits}</Text>
            <Text style={styles.summaryStatLabel}>Articles au Catalogue</Text>
          </View>

          {/* Stat 3 : Volume financier */}
          <View style={styles.summaryStatItem}>
            <Text style={styles.summaryStatNumber}>{volumeTotal.toFixed(1)}</Text>
            <Text style={styles.summaryStatLabel}>TND Traités</Text>
          </View>
        </View>
      </View>

      {/* ==================================================== */}
      {/* SECTION 2 : GESTION DES MEMBRES ET MODÉRATION        */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>Membres de la Communauté</Text>

      {utilisateurs.map((u) => {
        const depense = depensesMap[u.id] ?? 0;
        const statut = statutsComptes[u.id] ?? 'Actif';
        const estActif = statut === 'Actif';

        return (
          <View key={u.id} style={styles.userCard}>
            {/* Ligne 1 : Nom et Badge de rôle */}
            <View style={styles.userHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{u.nom}</Text>
                <Text style={styles.userEmail}>{u.email}</Text>
                <Text style={styles.userJoined}>Inscrit le : {u.created_at.split(' ')[0]}</Text>
              </View>

              <View
                style={[
                  styles.roleBadge,
                  u.role === 'admin' ? styles.roleBadgeAdmin : styles.roleBadgeUser,
                ]}
              >
                <Text
                  style={[
                    styles.roleBadgeText,
                    u.role === 'admin'
                      ? styles.roleBadgeAdminText
                      : styles.roleBadgeUserText,
                  ]}
                >
                  {u.role === 'admin' ? '👑 Admin' : '👤 Utilisateur'}
                </Text>
              </View>
            </View>

            {/* Ligne 2 : Statut du compte & Activité */}
            <View style={styles.accountInfoRow}>
              <View>
                <Text style={styles.statsLabel}>Statut du compte</Text>
                <Text style={[styles.statusText, estActif ? styles.statusActive : styles.statusSuspended]}>
                  {estActif ? '🟢 Compte Actif' : '🔴 Compte Suspendu'}
                </Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.statsLabel}>Achats ce mois ({moisCourant})</Text>
                <Text style={styles.statsValue}>{depense.toFixed(3)} TND</Text>
              </View>
            </View>

            {/* Ligne 3 : Action de modération de l'Administrateur */}
            {u.role !== 'admin' ? (
              <TouchableOpacity
                style={[
                  styles.moderationBtn,
                  estActif ? styles.moderationBtnSuspend : styles.moderationBtnActivate,
                ]}
                onPress={() => handleBasculerStatut(u)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.moderationBtnText,
                    estActif ? styles.moderationTextSuspend : styles.moderationTextActivate,
                  ]}
                >
                  {estActif ? '🔒 Suspendre l\'accès' : '🔓 Réactiver le compte'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        );
      })}

      {/* BOUTON RETOUR VERS L'ACCUEIL */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.replace('/(tabs)' as any)}
        activeOpacity={0.8}
      >
        <Text style={styles.backButtonText}>‹ Revenir à l'application</Text>
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
    backgroundColor: '#FAF5FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#7E22CE',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#7E22CE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryTitle: {
    color: '#F3E8FF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 14,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryStatNumber: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  summaryStatLabel: {
    color: '#E9D5FF',
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#581C87',
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  userJoined: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleBadgeAdmin: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  roleBadgeAdminText: {
    color: '#7E22CE',
  },
  roleBadgeUser: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeUserText: {
    color: '#1D4ED8',
  },
  accountInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  statsLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  statusActive: {
    color: '#059669',
  },
  statusSuspended: {
    color: '#DC2626',
  },
  statsValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  moderationBtn: {
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  moderationBtnSuspend: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  moderationBtnActivate: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  moderationBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  moderationTextSuspend: {
    color: '#DC2626',
  },
  moderationTextActivate: {
    color: '#059669',
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#7E22CE',
    fontWeight: '700',
    fontSize: 14,
  },
});
