// ============================================================
// FICHIER : src/app/login.tsx
// RÔLE    : Écran de connexion (Login) de l'application Masrouf.
//           Permet à un utilisateur ou à un administrateur de
//           saisir ses identifiants et d'accéder à l'application.
//
// VISUEL SUR L'ÉCRAN :
//   1. En haut : Logo/Icône de l'application avec le titre "Masrouf"
//      et le sous-titre "Suivi de budget familial".
//   2. Au milieu : Formulaire moderne avec champ Email et mot de passe.
//   3. Sous les champs : Message d'erreur rouge si identifiants faux.
//   4. Bouton principal "Se connecter" bleu.
//   5. En bas : Bloc d'aide avec les comptes de test (Admin et User)
//      pour faciliter la démonstration devant le professeur !
//
// CONCEPTS REACT NATIVE & PROGRAMMATION ÉVÉNEMENTIELLE :
//   - useState : variables d'état pour retenir la saisie (email, pass).
//   - onChangeText : événement déclenché à chaque frappe au clavier.
//   - onPress : événement déclenché lors du clic sur le bouton.
//   - useAuth : mise à jour du contexte global après validation SQL.
//   - router.replace : navigation vers l'accueil sans retour possible.
// ============================================================

// Importation des composants fondamentaux de React et React Native
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';

// Importation de l'outil de navigation d'Expo Router
import { router } from 'expo-router';

// Importation de la fonction SQL qui vérifie l'utilisateur en base SQLite
import { getUserByEmailPassword } from '../db/queries';

// Importation du hook d'authentification pour mémoriser la session
import { useAuth } from '../utils/auth';

// Importation du système de traduction multi-langues (Français / Arabe)
import { useTranslation } from '../utils/i18n';

// ------------------------------------------------------------
// COMPOSANT PRINCIPAL : LoginScreen
// ------------------------------------------------------------
export default function LoginScreen() {
  // Récupération de la fonction login du contexte d'authentification
  const { login } = useAuth();

  // Récupération de la fonction de traduction 't' pour afficher les textes
  const { t } = useTranslation();

  // ÉTATS LOCAUX (useState) :
  // email : stocke le texte saisi dans le champ email
  const [email, setEmail] = useState('user@masrouf.tn');

  // motDePasse : stocke le texte saisi dans le champ mot de passe
  const [motDePasse, setMotDePasse] = useState('user123');

  // erreur : stocke le message d'erreur éventuel (vide si pas d'erreur)
  const [erreur, setErreur] = useState('');

  // ----------------------------------------------------------
  // FONCTION : handleConnexion
  // RÔLE : Appelée lors de l'événement onPress du bouton "Se connecter".
  //        Interroge SQLite, valide l'existence du compte,
  //        met à jour le contexte global et navigue vers l'application.
  // ----------------------------------------------------------
  function handleConnexion() {
    // 1. Réinitialisation de l'erreur précédente
    setErreur('');

    // 2. Vérification des champs vides
    if (!email.trim() || !motDePasse.trim()) {
      setErreur('Veuillez remplir tous les champs.');
      return;
    }

    // 3. Interrogation de la base de données locale SQLite
    // Cherche si un utilisateur avec cet email et mot de passe existe
    const utilisateur = getUserByEmailPassword(email.trim(), motDePasse);

    // 4. Si l'utilisateur est trouvé en base
    if (utilisateur) {
      // On sauvegarde l'utilisateur dans le Contexte Global React
      login(utilisateur);

      // Si c'est un administrateur, on le redirige vers l'accueil ou l'espace admin
      // router.replace remplace la pile de navigation (l'utilisateur ne peut pas faire retour vers login)
      router.replace('/(tabs)');
    } else {
      // 5. Si aucun utilisateur ne correspond, on affiche le message d'erreur
      setErreur(t('erreur_connexion'));
    }
  }

  // ----------------------------------------------------------
  // FONCTION : remplirIdentifiantsTest
  // RÔLE : Raccourci pour la soutenance orale : remplit automatiquement
  //        les champs avec le compte Admin ou User en un clic !
  // ----------------------------------------------------------
  function remplirIdentifiantsTest(role: 'admin' | 'user') {
    if (role === 'admin') {
      setEmail('admin@masrouf.tn');
      setMotDePasse('admin123');
    } else {
      setEmail('user@masrouf.tn');
      setMotDePasse('user123');
    }
    setErreur('');
  }

  // ----------------------------------------------------------
  // RENDU VISUEL (JSX)
  // ----------------------------------------------------------
  return (
    // KeyboardAvoidingView évite que le clavier virtuel ne cache les champs sur mobile
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ==================================================== */}
        {/* EN-TÊTE : LOGO ET TITRES                            */}
        {/* ==================================================== */}
        <View style={styles.headerBox}>
          {/* Icône principale emoji de tirelire / portefeuille */}
          <Text style={styles.logoIcon}>💰</Text>
          {/* Titre de l'application */}
          <Text style={styles.appTitle}>Masrouf • مصروف</Text>
          {/* Sous-titre explicatif */}
          <Text style={styles.appSubtitle}>{t('slogan')}</Text>
        </View>

        {/* ==================================================== */}
        {/* FORMULAIRE DE CONNEXION                              */}
        {/* ==================================================== */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('connexion')}</Text>

          {/* CHAMP 1 : EMAIL */}
          <Text style={styles.inputLabel}>{t('email')}</Text>
          <TextInput
            style={styles.input}
            placeholder="exemple@masrouf.tn"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            // Événement déclenché à chaque caractère tapé
            onChangeText={(texte) => setEmail(texte)}
          />

          {/* CHAMP 2 : MOT DE PASSE */}
          <Text style={styles.inputLabel}>{t('mot_de_passe')}</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry={true} // Masque les caractères saisis
            value={motDePasse}
            // Événement déclenché à chaque caractère tapé
            onChangeText={(texte) => setMotDePasse(texte)}
          />

          {/* MESSAGE D'ERREUR (affiché uniquement si erreur n'est pas vide) */}
          {erreur ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {erreur}</Text>
            </View>
          ) : null}

          {/* BOUTON D'ACTION : SE CONNECTER */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleConnexion} // Déclenche la fonction lors du clic
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>{t('connexion')} →</Text>
          </TouchableOpacity>
        </View>

        {/* ==================================================== */}
        {/* ZONE DE DÉMONSTRATION POUR LA SOUTENANCE             */}
        {/* Permet de basculer facilement entre Admin et User    */}
        {/* ==================================================== */}
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>💡 Comptes de test pour l'évaluation :</Text>
          
          <View style={styles.demoButtonsRow}>
            {/* Bouton pour tester en tant qu'utilisateur normal */}
            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnUser]}
              onPress={() => remplirIdentifiantsTest('user')}
            >
              <Text style={styles.demoBtnUserText}>👤 Rôle Utilisateur</Text>
              <Text style={styles.demoBtnSub}>user@masrouf.tn</Text>
            </TouchableOpacity>

            {/* Bouton pour tester en tant qu'administrateur */}
            <TouchableOpacity
              style={[styles.demoBtn, styles.demoBtnAdmin]}
              onPress={() => remplirIdentifiantsTest('admin')}
            >
              <Text style={styles.demoBtnAdminText}>👑 Rôle Administrateur</Text>
              <Text style={styles.demoBtnSub}>admin@masrouf.tn</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ------------------------------------------------------------
// FEUILLE DE STYLES GRAPHIQUES (StyleSheet)
// ------------------------------------------------------------
const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC', // Fond de page moderne gris perle
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  headerBox: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2, // Ombre sur Android
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1E293B',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2563EB', // Bleu principal
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  demoCard: {
    marginTop: 24,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoBtnUser: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  demoBtnUserText: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 12,
  },
  demoBtnAdmin: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  demoBtnAdminText: {
    color: '#7E22CE',
    fontWeight: '700',
    fontSize: 12,
  },
  demoBtnSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
});

