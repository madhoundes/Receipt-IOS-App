import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { FileText, Image as ImageIcon, Scan } from '../components/icons';
import { Illustration } from '../components/Illustration';
import { MerchantAvatar } from '../components/MerchantAvatar';
import { useReceipts } from '../context/ReceiptContext';
import { Button } from '../components/ui';
import { formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { colors, font, radius } from '../theme';

/** B8 · Receipt saved. */
export default function ScanSavedScreen({ route, navigation }: any) {
  const { receipts, categories, userProfile } = useReceipts();
  const receipt = receipts.find(r => r.id === route.params?.receiptId);
  if (!receipt) return null;
  const tax = resolveReceiptTax(receipt, categories, userProfile.hstDefaultPercent);
  const date = new Date(receipt.purchaseDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.body}>
        <Illustration name="allCaughtUp" size={200} label="Receipt saved" />
        <Animated.Text entering={FadeInDown.delay(80)} style={styles.title} accessibilityRole="header">Receipt saved</Animated.Text>
        <Animated.Text entering={FadeInDown.delay(140)} style={styles.sub}>
          {receipt.imageName
            ? 'Searchable and exportable, with the original photo kept.'
            : 'Searchable and exportable.'}
        </Animated.Text>

        <Animated.View entering={FadeInDown.delay(220)} style={styles.card}>
          <View style={styles.top}>
            <MerchantAvatar name={receipt.storeName} category={receipt.category} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.store} numberOfLines={1}>{receipt.storeName}</Text>
              <Text style={styles.meta}>{date} · {receipt.category}</Text>
            </View>
          </View>
          <View style={styles.sep} />
          <Row label="HST" value={formatCents(tax.hstCents)} tax />
          <Row label="Total" value={formatCents(toCents(receipt.totalAmount))} strong />
          <View style={styles.chips}>
            {!!receipt.imageName && <Chip icon={<ImageIcon size={14} color={colors.text} />} label="Original" />}
            <Chip icon={<FileText size={14} color={colors.text} />} label="Digital copy" />
          </View>
        </Animated.View>
      </View>

      <View style={styles.actions}>
        <Button title="View Receipt" onPress={() => navigation.replace('ReceiptDetail', { receiptId: receipt.id })} />
        <Button title="Scan Another" variant="tinted" icon={<Scan size={20} color={colors.accent} />} onPress={() => navigation.replace('CameraModal')} />
        <Button title="Done" variant="ghost" onPress={() => navigation.goBack()} />
      </View>
    </SafeAreaView>
  );
}

const Row = ({ label, value, strong, tax }: { label: string; value: string; strong?: boolean; tax?: boolean }) => (
  <View style={styles.row}>
    <Text style={[styles.rowLabel, strong && { color: colors.text }]}>{label}</Text>
    <Text style={[styles.rowValue, tax && { color: colors.tax, ...font.bold }, strong && font.bold]}>{value}</Text>
  </View>
);

const Chip = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
  <View style={styles.chip}>{icon}<Text style={styles.chipText}>{label}</Text></View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, alignItems: 'center', paddingTop: 40, paddingHorizontal: 16, gap: 8 },
  title: { ...font.bold, fontSize: 28, lineHeight: 34, color: colors.text },
  sub: { ...font.regular, fontSize: 17, lineHeight: 22, color: colors.textSecondary, textAlign: 'center', maxWidth: 300 },
  card: { alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, gap: 10, marginTop: 22 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  store: { ...font.semibold, fontSize: 17, color: colors.text },
  meta: { ...font.regular, fontSize: 15, color: colors.textSecondary },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { ...font.regular, fontSize: 17, color: colors.textSecondary },
  rowValue: { ...font.regular, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', gap: 8, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: colors.fill },
  chipText: { ...font.semibold, fontSize: 13, color: colors.text },
  actions: { padding: 16, gap: 10 },
});
