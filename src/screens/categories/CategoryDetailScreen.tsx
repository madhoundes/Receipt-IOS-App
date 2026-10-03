import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight } from '../../components/icons';
import { useReceipts } from '../../context/ReceiptContext';
import { CategoryIcon } from '../../components/CategoryIcon';
import { NavBar } from '../../components/ui';
import { inSpendRange, spendRange, SpendRange, SPEND_RANGE_LABEL } from '../../utils/spend';
import { formatCents, toCents } from '../../utils/tax';
import { colors, font, radius, type } from '../../theme';

const relDate = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const days = Math.round((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86400000);
  return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
};

export default function CategoryDetailScreen({ route, navigation }: any) {
  const { receipts, categories } = useReceipts();
  const cat = categories.find(c => c.id === route.params?.categoryId);
  const range: SpendRange = route.params?.range ?? 'all';
  const [sub, setSub] = useState<string | null>(null);

  const list = useMemo(() => {
    if (!cat) return [];
    const win = spendRange(range, new Date());
    return receipts.filter(r => r.category === cat.name && inSpendRange(r, win))
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [receipts, cat, range]);

  if (!cat) return null;
  const subs = [...new Set(list.map(r => r.subcategory).filter(Boolean))] as string[];
  const shown = sub ? list.filter(r => r.subcategory === sub) : list;
  const total = list.reduce((s, r) => s + toCents(r.totalAmount), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={() => navigation.goBack()} backLabel="Categories"
        right={<Pressable onPress={() => navigation.navigate('EditCategory', { categoryId: cat.id })} style={styles.edit} accessibilityRole="button">
          <Text style={styles.editText}>Edit</Text></Pressable>} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <CategoryIcon category={cat.name} size={48} />
            <View>
              <Text style={styles.title}>{cat.name}</Text>
              <Text style={styles.meta}>{SPEND_RANGE_LABEL[range]} · {list.length} receipt{list.length === 1 ? '' : 's'}</Text>
            </View>
          </View>
          <View style={styles.stats}>
            <View style={styles.stat}><Text style={styles.statLabel}>Total Spent</Text><Text style={styles.statValue}>{formatCents(total)}</Text></View>
            <View style={styles.stat}><Text style={styles.statLabel}>Avg. Receipt</Text><Text style={styles.statValue}>{formatCents(list.length ? Math.round(total / list.length) : 0)}</Text></View>
          </View>
        </View>

        {subs.length > 0 && (
          <View style={styles.chips}>
            {[null, ...subs].map(s => {
              const on = s === sub;
              const n = s ? list.filter(r => r.subcategory === s).length : list.length;
              return (
                <Pressable key={s ?? 'all'} onPress={() => setSub(s)} style={[styles.chip, on && styles.chipOn]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{s ?? 'All'}{s ? ` · ${n}` : ''}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {shown.length === 0 ? (
          <Text style={styles.empty}>No receipts in this category for {SPEND_RANGE_LABEL[range].toLowerCase()}.</Text>
        ) : (
          <View style={styles.list}>
            {shown.map((r, i) => (
              <Pressable key={r.id} onPress={() => navigation.navigate('ReceiptDetail', { receiptId: r.id })}
                style={[styles.row, i > 0 && styles.rowBorder]} accessibilityRole="button">
                <View style={{ flex: 1 }}>
                  <Text style={styles.store}>{r.storeName}</Text>
                  <Text style={styles.meta}>{relDate(r.purchaseDate)}{r.subcategory ? ` · ${r.subcategory}` : ''}</Text>
                </View>
                <Text style={type.money}>{formatCents(toCents(r.totalAmount))}</Text>
                <ChevronRight size={16} color="#AEAEB2" />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  edit: { height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  editText: { ...font.semibold, fontSize: 17, color: colors.accent },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 18, gap: 16 },
  title: { ...font.extrabold, fontSize: 24, letterSpacing: -0.5, color: colors.text },
  meta: { ...font.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  stats: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, backgroundColor: '#F5F5F8', borderRadius: 14, padding: 12, gap: 2 },
  statLabel: { ...font.semibold, fontSize: 13, color: colors.textSecondary },
  statValue: { ...font.mono, fontSize: 22, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.card, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.text },
  chipText: { ...font.semibold, fontSize: 14, color: '#3A3A40' },
  chipTextOn: { ...font.bold, color: '#FFFFFF' },
  empty: { ...font.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 20 },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  store: { ...font.bold, fontSize: 16, color: colors.text },
});
