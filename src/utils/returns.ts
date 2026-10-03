import type { Receipt } from '../types';

const DAY = 86400000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Whole days until the return window closes; 0 means it closes today, negative means closed. */
export const daysLeft = (returnBy: string, now: Date): number =>
  Math.round((startOfDay(new Date(returnBy)) - startOfDay(now)) / DAY);

/** Length of the return window in days, from purchase to the last return day. */
export const windowDays = (r: Receipt): number =>
  r.returnBy ? Math.max(1, Math.round((startOfDay(new Date(r.returnBy)) - startOfDay(new Date(r.purchaseDate))) / DAY)) : 0;

/** Last return day for a purchase with the given window. */
export const returnByFor = (purchaseDate: string, days: number): string => {
  const d = new Date(purchaseDate);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 12).toISOString();
};

/** Receipts whose return window is still open, the ones closing soonest first. */
export const openReturns = (receipts: Receipt[], now: Date): Receipt[] =>
  receipts
    .filter(r => r.returnBy && daysLeft(r.returnBy, now) >= 0)
    .sort((a, b) => new Date(a.returnBy!).getTime() - new Date(b.returnBy!).getTime());

/**
 * When to notify about a return window: 9:00 a.m., `daysBefore` days before the last return day.
 * If that moment has passed but the window is still open, the next 9:00 a.m. is used instead.
 * Returns null once the window has closed.
 */
export const reminderDate = (returnBy: string, daysBefore: number, now: Date): Date | null => {
  const last = new Date(returnBy);
  const lastMorning = new Date(last.getFullYear(), last.getMonth(), last.getDate(), 9);
  const planned = new Date(last.getFullYear(), last.getMonth(), last.getDate() - daysBefore, 9);
  if (planned > now) return planned;
  const today9 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9);
  const next = today9 > now ? today9 : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9);
  return next <= lastMorning ? next : null;
};
