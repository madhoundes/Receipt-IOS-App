import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Info, RotateLeft, Share as ShareIcon, Sparkles, Trash, X } from '../components/icons';
import { ocr } from '../services/ocr';
import { RoundButton, shortDate } from '../components/kit';
import { useReceipts } from '../context/ReceiptContext';
import { confirmAction, shareImage, triggerHaptic } from '../utils/nativeUtils';
import { deleteReceiptPhoto } from '../utils/photos';
import { font, themedStyles } from '../theme';

/** C6 · Original photo, full screen. Rotating only turns the view; the stored file is never edited. */
export default function OriginalPhotoScreen({ route, navigation }: any) {
  const { receipts, updateReceipt } = useReceipts();
  const receipt = receipts.find(r => r.id === route.params?.receiptId);
  const [turns, setTurns] = useState(0);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string>();
  if (!receipt?.imageName) return <View style={styles.container} />;

  const removePhoto = () =>
    confirmAction('Delete Original Photo?', 'The digital copy stays. You will no longer have the photo as proof for returns or a CRA review.', 'Delete Photo', () => {
      triggerHaptic('medium');
      deleteReceiptPhoto(receipt.imageName);
      updateReceipt({ ...receipt, imageName: '' });
      navigation.goBack();
    });

  // Reads the untouched original again and opens the review screen; saving there updates the digital copy.
  const reRead = async () => {
    if (reading) return;
    setReading(true); setError(undefined);
    try {
      const result = await ocr.scanReceipt(receipt.imageName);
      triggerHaptic('success');
      navigation.navigate('ScanResult', { photoUri: receipt.imageName, result, replaceId: receipt.id });
    } catch {
      triggerHaptic('error');
      setError('We couldn’t read this photo. Try again.');
    } finally {
      setReading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Image source={{ uri: receipt.imageName }} resizeMode="contain"
        style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${turns * -90}deg` }] }]} accessibilityLabel={`Original photo of the ${receipt.storeName} receipt`} />
      <SafeAreaView style={styles.ui} pointerEvents="box-none">
        <View style={styles.top}>
          <RoundButton dark label="Close" onPress={() => navigation.goBack()}><X size={20} color="#FFFFFF" /></RoundButton>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title} numberOfLines={1}>{receipt.storeName}</Text>
            <Text style={styles.sub}>{shortDate(receipt.purchaseDate, true)}</Text>
          </View>
          <RoundButton dark label="Share photo" onPress={() => shareImage(receipt.imageName)}><ShareIcon size={20} color="#FFFFFF" /></RoundButton>
        </View>
        <View style={{ alignItems: 'center', gap: 14 }}>
          <View style={styles.pill} accessibilityLiveRegion="polite"><Info size={15} color="#FFFFFF" /><Text style={styles.pillText}>{error ?? (reading ? 'Reading the receipt again…' : 'Original kept for returns and tax records')}</Text></View>
          <View style={styles.bar}>
            <Tool label="Rotate" onPress={() => setTurns(t => (t + 1) % 4)}><RotateLeft size={22} color="#FFFFFF" /></Tool>
            <Tool label={reading ? 'Reading' : 'Re-read'} onPress={reRead}>{reading ? <ActivityIndicator color="#FFFFFF" /> : <Sparkles size={22} color="#FFFFFF" />}</Tool>
            <Tool label="Share" onPress={() => shareImage(receipt.imageName)}><ShareIcon size={22} color="#FFFFFF" /></Tool>
            <Tool label="Delete" danger onPress={removePhoto}><Trash size={22} color="#FF6961" /></Tool>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const Tool = ({ label, onPress, children, danger }: { label: string; onPress: () => void; children: React.ReactNode; danger?: boolean }) => (
  <Pressable onPress={onPress} style={styles.tool} accessibilityRole="button" accessibilityLabel={label}>
    {children}
    <Text style={[styles.toolText, danger && { color: '#FF6961' }]}>{label}</Text>
  </Pressable>
);

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: '#000000' },
  ui: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8 },
  title: { ...font.semibold, fontSize: 17, color: '#FFFFFF' },
  sub: { ...font.regular, fontSize: 13, color: '#AEAEB2' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(40,40,42,0.85)' },
  pillText: { ...font.regular, fontSize: 13, color: '#FFFFFF' },
  bar: { alignSelf: 'stretch', flexDirection: 'row', height: 64, borderRadius: 32, backgroundColor: 'rgba(40,40,42,0.85)', paddingHorizontal: 8 },
  tool: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 44 },
  toolText: { ...font.medium, fontSize: 11, color: '#FFFFFF' },
}));
