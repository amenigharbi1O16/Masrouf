// ============================================================
// FICHIER : src/app/(admin)/utilisateurs.tsx
// RÔLE    : Gestion des utilisateurs par l'Administrateur.
//           Actions permises :
//           1. Activer / Suspendre un compte.
//           2. Réinitialiser le mot de passe (génère un code temporaire unique).
//           3. Supprimer un compte et toutes ses données (avec confirmation).
//
// RÈGLES DE SÉCURITÉ :
//   - L'admin ne peut pas se supprimer ni se désactiver lui-même.
//   - Il doit toujours rester au moins un administrateur actif.
//   - Aucune dépense personnelle ou achat individuel n'est affiché.
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
import { useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getAllUsersAdmin,
  updateUserActiveStatus,
  resetUserPassword,
  deleteUserAndData,
  countActiveAdmins,
  Utilisateur,
} from '../../db/queries';

// Cryptographie & Auth
import {
  createPasswordHash,
  generateTemporaryPassword,
} from '../../utils/security';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';

export default function AdminUtilisateursScreen() {
  const { user: adminConnecte } = useAuth();
  const { t } = useTranslation();

  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);

  const recharger = useCallback(() => {
    const list = getAllUsersAdmin();
    setUtilisateurs(list);
  }, []);

  useFocusEffect(recharger);

  // ----------------------------------------------------------
  // ACTION 1 : ACTIVER / SUSPENDRE
  // ----------------------------------------------------------
  function handleBasculerStatut(u: Utilisateur) {
    if (!adminConnecte) return;

    if (u.id === adminConnecte.id) {
      Alert.alert('Action refusée', t('impossible_action_soi_meme'));
      return;
    }

    if (u.role === 'admin' && u.is_active === 1) {
      const nbAdminsActifs = countActiveAdmins();
      if (nbAdminsActifs <= 1) {
        Alert.alert('Action refusée', t('au_moins_un_admin'));
        return;
      }
    }

    const nouveauStatut = u.is_active === 1 ? false : true;
    updateUserActiveStatus(u.id, nouveauStatut);
    recharger();

    Alert.alert(
      'Statut mis à jour',
      `Le compte ${u.email} est désormais ${nouveauStatut ? 'Actif' : 'Suspendu'}.`
    );
  }

  // ----------------------------------------------------------
  // ACTION 2 : REINITIALISER LE MOT DE PASSE
  // ----------------------------------------------------------
  async function handleReinitialiserMdp(u: Utilisateur) {
    const mdpTemporaire = generateTemporaryPassword(8);
    const hash = await createPasswordHash(mdpTemporaire);

    resetUserPassword(u.id, hash);
    recharger();

    Alert.alert(
      t('mdp_temporaire_titre'),
      `${t('mdp_temporaire_msg')}\n\n🔑 ${mdpTemporaire}\n\n(L'utilisateur sera forcé de le remplacer dès sa prochaine connexion).`
    );
  }

  // ----------------------------------------------------------
  // ACTION 3 : SUPPRIMER DEFINITIVEMENT LE COMPTE
  // ----------------------------------------------------------
  function handleSupprimer(u: Utilisateur) {
    if (!adminConnecte) return;

    if (u.id === adminConnecte.id) {
      Alert.alert('Action refusée', t('impossible_action_soi_meme'));
      return;
    }

    if (u.role === 'admin') {
      const nbAdminsActifs = countActiveAdmins();
      if (nbAdminsActifs <= 1) {
        Alert.alert('Action refusée', t('au_moins_un_admin'));
        return;
      }
    }

    Alert.alert(
      t('supprimer_compte'),
      `${t('confirmer_suppression')}\n\nUtilisateur : ${u.nom} (${u.email})\nToutes ses données (achats, budgets, points) seront définitivement effacées.`,
      [
        { text: t('fermer'), style: 'cancel' },
        {
          text: t('supprimer_compte'),
          style: 'destructive',
          onPress: () => {
            deleteUserAndData(u.id);
            recharger();
            Alert.alert('Compte supprimé', `Le compte ${u.email} a été supprimé.`);
          },
        },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>{t('utilisateurs_admin')} ({utilisateurs.length})</Text>

      {utilisateurs.map((u) => {
        const estMoi = u.id === adminConnecte?.id;
        const estActif = u.is_active === 1;

        return (
          <View key={u.id} style={styles.userCard}>
            {/* EN-TETE CARTE */}
            <View style={styles.userCardHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{u.nom}</Text>
                  {estMoi ? <Text style={styles.meBadge}>(Vous)</Text> : null}
                </View>
                <Text style={styles.userEmail}>{u.email}</Text>
                <Text style={styles.userDate}>Créé le : {u.created_at?.split(' ')[0]}</Text>
              </View>

              {/* BADGES ROLE ET STATUT */}
              <View style={styles.badgeColumn}>
                <View
                  style={[
                    styles.roleBadge,
                    u.role === 'admin' ? styles.roleAdmin : styles.roleUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.roleBadgeText,
                      u.role === 'admin' ? styles.roleAdminText : styles.roleUserText,
                    ]}
                  >
                    {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    estActif ? styles.statusActive : styles.statusSuspended,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      estActif ? styles.statusActiveText : styles.statusSuspendedText,
                    ]}
                  >
                    {estActif ? '🟢 Actif' : '🔴 Suspendu'}
                  </Text>
                </View>
              </View>
            </View>

            {/* BOUTONS D'ACTION */}
            {!estMoi ? (
              <View style={styles.actionsRow}>
                {/* 1. Activer / Suspendre */}
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    estActif ? styles.actionBtnSuspend : styles.actionBtnActivate,
                  ]}
                  onPress={() => handleBasculerStatut(u)}
                >
                  <Text
                    style={[
                      styles.actionBtnText,
                      estActif ? styles.textSuspend : styles.textActivate,
                    ]}
                  >
                    {estActif ? 'Suspendre' : 'Activer'}
                  </Text>
                </TouchableOpacity>

                {/* 2. Reset mot de passe */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnReset]}
                  onPress={() => handleReinitialiserMdp(u)}
                >
                  <Text style={styles.textReset}>Reset MDP</Text>
                </TouchableOpacity>

                {/* 3. Supprimer */}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDelete]}
                  onPress={() => handleSupprimer(u)}
                >
                  <Text style={styles.textDelete}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF5FF',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#581C87',
    marginBottom: 14,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  meBadge: {
    fontSize: 11,
    color: '#7E22CE',
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  userDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  roleAdmin: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#D8B4FE',
  },
  roleAdminText: {
    color: '#7E22CE',
    fontSize: 11,
    fontWeight: '700',
  },
  roleUser: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleUserText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusActive: {
    backgroundColor: '#ECFDF5',
  },
  statusActiveText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '700',
  },
  statusSuspended: {
    backgroundColor: '#FEF2F2',
  },
  statusSuspendedText: {
    color: '#991B1B',
    fontSize: 10,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnSuspend: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionBtnActivate: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  actionBtnReset: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  actionBtnDelete: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FFE4E6',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textSuspend: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  textActivate: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  textReset: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  textDelete: {
    color: '#BE123C',
    fontSize: 11,
    fontWeight: '700',
  },
});
