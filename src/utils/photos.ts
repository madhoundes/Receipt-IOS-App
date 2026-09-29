import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const DIR = `${FileSystem.documentDirectory ?? ''}receipts/`;

/**
 * Copies a captured photo out of the camera cache into the app's documents
 * folder, so the original receipt survives cache clean-ups. Returns the new URI.
 * On web there is no documents folder, so the original URI is kept.
 */
export async function persistReceiptPhoto(uri: string, id: string): Promise<string> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return uri;
  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true }).catch(() => {});
  const dest = `${DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export async function deleteReceiptPhoto(uri: string | undefined) {
  if (!uri || Platform.OS === 'web' || !uri.startsWith(DIR)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
}
