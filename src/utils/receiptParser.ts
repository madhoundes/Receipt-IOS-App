import type { OcrResult, ReceiptItem } from '../types';

/**
 * Turns the plain text read off a receipt photo into receipt fields. Plain rules, no AI:
 * it looks for the TOTAL line, tax lines (HST, GST, PST...), a date, the store name and the item lines.
 * Returns null when the text does not look like a receipt.
 */

const MONEY = /(?<![\d.,])-?\$?\s?(\d{1,3}(?:[ ,]\d{3})+|\d+)\s?[.,]\s?(\d{2})(?![\d])-?/g;

type Amount = { value: number; index: number };

const amountsIn = (line: string): Amount[] => {
  const out: Amount[] = [];
  for (const m of line.matchAll(MONEY)) {
    const whole = m[1].replace(/[ ,]/g, '');
    let value = Number(`${whole}.${m[2]}`);
    if (!Number.isFinite(value)) continue;
    const text = m[0];
    if (text.trim().startsWith('-') || text.trim().endsWith('-')) value = -value;
    out.push({ value, index: m.index ?? 0 });
  }
  return out;
};
const lastAmount = (line: string): number | undefined => amountsIn(line).at(-1)?.value;

const RE_SUBTOTAL = /sub\s*-?\s*total|merchandise\s+total|total\s+before\s+tax/i;
const RE_TOTAL_STRONG = /grand\s*total|total\s*due|amount\s*due|balance\s*due|total\s*sale|total\s*amount|amount\s*paid|total\s*paid/i;
const RE_TOTAL = /\btotal\b/i;
const RE_NOT_TOTAL = /total\s*(savings|saved|discount|tax|items|points|qty|number)|tax\s*total|items?\s*total|points|savings/i;
const RE_TAX = /\b(hst|gst|pst|qst|tvq|tps|tvh|h\.s\.t|g\.s\.t|tax|taxes)\b/i;
const RE_TAX_ID = /(tax\s*(id|no|num|number|#|reg)|(hst|gst|pst|qst)\s*(#|no|num|number|reg|registration)|\d{9}\s?rt|business\s*(no|number|#)|bn\b)/i;
const RE_PAYMENT = /\b(visa|mastercard|master\s*card|amex|debit|credit|interac|cash|change|tender|tendered|payment|paid|card|approved|auth|balance|tip|gratuity|rounding)\b/i;
const RE_NOT_ITEM = new RegExp(`${RE_SUBTOTAL.source}|\\btotal\\b|${RE_TAX.source}|${RE_PAYMENT.source}|\\bsavings?\\b|\\bdiscount\\b|\\bpoints\\b`, 'i');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const validDate = (y: number, m: number, d: number, now: Date): Date | null => {
  if (y < 100) y += 2000;
  if (y < 2000 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d, 12, 0, 0);
  if (date.getMonth() !== m - 1) return null;
  if (date.getTime() > now.getTime() + 36 * 3600 * 1000) return null;
  return date;
};

export function findDate(text: string, now = new Date()): Date | null {
  let m: RegExpMatchArray | null;
  // 2026-10-03 or 2026/10/03
  if ((m = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/))) {
    const d = validDate(+m[1], +m[2], +m[3], now); if (d) return d;
  }
  // Oct 3, 2026 / OCT 03 2026 / October 3 26
  if ((m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4}|\d{2})\b/i))) {
    const d = validDate(+m[3], MONTHS.indexOf(m[1].toLowerCase()) + 1, +m[2], now); if (d) return d;
  }
  // 3 Oct 2026 / 03-OCT-26
  if ((m = text.match(/\b(\d{1,2})[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?[\s,-]+(\d{4}|\d{2})\b/i))) {
    const d = validDate(+m[3], MONTHS.indexOf(m[2].toLowerCase()) + 1, +m[1], now); if (d) return d;
  }
  // 10/03/2026, 03/10/26: month first unless the numbers say otherwise (13 or higher cannot be a month)
  if ((m = text.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/))) {
    const a = +m[1], b = +m[2], y = +m[3];
    const first = a > 12 ? validDate(y, b, a, now) : validDate(y, a, b, now);
    if (first) return first;
    const second = validDate(y, b, a, now); if (second) return second;
  }
  return null;
}

// Stores people in Canada scan most. `match` is checked against the lowercase text.
type Brand = { match: RegExp; name: string; category: string; subcategory: string };
const BRANDS: Brand[] = [
  { match: /tim\s*hortons?/, name: 'Tim Hortons', category: 'Restaurant', subcategory: 'Cafe' },
  { match: /starbucks/, name: 'Starbucks', category: 'Restaurant', subcategory: 'Cafe' },
  { match: /mcdonald/, name: 'McDonald’s', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /\ba\s*&\s*w\b/, name: 'A&W', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /subway/, name: 'Subway', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /\besso\b/, name: 'Esso', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /petro[\s-]*canada/, name: 'Petro-Canada', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /\bshell\b/, name: 'Shell', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /pioneer|husky/, name: 'Gas Station', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /costco/, name: 'Costco', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /loblaws?/, name: 'Loblaws', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /no\s*frills/, name: 'No Frills', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /sobeys/, name: 'Sobeys', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /\bmetro\b/, name: 'Metro', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /freshco/, name: 'FreshCo', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /food\s*basics/, name: 'Food Basics', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /farm\s*boy/, name: 'Farm Boy', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /walmart/, name: 'Walmart', category: 'Household', subcategory: 'Supplies' },
  { match: /dollarama/, name: 'Dollarama', category: 'Household', subcategory: 'Supplies' },
  { match: /canadian\s*tire/, name: 'Canadian Tire', category: 'Household', subcategory: 'Supplies' },
  { match: /home\s*depot/, name: 'Home Depot', category: 'Household', subcategory: 'Supplies' },
  { match: /ikea/, name: 'IKEA', category: 'Household', subcategory: 'Furniture' },
  { match: /shoppers\s*drug\s*mart/, name: 'Shoppers Drug Mart', category: 'Pharmacy/Health', subcategory: 'Personal Care' },
  { match: /rexall/, name: 'Rexall', category: 'Pharmacy/Health', subcategory: 'Personal Care' },
  { match: /best\s*buy/, name: 'Best Buy', category: 'Electronics', subcategory: 'Gadgets' },
  { match: /staples/, name: 'Staples', category: 'Electronics', subcategory: 'Accessories' },
  { match: /\buber\b/, name: 'Uber', category: 'Transport', subcategory: 'Rideshare' },
  { match: /lcbo/, name: 'LCBO', category: 'Other', subcategory: 'General' },
];

// Words that point to a category when the store is not a known one.
const KEYWORDS: { match: RegExp; category: string; subcategory: string }[] = [
  { match: /litre|liter|\bpump\b|unleaded|\bregular\s*8\d|diesel|gasoline|fuel/, category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /\bserver\b|\btable\b|gratuity|\btip\b|guest|dine[\s-]*in|\bmenu\b|restaurant|grill|pizza|burger|coffee|cafe|bistro|sushi/, category: 'Restaurant', subcategory: 'Dine-In' },
  { match: /pharmacy|prescription|\brx\b|vitamin/, category: 'Pharmacy/Health', subcategory: 'Medication' },
  { match: /grocery|produce|\bmilk\b|\beggs\b|\bbread\b|organic|supermarket|market/, category: 'Groceries', subcategory: 'Food Retail' },
  { match: /parking/, category: 'Transport', subcategory: 'Parking' },
  { match: /hydro|electric|internet|wireless|mobile plan/, category: 'Utilities', subcategory: 'Internet' },
];

const titleCase = (s: string) =>
  s === s.toUpperCase() ? s.toLowerCase().replace(/\b([a-z])/g, c => c.toUpperCase()) : s;

const alphaCount = (s: string) => (s.match(/[A-Za-z]/g) ?? []).length;

const looksLikeStoreName = (line: string): boolean => {
  const letters = alphaCount(line);
  if (letters < 3) return false;
  if (letters / line.replace(/\s/g, '').length < 0.6) return false;
  if (/www\.|\.com|\.ca|@|https?:/i.test(line)) return false;
  if (/\b(receipt|invoice|thank|welcome|customer\s*copy|merchant\s*copy|tel|phone|store\s*#?\s*\d|cashier|order|table|server|duplicate|reprint)\b/i.test(line)) return false;
  if (/\b(street|st\.?|ave|avenue|road|rd\.?|blvd|drive|dr\.?|unit|suite|hwy|highway|lane|ontario|\bon\b|canada)\b/i.test(line) && /\d/.test(line)) return false;
  if (/\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b/i.test(line)) return false; // postal code
  return true;
};

export function parseReceiptText(raw: string, now = new Date()): OcrResult | null {
  const lines = raw.split(/\r?\n/).map(l => l.replace(/[|_~]+/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const lower = raw.toLowerCase();

  // Subtotal
  let subtotal: number | undefined;
  for (const l of lines) if (RE_SUBTOTAL.test(l)) { const a = lastAmount(l); if (a != null && a > 0) { subtotal = a; break; } }

  // Total: the largest amount on a TOTAL line that is not a subtotal, savings or tax total.
  let strong: number | undefined; let weak: number | undefined;
  lines.forEach(l => {
    if (RE_SUBTOTAL.test(l) || RE_NOT_TOTAL.test(l)) return;
    const a = lastAmount(l);
    if (a == null || a <= 0) return;
    if (RE_TOTAL_STRONG.test(l)) strong = Math.max(strong ?? 0, a);
    else if (RE_TOTAL.test(l)) weak = Math.max(weak ?? 0, a);
  });
  let total = strong ?? weak;
  if (total == null) {
    // No TOTAL line was read: fall back to the largest amount in the lower part of the receipt.
    const tail = lines.slice(Math.floor(lines.length * 0.4)).flatMap(l => amountsIn(l).map(a => a.value)).filter(v => v > 0);
    if (tail.length >= 2) total = Math.max(...tail);
  }
  if (total == null) return null;

  // Tax: one "total tax" line wins, otherwise add the separate lines (for example GST + PST).
  let taxLines = lines.filter(l => RE_TAX.test(l) && !RE_TAX_ID.test(l) && !RE_SUBTOTAL.test(l) && !/\btotal\b.*\bpaid\b/i.test(l));
  taxLines = taxLines.filter(l => { const a = lastAmount(l); return a != null && a > 0 && a < total!; });
  const totalTaxLine = taxLines.find(l => /(total\s*tax|tax\s*total|taxes)/i.test(l));
  const used = totalTaxLine ? [totalTaxLine] : taxLines;
  let hstAmount: number | undefined;
  let hstPercent: number | undefined;
  if (used.length) {
    hstAmount = Math.round(used.reduce((s, l) => s + (lastAmount(l) ?? 0), 0) * 100) / 100;
    const pcts = used.map(l => l.match(/(\d{1,2}(?:\.\d{1,3})?)\s*%/)?.[1]).filter(Boolean).map(Number);
    if (pcts.length) hstPercent = Math.round(pcts.reduce((s, p) => s + p, 0) * 1000) / 1000;
  }
  // A tax amount that cannot fit the receipt (bigger than the subtotal) is a misread.
  if (hstAmount != null && subtotal != null && hstAmount > subtotal) { hstAmount = undefined; hstPercent = undefined; }

  // Date
  const dateFound = findDate(raw, now);
  const purchaseDate = (dateFound ?? now).toISOString();

  // Store
  const brand = BRANDS.find(b => b.match.test(lower));
  let storeName = brand?.name ?? '';
  if (!storeName) {
    const head = lines.slice(0, 8).find(looksLikeStoreName);
    storeName = head ? titleCase(head.replace(/[^A-Za-z0-9&'’.\- ]/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 60) : '';
  }

  // Category
  const kw = KEYWORDS.find(k => k.match.test(lower));
  const category = brand?.category ?? kw?.category ?? 'Other';
  const subcategory = brand?.subcategory ?? kw?.subcategory ?? 'General';

  // Items: lines before the first subtotal / total / tax line that end with a price.
  const stop = lines.findIndex(l => RE_SUBTOTAL.test(l) || RE_TOTAL.test(l) || (RE_TAX.test(l) && !RE_TAX_ID.test(l)));
  const body = stop > 0 ? lines.slice(0, stop) : lines;
  const items: ReceiptItem[] = [];
  for (const l of body) {
    if (RE_NOT_ITEM.test(l) || RE_TAX_ID.test(l)) continue;
    const amts = amountsIn(l);
    if (!amts.length) continue;
    const amount = amts.at(-1)!.value;
    if (amount <= 0) continue;
    let name = l.slice(0, amts.at(-1)!.index).replace(/[$]/g, '').trim();
    let qty = 1;
    const lead = name.match(/^(\d{1,2})\s*(?:x|@)\s*(\D.*)$/i);
    const trail = name.match(/^(.*\D)\s+(\d{1,2})\s*(?:x|@)\s*[\d.,]*$/i);
    if (lead) { qty = +lead[1]; name = lead[2]; } else if (trail) { qty = +trail[2]; name = trail[1]; }
    name = name.replace(/\s*[A-Z]$/, '').replace(/[^A-Za-z0-9&'’.,/()\- ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (alphaCount(name) < 2) continue;
    items.push({ name: titleCase(name).slice(0, 60), qty, unitPrice: Math.round((amount / qty) * 100) / 100, amount });
    if (items.length >= 40) break;
  }

  // How sure are we? Every key value found adds trust; values that agree with each other add more.
  let confidence = 0.3;
  if (strong != null) confidence += 0.2; else confidence += 0.1;
  if (storeName) confidence += brand ? 0.15 : 0.1;
  if (dateFound) confidence += 0.1;
  if (hstAmount != null) confidence += 0.1;
  if (subtotal != null && hstAmount != null && Math.abs(subtotal + hstAmount - total) <= 0.02) confidence += 0.15;
  else if (subtotal != null && hstAmount == null && Math.abs(subtotal - total) <= 0.02) confidence += 0.05;
  confidence = Math.min(0.97, confidence);

  return { storeName, purchaseDate, totalAmount: total, subtotal, hstAmount, hstPercent, items, category, subcategory, confidence: Math.round(confidence * 100) / 100 };
}
