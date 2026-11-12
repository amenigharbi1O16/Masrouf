// ============================================================
// FICHIER : src/app/(admin)/points-regles.tsx
// RÔLE    : Configuration du barème de Gamification (Points & Niveaux).
//           Permet à l'administrateur de modifier les règles d'attribution
//           des points et les seuils de niveaux.
//           Toutes les valeurs sont persistées dans la table SQLite 'reglages_points'.
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
  PointsSettings,
} from '../../db/queries';

// Internationalisation et Authentification
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';

export default function AdminPointsReglesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [ptsCategorie, setPtsCategorie] = useState('10');
  const [ptsBonusMois, setPtsBonusMois] = useState('50');
  const [ptsBonusSerie, setPtsBonusSerie] = useState('20');
  const [seuilEconome, setSeuilEconome] = useState('100');
  const [seuilExpert, setSeuilExpert] = useState('300');
  const [messageSucces, setMessageSucces] = useState('');

  useEffect(() => {
    const s = getPointsSettings();
    setPtsCategorie(String(s.points_categorie_respectee));
    setPtsBonusMois(String(s.points_bonus_mensuel));
    setPtsBonusSerie(String(s.points_bonus_serie));
    setSeuilEconome(String(s.seuil_econome));
    setSeuilExpert(String(s.seuil_expert));
  }, []);

  function handleSauvegarder() {
    const pCat = parseInt(ptsCategorie, 10);
    const pBonus = parseInt(ptsBonusMois, 10);
    const pSerie = parseInt(ptsBonusSerie, 10);
    const sEco = parseInt(seuilEconome, 10);
    const sExp = parseInt(seuilExpert, 10);

    if (
      isNaN(pCat) ||
      isNaN(pBonus) ||
      isNaN(pSerie) ||
      isNaN(sEco) ||
      isNaN(sExp)
    ) {
      Alert.alert('Erreur', 'Tous les champs doivent être des nombres entiers valides.');
      return;
    }

    if (sEco >= sExp) {
      Alert.alert(
        'Incohérence',
        'Le seuil Économe doit être strictement inférieur au seuil Expert.'
      );
      return;
    }

    updatePointsSettings({
      points_categorie_respectee: pCat,
      points_bonus_mensuel: pBonus,
      points_bonus_serie: pSerie,
      seuil_debutant: 0,
      seuil_econome: sEco,
      seuil_expert: sExp,
    }, user?.id);

    setMessageSucces(t('succes_sauvegarde'));
    setTimeout(() => setMessageSucces(''), 3000);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.pageTitle}>{t('regles_points_admin')}</Text>

      {/* SECTION 1 : ATTRIBUTION DES POINTS */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>🎁 Attribution des points de fin de mois</Text>

        <Text style={styles.label}>{t('points_par_categorie')}</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={ptsCategorie}
          onChangeText={setPtsCategorie}
        />

        <Text style={styles.label}>{t('bonus_mois_parfait')}</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={ptsBonusMois}
          onChangeText={setPtsBonusMois}
        />

        <Text style={styles.label}>{t('bonus_serie')}</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={ptsBonusSerie}
          onChangeText={setPtsBonusSerie}
        />
      </View>

      {/* SECTION 2 : SEUILS DE NIVEAUX */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>🏆 {t('seuils_niveaux')}</Text>

        <Text style={styles.label}>Niveau Débutant</Text>
        <TextInput style={[styles.input, styles.inputDisabled]} editable={false} value="0 point" />

        <Text style={styles.label}>Seuil Niveau Économe (points requis)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={seuilEconome}
          onChangeText={setSeuilEconome}
        />

        <Text style={styles.label}>Seuil Niveau Expert (points requis)</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={seuilExpert}
          onChangeText={setSeuilExpert}
        />
      </View>

      {messageSucces ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✅ {messageSucces}</Text>
        </View>
      ) : null}

      {/* BOUTON D'ENREGISTREMENT */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleSauvegarder}
        activeOpacity={0.8}
      >
        <Text style={styles.saveBtnText}>{t('sauvegarder')}</Text>
      </TouchableOpacity>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginBottom: 14,
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7E22CE',
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1E293B',
  },
  inputDisabled: {
    backgroundColor: '#F1F5F9',
    color: '#94A3B8',
  },
  saveBtn: {
    backgroundColor: '#7E22CE',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    marginBottom: 10,
  },
  successText: {
    color: '#065F46',
    fontWeight: '600',
    fontSize: 13,
  },
});

