import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Receipt } from '../types';
import { normalizeStoreName } from '../constants';

export const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
  // Haptics don't exist on web, and a failed buzz should never break a tap.
  if (Platform.OS === 'web') return;
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

const escapeCSV = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const generateCSVString = (receipts: Receipt[]): string => {
  const headers = [
    'id', 'storeName', 'purchaseDate', 'category', 'subcategory', 
    'currency', 'subtotal', 'taxPercent', 'taxAmount', 'totalAmount', 
    'paymentMethod', 'notes', 'brand'
  ];

  const rows = receipts.map(r => {
    const safeTax = r.hstAmount || 0;
    const safeTotal = r.totalAmount || 0;
    const safeSub = r.subtotal || (safeTotal - safeTax);
    
    return [
      r.id, r.storeName, r.purchaseDate, r.category, r.subcategory || '', 
      'CAD', safeSub.toFixed(2), r.hstPercent || '', safeTax.toFixed(2), 
      safeTotal.toFixed(2), r.paymentMethod || '', r.notes || '', 
      normalizeStoreName(r.storeName)
    ].map(escapeCSV).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const shareCSV = async (receipts: Receipt[], filename: string) => {
  const csvData = generateCSVString(receipts);
  const path = `${FileSystem.documentDirectory}${filename}`;
  
  try {
    await FileSystem.writeAsStringAsync(path, csvData, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Receipts' });
  } catch (error) {
    console.error("Error sharing CSV:", error);
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
