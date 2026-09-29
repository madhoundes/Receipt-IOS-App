import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Share, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Share2, FileText, Copy, ImageOff, AlertTriangle, X } from 'lucide-react-native';
import { useReceipts } from '../context/ReceiptContext';
import { CategoryIcon, categoryColor } from '../components/CategoryIcon';
import { resolveReceiptTax, formatCents, toCents } from '../utils/tax';
import { confirmAction, shareCSV, triggerHaptic } from '../utils/nativeUtils';
import { deleteReceiptPhoto } from '../utils/photos';
import { colors, fonts, radius, type } from '../theme';
import type { Receipt } from '../types';

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const days = Math.round((new Date(today.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const receiptSummary = (r: Receipt, hstCents: number) =>
  [
    `${r.storeName} · ${formatDate(r.purchaseDate)}`,
    `Category: ${r.category}${r.subcategory ? ` / ${r.subcategory}` : ''}`,
    `HST: ${formatCents(hstCents)}`,
    `Total: ${formatCents(toCents(r.totalAmount))}`,
  ].join('\n');

export default function ReceiptDetailScreen({ route, navigation }: any) {
  const { receipts, categories, userProfile, updateReceipt, deleteReceipt } = useReceipts();
  const receipt = receipts.find(r => r.id === route.params?.receiptId);
  const [notes, setNotes] = useState(receipt?.notes ?? '');
  const [photoOpen, setPhotoOpen] = useState(false);

  if (!receipt) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={type.headline}>Receipt not found</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ padding: 12 }}><Text style={styles.link}>Go Back</Text></Pressable>
      </SafeAreaView>
    );
  }

  const tax = resolveReceiptTax(receipt, categories, userProfile.hstDefaultPercent);
  const totalCents = toCents(receipt.totalAmount);
  const subtotalCents = tax.status === 'taxed' ? tax.taxableCents : toCents(receipt.subtotal) || totalCents;
  const color = categoryColor(categories, receipt.category);

  const saveNotes = () => {
    if (notes !== (receipt.notes ?? '')) updateReceipt({ ...receipt, notes });
  };

  const applySuggestion = () => {
    triggerHaptic('success');
    updateReceipt({ ...receipt, hstAmount: (tax.suggestedHstCents ?? 0) / 100, hstPercent: tax.percent, taxReviewed: true });
  };

  const confirmDelete = () =>
    confirmAction('Delete Receipt?', 'This removes the receipt and its photo. This action cannot be undone.', 'Delete', () => {
      triggerHaptic('medium');
      deleteReceiptPhoto(receipt.imageName);
      deleteReceipt(receipt.id);
      navigation.goBack();
    });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.navBack} accessibilityRole="button">
          <ChevronLeft size={24} color={colors.accent} />
          <Text style={styles.navText}>Back</Text>
        </Pressable>
        <Pressable
          onPress={() => Share.share({ message: receiptSummary(receipt, tax.hstCents) })}
          style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Share receipt"
        >
          <Share2 size={21} color={colors.accent} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.card, styles.hero]}>
          <CategoryIcon category={receipt.category} size={60} />
          <Text style={styles.store}>{receipt.storeName}</Text>
          <Text style={styles.date}>{formatDate(receipt.purchaseDate)}</Text>
          <Text style={styles.total}>{formatCents(totalCents)}</Text>
          <View style={styles.chips}>
            <Text style={[styles.chip, { color, backgroundColor: `${color}1F` }]}>{receipt.category}</Text>
            {!!receipt.subcategory && <Text style={[styles.chip, styles.chipNeutral]}>{receipt.subcategory}</Text>}
          </View>
        </View>

        {tax.status === 'needsReview' && (
          <View style={styles.warn}>
            <AlertTriangle size={20} color={colors.taxText} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warnTitle}>{tax.reason === 'taxIncluded' ? 'Tax is included, amount not read' : 'No tax line found'}</Text>
              <Text style={styles.warnText}>{tax.percent}% would be {formatCents(tax.suggestedHstCents ?? 0)}</Text>
            </View>
            <Pressable onPress={applySuggestion} style={styles.applyBtn} accessibilityRole="button">
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        )}

        <Pressable
          style={[styles.card, styles.photoRow]}
          onPress={() => receipt.imageName ? setPhotoOpen(true) : undefined}
          accessibilityRole="button"
          accessibilityLabel="View receipt photo"
        >
          {receipt.imageName ? (
            <Image source={{ uri: receipt.imageName }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty]}><ImageOff size={20} color={colors.textMuted} /></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={type.headline}>Original receipt</Text>
            <Text style={styles.meta}>{receipt.imageName ? 'Tap to view full photo' : 'No photo for this demo receipt'}</Text>
          </View>
          {!!receipt.imageName && <ChevronRight size={18} color="#AEAEB2" />}
        </Pressable>

        <Text style={[type.sectionLabel, styles.section]}>Items</Text>
        <View style={styles.card}>
          {(receipt.items ?? []).length === 0 && <Text style={[styles.meta, { padding: 16 }]}>No line items detected.</Text>}
          {(receipt.items ?? []).map((it, i) => (
            <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.qty}>{it.qty}×</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.name}</Text>
                {it.qty > 1 && <Text style={styles.meta}>{formatCents(toCents(it.unitPrice))} each</Text>}
              </View>
              <Text style={type.money}>{formatCents(toCents(it.amount))}</Text>
            </View>
          ))}
          <View style={styles.totals}>
            <TotalRow label="Subtotal" value={formatCents(subtotalCents)} />
            <TotalRow
              label={tax.status === 'taxed' ? `Tax (HST ${tax.percent}%)` : tax.status === 'noTax' ? 'Tax' : 'Tax (not read)'}
              value={formatCents(tax.hstCents)}
            />
            <TotalRow label="Total" value={formatCents(totalCents)} strong />
          </View>
        </View>

        <View style={[styles.card, { marginTop: 18 }]}>
          <View style={styles.row}>
            <Text style={[styles.meta, { flex: 1, fontSize: 16 }]}>Payment Method</Text>
            <Text style={styles.itemName}>{receipt.paymentMethod ?? '—'}</Text>
          </View>
          <View style={[styles.rowBorder, { padding: 16, gap: 6 }]}>
            <Text style={[styles.meta, { fontSize: 16 }]}>Notes</Text>
            <TextInput
              value={notes} onChangeText={setNotes} onBlur={saveNotes} placeholder="Add details..."
              placeholderTextColor={colors.placeholder} multiline style={styles.notes} accessibilityLabel="Notes"
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.action} onPress={() => shareCSV([receipt], `receipt-${receipt.id}.csv`)} accessibilityRole="button">
            <FileText size={22} color={colors.accent} />
            <Text style={styles.actionText}>Export CSV</Text>
          </Pressable>
          <Pressable style={styles.action} onPress={() => Share.share({ message: receiptSummary(receipt, tax.hstCents) })} accessibilityRole="button">
            <Copy size={22} color={colors.accent} />
            <Text style={styles.actionText}>Copy Summary</Text>
          </Pressable>
        </View>

        <Pressable style={[styles.card, styles.delete]} onPress={confirmDelete} accessibilityRole="button">
          <Text style={styles.deleteText}>Delete Receipt</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={photoOpen} animationType="fade" onRequestClose={() => setPhotoOpen(false)}>
        <View style={styles.viewer}>
          <Image source={{ uri: receipt.imageName }} style={{ flex: 1 }} resizeMode="contain" />
          <Pressable onPress={() => setPhotoOpen(false)} style={styles.viewerClose} accessibilityLabel="Close photo">
            <X size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const TotalRow = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <View style={styles.totalRow}>
    <Text style={strong ? styles.totalStrong : styles.totalLabel}>{label}</Text>
    <Text style={[type.money, strong && { fontFamily: fonts.monoBold, fontSize: 17 }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navBack: { flexDirection: 'row', alignItems: 'center', height: 44, paddingRight: 8 },
  navText: { fontFamily: fonts.medium, fontSize: 17, color: colors.accent },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  hero: { alignItems: 'center', padding: 20, gap: 4, borderRadius: radius.xl },
  store: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text, marginTop: 10 },
  date: { fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted },
  total: { fontFamily: fonts.mono, fontSize: 40, letterSpacing: -1, color: colors.text, marginVertical: 6 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { fontFamily: fonts.bold, fontSize: 13, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, overflow: 'hidden' },
  chipNeutral: { color: '#3A3A40', backgroundColor: colors.bg, fontFamily: fonts.semibold },
  warn: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 14, borderRadius: radius.lg,
    backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.warnBorder,
  },
  warnTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.warnText },
  warnText: { fontFamily: fonts.regular, fontSize: 13, color: colors.warnText, marginTop: 2 },
  applyBtn: { backgroundColor: colors.accent, borderRadius: 18, paddingHorizontal: 16, height: 36, justifyContent: 'center' },
  applyText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFFFFF' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, marginTop: 14 },
  thumb: { width: 52, height: 68, borderRadius: 8, backgroundColor: '#F4F3EF' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.separator },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted },
  section: { marginTop: 22, marginBottom: 8, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 52 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  qty: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted, width: 24 },
  itemName: { fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  totals: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, padding: 16, gap: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary },
  totalStrong: { fontFamily: fonts.extrabold, fontSize: 17, color: colors.text },
  notes: { fontFamily: fonts.regular, fontSize: 16, color: colors.text, minHeight: 44, padding: 0 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  action: { flex: 1, height: 76, borderRadius: radius.lg, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 6 },
  actionText: { fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  delete: { marginTop: 18, height: 52, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.danger },
  link: { fontFamily: fonts.bold, fontSize: 16, color: colors.accent },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerClose: { position: 'absolute', top: 60, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
