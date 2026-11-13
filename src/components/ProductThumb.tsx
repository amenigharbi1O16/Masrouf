// ============================================================
// FICHIER : src/components/ProductThumb.tsx
// MISSION : Une seule vignette pour toute l'app.
//           Affiche la vraie photo si le fichier existe,
//           sinon l'icône catégorie du design.
// ============================================================

import React, { useState } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Theme } from '../constants/theme';
import { uriPhotoProduit } from '../utils/photos';

type Props = {
  photoPath?: string | null;
  icone?: string;
  taille?: number;
  style?: ViewStyle;
};

export default function ProductThumb({
  photoPath,
  icone = '☐',
  taille = 48,
  style,
}: Props) {
  const [cassee, setCassee] = useState(false);
  const uri = uriPhotoProduit(photoPath);

  const cadre = {
    width: taille,
    height: taille,
    borderRadius: Math.max(8, taille / 5),
  };

  if (uri && !cassee) {
    return (
      <View style={[cadre, style]}>
        <Image
          source={{ uri }}
          style={[styles.image, cadre]}
          contentFit="cover"
          onError={() => setCassee(true)}
          recyclingKey={uri}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: taille, height: taille, borderRadius: Math.max(8, taille / 5) },
        style,
      ]}
    >
      <Text style={{ fontSize: taille * 0.4, color: Theme.colors.forest }}>{icone}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Theme.colors.mint,
  },
  fallback: {
    backgroundColor: Theme.colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
