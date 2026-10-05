import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryIcon } from '../../components/CategoryIcon';
import { LargeHeader, SearchField, TAB_BAR_SPACE, kit } from '../../components/kit';
import { Segmented } from '../../components/ui';
import { useReceipts } from '../../context/ReceiptContext';
import { inSpendRange, spendByCategory, spendRange, SpendRange } from '../../utils/spend';
import { formatCents } from '../../utils/tax';
import { colors, font, radius, type, themedStyles } from '../../theme';

export const CATEGORY_RANGES: { value: SpendRange; label: string }[] = [
  { value: 'month', label: 'This Month' }, { value: 'last30', label: '30 Days' }, { value: 'ytd', label: 'YTD' }, { value: 'all', label: 'All Time' },
];
const RANGE_CHIPS: { value: SpendRange; label: string }[] = [
  { value: 'month', label: 'This Month' }, { value: 'last30', label: 'Last 30 Days' }, { value: 'ytd', label: 'YTD' }, { value: 'all', label: 'All Time' },
];
type View3 = 'all' | 'high' | 'recent';
const VIEWS: { value: View3; label: string }[] = [{ value: 'all', label: 'All' }, { value: 'high', label: 'High Spend' }, { value: 'recent', label: 'Recent' }];
const EMPTY_TEXT: Record<View3, string> = {
  all: 'No category matches your search.',
  high: 'No spending in this period yet.',
  recent: 'No receipts in this period yet.',
};
const GAP = 10;

/** E1 · Categories: a three-column grid with large round icons and the spend per category for a period. */
export default function CategoriesScreen({ navigation }: any) {
  const { receipts, categories } = useReceipts();
  const { width } = useWindowDimensions();
  const [range, setRange] = useState<SpendRange>('month');
  const [view, setView] = useState<View3>('all');
  const [search, setSearch] = useState('');

  const cardW = Math.floor((width - 32 - GAP * 2) / 3);
  const iconSize = Math.min(88, cardW - 28);

  const { cards, activeCount, totalCents } = useMemo(() => {
    const win = spendRange(range, new Date());
    const inWindow = receipts.filter(r => inSpendRange(r, win));
    const spend = spendByCategory(inWindow);
    const lastSeen = new Map<string, number>();
    for (const r of inWindow) lastSeen.set(r.category, Math.max(lastSeen.get(r.category) ?? 0, new Date(r.purchaseDate).getTime()));
    const q = search.trim().toLowerCase();
    let list = categories
      .filter(c => c.visibility === 'visible')
      .filter(c => !q || [c.name, ...c.aliases, ...c.subcategories.map(s => s.name)].some(t => t.toLowerCase().includes(q)))
      .map(c => ({ def: c, spend: spend.find(s => s.category === c.name), last: lastSeen.get(c.name) ?? 0 }))
      .sort((a, b) => (b.spend?.totalCents ?? 0) - (a.spend?.totalCents ?? 0) || a.def.orderIndex - b.def.orderIndex);
    if (view === 'high') list = list.filter(c => (c.spend?.totalCents ?? 0) > 0).slice(0, 6);
    if (view === 'recent') list = list.filter(c => c.spend).sort((a, b) => b.last - a.last);
    return {
      cards: list,
      activeCount: list.filter(c => c.spend).length,
      totalCents: list.reduce((s, c) => s + (c.spend?.totalCents ?? 0), 0),
    };
  }, [receipts, categories, range, view, search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LargeHeader title="Categories" right={
          <Pressable onPress={() => navigation.navigate('ManageCategories')} accessibilityRole="button" hitSlop={8} style={{ height: 44, justifyContent: 'center' }}>
            <Text style={kit.link}>Manage</Text>
          </Pressable>
        } />
        <SearchField value={search} onChange={setSearch} placeholder="Search categories..." />
        <View style={{ paddingHorizontal: 16 }}><Segmented options={VIEWS} value={view} onChange={setView} /></View>
        <View style={styles.chips}>
          {RANGE_CHIPS.map(o => {
            const on = o.value === range;
            return (
              <Pressable key={o.value} onPress={() => setRange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
                style={[styles.chip, on && styles.chipOn]}>
                <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.summary} accessibilityLiveRegion="polite">
          <Text style={styles.summaryText}>{activeCount} active {activeCount === 1 ? 'category' : 'categories'}</Text>
          <Text style={styles.summaryTotal}>Total: {formatCents(totalCents).replace(/\.00$/, '')}</Text>
        </View>

        {cards.length === 0 && <Text style={[type.subhead, { textAlign: 'center', marginTop: 16, paddingHorizontal: 16 }]}>
          {search.trim() ? `No category matches “${search.trim()}”.` : EMPTY_TEXT[view]}
        </Text>}
        <View style={styles.grid}>
          {cards.map(({ def, spend }) => (
            <Pressable key={def.id} style={({ pressed }) => [styles.card, { width: cardW }, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.navigate('CategoryDetail', { categoryId: def.id, range })} accessibilityRole="button"
              accessibilityLabel={`${def.name}, ${formatCents(spend?.totalCents ?? 0)}, ${spend?.count ?? 0} receipts`}>
              {!!spend && <View style={styles.badge}><Text style={styles.badgeText}>{spend.count}</Text></View>}
              <CategoryIcon category={def.name} size={iconSize} round />
              <Text style={styles.name} numberOfLines={1}>{def.name}</Text>
              <Text style={[styles.total, !spend && styles.none]}>{spend ? formatCents(spend.totalCents).replace(/\.00$/, '') : 'No spend'}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: TAB_BAR_SPACE, gap: 12 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  chip: { flexGrow: 1, flexShrink: 0, height: 36, paddingHorizontal: 10, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { ...font.regular, fontSize: 13, color: colors.text },
  chipTextOn: { ...font.semibold, color: colors.bg },
  summary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 4 },
  summaryText: { ...font.regular, fontSize: 14, color: colors.textSecondary },
  summaryTotal: { ...font.semibold, fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: 16 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, paddingTop: 14, paddingBottom: 14, paddingHorizontal: 8, alignItems: 'center', gap: 6 },
  badge: {
    position: 'absolute', top: 8, right: 8, minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6,
    backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center', zIndex: 1,
  },
  badgeText: { ...font.semibold, fontSize: 12, color: colors.textSecondary },
  name: { ...font.semibold, fontSize: 15, color: colors.text, marginTop: 6, maxWidth: '100%' },
  total: { ...font.regular, fontSize: 14, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  none: { color: colors.placeholder, fontSize: 13 },
}));
