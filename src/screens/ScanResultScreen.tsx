import React, { useMemo, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Check, ChevronRight, Edit, Maximize2, Sparkles, X } from '../components/icons';
import { useReceipts } from '../context/ReceiptContext';
import { CategoryIcon, categoryColor } from '../components/CategoryIcon';
import { CategoryPickerSheet } from '../components/CategoryPickerSheet';
import { MerchantAvatar } from '../components/MerchantAvatar';
import { Button, Segmented } from '../components/ui';
import { checkTotals, formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { persistReceiptPhoto } from '../utils/photos';
import { triggerHaptic } from '../utils/nativeUtils';
import { colors, font, radius, type, themedStyles, soft } from '../theme';
import type { OcrResult } from '../services/ocr';
import type { Receipt } from '../types';

const toInput = (n?: number) => (n == null ? '' : n.toFixed(2));
const parseMoney = (s: string): number | undefined => {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : undefined;
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const confidenceLabel = (c: number) => (c >= 0.9 ? 'High' : c >= 0.75 ? 'Medium' : 'Low');

/**
 * Review a scanned receipt (B4, B5) or enter one by hand (B7). Two copies are kept: the
 * untouched Original photo and the editable Digital copy this screen builds.
 */
export default function ScanResultScreen({ route, navigation }: any) {
  const photoUri: string | null = route.params?.photoUri ?? null;
  const result: OcrResult | null = route.params?.result ?? null;
  const manual = !photoUri && !result;
  const { categories, userProfile, addReceipt } = useReceipts();

  const [tab, setTab] = useState<'original' | 'digital'>('digital');
  const [store, setStore] = useState(result?.storeName ?? '');
  const [date, setDate] = useState(result?.purchaseDate.slice(0, 10) ?? todayISO());
  // With auto-categorize off, the user always picks the category.
  const [category, setCategory] = useState(result && userProfile.autoCategorize ? result.category : 'Other');
  const [subcategory, setSubcategory] = useState(userProfile.autoCategorize ? result?.subcategory : undefined);
  const [payment, setPayment] = useState('');
  const [notes, setNotes] = useState('');
  const [subtotal, setSubtotal] = useState(toInput(result?.subtotal));
  const [hst, setHst] = useState(toInput(result?.hstAmount));
  const [hstPercent, setHstPercent] = useState(
    result?.hstPercent != null ? String(result.hstPercent) : manual ? String(userProfile.hstDefaultPercent) : '');
  const [total, setTotal] = useState(toInput(result?.totalAmount));
  const [taxReviewed, setTaxReviewed] = useState(false);
  // Manual entry works out HST and the total until the user types over them.
  const [hstTouched, setHstTouched] = useState(false);
  const [totalTouched, setTotalTouched] = useState(false);
  const [picker, setPicker] = useState(false);
  const [viewer, setViewer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const draft: Receipt = useMemo(() => ({
    id: 'draft', imageName: photoUri ?? '', storeName: store.trim(),
    purchaseDate: new Date(`${date}T12:00:00`).toISOString(),
    totalAmount: parseMoney(total) ?? 0, subtotal: parseMoney(subtotal), hstAmount: parseMoney(hst),
    hstPercent: parseMoney(hstPercent), category, subcategory, items: result?.items ?? [], taxReviewed,
    paymentMethod: payment.trim() || undefined, notes: notes.trim() || undefined,
  }), [photoUri, store, date, total, subtotal, hst, hstPercent, category, subcategory, result, taxReviewed, payment, notes]);

  const tax = resolveReceiptTax(draft, categories, userProfile.hstDefaultPercent);
  const check = checkTotals(draft.subtotal, draft.hstAmount, parseMoney(total));
  const found = [result?.subtotal, result?.hstAmount, result?.totalAmount].filter(v => v != null).length;

  // ----- manual-entry auto math -----
  const rulePercent = (cat: string) => {
    const rule = categories.find(c => c.name === cat)?.taxRule;
    return rule?.mode === 'none' ? 0 : rule?.percentOverride ?? userProfile.hstDefaultPercent;
  };
  const recompute = (sub: string, pct: string, hstOverride?: string, hstIsTouched = hstTouched, totalIsTouched = totalTouched) => {
    const s = parseMoney(sub);
    if (s == null) return;
    let h = parseMoney(hstOverride ?? hst) ?? 0;
    if (!hstIsTouched) {
      h = Math.round(s * (parseMoney(pct) ?? 0)) / 100;
      setHst(h.toFixed(2));
    }
    if (!totalIsTouched) setTotal(((toCents(s) + toCents(h)) / 100).toFixed(2));
  };

  const onSubtotal = (v: string) => {
    setSubtotal(v); setTaxReviewed(false);
    if (manual) recompute(v, hstPercent);
  };
  const onHst = (v: string) => {
    setHst(v); setTaxReviewed(true);
    if (manual) { setHstTouched(true); recompute(subtotal, hstPercent, v, true); }
  };
  const onPercent = (v: string) => {
    setHstPercent(v);
    if (manual) recompute(subtotal, v);
  };
  const onTotal = (v: string) => {
    setTotal(v); setTaxReviewed(false);
    if (manual) setTotalTouched(true);
  };
  const onCategory = (name: string, sub?: string) => {
    setCategory(name); setSubcategory(sub); setPicker(false);
    if (manual) {
      const pct = String(rulePercent(name));
      setHstPercent(pct);
      recompute(subtotal, pct);
    }
  };

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
    if (Number.isNaN(new Date(`${date}T12:00:00`).getTime())) { setError('Use the date format YYYY-MM-DD.'); setTab('digital'); triggerHaptic('error'); return; }
    setSaving(true);
    try {
      const id = `r_${Date.now()}`;
      // The original photo is stored once, as captured, and never edited.
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
  const showTaxBanner = !(check && !check.ok) && tax.status === 'needsReview' && draft.totalAmount > 0;
  const hstBadge = tax.status === 'needsReview' && draft.totalAmount > 0
    ? { text: 'Not found', warn: true }
    : manual && !hstTouched ? { text: `${hstPercent || 0}% AUTO` } : hstPercent ? { text: `${hstPercent}% ON` } : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => (manual ? navigation.goBack() : navigation.replace('CameraModal'))}
          style={styles.navBtn} accessibilityRole="button"
        >
          <Text style={styles.navText}>{manual ? 'Cancel' : 'Retake'}</Text>
        </Pressable>
        <Text style={styles.navTitle} accessibilityRole="header">{manual ? 'New Receipt' : 'Review Details'}</Text>
        <Pressable onPress={save} style={[styles.navBtn, { alignItems: 'flex-end' }]} accessibilityRole="button" disabled={saving}>
          <Text style={[styles.navText, font.semibold]}>Save</Text>
        </Pressable>
      </View>

      {!!photoUri && (
        <View style={styles.segment}>
          <Segmented
            options={[{ value: 'original', label: 'Original' }, { value: 'digital', label: 'Digital copy' }]}
            value={tab} onChange={setTab}
          />
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tab === 'original' && photoUri ? (
            <>
              <Pressable style={styles.photoBox} onPress={() => setViewer(true)} accessibilityRole="button" accessibilityLabel="View full photo">
                <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="contain" />
                <View style={styles.expand}><Maximize2 size={16} color="#FFFFFF" /></View>
              </Pressable>
              <View style={styles.card}>
                <View style={styles.keyRow}>
                  <KeyValue label="Subtotal" value={draft.subtotal} />
                  <KeyValue label={`HST${draft.hstPercent != null ? ` ${draft.hstPercent}%` : ''}`} value={draft.hstAmount} tax />
                  <KeyValue label="Total" value={parseMoney(total)} bold />
                </View>
                <View style={styles.hr} />
                <View style={styles.keyFoot}>
                  <TotalsLine check={check} subtotal={draft.subtotal} hst={draft.hstAmount} total={parseMoney(total)} />
                  <Text style={styles.meta}>Original photo is kept as captured</Text>
                </View>
              </View>
              <Button title="Review Digital Copy" variant="tinted" onPress={() => setTab('digital')} />
            </>
          ) : (
            <>
              {manual ? (
                <View style={[styles.card, styles.info]}>
                  <View style={styles.infoIcon}><Edit size={18} color={colors.accent} /></View>
                  <Text style={[type.subhead, { flex: 1, color: colors.text }]}>No photo. This receipt is entered by hand.</Text>
                </View>
              ) : (
                <View style={styles.header}>
                  <MerchantAvatar name={store || '?'} category={category} size={52} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.headTitle} numberOfLines={1}>
                      {store.trim() || 'Store'}{(parseMoney(total) ?? 0) > 0 ? ` · ${formatCents(toCents(parseMoney(total)))}` : ''}
                    </Text>
                    {!!result && (
                      <View style={styles.conf}>
                        <Sparkles size={14} color={colors.accent} />
                        <Text style={styles.confText}>Read automatically · {confidenceLabel(result.confidence)} confidence</Text>
                      </View>
                    )}
                    <Text style={type.footnote}>{result ? `${found} of 3 key values found. Tap any field to correct it.` : 'Tap any field to correct it.'}</Text>
                  </View>
                </View>
              )}

              {showTaxBanner && (
                <Banner tone="warn" title={tax.reason === 'taxIncluded' ? 'Tax is included in the price' : 'No tax line found'}
                  text={`${tax.percent}% of this ${tax.reason === 'taxIncluded' ? 'total' : 'subtotal'} would be ${formatCents(tax.suggestedHstCents ?? 0)}. Receipts without a tax amount are kept out of your HST total until you confirm.`}
                  action={{ label: `Add ${formatCents(tax.suggestedHstCents ?? 0)}`, onPress: applySuggested }}
                  secondary={{ label: 'No tax', onPress: markNoTax }} />
              )}
              {check && !check.ok && (
                <Banner tone="warn" title="Totals don’t match"
                  text={`Subtotal + HST is ${formatCents(Math.abs(check.diffCents))} ${check.diffCents > 0 ? 'less' : 'more'} than the total. Please review the values.`}
                  action={{ label: `Set HST to ${formatCents(toCents(parseMoney(total) ?? 0) - toCents(draft.subtotal ?? 0))}`, onPress: fixFromTotals }} />
              )}

              <Text style={styles.sectionLabel}>DETAILS</Text>
              <View style={styles.group}>
                <InputRow label="Store" value={store} onChange={setStore} placeholder="Store name" autoCapitalize="words" />
                <InputRow label="Date" value={date} onChange={setDate} placeholder="YYYY-MM-DD" keyboard="numbers-and-punctuation" />
                <Pressable onPress={() => setPicker(true)} style={styles.row} accessibilityRole="button" accessibilityLabel="Change category">
                  <Text style={styles.rowLabel}>Category</Text>
                  <View style={styles.catValue}>
                    {category !== 'Other' || result ? (
                      <View style={[styles.catChip, { backgroundColor: soft(color) }]}>
                        <CategoryIcon category={category} size={20} />
                        <Text style={[styles.catChipText, { color }]} numberOfLines={1}>{category}</Text>
                      </View>
                    ) : (
                      <Text style={styles.choose}>Choose</Text>
                    )}
                    <ChevronRight size={16} color={colors.chevron} />
                  </View>
                </Pressable>
                <InputRow label="Payment" value={payment} onChange={setPayment} placeholder="Card or cash (optional)" last />
              </View>

              <Text style={styles.sectionLabel}>AMOUNTS</Text>
              <View style={styles.group}>
                <MoneyRow label="Subtotal" value={subtotal} onChange={onSubtotal} />
                <MoneyRow label="HST" value={hst} onChange={onHst} badge={hstBadge} tax />
                <MoneyRow label="HST %" value={hstPercent} onChange={onPercent} suffix="%" placeholder={String(userProfile.hstDefaultPercent)} />
                <MoneyRow label="Total" value={total} onChange={onTotal} strong last />
              </View>
              <Text style={styles.footnote}>
                {manual
                  ? 'HST is worked out from the subtotal. Type over it if the receipt shows a different amount.'
                  : check?.ok ? 'Subtotal + HST = Total. Zero-rated items stay out of the HST total.' : 'Edit any amount if the scan got it wrong.'}
              </Text>

              {(result?.items ?? []).length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>LINE ITEMS · {result!.items.length}</Text>
                  <View style={styles.group}>
                    {result!.items.map((it, i) => (
                      <View key={i} style={[styles.row, i > 0 && styles.rowBorder]}>
                        <Text style={styles.qty}>{it.qty}×</Text>
                        <Text style={[styles.rowLabel, { flex: 1 }]} numberOfLines={1}>{it.name}</Text>
                        <Text style={styles.money}>{formatCents(toCents(it.amount))}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.sectionLabel}>NOTES</Text>
              <View style={[styles.group, { paddingHorizontal: 16 }]}>
                <TextInput value={notes} onChangeText={setNotes} placeholder="Add a note for your accountant" placeholderTextColor={colors.placeholder}
                  multiline style={styles.notes} accessibilityLabel="Notes" />
              </View>
            </>
          )}
          {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Button title="Save Receipt" onPress={save} loading={saving} />
      </View>

      <CategoryPickerSheet
        visible={picker} category={category} subcategory={subcategory}
        onClose={() => setPicker(false)} onDone={onCategory}
        onManage={() => navigation.navigate('ManageCategories')}
      />

      <Modal visible={viewer} animationType="fade" onRequestClose={() => setViewer(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {!!photoUri && <Image source={{ uri: photoUri }} style={{ flex: 1 }} resizeMode="contain" />}
          <Pressable onPress={() => setViewer(false)} style={styles.viewerClose} accessibilityRole="button" accessibilityLabel="Close photo">
            <X size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const KeyValue = ({ label, value, tax, bold }: { label: string; value?: number; tax?: boolean; bold?: boolean }) => (
  <View style={{ flex: 1, gap: 4 }}>
    <Text style={[styles.keyLabel, tax && { color: colors.tax }]}>{label}</Text>
    <Text style={[styles.keyValue, tax && { color: colors.tax }, bold && font.bold]}>
      {value == null ? 'Not found' : formatCents(toCents(value))}
    </Text>
  </View>
);

const TotalsLine = ({ check, subtotal, hst, total }: { check: ReturnType<typeof checkTotals>; subtotal?: number; hst?: number; total?: number }) => {
  if (!check) return <Text style={styles.meta}>Some values weren’t found</Text>;
  const txt = `${subtotal?.toFixed(2)} + ${hst?.toFixed(2)} ${check.ok ? '=' : '≠'} ${total?.toFixed(2)}`;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {check.ok ? <Check size={15} color={colors.success} strokeWidth={2.6} /> : <AlertTriangle size={15} color={colors.tax} />}
      <Text style={[styles.checkText, { color: check.ok ? colors.success : colors.tax }]}>{txt}</Text>
    </View>
  );
};

const InputRow = ({ label, value, onChange, placeholder, last, keyboard, autoCapitalize }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; last?: boolean;
  keyboard?: 'numbers-and-punctuation'; autoCapitalize?: 'words';
}) => (
  <View style={[styles.row, styles.rowBorderless]}>
    <Text style={styles.rowLabel}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.placeholder}
      keyboardType={keyboard} autoCapitalize={autoCapitalize} style={styles.input} accessibilityLabel={label} />
    {!last && <View style={styles.rowSep} />}
  </View>
);

const MoneyRow = ({ label, value, onChange, strong, last, tax, suffix, placeholder = '0.00', badge }: {
  label: string; value: string; onChange: (v: string) => void; strong?: boolean; last?: boolean; tax?: boolean; suffix?: string;
  placeholder?: string; badge?: { text: string; warn?: boolean };
}) => (
  <View style={[styles.row, tax && !badge?.warn && { backgroundColor: colors.warnBg }, styles.rowBorderless]}>
    <Text style={[styles.rowLabel, strong && font.bold]}>{label}</Text>
    {!!badge && (
      <View style={[styles.badge, badge.warn && { backgroundColor: colors.taxSoft }]}>
        <Text style={styles.badgeText}>{badge.text}</Text>
      </View>
    )}
    <View style={{ flex: 1 }} />
    <View style={styles.moneyWrap}>
      {!suffix && <Text style={[styles.money, tax && { color: colors.tax }, strong && font.bold]}>$</Text>}
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.placeholder}
        keyboardType="decimal-pad" accessibilityLabel={label}
        style={[styles.moneyInput, tax && { color: colors.tax, ...font.bold }, strong && { ...font.bold }]} />
      {!!suffix && <Text style={styles.money}>{suffix}</Text>}
    </View>
    {!last && <View style={styles.rowSep} />}
  </View>
);

const Banner = ({ tone, title, text, action, secondary }: {
  tone: 'ok' | 'warn'; title: string; text: string;
  action?: { label: string; onPress: () => void }; secondary?: { label: string; onPress: () => void };
}) => (
  <View style={[styles.banner, tone === 'ok' ? styles.bannerOk : styles.bannerWarn]} accessibilityLiveRegion="polite">
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <AlertTriangle size={20} color={colors.tax} />
      <View style={{ flex: 1 }}>
        <Text style={styles.bannerTitle}>{title}</Text>
        <Text style={styles.bannerText}>{text}</Text>
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

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navBtn: { minWidth: 76, height: 44, justifyContent: 'center', paddingHorizontal: 8, alignItems: 'flex-start' },
  navText: { ...font.regular, fontSize: 17, color: colors.accent },
  navTitle: { ...font.semibold, fontSize: 17, color: colors.text },
  segment: { marginHorizontal: 16, marginTop: 4, marginBottom: 4 },
  content: { padding: 16, gap: 8, paddingBottom: 24 },
  photoBox: { height: 420, borderRadius: radius.xl, backgroundColor: '#26262B', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '100%' },
  expand: { position: 'absolute', top: 8, right: 8, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  keyRow: { flexDirection: 'row', padding: 16, gap: 8 },
  keyLabel: { ...font.medium, fontSize: 12, color: colors.textSecondary },
  keyValue: { ...font.semibold, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  keyFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, gap: 8 },
  checkText: { ...font.semibold, fontSize: 13, fontVariant: ['tabular-nums'] },
  meta: { ...font.medium, fontSize: 12, color: colors.textSecondary, flexShrink: 1 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  infoIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 4, paddingHorizontal: 4 },
  headTitle: { ...font.bold, fontSize: 22, lineHeight: 28, color: colors.text },
  conf: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  confText: { ...font.semibold, fontSize: 13, color: colors.accent, flexShrink: 1 },
  sectionLabel: { ...font.regular, fontSize: 13, color: colors.textSecondary, paddingHorizontal: 16, marginTop: 10 },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 48 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  rowBorderless: { position: 'relative' },
  rowSep: { position: 'absolute', left: 16, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  rowLabel: { ...font.regular, fontSize: 17, color: colors.text },
  input: { flex: 1, ...font.regular, fontSize: 17, color: colors.textSecondary, textAlign: 'right', paddingVertical: 10, minWidth: 0 },
  catValue: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 8, borderRadius: 15, maxWidth: 200 },
  catChipText: { ...font.semibold, fontSize: 15, flexShrink: 1 },
  choose: { ...font.regular, fontSize: 17, color: colors.textSecondary },
  moneyWrap: { flexDirection: 'row', alignItems: 'center' },
  money: { ...font.regular, fontSize: 17, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  moneyInput: { ...font.regular, fontSize: 17, color: colors.textSecondary, width: 104, textAlign: 'right', paddingVertical: 10, fontVariant: ['tabular-nums'] },
  badge: { height: 20, paddingHorizontal: 7, borderRadius: 6, backgroundColor: colors.taxSoft, justifyContent: 'center' },
  badgeText: { ...font.bold, fontSize: 11, color: colors.tax },
  footnote: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16 },
  qty: { ...font.semibold, fontSize: 13, color: colors.textSecondary, width: 26 },
  notes: { ...font.regular, fontSize: 17, color: colors.text, minHeight: 72, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  banner: { borderRadius: radius.lg, padding: 14, gap: 12, borderWidth: 1 },
  bannerOk: { backgroundColor: colors.successSoft, borderColor: colors.accentBar },
  bannerWarn: { backgroundColor: colors.warnBg, borderColor: colors.warnBorder },
  bannerTitle: { ...font.semibold, fontSize: 17, color: colors.warnText },
  bannerText: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.warnText, marginTop: 2 },
  bannerActions: { flexDirection: 'row', gap: 10 },
  fixBtn: { flex: 1, backgroundColor: colors.taxFill, borderRadius: 22, height: 44, justifyContent: 'center', alignItems: 'center' },
  fixText: { ...font.semibold, fontSize: 17, color: '#FFFFFF' },
  noTaxBtn: { flex: 1, backgroundColor: colors.elevated, borderRadius: 22, height: 44, justifyContent: 'center', alignItems: 'center' },
  noTaxText: { ...font.semibold, fontSize: 17, color: colors.text },
  error: { ...font.medium, fontSize: 15, color: colors.danger, paddingHorizontal: 4, marginTop: 6 },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, backgroundColor: colors.bg },
  viewerClose: { position: 'absolute', top: 60, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
}));
