// Shared building blocks for the V2 screens (rows C to F of the design).
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';
import { Check, Search, X } from './icons';
import { MerchantAvatar } from './MerchantAvatar';
import { useReceipts } from '../context/ReceiptContext';
import { formatCents, resolveReceiptTax, toCents } from '../utils/tax';
import { colors, font, radius } from '../theme';
import type { Receipt } from '../types';

/** Space to leave at the bottom of a tab screen so content clears the floating tab bar. */
export const TAB_BAR_SPACE = 118;

export const shortDate = (iso: string, withYear = false) =>
  new Date(iso).toLocaleDateString('en-CA', withYear ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric' });

/** White round button used in headers (back, share, filter). */
export function RoundButton({ children, onPress, label, dark, style }: {
  children: React.ReactNode; onPress?: () => void; label: string; dark?: boolean; style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={4}
      style={({ pressed }) => [kit.round, dark && kit.roundDark, pressed && { opacity: 0.7 }, style]}>
      {children}
    </Pressable>
  );
}

/** Large-title header for tab screens. */
export function LargeHeader({ title, eyebrow, right }: { title: string; eyebrow?: string; right?: React.ReactNode }) {
  return (
    <View style={kit.header}>
      <View style={{ flex: 1 }}>
        {!!eyebrow && <Text style={kit.eyebrow}>{eyebrow}</Text>}
        <Text style={kit.largeTitle} accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{title}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>{right}</View>
    </View>
  );
}

export function SearchField({ value, onChange, placeholder, autoFocus, outlined }: {
  value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean; outlined?: boolean;
}) {
  return (
    <View style={[kit.search, outlined && kit.searchOutlined]}>
      <Search size={18} color={colors.placeholder} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.placeholder}
        style={kit.searchInput} accessibilityLabel={placeholder} autoFocus={autoFocus} autoCorrect={false} returnKeyType="search" />
      {!!value && (
        <Pressable onPress={() => onChange('')} accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
          <X size={16} color={colors.placeholder} />
        </Pressable>
      )}
    </View>
  );
}

/** Horizontal row of filter chips. */
export function Chips<T extends string>({ options, value, onChange, tint }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; tint?: string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={kit.chips} style={{ flexGrow: 0 }}>
      {options.map(o => {
        const on = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[kit.chip, on && { backgroundColor: tint ?? colors.text }]}>
            <Text style={[kit.chipText, on && { color: '#FFFFFF', ...font.semibold }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function StatTile({ label, value, tax, onPress, style, small }: {
  label: string; value: string; tax?: boolean; onPress?: () => void; style?: ViewStyle; small?: boolean;
}) {
  const body = (
    <View style={[kit.tile, small && { paddingHorizontal: 12 }, style]}>
      <Text style={kit.tileLabel} numberOfLines={1}>{label}{onPress ? '  ›' : ''}</Text>
      <Text style={[kit.tileValue, small && { fontSize: 17, lineHeight: 24 }, tax && { color: colors.tax }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
    </View>
  );
  return onPress
    ? <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label} ${value}`} style={{ flex: 1 }}>{body}</Pressable>
    : <View style={{ flex: 1 }}>{body}</View>;
}

export function ProgressBar({ value, color = colors.accent, height = 5 }: { value: number; color?: string; height?: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: colors.fill, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

/** One receipt in a list: merchant avatar, store, meta line, amount and HST. */
export function ReceiptRow({ receipt, onPress, meta, first, highlight }: {
  receipt: Receipt; onPress?: () => void; meta?: string; first?: boolean; highlight?: string;
}) {
  const { categories, userProfile } = useReceipts();
  const tax = resolveReceiptTax(receipt, categories, userProfile.hstDefaultPercent);
  const line = meta ?? `${shortDate(receipt.purchaseDate)} · ${receipt.subcategory ?? receipt.category}`;
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      accessibilityLabel={`${receipt.storeName}, ${formatCents(toCents(receipt.totalAmount))}, ${line}`}
      style={({ pressed }) => [kit.row, !first && kit.rowBorder, pressed && { backgroundColor: '#F7F7FA' }]}>
      <MerchantAvatar name={receipt.storeName} category={receipt.category} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={kit.rowTitle} numberOfLines={1}>{receipt.storeName}</Text>
        <Highlighted text={line} term={highlight} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={kit.rowAmount}>{formatCents(toCents(receipt.totalAmount))}</Text>
        <Text style={[kit.rowHst, tax.status === 'needsReview' && { color: colors.textSecondary }]}>
          {tax.status === 'taxed' ? `HST ${formatCents(tax.hstCents)}` : tax.status === 'noTax' ? 'No HST' : 'HST to review'}
        </Text>
      </View>
    </Pressable>
  );
}

/** Meta line with the search term marked. */
function Highlighted({ text, term }: { text: string; term?: string }) {
  const t = term?.trim();
  const i = t ? text.toLowerCase().indexOf(t.toLowerCase()) : -1;
  if (!t || i < 0) return <Text style={kit.rowMeta} numberOfLines={1}>{text}</Text>;
  return (
    <Text style={kit.rowMeta} numberOfLines={2}>
      {text.slice(0, i)}
      <Text style={kit.mark}>{text.slice(i, i + t.length)}</Text>
      {text.slice(i + t.length)}
    </Text>
  );
}

/** Bottom sheet with a short list of choices; the current one is ticked. Also used for action menus. */
export function OptionSheet<T extends string | number>({ visible, title, options, value, onPick, onClose }: {
  visible: boolean; title?: string; value?: T; onClose: () => void; onPick: (v: T) => void;
  options: { value: T; label: string; sub?: string; danger?: boolean }[];
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={kit.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={kit.sheet}>
        <View style={kit.grabber} />
        {!!title && <Text style={kit.sheetTitle}>{title}</Text>}
        <View style={kit.card}>
          {options.map((o, i) => (
            <Pressable key={String(o.value)} onPress={() => onPick(o.value)} accessibilityRole="button"
              accessibilityState={{ selected: o.value === value }} style={[kit.opt, i > 0 && kit.rowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={[kit.optText, o.value === value && font.semibold, o.danger && { color: colors.danger }]}>{o.label}</Text>
                {!!o.sub && <Text style={kit.optSub}>{o.sub}</Text>}
              </View>
              {o.value === value && <Check size={20} color={colors.accent} />}
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onClose} style={[kit.card, kit.opt, { justifyContent: 'center' }]} accessibilityRole="button">
          <Text style={[kit.optText, font.semibold, { color: colors.accent }]}>Cancel</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export const kit = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 34, gap: 12,
  },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC' },
  sheetTitle: { ...font.semibold, fontSize: 17, color: colors.text, textAlign: 'center' },
  opt: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 50, paddingVertical: 8, backgroundColor: colors.card },
  optText: { ...font.regular, fontSize: 17, color: colors.text },
  optSub: { ...font.regular, fontSize: 13, color: colors.textSecondary, marginTop: 1 },
  round: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  roundDark: { backgroundColor: 'rgba(40,40,42,0.7)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)' },
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10, gap: 12 },
  eyebrow: { ...font.semibold, fontSize: 13, letterSpacing: 0.6, color: colors.textSecondary, textTransform: 'uppercase' },
  largeTitle: { ...font.bold, fontSize: 34, lineHeight: 41, letterSpacing: -0.4, color: colors.text },
  search: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 10, height: 36, borderRadius: 10,
    backgroundColor: colors.fill,
  },
  searchOutlined: { backgroundColor: '#FFFFFF', height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: colors.accent, marginHorizontal: 0, flex: 1 },
  searchInput: { flex: 1, ...font.regular, fontSize: 17, color: colors.text, padding: 0, minWidth: 0 },
  chips: { paddingHorizontal: 16, gap: 8, paddingVertical: 2 },
  chip: { height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: '#FFFFFF', justifyContent: 'center' },
  chipText: { ...font.regular, fontSize: 15, color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  sectionLabel: { ...font.regular, fontSize: 13, color: colors.textSecondary, textTransform: 'uppercase', paddingHorizontal: 16 },
  tile: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 4 },
  tileLabel: { ...font.regular, fontSize: 13, color: colors.textSecondary },
  tileValue: { ...font.bold, fontSize: 22, lineHeight: 28, color: colors.text, fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 64, backgroundColor: colors.card },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator },
  rowTitle: { ...font.semibold, fontSize: 17, color: colors.text },
  rowMeta: { ...font.regular, fontSize: 15, color: colors.textSecondary },
  mark: { backgroundColor: colors.taxSoft, color: colors.tax },
  rowAmount: { ...font.semibold, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  rowHst: { ...font.bold, fontSize: 12, color: colors.tax, fontVariant: ['tabular-nums'] },
  link: { ...font.regular, fontSize: 17, color: colors.accent },
});
