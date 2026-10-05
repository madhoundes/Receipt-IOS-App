import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Receipt } from '../types';

let hapticsEnabled = true;
/** Mirrors the "Haptic Feedback" setting so every call site respects it. */
export const setHapticsEnabled = (on: boolean) => { hapticsEnabled = on; };

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
  // Haptics don't exist on web, and a failed buzz should never break a tap.
  if (Platform.OS === 'web' || !hapticsEnabled) return;
  const run = () => {
    switch (style) {
      case 'light': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'medium': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'heavy': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      case 'success': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'error': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  run().catch(() => {});
};

/** Writes CSV text (built with buildCsv) to a file and opens the share sheet. */
export const shareCSV = async (csv: string, filename: string) => {
  const path = `${FileSystem.documentDirectory}${filename}`;
  try {
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Export Receipts' });
  } catch (error) {
    console.error('Error sharing CSV:', error);
    triggerHaptic('error');
  }
};

export const shareImage = async (imageUri: string) => {
    try {
        await Sharing.shareAsync(imageUri, { mimeType: 'image/jpeg', dialogTitle: 'Share Receipt Image' });
    } catch (e) {
        console.error(e);
    }
}
/** Destructive confirmation that also works in the web preview, where Alert is a no-op. */
export const confirmAction = (title: string, message: string | undefined, confirmLabel: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(message ? `${title}\n\n${message}` : title)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

/** Writes a JSON backup of the given data and opens the share sheet. */
export const shareJSON = async (data: unknown, filename: string) => {
  const path = `${FileSystem.documentDirectory}${filename}`;
  try {
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'application/json', dialogTitle: 'Export Backup' });
  } catch (error) {
    console.error('Error sharing JSON:', error);
    triggerHaptic('error');
  }
};

/** Turns report HTML into a PDF and opens the share sheet. On web it opens the browser's print dialog (Save as PDF). */
export const sharePDF = async (html: string, filename: string) => {
  try {
    if (Platform.OS === 'web') { await Print.printAsync({ html }); return; }
    const { uri } = await Print.printToFileAsync({ html });
    const path = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.deleteAsync(path, { idempotent: true });
    await FileSystem.moveAsync({ from: uri, to: path });
    await Sharing.shareAsync(path, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Export for Accountant' });
  } catch (error) {
    console.error('Error sharing PDF:', error);
    triggerHaptic('error');
    throw error;
  }
};

/** Original photos as data URIs, for embedding in the PDF. Photos that can't be read are skipped. */
export const photosAsDataUris = async (receipts: Receipt[]): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  if (Platform.OS === 'web') return out;
  for (const r of receipts) {
    if (!r.imageName) continue;
    try {
      out[r.id] = `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(r.imageName, { encoding: FileSystem.EncodingType.Base64 })}`;
    } catch { /* photo missing on disk */ }
  }
  return out;
};
