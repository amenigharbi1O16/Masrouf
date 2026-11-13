// Écran 41 : pourcentages par défaut. Le total doit faire 100 %.
import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { Theme } from '../../constants/theme';
import { Categorie, getAllCategories, saveDefaultPercents } from '../../db/queries';
import { useAuth } from '../../utils/auth';
import { useAdminDrawer } from './_layout';

export default function AdminPourcentagesScreen() {
  const { user } = useAuth();
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
      Alert.alert('Enregistré', 'Les pourcentages par défaut font 100 %.');
    } catch (error) {
      Alert.alert('Total refusé', error instanceof Error ? error.message : 'Le total doit faire 100 %.');
    }
  }

  function bloc(titre: string, liste: Categorie[]) {
    return (
      <View>
        <Text style={styles.section}>{titre}</Text>
        {liste.map((cat) => (
          <View key={cat.id} style={styles.row}>
            <Text style={styles.nom}>{cat.nom}</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              value={String(cat.pourcentage_defaut)}
              onChangeText={(texte) => changer(cat.id, texte)}
            />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader titre="Pourcentages par défaut" onMenuPress={ouvrirDrawer} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>ADMINISTRATEUR · RÉPARTITION SUGGÉRÉE</Text>
        <Text style={styles.total}>Total {somme} %</Text>
        {bloc(`Produits · ${sommeProduits} %`, produits)}
        {bloc(`Dépenses · ${sommeDepenses} %`, depenses)}
        <View style={[styles.banner, Math.abs(somme - 100) > 0.05 && styles.bannerErreur]}>
          <Text style={styles.bannerText}>
            {Math.abs(somme - 100) <= 0.05
              ? 'Total valide : 100 %'
              : 'Toutes les valeurs doivent être entre 0 et 100, et le total doit faire 100 %.'}
          </Text>
        </View>
        <TouchableOpacity style={styles.primary} onPress={enregistrer}>
          <Text style={styles.primaryText}>Enregistrer les pourcentages</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.warm },
  scroll: { padding: 16, paddingBottom: 48 },
  label: { color: Theme.colors.muted, fontSize: 12, marginBottom: 8 },
  total: { color: Theme.colors.ink, fontSize: 18, fontWeight: '700', marginBottom: 16 },
  section: { color: Theme.colors.ink, fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  row: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  nom: { flex: 1, color: Theme.colors.ink, fontSize: 15 },
  input: { width: 72, textAlign: 'right', color: Theme.colors.ink, fontSize: 16, fontWeight: '700' },
  banner: { backgroundColor: Theme.colors.mint, borderRadius: 16, padding: 16, marginTop: 12 },
  bannerErreur: { backgroundColor: Theme.colors.statusRedBg },
  bannerText: { color: Theme.colors.deepGreen, fontSize: 14 },
  primary: {
    backgroundColor: Theme.colors.forest,
    borderRadius: 999,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryText: { color: Theme.colors.white, fontSize: 16, fontWeight: '700' },
});
