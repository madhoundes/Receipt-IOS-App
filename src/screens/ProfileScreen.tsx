import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Image, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogOut, DollarSign, Percent, LayoutGrid, Check } from '../components/icons';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { Section, SettingRow } from '../components/ui';
import { confirmAction, shareCSV, shareJSON, triggerHaptic } from '../utils/nativeUtils';
import { inSpendRange, spendRange } from '../utils/spend';
import { config } from '../config';
import { colors, font, radius, type } from '../theme';
import appJson from '../../app.json';
import type { UserProfile } from '../types';

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';

type Option<T> = { value: T; label: string; sub?: string };
const CURRENCIES: Option<string>[] = [{ value: 'CAD', label: 'CAD', sub: 'Canadian dollar' }, { value: 'USD', label: 'USD', sub: 'US dollar' }];
const TAX_RATES: Option<number>[] = [
  { value: 13, label: '13%', sub: 'Ontario HST' },
  { value: 15, label: '15%', sub: 'Atlantic provinces HST' },
  { value: 5, label: '5%', sub: 'GST only' },
];
const OCR_LEVELS: Option<number>[] = [
  { value: 0.5, label: 'Relaxed', sub: 'Reads more, may need more fixes' },
  { value: 0.7, label: 'Standard', sub: 'Recommended' },
  { value: 0.9, label: 'Strict', sub: 'Fewer false reads, may miss text' },
];

export default function ProfileScreen({ navigation }: any) {
  const { user, signOut, sendPasswordReset } = useAuth();
  const { userProfile: p, updateProfile, receipts, categories, deleteAllReceipts } = useReceipts();
  const [sheet, setSheet] = useState<null | 'currency' | 'tax' | 'ocr' | 'export'>(null);
  const set = (patch: Partial<UserProfile>) => updateProfile({ ...p, ...patch });
  const photos = receipts.filter(r => r.imageName).length;
  const ocrLabel = OCR_LEVELS.find(o => o.value === p.ocrThreshold)?.label ?? `${Math.round(p.ocrThreshold * 100)}%`;

  const exportCsv = (range: 'month' | 'all') => {
    setSheet(null);
    const win = spendRange(range, new Date());
    shareCSV(receipts.filter(r => inSpendRange(r, win)), range === 'month' ? 'receipts-this-month.csv' : 'receipts-all.csv');
  };
  const exportJson = () => {
    setSheet(null);
    shareJSON({ exportedAt: new Date().toISOString(), profile: p, categories, receipts }, 'receiptfy-backup.json');
  };

  const changePassword = () => user && confirmAction('Reset password?', `We'll email a reset link to ${user.email}.`, 'Send Link', async () => {
    await sendPasswordReset(user.email);
    triggerHaptic('success');
  });

  const about = () => Alert.alert('Receipt TaX', `Version ${appJson.expo.version}\nTotals come from the tax read on each receipt. Check with your accountant before filing.`);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[type.largeTitle, { paddingHorizontal: 4 }]}>Profile</Text>

        <View style={styles.card}>
          {p.avatar ? <Image source={{ uri: p.avatar }} style={styles.avatar} /> : (
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(user?.name ?? '')}</Text></View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('EditProfile')} style={styles.edit} accessibilityRole="button" accessibilityLabel="Edit profile">
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>

        <Section title="Preferences">
          <SettingRow first label="Currency" value={p.currency} onPress={() => setSheet('currency')} icon={<Tile bg={colors.success}><DollarSign size={16} color="#FFF" /></Tile>} />
          <SettingRow label="Default Tax %" value={`${p.hstDefaultPercent}%`} onPress={() => setSheet('tax')} icon={<Tile bg="#B4480A"><Percent size={16} color="#FFF" /></Tile>} />
          <SettingRow label="Manage Categories" onPress={() => navigation.navigate('ManageCategories')} icon={<Tile bg="#4A34B8"><LayoutGrid size={16} color="#FFF" /></Tile>} />
        </Section>

        <Section title="Camera & Intelligence">
          <SettingRow first label="Auto-Categorize" sub="Use the category the scan suggests" toggle={p.autoCategorize} onToggle={v => set({ autoCategorize: v })} />
          <SettingRow label="Auto-Crop Receipts" toggle={p.autoCrop} onToggle={v => set({ autoCrop: v })} />
          <SettingRow label="Show Official Brand Logos" toggle={p.showBrandLogos} onToggle={v => set({ showBrandLogos: v })} />
          <SettingRow label="OCR Confidence" value={ocrLabel} onPress={() => setSheet('ocr')} />
        </Section>

        <Section title="Notifications & Haptics">
          <SettingRow first label="Scan Alerts" sub="When a receipt needs review" toggle={p.notifications.ocr} onToggle={v => set({ notifications: { ...p.notifications, ocr: v } })} />
          <SettingRow label="Weekly Insights" toggle={p.notifications.insights} onToggle={v => set({ notifications: { ...p.notifications, insights: v } })} />
          <SettingRow label="Haptic Feedback" toggle={p.hapticsEnabled} onToggle={v => set({ hapticsEnabled: v })} />
          <SettingRow label="Reduce Motion" toggle={p.reduceMotion} onToggle={v => set({ reduceMotion: v })} />
        </Section>

        <Section title="Data & Storage">
          <SettingRow first label="Export Data" value="CSV, JSON" onPress={() => setSheet('export')} />
          <SettingRow label="Storage Used" sub={`${receipts.length} receipts · ${photos} original photo${photos === 1 ? '' : 's'}`} />
          <SettingRow label="Delete All Receipts" danger onPress={() => confirmAction('Delete All Receipts?',
            'This removes every receipt on this device. This action cannot be undone.', 'Delete All', () => { deleteAllReceipts(); triggerHaptic('medium'); })} />
        </Section>

        <Section title="Account & Support">
          <SettingRow first label="Change Password" onPress={changePassword} />
          <SettingRow label="Help & FAQ" onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)} />
          <SettingRow label="Privacy Policy" onPress={() => Linking.openURL(config.privacyUrl)} />
          <SettingRow label="About" onPress={about} />
        </Section>

        <Pressable style={styles.signOut} onPress={() => confirmAction('Sign out?', undefined, 'Sign Out', signOut)} accessibilityRole="button">
          <LogOut size={18} color={colors.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
        <Text style={styles.version}>Receipt TaX · v{appJson.expo.version}</Text>
      </ScrollView>

      <OptionSheet visible={sheet === 'currency'} title="Currency" options={CURRENCIES} value={p.currency}
        onPick={v => { set({ currency: v }); setSheet(null); }} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'tax'} title="Default Tax %" options={TAX_RATES} value={p.hstDefaultPercent}
        footer="Used to suggest tax when a receipt doesn't show it." onPick={v => { set({ hstDefaultPercent: v }); setSheet(null); }} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'ocr'} title="OCR Confidence" options={OCR_LEVELS} value={p.ocrThreshold}
        footer="Higher values reduce false positives but may miss text." onPick={v => { set({ ocrThreshold: v }); setSheet(null); }} onClose={() => setSheet(null)} />

      <Modal visible={sheet === 'export'} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSheet(null)} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <Text style={type.title}>Export Data</Text>
          <Text style={[type.subhead, { marginTop: -8 }]}>Choose format and range.</Text>
          <ExportRow label="Export CSV (This Month)" onPress={() => exportCsv('month')} />
          <ExportRow label="Export CSV (All Time)" onPress={() => exportCsv('all')} />
          <ExportRow label="Export JSON Backup" onPress={exportJson} />
          <Pressable style={styles.cancel} onPress={() => setSheet(null)} accessibilityRole="button"><Text style={styles.cancelText}>Cancel</Text></Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Tile = ({ bg, children }: { bg: string; children: React.ReactNode }) => (
  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
);

const ExportRow = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable style={styles.exportRow} onPress={onPress} accessibilityRole="button"><Text style={styles.exportText}>{label}</Text></Pressable>
);

function OptionSheet<T extends string | number>({ visible, title, options, value, onPick, onClose, footer }: {
  visible: boolean; title: string; options: Option<T>[]; value: T; onPick: (v: T) => void; onClose: () => void; footer?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={type.title}>{title}</Text>
        <View style={styles.optGroup}>
          {options.map((o, i) => (
            <Pressable key={String(o.value)} onPress={() => onPick(o.value)} style={[styles.opt, i > 0 && styles.optBorder]}
              accessibilityRole="radio" accessibilityState={{ checked: o.value === value }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optLabel}>{o.label}</Text>
                {!!o.sub && <Text style={styles.optSub}>{o.sub}</Text>}
              </View>
              {o.value === value && <Check size={20} color={colors.accent} strokeWidth={2.8} />}
            </Pressable>
          ))}
        </View>
        {!!footer && <Text style={type.subhead}>{footer}</Text>}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, gap: 22, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...font.extrabold, fontSize: 24, color: '#FFFFFF' },
  name: { ...font.extrabold, fontSize: 19, color: colors.text },
  email: { ...font.regular, fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  edit: { height: 36, paddingHorizontal: 14, borderRadius: 18, backgroundColor: colors.accentSoft, justifyContent: 'center' },
  editText: { ...font.bold, fontSize: 14, color: '#0050A8' },
  signOut: { height: 52, borderRadius: radius.lg, backgroundColor: colors.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  signOutText: { ...font.semibold, fontSize: 17, color: colors.danger },
  version: { ...font.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,10,14,0.45)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 40, gap: 16 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#C7C7CC' },
  exportRow: { minHeight: 60, borderRadius: radius.lg, backgroundColor: colors.card, paddingHorizontal: 16, justifyContent: 'center' },
  exportText: { ...font.semibold, fontSize: 16, color: colors.text },
  cancel: { height: 52, borderRadius: radius.lg, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  cancelText: { ...font.semibold, fontSize: 17, color: colors.text },
  optGroup: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, minHeight: 56, paddingVertical: 8 },
  optBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  optLabel: { ...font.semibold, fontSize: 16, color: colors.text },
  optSub: { ...font.regular, fontSize: 13, color: colors.textMuted, marginTop: 1 },
});
