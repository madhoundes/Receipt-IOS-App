import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseReceiptText, findDate } from './receiptParser.ts';

const NOW = new Date(2026, 9, 4, 12, 0, 0);

const TIMS = `TIM HORTONS
#4521 Dundas St
London ON N6B 1V8
Tel 519-555-0100
2026-10-03 08:14
Large Double Double 2.15
2 x Boston Cream 3.18
Everything Bagel 2.15
Subtotal 7.48
HST 13% 0.97
Total 8.45
VISA ****1234 8.45
HST# 123456789RT0001`;

test('coffee shop receipt with printed HST', () => {
  const r = parseReceiptText(TIMS, NOW)!;
  assert.equal(r.storeName, 'Tim Hortons');
  assert.equal(r.totalAmount, 8.45);
  assert.equal(r.subtotal, 7.48);
  assert.equal(r.hstAmount, 0.97);
  assert.equal(r.hstPercent, 13);
  assert.equal(r.category, 'Restaurant');
  assert.equal(r.purchaseDate.slice(0, 10), '2026-10-03');
  assert.equal(r.items.length, 3);
  assert.equal(r.items[1].qty, 2);
  assert.ok(r.confidence >= 0.8);
});

test('gas receipt without a tax line keeps tax unknown', () => {
  const r = parseReceiptText(`ESSO
PUMP 4
Regular 87  50.00 L
Oct 3, 2026  17:40
TOTAL SALE $65.00
DEBIT 65.00`, NOW)!;
  assert.equal(r.storeName, 'Esso');
  assert.equal(r.totalAmount, 65);
  assert.equal(r.hstAmount, undefined);
  assert.equal(r.category, 'Gas/Fuel');
});

test('GST and PST lines are added together; tax id line is ignored', () => {
  const r = parseReceiptText(`Maple Hardware Ltd
GST# 887766554 RT0001
09/28/2026
Hammer 20.00
Nails 10.00
SUBTOTAL 30.00
GST 5% 1.50
PST 7% 2.10
TOTAL 33.60`, NOW)!;
  assert.equal(r.hstAmount, 3.6);
  assert.equal(r.hstPercent, 12);
  assert.equal(r.totalAmount, 33.6);
  assert.equal(r.storeName, 'Maple Hardware Ltd');
});

test('savings and subtotal lines are not the total', () => {
  const r = parseReceiptText(`COSTCO WHOLESALE
Milk 6.99
Bread 4.50
SUBTOTAL 11.49
TOTAL SAVINGS 3.00
TOTAL 11.49
CHANGE 0.00`, NOW)!;
  assert.equal(r.totalAmount, 11.49);
  assert.equal(r.category, 'Groceries');
});

test('text that is not a receipt returns null', () => {
  assert.equal(parseReceiptText('the quick brown fox\njumps over', NOW), null);
  assert.equal(parseReceiptText('', NOW), null);
});

test('dates: month first by default, day first when it must be', () => {
  assert.equal(findDate('on 03/10/2026', NOW)!.getMonth(), 2);
  assert.equal(findDate('on 28/09/26', NOW)!.getDate(), 28);
  assert.equal(findDate('3 Oct 2026', NOW)!.getDate(), 3);
  assert.equal(findDate('2027-01-01', NOW), null);
});

test('comma decimals and thousands separators', () => {
  const r = parseReceiptText(`Best Buy
Laptop 1 199,00
TOTAL 1 354,87
HST 13% 155,87`, NOW)!;
  assert.equal(r.totalAmount, 1354.87);
  assert.equal(r.hstAmount, 155.87);
});
