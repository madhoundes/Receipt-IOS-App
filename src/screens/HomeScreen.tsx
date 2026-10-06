import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, FileDown, Sparkles, TrendUp } from '../components/icons';
import { categoryColor } from '../components/CategoryIcon';
import { Illustration } from '../components/Illustration';
import { initialsOf } from '../components/MerchantAvatar';
import { LargeHeader, OptionSheet, ReceiptRow, RoundButton, TAB_BAR_SPACE, kit } from '../components/kit';
import { Button, Segmented } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { buildCsv } from '../utils/csv';
import { shareCSV, sharePDF, triggerHaptic } from '../utils/nativeUtils';
import { buildReportHtml } from '../utils/report';
import { spendByCategory } from '../utils/spend';
import { TaxPeriod, formatCents, formatPeriodLabel, getPeriodRange, resolveReceiptTax, shiftPeriod, summarizeTax } from '../utils/tax';
import { colors, font, radius, themedStyles } from '../theme';

const PERIODS: { value: TaxPeriod; label: string }[] = [
  { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'year', label: 'Year' },
];
const THIS: Record<TaxPeriod, string> = { week: 'THIS WEEK', month: 'THIS MONTH', quarter: 'THIS QUARTER', year: 'THIS YEAR' };
type Format = 'pdf' | 'csv';
const FORMATS: { value: Format; label: string; sub: string }[] = [
  { value: 'pdf', label: 'PDF report', sub: 'Totals by category and month, then every receipt' },
  { value: 'csv', label: 'CSV for Excel', sub: 'One row per receipt, opens in Excel or Numbers' },
];
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** D1 · Home: what was spent and how much HST was paid in a week, month or year, with a download for the accountant. */
export default function HomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const { receipts, categories, userProfile } = useReceipts();
  const [period, setPeriod] = useState<TaxPeriod>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string>();
  const now = new Date();

  const data = useMemo(() => {
    const tax = summarizeTax(receipts, categories, userProfile.hstDefaultPercent, period, anchor);
    const inPeriod = receipts.filter(r => { const d = new Date(r.purchaseDate); return d >= tax.range.start && d < tax.range.end; });
    const recent = [...receipts].sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()).slice(0, 4);
    return { tax, inPeriod, shares: spendByCategory(inPeriod).slice(0, 4), recent };
  }, [receipts, categories, userProfile.hstDefaultPercent, period, anchor]);

  const { tax } = data;
  const label = formatPeriodLabel(period, anchor);
  const current = getPeriodRange(period, now).start.getTime() === tax.range.start.getTime();
  const canGoForward = getPeriodRange(period, shiftPeriod(period, anchor, 1)).start <= now;
  const review = tax.needsReview.length;
  const count = tax.receiptCount;

  const changePeriod = (next: TaxPeriod) => { triggerHaptic('light'); setPeriod(next); setAnchor(new Date()); };
  const step = (delta: number) => { triggerHaptic('light'); setAnchor(shiftPeriod(period, anchor, delta)); };

  // The file holds exactly the period on screen.
  const download = async (format: Format) => {
    setSheet(false);
    if (busy || count === 0) return;
    setBusy(true);
    setDownloadError(undefined);
    // iOS cannot open the share sheet while the option sheet is still closing: the call would never come back.
    await wait(Platform.OS === 'ios' ? 650 : 250);
    const rows = data.inPeriod.map(r => resolveReceiptTax(r, categories, userProfile.hstDefaultPercent));
    const last = new Date(tax.range.end.getFullYear(), tax.range.end.getMonth(), tax.range.end.getDate() - 1);
    const name = `Maplestub_${day(tax.range.start)}_${day(last)}.${format}`;
    const job = (format === 'csv'
      ? shareCSV(buildCsv(rows), name)
      : sharePDF(buildReportHtml(rows, { title: 'Maplestub · HST summary', periodLabel: label, preparedFor: user?.name, lineItems: true }), name)
    ).then(() => true, () => { triggerHaptic('error'); setDownloadError('The file could not be created. Please try again.'); return false; });
    // The spinner covers building the file only. It never waits for the share sheet to be closed, and never spins forever.
    await Promise.race([job, wait(4000)]);
    setBusy(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <LargeHeader
          eyebrow={now.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' })}
          title="Summary"
          right={<>
            <RoundButton label="Insights" onPress={() => navigation.navigate('Insights')}><TrendUp size={20} color={colors.text} /></RoundButton>
            <Pressable onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Profile and settings" style={styles.avatar}>
              <Text style={styles.avatarText}>{initialsOf(user?.name ?? 'You').slice(0, 1)}</Text>
            </Pressable>
          </>}
        />

        {receipts.length === 0 ? (
          <View style={styles.empty}>
            <Illustration name="emptyReceipts" size={180} label="No receipts yet" />
            <Text style={styles.emptyTitle}>No receipts yet</Text>
            <Text style={styles.emptyText}>Scan a paper receipt or import a photo. The store, total and HST are read for you.</Text>
            <Button title="Scan a Receipt" onPress={() => navigation.navigate('CameraModal')} style={{ alignSelf: 'center', paddingHorizontal: 28, marginTop: 8 }} />
          </View>
        ) : (
          <>
            <View style={styles.pad}><Segmented options={PERIODS} value={period} onChange={changePeriod} /></View>

            <View style={styles.card}>
              <View style={styles.periodRow}>
                <Pressable onPress={() => step(-1)} style={styles.arrow} accessibilityRole="button" accessibilityLabel="Previous period" hitSlop={6}>
                  <ChevronLeft size={18} color={colors.text} />
                </Pressable>
                <Text style={styles.periodText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} accessibilityLiveRegion="polite">{label}</Text>
                <Pressable onPress={canGoForward ? () => step(1) : undefined} disabled={!canGoForward} style={[styles.arrow, !canGoForward && { opacity: 0.35 }]}
                  accessibilityRole="button" accessibilityLabel="Next period" accessibilityState={{ disabled: !canGoForward }} hitSlop={6}>
                  <ChevronRight size={18} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.headRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.heroLabel}>{current ? `HST PAID ${THIS[period]}` : 'HST PAID'}</Text>
                  <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCents(tax.hstCents)}</Text>
                </View>
                <Pressable onPress={() => setSheet(true)} disabled={count === 0 || busy} style={({ pressed }) => [styles.download, (count === 0) && { opacity: 0.45 }, pressed && { opacity: 0.7 }]}
                  accessibilityRole="button" accessibilityLabel={`Download ${label} as PDF or CSV`} accessibilityState={{ disabled: count === 0 || busy, busy }}>
                  {busy ? <ActivityIndicator size="small" color={colors.accent} /> : <FileDown size={18} color={colors.accent} />}
                  <Text style={styles.downloadText}>Download</Text>
                </Pressable>
              </View>

              <View style={styles.line}>
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
                <Text style={styles.lineLabel}>Total spent</Text>
                <Text style={styles.lineValue}>{formatCents(tax.spendCents)}</Text>
              </View>
              <View style={styles.line}>
                <View style={[styles.dot, { backgroundColor: colors.tax }]} />
                <Text style={styles.lineLabel}>HST paid</Text>
                <Text style={[styles.lineValue, { color: colors.tax }]}>{formatCents(tax.hstCents)}</Text>
              </View>
              <View style={styles.line}>
                <View style={[styles.dot, { backgroundColor: colors.chevron }]} />
                <Text style={styles.lineLabel}>Receipts</Text>
                <Text style={styles.lineValue}>{count}</Text>
              </View>

              {!!downloadError && <Text style={[styles.none, { color: colors.danger }]} accessibilityLiveRegion="polite">{downloadError}</Text>}
              {count === 0 ? (
                <Text style={styles.none}>No receipts in this period.</Text>
              ) : data.shares.length > 0 && (
                <View style={{ gap: 8, marginTop: 2 }}>
                  <View style={styles.bar}>
                    {data.shares.map(s => (
                      <View key={s.category} style={{ flex: Math.max(s.share, 0.04), height: 8, borderRadius: 4, backgroundColor: categoryColor(categories, s.category) }} />
                    ))}
                  </View>
                  <View style={styles.legend}>
                    {data.shares.map(s => (
                      <View key={s.category} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: categoryColor(categories, s.category) }]} />
                        <Text style={styles.legendText} numberOfLines={1}>{s.category} {Math.round(s.share * 100)}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Button title="View Full Summary" variant="tinted" onPress={() => navigation.navigate('HST', { period: period === 'week' ? 'month' : period, anchor: anchor.toISOString() })} />
            </View>

            {review > 0 && (
              <Pressable style={({ pressed }) => [styles.review, pressed && { opacity: 0.8 }]} onPress={() => navigation.navigate('HST', { period: period === 'week' ? 'month' : period, anchor: anchor.toISOString() })} accessibilityRole="button">
                <View style={styles.reviewIcon}><Sparkles size={18} color={colors.tax} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewTitle}>{review} {review === 1 ? 'receipt needs' : 'receipts need'} a quick review</Text>
                  <Text style={styles.reviewText}>Their HST is not in the total until you confirm it.</Text>
                </View>
                <ChevronRight size={16} color={colors.chevron} />
              </Pressable>
            )}

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Recent</Text>
              <Pressable onPress={() => navigation.navigate('Receipts')} accessibilityRole="button" hitSlop={8}><Text style={kit.link}>See All</Text></Pressable>
            </View>
            <View style={[kit.card, { marginHorizontal: 16 }]}>
              {data.recent.map((r, i) => (
                <ReceiptRow key={r.id} receipt={r} first={i === 0} onPress={() => navigation.navigate('ReceiptDetail', { receiptId: r.id })} />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <OptionSheet<Format> visible={sheet} title={`Download ${label}`} options={FORMATS} onPick={download} onClose={() => setSheet(false)} />
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: TAB_BAR_SPACE, gap: 14 },
  pad: { paddingHorizontal: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...font.bold, fontSize: 18, color: colors.accent },
  card: { marginHorizontal: 16, backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, gap: 10 },
  periodRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  periodText: { flex: 1, textAlign: 'center', ...font.semibold, fontSize: 17, color: colors.text },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  heroLabel: { ...font.semibold, fontSize: 12, letterSpacing: 0.8, color: colors.textSecondary },
  heroValue: { ...font.bold, fontSize: 34, lineHeight: 40, color: colors.text, fontVariant: ['tabular-nums'] },
  download: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.accentSoft },
  downloadText: { ...font.semibold, fontSize: 15, color: colors.accent },
  line: {
    flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.separator,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  lineLabel: { flex: 1, ...font.regular, fontSize: 17, color: colors.textSecondary },
  lineValue: { ...font.semibold, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  none: { ...font.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', paddingVertical: 4 },
  bar: { flexDirection: 'row', gap: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { ...font.regular, fontSize: 12, color: colors.textSecondary },
  review: {
    marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg,
    backgroundColor: colors.warnBg, borderWidth: 1, borderColor: colors.warnBorder,
  },
  reviewIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.taxSoft, alignItems: 'center', justifyContent: 'center' },
  reviewTitle: { ...font.semibold, fontSize: 15, color: colors.warnText },
  reviewText: { ...font.regular, fontSize: 13, color: colors.warnText },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 4 },
  sectionTitle: { ...font.bold, fontSize: 22, color: colors.text },
  empty: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 24, gap: 8 },
  emptyTitle: { ...font.bold, fontSize: 22, color: colors.text },
  emptyText: { ...font.regular, fontSize: 17, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
}));
