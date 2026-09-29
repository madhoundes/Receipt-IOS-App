import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Share, ChevronRight, Percent, Camera, X } from 'lucide-react-native';
import { useReceipts } from '../context/ReceiptContext';
import { CategoryIcon } from '../components/CategoryIcon';
import { summarizeTax, formatCents, toCents } from '../utils/tax';
import { shareCSV } from '../utils/nativeUtils';
import { colors, fonts, radius, type } from '../theme';
import type { Receipt } from '../types';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Today / This week / This month / older months, newest first. */
const sectionFor = (iso: string, now: Date) => {
  const d = new Date(iso);
  const days = Math.round((startOfDay(now) - startOfDay(d)) / DAY);
  if (days <= 0) return 'Today';
  if (days < 7) return 'This week';
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return 'Earlier this month';
  return d.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
};

const matches = (r: Receipt, q: string) => {
  const hay = [r.storeName, r.category, r.subcategory, r.notes, r.totalAmount.toFixed(2)].filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every(term => hay.includes(term));
};

export default function ReceiptsHistoryScreen({ navigation }: any) {
  const { receipts, userProfile, categories } = useReceipts();
  const [search, setSearch] = useState('');

  const monthTax = useMemo(
    () => summarizeTax(receipts, categories, userProfile.hstDefaultPercent, 'month', new Date()),
    [receipts, categories, userProfile.hstDefaultPercent]
  );

  const sections = useMemo(() => {
    const now = new Date();
    const list = [...receipts].filter(r => !search || matches(r, search))
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
    const map = new Map<string, Receipt[]>();
    for (const r of list) {
      const key = sectionFor(r.purchaseDate, now);
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].map(([title, data]) => ({ title, data }));
  }, [receipts, search]);

  const empty = receipts.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={type.largeTitle}>History</Text>
        {!empty && (
          <Pressable
            onPress={() => shareCSV(sections.flatMap(s => s.data), 'receipts.csv')}
            style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Export CSV"
          >
            <Share size={20} color={colors.accent} />
          </Pressable>
        )}
      </View>

      <View style={styles.search}>
        <Search size={17} color={colors.textMuted} />
        <TextInput
          value={search} onChangeText={setSearch} placeholder="Search store, amount, category…"
          placeholderTextColor={colors.textMuted} style={styles.searchInput} accessibilityLabel="Search receipts"
          returnKeyType="search" clearButtonMode="while-editing"
        />
        {!!search && (
          <Pressable onPress={() => setSearch('')} accessibilityLabel="Clear search" hitSlop={8}><X size={16} color={colors.textMuted} /></Pressable>
        )}
      </View>

      {empty ? (
        <View style={styles.empty}>
          <View style={styles.emptyArt}>
            <View style={styles.emptyPaper}>
              <View style={[styles.line, { width: 30, backgroundColor: '#D1D1D6' }]} />
              <View style={[styles.line, { width: 40 }]} /><View style={[styles.line, { width: 34 }]} /><View style={[styles.line, { width: 38 }]} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No receipts yet</Text>
          <Text style={styles.emptyText}>Capture your first receipt using the camera button.</Text>
          <Pressable style={styles.emptyBtn} onPress={() => navigation.navigate('CameraModal')} accessibilityRole="button">
            <Camera size={20} color="#FFFFFF" /><Text style={styles.emptyBtnText}>Open Camera</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={r => r.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={!search ? (
            <Pressable style={styles.taxCard} onPress={() => navigation.navigate('TaxSummary')} accessibilityRole="button"
              accessibilityLabel={`HST this month ${formatCents(monthTax.hstCents)}`}>
              <View style={styles.taxIcon}><Percent size={20} color="#B4480A" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.taxLabel}>HST this month</Text>
                <Text style={styles.taxValue}>{formatCents(monthTax.hstCents)}</Text>
              </View>
              {monthTax.needsReview.length > 0 && <Text style={styles.pill}>{monthTax.needsReview.length} to review</Text>}
              <ChevronRight size={18} color="#AEAEB2" />
            </Pressable>
          ) : null}
          ListEmptyComponent={<Text style={styles.noResults}>No receipts match “{search}”.</Text>}
          renderSectionHeader={({ section }) => <Text style={[type.sectionLabel, styles.sectionTitle]}>{section.title}</Text>}
          renderItem={({ item, index, section }) => (
            <Pressable
              onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })}
              style={({ pressed }) => [
                styles.row, index === 0 && styles.rowFirst, index === section.data.length - 1 && styles.rowLast,
                index > 0 && styles.rowBorder, pressed && { backgroundColor: '#F7F7FA' },
              ]}
              accessibilityRole="button"
            >
              <CategoryIcon category={item.category} />
              <View style={{ flex: 1 }}>
                <Text style={styles.store} numberOfLines={1}>{item.storeName}</Text>
                <Text style={styles.meta} numberOfLines={1}>{item.category}{item.subcategory ? ` · ${item.subcategory}` : ''}</Text>
              </View>
              <Text style={styles.amount}>{formatCents(toCents(item.totalAmount))}</Text>
              <ChevronRight size={16} color="#AEAEB2" />
            </Pressable>
          )}
        />
      )}

      <Pressable style={styles.fab} onPress={() => navigation.navigate('CameraModal')} accessibilityRole="button" accessibilityLabel="Scan a receipt">
        <Camera size={28} color="#FFFFFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, height: 56 },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.fill, marginHorizontal: 16, marginTop: 8, marginBottom: 8, paddingHorizontal: 12, height: 44, borderRadius: radius.md },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  list: { paddingHorizontal: 16, paddingBottom: 120 },
  taxCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginTop: 8 },
  taxIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.taxSoft, alignItems: 'center', justifyContent: 'center' },
  taxLabel: { fontFamily: fonts.semibold, fontSize: 13, color: colors.textSecondary },
  taxValue: { fontFamily: fonts.monoBold, fontSize: 20, color: colors.text },
  pill: { fontFamily: fonts.bold, fontSize: 12, color: colors.warnText, backgroundColor: colors.warnBg, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' },
  sectionTitle: { marginTop: 20, marginBottom: 8, paddingHorizontal: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12 },
  rowFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  rowLast: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  store: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  meta: { fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  amount: { fontFamily: fonts.mono, fontSize: 16, color: colors.text },
  noResults: { fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  fab: {
    position: 'absolute', right: 20, bottom: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 6,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 8, paddingBottom: 80 },
  emptyArt: { width: 150, height: 150, borderRadius: 75, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyPaper: { width: 64, height: 80, borderRadius: 10, backgroundColor: '#FFFFFF', padding: 12, gap: 6, transform: [{ rotate: '-6deg' }] },
  line: { height: 4, borderRadius: 2, backgroundColor: '#ECECF0' },
  emptyTitle: { fontFamily: fonts.extrabold, fontSize: 22, color: colors.text },
  emptyText: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, color: colors.textSecondary, textAlign: 'center' },
  emptyBtn: { marginTop: 14, height: 52, paddingHorizontal: 24, borderRadius: radius.lg, backgroundColor: colors.accent, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyBtnText: { fontFamily: fonts.bold, fontSize: 17, color: '#FFFFFF' },
});
