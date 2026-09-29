import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShoppingBasket, Utensils, Fuel, Pill, Home, MonitorSmartphone, Shirt, Zap, Car, Clapperboard, Wrench, Box, Plus, X, LucideIcon,
} from 'lucide-react-native';
import { useReceipts } from '../../context/ReceiptContext';
import { CategoryIcon } from '../../components/CategoryIcon';
import { Section, Segmented, SettingRow } from '../../components/ui';
import { confirmAction, triggerHaptic } from '../../utils/nativeUtils';
import { colors, fonts, radius, type } from '../../theme';
import type { CategoryDefinition, ClassifierBoost, TaxRule, Visibility } from '../../types';

const COLORS = ['#12805C', '#B4480A', '#B42318', '#0E7C8C', '#0062CC', '#4A34B8', '#B0266E', '#8A6100', '#475467'];
const ICONS: [string, LucideIcon][] = [
  ['ShoppingBasket', ShoppingBasket], ['Utensils', Utensils], ['Fuel', Fuel], ['Pill', Pill], ['Home', Home], ['MonitorSmartphone', MonitorSmartphone],
  ['Shirt', Shirt], ['Zap', Zap], ['Car', Car], ['Clapperboard', Clapperboard], ['Wrench', Wrench], ['Box', Box],
];
const TAX_HELP: Record<TaxRule['mode'], string> = {
  included: 'Tax is included in the price (e.g. Gas).',
  add: 'Tax is added on top (Retail).',
  none: 'No tax is applied (Basic Groceries).',
};

const blank = (): CategoryDefinition => ({
  id: `cat_${Date.now()}`, name: '', iconName: 'Box', color: COLORS[4], visibility: 'visible', aliases: [], keywords: [],
  subcategories: [], taxRule: { mode: 'add' }, isPinned: false, orderIndex: 999, classifierBoost: 'none',
});

export default function EditCategoryScreen({ route, navigation }: any) {
  const { categories, receipts, saveCategory, mergeCategory, deleteCategory } = useReceipts();
  const existing = categories.find(c => c.id === route.params?.categoryId);
  const [form, setForm] = useState<CategoryDefinition>(() => existing ? JSON.parse(JSON.stringify(existing)) : blank());
  const [newSub, setNewSub] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);
  const [error, setError] = useState<string>();
  const set = (patch: Partial<CategoryDefinition>) => setForm(f => ({ ...f, ...patch }));
  const isOther = existing?.name === 'Other';
  const receiptCount = existing ? receipts.filter(r => r.category === existing.name).length : 0;
  const defaultSubId = form.defaultSubcategoryId ?? form.subcategories[0]?.id;

  const save = () => {
    const name = form.name.trim();
    if (!name) { setError('Give the category a name.'); triggerHaptic('error'); return; }
    if (categories.some(c => c.id !== form.id && c.name.toLowerCase() === name.toLowerCase())) {
      setError('A category with this name already exists.'); triggerHaptic('error'); return;
    }
    saveCategory({ ...form, name, defaultSubcategoryId: defaultSubId }, existing?.name);
    triggerHaptic('success');
    navigation.goBack();
  };

  const addSub = () => {
    const name = newSub.trim();
    if (!name || form.subcategories.some(s => s.name.toLowerCase() === name.toLowerCase())) return;
    set({ subcategories: [...form.subcategories, { id: `s_${Date.now()}`, name }] });
    setNewSub('');
  };
  const addKeyword = () => {
    const k = newKeyword.trim();
    if (!k || form.keywords.includes(k)) return;
    set({ keywords: [...form.keywords, k] });
    setNewKeyword('');
  };

  const doDelete = () => confirmAction('Delete Category?',
    receiptCount ? `Its ${receiptCount} receipt${receiptCount === 1 ? '' : 's'} will move to Other. This action cannot be undone.` : 'This action cannot be undone.',
    'Delete', () => { deleteCategory(form.id); navigation.navigate('ManageCategories'); });

  const doMerge = (target: CategoryDefinition) => {
    setMergeOpen(false);
    confirmAction(`Merge into ${target.name}?`, `${receiptCount} receipt${receiptCount === 1 ? '' : 's'} will move to ${target.name}, and ${form.name} will be removed.`,
      'Merge', () => { mergeCategory(form.id, target.id); navigation.navigate('ManageCategories'); });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.navBtn} accessibilityRole="button"><Text style={styles.navText}>Cancel</Text></Pressable>
        <Text style={type.headline}>{existing ? 'Edit Category' : 'New Category'}</Text>
        <Pressable onPress={save} style={[styles.navBtn, { alignItems: 'flex-end' }]} accessibilityRole="button"><Text style={[styles.navText, { fontFamily: fonts.bold }]}>Save</Text></Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', gap: 12 }}>
            <View style={[styles.preview, { backgroundColor: `${form.color}1F` }]}>
              {React.createElement(ICONS.find(i => i[0] === form.iconName)?.[1] ?? Box, { size: 36, color: form.color })}
            </View>
            <View style={styles.nameBox}>
              <Text style={styles.label}>Category Name</Text>
              <TextInput value={form.name} onChangeText={name => { set({ name }); setError(undefined); }} placeholder="e.g. Hobbies"
                placeholderTextColor={colors.placeholder} style={styles.nameInput} editable={!isOther} accessibilityLabel="Category name" />
            </View>
            {!!error && <Text style={styles.error}>{error}</Text>}
          </View>

          <Section title="Color">
            <View style={styles.swatches}>
              {COLORS.map(c => (
                <Pressable key={c} onPress={() => set({ color: c })} accessibilityRole="button" accessibilityLabel={`Color ${c}`} accessibilityState={{ selected: form.color === c }}
                  style={[styles.swatch, { backgroundColor: c }, form.color === c && { borderWidth: 3, borderColor: '#FFFFFF', shadowColor: c, shadowOpacity: 1, shadowRadius: 0, shadowOffset: { width: 0, height: 0 }, elevation: 2 }]} />
              ))}
            </View>
          </Section>

          <Section title="Icon">
            <View style={styles.icons}>
              {ICONS.map(([name, Icon]) => {
                const on = form.iconName === name;
                return (
                  <Pressable key={name} onPress={() => set({ iconName: name })} style={[styles.iconBtn, on && { backgroundColor: `${form.color}1F` }]}
                    accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: on }}>
                    <Icon size={22} color={on ? form.color : '#3A3A40'} />
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Subcategories & Default" footer="Select the circle to mark as default.">
            {form.subcategories.map((s, i) => (
              <View key={s.id} style={[styles.subRow, i > 0 && styles.rowBorder]}>
                <Pressable onPress={() => set({ defaultSubcategoryId: s.id })} accessibilityRole="radio" accessibilityState={{ checked: s.id === defaultSubId }} hitSlop={8}
                  style={[styles.radio, s.id === defaultSubId && { borderWidth: 7, borderColor: colors.accent }]} />
                <Text style={styles.subName}>{s.name}</Text>
                {s.id === defaultSubId && <Text style={styles.defaultTag}>Default</Text>}
                <Pressable onPress={() => set({ subcategories: form.subcategories.filter(x => x.id !== s.id) })} accessibilityLabel={`Remove ${s.name}`} hitSlop={8}>
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
            <View style={[styles.subRow, form.subcategories.length > 0 && styles.rowBorder]}>
              <Plus size={22} color={colors.accent} />
              <TextInput value={newSub} onChangeText={setNewSub} onSubmitEditing={addSub} placeholder="Add subcategory..." placeholderTextColor={colors.placeholder}
                style={styles.subInput} returnKeyType="done" accessibilityLabel="Add subcategory" />
            </View>
          </Section>

          <Section title="Tax Behavior" footer={TAX_HELP[form.taxRule.mode]}>
            <View style={{ padding: 8 }}>
              <Segmented value={form.taxRule.mode} onChange={mode => set({ taxRule: { ...form.taxRule, mode } })}
                options={[{ value: 'included', label: 'Included' }, { value: 'add', label: 'Add' }, { value: 'none', label: 'None' }]} />
            </View>
          </Section>

          <Section title="Smart Classification" footer="Receiptfy uses these keywords to auto-detect this category.">
            <View style={styles.chips}>
              {form.aliases.map(a => <Chip key={`a${a}`} label={a} tone="alias" onRemove={() => set({ aliases: form.aliases.filter(x => x !== a) })} />)}
              {form.keywords.map(k => <Chip key={`k${k}`} label={k} onRemove={() => set({ keywords: form.keywords.filter(x => x !== k) })} />)}
            </View>
            <TextInput value={newKeyword} onChangeText={setNewKeyword} onSubmitEditing={addKeyword} placeholder="Add keyword alias..."
              placeholderTextColor={colors.placeholder} style={styles.keywordInput} returnKeyType="done" accessibilityLabel="Add keyword alias" />
          </Section>

          <Section title="Classifier Priority">
            <View style={{ padding: 8 }}>
              <Segmented<ClassifierBoost> compact value={form.classifierBoost} onChange={classifierBoost => set({ classifierBoost })}
                options={[{ value: 'none', label: 'Normal' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
            </View>
          </Section>

          <Section title="Visibility">
            <View style={{ padding: 8 }}>
              <Segmented<Visibility> value={form.visibility} onChange={visibility => set({ visibility })}
                options={[{ value: 'visible', label: 'Visible' }, { value: 'hidden', label: 'Hidden' }, { value: 'archived', label: 'Archived' }]} />
            </View>
          </Section>

          <Section>
            <SettingRow first label="Pin to Top" toggle={form.isPinned} onToggle={isPinned => set({ isPinned })} />
            {existing && !isOther && (
              <SettingRow label="Merge Into" value="Select Category" onPress={() => setMergeOpen(true)}
                sub={receiptCount ? `${receiptCount} receipt${receiptCount === 1 ? '' : 's'} in this category` : undefined} />
            )}
          </Section>

          {existing && !isOther && (
            <Pressable style={styles.delete} onPress={doDelete} accessibilityRole="button"><Text style={styles.deleteText}>Delete Category</Text></Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={mergeOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMergeOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={styles.nav}>
            <Pressable onPress={() => setMergeOpen(false)} style={styles.navBtn}><Text style={styles.navText}>Cancel</Text></Pressable>
            <Text style={type.headline}>Merge Into</Text>
            <View style={styles.navBtn} />
          </View>
          <FlatList
            data={categories.filter(c => c.id !== form.id)}
            keyExtractor={c => c.id}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item, index }) => (
              <Pressable onPress={() => doMerge(item)} style={[styles.pickRow, index === 0 && styles.pickFirst, index > 0 && styles.rowBorder]} accessibilityRole="button">
                <CategoryIcon category={item.name} size={32} />
                <Text style={styles.subName}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Chip = ({ label, tone, onRemove }: { label: string; tone?: 'alias'; onRemove: () => void }) => (
  <View style={[styles.chip, tone === 'alias' && { backgroundColor: colors.accentSoft }]}>
    <Text style={[styles.chipText, tone === 'alias' && { color: '#0050A8' }]}>{label}</Text>
    <Pressable onPress={onRemove} accessibilityLabel={`Remove ${label}`} hitSlop={8}><X size={13} color={tone === 'alias' ? '#0050A8' : '#3A3A40'} /></Pressable>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navBtn: { minWidth: 70, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  navText: { fontFamily: fonts.medium, fontSize: 17, color: colors.accent },
  content: { padding: 16, gap: 22, paddingBottom: 48 },
  preview: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  nameBox: { alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: radius.lg, paddingHorizontal: 16, paddingVertical: 10 },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.textSecondary },
  nameInput: { fontFamily: fonts.semibold, fontSize: 17, color: colors.text, paddingVertical: 4 },
  error: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', padding: 14, gap: 8 },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  iconBtn: { width: '14.5%', aspectRatio: 1, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 50 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#C7C7CC' },
  subName: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  defaultTag: { fontFamily: fonts.bold, fontSize: 12, color: colors.textSecondary },
  subInput: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14, paddingBottom: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
  chipText: { fontFamily: fonts.semibold, fontSize: 13, color: '#3A3A40' },
  keywordInput: { marginHorizontal: 14, marginBottom: 14, height: 40, borderRadius: 10, backgroundColor: colors.bg, paddingHorizontal: 12, fontFamily: fonts.regular, fontSize: 15, color: colors.text },
  delete: { height: 52, borderRadius: radius.lg, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontFamily: fonts.semibold, fontSize: 17, color: colors.danger },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, backgroundColor: colors.card },
  pickFirst: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
});
