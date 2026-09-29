import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, PieChart, Utensils, Lightbulb, LucideIcon } from 'lucide-react-native';
import { useReceipts } from '../context/ReceiptContext';
import { inSpendRange, spendByCategory, spendRange, spendTips, spendTrend, SpendRange, SPEND_RANGE_LABEL } from '../utils/spend';
import { formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { colors, fonts, radius, type } from '../theme';

const RANGES: SpendRange[] = ['all', 'week', 'lastWeek', 'month', 'lastMonth'];
const TIP_ICON: Record<string, [LucideIcon, string, string]> = {
  heavy: [PieChart, colors.taxSoft, '#B4480A'],
  dining: [Utensils, '#FBE4E4', '#B42318'],
  start: [Lightbulb, '#FBF1CF', '#8A6100'],
};
const CHART_H = 150;

export default function InsightsScreen({ navigation }: any) {
  const { receipts, categories, userProfile } = useReceipts();
  const [range, setRange] = useState<SpendRange>('month');

  const data = useMemo(() => {
    const now = new Date();
    const list = receipts.filter(r => inSpendRange(r, spendRange(range, now)));
    const total = list.reduce((s, r) => s + toCents(r.totalAmount), 0);
    const hst = list.map(r => resolveReceiptTax(r, categories, userProfile.hstDefaultPercent)).reduce((s, t) => s + t.hstCents, 0);
    const byCat = spendByCategory(list);
    return { count: list.length, total, hst, byCat, trend: spendTrend(receipts, range, now), tips: spendTips(byCat, list.length) };
  }, [receipts, categories, userProfile.hstDefaultPercent, range]);

  const max = Math.max(1, ...data.trend.map(b => b.totalCents));
  const peak = data.trend.findIndex(b => b.totalCents === max && max > 1);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.largeTitle, { paddingHorizontal: 4 }]}>Insights</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {RANGES.map(r => (
            <Pressable key={r} onPress={() => setRange(r)} style={[styles.chip, range === r && styles.chipOn]}
              accessibilityRole="button" accessibilityState={{ selected: range === r }}>
              <Text style={[styles.chipText, range === r && styles.chipTextOn]}>{r === 'all' ? 'All' : SPEND_RANGE_LABEL[r]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.card}>
          <Text style={styles.label}>Total Spend</Text>
          <Text style={styles.hero}>{formatCents(data.total)}</Text>
          <View style={styles.hr} />
          <View style={styles.stats}>
            <Stat label="Receipts" value={String(data.count)} />
            <Stat label="Avg. Receipt" value={formatCents(data.count ? Math.round(data.total / data.count) : 0)} />
            <Pressable style={styles.hstTile} onPress={() => navigation.navigate('TaxSummary')} accessibilityRole="button" accessibilityLabel={`Total HST ${formatCents(data.hst)}`}>
              <Text style={[styles.statLabel, { color: colors.taxText, fontFamily: fonts.bold }]}>Total HST ›</Text>
              <Text style={styles.statValue}>{formatCents(data.hst)}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={type.headline}>Spending Trend</Text>
            <Text style={styles.meta}>{range === 'week' || range === 'lastWeek' ? 'By day' : range === 'all' ? 'By month' : 'By week'}</Text>
          </View>
          {data.count === 0 ? (
            <Text style={styles.empty}>No data for this period.</Text>
          ) : (
            <>
              <View style={styles.chart}>
                {data.trend.map((b, i) => (
                  <View key={i} style={styles.barCol}>
                    <Text style={[styles.barVal, i === peak && { color: colors.text, fontFamily: fonts.monoBold }]} numberOfLines={1}>
                      {b.totalCents ? `$${Math.round(b.totalCents / 100)}` : ''}
                    </Text>
                    <View style={[styles.bar, { height: Math.max(3, (b.totalCents / max) * CHART_H) }, i === peak && { backgroundColor: colors.accent }]} />
                  </View>
                ))}
              </View>
              <View style={styles.labels}>
                {data.trend.map((b, i) => <Text key={i} style={[styles.barLabel, i === peak && { color: colors.text }]} numberOfLines={1}>{b.label}</Text>)}
              </View>
            </>
          )}
        </View>

        {data.byCat.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={type.headline}>Top Categories</Text>
              <Pressable onPress={() => navigation.navigate('Categories')} accessibilityRole="button"><Text style={styles.link}>See all</Text></Pressable>
            </View>
            {data.byCat.slice(0, 3).map(c => (
              <View key={c.category} style={{ gap: 7 }}>
                <View style={styles.catHead}>
                  <Text style={styles.catName}>{c.category}</Text>
                  <Text style={styles.catVal}><Text style={styles.mono}>{formatCents(c.totalCents)}</Text> · {Math.round(c.share * 100)}%</Text>
                </View>
                <View style={styles.track}><View style={[styles.fill, { width: `${c.share * 100}%` as const }]} /></View>
              </View>
            ))}
          </View>
        )}

        {data.tips.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={[type.sectionLabel, { paddingHorizontal: 8 }]}>Insights & Tips</Text>
            {data.tips.map(t => {
              const [Icon, bg, fg] = TIP_ICON[t.id] ?? TIP_ICON.start;
              return (
                <View key={t.id} style={styles.tip}>
                  <View style={[styles.tipIcon, { backgroundColor: bg }]}><Icon size={18} color={fg} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={type.headline}>{t.title}</Text>
                    <Text style={styles.tipText}>{t.text}</Text>
                  </View>
                  {t.id === 'start' && (
                    <Pressable onPress={() => navigation.navigate('CameraModal')} accessibilityRole="button"><Text style={styles.link}>Scan Now</Text></Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flex: 1, gap: 2 }}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.card, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.text },
  chipText: { fontFamily: fonts.semibold, fontSize: 14, color: '#3A3A40' },
  chipTextOn: { fontFamily: fonts.bold, color: '#FFFFFF' },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 18, gap: 14 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textSecondary },
  hero: { fontFamily: fonts.mono, fontSize: 40, letterSpacing: -1.2, color: colors.text, marginTop: -8 },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  stats: { flexDirection: 'row', gap: 8 },
  statLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  statValue: { fontFamily: fonts.mono, fontSize: 18, color: colors.text },
  hstTile: { flex: 1, gap: 2, backgroundColor: '#FFF4EB', borderRadius: 10, margin: -6, padding: 6 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  meta: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  empty: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', paddingVertical: 30 },
  chart: { height: CHART_H + 24, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderBottomWidth: 1, borderBottomColor: '#C7C7CC' },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barVal: { fontFamily: fonts.mono, fontSize: 10, color: colors.textSecondary },
  bar: { width: '100%', maxWidth: 44, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: '#A9C8F2' },
  labels: { flexDirection: 'row', gap: 8, marginTop: -6 },
  barLabel: { flex: 1, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 11, color: colors.textSecondary },
  link: { fontFamily: fonts.bold, fontSize: 14, color: colors.accent },
  catHead: { flexDirection: 'row', justifyContent: 'space-between' },
  catName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.text },
  catVal: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary },
  mono: { fontFamily: fonts.mono, color: colors.text },
  track: { height: 8, borderRadius: 4, backgroundColor: '#EFEFF3', overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4, backgroundColor: colors.accent },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 },
  tipIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tipText: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.textSecondary, marginTop: 2 },
});
