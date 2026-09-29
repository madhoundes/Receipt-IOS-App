import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useReceipts } from '../../context/ReceiptContext';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Segmented } from '../../components/ui';
import { inSpendRange, spendByCategory, spendRange, SpendRange } from '../../utils/spend';
import { formatCents } from '../../utils/tax';
import { colors, fonts, radius, type } from '../../theme';

const RANGES: SpendRange[] = ['month', 'last30', 'ytd', 'all'];
const LABEL: Record<string, string> = { month: 'This Month', last30: '30 Days', ytd: 'YTD', all: 'All Time' };

export default function CategoriesScreen({ navigation }: any) {
  const { receipts, categories } = useReceipts();
  const [range, setRange] = useState<SpendRange>('last30');
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
      <View style={styles.header}>
        <Text style={type.largeTitle}>Categories</Text>
        <Pressable onPress={() => navigation.navigate('ManageCategories')} style={styles.headerBtn}
          accessibilityRole="button" accessibilityLabel="Manage categories">
          <SlidersHorizontal size={20} color={colors.accent} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Segmented compact options={RANGES.map(r => ({ value: r, label: LABEL[r] }))} value={range} onChange={setRange} />
        <View style={styles.search}>
          <Search size={17} color={colors.textMuted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search categories..." placeholderTextColor={colors.textMuted}
            style={styles.searchInput} accessibilityLabel="Search categories" />
        </View>
        {cards.length === 0 && <Text style={styles.none}>No categories found.</Text>}
        <View style={styles.grid}>
          {cards.map(({ def, spend }) => (
            <Pressable key={def.id} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              onPress={() => navigation.navigate('CategoryDetail', { categoryId: def.id, range })} accessibilityRole="button">
              <View style={styles.cardTop}>
                <CategoryIcon category={def.name} size={36} />
                <Text style={styles.count}>{spend ? `${spend.count} receipt${spend.count === 1 ? '' : 's'}` : 'No receipts'}</Text>
              </View>
              <View>
                <Text style={styles.name} numberOfLines={1}>{def.name}</Text>
                <Text style={[styles.total, !spend && { color: colors.textMuted }]}>{formatCents(spend?.totalCents ?? 0)}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, height: 56 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.fill, paddingHorizontal: 12, height: 44, borderRadius: radius.md },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  none: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '48%', flexGrow: 1, height: 112, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, justifyContent: 'space-between' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  count: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textMuted },
  name: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  total: { fontFamily: fonts.mono, fontSize: 15, color: colors.text, marginTop: 1 },
});
