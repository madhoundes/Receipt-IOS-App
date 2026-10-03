import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Share, AlertTriangle } from '../components/icons';
import { useReceipts } from '../context/ReceiptContext';
import { THEME } from '../constants';
import { shareCSV, triggerHaptic } from '../utils/nativeUtils';
import {
  TaxPeriod, ReceiptTax, summarizeTax, shiftPeriod, getPeriodRange, formatPeriodLabel, formatCents, toCents,
} from '../utils/tax';

const TAX = {
  accent: '#C2410C',
  accentText: '#A3360A',
  track: '#F3EEEA',
  warnBg: '#FFF4E5',
  warnBorder: '#F5C98A',
  warnText: '#7A2A06',
  text: '#111114',
  textSecondary: '#55555C',
};

const PERIODS: { id: TaxPeriod; label: string }[] = [
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'year', label: 'Year' },
];

const BUCKET_TITLE: Record<TaxPeriod, string> = {
  week: 'HST by day',
  month: 'HST by week',
  quarter: 'HST by month',
  year: 'HST by month',
};

const CHART_HEIGHT = 120;

export default function TaxSummaryScreen({ navigation }: any) {
  const { receipts, categories, userProfile, updateReceipt } = useReceipts();
  const [period, setPeriod] = useState<TaxPeriod>('month');
  const [anchor, setAnchor] = useState(() => new Date());

  const summary = useMemo(
    () => summarizeTax(receipts, categories, userProfile.hstDefaultPercent, period, anchor),
    [receipts, categories, userProfile.hstDefaultPercent, period, anchor]
  );

  const label = formatPeriodLabel(period, anchor);
  const canGoForward = getPeriodRange(period, shiftPeriod(period, anchor, 1)).start <= new Date();
  const maxBucket = Math.max(...summary.buckets.map(b => b.hstCents), 1);

  const changePeriod = (next: TaxPeriod) => {
    triggerHaptic('light');
    setPeriod(next);
    setAnchor(new Date());
  };

  const step = (delta: number) => {
    triggerHaptic('light');
    setAnchor(shiftPeriod(period, anchor, delta));
  };

  const applySuggestion = (t: ReceiptTax) => {
    triggerHaptic('success');
    updateReceipt({
      ...t.receipt,
      hstAmount: (t.suggestedHstCents ?? 0) / 100,
      hstPercent: t.percent,
      taxReviewed: true,
    });
  };

  const markNoTax = (t: ReceiptTax) => {
    triggerHaptic('medium');
    updateReceipt({ ...t.receipt, hstAmount: 0, hstPercent: 0, taxReviewed: true });
  };

  const exportPeriod = () => {
    const { start, end } = summary.range;
    const inPeriod = receipts.filter(r => {
      const d = new Date(r.purchaseDate);
      return d >= start && d < end;
    });
    shareCSV(inPeriod, `hst-${label.replace(/[^A-Za-z0-9]+/g, '-').toLowerCase()}.csv`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityRole="button">
          <ChevronLeft size={24} color={THEME.colors.blue} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={exportPeriod}
          disabled={summary.receiptCount === 0}
          accessibilityRole="button"
          accessibilityLabel="Export tax report"
        >
          <Share size={22} color={summary.receiptCount === 0 ? THEME.colors.gray : THEME.colors.blue} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>HST Summary</Text>

        <View style={styles.segmented}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.id}
              style={[styles.segment, period === p.id && styles.segmentActive]}
              onPress={() => changePeriod(p.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: period === p.id }}
            >
              <Text style={[styles.segmentText, period === p.id && styles.segmentTextActive]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.periodRow}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => step(-1)} accessibilityLabel="Previous period">
            <ChevronLeft size={20} color={TAX.text} />
          </TouchableOpacity>
          <Text style={styles.periodLabel}>{label}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => step(1)}
            disabled={!canGoForward}
            accessibilityLabel="Next period"
          >
            <ChevronRight size={20} color={canGoForward ? TAX.text : THEME.colors.separator} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.heroLabel}>HST paid</Text>
          <Text style={styles.heroValue}>{formatCents(summary.hstCents)}</Text>
          <Text style={styles.heroSub}>
            on <Text style={styles.mono}>{formatCents(summary.taxableCents)}</Text> of taxable purchases
          </Text>
          <View style={styles.hr} />
          <View style={styles.statsRow}>
            <Stat label="Receipts" value={summary.receiptCount} />
            <Stat label="With HST" value={summary.taxedCount} />
            <Stat label="No tax" value={summary.noTaxCount} />
          </View>
        </View>

        {summary.needsReview.length > 0 && (
          <View style={styles.warnCard}>
            <View style={styles.warnHeader}>
              <AlertTriangle size={20} color={TAX.accentText} />
              <View style={{ flex: 1 }}>
                <Text style={styles.warnTitle}>
                  {summary.needsReview.length} {summary.needsReview.length === 1 ? 'receipt needs' : 'receipts need'} review
                </Text>
                <Text style={styles.warnText}>Tax wasn't read, so they're not in this total yet.</Text>
              </View>
            </View>
            {summary.needsReview.map(t => (
              <View key={t.receipt.id} style={styles.reviewRow}>
                <View style={styles.reviewInfo}>
                  <Text style={styles.reviewStore}>{t.receipt.storeName}</Text>
                  <Text style={styles.reviewMeta}>
                    {formatCents(toCents(t.receipt.totalAmount))} · {t.reason === 'taxIncluded' ? 'Tax included in price' : 'No tax line found'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.applyBtn} onPress={() => applySuggestion(t)}>
                  <Text style={styles.applyText}>Add {formatCents(t.suggestedHstCents ?? 0)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.noTaxBtn} onPress={() => markNoTax(t)}>
                  <Text style={styles.noTaxText}>No tax</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {summary.receiptCount === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No receipts in this period</Text>
            <Text style={styles.emptyText}>Scanned receipts with HST will add up here.</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{BUCKET_TITLE[period]}</Text>
              <View style={styles.chart}>
                {summary.buckets.map((b, i) => (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barValue} numberOfLines={1}>
                      {b.hstCents > 0 ? formatCents(b.hstCents) : ''}
                    </Text>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(2, (b.hstCents / maxBucket) * CHART_HEIGHT) },
                        b.hstCents === maxBucket && b.hstCents > 0 ? styles.barPeak : null,
                      ]}
                    />
                  </View>
                ))}
              </View>
              <View style={styles.barLabels}>
                {summary.buckets.map((b, i) => (
                  <Text key={i} style={styles.barLabel} numberOfLines={1}>{b.label}</Text>
                ))}
              </View>
            </View>

            {summary.byCategory.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>By category</Text>
                {summary.byCategory.map(c => {
                  const share = summary.hstCents > 0 ? c.hstCents / summary.hstCents : 0;
                  return (
                    <View key={c.category} style={styles.catRow}>
                      <View style={styles.catHeader}>
                        <Text style={styles.catName}>{c.category}</Text>
                        <Text style={styles.catValue}>
                          <Text style={styles.mono}>{formatCents(c.hstCents)}</Text> · {Math.round(share * 100)}%
                        </Text>
                      </View>
                      <View style={styles.track}>
                        <View style={[styles.fill, { width: `${share * 100}%` as const }]} />
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <Text style={styles.footnote}>
          Totals come from the tax read on each receipt. Check with your accountant before filing.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const Stat = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.stat}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.bg },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, height: 44 },
  backBtn: { flexDirection: 'row', alignItems: 'center', height: 44, paddingRight: 8 },
  backText: { fontSize: 17, color: THEME.colors.blue },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 16 },
  title: { fontSize: 32, fontWeight: '800', color: TAX.text, paddingHorizontal: 4 },
  segmented: { flexDirection: 'row', backgroundColor: '#E4E4EA', borderRadius: 10, padding: 2 },
  segment: { flex: 1, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#3A3A40' },
  segmentTextActive: { fontWeight: '700', color: TAX.text },
  periodRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  periodLabel: { fontSize: 17, fontWeight: '700', color: TAX.text },
  card: { backgroundColor: 'white', borderRadius: THEME.radius.xl, padding: 20, gap: 12 },
  heroLabel: { fontSize: 14, fontWeight: '700', color: TAX.accentText },
  heroValue: { fontSize: 44, fontWeight: '700', fontFamily: 'Courier', color: TAX.text, letterSpacing: -1 },
  heroSub: { fontSize: 14, color: TAX.textSecondary },
  mono: { fontFamily: 'Courier', color: TAX.text },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: THEME.colors.separator },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: 12, fontWeight: '600', color: TAX.textSecondary },
  statValue: { fontSize: 20, fontFamily: 'Courier', color: TAX.text },
  warnCard: { backgroundColor: TAX.warnBg, borderColor: TAX.warnBorder, borderWidth: 1, borderRadius: THEME.radius.lg, padding: 14, gap: 12 },
  warnHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  warnTitle: { fontSize: 15, fontWeight: '700', color: TAX.warnText },
  warnText: { fontSize: 13, color: TAX.warnText, marginTop: 2 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', borderRadius: THEME.radius.md, padding: 10 },
  reviewInfo: { flex: 1 },
  reviewStore: { fontSize: 15, fontWeight: '700', color: TAX.text },
  reviewMeta: { fontSize: 12, color: TAX.textSecondary, marginTop: 2 },
  applyBtn: { backgroundColor: THEME.colors.blue, borderRadius: 16, paddingHorizontal: 12, height: 32, justifyContent: 'center' },
  applyText: { color: 'white', fontSize: 13, fontWeight: '700' },
  noTaxBtn: { backgroundColor: THEME.colors.bg, borderRadius: 16, paddingHorizontal: 12, height: 32, justifyContent: 'center' },
  noTaxText: { color: TAX.text, fontSize: 13, fontWeight: '600' },
  emptyCard: { backgroundColor: 'white', borderRadius: THEME.radius.xl, padding: 24, alignItems: 'center', gap: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: TAX.text },
  emptyText: { fontSize: 14, color: TAX.textSecondary, textAlign: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: TAX.text },
  chart: { height: CHART_HEIGHT + 24, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderBottomWidth: 1, borderBottomColor: '#C7C7CC' },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10, fontFamily: 'Courier', color: TAX.textSecondary },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#E9B48E' },
  barPeak: { backgroundColor: TAX.accent },
  barLabels: { flexDirection: 'row', gap: 8, marginTop: -4 },
  barLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: TAX.textSecondary },
  catRow: { gap: 6 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { fontSize: 15, fontWeight: '600', color: TAX.text },
  catValue: { fontSize: 15, color: TAX.textSecondary },
  track: { height: 8, borderRadius: 4, backgroundColor: TAX.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: TAX.accent },
  footnote: { fontSize: 12, lineHeight: 18, color: TAX.textSecondary, paddingHorizontal: 8 },
});
