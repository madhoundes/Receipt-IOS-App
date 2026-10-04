import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildReportHtml } from './report.ts';

const row = (id: string, store: string, total: number, hstCents: number, status = 'taxed', extra: any = {}): any => ({
  receipt: { id, storeName: store, purchaseDate: new Date(2026, 8, 12, 12).toISOString(), totalAmount: total, category: 'Household', ...extra },
  status, hstCents, taxableCents: 0,
});
const base = { title: 'Receipt TaX', periodLabel: 'Sep 2026', lineItems: false };

test('report totals add up and stores are escaped', () => {
  const html = buildReportHtml([row('a', 'A & <B>', 11.3, 130), row('b', 'Shop', 22.6, 260)], base);
  assert.match(html, /Total HST paid<\/span><b class="hst">\$3\.90/);
  assert.match(html, /Total spent<\/span><b>\$33\.90/);
  assert.ok(html.includes('A &amp; &lt;B&gt;'));
  assert.ok(!html.includes('<B>'));
});

test('receipts to review are flagged, not counted as zero', () => {
  const html = buildReportHtml([row('a', 'Esso', 65, 0, 'needsReview')], base);
  assert.ok(html.includes('To review'));
  assert.ok(html.includes('1 receipt has no tax amount yet'));
});

test('line items and photos only appear when asked for', () => {
  const r = row('a', 'Shop', 10, 100, 'taxed', { items: [{ name: 'Bins', qty: 2, unitPrice: 4, amount: 8 }] });
  assert.ok(!buildReportHtml([r], base).includes('Bins'));
  const full = buildReportHtml([r], { ...base, lineItems: true, images: { a: 'data:image/jpeg;base64,AAAA' } });
  assert.ok(full.includes('2 × Bins $8.00'));
  assert.ok(full.includes('<img src="data:image/jpeg;base64,AAAA">'));
});
