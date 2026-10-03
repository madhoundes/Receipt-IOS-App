import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lightbulb } from '../components/icons';
import { CategoryIcon, categoryColor } from '../components/CategoryIcon';
import { Illustration } from '../components/Illustration';
import { ProgressBar, StatTile, kit } from '../components/kit';
import { Button, NavBar, Segmented } from '../components/ui';
import { useReceipts } from '../context/ReceiptContext';
import { inSpendRange, spendByCategory, spendRange, spendTips, spendTrend, SpendRange } from '../utils/spend';
import { formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { colors, font, radius, type } from '../theme';

const RANGES: { value: SpendRange; label: string }[] = [
  { value: 'month', label: 'This Month' }, { value: 'last30', label: '30 Days' }, { value: 'ytd', label: 'YTD' }, { value: 'all', label: 'All Time' },
];
const CHART_H = 96;

/** D2 · Insights: spend, trend and top categories for a period. */
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
  const goHst = () => navigation.navigate('Main', { screen: 'HST' });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={() => navigation.goBack()} title="Insights" />
      <ScrollView contentContainerStyle={styles.content}>
        <Segmented options={RANGES} value={range} onChange={setRange} />

        <View style={styles.grid}>
          <StatTile label="Total Spend" value={formatCents(data.total)} />
          <StatTile label="Receipts" value={String(data.count)} />
        </View>
        <View style={styles.grid}>
          <StatTile label="Avg. Receipt" value={formatCents(data.count ? Math.round(data.total / data.count) : 0)} />
          <StatTile label="Total HST" value={formatCents(data.hst)} tax onPress={goHst} />
        </View>

        {data.count === 0 ? (
          <View style={[kit.card, styles.empty]}>
            <Illustration name="noData" size={160} label="No data for this period" />
            <Text style={type.headline}>No data for this period</Text>
            <Text style={[type.subhead, { textAlign: 'center' }]}>Scan a receipt and your spending shows up here.</Text>
            <Button title="Scan a Receipt" variant="tinted" onPress={() => navigation.navigate('CameraModal')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
          </View>
        ) : (
          <>
            <View style={[kit.card, styles.pad]}>
              <View style={styles.cardHead}>
                <Text style={type.headline}>Spending Trend</Text>
                <Text style={type.footnote}>{range === 'ytd' || range === 'all' ? 'by month' : 'by week'}</Text>
              </View>
              <View style={styles.chart} accessibilityLabel={`Spending trend. Highest: ${data.trend[peak]?.label ?? ''} ${formatCents(max)}`}>
                {data.trend.map((b, i) => (
                  <View key={i} style={styles.barCol}>
                    <View style={[styles.bar, { height: Math.max(4, (b.totalCents / max) * CHART_H) }, i === peak && { backgroundColor: colors.accent }]} />
                    <Text style={[styles.barLabel, i === peak && { color: colors.text, ...font.semibold }]} numberOfLines={1}>{b.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[kit.card, styles.pad]}>
              <View style={styles.cardHead}>
                <Text style={type.headline}>Top Categories</Text>
                <Pressable onPress={() => navigation.navigate('Main', { screen: 'Categories' })} accessibilityRole="button" hitSlop={8}>
                  <Text style={kit.link}>See all</Text>
                </Pressable>
              </View>
              {data.byCat.slice(0, 3).map(c => (
                <View key={c.category} style={styles.catRow}>
                  <CategoryIcon category={c.category} size={34} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <View style={styles.catHead}>
                      <Text style={styles.catName} numberOfLines={1}>{c.category}</Text>
                      <Text style={styles.catVal}>{formatCents(c.totalCents)}</Text>
                    </View>
                    <ProgressBar value={c.share} color={categoryColor(categories, c.category)} height={4} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {data.tips.length > 0 && (
          <>
            <Text style={[kit.sectionLabel, { marginTop: 6 }]}>Insights & tips</Text>
            {data.tips.map((t, i) => (
              <View key={t.id} style={[styles.tip, { backgroundColor: i % 2 === 0 ? colors.warnBg : colors.accentSoft }]}>
                <Lightbulb size={20} color={i % 2 === 0 ? colors.tax : colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={type.headline}>{t.title}</Text>
                  <Text style={[type.subhead, { color: colors.text }]}>{t.text}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 8, paddingBottom: 48, gap: 12 },
  grid: { flexDirection: 'row', gap: 12 },
  pad: { padding: 16, gap: 14 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: CHART_H + 22 },
  barCol: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end', gap: 6 },
  bar: { borderRadius: 6, backgroundColor: '#A9D8C5' },
  barLabel: { ...font.regular, fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  catHead: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  catName: { ...font.semibold, fontSize: 16, color: colors.text, flexShrink: 1 },
  catVal: { ...font.regular, fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
  tip: { flexDirection: 'row', gap: 12, borderRadius: radius.lg, padding: 14 },
  empty: { alignItems: 'center', padding: 20, gap: 4 },
});
