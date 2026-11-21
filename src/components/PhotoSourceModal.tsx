/**
 * FICHIER : src/components/PhotoSourceModal.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-COMP-PHOTO-MODAL
 * COMPOSANT : PhotoSourceModal (Feuille Modale de Sélection de Source Photo : Caméra vs Galerie)
 *
 * MISSION DU COMPOSANT :
 * Permettre à l'utilisateur de choisir entre :
 * 1. Prendre une photo en direct avec l'appareil photo du smartphone (caméra).
 * 2. Choisir une image existante depuis la galerie / médiathèque.
 * 3. Supprimer la photo actuelle si une photo est déjà associée au produit.
 * 4. Annuler et fermer la feuille modale.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Feuille modale coulissante par le bas (bottom sheet), styled avec les couleurs Masrouf
 * (fond chaud #F5F3ED, vert forêt #102B27, vert menthe #D9F0E4, rouge corail #DC7770),
 * avec barre de glissement, icônes circulaires, sous-titres explicatifs et support RTL bilingue complet.
 */

import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, space } from '@/constants/theme';
import { useTranslation } from '@/utils/i18n';
import { Button } from './ui';

export interface PhotoSourceModalProps {
  /** Contrôle la visibilité de la feuille modale */
  visible: boolean;
  /** Callback déclenché à la fermeture (appui sur le fond ou Annuler) */
  onClose: () => void;
  /** Callback déclenché lors du choix de l'appareil photo (caméra) */
  onSelectCamera: () => void;
  /** Callback déclenché lors du choix de la galerie d'images */
  onSelectGallery: () => void;
  /** Callback optionnel pour supprimer la photo actuelle */
  onRemovePhoto?: () => void;
  /** Indique si le produit possède déjà une photo (affiche l'option Supprimer) */
  hasPhoto?: boolean;
}

/**
 * Composant de sélection de source photo (Appareil photo / Galerie / Suppression).
 */
export function PhotoSourceModal({
  visible,
  onClose,
  onSelectCamera,
  onSelectGallery,
  onRemovePhoto,
  hasPhoto = false,
}: PhotoSourceModalProps) {
  const { t, isRTL } = useTranslation();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Arrière-plan assombri tactile pour fermer */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Conteneur de la feuille modale */}
      <View style={styles.sheet}>
        {/* Petite poignée de préhension supérieure */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* En-tête de la feuille modale */}
        <View style={[styles.header, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.title,
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {t('source_photo_titre')}
          </Text>
          <Text
            style={[
              styles.subtitle,
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {t('source_photo_sous_titre')}
          </Text>
        </View>

        {/* Liste des options */}
        <View style={styles.optionsList}>
          {/* Option 1 : Prendre une photo avec la caméra */}
          <Pressable
            onPress={onSelectCamera}
            style={({ pressed }) => [
              styles.optionItem,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
              pressed && styles.optionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('prendre_photo_camera')}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.mint }]}>
              <Ionicons name="camera" size={24} color={colors.forest} />
            </View>
            <View style={[styles.optionTexts, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text
                style={[
                  styles.optionLabel,
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}
              >
                {t('prendre_photo_camera')}
              </Text>
              <Text
                style={[
                  styles.optionDesc,
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}
              >
                {t('prendre_photo_camera_desc')}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={colors.muted}
            />
          </Pressable>

          {/* Option 2 : Choisir depuis la galerie */}
          <Pressable
            onPress={onSelectGallery}
            style={({ pressed }) => [
              styles.optionItem,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
              pressed && styles.optionPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t('choisir_photo_galerie')}
          >
            <View style={[styles.iconCircle, { backgroundColor: colors.mint }]}>
              <Ionicons name="images" size={24} color={colors.forest} />
            </View>
            <View style={[styles.optionTexts, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text
                style={[
                  styles.optionLabel,
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}
              >
                {t('choisir_photo_galerie')}
              </Text>
              <Text
                style={[
                  styles.optionDesc,
                  { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                ]}
              >
                {t('choisir_photo_galerie_desc')}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={colors.muted}
            />
          </Pressable>

          {/* Option 3 : Supprimer la photo (si une photo existe déjà) */}
          {hasPhoto && onRemovePhoto && (
            <Pressable
              onPress={onRemovePhoto}
              style={({ pressed }) => [
                styles.optionItem,
                styles.deleteOption,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                pressed && styles.optionPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('supprimer_photo')}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.coralSoft }]}>
                <Ionicons name="trash-outline" size={22} color={colors.coral} />
              </View>
              <View style={[styles.optionTexts, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: colors.coral,
                      textAlign: isRTL ? 'right' : 'left',
                      writingDirection: isRTL ? 'rtl' : 'ltr',
                    },
                  ]}
                >
                  {t('supprimer_photo')}
                </Text>
                <Text
                  style={[
                    styles.optionDesc,
                    { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
                  ]}
                >
                  {t('supprimer_photo_desc')}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={colors.coral}
              />
            </Pressable>
          )}
        </View>

        {/* Bouton d'annulation */}
        <View style={styles.cancelContainer}>
          <Button
            label={t('annuler')}
            variant="secondary"
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 43, 39, 0.45)', // Teinte assombrie vert forêt
  },
  sheet: {
    backgroundColor: colors.warm,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.muted,
    opacity: 0.35,
  },
  header: {
    marginTop: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.forest,
  },
  subtitle: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  optionsList: {
    gap: 10,
    marginBottom: 18,
  },
  optionItem: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 14,
  },
  deleteOption: {
    borderColor: '#F8D7D5',
  },
  optionPressed: {
    backgroundColor: '#F0ECE1',
    transform: [{ scale: 0.99 }],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTexts: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.forest,
  },
  optionDesc: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  cancelContainer: {
    marginTop: 6,
  },
});
