import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Plus } from '../../components/icons';
import { CategoryIcon } from '../../components/CategoryIcon';
import { SearchField, kit } from '../../components/kit';
import { NavBar, Segmented } from '../../components/ui';
import { useReceipts } from '../../context/ReceiptContext';
import { colors, font, type } from '../../theme';
import type { CategoryDefinition } from '../../types';

type Filter = 'pinned' | 'all' | 'hidden';

/** E3 · Manage categories: pinned, all and hidden. */
export default function ManageCategoriesScreen({ navigation }: any) {
  const { categories, receipts } = useReceipts();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const q = search.trim().toLowerCase();
  const list = categories
    .filter(c => !q || [c.name, ...c.aliases, ...c.keywords].some(t => t.toLowerCase().includes(q)))
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const count = (name: string) => receipts.filter(r => r.category === name).length;
  const pinned = list.filter(c => c.isPinned && c.visibility === 'visible');
  const others = list.filter(c => !c.isPinned && c.visibility === 'visible');
  const hidden = list.filter(c => c.visibility !== 'visible');
  const groups: [string, CategoryDefinition[]][] =
    filter === 'pinned' ? [['Pinned', pinned]]
      : filter === 'hidden' ? [['Hidden', hidden]]
        : [['Pinned', pinned], ['All categories', others], ['Hidden', hidden]];
  const shown = groups.filter(([, items]) => items.length > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={() => navigation.goBack()} title="Manage Categories" right={
        <Pressable onPress={() => navigation.navigate('EditCategory', {})} style={styles.add} accessibilityRole="button" accessibilityLabel="New category">
          <Plus size={26} color={colors.accent} />
        </Pressable>} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={{ marginHorizontal: -16 }}><SearchField value={search} onChange={setSearch} placeholder="Search categories, aliases" /></View>
        <Segmented options={[{ value: 'pinned', label: 'Pinned' }, { value: 'all', label: 'All' }, { value: 'hidden', label: 'Hidden' }]} value={filter} onChange={setFilter} />
        {shown.length === 0 && (
          <Text style={[type.subhead, { textAlign: 'center', marginTop: 24 }]}>
            {q ? `No category matches “${search.trim()}”.` : filter === 'pinned' ? 'No pinned categories. Pin one from its edit screen.' : 'No hidden categories.'}
          </Text>
        )}
        {shown.map(([title, items]) => (
          <View key={title} style={{ gap: 8 }}>
            <Text style={kit.sectionLabel}>{title}</Text>
            <View style={kit.card}>
              {items.map((c, i) => {
                const n = count(c.name);
                return (
                  <Pressable key={c.id} onPress={() => navigation.navigate('EditCategory', { categoryId: c.id })}
                    style={[styles.row, i > 0 && kit.rowBorder]} accessibilityRole="button" accessibilityLabel={`${c.name}, ${n} receipts. Edit`}>
                    <CategoryIcon category={c.name} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{c.name}</Text>
                      <Text style={type.footnote}>{n} {n === 1 ? 'receipt' : 'receipts'}</Text>
                    </View>
                    <ChevronRight size={16} color="#AEAEB2" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
        <Text style={styles.note}>Renaming or deleting a category moves its receipts. Hidden categories stay out of pickers.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 8, paddingBottom: 48, gap: 14 },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 58, paddingVertical: 8, backgroundColor: colors.card },
  name: { ...font.semibold, fontSize: 17, color: colors.text },
  note: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16 },
});
