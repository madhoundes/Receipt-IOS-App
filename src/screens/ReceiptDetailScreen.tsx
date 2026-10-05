import React, { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle, ChevronLeft, ChevronRight, FileDown, Image as ImageIcon, Lock, Maximize2, More, Share as ShareIcon, Undo,
} from '../components/icons';
import { CategoryIcon, categoryColor } from '../components/CategoryIcon';
import { CategoryPickerSheet } from '../components/CategoryPickerSheet';
import { OptionSheet, RoundButton, kit, shortDate } from '../components/kit';
import { Button, Segmented } from '../components/ui';
import { MerchantAvatar, hasBrandLogo } from '../components/MerchantAvatar';
import { useReceipts } from '../context/ReceiptContext';
import { confirmAction, shareCSV, shareImage, triggerHaptic } from '../utils/nativeUtils';
import { deleteReceiptPhoto } from '../utils/photos';
import { cancelReturnReminder, scheduleReturnReminder } from '../utils/reminders';
import { daysLeft, returnByFor } from '../utils/returns';
import { buildCsv } from '../utils/csv';
import { formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { colors, font, radius, type, themedStyles, soft } from '../theme';
import type { Receipt } from '../types';

const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });

export const receiptSummary = (r: Receipt, hstCents: number) =>
  [
    `${r.storeName} · ${longDate(r.purchaseDate)}`,
    `Category: ${r.category}${r.subcategory ? ` / ${r.subcategory}` : ''}`,
    `HST: ${formatCents(hstCents)}`,
    `Total: ${formatCents(toCents(r.totalAmount))}`,
  ].join('\n');

type Action = 'category' | 'return' | 'share' | 'delete';

/** C4 Receipt · Digital copy and C5 Receipt · Original. */
export default function ReceiptDetailScreen({ route, navigation }: any) {
  const { receipts, categories, userProfile, updateReceipt, deleteReceipt } = useReceipts();
  const receipt = receipts.find(r => r.id === route.params?.receiptId);
  const [tab, setTab] = useState<'digital' | 'original'>(route.params?.tab === 'original' ? 'original' : 'digital');
  const [notes, setNotes] = useState(receipt?.notes ?? '');
  const [menu, setMenu] = useState(false);
  const [picker, setPicker] = useState(false);

  if (!receipt) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={type.headline}>Receipt not found</Text>
        <Button title="Go Back" variant="ghost" onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  const tax = resolveReceiptTax(receipt, categories, userProfile.hstDefaultPercent);
  const totalCents = toCents(receipt.totalAmount);
  const subtotalCents = tax.status === 'taxed' ? tax.taxableCents : toCents(receipt.subtotal) || totalCents;
  const color = categoryColor(categories, receipt.category);
  const left = receipt.returnBy ? daysLeft(receipt.returnBy, new Date()) : null;
  const windowLen = userProfile.returnWindowDays ?? 30;

  const saveNotes = () => { if (notes !== (receipt.notes ?? '')) updateReceipt({ ...receipt, notes }); };
  const share = () => Share.share({ message: receiptSummary(receipt, tax.hstCents) });
  const applySuggestion = () => {
    triggerHaptic('success');
    updateReceipt({ ...receipt, hstAmount: (tax.suggestedHstCents ?? 0) / 100, hstPercent: tax.percent, taxReviewed: true });
  };
  const markNoTax = () => { triggerHaptic('light'); updateReceipt({ ...receipt, hstAmount: 0, hstPercent: 0, taxReviewed: true }); };
  const toggleReturn = async () => {
    triggerHaptic('light');
    if (receipt.returnBy) {
      cancelReturnReminder(receipt.returnNotificationId);
      updateReceipt({ ...receipt, returnBy: undefined, returnNotificationId: undefined });
      return;
    }
    const next = { ...receipt, returnBy: returnByFor(receipt.purchaseDate, windowLen) };
    updateReceipt(next);
    // The reminder is saved first; the notification is added once permission is known.
    const id = await scheduleReturnReminder(next, userProfile.remindDaysBefore ?? 2);
    if (id) updateReceipt({ ...next, returnNotificationId: id });
  };
  const confirmDelete = () =>
    confirmAction('Delete Receipt?', 'This removes the digital copy and the original photo. This cannot be undone.', 'Delete', () => {
      triggerHaptic('medium');
      deleteReceiptPhoto(receipt.imageName);
      cancelReturnReminder(receipt.returnNotificationId);
      deleteReceipt(receipt.id);
      navigation.goBack();
    });
  const onAction = (a: Action) => {
    setMenu(false);
    if (a === 'category') setPicker(true);
    if (a === 'return') toggleReturn();
    if (a === 'share') share();
    if (a === 'delete') confirmDelete();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.nav}>
        <RoundButton label="Back" onPress={() => navigation.goBack()}><ChevronLeft size={20} color={colors.text} /></RoundButton>
        <Text style={styles.navTitle} accessibilityRole="header">Receipt</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <RoundButton label="Share receipt" onPress={share}><ShareIcon size={20} color={colors.text} /></RoundButton>
          <RoundButton label="More actions" onPress={() => setMenu(true)}><More size={20} color={colors.text} /></RoundButton>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
        <Segmented options={[{ value: 'digital', label: 'Digital copy' }, { value: 'original', label: 'Original' }]} value={tab} onChange={setTab} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {tab === 'digital' ? (
          <>
            <View style={styles.paper}>
              {hasBrandLogo(receipt.storeName) && (
                <View style={{ alignItems: 'center', marginBottom: 10 }}><MerchantAvatar name={receipt.storeName} category={receipt.category} size={64} badge={false} /></View>
              )}
              <Text style={styles.paperStore}>{receipt.storeName.toUpperCase()}</Text>
              <Text style={styles.paperMeta}>{longDate(receipt.purchaseDate)}</Text>
              <View style={styles.dash} />
              {(receipt.items ?? []).length === 0 && <Text style={[styles.paperMeta, { textAlign: 'left' }]}>No line items on this receipt.</Text>}
              {(receipt.items ?? []).map((it, i) => (
                <View key={i} style={styles.paperRow}>
                  <Text style={[styles.paperText, { flex: 1 }]} numberOfLines={1}>{it.qty > 1 ? `${it.qty} × ` : ''}{it.name}</Text>
                  <Text style={styles.paperText}>{(toCents(it.amount) / 100).toFixed(2)}</Text>
                </View>
              ))}
              <View style={styles.dash} />
              <PaperRow label="Subtotal" value={(subtotalCents / 100).toFixed(2)} />
              <PaperRow
                label={tax.status === 'taxed' ? `HST ${tax.percent ?? ''}%` : tax.status === 'noTax' ? 'HST' : 'HST not read'}
                value={(tax.hstCents / 100).toFixed(2)} tax />
              <View style={[styles.paperRow, { marginTop: 6 }]}>
                <Text style={styles.paperTotal}>TOTAL</Text>
                <Text style={styles.paperTotal}>{formatCents(totalCents)}</Text>
              </View>
              {!!receipt.paymentMethod && <Text style={[styles.paperMeta, { textAlign: 'left', marginTop: 4 }]}>{receipt.paymentMethod.toUpperCase()}</Text>}
            </View>

            <View style={styles.chips}>
              <Pressable onPress={() => setPicker(true)} style={[styles.chip, { backgroundColor: soft(color) }]} accessibilityRole="button" accessibilityLabel={`Category ${receipt.category}. Change`}>
                <CategoryIcon category={receipt.category} size={20} />
                <Text style={[styles.chipText, { color }]}>{receipt.category}{receipt.subcategory ? ` · ${receipt.subcategory}` : ''}</Text>
              </Pressable>
              <Pressable onPress={() => (receipt.returnBy ? navigation.navigate('Reminders') : toggleReturn())} style={[styles.chip, { backgroundColor: colors.taxSoft }]} accessibilityRole="button">
                <Undo size={16} color={colors.tax} />
                <Text style={[styles.chipText, { color: colors.tax }]}>
                  {receipt.returnBy ? (left! >= 0 ? `Return by ${shortDate(receipt.returnBy)}` : 'Return window closed') : 'Add return reminder'}
                </Text>
              </Pressable>
            </View>

            {tax.status === 'needsReview' && (
              <View style={styles.warn} accessibilityLiveRegion="polite">
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <AlertTriangle size={20} color={colors.tax} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.warnTitle}>{tax.reason === 'taxIncluded' ? 'Tax is included in the price' : 'No tax line found'}</Text>
                    <Text style={styles.warnText}>{tax.percent}% would be {formatCents(tax.suggestedHstCents ?? 0)}. It stays out of your HST total until you confirm.</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={applySuggestion} style={styles.warnBtn} accessibilityRole="button"><Text style={styles.warnBtnText}>Add {formatCents(tax.suggestedHstCents ?? 0)}</Text></Pressable>
                  <Pressable onPress={markNoTax} style={[styles.warnBtn, { backgroundColor: colors.elevated }]} accessibilityRole="button"><Text style={[styles.warnBtnText, { color: colors.text }]}>No tax</Text></Pressable>
                </View>
              </View>
            )}

            <View style={kit.card}>
              {!!receipt.imageName && (
                <LinkRow icon={<ImageIcon size={20} color={colors.accent} />} label="View Original Photo" onPress={() => setTab('original')} first />
              )}
              <LinkRow icon={<FileDown size={20} color={colors.accent} />} label="Export as CSV" first={!receipt.imageName}
                onPress={() => shareCSV(buildCsv([tax]), `receipt-${receipt.id}.csv`)} />
            </View>

            <Text style={[kit.sectionLabel, { marginTop: 6 }]}>Notes</Text>
            <View style={[kit.card, { paddingHorizontal: 16 }]}>
              <TextInput value={notes} onChangeText={setNotes} onBlur={saveNotes} placeholder="Add a note for your accountant"
                placeholderTextColor={colors.placeholder} multiline style={styles.notes} accessibilityLabel="Notes" />
            </View>
          </>
        ) : receipt.imageName ? (
          <>
            <Pressable style={styles.photoBox} onPress={() => navigation.navigate('OriginalPhoto', { receiptId: receipt.id })}
              accessibilityRole="button" accessibilityLabel="Open the original photo full screen">
              <Image source={{ uri: receipt.imageName }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
              <View style={styles.lockBadge}><Lock size={13} color="#FFFFFF" /><Text style={styles.lockText}>Unedited original</Text></View>
              <View style={styles.expand}><Maximize2 size={16} color="#FFFFFF" /></View>
            </Pressable>
            <TwoCopies />
            <Text style={[kit.sectionLabel, { marginTop: 6 }]}>Original file</Text>
            <View style={kit.card}>
              <InfoRow label="Purchased" value={longDate(receipt.purchaseDate)} first />
              <InfoRow label="Source" value="Camera or photo import" />
              <InfoRow label="Stored" value={Platform.OS === 'web' ? 'In this browser' : 'On this device'} />
              <Pressable onPress={() => setTab('digital')} accessibilityRole="button">
                <InfoRow label="Linked digital copy" value="View  ›" accent />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Button title="Full Screen" variant="tinted" compact style={{ flex: 1 }} icon={<Maximize2 size={18} color={colors.accent} />}
                onPress={() => navigation.navigate('OriginalPhoto', { receiptId: receipt.id })} />
              <Button title="Share Photo" variant="tinted" compact style={{ flex: 1 }} icon={<ShareIcon size={18} color={colors.accent} />}
                onPress={() => shareImage(receipt.imageName)} />
            </View>
          </>
        ) : (
          <>
            <View style={[kit.card, styles.noPhoto]}>
              <ImageIcon size={28} color={colors.placeholder} />
              <Text style={type.headline}>No original photo</Text>
              <Text style={[type.subhead, { textAlign: 'center' }]}>This receipt was entered by hand, so only the digital copy exists.</Text>
            </View>
            <TwoCopies />
          </>
        )}
      </ScrollView>

      <OptionSheet<Action>
        visible={menu} onClose={() => setMenu(false)} onPick={onAction}
        options={[
          { value: 'category', label: 'Change Category' },
          { value: 'return', label: receipt.returnBy ? 'Remove Return Reminder' : 'Add Return Reminder', sub: receipt.returnBy ? undefined : `${windowLen}-day window from the purchase date` },
          { value: 'share', label: 'Share Summary' },
          { value: 'delete', label: 'Delete Receipt', danger: true },
        ]}
      />
      <CategoryPickerSheet
        visible={picker} category={receipt.category} subcategory={receipt.subcategory} onClose={() => setPicker(false)}
        onDone={(category, subcategory) => { updateReceipt({ ...receipt, category, subcategory }); setPicker(false); }}
        onManage={() => navigation.navigate('ManageCategories')}
      />
    </SafeAreaView>
  );
}

const TwoCopies = () => (
  <View style={styles.note}>
    <Text style={styles.noteText}>
      <Text style={font.bold}>Two copies are kept. </Text>
      The original photo is never changed, so you always have proof for returns, warranty claims or a CRA review. The digital copy is what you search, edit and export.
    </Text>
  </View>
);

const PaperRow = ({ label, value, tax }: { label: string; value: string; tax?: boolean }) => (
  <View style={styles.paperRow}>
    <Text style={[styles.paperText, tax && { color: colors.tax, ...font.monoBold }]}>{label}</Text>
    <Text style={[styles.paperText, tax && { color: colors.tax, ...font.monoBold }]}>{value}</Text>
  </View>
);

const LinkRow = ({ icon, label, onPress, first }: { icon: React.ReactNode; label: string; onPress: () => void; first?: boolean }) => (
  <Pressable onPress={onPress} accessibilityRole="button" style={[styles.linkRow, !first && kit.rowBorder]}>
    {icon}
    <Text style={[type.body, { flex: 1 }]}>{label}</Text>
    <ChevronRight size={16} color={colors.chevron} />
  </Pressable>
);

const InfoRow = ({ label, value, first, accent }: { label: string; value: string; first?: boolean; accent?: boolean }) => (
  <View style={[styles.infoRow, !first && kit.rowBorder]}>
    <Text style={[type.body, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[type.body, { flexShrink: 1, textAlign: 'right' }, accent && { color: colors.accent }]} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  navTitle: { position: 'absolute', left: 110, right: 110, textAlign: 'center', ...font.semibold, fontSize: 17, color: colors.text },
  content: { padding: 16, paddingTop: 10, paddingBottom: 48, gap: 12 },
  paper: {
    backgroundColor: colors.paper, borderRadius: 6, padding: 20, gap: 6, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.paperEdge,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  paperStore: { ...font.bold, fontSize: 20, letterSpacing: 3, color: colors.paperInk, textAlign: 'center' },
  paperMeta: { ...font.mono, fontSize: 12, color: colors.paperMuted, textAlign: 'center' },
  dash: { borderBottomWidth: 1, borderStyle: 'dashed', borderColor: colors.paperRule, marginVertical: 6 },
  paperRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  paperText: { ...font.mono, fontSize: 13, lineHeight: 20, color: colors.paperInk },
  paperTotal: { ...font.monoBold, fontSize: 17, color: colors.paperInk },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 12, borderRadius: 17 },
  chipText: { ...font.semibold, fontSize: 15 },
  warn: { backgroundColor: colors.warnBg, borderColor: colors.warnBorder, borderWidth: 1, borderRadius: radius.lg, padding: 14, gap: 12 },
  warnTitle: { ...font.semibold, fontSize: 17, color: colors.warnText },
  warnText: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.warnText, marginTop: 2 },
  warnBtn: { flex: 1, height: 44, borderRadius: 22, backgroundColor: colors.taxFill, alignItems: 'center', justifyContent: 'center' },
  warnBtnText: { ...font.semibold, fontSize: 17, color: '#FFFFFF' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 48, backgroundColor: colors.card },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 16, minHeight: 46, backgroundColor: colors.card },
  notes: { ...font.regular, fontSize: 17, color: colors.text, minHeight: 64, paddingVertical: 12, textAlignVertical: 'top' },
  photoBox: { height: 330, borderRadius: radius.xl, backgroundColor: '#26241F', overflow: 'hidden' },
  lockBadge: {
    position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10,
    borderRadius: 14, backgroundColor: 'rgba(12,12,13,0.78)',
  },
  lockText: { ...font.semibold, fontSize: 13, color: '#FFFFFF' },
  expand: { position: 'absolute', right: 12, bottom: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(12,12,13,0.78)', alignItems: 'center', justifyContent: 'center' },
  note: { backgroundColor: colors.accentSoft, borderRadius: radius.lg, padding: 14 },
  noteText: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.accentSoftText },
  noPhoto: { alignItems: 'center', gap: 6, padding: 28 },
}));
