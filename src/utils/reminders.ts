import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Receipt } from '../types';
import { reminderDate } from './returns';
import { formatCents, toCents } from './tax';

const supported = Platform.OS !== 'web';

/** Show return reminders even when the app is open. Call once at startup. */
export function initReminders() {
  if (!supported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

/** Asks for notification permission the first time. Resolves false if the user said no (or on web). */
export async function ensureReminderPermission(): Promise<boolean> {
  if (!supported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function cancelReturnReminder(id?: string) {
  if (!supported || !id) return;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

/**
 * Schedules the local notification for a receipt's return window and returns its id.
 * Returns undefined when notifications are off, on web, or when the window has closed.
 */
export async function scheduleReturnReminder(receipt: Receipt, daysBefore: number): Promise<string | undefined> {
  if (!supported || !receipt.returnBy) return undefined;
  await cancelReturnReminder(receipt.returnNotificationId);
  const when = reminderDate(receipt.returnBy, daysBefore, new Date());
  if (!when || !(await ensureReminderPermission())) return undefined;
  const last = new Date(receipt.returnBy).toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' });
  return Notifications.scheduleNotificationAsync({
    content: {
      title: `Return window closing: ${receipt.storeName}`,
      body: `${formatCents(toCents(receipt.totalAmount))} · return by ${last}. The original receipt photo is in the app.`,
      data: { receiptId: receipt.id },
    },
    trigger: { date: when },
  });
}

const WEEKLY_ID = 'weekly-insights';

/** Turns the weekly summary notification (Sundays, 6 p.m.) on or off. Resolves true when it is scheduled. */
export async function setWeeklyInsights(on: boolean): Promise<boolean> {
  if (!supported) return false;
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_ID).catch(() => {});
  if (!on || !(await ensureReminderPermission())) return false;
  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_ID,
    content: { title: 'Your week in receipts', body: 'See what you spent this week and how much HST you paid.' },
    trigger: { weekday: 1, hour: 18, minute: 0, repeats: true },
  });
  return true;
}
