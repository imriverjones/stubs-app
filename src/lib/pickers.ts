import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import type { IncomingFile } from './importer';

/** Screenshots of tickets. Several at once become one stub with several tickets. */
export async function pickPhotos(): Promise<IncomingFile[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({ uri: a.uri, name: a.fileName, mimeType: a.mimeType }));
}

/** PDFs (or images) from Files / iCloud Drive. */
export async function pickDocument(): Promise<IncomingFile[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled) return [];
  return result.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType }));
}

/** One photo for a ticket's cover. */
export async function pickCoverPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}
