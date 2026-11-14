import * as ImagePicker from 'expo-image-picker';

/** Opens the photo library and returns a local URI, or null if cancelled. */
export async function pickPhoto(): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });
  if (res.canceled || !res.assets?.length) return null;
  return res.assets[0].uri;
}
