import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Receipt } from '../types.ts';
import { spendRange, spendByCategory, spendTrend, spendTips, inSpendRange } from './spend.ts';

let n = 0;
const r = (totalAmount: number, category: string, purchaseDate: string): Receipt =>
  ({ id: String(++n), imageName: '', storeName: 'S', totalAmount, category, purchaseDate });

const NOW = new Date(2026, 8, 29, 15); // Tue Sep 29 2026

test('this month covers the calendar month', () => {
  const w = spendRange('month', NOW)!;
  assert.deepEqual([w.start.getDate(), w.start.getMonth(), w.end.getMonth()], [1, 8, 9]);
});

test('last 30 days includes today and 29 days back', () => {
  const w = spendRange('last30', NOW)!;
  assert.equal(inSpendRange(r(1, 'X', new Date(2026, 8, 29, 20).toISOString()), w), true);
  assert.equal(inSpendRange(r(1, 'X', new Date(2026, 7, 31, 12).toISOString()), w), true);
  assert.equal(inSpendRange(r(1, 'X', new Date(2026, 7, 30, 12).toISOString()), w), false);
});

test('last week is the Monday-to-Sunday before this week', () => {
  const w = spendRange('lastWeek', NOW)!;
  assert.deepEqual([w.start.getDay(), w.start.getDate(), w.end.getDate()], [1, 21, 28]);
});

test('all time has no window', () => {
  assert.equal(spendRange('all', NOW), null);
});

test('category totals are sorted and shares add up', () => {
  const s = spendByCategory([r(10, 'A', '2026-09-01'), r(30, 'B', '2026-09-02'), r(0.1, 'A', '2026-09-03')]);
  assert.deepEqual(s.map(c => [c.category, c.totalCents, c.count]), [['B', 3000, 1], ['A', 1010, 2]]);
  assert.ok(Math.abs(s.reduce((t, c) => t + c.share, 0) - 1) < 1e-9);
});

test('month trend buckets sum to the month total', () => {
  const list = [r(5, 'A', new Date(2026, 8, 2, 12).toISOString()), r(7, 'A', new Date(2026, 8, 29, 12).toISOString()), r(9, 'A', new Date(2026, 7, 29, 12).toISOString())];
  const b = spendTrend(list, 'month', NOW);
  assert.equal(b.length, 5);
  assert.equal(b.reduce((t, x) => t + x.totalCents, 0), 1200);
});

test('week trend has seven days', () => {
  assert.equal(spendTrend([], 'week', NOW).length, 7);
});

test('heavy hitter tip fires when one category dominates', () => {
  const tips = spendTips(spendByCategory([r(80, 'Groceries', '2026-09-01'), r(20, 'Transport', '2026-09-01')]), 2);
  assert.equal(tips[0].id, 'heavy');
  assert.match(tips[0].text, /80%/);
});
