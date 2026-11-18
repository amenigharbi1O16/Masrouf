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

// ============================================================================
// IMPORTS ET DÉPENDANCES TECHNIQUES
// ============================================================================

// Icônes vectorielles IonIcons pour le chevron de déroulement et la coche de sélection
import { Ionicons } from '@expo/vector-icons';
// React core et hook d'état local pour contrôler la visibilité de la modal
import React, { useState } from 'react';
// Primitifs d'interface : liste défilante, boîte de dialogue plein écran, zones tactiles et conteneurs
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// Constantes de thème Masrouf : palette chromatique (vert forêt, menthe, corail) et arrondis
import { colors, radius } from '@/constants/theme';
// Système d'internationalisation (FR, EN, AR) et gestion dynamique de la direction RTL
import { useTranslation } from '@/utils/i18n';

// ============================================================================
// INTERFACES ET TYPES DU COMPOSANT
// ============================================================================

/**
 * Interface représentant une option sélectionnable dans la liste déroulante.
 */
export interface Option {
  // Valeur technique brute stockée en base de données ou état (ex: "kg", "alimentaire", "1")
  value: string;
  // Libellé textuel lisible affiché à l'utilisateur (ex: "Kilogramme (kg)", "Alimentation")
  label: string;
}

/**
 * Propriétés attendues par le composant SelectField.
 */
interface Props {
  // Libellé descriptif du champ affiché au-dessus de la valeur (ex: "Catégorie", "Unité de mesure")
  label: string;
  // Valeur actuellement sélectionnée correspondant à une clé d'option
  value: string;
  // Liste ordonnée de toutes les options disponibles pour le choix
  options: Option[];
  // Callback déclenché lors de la sélection d'une option pour notifier le parent
  onChange: (v: string) => void;
  // Texte d'invite optionnel affiché si aucune valeur n'est encore choisie
  placeholder?: string;
  // Message d'erreur de validation éventuel affiché sous le champ en rouge corail
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
  // Hook de traduction multilingue et indicateur d'écriture droite-à-gauche
  const { t, isRTL } = useTranslation();
  // État local booléen contrôlant l'ouverture et la fermeture de la feuille modale
  const [open, setOpen] = useState(false);

  // Recherche de l'option actuellement sélectionnée
  // Recherche de l'objet option correspondant à la valeur actuelle sélectionnée
  const current = options.find((o) => o.value === value);
  // Libellé de substitution affiché si aucune option n'est encore sélectionnée
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
        {/* Colonne textuelle interne contenant le label en haut et la valeur en dessous */}
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text
            style={[
              styles.label,
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {label}
          </Text>
          <Text
            style={[
              styles.value,
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
              !current && { color: '#9AA9A3' },
            ]}
            numberOfLines={1}
          >
            {current?.label ?? defaultPlaceholder}
          </Text>
        </View>
        {/* Indicateur visuel de déroulement (chevron gris vers le bas) */}
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>

      {/* Message d'erreur éventuel sous le champ */}
      {error ? (
        <Text
          style={[
            styles.error,
            { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
          ]}
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
              { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
            ]}
          >
            {label}
          </Text>

          {/* Liste déroulante optimisée et performante pour le choix d'options */}
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
  // Cadre principal du champ : fond blanc, bordure fine, arrondi et hauteur minimale de 80px
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
  // Libellé supérieur discret : petit texte gris ardoise au-dessus de la valeur
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
    color: colors.muted,
  },
  // Valeur textuelle active : typographie vert forêt soutenue bien lisible
  value: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '500',
    color: colors.forest,
    marginTop: 6,
  },
  // Message d'erreur sous le champ : texte corail d'alerte avec marge
  error: {
    fontSize: 12,
    color: colors.coral,
    marginTop: 4,
    marginHorizontal: 4,
  },
  // Voile sombre semi-transparent (35% d'opacité) couvrant l'arrière-plan de l'écran
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,43,39,0.35)',
  },
  // Conteneur de la demi-feuille modale coulissant depuis le bas avec coins supérieurs arrondis
  sheet: {
    backgroundColor: colors.warm,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  // Titre principal de la feuille modale rappelant le libellé du champ
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.forest,
    marginBottom: 8,
  },
  // Ligne cliquable d'une option : espacement vertical et trait fin séparateur
  opt: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  // Libellé de l'option textuelle : vert forêt standard ou bold si actif
  optText: {
    fontSize: 16,
    color: colors.forest,
  },
  // Message informatif affiché si la liste d'options est vide
  empty: {
    color: colors.muted,
    paddingVertical: 16,
  },
});
