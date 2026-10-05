import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildDemoReceipts } from './demoReceipts.ts';
import { BRAND_SLUGS, findBrand } from '../utils/brandMatch.ts';

const demo = buildDemoReceipts();

test('sample receipts use every store logo in the app', () => {
  const used = new Set(demo.map(r => findBrand(r.storeName)?.slug).filter(Boolean));
  assert.deepEqual(BRAND_SLUGS.filter(s => !used.has(s)), []);
});

test('sample receipts cover every default category, with valid subcategories', () => {
  const src = readFileSync('src/types.ts', 'utf8');
  const block = src.slice(src.indexOf('export const TAXONOMY'), src.indexOf('};', src.indexOf('export const TAXONOMY')));
  const taxonomy: Record<string, string[]> = {};
  for (const m of block.matchAll(/"([^"]+)":\s*\[([^\]]*)\]/g)) taxonomy[m[1]] = [...m[2].matchAll(/"([^"]+)"/g)].map(x => x[1]);
  assert.equal(Object.keys(taxonomy).length, 12);
  const used = new Set(demo.map(r => r.category));
  assert.deepEqual(Object.keys(taxonomy).filter(c => !used.has(c)), []);
  for (const r of demo) assert.ok(taxonomy[r.category]?.includes(r.subcategory!), `${r.storeName}: ${r.category} / ${r.subcategory}`);
});

test('sample receipts add up and stay within the last three months', () => {
  const ids = new Set(demo.map(r => r.id));
  assert.equal(ids.size, demo.length);
  for (const r of demo) {
    if (r.hstAmount != null) assert.equal(Math.round((r.subtotal! + r.hstAmount) * 100), Math.round(r.totalAmount * 100), r.storeName);
    const age = (Date.now() - new Date(r.purchaseDate).getTime()) / 86400000;
    assert.ok(age >= -1 && age <= 92, r.storeName);
  }
});
