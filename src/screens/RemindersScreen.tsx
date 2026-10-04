import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Illustration } from '../components/Illustration';
import { MerchantAvatar } from '../components/MerchantAvatar';
import { OptionSheet, ProgressBar, kit, shortDate } from '../components/kit';
import { NavBar, SettingRow } from '../components/ui';
import { useReceipts } from '../context/ReceiptContext';
import { ensureReminderPermission, scheduleReturnReminder } from '../utils/reminders';
import { daysLeft, openReturns, windowDays } from '../utils/returns';
import { formatCents, toCents } from '../utils/tax';
import { colors, font, radius, themedStyles } from '../theme';

const WINDOWS = [14, 30, 60, 90];
const BEFORE = [1, 2, 3, 7];
const urgency = (left: number) => (left <= 3 ? colors.danger : left <= 7 ? colors.tax : colors.accent);

/** C7 · Return reminders: receipts whose return window is still open. */
export default function RemindersScreen({ navigation }: any) {
  const { receipts, userProfile, updateProfile, updateReceipt } = useReceipts();
  const [sheet, setSheet] = useState(false);
  const [beforeSheet, setBeforeSheet] = useState(false);
  const [notifications, setNotifications] = useState<boolean | null>(null);
  const before = userProfile.remindDaysBefore ?? 2;

  useEffect(() => {
    if (Platform.OS === 'web') { setNotifications(false); return; }
    ensureReminderPermission().then(setNotifications).catch(() => setNotifications(false));
  }, []);

  // Changing the lead time moves every scheduled notification.
  const changeBefore = async (days: number) => {
    setBeforeSheet(false);
    updateProfile({ ...userProfile, remindDaysBefore: days });
    for (const r of openReturns(receipts, new Date())) {
      const id = await scheduleReturnReminder(r, days);
      updateReceipt({ ...r, returnNotificationId: id });
    }
  };
  const open = useMemo(() => openReturns(receipts, new Date()), [receipts]);
  const days = userProfile.returnWindowDays ?? 30;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar onBack={() => navigation.goBack()} title="Return Reminders" />
      <ScrollView contentContainerStyle={styles.content}>
        {open.length === 0 ? (
          <View style={styles.empty}>
            <Illustration name="allCaughtUp" size={180} label="No open return windows" />
            <Text style={styles.emptyTitle}>All caught up</Text>
            <Text style={styles.emptyText}>No return windows are open. Open a receipt and tap “Add return reminder” to track one.</Text>
          </View>
        ) : (
          <>
            <View style={{ paddingHorizontal: 4, gap: 2 }}>
              <Text style={styles.big}>{open.length} open {open.length === 1 ? 'window' : 'windows'}</Text>
              <Text style={styles.sub}>
                {notifications
                  ? `You’ll get a notification ${before} ${before === 1 ? 'day' : 'days'} before each one closes.`
                  : 'Windows closing within a week show on Home.'}
              </Text>
            </View>
            {open.map(r => {
              const left = daysLeft(r.returnBy!, new Date());
              const total = windowDays(r);
              const c = urgency(left);
              return (
                <Pressable key={r.id} style={styles.card} onPress={() => navigation.navigate('ReceiptDetail', { receiptId: r.id })}
                  accessibilityRole="button" accessibilityLabel={`${r.storeName}, ${left} days left, return by ${shortDate(r.returnBy!)}`}>
                  <View style={styles.cardTop}>
                    <MerchantAvatar name={r.storeName} category={r.category} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={kit.rowTitle} numberOfLines={1}>{r.storeName}</Text>
                      <Text style={kit.rowMeta} numberOfLines={1}>{r.items?.[0]?.name ?? 'Receipt'} · {formatCents(toCents(r.totalAmount))}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.left, { color: c }]}>{left}</Text>
                      <Text style={styles.leftLabel}>{left === 1 ? 'day left' : 'days left'}</Text>
                    </View>
                  </View>
                  <ProgressBar value={1 - left / total} color={c} />
                  <View style={styles.cardFoot}>
                    <Text style={styles.foot}>Return by {shortDate(r.returnBy!)}</Text>
                    <Text style={styles.foot}>{total}-day window</Text>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}

        <Text style={[kit.sectionLabel, { marginTop: 8 }]}>Defaults</Text>
        <View style={kit.card}>
          <SettingRow first label="Default return window" value={`${days} days`} onPress={() => setSheet(true)} />
          <SettingRow label="Remind me" value={`${before} ${before === 1 ? 'day' : 'days'} before`} onPress={() => setBeforeSheet(true)} />
        </View>
        <Text style={styles.note}>
          The window is used when you add a reminder to a receipt. Check the store’s own policy, since return periods differ.
          {notifications === false && Platform.OS !== 'web' ? ' Notifications are off for Receipt TaX, so reminders only show in the app. Turn them on in Settings to be notified.' : ''}
        </Text>
      </ScrollView>

      <OptionSheet<number>
        visible={beforeSheet} title="Remind me" value={before} onClose={() => setBeforeSheet(false)}
        options={BEFORE.map(d => ({ value: d, label: `${d} ${d === 1 ? 'day' : 'days'} before` }))} onPick={changeBefore}
      />
      <OptionSheet<number>
        visible={sheet} title="Default return window" value={days} onClose={() => setSheet(false)}
        options={WINDOWS.map(w => ({ value: w, label: `${w} days` }))}
        onPick={w => { updateProfile({ ...userProfile, returnWindowDays: w }); setSheet(false); }}
      />
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 48, gap: 12 },
  big: { ...font.bold, fontSize: 28, lineHeight: 34, color: colors.text },
  sub: { ...font.regular, fontSize: 15, lineHeight: 20, color: colors.textSecondary },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  left: { ...font.bold, fontSize: 22, lineHeight: 24, fontVariant: ['tabular-nums'] },
  leftLabel: { ...font.regular, fontSize: 12, color: colors.textSecondary },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between' },
  foot: { ...font.regular, fontSize: 13, color: colors.textSecondary },
  note: { ...font.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, paddingHorizontal: 16 },
  empty: { alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12 },
  emptyTitle: { ...font.bold, fontSize: 22, color: colors.text },
  emptyText: { ...font.regular, fontSize: 17, lineHeight: 22, color: colors.textSecondary, textAlign: 'center' },
}));
