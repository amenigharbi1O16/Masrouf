// Écran 40 : choisir si une catégorie sert aux produits ou aux dépenses.
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { Theme } from '../../constants/theme';
import { Categorie, getAllCategories, setCategoryType } from '../../db/queries';
import { useAuth } from '../../utils/auth';
import { useAdminDrawer } from './_layout';

export default function AdminTypesScreen() {
  const { user } = useAuth();
  const { ouvrirDrawer } = useAdminDrawer();
  const [categories, setCategories] = useState<Categorie[]>([]);

  const recharger = useCallback(() => {
    setCategories(getAllCategories(false));
  }, []);

  useFocusEffect(recharger);

  return (
    <View style={styles.container}>
      <AppHeader titre="Types de catégories" onMenuPress={ouvrirDrawer} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>ADMINISTRATEUR · PRODUIT OU DÉPENSE</Text>
        {categories.map((cat) => (
          <View key={cat.id} style={styles.row}>
            <Text style={styles.nom}>{cat.nom}</Text>
            <View style={styles.choix}>
              <TouchableOpacity
                style={[styles.btn, cat.type === 'product' && styles.btnOn]}
                onPress={() => {
                  setCategoryType(cat.id, 'product', user?.id);
                  recharger();
                }}
              >
                <Text style={[styles.btnText, cat.type === 'product' && styles.btnTextOn]}>Produit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, cat.type === 'expense' && styles.btnOn]}
                onPress={() => {
                  setCategoryType(cat.id, 'expense', user?.id);
                  recharger();
                }}
              >
                <Text style={[styles.btnText, cat.type === 'expense' && styles.btnTextOn]}>Dépense</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.warm },
  scroll: { padding: 16, paddingBottom: 40 },
  label: { color: Theme.colors.muted, fontSize: 12, letterSpacing: 0.6, marginBottom: 16 },
  row: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  nom: { color: Theme.colors.ink, fontSize: 16, fontWeight: '700', marginBottom: 10 },
  choix: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.mint,
  },
  btnOn: { backgroundColor: Theme.colors.forest },
  btnText: { color: Theme.colors.deepGreen, fontWeight: '700' },
  btnTextOn: { color: Theme.colors.white },
});
