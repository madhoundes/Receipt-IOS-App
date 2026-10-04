import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, Search, Settings } from './icons';
import { CategoryIcon } from './CategoryIcon';
import { useReceipts } from '../context/ReceiptContext';
import { colors, font, radius, type, themedStyles } from '../theme';

/**
 * Category sheet (design B6). Tap a category to pick it; the chosen one expands to show its
 * subcategories. Nothing changes until the user taps Done.
 */
export function CategoryPickerSheet({ visible, category, subcategory, onClose, onDone, onManage }: {
  visible: boolean;
  category: string;
  subcategory?: string;
  onClose: () => void;
  onDone: (category: string, subcategory?: string) => void;
  onManage?: () => void;
}) {
  const { categories } = useReceipts();
  const [query, setQuery] = useState('');
  const [pickedCat, setPickedCat] = useState(category);
  const [pickedSub, setPickedSub] = useState(subcategory);

  useEffect(() => {
    if (visible) { setPickedCat(category); setPickedSub(subcategory); setQuery(''); }
  }, [visible, category, subcategory]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .filter(c => c.visibility === 'visible')
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.aliases.some(a => a.toLowerCase().includes(q)))
      // Pinned first, then the order set in Manage Categories.
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned) || a.orderIndex - b.orderIndex);
  }, [categories, query]);

  const pick = (id: string) => {
    const c = categories.find(x => x.id === id);
    if (!c) return;
    setPickedCat(c.name);
    setPickedSub(c.subcategories.find(s => s.id === c.defaultSubcategoryId)?.name ?? c.subcategories[0]?.name);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <View style={styles.head}>
          <Pressable onPress={onClose} style={styles.headBtn} accessibilityRole="button"><Text style={styles.headText}>Cancel</Text></Pressable>
          <Text style={type.headline}>Category</Text>
          <Pressable onPress={() => onDone(pickedCat, pickedSub)} style={[styles.headBtn, { alignItems: 'flex-end' }]} accessibilityRole="button">
            <Text style={[styles.headText, font.semibold]}>Done</Text>
          </Pressable>
        </View>

        <View style={styles.search}>
          <Search size={18} color={colors.placeholder} />
          <TextInput
            value={query} onChangeText={setQuery} placeholder="Search categories" placeholderTextColor={colors.placeholder}
            style={styles.searchInput} accessibilityLabel="Search categories" autoCorrect={false} returnKeyType="search"
          />
        </View>

        <FlatList
          data={list}
          keyExtractor={c => c.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={<Text style={[type.subhead, { textAlign: 'center', marginTop: 32 }]}>No category matches “{query}”.</Text>}
          renderItem={({ item, index }) => {
            const on = item.name === pickedCat;
            return (
              <View style={[styles.rowWrap, index === 0 && styles.first, index === list.length - 1 && styles.last]}>
                <Pressable onPress={() => pick(item.id)} style={styles.row} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <CategoryIcon category={item.name} size={32} />
                  <Text style={[styles.name, { flex: 1 }]}>{item.name}</Text>
                  {on && <Check size={20} color={colors.accent} />}
                </Pressable>
                {on && item.subcategories.length > 0 && (
                  <View style={styles.subs}>
                    {item.subcategories.map(s => {
                      const sel = s.name === pickedSub;
                      return (
                        <Pressable key={s.id} onPress={() => setPickedSub(s.name)} accessibilityRole="button" accessibilityState={{ selected: sel }}
                          style={[styles.chip, sel && styles.chipOn]}>
                          <Text style={[styles.chipText, sel && { color: '#FFFFFF' }]}>{s.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {index < list.length - 1 && <View style={styles.sep} />}
              </View>
            );
          }}
          ListFooterComponent={onManage ? (
            <Pressable onPress={() => { onClose(); onManage(); }} style={styles.manage} accessibilityRole="button">
              <Settings size={18} color={colors.accent} />
              <Text style={styles.manageText}>Manage Categories</Text>
            </Pressable>
          ) : null}
        />
      </View>
    </Modal>
  );
}

const styles = themedStyles(() => ({
  wrap: { flex: 1, backgroundColor: colors.bg },
  head: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  headBtn: { minWidth: 72, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  headText: { ...font.regular, fontSize: 17, color: colors.accent },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 10,
    height: 36, borderRadius: 10, backgroundColor: colors.fill,
  },
  searchInput: { flex: 1, ...font.regular, fontSize: 17, color: colors.text, padding: 0 },
  rowWrap: { backgroundColor: colors.card },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden' },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52 },
  name: { ...font.semibold, fontSize: 17, color: colors.text },
  subs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 60, paddingRight: 16, paddingBottom: 12 },
  chip: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.accentSoft, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.accentFill },
  chipText: { ...font.semibold, fontSize: 15, color: colors.accent },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: 60 },
  manage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, marginTop: 8 },
  manageText: { ...font.regular, fontSize: 17, color: colors.accent },
}));
