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
  CompteAdmin,
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

// ============================================================
// COMPOSANT PRINCIPAL : AdminUtilisateursScreen
// BUT       : Écran d'administration pour la gestion des utilisateurs de Masrouf.
// MISSION DANS L'APPLICATION :
//             1. Lister tous les comptes enregistrés dans la base SQLite locale.
//             2. Préserver strictement la vie privée des utilisateurs (anonymisation des ID et masquage complet des finances).
//             3. Permettre la recherche par identifiant de compte décorrélé (#1001, #1002...).
//             4. Suspendre ou réactiver un compte utilisateur (blocage immédiat de session).
//             5. Réinitialiser le mot de passe d'un utilisateur bloqué via un mot de passe temporaire aléatoire.
// CE QUI S'AFFICHE SUR L'ÉCRAN :
//             - En-tête avec bouton menu tiroir (☰) et titre "Gestion des utilisateurs".
//             - Carte de recherche blanche avec champ de saisie d'identifiant.
//             - Compteur dynamique : "X comptes   Y actifs".
//             - Liste de cartes de comptes anonymisées (Compte #1003, date d'inscription, pastille de statut vert/rouge).
//             - Bouton primaire : "Gérer le compte #XXXX" (basculer Actif / Suspendu).
//             - Bouton secondaire : "Réinitialiser le mot de passe temporaire".
//             - Note légale de confidentialité en bas d'écran.
// ============================================================
export default function AdminUtilisateursScreen() {
  const { user: adminConnecte } = useAuth(); // Récupère l'admin en cours pour vérifier ses droits
  const { t } = useTranslation();            // Traduction multilingue FR / AR / EN
  const { ouvrirDrawer } = useAdminDrawer(); // Permet d'ouvrir le tiroir latéral admin

  // États locaux
  const [utilisateurs, setUtilisateurs] = useState<CompteAdmin[]>([]);
  const [recherche, setRecherche] = useState<string>('');
  const [compteSelectionne, setCompteSelectionne] = useState<CompteAdmin | null>(null);

  // ============================================================
  // FONCTION : recharger
  // BUT      : Rafraîchir la liste des comptes depuis la base SQLite.
  // MISSION  : Interroge la table 'user' via getAllUsersAdmin() sans jamais extraire les données financières.
  // CE QUI S'AFFICHE SUR L'ÉCRAN :
  //            - Met à jour le nombre de comptes affichés dans le compteur.
  //            - Actualise la liste des cartes d'utilisateurs et leurs statuts.
  // ============================================================
  const recharger = useCallback(() => {
    const list = getAllUsersAdmin(adminConnecte?.id);
    setUtilisateurs(list);
    if (list.length > 0 && !compteSelectionne) {
      setCompteSelectionne(list[0]);
    }
  }, [adminConnecte?.id, compteSelectionne]);

  // useFocusEffect : recharge automatiquement la liste dès que l'écran devient actif
  useFocusEffect(recharger);

  // Filtrage en mémoire selon le terme saisi dans la barre de recherche
  const utilisateursFiltres = utilisateurs.filter((u) => {
    const terme = recherche.toLowerCase().trim();
    const compteIdStr = String(u.id + 1000); // ID décorrélé (+1000) pour l'anonymisation
    return (
      !terme ||
      compteIdStr.includes(terme) ||
      u.email.toLowerCase().includes(terme) ||
      u.nom.toLowerCase().includes(terme)
    );
  });

  // Nombre de comptes actuellement actifs
  const nbActifs = utilisateurs.filter((u) => u.is_active === 1).length;

  // ============================================================
  // FONCTION : handleBasculerStatut
  // BUT      : Inverser le statut d'un compte (Actif <-> Suspendu).
  // MISSION  : 1. Empêcher l'administrateur de suspendre son propre compte (auto-verrouillage).
  //            2. Empêcher de suspendre le dernier administrateur actif du système.
  //            3. Mettre à jour la colonne is_active dans SQLite.
  //            4. Déconnecter automatiquement l'utilisateur à sa prochaine action via refreshUser().
  // PARAMÈTRE: u (CompteAdmin) : l'utilisateur cible à modifier.
  // CE QUI S'AFFICHE SUR L'ÉCRAN :
  //            - Boîte de dialogue Alert.alert confirmant le changement de statut.
  //            - La pastille du compte bascule immédiatement de "Actif" (vert) à "Suspendu" (rouge) ou inversement.
  // ============================================================
  function handleBasculerStatut(u: CompteAdmin) {
    if (!adminConnecte) return;

    // Règle de sécurité : un admin ne peut pas se suspendre lui-même
    if (u.id === adminConnecte.id) {
      Alert.alert('Action refusée', t('impossible_action_soi_meme') ?? 'Action impossible sur votre propre compte.');
      return;
    }

    // Règle de sécurité : il doit toujours rester au moins 1 administrateur actif
    if (u.role === 'admin' && u.is_active === 1) {
      const nbAdminsActifs = countActiveAdmins();
      if (nbAdminsActifs <= 1) {
        Alert.alert('Action refusée', t('au_moins_un_admin') ?? 'Il doit rester au moins un administrateur actif.');
        return;
      }
    }

    const nouveauStatut = u.is_active === 1 ? false : true;
    updateUserActiveStatus(u.id, nouveauStatut, adminConnecte.id);
    recharger(); // Réactualise la liste affichée

    Alert.alert(
      'Statut mis à jour',
      `Le compte #${u.id + 1000} est désormais ${nouveauStatut ? 'Actif' : 'Suspendu'}.`
    );
  }

  // ============================================================
  // FONCTION : handleReinitialiserMdp
  // BUT      : Réinitialiser le mot de passe d'un utilisateur en générant un mot de passe temporaire.
  // MISSION  : 1. Générer une chaîne aléatoire cryptographique de 8 caractères (generateTemporaryPassword).
  //            2. Hacher le mot de passe avec PBKDF2 (createPasswordHash).
  //            3. Enregistrer dans SQLite avec must_change_password = 1.
  //            4. Afficher le mot de passe à l'administrateur pour communication à l'intéressé.
  // PARAMÈTRE: u (CompteAdmin) : l'utilisateur dont le mot de passe doit être régénéré.
  // CE QUI S'AFFICHE SUR L'ÉCRAN :
  //            - Boîte modale Alert.alert affichant la clé temporaire en clair (ex: 🔑 K8m#P2w9).
  //            - Indique qu'un changement immédiat sera exigé à la prochaine connexion.
  // ============================================================
  async function handleReinitialiserMdp(u: CompteAdmin) {
    const mdpTemporaire = generateTemporaryPassword(8); // Génère 8 caractères aléatoires
    const hash = await createPasswordHash(mdpTemporaire); // Hash sécurisé PBKDF2

    resetUserPassword(u.id, hash, adminConnecte?.id); // Enregistre dans SQLite
    recharger(); // Réactualise la vue

    Alert.alert(
      t('mdp_temporaire_titre') ?? 'Mot de passe temporaire généré',
      `${t('mdp_temporaire_msg') ?? 'Communiquez ce mot de passe à l\'utilisateur :'}\n\n🔑 ${mdpTemporaire}\n\n(Changement obligatoire dès la prochaine connexion).`
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader
        titre={t('gestion_utilisateurs')}
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Label uppercase */}
        <Text style={styles.sectionLabel}>{t('administrateur').toUpperCase()}</Text>

        {/* Carte de recherche (Figma 36) */}
        <View style={styles.searchCard}>
          <Text style={styles.searchLabel}>{t('trouver_compte')}</Text>
          <TextInput
            style={styles.searchInput}
            placeholder={t('rechercher_compte_placeholder')}
            placeholderTextColor={Theme.colors.muted}
            value={recherche}
            onChangeText={setRecherche}
          />
        </View>

        {/* Ligne compteur */}
        <View style={styles.countRow}>
          <Text style={styles.countText}>
            {t('comptes_nb', { count: utilisateurs.length })}
          </Text>
          <Text style={styles.countActifs}>
            {t('actifs_nb', { count: nbActifs })}
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
                {estActif ? t('actif') : t('suspendu')}
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
                  ? t('suspendre_compte_id', { id: compteSelectionne.id + 1000 })
                  : t('activer_compte_id', { id: compteSelectionne.id + 1000 })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => handleReinitialiserMdp(compteSelectionne)}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryBtnText}>
                {t('reinitialiser_mdp_temp')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Note de confidentialité (Figma 36) */}
        <Text style={styles.footerNote}>
          {t('admin_note_confidentialite')}
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
    paddingBottom: 90,
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
