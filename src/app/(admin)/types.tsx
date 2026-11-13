// ============================================================
// FICHIER : src/app/(admin)/types.tsx
// RÔLE    : Définition du type de chaque catégorie (Produit ou Dépense).
// ============================================================

import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import { Theme } from '../../constants/theme';
import { Categorie, getAllCategories, setCategoryType } from '../../db/queries';
import { useAuth } from '../../utils/auth';
import { useTranslation } from '../../utils/i18n';
import { useAdminDrawer } from './_layout';

export default function AdminTypesScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { ouvrirDrawer } = useAdminDrawer();
  const [categories, setCategories] = useState<Categorie[]>([]);

  const recharger = useCallback(() => {
    setCategories(getAllCategories(false));
  }, []);

  useFocusEffect(recharger);

  return (
    <View style={styles.container}>
      <AppHeader titre={t('types_categories')} onMenuPress={ouvrirDrawer} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>{t('gestion_categories').toUpperCase()}</Text>
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
                activeOpacity={0.75}
              >
                <Text style={[styles.btnText, cat.type === 'product' && styles.btnTextOn]}>
                  {t('produit')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, cat.type === 'expense' && styles.btnOn]}
                onPress={() => {
                  setCategoryType(cat.id, 'expense', user?.id);
                  recharger();
                }}
                activeOpacity={0.75}
              >
                <Text style={[styles.btnText, cat.type === 'expense' && styles.btnTextOn]}>
                  {t('depense_label')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  scroll: {
    padding: 16,
    paddingBottom: 90,
  },
  label: {
    color: Theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  row: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  nom: {
    color: Theme.colors.ink,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  choix: {
    flexDirection: 'row',
    gap: 10,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.mint,
    paddingVertical: 12,
  },
  btnOn: {
    backgroundColor: Theme.colors.forest,
  },
  btnText: {
    color: Theme.colors.deepGreen,
    fontWeight: '700',
    fontSize: 14,
  },
  btnTextOn: {
    color: Theme.colors.white,
  },
});
