import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPayment, cleanItemName, mergeItems } from './receiptParser.ts';

test('payment method is read from the card lines', () => {
  assert.equal(findPayment('TOTAL 12.00\nMASTERCARD ************8443\nAPPROVED'), 'Mastercard •••• 8443');
  assert.equal(findPayment('VISA DEBIT\nCARD NUMBER: **** **** **** 4821'), 'Debit •••• 4821');
  assert.equal(findPayment('TOTAL 5.00\nCASH 10.00\nCHANGE 5.00'), 'Cash');
  assert.equal(findPayment('MILK 2.99\nTOTAL 2.99'), undefined);
});

test('item names lose bar codes, prices and scraps', () => {
  assert.equal(cleanItemName('SLICED BREAD 0018ded 0.99 H'), 'Sliced Bread');
  assert.equal(cleanItemName('062891234567 DAIRY MILK $1.25'), 'Dairy Milk');
  assert.equal(cleanItemName('4821 0.99'), '');
});

test('two reads of one receipt give one clean item list', () => {
  const a = { names: ['Ondon', 'Dairy Milk', 'Gel Slghters', 'Long Ombrell As', 'Card Scrap'], items: [] };
  const b = {
    names: ['Dairy Milk', 'Gel Pen', 'Long Umbrella'],
    items: [{ name: 'Gel Pen', qty: 1, unitPrice: 1.5, amount: 1.5 }],
  };
  const out = mergeItems(a, b);
  assert.deepEqual(out.map(i => i.name), ['Dairy Milk', 'Gel Pen', 'Long Umbrella']);
  assert.deepEqual(out.map(i => i.amount), [0, 1.5, 0]);
});
