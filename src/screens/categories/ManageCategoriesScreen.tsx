import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search, ChevronRight } from '../../components/icons';
import { useReceipts } from '../../context/ReceiptContext';
import { CategoryIcon } from '../../components/CategoryIcon';
import { NavBar } from '../../components/ui';
import { colors, font, radius, type } from '../../theme';
import type { CategoryDefinition } from '../../types';

const TAX_LABEL = { none: 'No tax', add: 'Tax added', included: 'Tax included' } as const;

export default function ManageCategoriesScreen({ navigation }: any) {
  const { categories } = useReceipts();
  const [search, setSearch] = useState('');
  const q = search.trim().toLowerCase();
  const list = categories
    .filter(c => !q || [c.name, ...c.aliases, ...c.keywords].some(t => t.toLowerCase().includes(q)))
    .sort((a, b) => a.orderIndex - b.orderIndex);
  const groups: [string, CategoryDefinition[]][] = [
    ['Pinned', list.filter(c => c.isPinned && c.visibility === 'visible')],
    ['All categories', list.filter(c => !c.isPinned && c.visibility === 'visible')],
    ['Hidden & archived', list.filter(c => c.visibility !== 'visible')],
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={() => navigation.goBack()} right={
        <Pressable onPress={() => navigation.navigate('EditCategory', {})} style={styles.add} accessibilityRole="button" accessibilityLabel="New category">
          <Plus size={24} color={colors.accent} strokeWidth={2.4} />
        </Pressable>} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[type.title, { paddingHorizontal: 4 }]}>Manage Categories</Text>
        <View style={styles.search}>
          <Search size={17} color={colors.textMuted} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Search categories, aliases..." placeholderTextColor={colors.textMuted}
            style={styles.searchInput} accessibilityLabel="Search categories" />
        </View>
        {list.length === 0 && <Text style={styles.none}>No categories found.</Text>}
        {groups.filter(([, items]) => items.length > 0).map(([title, items]) => (
          <View key={title} style={{ gap: 8 }}>
            <Text style={[type.sectionLabel, { paddingHorizontal: 8 }]}>{title}</Text>
            <View style={styles.group}>
              {items.map((c, i) => (
                <Pressable key={c.id} onPress={() => navigation.navigate('EditCategory', { categoryId: c.id })}
                  style={[styles.row, i > 0 && styles.rowBorder]} accessibilityRole="button">
                  <CategoryIcon category={c.name} size={34} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text style={styles.meta}>
                      {c.subcategories.length} subcategor{c.subcategories.length === 1 ? 'y' : 'ies'} · {TAX_LABEL[c.taxRule.mode]}
                      {c.visibility !== 'visible' ? ` · ${c.visibility}` : ''}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#AEAEB2" />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  add: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.fill, paddingHorizontal: 12, height: 44, borderRadius: radius.md },
  searchInput: { flex: 1, ...font.regular, fontSize: 16, color: colors.text },
  none: { ...font.regular, fontSize: 15, color: colors.textMuted, textAlign: 'center' },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { ...font.bold, fontSize: 16, color: colors.text },
  meta: { ...font.regular, fontSize: 12, color: colors.textMuted, marginTop: 1 },
});
