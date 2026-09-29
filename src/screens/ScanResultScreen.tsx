import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image, Modal, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ImageIcon, ReceiptText, Check, AlertTriangle, ScanLine, ChevronDown, X, Maximize2 } from 'lucide-react-native';
import { useReceipts } from '../context/ReceiptContext';
import { CategoryIcon, categoryColor } from '../components/CategoryIcon';
import { Button } from '../components/ui';
import { checkTotals, formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { persistReceiptPhoto } from '../utils/photos';
import { triggerHaptic } from '../utils/nativeUtils';
import { colors, fonts, radius, type } from '../theme';
import type { OcrResult } from '../services/ocr';
import type { Receipt } from '../types';

const toInput = (n?: number) => (n == null ? '' : n.toFixed(2));
const parseMoney = (s: string): number | undefined => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
};
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function ScanResultScreen({ route, navigation }: any) {
  const photoUri: string | null = route.params?.photoUri ?? null;
  const result: OcrResult | null = route.params?.result ?? null;
  const { categories, userProfile, addReceipt } = useReceipts();

  const [tab, setTab] = useState<'original' | 'digital'>(photoUri ? 'original' : 'digital');
  const [store, setStore] = useState(result?.storeName ?? '');
  const [date, setDate] = useState(result?.purchaseDate.slice(0, 10) ?? todayISO());
  // With auto-categorize off, the user always picks the category.
  const [category, setCategory] = useState(result && userProfile.autoCategorize ? result.category : 'Other');
  const [subcategory, setSubcategory] = useState(userProfile.autoCategorize ? result?.subcategory : undefined);
  const [subtotal, setSubtotal] = useState(toInput(result?.subtotal));
  const [hst, setHst] = useState(toInput(result?.hstAmount));
  const [hstPercent, setHstPercent] = useState(result?.hstPercent != null ? String(result.hstPercent) : '');
  const [total, setTotal] = useState(toInput(result?.totalAmount));
  const [taxReviewed, setTaxReviewed] = useState(false);
  const [picker, setPicker] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const draft: Receipt = useMemo(() => ({
    id: 'draft', imageName: photoUri ?? '', storeName: store.trim(),
    purchaseDate: new Date(`${date}T12:00:00`).toISOString(),
    totalAmount: parseMoney(total) ?? 0, subtotal: parseMoney(subtotal), hstAmount: parseMoney(hst),
    hstPercent: parseMoney(hstPercent), category, subcategory, items: result?.items ?? [], taxReviewed,
  }), [photoUri, store, date, total, subtotal, hst, hstPercent, category, subcategory, result, taxReviewed]);

  const tax = resolveReceiptTax(draft, categories, userProfile.hstDefaultPercent);
  const check = checkTotals(draft.subtotal, draft.hstAmount, parseMoney(total));
  const found = [result?.subtotal, result?.hstAmount, result?.totalAmount].filter(v => v != null).length;

  const fixFromTotals = () => {
    const t = parseMoney(total), s = parseMoney(subtotal);
    if (t == null || s == null) return;
    const newHst = (toCents(t) - toCents(s)) / 100;
    setHst(newHst.toFixed(2));
    if (s > 0) setHstPercent(String(Math.round((newHst / s) * 1000) / 10));
    setTaxReviewed(true);
    triggerHaptic('success');
  };
  const applySuggested = () => {
    const suggested = (tax.suggestedHstCents ?? 0) / 100;
    setHst(suggested.toFixed(2));
    // Tax-included receipts rarely print a subtotal; derive it so the totals add up.
    const t = parseMoney(total);
    if (parseMoney(subtotal) == null && t != null) setSubtotal(((toCents(t) - toCents(suggested)) / 100).toFixed(2));
    setHstPercent(String(tax.percent ?? userProfile.hstDefaultPercent));
    setTaxReviewed(true);
    triggerHaptic('success');
  };
  const markNoTax = () => { setHst('0.00'); setHstPercent('0'); setTaxReviewed(true); triggerHaptic('light'); };

  const save = async () => {
    if (!draft.storeName) { setError('Add the store name.'); setTab('digital'); triggerHaptic('error'); return; }
    if (!(draft.totalAmount > 0)) { setError('Add the total.'); setTab('digital'); triggerHaptic('error'); return; }
    if (Number.isNaN(new Date(`${date}T12:00:00`).getTime())) { setError('Use the date format YYYY-MM-DD.'); setTab('digital'); return; }
    setSaving(true);
    try {
      const id = `r_${Date.now()}`;
      const imageName = photoUri ? await persistReceiptPhoto(photoUri, id) : '';
      addReceipt({ ...draft, id, imageName });
      triggerHaptic('success');
      navigation.replace('ScanSaved', { receiptId: id });
    } catch {
      setError('Could not save the receipt. Please try again.');
      setSaving(false);
    }
  };

  const color = categoryColor(categories, category);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.replace('CameraModal')} style={styles.navBtn} accessibilityRole="button">
          <Text style={styles.navText}>{photoUri ? 'Retake' : 'Scan instead'}</Text>
        </Pressable>
        <Text style={type.headline}>{result ? 'Scan Result' : 'New Receipt'}</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.navBtn} accessibilityRole="button" accessibilityLabel="Discard">
          <X size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <View style={styles.segment}>
        {(['original', 'digital'] as const).map(t => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.segItem, tab === t && styles.segActive]}
            accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
            {t === 'original' ? <ImageIcon size={15} color={colors.text} /> : <ReceiptText size={15} color={colors.text} />}
            <Text style={[styles.segText, tab === t && styles.segTextActive]}>{t === 'original' ? 'Original' : 'Digital copy'}</Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tab === 'original' ? (
            <>
              <Pressable style={styles.photoBox} onPress={() => photoUri && setViewer(true)} accessibilityLabel="View full photo">
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
                ) : (
                  <Text style={styles.noPhoto}>No photo. This receipt is entered by hand.</Text>
                )}
                {!!result && (
                  <View style={styles.ocrBadge}><ScanLine size={13} color="#5FD3E0" /><Text style={styles.ocrText}>OCR · {found} key values found</Text></View>
                )}
                {!!photoUri && <View style={styles.expand}><Maximize2 size={16} color="#FFFFFF" /></View>}
              </Pressable>

              <View style={styles.card}>
                <View style={styles.keyRow}>
                  <KeyValue label="Subtotal" swatch="#0062CC" value={draft.subtotal} />
                  <KeyValue label={`HST ${draft.hstPercent ?? ''}${draft.hstPercent != null ? '%' : ''}`} swatch={colors.tax} value={draft.hstAmount} />
                  <KeyValue label="Total" swatch={colors.success} value={parseMoney(total)} bold />
                </View>
                <View style={styles.hr} />
                <View style={styles.keyFoot}>
                  <TotalsLine check={check} subtotal={draft.subtotal} hst={draft.hstAmount} total={parseMoney(total)} />
                  {!!photoUri && <Text style={styles.meta}>Original photo kept</Text>}
                </View>
              </View>
              <Button title="Review digital copy" variant="secondary" onPress={() => setTab('digital')} />
            </>
          ) : (
            <>
              <View style={[styles.card, styles.header]}>
                <CategoryIcon category={category} size={48} />
                <View style={{ flex: 1 }}>
                  <TextInput value={store} onChangeText={setStore} placeholder="Store name" placeholderTextColor={colors.placeholder}
                    style={styles.storeInput} accessibilityLabel="Store name" />
                  <Pressable onPress={() => setPicker(true)} style={styles.catRow} accessibilityRole="button" accessibilityLabel="Change category">
                    <Text style={[styles.catChip, { color, backgroundColor: `${color}1F` }]}>{category}{subcategory ? ` · ${subcategory}` : ''}</Text>
                    <ChevronDown size={16} color={colors.textMuted} />
                  </Pressable>
                </View>
              </View>

              {(result?.items ?? []).length > 0 && (
                <View style={styles.card}>
                  {result!.items.map((it, i) => (
                    <View key={i} style={[styles.itemRow, i > 0 && styles.rowBorder]}>
                      <Text style={styles.qty}>{it.qty}×</Text>
                      <Text style={styles.itemName}>{it.name}</Text>
                      <Text style={type.money}>{formatCents(toCents(it.amount))}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.card}>
                <MoneyField label="Date" value={date} onChange={setDate} placeholder="YYYY-MM-DD" keyboard="numbers-and-punctuation" />
                <MoneyField label="Subtotal" value={subtotal} onChange={v => { setSubtotal(v); setTaxReviewed(false); }} border />
                <MoneyField label="HST" value={hst} onChange={v => { setHst(v); setTaxReviewed(true); }} border />
                <MoneyField label="HST %" value={hstPercent} onChange={setHstPercent} border suffix="%" placeholder={String(userProfile.hstDefaultPercent)} />
                <MoneyField label="Total" value={total} onChange={v => { setTotal(v); setTaxReviewed(false); }} border strong />
              </View>

              {check && !check.ok ? (
                <Banner tone="warn" title="Totals don't match. Please review values."
                  text={`Subtotal + HST is ${formatCents(Math.abs(check.diffCents))} ${check.diffCents > 0 ? 'less' : 'more'} than the total.`}
                  action={{ label: `Set HST to ${formatCents(toCents(parseMoney(total) ?? 0) - toCents(draft.subtotal ?? 0))}`, onPress: fixFromTotals }} />
              ) : tax.status === 'needsReview' && draft.totalAmount > 0 ? (
                <Banner tone="warn" title={tax.reason === 'taxIncluded' ? 'Tax is included in the price' : 'No tax line found'}
                  text={`${tax.percent}% of this total would be ${formatCents(tax.suggestedHstCents ?? 0)}.`}
                  action={{ label: `Add ${formatCents(tax.suggestedHstCents ?? 0)}`, onPress: applySuggested }}
                  secondary={{ label: 'No tax', onPress: markNoTax }} />
              ) : check?.ok ? (
                <Banner tone="ok" title="Totals match" text="Subtotal + HST = Total" />
              ) : null}
            </>
          )}
          {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button title="Save Receipt" onPress={save} loading={saving} />
      </View>

      <Modal visible={picker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPicker(false)}>
        <View style={styles.pickerWrap}>
          <View style={styles.pickerHead}>
            <Pressable onPress={() => setPicker(false)} style={styles.navBtn}><Text style={styles.navText}>Cancel</Text></Pressable>
            <Text style={type.headline}>Select Category</Text>
            <View style={styles.navBtn} />
          </View>
          <FlatList
            data={categories.filter(c => c.visibility === 'visible')}
            keyExtractor={c => c.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => (
              <Pressable
                onPress={() => { setCategory(item.name); setSubcategory(item.subcategories[0]?.name); setPicker(false); }}
                style={[styles.pickRow, index === 0 && styles.pickFirst, styles.rowBorder]}
                accessibilityRole="button"
              >
                <CategoryIcon category={item.name} size={32} />
                <Text style={[styles.itemName, { flex: 1 }, item.name === category && { fontFamily: fonts.bold }]}>{item.name}</Text>
                {item.name === category && <Check size={20} color={colors.accent} strokeWidth={2.8} />}
              </Pressable>
            )}
          />
        </View>
      </Modal>

      <Modal visible={viewer} animationType="fade" onRequestClose={() => setViewer(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {!!photoUri && <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="contain" />}
          <Pressable onPress={() => setViewer(false)} style={styles.viewerClose} accessibilityLabel="Close photo"><X size={22} color="#FFFFFF" /></Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const KeyValue = ({ label, swatch, value, bold }: { label: string; swatch: string; value?: number; bold?: boolean }) => (
  <View style={{ flex: 1, gap: 4 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 2, borderColor: swatch }} />
      <Text style={[styles.keyLabel, { color: swatch }]}>{label}</Text>
    </View>
    <Text style={[styles.keyValue, bold && { fontFamily: fonts.monoBold }]}>{value == null ? '—' : formatCents(toCents(value))}</Text>
  </View>
);

const TotalsLine = ({ check, subtotal, hst, total }: { check: ReturnType<typeof checkTotals>; subtotal?: number; hst?: number; total?: number }) => {
  if (!check) return <Text style={styles.meta}>Some values weren't found</Text>;
  const txt = `${subtotal?.toFixed(2)} + ${hst?.toFixed(2)} ${check.ok ? '=' : '≠'} ${total?.toFixed(2)}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {check.ok ? <Check size={15} color={colors.success} strokeWidth={3} /> : <AlertTriangle size={15} color={colors.taxText} />}
      <Text style={[styles.checkText, { color: check.ok ? colors.success : colors.taxText }]}>{txt}</Text>
    </View>
  );
};

const MoneyField = ({ label, value, onChange, border, strong, placeholder = '0.00', suffix, keyboard = 'decimal-pad' }: {
  label: string; value: string; onChange: (v: string) => void; border?: boolean; strong?: boolean; placeholder?: string; suffix?: string;
  keyboard?: 'decimal-pad' | 'numbers-and-punctuation';
}) => (
  <View style={[styles.fieldRow, border && styles.rowBorder]}>
    <Text style={[styles.fieldLabel, strong && { fontFamily: fonts.bold, color: colors.text }]}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {!suffix && keyboard === 'decimal-pad' && <Text style={styles.fieldPrefix}>$</Text>}
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.placeholder}
        keyboardType={keyboard} style={[styles.fieldInput, strong && { fontFamily: fonts.monoBold, fontSize: 18 }]} accessibilityLabel={label} />
      {!!suffix && <Text style={styles.fieldPrefix}>{suffix}</Text>}
    </View>
  </View>
);

const Banner = ({ tone, title, text, action, secondary }: {
  tone: 'ok' | 'warn'; title: string; text: string;
  action?: { label: string; onPress: () => void }; secondary?: { label: string; onPress: () => void };
}) => (
  <View style={[styles.banner, tone === 'ok' ? styles.bannerOk : styles.bannerWarn]} accessibilityLiveRegion="polite">
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {tone === 'ok' ? <Check size={18} color={colors.success} strokeWidth={3} /> : <AlertTriangle size={18} color={colors.taxText} />}
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: tone === 'ok' ? '#0B6B4B' : colors.warnText }]}>{title}</Text>
        <Text style={[styles.bannerText, { color: tone === 'ok' ? '#0B6B4B' : colors.warnText }]}>{text}</Text>
      </View>
    </View>
    {(action || secondary) && (
      <View style={styles.bannerActions}>
        {action && <Pressable onPress={action.onPress} style={styles.fixBtn} accessibilityRole="button"><Text style={styles.fixText}>{action.label}</Text></Pressable>}
        {secondary && <Pressable onPress={secondary.onPress} style={styles.noTaxBtn} accessibilityRole="button"><Text style={styles.noTaxText}>{secondary.label}</Text></Pressable>}
      </View>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navBtn: { minWidth: 60, height: 44, justifyContent: 'center', paddingHorizontal: 8, alignItems: 'flex-start' },
  navText: { fontFamily: fonts.medium, fontSize: 17, color: colors.accent },
  segment: { flexDirection: 'row', marginHorizontal: 16, marginTop: 4, backgroundColor: colors.fill, borderRadius: 10, padding: 2 },
  segItem: { flex: 1, height: 34, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segText: { fontFamily: fonts.semibold, fontSize: 14, color: '#3A3A40' },
  segTextActive: { fontFamily: fonts.bold, color: colors.text },
  content: { padding: 16, gap: 14, paddingBottom: 24 },
  photoBox: { height: 420, borderRadius: radius.xl, backgroundColor: '#26262B', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  noPhoto: { fontFamily: fonts.medium, fontSize: 15, color: '#C7C7CC', textAlign: 'center', paddingHorizontal: 32 },
  ocrBadge: { position: 'absolute', top: 12, left: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  ocrText: { fontFamily: fonts.semibold, fontSize: 12, color: '#FFFFFF' },
  expand: { position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  keyRow: { flexDirection: 'row', padding: 16, gap: 8 },
  keyLabel: { fontFamily: fonts.bold, fontSize: 12 },
  keyValue: { fontFamily: fonts.mono, fontSize: 17, color: colors.text },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  keyFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  checkText: { fontFamily: fonts.semibold, fontSize: 13 },
  meta: { fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  storeInput: { fontFamily: fonts.extrabold, fontSize: 20, color: colors.text, padding: 0 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start' },
  catChip: { fontFamily: fonts.bold, fontSize: 13, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  qty: { fontFamily: fonts.bold, fontSize: 13, color: colors.textMuted, width: 24 },
  itemName: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 52 },
  fieldLabel: { fontFamily: fonts.regular, fontSize: 16, color: colors.textSecondary },
  fieldPrefix: { fontFamily: fonts.mono, fontSize: 16, color: colors.textMuted },
  fieldInput: { fontFamily: fonts.mono, fontSize: 16, color: colors.text, minWidth: 90, textAlign: 'right', paddingVertical: 12 },
  banner: { borderRadius: radius.lg, padding: 14, gap: 12, borderWidth: 1 },
  bannerOk: { backgroundColor: '#E6F6EF', borderColor: '#BFE6D3' },
  bannerWarn: { backgroundColor: colors.warnBg, borderColor: colors.warnBorder },
  bannerTitle: { fontFamily: fonts.bold, fontSize: 15 },
  bannerText: { fontFamily: fonts.regular, fontSize: 13, marginTop: 2 },
  bannerActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  fixBtn: { backgroundColor: colors.tax, borderRadius: 18, paddingHorizontal: 16, height: 36, justifyContent: 'center' },
  fixText: { fontFamily: fonts.bold, fontSize: 14, color: '#FFFFFF' },
  noTaxBtn: { backgroundColor: '#FFFFFF', borderRadius: 18, paddingHorizontal: 16, height: 36, justifyContent: 'center' },
  noTaxText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.text },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger, paddingHorizontal: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: colors.bg },
  pickerWrap: { flex: 1, backgroundColor: colors.bg },
  pickerHead: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, backgroundColor: colors.card },
  pickFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, borderTopWidth: 0 },
  viewerClose: { position: 'absolute', top: 60, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
