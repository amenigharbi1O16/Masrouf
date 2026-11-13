// ============================================================
// FICHIER : src/app/modifier-produit.tsx
// RÔLE    : Modifier un produit existant ou le supprimer proprement.
// ============================================================

import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AppHeader from '../components/AppHeader';
import ProductThumb from '../components/ProductThumb';
import { Theme } from '../constants/theme';
import {
  Categorie,
  deleteProduit,
  getAchatsByProduit,
  getAllCategories,
  getProduitById,
  updateProduit,
} from '../db/queries';
import { useAuth } from '../utils/auth';
import { useTranslation } from '../utils/i18n';
import { choisirPhotoProduit, supprimerFichierPhoto } from '../utils/photos';

export default function ModifierProduitScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const produit = user && id ? getProduitById(Number(id)) : null;
  const categories = getAllCategories(true).filter((c) => c.type === 'product');
  const [nom, setNom] = useState(produit?.nom ?? '');
  const [marque, setMarque] = useState(produit?.marque ?? '');
  const [unite, setUnite] = useState(produit?.unite ?? '');
  const [categorieId, setCategorieId] = useState<number>(produit?.categorie_id ?? categories[0]?.id ?? 0);
  const [photo, setPhoto] = useState(produit?.photo_uri ?? '');
  const [erreurNom, setErreurNom] = useState('');

  if (!user || !produit) {
    return (
      <View style={styles.container}>
        <AppHeader titre={t('modifier_produit')} onMenuPress={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.vide}>{t('produit_introuvable')}</Text>
        </View>
      </View>
    );
  }

  async function changerPhoto() {
    const nomFichier = await choisirPhotoProduit();
    if (!nomFichier) return;
    if (photo) supprimerFichierPhoto(photo);
    setPhoto(nomFichier);
  }

  function enregistrer() {
    if (!nom.trim()) {
      setErreurNom(t('erreur_nom_requis') ?? 'Le nom est obligatoire.');
      return;
    }
    updateProduit(produit!.id, user!.id, {
      nom: nom.trim(),
      marque: marque.trim(),
      unite: unite.trim() || 'pièce',
      categorie_id: categorieId,
      photo_uri: photo,
    });
    router.back();
  }

  function supprimer() {
    const n = getAchatsByProduit(produit!.id, user!.id).length;
    Alert.alert(
      t('supprimer_produit'),
      n > 0
        ? `Ce produit a ${n} transaction(s) enregistrée(s). Elles seront supprimées avec lui.`
        : 'Ce produit sera définitivement supprimé.',
      [
        { text: t('annuler') ?? 'Annuler', style: 'cancel' },
        {
          text: t('supprimer') ?? 'Supprimer',
          style: 'destructive',
          onPress: () => {
            supprimerFichierPhoto(photo || produit!.photo_uri);
            deleteProduit(produit!.id, 'cascade');
            router.replace('/(tabs)/produits');
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader titre={t('modifier_produit')} onMenuPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={changerPhoto} style={styles.photo} activeOpacity={0.75}>
          <ProductThumb photoPath={photo} icone="☐" taille={72} />
          <Text style={styles.lien}>📷 {t('changer_photo')}</Text>
        </TouchableOpacity>

        <Text style={styles.label}>{t('nom_produit')}</Text>
        <TextInput
          style={styles.input}
          value={nom}
          onChangeText={(v) => { setNom(v); setErreurNom(''); }}
          placeholder="Ex: Lait demi-écrémé"
          placeholderTextColor={Theme.colors.muted}
        />
        {erreurNom ? <Text style={styles.erreur}>{erreurNom}</Text> : null}

        <Text style={styles.label}>{t('marque')}</Text>
        <TextInput
          style={styles.input}
          value={marque}
          onChangeText={setMarque}
          placeholder="Ex: Délice"
          placeholderTextColor={Theme.colors.muted}
        />

        <Text style={styles.label}>{t('unite')}</Text>
        <TextInput
          style={styles.input}
          value={unite}
          onChangeText={setUnite}
          placeholder="Ex: L, kg, pièce..."
          placeholderTextColor={Theme.colors.muted}
        />

        <Text style={styles.label}>{t('categorie')}</Text>
        <View style={styles.catGrid}>
          {categories.map((c: Categorie) => {
            const isSelected = categorieId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategorieId(c.id)}
                style={[styles.catChip, isSelected && styles.catChipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.catChipText,
                    isSelected && styles.catChipTextActive,
                  ]}
                >
                  {c.nom}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.primary} onPress={enregistrer} activeOpacity={0.85}>
          <Text style={styles.primaryText}>{t('enregistrer_modifications')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.danger} onPress={supprimer} activeOpacity={0.85}>
          <Text style={styles.dangerText}>{t('supprimer_produit')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.warm,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scroll: {
    padding: 20,
    paddingBottom: 90,
  },
  vide: {
    fontSize: 16,
    color: Theme.colors.muted,
  },
  photo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    paddingVertical: 12,
  },
  lien: {
    color: Theme.colors.forest,
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    color: Theme.colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    color: Theme.colors.ink,
    fontSize: 15,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: 6,
  },
  erreur: {
    color: Theme.colors.coral,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Theme.colors.white,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  catChipActive: {
    backgroundColor: Theme.colors.forest,
    borderColor: Theme.colors.forest,
  },
  catChipText: {
    fontSize: 13,
    color: Theme.colors.ink,
    fontWeight: '500',
  },
  catChipTextActive: {
    color: Theme.colors.white,
    fontWeight: '700',
  },
  primary: {
    backgroundColor: Theme.colors.forest,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  primaryText: {
    color: Theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  danger: {
    backgroundColor: '#FEE2E2',
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  dangerText: {
    color: Theme.colors.coral,
    fontWeight: '700',
    fontSize: 15,
  },
});
