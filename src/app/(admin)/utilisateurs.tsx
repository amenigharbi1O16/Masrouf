// ============================================================
// FICHIER : src/app/(admin)/utilisateurs.tsx
// RÔLE    : Gestion des utilisateurs par l'Administrateur — Design Figma 36, 37 & 38.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN :
//   • Header : ☰ hamburger + "Gestion des utilisateurs" + profil
//   • Label "ADMINISTRATEUR" (muted, uppercase)
//   • Carte de recherche blanche :
//       - Label "Trouver un compte"
//       - Input "Rechercher par identifiant de compte"
//   • Ligne compteur : "X comptes   Y actifs"
//   • Cartes blanches de compte (anonymisées) :
//       - Icône mint
//       - Compte #1042 (ID décorrélé)
//       - "Inscrit · JJ mmm. AAAA"
//       - Statut à droite : "Actif" (vert) ou "Suspendu" (rouge)
//   • Bouton primary forest : "Gérer le compte #XXXX" (basculer Actif / Suspendu)
//   • Bouton secondary mint : "Réinitialiser le mot de passe temporaire"
//   • Note légale de confidentialité en pied de page
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

// Fonctions SQLite
import {
  getAllUsersAdmin,
  updateUserActiveStatus,
  resetUserPassword,
  countActiveAdmins,
  Utilisateur,
} from '../../db/queries';

// Cryptographie & Auth
import {
  createPasswordHash,
  generateTemporaryPassword,
} from '../../utils/security';
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useAdminDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

export default function AdminUtilisateursScreen() {
  const { user: adminConnecte } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useAdminDrawer();

  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [recherche, setRecherche] = useState<string>('');
  const [compteSelectionne, setCompteSelectionne] = useState<Utilisateur | null>(null);

  const recharger = useCallback(() => {
    const list = getAllUsersAdmin(adminConnecte?.id);
    setUtilisateurs(list);
    if (list.length > 0 && !compteSelectionne) {
      setCompteSelectionne(list[0]);
    }
  }, [adminConnecte?.id, compteSelectionne]);

  useFocusEffect(recharger);

  // Filtrage des comptes
  const utilisateursFiltres = utilisateurs.filter((u) => {
    const terme = recherche.toLowerCase().trim();
    const compteIdStr = String(u.id + 1000);
    return (
      !terme ||
      compteIdStr.includes(terme) ||
      u.email.toLowerCase().includes(terme) ||
      u.nom.toLowerCase().includes(terme)
    );
  });

  const nbActifs = utilisateurs.filter((u) => u.is_active === 1).length;

  // Action : Basculer Actif / Suspendu (Figma 37)
  function handleBasculerStatut(u: Utilisateur) {
    if (!adminConnecte) return;

    if (u.id === adminConnecte.id) {
      Alert.alert('Action refusée', t('impossible_action_soi_meme') ?? 'Action impossible sur votre propre compte.');
      return;
    }

    if (u.role === 'admin' && u.is_active === 1) {
      const nbAdminsActifs = countActiveAdmins();
      if (nbAdminsActifs <= 1) {
        Alert.alert('Action refusée', t('au_moins_un_admin') ?? 'Il doit rester au moins un administrateur actif.');
        return;
      }
    }

    const nouveauStatut = u.is_active === 1 ? false : true;
    updateUserActiveStatus(u.id, nouveauStatut, adminConnecte.id);
    recharger();

    Alert.alert(
      'Statut mis à jour',
      `Le compte #${u.id + 1000} est désormais ${nouveauStatut ? 'Actif' : 'Suspendu'}.`
    );
  }

  // Action : Mot de passe temporaire (Figma 38)
  async function handleReinitialiserMdp(u: Utilisateur) {
    const mdpTemporaire = generateTemporaryPassword(8);
    const hash = await createPasswordHash(mdpTemporaire);

    resetUserPassword(u.id, hash, adminConnecte?.id);
    recharger();

    Alert.alert(
      t('mdp_temporaire_titre') ?? 'Mot de passe temporaire généré',
      `${t('mdp_temporaire_msg') ?? 'Communiquez ce mot de passe à l\'utilisateur :'}\n\n🔑 ${mdpTemporaire}\n\n(Changement obligatoire dès la prochaine connexion).`
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader
        titre="Gestion des utilisateurs"
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Label uppercase */}
        <Text style={styles.sectionLabel}>ADMINISTRATEUR</Text>

        {/* Carte de recherche (Figma 36) */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>Trouver un compte</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par identifiant de compte"
            placeholderTextColor={Theme.colors.muted}
            value={recherche}
            onChangeText={setRecherche}
          />
        </View>

        {/* Ligne compteur */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {utilisateurs.length} comptes
          </Text>
          <Text style={styles.countActifs}>
            {nbActifs} actifs
          </Text>
        </View>

        {/* Liste des comptes utilisateurs (Figma 36) */}
        {utilisateursFiltres.map((u) => {
          const estSel = compteSelectionne?.id === u.id;
          const estActif = u.is_active === 1;

          return (
            <TouchableOpacity
              key={u.id}
              style={[
                styles.userCard,
                estSel && styles.userCardSelected,
              ]}
              onPress={() => setCompteSelectionne(u)}
              activeOpacity={0.75}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarIcon}>🛍️</Text>
              </View>

              <View style={styles.userInfo}>
                <Text style={styles.userName}>Compte #{u.id + 1000}</Text>
                <Text style={styles.userDate}>
                  Inscrit · {u.created_at ? u.created_at.substring(0, 10) : 'Récemment'}
                </Text>
              </View>

              <Text
                style={[
                  styles.userStatus,
                  estActif ? styles.statusActive : styles.statusSuspended,
                ]}
              >
                {estActif ? 'Actif' : 'Suspendu'}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Actions sur le compte sélectionné */}
        {compteSelectionne && (
          <View style={styles.actionsBox}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => handleBasculerStatut(compteSelectionne)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>
                {compteSelectionne.is_active === 1
                  ? `Suspendre le compte #${compteSelectionne.id + 1000}`
                  : `Activer le compte #${compteSelectionne.id + 1000}`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => handleReinitialiserMdp(compteSelectionne)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>
                Réinitialiser le mot de passe temporaire
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Note de confidentialité (Figma 36) */}
        <Text style={styles.footerNote}>
          Administration des comptes uniquement. Les données financières personnelles ne sont jamais visibles.
        </Text>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 36, 37 & 38
// ------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },

  // Carte de recherche
  searchCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 16,
    ...Theme.shadows.card,
  },
  searchLabel: {
    fontSize: 11,
    color: Theme.colors.muted,
    marginBottom: 4,
  },
  searchInput: {
    fontSize: 15,
    color: Theme.colors.ink,
    padding: 0,
  },

  // Compteur
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  countText: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  countActifs: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // Carte utilisateur
  userCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    ...Theme.shadows.card,
  },
  userCardSelected: {
    borderColor: Theme.colors.forest,
    borderWidth: 2,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Theme.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  userAvatarIcon: {
    fontSize: 20,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.ink,
    marginBottom: 2,
  },
  userDate: {
    fontSize: 13,
    color: Theme.colors.muted,
  },
  userStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusActive: {
    color: Theme.colors.ink,
  },
  statusSuspended: {
    color: Theme.colors.coral,
  },

  // Actions
  actionsBox: {
    marginTop: 16,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: Theme.colors.forest,
    borderRadius: Theme.radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  secondaryBtnText: {
    color: Theme.colors.deepGreen,
    fontSize: 15,
    fontWeight: '700',
  },

  footerNote: {
    fontSize: 12,
    color: Theme.colors.muted,
    lineHeight: 18,
    marginTop: 20,
    textAlign: 'center',
  },
});
