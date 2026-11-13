// ============================================================
// FICHIER : src/app/(admin)/pourcentages.tsx
// RÔLE    : Répartition des pourcentages par défaut. Le total doit faire 100 %.
// ============================================================

import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { Theme } from '../../constants/theme';
import { Categorie, getAllCategories, saveDefaultPercents } from '../../db/queries';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useAdminDrawer } from './_layout';

export default function AdminPourcentagesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useAdminDrawer();
  const [lignes, setLignes] = useState<Categorie[]>([]);

  const recharger = useCallback(() => {
    setLignes(getAllCategories(false).filter((c) => c.est_defaut === 1));
  }, []);

  useFocusEffect(recharger);

  const somme = lignes.reduce((s, c) => s + (Number(c.pourcentage_defaut) || 0), 0);
  const produits = lignes.filter((c) => c.type === 'product');
  const depenses = lignes.filter((c) => c.type === 'expense');
  const sommeProduits = produits.reduce((s, c) => s + c.pourcentage_defaut, 0);
  const sommeDepenses = depenses.reduce((s, c) => s + c.pourcentage_defaut, 0);

  function changer(id: number, texte: string) {
    const valeur = texte === '' ? 0 : Number(texte.replace(',', '.'));
    setLignes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pourcentage_defaut: Number.isFinite(valeur) ? valeur : 0 } : c))
    );
  }

  function enregistrer() {
    try {
      saveDefaultPercents(
        lignes.map((c) => ({ id: c.id, percent: c.pourcentage_defaut })),
        user?.id
      );
      Alert.alert(t('succes_sauvegarde') ?? 'Enregistré', t('total_valide') ?? 'Les pourcentages par défaut font 100 %.');
    } catch (error) {
      Alert.alert(t('erreur') ?? 'Total refusé', error instanceof Error ? error.message : (t('total_doit_faire_100') ?? 'Le total doit faire 100 %.'));
    }
  }

  function bloc(titre: string, liste: Categorie[]) {
    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={styles.section}>{titre}</Text>
        {liste.map((cat) => (
          <View key={cat.id} style={styles.row}>
            <Text style={styles.nom}>{cat.nom}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={String(cat.pourcentage_defaut)}
                onChangeText={(texte) => changer(cat.id, texte)}
              />
              <Text style={styles.unitSuffix}>%</Text>
            </View>
          </View>
        ))}
      </View>
    );
  }

  const estValide = Math.abs(somme - 100) <= 0.05;

  return (
    <View style={styles.container}>
      <AppHeader titre={t('pourcentages_defaut')} onMenuPress={ouvrirDrawer} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>{t('repartition_budget_defaut').toUpperCase()}</Text>
        <Text style={styles.total}>Total : {somme} %</Text>
        {bloc(`${t('categories_produits')} · ${sommeProduits} %`, produits)}
        {bloc(`${t('categories_depenses')} · ${sommeDepenses} %`, depenses)}
        <View style={[styles.banner, !estValide && styles.bannerErreur]}>
          <Text style={[styles.bannerText, !estValide && styles.bannerTextErreur]}>
            {estValide
              ? (t('total_valide') ?? 'Total valide : 100 %')
              : (t('total_doit_faire_100') ?? 'Toutes les valeurs doivent être positives et le total doit faire 100 %.')}
          </Text>
        </View>
        <TouchableOpacity style={styles.primary} onPress={enregistrer} activeOpacity={0.85}>
          <Text style={styles.primaryText}>{t('enregistrer_pourcentages')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.warm },
  scroll: { padding: 16, paddingBottom: 90 },
  label: { color: Theme.colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  total: { color: Theme.colors.ink, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  section: { color: Theme.colors.ink, fontSize: 16, fontWeight: '700', marginTop: 8, marginBottom: 10 },
  row: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  nom: { flex: 1, color: Theme.colors.ink, fontSize: 15, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'center' },
  input: {
    minWidth: 54,
    textAlign: 'right',
    color: Theme.colors.ink,
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  unitSuffix: { color: Theme.colors.muted, fontSize: 15, fontWeight: '700', marginLeft: 4 },
  banner: {
    backgroundColor: Theme.colors.mint,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  bannerErreur: { backgroundColor: '#FEE2E2' },
  bannerText: { color: Theme.colors.deepGreen, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  bannerTextErreur: { color: Theme.colors.coral },
  primary: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 999,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryText: { color: Theme.colors.white, fontSize: 16, fontWeight: '700' },
});
