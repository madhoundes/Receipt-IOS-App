import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Share as ShareIcon } from '../components/icons';
import { Illustration } from '../components/Illustration';
import { Chips, kit, shortDate } from '../components/kit';
import { Button, Segmented, SettingRow } from '../components/ui';
import { useReceipts } from '../context/ReceiptContext';
import { shareCSV, shareJSON } from '../utils/nativeUtils';
import { formatCents, getPeriodRange, resolveReceiptTax } from '../utils/tax';
import { colors, font, radius, type } from '../theme';

type Preset = 'year' | 'lastYear' | 'quarter' | 'month' | 'custom';
type Format = 'csv' | 'json';

/** D4 · Export for accountant. */
export default function ExportScreen({ route, navigation }: any) {
  const { receipts, categories, userProfile } = useReceipts();
  const passed = route.params?.start && route.params?.end
    ? { start: new Date(route.params.start), end: new Date(route.params.end), label: String(route.params.label ?? 'Selected period') } : null;
  const [preset, setPreset] = useState<Preset>(passed ? 'custom' : 'year');
  const [format, setFormat] = useState<Format>('csv');
  const [noHst, setNoHst] = useState(true);
  const [unreviewed, setUnreviewed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const range = useMemo(() => {
    const now = new Date();
    if (preset === 'custom' && passed) return passed;
    if (preset === 'lastYear') return getPeriodRange('year', new Date(now.getFullYear() - 1, 0, 1));
    return getPeriodRange(preset === 'custom' ? 'year' : preset, now);
  }, [preset]);

  const { list, hstCents } = useMemo(() => {
    const resolved = receipts
      .filter(r => { const d = new Date(r.purchaseDate); return d >= range.start && d < range.end; })
      .map(r => resolveReceiptTax(r, categories, userProfile.hstDefaultPercent))
      .filter(t => (noHst || t.status !== 'noTax') && (unreviewed || t.status !== 'needsReview'));
    return { list: resolved.map(t => t.receipt), hstCents: resolved.reduce((s, t) => s + t.hstCents, 0) };
  }, [receipts, categories, userProfile.hstDefaultPercent, range, noHst, unreviewed]);

  const last = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate() - 1);
  const stamp = `${range.start.toISOString().slice(0, 10)}_${last.toISOString().slice(0, 10)}`;
  const fileName = `ReceiptTaX_${stamp}.${format}`;
  const presets: { value: Preset; label: string }[] = [
    ...(passed ? [{ value: 'custom' as Preset, label: passed.label }] : []),
    { value: 'year', label: 'This Year' }, { value: 'lastYear', label: 'Last Year' }, { value: 'quarter', label: 'This Quarter' }, { value: 'month', label: 'This Month' },
  ];

  const run = async () => {
    setBusy(true);
    if (format === 'csv') await shareCSV(list, fileName);
    else await shareJSON({ exportedAt: new Date().toISOString(), from: range.start, to: last, hstTotal: hstCents / 100, receipts: list }, fileName);
    setBusy(false);
    setDone(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.head}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headBtn} accessibilityRole="button"><Text style={kit.link}>{done ? 'Done' : 'Cancel'}</Text></Pressable>
        <Text style={styles.title} accessibilityRole="header">Export for Accountant</Text>
        <View style={styles.headBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {done ? (
          <View style={styles.done} accessibilityLiveRegion="polite">
            <Illustration name="exportReady" size={200} label="Export ready" />
            <Text style={styles.doneTitle}>Export ready</Text>
            <Text style={[type.subhead, { textAlign: 'center' }]}>{fileName} has {list.length} {list.length === 1 ? 'receipt' : 'receipts'} and {formatCents(hstCents)} of HST.</Text>
          </View>
        ) : (
          <>
            <View style={[kit.card, styles.file]}>
              <View style={styles.fileIcon}><FileText size={26} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={type.headline} numberOfLines={1}>{fileName}</Text>
                <Text style={type.subhead}>{list.length} {list.length === 1 ? 'receipt' : 'receipts'} · HST {formatCents(hstCents)}</Text>
                <Text style={type.footnote}>{format === 'csv' ? 'One row per receipt: store, date, category, subtotal, HST, total' : 'Full backup of these receipts, with line items'}</Text>
              </View>
            </View>

            <Text style={[kit.sectionLabel, styles.label]}>Period</Text>
            <View style={{ marginHorizontal: -16 }}><Chips options={presets} value={preset} onChange={setPreset} tint={colors.accent} /></View>
            <View style={kit.card}>
              <SettingRow first label="From" value={shortDate(range.start.toISOString(), true)} />
              <SettingRow label="To" value={shortDate(last.toISOString(), true)} />
            </View>

            <Text style={[kit.sectionLabel, styles.label]}>Format</Text>
            <Segmented options={[{ value: 'csv', label: 'CSV (spreadsheet)' }, { value: 'json', label: 'JSON (with items)' }]} value={format} onChange={setFormat} />

            <Text style={[kit.sectionLabel, styles.label]}>Include</Text>
            <View style={kit.card}>
              <SettingRow first label="Receipts with no HST" toggle={noHst} onToggle={setNoHst} />
              <SettingRow label="Receipts still to review" toggle={unreviewed} onToggle={setUnreviewed} />
            </View>
            <Text style={styles.note}>Original photos stay in the app. Share one from its receipt when your accountant asks for proof.</Text>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {done
          ? <Button title="Export Again" variant="tinted" onPress={() => setDone(false)} />
          : <Button title="Export and Share" icon={<ShareIcon size={20} color="#FFFFFF" />} onPress={run} loading={busy} disabled={list.length === 0} />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  head: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  headBtn: { width: 76, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  title: { flex: 1, textAlign: 'center', ...font.semibold, fontSize: 17, color: colors.text },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  label: { marginTop: 8 },
  file: { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'center', borderRadius: radius.xl },
  fileIcon: { width: 52, height: 64, borderRadius: 8, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  note: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  done: { alignItems: 'center', gap: 6, paddingTop: 40, paddingHorizontal: 16 },
  doneTitle: { ...font.bold, fontSize: 28, color: colors.text },
});
