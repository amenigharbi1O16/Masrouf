// ============================================================
// FICHIER : src/app/(admin)/points-regles.tsx
// RÔLE    : Configuration du barème de Gamification — Design Figma 42.
//
// CE QUI EST AFFICHÉ SUR L'ÉCRAN (Design Figma 42 · FR · Admin Points rules) :
//   • Header : ☰ hamburger + "Règles des points" + profil
//   • Label "ADMINISTRATEUR · RÉCOMPENSER LA RÉGULARITÉ" (muted, uppercase)
//   • Cartes de saisie :
//       1. "Période réussie · points" (ex: 100)
//       2. "Périodes consécutives pour le bonus" (ex: 3)
//       3. "Bonus de série · points" (ex: 50)
//   • Titre de section "Seuils des niveaux"
//   • Ligne statique "Débutant    0 point"
//   • Cartes de saisie de seuils :
//       4. "Économe · points minimum" (ex: 300)
//       5. "Expert · points minimum" (ex: 1,000)
//   • Note explicative sur l'attribution des points
//   • Bannière Mint de validation des seuils
//   • Bouton primary forest : "Enregistrer les règles de points"
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

// Fonctions SQLite
import {
  getPointsSettings,
  updatePointsSettings,
} from '../../db/queries';

// Design System & Contexte
import { Theme } from '../../constants/theme';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useAdminDrawer } from './_layout';
import AppHeader from '../../components/AppHeader';

export default function AdminPointsReglesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useAdminDrawer();

  const [ptsPeriode, setPtsPeriode] = useState('100');
  const [nbConsecutifs, setNbConsecutifs] = useState('3');
  const [ptsBonusSerie, setPtsBonusSerie] = useState('50');
  const [seuilEconome, setSeuilEconome] = useState('300');
  const [seuilExpert, setSeuilExpert] = useState('1000');

  useEffect(() => {
    const s = getPointsSettings();
    setPtsPeriode(String(s.points_per_period || 100));
    setNbConsecutifs(String(s.streak_length || 3));
    setPtsBonusSerie(String(s.points_streak_bonus || 50));
    setSeuilEconome(String(s.seuil_econome || 300));
    setSeuilExpert(String(s.seuil_expert || 1000));
  }, []);

  const sEco = parseInt(seuilEconome, 10) || 0;
  const sExp = parseInt(seuilExpert, 10) || 0;
  const seuilsValides = sEco > 0 && sExp > sEco;

  function handleSauvegarder() {
    const pPer = parseInt(ptsPeriode, 10);
    const pSerie = parseInt(ptsBonusSerie, 10);

    if (isNaN(pPer) || isNaN(pSerie) || isNaN(sEco) || isNaN(sExp)) {
      Alert.alert(t('erreur') ?? 'Erreur', 'Tous les champs doivent être des nombres entiers valides.');
      return;
    }

    if (!seuilsValides) {
      Alert.alert(
        'Incohérence des seuils',
        'Le seuil Économe doit être strictement inférieur au seuil Expert et supérieur à 0.'
      );
      return;
    }

    const serie = parseInt(nbConsecutifs, 10);
    updatePointsSettings({
      points_per_period: pPer,
      points_streak_bonus: pSerie,
      streak_length: serie > 0 ? serie : 3,
      seuil_debutant: 0,
      seuil_econome: sEco,
      seuil_expert: sExp,
      green_until: 79,
      orange_from: 80,
      red_from: 100,
    }, user?.id);

    Alert.alert('Succès', 'Les règles de points ont été enregistrées avec succès.');
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader
        titre="Règles des points"
        onMenuPress={ouvrirDrawer}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Label uppercase */}
        <Text style={styles.sectionLabel}>
          ADMINISTRATEUR · RÉCOMPENSER LA RÉGULARITÉ
        </Text>

        {/* 1. Période réussie · points */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Période réussie · points</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={ptsPeriode}
            onChangeText={setPtsPeriode}
          />
        </View>

        {/* 2. Périodes consécutives pour le bonus */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Périodes consécutives pour le bonus</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={nbConsecutifs}
            onChangeText={setNbConsecutifs}
          />
        </View>

        {/* 3. Bonus de série · points */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Bonus de série · points</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={ptsBonusSerie}
            onChangeText={setPtsBonusSerie}
          />
        </View>

        {/* SECTION SEUILS DES NIVEAUX */}
        <Text style={styles.sectionTitle}>Seuils des niveaux</Text>

        {/* Ligne Débutant statique */}
        <View style={styles.staticRow}>
          <Text style={styles.staticLabel}>Débutant</Text>
          <Text style={styles.staticValue}>0 point</Text>
        </View>

        {/* 4. Économe · points minimum */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Économe · points minimum</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={seuilEconome}
            onChangeText={setSeuilEconome}
          />
        </View>

        {/* 5. Expert · points minimum */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Expert · points minimum</Text>
          <TextInput
            style={styles.textInput}
            keyboardType="numeric"
            value={seuilExpert}
            onChangeText={setSeuilExpert}
          />
        </View>

        {/* Note explicative (Figma 42) */}
        <Text style={styles.noteText}>
          Une période réussie se termine sans dépasser son budget. Récompense attribuée une fois par période terminée.
        </Text>

        {/* BANNIÈRE MINT DE VALIDATION */}
        <View style={styles.mintBanner}>
          <View style={styles.bannerHeaderRow}>
            <Text style={styles.checkIcon}>{seuilsValides ? '✓' : '⚠️'}</Text>
            <Text style={styles.bannerTitle}>
              {seuilsValides ? 'Seuils des niveaux valides' : 'Vérifiez la hiérarchie des seuils'}
            </Text>
          </View>
          <Text style={styles.bannerSub}>
            Débutant &lt; Économe &lt; Expert. Points positifs ou nuls.
          </Text>
        </View>

        {/* Bouton Enregistrer */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleSauvegarder}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryBtnText}>
            Enregistrer les règles de points
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ------------------------------------------------------------
// STYLES — Design Figma 42
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
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Theme.colors.ink,
    marginTop: 16,
    marginBottom: 12,
  },

  // Cartes blanches de saisie
  inputCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 10,
    ...Theme.shadows.card,
  },
  inputLabel: {
    fontSize: 11,
    color: Theme.colors.muted,
    marginBottom: 4,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.ink,
    padding: 0,
  },

  // Ligne Débutant
  staticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
    marginBottom: 10,
  },
  staticLabel: {
    fontSize: 14,
    color: Theme.colors.muted,
  },
  staticValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.ink,
  },

  // Note
  noteText: {
    fontSize: 12,
    color: Theme.colors.muted,
    lineHeight: 18,
    marginTop: 10,
    marginBottom: 16,
  },

  // Bannière mint
  mintBanner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: Theme.radius.lg,
    padding: 16,
    marginBottom: 20,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checkIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: Theme.colors.deepGreen,
  },
  bannerSub: {
    fontSize: 13,
    color: Theme.colors.forest,
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
});
