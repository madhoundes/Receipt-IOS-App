import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ShoppingBasket, Utensils, Fuel, Pill, Home, MonitorSmartphone, Shirt, Zap, Car, Clapperboard, Wrench, Box, Plus, X, LucideIcon,
} from '../../components/icons';
import { useReceipts } from '../../context/ReceiptContext';
import { OptionSheet, kit } from '../../components/kit';
import { Field, FieldGroup, Section, Segmented, SettingRow } from '../../components/ui';
import { confirmAction, triggerHaptic } from '../../utils/nativeUtils';
import { colors, font, radius, type, themedStyles, soft, tone } from '../../theme';
import type { CategoryDefinition, ClassifierBoost, TaxRule, Visibility } from '../../types';

const COLORS = ['#1E7A35', '#B04A08', '#0A5BC4', '#B8185A', '#5A3CC2', '#0B6E77', '#B42318', '#8A6100', '#555559'];
const ICONS: [string, LucideIcon][] = [
  ['ShoppingBasket', ShoppingBasket], ['Utensils', Utensils], ['Fuel', Fuel], ['Pill', Pill], ['Home', Home], ['MonitorSmartphone', MonitorSmartphone],
  ['Shirt', Shirt], ['Zap', Zap], ['Car', Car], ['Clapperboard', Clapperboard], ['Wrench', Wrench], ['Box', Box],
];
const TAX_HELP: Record<TaxRule['mode'], string> = {
  included: 'Tax is included in the price, as it is at the pump.',
  add: 'Tax is added on top of the price, as in most stores.',
  none: 'No tax applies, as with basic groceries.',
};
const BOOSTS: { value: ClassifierBoost; label: string; sub?: string }[] = [
  { value: 'none', label: 'Normal' }, { value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High', sub: 'Wins when a receipt could fit several categories' },
];

const blank = (): CategoryDefinition => ({
  id: `cat_${Date.now()}`, name: '', iconName: 'Box', color: COLORS[5], visibility: 'visible', aliases: [], keywords: [],
  subcategories: [], taxRule: { mode: 'add' }, isPinned: false, orderIndex: 999, classifierBoost: 'none',
});

export default function EditCategoryScreen({ route, navigation }: any) {
  const { categories, receipts, saveCategory, mergeCategory, deleteCategory } = useReceipts();
  const existing = categories.find(c => c.id === route.params?.categoryId);
  const [form, setForm] = useState<CategoryDefinition>(() => existing ? JSON.parse(JSON.stringify(existing)) : blank());
  const [newSub, setNewSub] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [mergeOpen, setMergeOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
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
    'Delete', () => { deleteCategory(form.id); navigation.popTo('ManageCategories'); });

  const doMerge = (targetId: string) => {
    const target = categories.find(c => c.id === targetId);
    setMergeOpen(false);
    if (!target) return;
    confirmAction(`Merge into ${target.name}?`, `${receiptCount} receipt${receiptCount === 1 ? '' : 's'} will move to ${target.name}, and ${form.name} will be removed.`,
      'Merge', () => { mergeCategory(form.id, target.id); navigation.popTo('ManageCategories'); });
  };

  const PreviewIcon = ICONS.find(i => i[0] === form.iconName)?.[1] ?? Box;
  const plural = `${receiptCount} receipt${receiptCount === 1 ? '' : 's'}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.nav}>
        <Pressable onPress={() => navigation.goBack()} style={styles.navBtn} accessibilityRole="button"><Text style={styles.navText}>Cancel</Text></Pressable>
        <Text style={type.headline} accessibilityRole="header">{existing ? 'Edit Category' : 'New Category'}</Text>
        <Pressable onPress={save} style={[styles.navBtn, { alignItems: 'flex-end' }]} accessibilityRole="button"><Text style={[styles.navText, font.semibold]}>Save</Text></Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={[styles.preview, { backgroundColor: soft(tone(form.color)) }]}>
            <PreviewIcon size={36} color={tone(form.color)} />
          </View>

          <Section title="Name">
            <FieldGroup>
              <Field label="Name" value={form.name} onChangeText={name => { set({ name }); setError(undefined); }} placeholder="e.g. Hobbies"
                editable={!isOther} error={error} />
            </FieldGroup>
          </Section>

          <Section title="Color">
            <View style={styles.swatches}>
              {COLORS.map(c => {
                const on = form.color === c;
                return (
                  <Pressable key={c} onPress={() => set({ color: c })} accessibilityRole="button" accessibilityLabel={`Color ${c}`} accessibilityState={{ selected: on }}
                    style={[styles.ring, on && { borderColor: tone(c) }]}>
                    <View style={[styles.swatch, { backgroundColor: c }]} />
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Icon">
            <View style={styles.icons}>
              {ICONS.map(([name, Icon]) => {
                const on = form.iconName === name;
                return (
                  <Pressable key={name} onPress={() => set({ iconName: name })} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected: on }}
                    style={[styles.iconBtn, on && { backgroundColor: soft(tone(form.color)), borderColor: tone(form.color) }]}>
                    <Icon size={22} color={on ? tone(form.color) : colors.text} />
                  </Pressable>
                );
              })}
            </View>
          </Section>

          <Section title="Subcategories & default" footer="Tap a subcategory to make it the default for new receipts.">
            {form.subcategories.map((s, i) => (
              <View key={s.id} style={[styles.subRow, i > 0 && kit.rowBorder]}>
                <Pressable onPress={() => set({ defaultSubcategoryId: s.id })} accessibilityRole="radio" accessibilityState={{ checked: s.id === defaultSubId }}
                  style={styles.subMain}>
                  <Text style={styles.subName}>{s.name}</Text>
                  {s.id === defaultSubId && <Text style={styles.defaultTag}>Default</Text>}
                </Pressable>
                <Pressable onPress={() => set({ subcategories: form.subcategories.filter(x => x.id !== s.id) })} accessibilityRole="button"
                  accessibilityLabel={`Remove ${s.name}`} hitSlop={10} style={styles.remove}>
                  <X size={16} color={colors.placeholder} />
                </Pressable>
              </View>
            ))}
            <View style={[styles.subRow, form.subcategories.length > 0 && kit.rowBorder]}>
              <Plus size={22} color={colors.accent} />
              <TextInput value={newSub} onChangeText={setNewSub} onSubmitEditing={addSub} onBlur={addSub} placeholder="Add subcategory" placeholderTextColor={colors.accent}
                style={styles.subInput} returnKeyType="done" accessibilityLabel="Add subcategory" />
            </View>
          </Section>

          <View style={{ gap: 8 }}>
            <Text style={kit.sectionLabel}>Tax behavior</Text>
            <Segmented value={form.taxRule.mode} onChange={mode => set({ taxRule: { ...form.taxRule, mode } })}
              options={[{ value: 'included', label: 'Included' }, { value: 'add', label: 'Added' }, { value: 'none', label: 'None' }]} />
            <Text style={styles.foot}>{TAX_HELP[form.taxRule.mode]}</Text>
          </View>

          <Section title="Smart classification" footer="Receipts that mention these words are sorted here automatically.">
            <View style={styles.chips}>
              {form.aliases.map(a => <Chip key={`a${a}`} label={a} onRemove={() => set({ aliases: form.aliases.filter(x => x !== a) })} />)}
              {form.keywords.map(k => <Chip key={`k${k}`} label={k} onRemove={() => set({ keywords: form.keywords.filter(x => x !== k) })} />)}
              <View style={styles.addChip}>
                <Plus size={16} color={colors.accent} />
                <TextInput value={newKeyword} onChangeText={setNewKeyword} onSubmitEditing={addKeyword} onBlur={addKeyword} placeholder="Add keyword"
                  placeholderTextColor={colors.accent} style={styles.keywordInput} returnKeyType="done" accessibilityLabel="Add keyword" autoCapitalize="none" />
              </View>
            </View>
            <View style={kit.rowBorder}>
              <SettingRow first label="Classifier priority" value={BOOSTS.find(b => b.value === form.classifierBoost)?.label} onPress={() => setBoostOpen(true)} />
            </View>
          </Section>

          <Section title="Visibility">
            <SettingRow first label="Pin to top" toggle={form.isPinned} onToggle={isPinned => set({ isPinned })} />
            <SettingRow label="Show in pickers" toggle={form.visibility === 'visible'} onToggle={v => set({ visibility: (v ? 'visible' : 'hidden') as Visibility })} />
          </Section>

          {existing && !isOther && (
            <Section footer={receiptCount ? `${plural} in this category. Merging or deleting moves them.` : undefined}>
              <SettingRow first label="Merge into…" onPress={() => setMergeOpen(true)} />
              <SettingRow label="Delete Category" danger onPress={doDelete} />
            </Section>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <OptionSheet<string> visible={mergeOpen} title={`Merge ${form.name} into`} onClose={() => setMergeOpen(false)} onPick={doMerge}
        options={categories.filter(c => c.id !== form.id).map(c => ({ value: c.id, label: c.name }))} />
      <OptionSheet<ClassifierBoost> visible={boostOpen} title="Classifier priority" value={form.classifierBoost} options={BOOSTS}
        onClose={() => setBoostOpen(false)} onPick={classifierBoost => { set({ classifierBoost }); setBoostOpen(false); }} />
    </SafeAreaView>
  );
}

const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
  <View style={styles.chip}>
    <Text style={styles.chipText}>{label}</Text>
    <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${label}`} hitSlop={10}><X size={13} color={colors.textSecondary} /></Pressable>
  </View>
);

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 },
  navBtn: { minWidth: 70, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  navText: { ...font.regular, fontSize: 17, color: colors.accent },
  content: { padding: 16, paddingBottom: 48, gap: 20 },
  preview: { alignSelf: 'center', width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12 },
  ring: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, padding: 12 },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.bg, borderWidth: 1.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 8, minHeight: 46, backgroundColor: colors.card },
  subMain: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, gap: 8 },
  subName: { ...font.regular, fontSize: 17, color: colors.text },
  defaultTag: { ...font.bold, fontSize: 13, color: colors.accent },
  remove: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  subInput: { flex: 1, ...font.regular, fontSize: 17, color: colors.text, paddingVertical: 10 },
  foot: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.bg },
  chipText: { ...font.regular, fontSize: 15, color: colors.text },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 6 },
  keywordInput: { ...font.regular, fontSize: 15, color: colors.text, minWidth: 110, padding: 0 },
}));
