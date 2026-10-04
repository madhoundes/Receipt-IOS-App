import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Share as ShareIcon } from '../components/icons';
import { DateField, fromDay, toDay } from '../components/DateField';
import { Illustration } from '../components/Illustration';
import { Chips, kit, shortDate } from '../components/kit';
import { Button, Segmented, SettingRow } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { photosAsDataUris, shareCSV, shareJSON, sharePDF } from '../utils/nativeUtils';
import { buildReportHtml } from '../utils/report';
import { formatCents, getPeriodRange, resolveReceiptTax } from '../utils/tax';
import { colors, font, radius, themedStyles, type } from '../theme';

type Preset = 'year' | 'lastYear' | 'quarter' | 'month' | 'custom';
type Format = 'pdf' | 'csv' | 'json';
const FORMAT_NOTE: Record<Format, string> = {
  pdf: 'Summary by category and month, then every receipt',
  csv: 'One row per receipt, for a spreadsheet',
  json: 'Full backup of these receipts, with line items',
};

const presetRange = (preset: Exclude<Preset, 'custom'>) => {
  const now = new Date();
  const r = preset === 'lastYear' ? getPeriodRange('year', new Date(now.getFullYear() - 1, 0, 1)) : getPeriodRange(preset, now);
  // getPeriodRange ends are exclusive; the To field shows the last day.
  return { from: toDay(r.start), to: toDay(new Date(r.end.getFullYear(), r.end.getMonth(), r.end.getDate() - 1)) };
};

/** D4 · Export for accountant: PDF summary, CSV or JSON for a period. */
export default function ExportScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { receipts, categories, userProfile } = useReceipts();
  const passed = route.params?.start && route.params?.end ? {
    from: toDay(new Date(route.params.start)),
    to: toDay(new Date(new Date(route.params.end).getTime() - 86400000)),
  } : null;
  const [preset, setPreset] = useState<Preset>(passed ? 'custom' : 'year');
  const [{ from, to }, setRange] = useState(passed ?? presetRange('year'));
  const [format, setFormat] = useState<Format>('pdf');
  const [images, setImages] = useState(false);
  const [lineItems, setLineItems] = useState(true);
  const [noHst, setNoHst] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();

  const pick = (p: Preset) => { setPreset(p); if (p !== 'custom') setRange(presetRange(p)); };
  const setFrom = (d: string) => { setPreset('custom'); setRange(r => ({ from: d, to: d > r.to ? d : r.to })); };
  const setTo = (d: string) => { setPreset('custom'); setRange(r => ({ from: d < r.from ? d : r.from, to: d })); };

  const { rows, hstCents, photoCount } = useMemo(() => {
    const start = new Date(`${from}T00:00:00`), end = new Date(`${to}T23:59:59.999`);
    const rows = receipts
      .filter(r => { const d = new Date(r.purchaseDate); return d >= start && d <= end; })
      .map(r => resolveReceiptTax(r, categories, userProfile.hstDefaultPercent))
      .filter(t => noHst || t.status !== 'noTax');
    return { rows, hstCents: rows.reduce((s, t) => s + t.hstCents, 0), photoCount: rows.filter(t => t.receipt.imageName).length };
  }, [receipts, categories, userProfile.hstDefaultPercent, from, to, noHst]);

  const fileName = `ReceiptTaX_${from}_${to}.${format}`;
  const periodLabel = `${shortDate(fromDay(from).toISOString(), true)} to ${shortDate(fromDay(to).toISOString(), true)}`;
  const presets: { value: Preset; label: string }[] = [
    { value: 'year', label: 'This Year' }, { value: 'lastYear', label: 'Last Year' }, { value: 'quarter', label: 'This Quarter' },
    { value: 'month', label: 'This Month' }, { value: 'custom', label: 'Custom' },
  ];

  const run = async () => {
    setBusy(true); setError(undefined);
    try {
      const list = rows.map(t => t.receipt);
      if (format === 'csv') await shareCSV(list, fileName);
      else if (format === 'json') await shareJSON({ exportedAt: new Date().toISOString(), from, to, hstTotal: hstCents / 100, receipts: list }, fileName);
      else {
        const html = buildReportHtml(rows, {
          title: 'Receipt TaX · HST summary', periodLabel, preparedFor: user?.name, lineItems,
          images: images ? await photosAsDataUris(list) : undefined,
        });
        await sharePDF(html, fileName);
      }
      setDone(true);
    } catch {
      setError('The export could not be created. Please try again.');
    } finally {
      setBusy(false);
    }
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
            <Text style={[type.subhead, { textAlign: 'center' }]}>{fileName} has {rows.length} {rows.length === 1 ? 'receipt' : 'receipts'} and {formatCents(hstCents)} of HST.</Text>
          </View>
        ) : (
          <>
            <View style={[kit.card, styles.file]}>
              <View style={styles.fileIcon}><FileText size={26} color={colors.accent} /></View>
              <View style={{ flex: 1 }}>
                <Text style={type.headline} numberOfLines={1}>{fileName}</Text>
                <Text style={type.subhead}>{rows.length} {rows.length === 1 ? 'receipt' : 'receipts'} · HST {formatCents(hstCents)}</Text>
                <Text style={type.footnote}>{FORMAT_NOTE[format]}{format === 'pdf' && images ? ` and ${photoCount} ${photoCount === 1 ? 'photo' : 'photos'}` : ''}</Text>
              </View>
            </View>

            <Text style={[kit.sectionLabel, styles.label]}>Period</Text>
            <View style={{ marginHorizontal: -16 }}><Chips options={presets} value={preset} onChange={pick} tint={colors.accentFill} /></View>
            <View style={kit.card}>
              <View style={styles.dateRow}><Text style={type.body}>From</Text><DateField label="From" value={from} onChange={setFrom} /></View>
              <View style={[styles.dateRow, kit.rowBorder]}><Text style={type.body}>To</Text><DateField label="To" value={to} onChange={setTo} /></View>
            </View>

            <Text style={[kit.sectionLabel, styles.label]}>Format</Text>
            <Segmented options={[{ value: 'pdf', label: 'PDF' }, { value: 'csv', label: 'CSV' }, { value: 'json', label: 'JSON' }]} value={format} onChange={setFormat} />

            <Text style={[kit.sectionLabel, styles.label]}>Include</Text>
            <View style={kit.card}>
              <SettingRow first label="Receipts with no HST" toggle={noHst} onToggle={setNoHst} />
              {format === 'pdf' && <SettingRow label="Line items" toggle={lineItems} onToggle={setLineItems} />}
              {format === 'pdf' && <SettingRow label="Receipt images" sub={`${photoCount} original ${photoCount === 1 ? 'photo' : 'photos'}, one per page`} toggle={images} onToggle={setImages} />}
            </View>
            <Text style={styles.note}>The PDF groups HST by category and by month. Receipts whose tax still needs review are marked and left out of the HST total.</Text>
            {!!error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {done
          ? <Button title="Export Again" variant="tinted" onPress={() => setDone(false)} />
          : <Button title="Export and Share" icon={<ShareIcon size={20} color="#FFFFFF" />} onPress={run} loading={busy} disabled={rows.length === 0} />}
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  head: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  headBtn: { width: 76, height: 44, justifyContent: 'center', paddingHorizontal: 8 },
  title: { flex: 1, textAlign: 'center', ...font.semibold, fontSize: 17, color: colors.text },
  content: { padding: 16, paddingBottom: 24, gap: 10 },
  label: { marginTop: 8 },
  file: { flexDirection: 'row', gap: 14, padding: 16, alignItems: 'center', borderRadius: radius.xl },
  fileIcon: { width: 52, height: 64, borderRadius: 8, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 50, backgroundColor: colors.card },
  note: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16 },
  error: { ...font.regular, fontSize: 15, color: colors.danger, paddingHorizontal: 16 },
  footer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  done: { alignItems: 'center', gap: 6, paddingTop: 40, paddingHorizontal: 16 },
  doneTitle: { ...font.bold, fontSize: 28, color: colors.text },
}));
