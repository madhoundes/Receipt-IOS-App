import type { Receipt } from '../types';
import { toCents, getPeriodRange, type DateRange } from './tax.ts';

export type SpendRange = 'week' | 'lastWeek' | 'month' | 'lastMonth' | 'last30' | 'ytd' | 'all';

export const SPEND_RANGE_LABEL: Record<SpendRange, string> = {
  week: 'This Week', lastWeek: 'Last Week', month: 'This Month', lastMonth: 'Last Month',
  last30: '30 Days', ytd: 'YTD', all: 'All Time',
};

/** Date window for a spend filter; `null` means no limit. End is exclusive. */
export const spendRange = (range: SpendRange, now: Date): DateRange | null => {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case 'week': return getPeriodRange('week', now);
    case 'lastWeek': return getPeriodRange('week', new Date(day.getFullYear(), day.getMonth(), day.getDate() - 7));
    case 'month': return getPeriodRange('month', now);
    case 'lastMonth': return getPeriodRange('month', new Date(now.getFullYear(), now.getMonth() - 1, 1));
    case 'last30': return { start: new Date(day.getFullYear(), day.getMonth(), day.getDate() - 29), end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1) };
    case 'ytd': return { start: new Date(now.getFullYear(), 0, 1), end: new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1) };
    case 'all': return null;
  }
};

export const inSpendRange = (r: Receipt, range: DateRange | null) => {
  if (!range) return true;
  const d = new Date(r.purchaseDate);
  return d >= range.start && d < range.end;
};

export interface CategorySpend {
  category: string;
  totalCents: number;
  count: number;
  /** Share of all spend in the window, 0–1. */
  share: number;
}

/** Spend per category, largest first. */
export const spendByCategory = (receipts: Receipt[]): CategorySpend[] => {
  const map = new Map<string, { totalCents: number; count: number }>();
  for (const r of receipts) {
    const e = map.get(r.category) ?? { totalCents: 0, count: 0 };
    e.totalCents += toCents(r.totalAmount);
    e.count += 1;
    map.set(r.category, e);
  }
  const all = [...map.values()].reduce((s, e) => s + e.totalCents, 0);
  return [...map.entries()]
    .map(([category, e]) => ({ category, ...e, share: all > 0 ? e.totalCents / all : 0 }))
    .sort((a, b) => b.totalCents - a.totalCents);
};

export interface SpendBucket { label: string; totalCents: number }

/** Trend bars: days for a week, 7-day chunks for a month, months otherwise. */
export const spendTrend = (receipts: Receipt[], range: SpendRange, now: Date): SpendBucket[] => {
  const win = spendRange(range, now);
  const list = receipts.filter(r => inSpendRange(r, win));
  const sum = (s: Date, e: Date) => list
    .filter(r => { const d = new Date(r.purchaseDate); return d >= s && d < e; })
    .reduce((t, r) => t + toCents(r.totalAmount), 0);
  const short = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString('en-CA', o);

  if (range === 'week' || range === 'lastWeek') {
    return Array.from({ length: 7 }, (_, i) => {
      const s = new Date(win!.start.getFullYear(), win!.start.getMonth(), win!.start.getDate() + i);
      const e = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 1);
      return { label: short(s, { weekday: 'narrow' }), totalCents: sum(s, e) };
    });
  }
  if (range === 'month' || range === 'lastMonth' || range === 'last30') {
    const out: SpendBucket[] = [];
    for (let s = win!.start; s < win!.end;) {
      const e7 = new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7);
      const e = e7 < win!.end ? e7 : win!.end;
      out.push({ label: short(s, { month: 'short', day: 'numeric' }), totalCents: sum(s, e) });
      s = e;
    }
    return out;
  }
  // YTD and all time: one bar per month, last 6 months with data window.
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const months = range === 'ytd' ? now.getMonth() + 1 : 6;
  return Array.from({ length: months }, (_, i) => {
    const s = new Date(end.getFullYear(), end.getMonth() - months + i, 1);
    const e = new Date(s.getFullYear(), s.getMonth() + 1, 1);
    return { label: short(s, { month: 'short' }), totalCents: sum(s, e) };
  });
};

export interface SpendTip { id: string; title: string; text: string }

export const spendTips = (byCategory: CategorySpend[], count: number): SpendTip[] => {
  const tips: SpendTip[] = [];
  const top = byCategory[0];
  if (top && top.share >= 0.4 && byCategory.length > 1) {
    tips.push({ id: 'heavy', title: 'Heavy Hitter', text: `${top.category} makes up ${Math.round(top.share * 100)}% of your spend. Consider a cap?` });
  }
  const dining = byCategory.find(c => c.category === 'Restaurant');
  if (dining && dining.totalCents >= 10000) {
    tips.push({ id: 'dining', title: 'Dining Out', text: `You spent $${Math.round(dining.totalCents / 100)} on food out.` });
  }
  if (count === 0) tips.push({ id: 'start', title: 'Start Tracking', text: 'Capture receipts to unlock patterns.' });
  return tips.slice(0, 3);
};
