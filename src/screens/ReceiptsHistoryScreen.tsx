import React, { useMemo, useState } from 'react';
import { Modal, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Check, Scan, Sort } from '../components/icons';
import { Illustration } from '../components/Illustration';
import { Chips, LargeHeader, ReceiptRow, RoundButton, SearchField, TAB_BAR_SPACE, kit, shortDate } from '../components/kit';
import { Button } from '../components/ui';
import { useReceipts } from '../context/ReceiptContext';
import { formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { colors, font, radius, themedStyles } from '../theme';
import type { Receipt } from '../types';

type SortBy = 'newest' | 'oldest' | 'highest';
const SORTS: { value: SortBy; label: string }[] = [
  { value: 'newest', label: 'Newest first' }, { value: 'oldest', label: 'Oldest first' }, { value: 'highest', label: 'Highest amount' },
];

/** Text a search runs against: store, category, notes, line items and the amount. */
const haystack = (r: Receipt) =>
  [r.storeName, r.category, r.subcategory, r.notes, r.paymentMethod, r.totalAmount.toFixed(2), ...(r.items ?? []).map(i => i.name)]
    .filter(Boolean).join(' ').toLowerCase();
const matches = (r: Receipt, q: string) => {
  const hay = haystack(r);
  return q.toLowerCase().replace(/\$/g, '').split(/\s+/).filter(Boolean).every(term => hay.includes(term));
};
/** Meta line for a search hit: shows the matching line item when the store name didn't match. */
const hitMeta = (r: Receipt, q: string) => {
  const term = q.trim().toLowerCase();
  const item = (r.items ?? []).find(i => i.name.toLowerCase().includes(term));
  return `${shortDate(r.purchaseDate)} · ${item ? item.name : r.subcategory ?? r.category}`;
};

/** C1 Receipts, C2 empty state and C3 search results. */
export default function ReceiptsHistoryScreen({ navigation }: any) {
  const { receipts, userProfile, categories } = useReceipts();
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState<SortBy>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const q = search.trim();

  const chips = useMemo(() => {
    const used = categories.filter(c => receipts.some(r => r.category === c.name)).map(c => c.name);
    return ['All', ...used].map(c => ({ value: c, label: c }));
  }, [categories, receipts]);

  const { sections, list, hstCents, spendCents } = useMemo(() => {
    const list = receipts
      .filter(r => cat === 'All' || r.category === cat)
      .filter(r => !q || matches(r, q))
      .sort((a, b) => sort === 'highest'
        ? b.totalAmount - a.totalAmount
        : (new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()) * (sort === 'oldest' ? -1 : 1));
    const hst = (rs: Receipt[]) => rs.reduce((s, r) => s + resolveReceiptTax(r, categories, userProfile.hstDefaultPercent).hstCents, 0);
    const map = new Map<string, Receipt[]>();
    if (sort === 'highest' || q) map.set(q ? 'Results' : 'Highest amount', list);
    else for (const r of list) {
      const key = new Date(r.purchaseDate).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return {
      list, hstCents: hst(list), spendCents: list.reduce((s, r) => s + toCents(r.totalAmount), 0),
      sections: [...map.entries()].map(([title, data]) => ({ title, data, hstCents: hst(data) })),
    };
  }, [receipts, categories, userProfile.hstDefaultPercent, cat, q, sort]);

  const importPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.85 });
    if (!res.canceled && res.assets[0]) navigation.navigate('CameraModal', { importUri: res.assets[0].uri });
  };

  if (receipts.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LargeHeader title="Receipts" />
        <View style={styles.empty}>
          <Illustration name="emptyReceipts" size={200} label="No receipts yet" />
          <Text style={styles.emptyTitle}>No receipts yet</Text>
          <Text style={styles.emptyText}>Scan a paper receipt or import a photo. The store, total and HST are read for you.</Text>
          <Button title="Scan a Receipt" icon={<Scan size={20} color="#FFFFFF" />} onPress={() => navigation.navigate('CameraModal')}
            style={{ paddingHorizontal: 28, marginTop: 12 }} />
          <Button title="Import from Photos" variant="ghost" onPress={importPhoto} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LargeHeader title="Receipts" right={
        <RoundButton label="Sort" onPress={() => setSortOpen(true)}><Sort size={20} color={colors.text} /></RoundButton>
      } />
      <SearchField value={search} onChange={setSearch} placeholder="Search stores, items, amounts" />
      <View style={{ height: 10 }} />
      <Chips options={chips} value={cat} onChange={setCat} />

      <SectionList
        sections={sections}
        keyExtractor={r => r.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={q && list.length > 0 ? (
          <View style={styles.summary} accessibilityLiveRegion="polite">
            <View>
              <Text style={styles.summaryLabel}>{list.length} {list.length === 1 ? 'receipt matches' : 'receipts match'}</Text>
              <Text style={styles.summaryValue}>{formatCents(spendCents)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryLabel}>HST paid</Text>
              <Text style={[styles.summaryValue, { color: colors.tax }]}>{formatCents(hstCents)}</Text>
            </View>
          </View>
        ) : null}
        ListEmptyComponent={
          <View style={styles.none}>
            <Illustration name="noResults" size={160} label="No results" />
            <Text style={styles.emptyTitle}>No matches</Text>
            <Text style={styles.emptyText}>{q ? `Nothing matches “${q}”. Try a store name, an item or an amount like “86”.` : 'No receipts in this category yet.'}</Text>
          </View>
        }
        ListFooterComponent={q && list.length > 0
          ? <Text style={styles.hint}>Searching store names, line items and amounts. Try “$86” or “towels”.</Text> : null}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <Text style={styles.sectionText}>{section.title}</Text>
            {!q && <Text style={styles.sectionText}>HST {formatCents(section.hstCents)}</Text>}
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <View style={[index === 0 && styles.first, index === section.data.length - 1 && styles.last, { overflow: 'hidden' }]}>
            <ReceiptRow receipt={item} first={index === 0} highlight={q || undefined} meta={q ? hitMeta(item, q) : undefined}
              onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })} />
          </View>
        )}
      />

      <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={() => setSortOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSortOpen(false)} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>Sort receipts</Text>
          <View style={kit.card}>
            {SORTS.map((o, i) => (
              <Pressable key={o.value} onPress={() => { setSort(o.value); setSortOpen(false); }} accessibilityRole="button"
                accessibilityState={{ selected: sort === o.value }} style={[styles.opt, i > 0 && kit.rowBorder]}>
                <Text style={[styles.optText, sort === o.value && font.semibold]}>{o.label}</Text>
                {sort === o.value && <Check size={20} color={colors.accent} />}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { paddingHorizontal: 16, paddingBottom: TAB_BAR_SPACE, paddingTop: 6 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  sectionText: { ...font.regular, fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', fontVariant: ['tabular-nums'] },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg },
  summary: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.warnBg, borderRadius: radius.lg, padding: 14, marginTop: 10,
  },
  summaryLabel: { ...font.regular, fontSize: 13, color: colors.textSecondary },
  summaryValue: { ...font.bold, fontSize: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  hint: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16, paddingTop: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: TAB_BAR_SPACE, gap: 8 },
  none: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, gap: 6 },
  emptyTitle: { ...font.bold, fontSize: 22, color: colors.text },
  emptyText: { ...font.regular, fontSize: 17, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.backdrop },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 34, gap: 12,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: colors.grabber },
  sheetTitle: { ...font.semibold, fontSize: 17, color: colors.text, textAlign: 'center' },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 48, backgroundColor: colors.card },
  optText: { ...font.regular, fontSize: 17, color: colors.text },
}));
