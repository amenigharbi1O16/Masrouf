/**
 * FICHIER : src/app/(admin)/categories.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-003
 * ÉCRAN : ECRAN-ADM-02 (Catalogue et Gestion des Catégories)
 *
 * MISSION DU FICHIER :
 * Permettre à l'administrateur de superviser l'ensemble du catalogue de dépenses et d'achats de Masrouf.
 * Ce fichier gère la création de nouvelles catégories, la modification de leurs libellés en direct,
 * et l'activation ou le masquage des catégories obsolètes.
 *
 * DANS QUOI CE FICHIER AIDE DANS L'APPLICATION :
 * Il garantit la flexibilité du système. Si une nouvelle habitude de consommation apparaît
 * (par exemple : 'Abonnements VTC' ou 'Énergie Solaire'), l'administrateur peut l'ajouter
 * immédiatement sans avoir besoin de reprogrammer ou redéployer l'application mobile.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN POUR L'UTILISATEUR :
 * - Un grand titre traduit 'Catégories (Admin)' avec un surtitre en majuscules 'CATALOGUE DES CATÉGORIES'.
 * - Un formulaire d'ajout en haut de page composé d'un champ de saisie pour le nom, d'un sélecteur déroulant
 *   pour choisir le type ('Dépense fixe' ou 'Produit d'épicerie') et d'un bouton d'action vert 'Ajouter'.
 * - Deux listes distinctes (Produits et Dépenses) où chaque catégorie apparaît dans une carte blanche
 *   avec un champ modifiable pour renommer le texte et un interrupteur à bascule vert (Switch) pour activer ou désactiver.
 */

import React, { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
// Icônes vectorielles Ionicons pour illustrer chaque catégorie
import { Ionicons } from '@expo/vector-icons';
// Composant conteneur d'écran avec gestion du défilement et barre de statut
import { Screen } from '@/components/Screen';
// Composant de sélection déroulante personnalisée pour le type de catégorie
import { SelectField } from '@/components/SelectField';
// Composants atomiques d'interface utilisateur
import { AlertBanner, Button, Eyebrow, Input, SectionTitle } from '@/components/ui';
// Constantes de thème (couleurs vert forêt, blanc, bordures et arrondis)
import { colors, radius } from '@/constants/theme';
// Magasin d'état global connecté à la base SQLite
import { useStore } from '@/state/store';
// Types métier TypeScript
import type { CategoryKind } from '@/state/types';
// Système d'internationalisation (FR, EN, AR) et détection du sens d'écriture RTL
import { useTranslation } from '@/utils/i18n';
// Résolveur d'icône représentative par catégorie
import { getCategoryIcon } from '@/utils/categoryIcons';

/**
 * MISSION DU COMPOSANT :
 * Rendre l'interface complète de gestion des catégories pour l'administrateur.
 *
 * RÔLE DANS L'APPLICATION :
 * Connecte les données du catalogue SQLite avec les interactions tactiles de l'administrateur.
 *
 * CE QUI EST AFFICHÉ À L'ÉCRAN :
 * La vue complète avec le formulaire d'ajout en haut et la liste éditable des catégories en bas.
 */
export default function AdminCategoriesScreen() {
  // Extraction des données du catalogue et des actions de mise à jour depuis le store global
  const { db, actions } = useStore();
  // Extraction de la fonction de traduction t() et du booléen de sens de lecture isRTL
  const { t, isRTL } = useTranslation();

  // État local : mémorise le texte tapé par l'administrateur pour la nouvelle catégorie
  const [name, setName] = useState('');
  // État local : mémorise le type sélectionné ('expense' pour facture/loyer ou 'product' pour courses)
  const [kind, setKind] = useState<CategoryKind>('expense');
  // État local : stocke le message d'erreur si la validation échoue (ex: nom déjà existant ou vide)
  const [error, setError] = useState('');

  /**
   * MISSION DE LA FONCTION :
   * Valider la saisie et enregistrer la nouvelle catégorie dans la base SQLite locale.
   *
   * RÔLE DANS L'APPLICATION :
   * Appelle l'action `actions.addCategory` qui exécute une requête SQL `INSERT INTO categories`.
   *
   * CE QUI EST AFFICHÉ À L'ÉCRAN :
   * - En cas d'erreur : affiche immédiatement une bannière rouge en haut de page.
   * - En cas de succès : vide le champ de texte et insère la nouvelle ligne dans la liste visible ci-dessous.
   */
  const add = () => {
    // Exécution de l'action d'ajout dans SQLite via le pont de persistance
    const r = actions.addCategory(name, kind);
    if (!r.ok) {
      // Si la base rejette l'ajout (ex: nom vide), on met à jour l'état d'erreur affiché à l'écran
      setError(r.error ?? '');
    } else {
      // Si l'ajout réussit, on réinitialise le formulaire pour permettre une nouvelle saisie
      setName('');
      setError('');
    }
  };

  return (
    // Screen : conteneur assurant les marges physiques et le défilement fluide
    <Screen title={t('categories_admin')}>
      {/* Surtitre informatif en lettres capitales aligné selon le sens de lecture */}
      <Eyebrow style={{ textAlign: isRTL ? 'right' : 'left' }}>
        {t('catalogue_categories').toUpperCase()}
      </Eyebrow>

      {/* Bannière d'alerte rouge affichée uniquement si un message d'erreur est présent */}
      {error ? (
        <AlertBanner
          tone="danger"
          title={t('categorie_non_ajoutee')}
          detail={error}
        />
      ) : null}

      {/* Champ de saisie stylisé pour entrer le libellé de la nouvelle catégorie */}
      <Input
        label={t('nom_nouvelle_categorie')}
        value={name}
        onChangeText={(text) => {
          setName(text);
          // Efface l'erreur dès que l'administrateur recommence à taper
          setError('');
        }}
        autoCapitalize="words"
      />

      {/* Sélecteur déroulant affichant le choix entre Produit et Dépense */}
      <SelectField
        label={t('type_categorie')}
        value={kind}
        onChange={(v) => setKind(v as CategoryKind)}
        options={db.categoryTypes.map((typeItem) => ({
          value: typeItem.kind,
          label: typeItem.label,
        }))}
      />

      {/* Bouton d'action vert forêt pour déclencher l'enregistrement */}
      <Button
        label={t('ajouter_categorie')}
        onPress={add}
        disabled={!name.trim()}
      />

      {/* Boucle d'affichage regroupant les catégories par type (Produits puis Dépenses) */}
      {db.categoryTypes.map((typeGroup) => (
        <View key={typeGroup.kind} style={{ gap: 10 }}>
          {/* Titre de section : 'Produits' ou 'Dépenses' */}
          <SectionTitle style={{ textAlign: isRTL ? 'right' : 'left' }}>
            {typeGroup.label}
          </SectionTitle>

          {/* Filtrage et rendu des catégories appartenant au type en cours */}
          {db.categories
            .filter((cat) => cat.kind === typeGroup.kind)
            .map((cat) => (
              <View
                key={cat.id}
                style={{
                  // Inverse la disposition en ligne si l'application est en langue arabe (RTL)
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: colors.white,
                  borderRadius: radius.card,
                  paddingHorizontal: 14,
                  minHeight: 56,
                }}
              >
                {/* Icône descriptive de la catégorie (restaurant, voiture, reçu, manette, etc.) */}
                <Ionicons
                  name={getCategoryIcon(cat.name, cat.kind)}
                  size={22}
                  color={colors.forest}
                />

                {/* Champ texte permettant de renommer directement le titre de la catégorie */}
                <TextInput
                  defaultValue={cat.name}
                  onEndEditing={(e) => {
                    const v = e.nativeEvent.text.trim();
                    if (v && v !== cat.name) {
                      // Met à jour la catégorie dans SQLite dès que l'administrateur quitte le champ
                      actions.updateCategory(cat.id, { name: v });
                    }
                  }}
                  style={{
                    flex: 1,
                    fontSize: 15.5,
                    fontWeight: '600',
                    color: colors.forest,
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                />

                {/* Libellé textuel indiquant si la catégorie est active ou masquée */}
                <Text style={{ fontSize: 13.5, color: colors.muted }}>
                  {cat.active ? t('statut_actif') : t('statut_masque')}
                </Text>

                {/* Interrupteur Switch vert : active ou désactive la catégorie en un toucher */}
                <Switch
                  value={cat.active}
                  onValueChange={(val) =>
                    actions.updateCategory(cat.id, { active: val })
                  }
                  trackColor={{ true: colors.green, false: colors.border }}
                />
              </View>
            ))}
        </View>
      ))}
    </Screen>
  );
}
