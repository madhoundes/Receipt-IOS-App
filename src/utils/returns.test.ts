import { test } from 'node:test';
import assert from 'node:assert/strict';
import { daysLeft, openReturns, reminderDate, returnByFor, windowDays } from './returns.ts';

const now = new Date(2026, 9, 3, 15);
const r = (id: string, purchase: Date, days?: number): any => ({
  id, purchaseDate: purchase.toISOString(), returnBy: days == null ? undefined : returnByFor(purchase.toISOString(), days),
});

test('daysLeft counts whole calendar days', () => {
  assert.equal(daysLeft(new Date(2026, 9, 3, 1).toISOString(), now), 0);
  assert.equal(daysLeft(new Date(2026, 9, 6, 23).toISOString(), now), 3);
  assert.equal(daysLeft(new Date(2026, 9, 1).toISOString(), now), -2);
});

test('returnByFor and windowDays agree', () => {
  const rec = r('a', new Date(2026, 8, 24, 14), 30);
  assert.equal(windowDays(rec), 30);
  assert.equal(daysLeft(rec.returnBy, now), 21);
});

test('openReturns drops closed windows and receipts without one, soonest first', () => {
  const list = [r('late', new Date(2026, 8, 24), 30), r('none', new Date(2026, 9, 1)), r('closed', new Date(2026, 7, 1), 30), r('soon', new Date(2026, 8, 22), 14)];
  assert.deepEqual(openReturns(list, now).map(x => x.id), ['soon', 'late']);
});

test('reminderDate is 9 a.m. the chosen number of days before the last return day', () => {
  const d = reminderDate(new Date(2026, 9, 24, 12).toISOString(), 2, now)!;
  assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()], [2026, 9, 22, 9]);
});

test('reminderDate falls back to the next morning, and stops when the window has closed', () => {
  const soon = reminderDate(new Date(2026, 9, 4, 12).toISOString(), 2, now)!;
  assert.deepEqual([soon.getMonth(), soon.getDate(), soon.getHours()], [9, 4, 9]);
  assert.equal(reminderDate(new Date(2026, 9, 3, 12).toISOString(), 2, now), null);
  assert.equal(reminderDate(new Date(2026, 9, 1, 12).toISOString(), 2, now), null);
});
