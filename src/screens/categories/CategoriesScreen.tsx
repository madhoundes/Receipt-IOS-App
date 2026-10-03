import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryIcon } from '../../components/CategoryIcon';
import { LargeHeader, SearchField, TAB_BAR_SPACE, kit } from '../../components/kit';
import { Segmented } from '../../components/ui';
import { useReceipts } from '../../context/ReceiptContext';
import { inSpendRange, spendByCategory, spendRange, SpendRange } from '../../utils/spend';
import { formatCents } from '../../utils/tax';
import { colors, font, radius, type } from '../../theme';

export const CATEGORY_RANGES: { value: SpendRange; label: string }[] = [
  { value: 'month', label: 'This Month' }, { value: 'last30', label: '30 Days' }, { value: 'ytd', label: 'YTD' }, { value: 'all', label: 'All Time' },
];

/** E1 · Categories: spend per category for a period. */
export default function CategoriesScreen({ navigation }: any) {
  const { receipts, categories } = useReceipts();
  const [range, setRange] = useState<SpendRange>('month');
  const [search, setSearch] = useState('');

  const cards = useMemo(() => {
    const win = spendRange(range, new Date());
    const spend = spendByCategory(receipts.filter(r => inSpendRange(r, win)));
    const q = search.trim().toLowerCase();
    return categories
      .filter(c => c.visibility === 'visible')
      .filter(c => !q || [c.name, ...c.aliases, ...c.subcategories.map(s => s.name)].some(t => t.toLowerCase().includes(q)))
      .map(c => ({ def: c, spend: spend.find(s => s.category === c.name) }))
      .sort((a, b) => (b.spend?.totalCents ?? 0) - (a.spend?.totalCents ?? 0) || a.def.orderIndex - b.def.orderIndex);
  }, [receipts, categories, range, search]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <LargeHeader title="Categories" right={
          <Pressable onPress={() => navigation.navigate('ManageCategories')} accessibilityRole="button" hitSlop={8} style={{ height: 44, justifyContent: 'center' }}>
            <Text style={kit.link}>Manage</Text>
          </Pressable>
        } />
        <SearchField value={search} onChange={setSearch} placeholder="Search categories" />
        <View style={{ paddingHorizontal: 16 }}><Segmented options={CATEGORY_RANGES} value={range} onChange={setRange} /></View>
        {cards.length === 0 && <Text style={[type.subhead, { textAlign: 'center', marginTop: 24 }]}>No category matches “{search.trim()}”.</Text>}
        <View style={styles.grid}>
          {cards.map(({ def, spend }) => (
            <Pressable key={def.id} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.navigate('CategoryDetail', { categoryId: def.id, range })} accessibilityRole="button"
              accessibilityLabel={`${def.name}, ${formatCents(spend?.totalCents ?? 0)}, ${spend?.count ?? 0} receipts`}>
              <CategoryIcon category={def.name} size={38} />
              <Text style={styles.name} numberOfLines={1}>{def.name}</Text>
              <Text style={[styles.total, !spend && { color: colors.placeholder }]}>{formatCents(spend?.totalCents ?? 0)}</Text>
              <Text style={type.footnote}>{spend ? `${spend.count} ${spend.count === 1 ? 'receipt' : 'receipts'}` : 'No receipts'}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: TAB_BAR_SPACE, gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 16 },
  card: { width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 2 },
  name: { ...font.semibold, fontSize: 16, color: colors.text, marginTop: 10 },
  total: { ...font.bold, fontSize: 20, color: colors.text, fontVariant: ['tabular-nums'] },
});
