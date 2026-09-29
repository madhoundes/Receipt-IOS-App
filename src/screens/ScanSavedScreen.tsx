import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn, FadeInDown } from 'react-native-reanimated';
import { Check, Image as ImageIcon, ReceiptText, ImageOff } from 'lucide-react-native';
import { useReceipts } from '../context/ReceiptContext';
import { Button } from '../components/ui';
import { formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { colors, fonts, radius } from '../theme';

export default function ScanSavedScreen({ route, navigation }: any) {
  const { receipts, categories, userProfile } = useReceipts();
  const receipt = receipts.find(r => r.id === route.params?.receiptId);
  if (!receipt) return null;
  const tax = resolveReceiptTax(receipt, categories, userProfile.hstDefaultPercent);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Animated.View entering={ZoomIn.springify().damping(11)} style={styles.badgeOuter}>
          <View style={styles.badge}><Check size={32} color="#FFFFFF" strokeWidth={3} /></View>
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(100)} style={styles.title} accessibilityRole="header">Receipt saved</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(160)} style={styles.sub}>
          {receipt.imageName ? 'Both versions are stored together in your History.' : 'Your receipt is in your History.'}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(240)} style={styles.cards}>
          <View style={styles.card}>
            <View style={styles.thumbDark}>
              {receipt.imageName
                ? <Image source={{ uri: receipt.imageName }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <ImageOff size={26} color="#8A8A90" />}
            </View>
            <View style={styles.label}><ImageIcon size={15} color={colors.text} /><Text style={styles.labelText}>Original</Text></View>
            <Text style={styles.caption}>{receipt.imageName ? 'Photo kept as captured' : 'No photo'}</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.mini}>
              <Text style={styles.miniStore} numberOfLines={1}>{receipt.storeName}</Text>
              <View style={styles.dash} />
              <Row label="HST" value={formatCents(tax.hstCents)} />
              <View style={{ flex: 1 }} />
              <Row label="Total" value={formatCents(toCents(receipt.totalAmount))} strong />
            </View>
            <View style={styles.label}><ReceiptText size={15} color={colors.text} /><Text style={styles.labelText}>Digital copy</Text></View>
            <Text style={styles.caption}>Searchable and exportable</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <Button title="View Receipt" onPress={() => navigation.replace('ReceiptDetail', { receiptId: receipt.id })} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Scan another" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.replace('CameraModal')} />
          <Button title="Done" variant="secondary" style={{ flex: 1 }} onPress={() => navigation.goBack()} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
    <Text style={[styles.miniLabel, strong && { fontFamily: fonts.extrabold, color: colors.text, fontSize: 13 }]}>{label}</Text>
    <Text style={[styles.miniValue, strong && { fontFamily: fonts.monoBold, fontSize: 13 }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, gap: 8 },
  badgeOuter: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  badge: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.extrabold, fontSize: 28, letterSpacing: -0.8, color: colors.text },
  sub: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.textSecondary, textAlign: 'center', maxWidth: 290 },
  cards: { flexDirection: 'row', gap: 12, marginTop: 26, alignSelf: 'stretch' },
  card: { flex: 1, backgroundColor: colors.card, borderRadius: 18, padding: 14, gap: 8 },
  thumbDark: { height: 150, borderRadius: 10, backgroundColor: '#26262B', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  mini: { height: 150, borderRadius: 10, backgroundColor: '#F5F5F8', padding: 12, gap: 6 },
  miniStore: { fontFamily: fonts.extrabold, fontSize: 13, color: colors.text },
  dash: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  miniLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.textSecondary },
  miniValue: { fontFamily: fonts.mono, fontSize: 11, color: colors.text },
  label: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  labelText: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  caption: { fontFamily: fonts.regular, fontSize: 13, color: colors.textSecondary },
  actions: { padding: 16, gap: 10 },
});
