// Écran 26 : modifier un produit, ou le supprimer avec ses achats.
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
import { choisirPhotoProduit, supprimerFichierPhoto } from '../utils/photos';

export default function ModifierProduitScreen() {
  const { user } = useAuth();
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
        <AppHeader titre="Modifier le produit" onMenuPress={() => router.back()} />
        <Text style={styles.vide}>Produit introuvable.</Text>
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
      setErreurNom('Le nom est obligatoire.');
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
      'Supprimer ce produit',
      n > 0
        ? `Ce produit a ${n} achat(s). Ils seront supprimés avec lui.`
        : 'Ce produit n’a aucun achat. Il sera supprimé.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
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
      <AppHeader titre="Modifier le produit" onMenuPress={() => router.back()} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity onPress={changerPhoto} style={styles.photo}>
          <ProductThumb photoPath={photo} icone="☐" taille={72} />
          <Text style={styles.lien}>Changer la photo</Text>
        </TouchableOpacity>
        <Text style={styles.label}>Nom</Text>
        <TextInput style={styles.input} value={nom} onChangeText={setNom} />
        {erreurNom ? <Text style={styles.erreur}>{erreurNom}</Text> : null}
        <Text style={styles.label}>Marque</Text>
        <TextInput style={styles.input} value={marque} onChangeText={setMarque} />
        <Text style={styles.label}>Unité</Text>
        <TextInput style={styles.input} value={unite} onChangeText={setUnite} />
        <Text style={styles.label}>Catégorie</Text>
        {categories.map((c: Categorie) => (
          <TouchableOpacity key={c.id} onPress={() => setCategorieId(c.id)} style={styles.cat}>
            <Text style={{ color: categorieId === c.id ? Theme.colors.forest : Theme.colors.ink, fontWeight: categorieId === c.id ? '700' : '400' }}>
              {c.nom}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.primary} onPress={enregistrer}>
          <Text style={styles.primaryText}>Enregistrer les modifications</Text>
        </TouchableOpacity>
        <Text style={styles.regleNote}>
          Règle : la suppression d'un produit supprime automatiquement tous les achats enregistrés pour ce produit afin d'éviter les données orphelines.
        </Text>
        <TouchableOpacity style={styles.danger} onPress={supprimer}>
          <Text style={styles.primaryText}>Supprimer le produit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.colors.warm },
  scroll: { padding: 16, paddingBottom: 48 },
  vide: { padding: 16, color: Theme.colors.muted },
  photo: { alignItems: 'flex-start', marginBottom: 16, gap: 8 },
  lien: { color: Theme.colors.deepGreen, marginTop: 8 },
  label: { color: Theme.colors.muted, fontSize: 12, marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: Theme.colors.white,
    borderRadius: 16,
    minHeight: 52,
    paddingHorizontal: 16,
    color: Theme.colors.ink,
    fontSize: 16,
  },
  erreur: { color: Theme.colors.coral, marginTop: 4 },
  cat: { minHeight: 44, justifyContent: 'center' },
  primary: {
    backgroundColor: Theme.colors.forest,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  regleNote: {
    fontSize: 12,
    color: Theme.colors.muted,
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  danger: {
    backgroundColor: Theme.colors.coral,
    minHeight: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryText: { color: Theme.colors.white, fontWeight: '700' },
});
