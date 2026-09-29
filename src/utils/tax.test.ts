import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Receipt, CategoryDefinition } from '../types.ts';
import { resolveReceiptTax, summarizeTax, getPeriodRange, shiftPeriod, formatCents, checkTotals } from './tax.ts';

const category = (name: string, mode: 'included' | 'add' | 'none'): CategoryDefinition => ({
  id: name, name, iconName: '', color: '', visibility: 'visible', aliases: [], keywords: [],
  subcategories: [], taxRule: { mode }, isPinned: false, orderIndex: 0, classifierBoost: 'none',
});

const CATEGORIES = [
  category('Groceries', 'none'),
  category('Restaurant', 'add'),
  category('Gas/Fuel', 'included'),
  category('Electronics', 'add'),
];

let nextId = 0;
const receipt = (fields: Partial<Receipt> & Pick<Receipt, 'totalAmount' | 'category' | 'purchaseDate'>): Receipt => ({
  id: String(++nextId), imageName: '', storeName: 'Store', ...fields,
});

test('taxed receipt uses subtotal when present', () => {
  const t = resolveReceiptTax(
    receipt({ totalAmount: 249.99, subtotal: 221.23, hstAmount: 28.76, hstPercent: 13, category: 'Electronics', purchaseDate: '2026-09-26T12:00:00' }),
    CATEGORIES, 13);
  assert.equal(t.status, 'taxed');
  assert.equal(t.hstCents, 2876);
  assert.equal(t.taxableCents, 22123);
  assert.equal(t.percent, 13);
});

test('taxed receipt without subtotal derives taxable amount and percent', () => {
  const t = resolveReceiptTax(
    receipt({ totalAmount: 8.45, hstAmount: 0.97, category: 'Restaurant', purchaseDate: '2026-09-28T12:00:00' }),
    CATEGORIES, 13);
  assert.equal(t.taxableCents, 748);
  assert.equal(t.percent, 13);
});

test('zero-tax category counts as no tax', () => {
  const t = resolveReceiptTax(
    receipt({ totalAmount: 54.5, hstAmount: 0, category: 'Groceries', purchaseDate: '2026-09-23T12:00:00' }),
    CATEGORIES, 13);
  assert.equal(t.status, 'noTax');
});

test('missing tax on a taxable category is flagged, not counted as zero', () => {
  const t = resolveReceiptTax(
    receipt({ totalAmount: 65, category: 'Gas/Fuel', purchaseDate: '2026-09-16T12:00:00' }),
    CATEGORIES, 13);
  assert.equal(t.status, 'needsReview');
  assert.equal(t.reason, 'taxIncluded');
  assert.equal(t.suggestedHstCents, 748); // 65.00 * 13 / 113
});

test('suggestion prefers total minus subtotal when OCR read a subtotal', () => {
  const t = resolveReceiptTax(
    receipt({ totalAmount: 11.3, subtotal: 10, category: 'Restaurant', purchaseDate: '2026-09-16T12:00:00' }),
    CATEGORIES, 13);
  assert.equal(t.suggestedHstCents, 130);
});

test('a reviewed receipt with no tax stops being flagged', () => {
  const t = resolveReceiptTax(
    receipt({ totalAmount: 16.99, category: 'Entertainment', taxReviewed: true, purchaseDate: '2026-09-08T12:00:00' }),
    CATEGORIES, 13);
  assert.equal(t.status, 'noTax');
});

test('month summary totals only receipts inside the period', () => {
  const receipts = [
    receipt({ totalAmount: 249.99, subtotal: 221.23, hstAmount: 28.76, category: 'Electronics', purchaseDate: '2026-09-26T12:00:00' }),
    receipt({ totalAmount: 8.45, hstAmount: 0.97, category: 'Restaurant', purchaseDate: '2026-09-28T12:00:00' }),
    receipt({ totalAmount: 54.5, hstAmount: 0, category: 'Groceries', purchaseDate: '2026-09-23T12:00:00' }),
    receipt({ totalAmount: 65, category: 'Gas/Fuel', purchaseDate: '2026-09-16T12:00:00' }),
    receipt({ totalAmount: 100, hstAmount: 13, category: 'Restaurant', purchaseDate: '2026-08-31T23:00:00' }),
  ];
  const s = summarizeTax(receipts, CATEGORIES, 13, 'month', new Date(2026, 8, 15));

  assert.equal(s.receiptCount, 4);
  assert.equal(s.hstCents, 2876 + 97);
  assert.equal(s.taxableCents, 22123 + 748);
  assert.equal(s.spendCents, 24999 + 845 + 5450 + 6500);
  assert.equal(s.taxedCount, 2);
  assert.equal(s.noTaxCount, 1);
  assert.equal(s.needsReview.length, 1);
  assert.deepEqual(s.byCategory.map(c => c.category), ['Electronics', 'Restaurant']);
  assert.equal(s.buckets.length, 5); // Sep 1–7, 8–14, 15–21, 22–28, 29–30
  assert.equal(s.buckets[3].hstCents, 2876 + 97);
  assert.equal(s.buckets.reduce((sum, b) => sum + b.hstCents, 0), s.hstCents);
});

test('float amounts sum without drift', () => {
  const receipts = Array.from({ length: 10 }, () =>
    receipt({ totalAmount: 1.13, hstAmount: 0.13, category: 'Restaurant', purchaseDate: '2026-09-10T12:00:00' }));
  const s = summarizeTax(receipts, CATEGORIES, 13, 'month', new Date(2026, 8, 1));
  assert.equal(formatCents(s.hstCents), '$1.30');
});

test('week runs Monday to Sunday', () => {
  const { start, end } = getPeriodRange('week', new Date(2026, 8, 30)); // Wed Sep 30
  assert.equal(start.getDay(), 1);
  assert.equal(start.getDate(), 28);
  assert.equal(end.getMonth(), 9);
  assert.equal(end.getDate(), 5);
});

test('quarter and year ranges', () => {
  const q = getPeriodRange('quarter', new Date(2026, 7, 20));
  assert.deepEqual([q.start.getMonth(), q.end.getMonth()], [6, 9]);
  const y = getPeriodRange('year', new Date(2026, 7, 20));
  assert.deepEqual([y.start.getFullYear(), y.end.getFullYear()], [2026, 2027]);
});

test('shifting a month from the 31st does not skip months', () => {
  const next = shiftPeriod('month', new Date(2026, 0, 31), 1);
  assert.equal(next.getMonth(), 1);
});

test('totals check passes when subtotal plus tax equals total', () => {
  assert.deepEqual(checkTotals(7.48, 0.97, 8.45), { ok: true, diffCents: 0 });
});

test('totals check reports the gap when numbers disagree', () => {
  assert.deepEqual(checkTotals(39.99, 4.52, 45.19), { ok: false, diffCents: 68 });
});

test('totals check is skipped when a value is missing', () => {
  assert.equal(checkTotals(undefined, 0.97, 8.45), null);
});
