import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Briefcase, ChevronLeft, ChevronRight } from '../components/icons';
import { CategoryIcon } from '../components/CategoryIcon';
import { Illustration } from '../components/Illustration';
import { LargeHeader, ProgressBar, RoundButton, TAB_BAR_SPACE, kit } from '../components/kit';
import { Segmented } from '../components/ui';
import { MerchantAvatar } from '../components/MerchantAvatar';
import { useReceipts } from '../context/ReceiptContext';
import { triggerHaptic } from '../utils/nativeUtils';
import {
  ReceiptTax, TaxPeriod, formatCents, formatPeriodLabel, getPeriodRange, shiftPeriod, summarizeTax, toCents,
} from '../utils/tax';
import { colors, font, radius, type, themedStyles } from '../theme';

const PERIODS: { value: TaxPeriod; label: string }[] = [
  { value: 'month', label: 'Month' }, { value: 'quarter', label: 'Quarter' }, { value: 'year', label: 'Year' },
];
const CHART_H = 84;

/** D3 · HST summary for a month, quarter or tax year. */
export default function TaxSummaryScreen({ navigation, route }: any) {
  const { receipts, categories, userProfile, updateReceipt } = useReceipts();
  const [period, setPeriod] = useState<TaxPeriod>('year');
  const [anchor, setAnchor] = useState(() => new Date());
  // Home opens this tab on the period it was showing.
  const wanted: TaxPeriod | undefined = route?.params?.period;
  const wantedAnchor: string | undefined = route?.params?.anchor;
  useEffect(() => {
    if (!wanted || !PERIODS.some(p => p.value === wanted)) return;
    setPeriod(wanted);
    if (wantedAnchor) setAnchor(new Date(wantedAnchor));
  }, [wanted, wantedAnchor]);

  const summary = useMemo(
    () => summarizeTax(receipts, categories, userProfile.hstDefaultPercent, period, anchor),
    [receipts, categories, userProfile.hstDefaultPercent, period, anchor]
  );
  const label = formatPeriodLabel(period, anchor);
  const canGoForward = getPeriodRange(period, shiftPeriod(period, anchor, 1)).start <= new Date();
  const maxBucket = Math.max(...summary.buckets.map(b => b.hstCents), 1);
  const maxCat = Math.max(...summary.byCategory.map(c => c.hstCents), 1);

  const changePeriod = (next: TaxPeriod) => { triggerHaptic('light'); setPeriod(next); setAnchor(new Date()); };
  const step = (delta: number) => { triggerHaptic('light'); setAnchor(shiftPeriod(period, anchor, delta)); };
  const applySuggestion = (t: ReceiptTax) => {
    triggerHaptic('success');
    updateReceipt({ ...t.receipt, hstAmount: (t.suggestedHstCents ?? 0) / 100, hstPercent: t.percent, taxReviewed: true });
  };
  const markNoTax = (t: ReceiptTax) => {
    triggerHaptic('medium');
    updateReceipt({ ...t.receipt, hstAmount: 0, hstPercent: 0, taxReviewed: true });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LargeHeader title={period === 'year' ? `Tax Year ${label}` : label} right={<>
          <RoundButton label="Previous period" onPress={() => step(-1)}><ChevronLeft size={20} color={colors.text} /></RoundButton>
          <RoundButton label="Next period" onPress={canGoForward ? () => step(1) : undefined} style={!canGoForward ? { opacity: 0.4 } : undefined}>
            <ChevronRight size={20} color={colors.text} />
          </RoundButton>
        </>} />
        <View style={styles.pad}><Segmented options={PERIODS} value={period} onChange={changePeriod} /></View>

        <View style={[kit.card, styles.hero]}>
          <Text style={styles.heroLabel}>TOTAL HST PAID</Text>
          <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{formatCents(summary.hstCents)}</Text>
          <Text style={type.subhead}>
            {formatCents(summary.spendCents)} spent · {summary.receiptCount} {summary.receiptCount === 1 ? 'receipt' : 'receipts'}
          </Text>
          {summary.receiptCount > 0 && (
            <View style={styles.chart} accessibilityLabel="HST by period">
              {summary.buckets.map((b, i) => (
                <View key={i} style={styles.barCol}>
                  <View style={[styles.bar, { height: Math.max(3, (b.hstCents / maxBucket) * CHART_H) }, b.hstCents === maxBucket && b.hstCents > 0 && { backgroundColor: colors.tax }]} />
                  <Text style={styles.barLabel} numberOfLines={1}>{period === 'year' ? b.label.slice(0, 1) : b.label}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {summary.needsReview.length > 0 && (
          <View style={styles.warn}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <AlertTriangle size={20} color={colors.tax} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warnTitle}>
                  {summary.needsReview.length} {summary.needsReview.length === 1 ? 'receipt needs' : 'receipts need'} review
                </Text>
                <Text style={styles.warnText}>The tax wasn’t read, so they are not in this total yet.</Text>
              </View>
            </View>
            {summary.needsReview.map(t => (
              <View key={t.receipt.id} style={styles.reviewRow}>
                <Pressable style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }} onPress={() => navigation.navigate('ReceiptDetail', { receiptId: t.receipt.id })} accessibilityRole="button">
                  <MerchantAvatar name={t.receipt.storeName} category={t.receipt.category} size={36} badge={false} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.reviewStore} numberOfLines={1}>{t.receipt.storeName}</Text>
                    <Text style={styles.reviewMeta} numberOfLines={1}>
                      {formatCents(toCents(t.receipt.totalAmount))} · {t.reason === 'taxIncluded' ? 'Tax included' : 'No tax line'}
                    </Text>
                  </View>
                </Pressable>
                <Pressable style={styles.applyBtn} onPress={() => applySuggestion(t)} accessibilityRole="button">
                  <Text style={styles.applyText}>Add {formatCents(t.suggestedHstCents ?? 0)}</Text>
                </Pressable>
                <Pressable style={[styles.applyBtn, { backgroundColor: colors.elevated }]} onPress={() => markNoTax(t)} accessibilityRole="button">
                  <Text style={[styles.applyText, { color: colors.text }]}>No tax</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {summary.receiptCount === 0 ? (
          <View style={styles.empty}>
            <Illustration name="noData" size={170} label="No receipts in this period" />
            <Text style={type.headline}>No receipts in this period</Text>
            <Text style={[type.subhead, { textAlign: 'center' }]}>Scanned receipts with HST add up here.</Text>
          </View>
        ) : (
          <>
            {summary.byCategory.length > 0 && (
              <>
                <Text style={[kit.sectionLabel, styles.label]}>HST by category</Text>
                <View style={[kit.card, styles.mh]}>
                  {summary.byCategory.map((c, i) => (
                    <View key={c.category} style={[styles.catRow, i > 0 && kit.rowBorder]}>
                      <CategoryIcon category={c.category} size={32} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={type.body} numberOfLines={1}>{c.category}</Text>
                          <Text style={styles.catVal}>{formatCents(c.hstCents)}</Text>
                        </View>
                        <ProgressBar value={c.hstCents / maxCat} color={colors.tax} height={4} />
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            <View style={[kit.card, styles.mh, styles.send]}>
              <View style={styles.sendIcon}><Briefcase size={22} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={type.headline}>Send to Accountant</Text>
                <Text style={type.footnote}>PDF summary or CSV for this period</Text>
              </View>
              <Pressable style={styles.exportBtn} accessibilityRole="button"
                onPress={() => navigation.navigate('Export', { start: summary.range.start.toISOString(), end: summary.range.end.toISOString(), label })}>
                <Text style={styles.exportText}>Export</Text>
              </Pressable>
            </View>
          </>
        )}
        <Text style={styles.footnote}>Totals come from the tax read on each receipt. Check with your accountant before filing.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: TAB_BAR_SPACE, gap: 12 },
  pad: { paddingHorizontal: 16 },
  mh: { marginHorizontal: 16 },
  label: { marginTop: 6 },
  hero: { marginHorizontal: 16, padding: 18, gap: 2, borderRadius: radius.xl },
  heroLabel: { ...font.semibold, fontSize: 13, letterSpacing: 0.8, color: colors.textSecondary },
  heroValue: { ...font.bold, fontSize: 40, lineHeight: 48, color: colors.tax, fontVariant: ['tabular-nums'] },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: CHART_H + 20, marginTop: 14 },
  barCol: { flex: 1, justifyContent: 'flex-end', gap: 5 },
  bar: { borderRadius: 4, backgroundColor: colors.taxBar },
  barLabel: { ...font.regular, fontSize: 10, color: colors.textSecondary, textAlign: 'center' },
  warn: { marginHorizontal: 16, backgroundColor: colors.warnBg, borderColor: colors.warnBorder, borderWidth: 1, borderRadius: radius.lg, padding: 14, gap: 12 },
  warnTitle: { ...font.semibold, fontSize: 17, color: colors.warnText },
  warnText: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.warnText },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.warnBorder, paddingTop: 10 },
  reviewStore: { ...font.semibold, fontSize: 15, color: colors.text },
  reviewMeta: { ...font.regular, fontSize: 13, color: colors.warnText },
  applyBtn: { height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: colors.taxFill, alignItems: 'center', justifyContent: 'center' },
  applyText: { ...font.semibold, fontSize: 14, color: '#FFFFFF' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card },
  catVal: { ...font.semibold, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  send: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  sendIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  exportBtn: { height: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  exportText: { ...font.semibold, fontSize: 15, color: '#FFFFFF' },
  empty: { alignItems: 'center', gap: 4, padding: 20 },
  footnote: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 32 },
}));
