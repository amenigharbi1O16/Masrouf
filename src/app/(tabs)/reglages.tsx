// ============================================================
// FICHIER : src/app/(tabs)/reglages.tsx
// RÔLE    : Écran des réglages et préférences de l'utilisateur.
//
// VISUEL SUR L'ÉCRAN :
//   1. Section "Budget Mensuel" :
//      - Champ de saisie numérique interactif pour définir le plafond en TND.
//      - Bouton bleu "Enregistrer le budget" qui sauvegarde en base SQLite.
//      - Message de confirmation vert temporaire lors de l'enregistrement.
//   2. Section "Langue / اللغة" :
//      - Deux boutons interactifs : "🇫🇷 Français" et "🇸🇦 عربي".
//      - Met en valeur la langue active et change instantanément
//        tous les textes de l'application (Démonstration du critère
//        "Ressources avec qualificateurs" demandé par le professeur).
//   3. Section "Mon Compte" :
//      - Nom, email et rôle (Utilisateur ou Administrateur).
//      - Bouton rouge "Se déconnecter" qui réinitialise la session
//        et renvoie vers l'écran de connexion.
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';

// Fonctions SQLite de mise à jour
import { updateBudget, updateLangue } from '../../db/queries';

// Contexte et internationalisation
import { useAuth } from '../../utils/auth';
import { useTranslation, Langue } from '../../utils/i18n';

export default function ReglagesScreen() {
  const { user, updateUser, logout } = useAuth();
  const { t, langue } = useTranslation();

  // ÉTAT LOCAL pour la valeur du champ Budget
  const [budgetTexte, setBudgetTexte] = useState<string>('');

  // Message de confirmation vert temporaire
  const [messageSucces, setMessageSucces] = useState<string>('');

  // Synchronise le champ avec la valeur du budget de l'utilisateur au chargement
  useEffect(() => {
    if (user?.budget_mensuel !== undefined) {
      setBudgetTexte(String(user.budget_mensuel));
    }
  }, [user?.budget_mensuel]);

  // ----------------------------------------------------------
  // FONCTION : handleSauvegarderBudget
  // RÔLE : Met à jour le budget en base SQLite et dans le Contexte
  // ----------------------------------------------------------
  function handleSauvegarderBudget() {
    if (!user) return;

    // Convertit le texte saisi en nombre flottant
    const montant = parseFloat(budgetTexte);

    if (isNaN(montant) || montant < 0) {
      Alert.alert('Erreur', 'Veuillez saisir un montant valide supérieur ou égal à 0.');
      return;
    }

    // 1. Mise à jour persistante dans la base SQLite locale
    updateBudget(user.id, montant);

    // 2. Mise à jour du state global dans le Contexte React
    updateUser({ budget_mensuel: montant });

    // 3. Affiche le message de confirmation
    setMessageSucces('Budget mis à jour avec succès !');
    setTimeout(() => setMessageSucces(''), 3000); // Disparaît après 3 secondes
  }

  // ----------------------------------------------------------
  // FONCTION : handleChangerLangue
  // RÔLE : Bascule l'application entre Français et Arabe
  // ----------------------------------------------------------
  function handleChangerLangue(nouvelleLangue: Langue) {
    if (!user) return;

    // 1. Sauvegarde dans SQLite
    updateLangue(user.id, nouvelleLangue);

    // 2. Met à jour le contexte global (provoque le re-render des textes)
    updateUser({ langue: nouvelleLangue });
  }

  // ----------------------------------------------------------
  // FONCTION : handleDeconnexion
  // RÔLE : Déconnecte l'utilisateur et retourne au Login
  // ----------------------------------------------------------
  function handleDeconnexion() {
    logout();
    router.replace('/login' as any);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* ==================================================== */}
      {/* SECTION 1 : CONFIGURATION DU BUDGET MENSUEL          */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('budget_mensuel')}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>{t('fixer_budget')}</Text>

        <TextInput
          style={styles.input}
          placeholder="Ex: 800"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric" // Affiche le clavier numérique sur mobile
          value={budgetTexte}
          onChangeText={(texte) => setBudgetTexte(texte)}
        />

        <Text style={styles.hint}>
          Une alerte s'affichera à 80 % et au dépassement du seuil.
        </Text>

        {/* Bouton d'enregistrement */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSauvegarderBudget}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>{t('enregistrer_budget')}</Text>
        </TouchableOpacity>

        {/* Message de succès vert */}
        {messageSucces ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ {messageSucces}</Text>
          </View>
        ) : null}
      </View>

      {/* ==================================================== */}
      {/* SECTION 2 : QUALIFICATEURS DE RESSOURCE - LANGUE     */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('langue')} / اللغة</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Sélectionnez la langue de l'interface :</Text>

        <View style={styles.languageRow}>
          {/* Bouton Français */}
          <TouchableOpacity
            style={[
              styles.langBtn,
              langue === 'fr' ? styles.langBtnActive : styles.langBtnInactive,
            ]}
            onPress={() => handleChangerLangue('fr')}
          >
            <Text
              style={[
                styles.langBtnText,
                langue === 'fr' && styles.langBtnTextActive,
              ]}
            >
              🇫🇷 Français
            </Text>
          </TouchableOpacity>

          {/* Bouton Arabe */}
          <TouchableOpacity
            style={[
              styles.langBtn,
              langue === 'ar' ? styles.langBtnActive : styles.langBtnInactive,
            ]}
            onPress={() => handleChangerLangue('ar')}
          >
            <Text
              style={[
                styles.langBtnText,
                langue === 'ar' && styles.langBtnTextActive,
              ]}
            >
              🇸🇦 عربي
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ==================================================== */}
      {/* SECTION 3 : DOCUMENTATION & RESSOURCES EXTERNES (PDF) */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('documentation')}</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Guide d'utilisation officiel de l'application :</Text>
        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => {
            Alert.alert(
              '📖 Manuel d\'utilisation (PDF)',
              'Le manuel complet avec architecture, cas d\'utilisation et schéma de base de données est disponible dans le fichier RAPPORT_PROJET.html.\n\nVous pouvez l\'imprimer en PDF à tout moment avec Ctrl + P !'
            );
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.manualButtonText}>📄 Ouvrir le {t('manuel_utilisation')}</Text>
        </TouchableOpacity>
      </View>

      {/* ==================================================== */}
      {/* SECTION 4 : INFORMATIONS DU COMPTE & DÉCONNEXION     */}
      {/* ==================================================== */}
      <Text style={styles.sectionTitle}>{t('compte')}</Text>
      <View style={styles.card}>
        <View style={styles.profileRow}>
          <Text style={styles.profileAvatar}>
            {user?.role === 'admin' ? '👑' : '👤'}
          </Text>
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user?.nom}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Text style={styles.profileRole}>
              Rôle : {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
            </Text>
          </View>
        </View>

        {/* Bouton de déconnexion */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleDeconnexion}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutButtonText}>🚪 {t('se_deconnecter')}</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 10,
    marginTop: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  hint: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  saveButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
  },
  successText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 13,
  },
  languageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  langBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  langBtnInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  langBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  langBtnTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  manualButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 14,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileAvatar: {
    fontSize: 36,
    marginRight: 14,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 1,
  },
  profileRole: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
});
