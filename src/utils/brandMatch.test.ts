import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findBrand, BRAND_SLUGS } from './brandMatch.ts';
import { readdirSync } from 'node:fs';

test('store names find their logo, however they are written', () => {
  const cases: [string, string][] = [
    ['Tim Hortons', 'tim-hortons'], ['TIM HORTONS #4521', 'tim-hortons'], ['McDonald’s', 'mcdonalds'], ["McDonald's Restaurants", 'mcdonalds'],
    ['A&W', 'a-and-w'], ['Real Canadian Superstore', 'real-canadian-superstore'], ['Wal-Mart Supercentre', 'walmart'], ['Costco Wholesale', 'costco'],
    ['Uber Eats', 'uber-eats'], ['UBER *TRIP', 'uber'], ['Taco Bell', 'taco-bell'], ['Bell Canada', 'bell'], ['Metro Ontario', 'metro'],
    ['Amazon.ca', 'amazon'], ['H & M', 'h-and-m'], ['TD Canada Trust', 'td'], ['Skip', 'skip'], ['SkipTheDishes', 'skip'],
    ['Popeyes Louisiana Kitchen', 'popeyes'], ['Chick-fil-A', 'chick-fil-a'], ['London Hydro', 'london-hydro'], ['Anthropic, PBC', 'anthropic'], ['OpenAI', 'openai'],
    ['Amazon Prime', 'amazon-prime'], ['PRIME VIDEO', 'amazon-prime'], ['Amazon.ca Order', 'amazon'], ['Apple Store Masonville', 'apple'], ['APPLE.COM/BILL', 'apple'],
    ['Disney Plus', 'disney-plus'], ['Disney+', 'disney-plus'], ['Pizza Pizza #212', 'pizza-pizza'], ['Pizza Hut', 'pizza-hut'], ['Osmow’s Shawarma', 'osmows'],
    ['NETFLIX.COM', 'netflix'], ['Spotify P1234', 'spotify'], ['Chapters Indigo', 'indigo'], ['WordPress.com', 'wordpress'], ['Shopify* Store', 'shopify'],
  ];
  for (const [name, slug] of cases) assert.equal(findBrand(name)?.slug, slug, name);
});

test('similar words are not mistaken for a store', () => {
  for (const name of ['Bellevue Cafe', 'Metrolinx', 'Shellfish House', 'Skipper Fish', 'Tandoori Palace', 'Nikesh Tailor', 'Local Pioneering Co', 'Applebee’s', 'Pineapple Express Cafe', 'Joe’s Pizza', 'Temuco Imports', '', '   ']) {
    assert.equal(findBrand(name), null, name);
  }
});

test('every logo file has a matching rule and every rule has a file', () => {
  const files = readdirSync('assets/brands').map(f => f.replace(/\.png$/, '')).sort();
  assert.deepEqual([...BRAND_SLUGS].sort(), files);
});
