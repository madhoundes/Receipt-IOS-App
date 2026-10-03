import React, { useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BarChart3, Bell, ChevronRight, CreditCard, Crop, FileDown, FileText, Info, LayoutGrid, Lock, Percent, ReceiptText, Scan, Sparkles, Sun,
  TrendUp, Undo, AppIcon,
} from '../components/icons';
import { OptionSheet, kit } from '../components/kit';
import { NavBar, Section, SettingRow } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useReceipts } from '../context/ReceiptContext';
import { confirmAction, shareJSON, triggerHaptic } from '../utils/nativeUtils';
import { cancelReturnReminder } from '../utils/reminders';
import { config } from '../config';
import { colors, font, radius, themedStyles } from '../theme';
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
const TAX_NAME: Record<number, string> = { 13: 'Ontario · HST 13%', 15: 'Atlantic · HST 15%', 5: 'GST 5%' };
const APPEARANCE: Option<'system' | 'light' | 'dark'>[] = [
  { value: 'system', label: 'System', sub: 'Follows your device setting' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
];
const OCR_LEVELS: Option<number>[] = [
  { value: 0.5, label: 'Relaxed', sub: 'Reads more, may need more fixes' },
  { value: 0.7, label: 'Balanced', sub: 'Recommended' },
  { value: 0.9, label: 'Strict', sub: 'Fewer false reads, may miss text' },
];

/** F1 · Profile and settings. Opens from the avatar on Home. */
export default function ProfileScreen({ navigation }: any) {
  const { user, signOut, sendPasswordReset } = useAuth();
  const { userProfile: p, updateProfile, receipts, categories, deleteAllReceipts } = useReceipts();
  const [sheet, setSheet] = useState<null | 'currency' | 'tax' | 'ocr' | 'appearance'>(null);
  const set = (patch: Partial<UserProfile>) => updateProfile({ ...p, ...patch });
  const photos = receipts.filter(r => r.imageName).length;
  const ocrLabel = OCR_LEVELS.find(o => o.value === p.ocrThreshold)?.label ?? `${Math.round(p.ocrThreshold * 100)}%`;
  const visible = categories.filter(c => c.visibility === 'visible').length;

  const exportJson = () => shareJSON({ exportedAt: new Date().toISOString(), profile: p, categories, receipts }, 'receipt-tax-backup.json');
  const changePassword = () => user && confirmAction('Reset password?', `We'll email a reset link to ${user.email}.`, 'Send Link', async () => {
    await sendPasswordReset(user.email);
    triggerHaptic('success');
  });
  const about = () => {
    const text = `Version ${appJson.expo.version}\nTotals come from the tax read on each receipt. Check with your accountant before filing.`;
    if (Platform.OS === 'web') window.alert(`Receipt TaX\n${text}`); else Alert.alert('Receipt TaX', text);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={() => navigation.goBack()} title="Profile" />
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.card} onPress={() => navigation.navigate('EditProfile')} accessibilityRole="button" accessibilityLabel="Edit profile">
          {p.avatar ? <Image source={{ uri: p.avatar }} style={styles.avatar} /> : (
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(user?.name ?? '')}</Text></View>
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
            <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
          </View>
          <ChevronRight size={16} color={colors.chevron} />
        </Pressable>

        <Section title="Preferences">
          <SettingRow first label="Default tax" value={TAX_NAME[p.hstDefaultPercent] ?? `${p.hstDefaultPercent}%`} onPress={() => setSheet('tax')} icon={<Tile bg={colors.taxFill} Icon={Percent} />} />
          <SettingRow label="Currency" value={p.currency} onPress={() => setSheet('currency')} icon={<Tile bg="#0A5BC4" Icon={CreditCard} />} />
          <SettingRow label="Appearance" value={APPEARANCE.find(a => a.value === (p.appearance ?? 'system'))?.label} onPress={() => setSheet('appearance')} icon={<Tile bg="#3A3A3C" Icon={Sun} />} />
          <SettingRow label="Manage Categories" value={String(visible)} onPress={() => navigation.navigate('ManageCategories')} icon={<Tile bg={colors.accentFill} Icon={LayoutGrid} />} />
        </Section>

        <Section title="Camera & intelligence">
          <SettingRow first label="Auto-Categorize" toggle={p.autoCategorize} onToggle={v => set({ autoCategorize: v })} icon={<Tile bg="#5A3CC2" Icon={Sparkles} />} />
          <SettingRow label="Auto-Crop Receipts" toggle={p.autoCrop} onToggle={v => set({ autoCrop: v })} icon={<Tile bg="#0B6E77" Icon={Crop} />} />
          <SettingRow label="OCR Confidence" value={ocrLabel} onPress={() => setSheet('ocr')} icon={<Tile bg="#3A3A3C" Icon={Scan} />} />
        </Section>

        <Section title="Notifications & haptics">
          <SettingRow first label="Return Reminders" value={`${p.remindDaysBefore ?? 2} days before`} onPress={() => navigation.navigate('Reminders')} icon={<Tile bg={colors.danger} Icon={Undo} />} />
          <SettingRow label="Weekly Insights" toggle={p.notifications.insights} onToggle={v => set({ notifications: { ...p.notifications, insights: v } })} icon={<Tile bg="#C2560A" Icon={Bell} />} />
          <SettingRow label="Haptic Feedback" toggle={p.hapticsEnabled} onToggle={v => set({ hapticsEnabled: v })} icon={<Tile bg="#636366" Icon={Info} />} />
          <SettingRow label="Reduce Motion" toggle={p.reduceMotion} onToggle={v => set({ reduceMotion: v })} icon={<Tile bg="#636366" Icon={TrendUp} />} />
        </Section>

        <Section title="Data & storage">
          <SettingRow first label="Export for Accountant" onPress={() => navigation.navigate('Export')} icon={<Tile bg={colors.accentFill} Icon={FileDown} />} />
          <SettingRow label="Insights" onPress={() => navigation.navigate('Insights')} icon={<Tile bg="#0B6E77" Icon={BarChart3} />} />
          <SettingRow label="JSON Backup" onPress={exportJson} icon={<Tile bg="#636366" Icon={FileText} />} />
          <SettingRow label="Stored" value={`${receipts.length} receipts · ${photos} ${photos === 1 ? 'photo' : 'photos'}`} icon={<Tile bg="#636366" Icon={ReceiptText} />} />
        </Section>

        <Section title="Account & support">
          <SettingRow first label="Change Password" onPress={changePassword} icon={<Tile bg="#636366" Icon={Lock} />} />
          <SettingRow label="Help and FAQ" onPress={() => Linking.openURL(`mailto:${config.supportEmail}`)} icon={<Tile bg="#0A5BC4" Icon={Info} />} />
          <SettingRow label="Privacy Policy" onPress={() => Linking.openURL(config.privacyUrl)} icon={<Tile bg="#0B6E77" Icon={Lock} />} />
          <SettingRow label="About" value={`v${appJson.expo.version}`} onPress={about} icon={<Tile bg="#636366" Icon={ReceiptText} />} />
        </Section>

        <View style={kit.card}>
          <SettingRow first label="Sign Out" danger onPress={() => confirmAction('Sign out?', undefined, 'Sign Out', signOut)} />
          <SettingRow label="Delete All Receipts" danger onPress={() => confirmAction('Delete All Receipts?',
            'This removes every receipt on this device. This cannot be undone.', 'Delete All', () => { receipts.forEach(r => cancelReturnReminder(r.returnNotificationId)); deleteAllReceipts(); triggerHaptic('medium'); })} />
        </View>
      </ScrollView>

      <OptionSheet visible={sheet === 'currency'} title="Currency" options={CURRENCIES} value={p.currency}
        onPick={v => { set({ currency: v }); setSheet(null); }} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'tax'} title="Default tax %" options={TAX_RATES} value={p.hstDefaultPercent}
        onPick={v => { set({ hstDefaultPercent: v }); setSheet(null); }} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'appearance'} title="Appearance" options={APPEARANCE} value={p.appearance ?? 'system'}
        onPick={v => { setSheet(null); set({ appearance: v }); }} onClose={() => setSheet(null)} />
      <OptionSheet visible={sheet === 'ocr'} title="OCR Confidence" options={OCR_LEVELS} value={p.ocrThreshold}
        onPick={v => { set({ ocrThreshold: v }); setSheet(null); }} onClose={() => setSheet(null)} />
    </SafeAreaView>
  );
}

const Tile = ({ bg, Icon }: { bg: string; Icon: AppIcon }) => (
  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
    <Icon size={17} color="#FFFFFF" />
  </View>
);

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingTop: 8, paddingBottom: 48, gap: 18 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...font.bold, fontSize: 22, color: colors.accent },
  name: { ...font.bold, fontSize: 20, color: colors.text },
  email: { ...font.regular, fontSize: 15, color: colors.textSecondary },
}));
