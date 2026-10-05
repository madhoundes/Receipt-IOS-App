import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCsv } from './csv.ts';

const row = (store: string, total: number, hstCents: number, status: any, extra: any = {}): any => ({
  receipt: { id: 'r1', storeName: store, purchaseDate: new Date(2026, 8, 12, 12).toISOString(), totalAmount: total, category: 'Groceries', ...extra },
  status, hstCents, taxableCents: 0, percent: status === 'taxed' ? 13 : undefined,
});

test('csv has a BOM, a readable date and the tax status', () => {
  const csv = buildCsv([row('Metro', 11.3, 130, 'taxed', { subtotal: 10 })]);
  assert.ok(csv.startsWith('﻿Date,Store,'));
  const line = csv.split('\r\n')[1];
  assert.equal(line, '2026-09-12,Metro,Groceries,,10.00,13,1.30,11.30,Taxed,,,r1');
});

test('a receipt whose tax was not read leaves the tax cells empty', () => {
  const line = buildCsv([row('Esso', 65, 0, 'needsReview')]).split('\r\n')[1];
  assert.equal(line, '2026-09-12,Esso,Groceries,,,,,65.00,Needs review,,,r1');
});

test('commas, quotes and formula characters are made safe', () => {
  const line = buildCsv([row('A, "B"', 5, 0, 'noTax', { notes: '=SUM(A1)' })]).split('\r\n')[1];
  assert.ok(line.includes('"A, ""B"""'));
  assert.ok(line.includes("'=SUM(A1)"));
});
