import type { Receipt, CategoryDefinition } from '../types';

// All money math runs in integer cents so period totals don't drift.
export const toCents = (amount: number | undefined | null): number =>
  Math.round((amount ?? 0) * 100);

export const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export type TaxPeriod = 'week' | 'month' | 'quarter' | 'year';

export type TaxStatus = 'taxed' | 'noTax' | 'needsReview';

export interface ReceiptTax {
  receipt: Receipt;
  status: TaxStatus;
  hstCents: number;
  /** Pre-tax amount; only counted for taxed receipts. */
  taxableCents: number;
  percent?: number;
  /** Best guess for a receipt whose tax wasn't read. */
  suggestedHstCents?: number;
  reason?: 'taxIncluded' | 'notFound';
}

export interface DateRange {
  start: Date;
  /** Exclusive. */
  end: Date;
}

export interface TaxBucket {
  label: string;
  hstCents: number;
}

export interface CategoryTax {
  category: string;
  hstCents: number;
  count: number;
}

export interface TaxSummary {
  range: DateRange;
  receiptCount: number;
  spendCents: number;
  hstCents: number;
  taxableCents: number;
  taxedCount: number;
  noTaxCount: number;
  needsReview: ReceiptTax[];
  byCategory: CategoryTax[];
  buckets: TaxBucket[];
}

/**
 * Decides how a receipt counts toward HST:
 * - a positive hstAmount is taxed;
 * - a zero-tax category (taxRule "none") or a user-confirmed receipt is noTax;
 * - anything else is flagged for review instead of silently counting as $0.
 */
export const resolveReceiptTax = (
  receipt: Receipt,
  categories: CategoryDefinition[],
  defaultPercent: number
): ReceiptTax => {
  const hstCents = toCents(receipt.hstAmount);
  const totalCents = toCents(receipt.totalAmount);
  const rule = categories.find(c => c.name === receipt.category)?.taxRule;
  const rulePercent = rule?.percentOverride ?? defaultPercent;

  if (hstCents > 0) {
    const subtotalCents = toCents(receipt.subtotal);
    const taxableCents = subtotalCents > 0 ? subtotalCents : totalCents - hstCents;
    const percent = receipt.hstPercent
      || (taxableCents > 0 ? Math.round((hstCents / taxableCents) * 1000) / 10 : undefined);
    return { receipt, status: 'taxed', hstCents, taxableCents, percent };
  }

  if (receipt.taxReviewed || rule?.mode === 'none') {
    return { receipt, status: 'noTax', hstCents: 0, taxableCents: 0, percent: 0 };
  }

  const subtotalCents = toCents(receipt.subtotal);
  const suggestedHstCents = subtotalCents > 0 && subtotalCents < totalCents
    ? totalCents - subtotalCents
    : Math.round((totalCents * rulePercent) / (100 + rulePercent));

  return {
    receipt,
    status: 'needsReview',
    hstCents: 0,
    taxableCents: 0,
    percent: rulePercent,
    suggestedHstCents,
    reason: rule?.mode === 'included' ? 'taxIncluded' : 'notFound',
  };
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const getPeriodRange = (period: TaxPeriod, anchor: Date): DateRange => {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  switch (period) {
    case 'week': {
      // Weeks run Monday to Sunday.
      const day = startOfDay(anchor);
      const offset = (day.getDay() + 6) % 7;
      const start = new Date(y, m, day.getDate() - offset);
      return { start, end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7) };
    }
    case 'month':
      return { start: new Date(y, m, 1), end: new Date(y, m + 1, 1) };
    case 'quarter': {
      const q = Math.floor(m / 3) * 3;
      return { start: new Date(y, q, 1), end: new Date(y, q + 3, 1) };
    }
    case 'year':
      return { start: new Date(y, 0, 1), end: new Date(y + 1, 0, 1) };
  }
};

export const shiftPeriod = (period: TaxPeriod, anchor: Date, delta: number): Date => {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  switch (period) {
    case 'week': return new Date(y, m, anchor.getDate() + 7 * delta);
    case 'month': return new Date(y, m + delta, 1);
    case 'quarter': return new Date(y, m + 3 * delta, 1);
    case 'year': return new Date(y + delta, 0, 1);
  }
};

const monthShort = (d: Date) => d.toLocaleDateString('en-CA', { month: 'short' });

export const formatPeriodLabel = (period: TaxPeriod, anchor: Date): string => {
  const { start, end } = getPeriodRange(period, anchor);
  switch (period) {
    case 'week': {
      const last = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1);
      return `${monthShort(start)} ${start.getDate()} – ${monthShort(last)} ${last.getDate()}, ${last.getFullYear()}`;
    }
    case 'month':
      return start.toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
    case 'quarter':
      return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`;
    case 'year':
      return String(start.getFullYear());
  }
};

/** Chart buckets: days of a week, 7-day chunks of a month, months of a quarter or year. */
const buildBuckets = (period: TaxPeriod, range: DateRange): DateRange[] => {
  const { start, end } = range;
  const buckets: DateRange[] = [];
  if (period === 'week') {
    for (let i = 0; i < 7; i++) {
      buckets.push({
        start: new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
        end: new Date(start.getFullYear(), start.getMonth(), start.getDate() + i + 1),
      });
    }
  } else if (period === 'month') {
    for (let day = 1; ; day += 7) {
      const s = new Date(start.getFullYear(), start.getMonth(), day);
      if (s >= end) break;
      const e = new Date(start.getFullYear(), start.getMonth(), day + 7);
      buckets.push({ start: s, end: e < end ? e : end });
    }
  } else {
    for (let s = start; s < end; s = new Date(s.getFullYear(), s.getMonth() + 1, 1)) {
      buckets.push({ start: s, end: new Date(s.getFullYear(), s.getMonth() + 1, 1) });
    }
  }
  return buckets;
};

const bucketLabel = (period: TaxPeriod, b: DateRange): string => {
  if (period === 'week') return b.start.toLocaleDateString('en-CA', { weekday: 'short' });
  if (period === 'month') {
    const last = new Date(b.end.getFullYear(), b.end.getMonth(), b.end.getDate() - 1);
    return `${monthShort(b.start)} ${b.start.getDate()}–${last.getDate()}`;
  }
  return monthShort(b.start);
};

const inRange = (d: Date, r: DateRange) => d >= r.start && d < r.end;

export const summarizeTax = (
  receipts: Receipt[],
  categories: CategoryDefinition[],
  defaultPercent: number,
  period: TaxPeriod,
  anchor: Date
): TaxSummary => {
  const range = getPeriodRange(period, anchor);
  const resolved = receipts
    .filter(r => inRange(new Date(r.purchaseDate), range))
    .map(r => resolveReceiptTax(r, categories, defaultPercent));

  const taxed = resolved.filter(t => t.status === 'taxed');

  const categoryMap = new Map<string, CategoryTax>();
  for (const t of taxed) {
    const entry = categoryMap.get(t.receipt.category) ?? { category: t.receipt.category, hstCents: 0, count: 0 };
    entry.hstCents += t.hstCents;
    entry.count += 1;
    categoryMap.set(t.receipt.category, entry);
  }

  const buckets = buildBuckets(period, range).map(b => ({
    label: bucketLabel(period, b),
    hstCents: taxed
      .filter(t => inRange(new Date(t.receipt.purchaseDate), b))
      .reduce((sum, t) => sum + t.hstCents, 0),
  }));

  return {
    range,
    receiptCount: resolved.length,
    spendCents: resolved.reduce((sum, t) => sum + toCents(t.receipt.totalAmount), 0),
    hstCents: taxed.reduce((sum, t) => sum + t.hstCents, 0),
    taxableCents: taxed.reduce((sum, t) => sum + t.taxableCents, 0),
    taxedCount: taxed.length,
    noTaxCount: resolved.filter(t => t.status === 'noTax').length,
    needsReview: resolved.filter(t => t.status === 'needsReview'),
    byCategory: [...categoryMap.values()].sort((a, b) => b.hstCents - a.hstCents),
    buckets,
  };
};

export interface TotalsCheck {
  ok: boolean;
  /** total − (subtotal + tax), in cents. */
  diffCents: number;
}

/** Does subtotal + tax equal the total, to the cent? Missing parts can't be checked. */
export const checkTotals = (subtotal?: number, tax?: number, total?: number): TotalsCheck | null => {
  if (subtotal == null || tax == null || total == null) return null;
  const diffCents = toCents(total) - toCents(subtotal) - toCents(tax);
  return { ok: diffCents === 0, diffCents };
};
