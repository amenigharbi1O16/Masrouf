/**
 * FICHIER : src/components/SelectField.tsx
 * IDENTIFIANT INVENTAIRE : FICHIER-050
 * COMPOSANT : SelectField (Champ de Sélection Déroulant Modal)
 *
 * RÔLE DU COMPOSANT :
 * Présente visuellement un champ similaire à `<Input />`, mais son toucher ouvre une feuille
 * modale coulissante par le bas (`Modal` + `FlatList`) permettant de choisir parmi une liste d'options.
 *
 * EFFET VISUEL SUR L'INTERFACE :
 * Champ blanc à bordure fine avec libellé en haut, valeur sélectionnée ou placeholder au milieu
 * et chevron vers le bas à droite. Au toucher, une demi-feuille modale s'affiche avec la liste
 * des options et une coche verte en face de l'option actuellement sélectionnée.
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// Constantes de thème
import { colors, radius } from '@/constants/theme';
// Système d'internationalisation (FR, EN, AR) et détection RTL
import { useTranslation } from '@/utils/i18n';

/**
 * Interface représentant une option de la liste déroulante.
 */
export interface Option {
  value: string;
  label: string;
}

/**
 * Propriétés du composant SelectField.
 */
interface Props {
  label: string;
  value: string;
  options: Option[];
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}

/**
 * Sélecteur déroulant modal personnalisé.
 */
export function SelectField({
  label,
  value,
  options,
  onChange,
  placeholder,
  error,
}: Props) {
  const { t, isRTL } = useTranslation();
  const [open, setOpen] = useState(false);

  // Recherche de l'option actuellement sélectionnée
  const current = options.find((o) => o.value === value);
  const defaultPlaceholder = placeholder ?? t('selectionner');

  return (
    <View>
      {/* Zone cliquable principale ouvrant la modal */}
      <Pressable
        onPress={() => setOpen(true)}
        style={[
          styles.box,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
          !!error && { borderColor: colors.coral },
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={styles.label}>{label}</Text>
          <Text
            style={[styles.value, !current && { color: '#9AA9A3' }]}
            numberOfLines={1}
          >
            {current?.label ?? defaultPlaceholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>

      {/* Message d'erreur éventuel sous le champ */}
      {error ? (
        <Text
          style={[styles.error, { textAlign: isRTL ? 'right' : 'left' }]}
        >
          {error}
        </Text>
      ) : null}

      {/* Feuille modale coulissante contenant la liste des options */}
      <Modal
        transparent
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        {/* Fond semi-transparent assombrissant l'arrière-plan */}
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />

        {/* Conteneur de la feuille modale */}
        <View style={styles.sheet}>
          <Text
            style={[
              styles.sheetTitle,
              { textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {label}
          </Text>

          <FlatList
            data={options}
            keyExtractor={(o) => o.value}
            ListEmptyComponent={
              <Text
                style={[
                  styles.empty,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t('aucune_option_disponible')}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  setOpen(false);
                }}
                style={[
                  styles.opt,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Text
                  style={[
                    styles.optText,
                    item.value === value && {
                      fontWeight: '700',
                      color: colors.green,
                    },
                  ]}
                >
                  {item.label}
                </Text>
                {item.value === value ? (
                  <Ionicons name="checkmark" size={20} color={colors.green} />
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    minHeight: 80,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  value: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    color: colors.forest,
    marginTop: 6,
  },
  error: {
    fontSize: 12,
    color: colors.coral,
    marginTop: 4,
    marginHorizontal: 4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,43,39,0.35)',
  },
  sheet: {
    backgroundColor: colors.warm,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.forest,
    marginBottom: 8,
  },
  opt: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  optText: {
    fontSize: 16,
    color: colors.forest,
  },
  empty: {
    color: colors.muted,
    paddingVertical: 16,
  },
});
