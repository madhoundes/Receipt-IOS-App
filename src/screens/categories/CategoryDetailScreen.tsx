import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Illustration } from '../../components/Illustration';
import { Chips, ReceiptRow, StatTile, kit } from '../../components/kit';
import { NavBar, Segmented } from '../../components/ui';
import { useReceipts } from '../../context/ReceiptContext';
import { inSpendRange, spendRange, SpendRange } from '../../utils/spend';
import { formatCents, resolveReceiptTax, toCents } from '../../utils/tax';
import { colors, font, type } from '../../theme';
import { CATEGORY_RANGES } from './CategoriesScreen';

const TAX_LABEL = { none: 'No tax on this category', add: 'Tax added at checkout', included: 'Tax included in price' } as const;

/** E2 · Category detail. */
export default function CategoryDetailScreen({ route, navigation }: any) {
  const { receipts, categories, userProfile } = useReceipts();
  const cat = categories.find(c => c.id === route.params?.categoryId);
  const [range, setRange] = useState<SpendRange>(route.params?.range ?? 'month');
  const [sub, setSub] = useState('All');

  const list = useMemo(() => {
    if (!cat) return [];
    const win = spendRange(range, new Date());
    return receipts.filter(r => r.category === cat.name && inSpendRange(r, win))
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [receipts, cat, range]);

  if (!cat) return null;
  const subs = [...new Set(list.map(r => r.subcategory).filter(Boolean))] as string[];
  const shown = sub === 'All' ? list : list.filter(r => r.subcategory === sub);
  const total = list.reduce((s, r) => s + toCents(r.totalAmount), 0);
  const hst = list.reduce((s, r) => s + resolveReceiptTax(r, categories, userProfile.hstDefaultPercent).hstCents, 0);
  const pct = cat.taxRule.percentOverride ?? userProfile.hstDefaultPercent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={() => navigation.goBack()} backLabel="Categories"
        right={<Pressable onPress={() => navigation.navigate('EditCategory', { categoryId: cat.id })} accessibilityRole="button" hitSlop={8}
          style={{ height: 44, justifyContent: 'center' }}><Text style={kit.link}>Edit</Text></Pressable>} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <CategoryIcon category={cat.name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1} accessibilityRole="header">{cat.name}</Text>
            <Text style={type.subhead}>{TAX_LABEL[cat.taxRule.mode]}{cat.taxRule.mode === 'none' ? '' : ` · ${pct}%`}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <StatTile small label="Spent" value={formatCents(total)} />
          <StatTile small label="Avg." value={formatCents(list.length ? Math.round(total / list.length) : 0)} />
          <StatTile small label="HST" value={formatCents(hst)} tax />
        </View>

        <Segmented options={CATEGORY_RANGES} value={range} onChange={r => { setRange(r); setSub('All'); }} />

        {subs.length > 0 && (
          <View style={{ marginHorizontal: -16 }}>
            <Chips options={['All', ...subs].map(s => ({ value: s, label: s }))} value={subs.includes(sub) ? sub : 'All'} onChange={setSub} tint={cat.color} />
          </View>
        )}

        {shown.length === 0 ? (
          <View style={styles.empty}>
            <Illustration name="noData" size={160} label="No receipts" />
            <Text style={type.headline}>No receipts here yet</Text>
            <Text style={[type.subhead, { textAlign: 'center' }]}>Nothing in {cat.name} for this period.</Text>
          </View>
        ) : (
          <View style={kit.card}>
            {shown.map((r, i) => (
              <ReceiptRow key={r.id} receipt={r} first={i === 0} onPress={() => navigation.navigate('ReceiptDetail', { receiptId: r.id })} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 8, paddingBottom: 48, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  title: { ...font.bold, fontSize: 28, lineHeight: 34, color: colors.text },
  empty: { alignItems: 'center', gap: 4, paddingTop: 12 },
});
