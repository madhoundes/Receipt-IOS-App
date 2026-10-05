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

// The reader often turns digits into look-alike letters inside prices and dates (1O.99, 8.4S, 2O26-1O-O3).
const LOOKALIKE: Record<string, string> = { O: '0', o: '0', I: '1', l: '1', S: '5', B: '8' };
const fixLookalikes = (token: string) => token.replace(/[OoIlSB]/g, c => LOOKALIKE[c]);
const fixPriceTokens = (line: string) =>
  line.replace(/(?<![A-Za-z0-9])[0-9OoIlSB]{1,6}\s?[.,]\s?[0-9OoIlSB]{2}(?![A-Za-z0-9])/g, t => (/\d/.test(t) && /^\d{1,6}\s?[.,]\s?\d{2}$/.test(fixLookalikes(t)) ? fixLookalikes(t) : t));
const fixDateTokens = (text: string) =>
  text
    .replace(/(?<![A-Za-z0-9])[0-9OoIl]{1,4}(?:\s?[-/.]\s?[0-9OoIl]{1,4}){2}(?![A-Za-z0-9])/g, t => (/\d/.test(t) ? fixLookalikes(t) : t))
    .replace(/(\d)\s*([/.-])\s*(?=\d)/g, '$1$2');

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

export function findDate(rawText: string, now = new Date()): Date | null {
  const text = fixDateTokens(rawText);
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
export type Brand = { match: RegExp; name: string; category: string; subcategory: string };
export const BRANDS: Brand[] = [
  { match: /amazon\s*prime|prime\s*video|\bprime\s*member/, name: 'Amazon Prime', category: 'Entertainment', subcategory: 'Movies' },
  { match: /^apple\b|\bapple\s*(store|\.com|canada|inc\b)/, name: 'Apple', category: 'Electronics', subcategory: 'Gadgets' },
  { match: /chipotle/, name: 'Chipotle', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /disney\s*(\+|plus)/, name: 'Disney+', category: 'Entertainment', subcategory: 'Movies' },
  { match: /\bgoodwill\b/, name: 'Goodwill', category: 'Clothing', subcategory: 'Apparel' },
  { match: /\bhulu\b/, name: 'Hulu', category: 'Entertainment', subcategory: 'Movies' },
  { match: /^indigo\b|indigo\s*(books|\.ca)|chapters\s*indigo|^chapters\b/, name: 'Indigo', category: 'Other', subcategory: 'General' },
  { match: /netflix/, name: 'Netflix', category: 'Entertainment', subcategory: 'Movies' },
  { match: /osmow/, name: 'Osmow’s', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /pizza\s*hut/, name: 'Pizza Hut', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /pizza\s*pizza/, name: 'Pizza Pizza', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /\bshein\b/, name: 'Shein', category: 'Clothing', subcategory: 'Apparel' },
  { match: /shopify/, name: 'Shopify', category: 'Services', subcategory: 'Professional' },
  { match: /spotify/, name: 'Spotify', category: 'Entertainment', subcategory: 'Movies' },
  { match: /\btemu\b/, name: 'Temu', category: 'Other', subcategory: 'General' },
  { match: /word\s*press/, name: 'WordPress', category: 'Services', subcategory: 'Professional' },
  { match: /uber\s*[-.]?\s*eats/, name: 'Uber Eats', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /tim\s*hortons?/, name: 'Tim Hortons', category: 'Restaurant', subcategory: 'Cafe' },
  { match: /starbucks/, name: 'Starbucks', category: 'Restaurant', subcategory: 'Cafe' },
  { match: /mcdonald/, name: 'McDonald’s', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /\ba\s*&\s*w\b/, name: 'A&W', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /subway/, name: 'Subway', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /\besso\b/, name: 'Esso', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /petro[\s-]*canada/, name: 'Petro-Canada', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /\bshell\b/, name: 'Shell', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /\bpioneer\b/, name: 'Pioneer', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /\bhusky\b/, name: 'Husky', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /\bmobil\b/, name: 'Mobil', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /\bkfc\b|kentucky\s*fried/, name: 'KFC', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /chick[\s-]*fil[\s-]*a/, name: 'Chick-fil-A', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /taco\s*bell/, name: 'Taco Bell', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /door\s*dash/, name: 'DoorDash', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /skip\s*the\s*dishes/, name: 'Skip', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /\badonis\b/, name: 'Adonis', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /\bamazon\b/, name: 'Amazon', category: 'Household', subcategory: 'Supplies' },
  { match: /\bnike\b/, name: 'Nike', category: 'Clothing', subcategory: 'Footwear' },
  { match: /\bh\s*&\s*m\b/, name: 'H&M', category: 'Clothing', subcategory: 'Apparel' },
  { match: /london\s*hydro/, name: 'London Hydro', category: 'Utilities', subcategory: 'Electricity' },
  { match: /enbridge/, name: 'Enbridge', category: 'Utilities', subcategory: 'Electricity' },
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
  { match: /giant\s*tiger/, name: 'Giant Tiger', category: 'Household', subcategory: 'Supplies' },
  { match: /lowe'?s/, name: 'Lowe’s', category: 'Household', subcategory: 'Supplies' },
  { match: /\brona\b/, name: 'RONA', category: 'Household', subcategory: 'Supplies' },
  { match: /\bmichaels\b/, name: 'Michaels', category: 'Household', subcategory: 'Supplies' },
  { match: /bulk\s*barn/, name: 'Bulk Barn', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /whole\s*foods/, name: 'Whole Foods', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /superstore/, name: 'Real Canadian Superstore', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /save[\s-]*on[\s-]*foods/, name: 'Save-On-Foods', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /safeway/, name: 'Safeway', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /longo'?s/, name: 'Longo’s', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /t\s*&\s*t\s*supermarket/, name: 'T&T Supermarket', category: 'Groceries', subcategory: 'Food Retail' },
  { match: /pharmasave/, name: 'Pharmasave', category: 'Pharmacy/Health', subcategory: 'Personal Care' },
  { match: /circle\s*k/, name: 'Circle K', category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { match: /mr\.?\s*lube/, name: 'Mr. Lube', category: 'Services', subcategory: 'Repair' },
  { match: /\bwendy'?s\b/, name: 'Wendy’s', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /harvey'?s/, name: 'Harvey’s', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /popeyes/, name: 'Popeyes', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /pizza\s*pizza/, name: 'Pizza Pizza', category: 'Restaurant', subcategory: 'Fast Food' },
  { match: /swiss\s*chalet/, name: 'Swiss Chalet', category: 'Restaurant', subcategory: 'Dine-In' },
  { match: /boston\s*pizza/, name: 'Boston Pizza', category: 'Restaurant', subcategory: 'Dine-In' },
  { match: /lyft/, name: 'Lyft', category: 'Transport', subcategory: 'Rideshare' },
  { match: /green\s*p\b|impark|indigo\s*park/, name: 'Parking', category: 'Transport', subcategory: 'Parking' },
  { match: /\brogers\b/, name: 'Rogers', category: 'Utilities', subcategory: 'Internet' },
  { match: /\bbell\s*(canada|mobility)/, name: 'Bell', category: 'Utilities', subcategory: 'Internet' },
  { match: /\btelus\b/, name: 'Telus', category: 'Utilities', subcategory: 'Internet' },
  { match: /\bfido\b|koodo/, name: 'Mobile Plan', category: 'Utilities', subcategory: 'Mobile' },
  { match: /hydro\s*one/, name: 'Hydro One', category: 'Utilities', subcategory: 'Electricity' },
];

// Header text with look-alike characters fixed and the spaces removed, so "T1M H0RT0NS" still finds Tim Hortons.
const squashed = (text: string) => text.toLowerCase().replace(/[01|5$]/g, c => ({ '0': 'o', '1': 'l', '|': 'l', '5': 's', '$': 's' }[c] as string)).replace(/[^a-z]/g, '').replace(/i/g, 'l');
const brandKey = (b: Brand) => b.name.toLowerCase().replace(/[^a-z]/g, '').replace(/i/g, 'l');

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
  const lines = raw.split(/\r?\n/).map(l => fixPriceTokens(l.replace(/[|_~]+/g, ' ').replace(/\s+/g, ' ').trim())).filter(Boolean);
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

  // A total far outside what the subtotal allows (below it, or more than 40% above it) is a misread. The card or debit
  // line repeats the amount paid, so take it from there when it fits.
  let totalFixed = false;
  if (subtotal != null && (total < subtotal - 0.005 || total > subtotal * 1.4)) {
    const paid = lines.filter(l => /\b(visa|mastercard|master\s*card|amex|debit|credit|interac|card|paid|payment)\b/i.test(l))
      .map(l => lastAmount(l)).filter((v): v is number => v != null && v >= subtotal! - 0.005 && v <= subtotal! * 1.4);
    if (paid.length) { total = paid[paid.length - 1]; totalFixed = true; }
  }

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

  // The receipt's own arithmetic is the best check. If subtotal + tax disagrees with the total we read, and the sum
  // shows up somewhere else on the receipt (for example on the card line), the total was misread.
  if (subtotal != null && hstAmount != null) {
    const expected = Math.round((subtotal + hstAmount) * 100) / 100;
    if (Math.abs(expected - total) > 0.02 && lines.some(l => amountsIn(l).some(a => Math.abs(a.value - expected) < 0.005))) { total = expected; totalFixed = true; }
  }
  // No tax line was read but subtotal and total are: the gap is the tax, if it is a believable rate and there is no tip.
  let hstInferred = false;
  if (hstAmount == null && subtotal != null && total > subtotal && !/\b(tip|gratuity)\b/i.test(raw)) {
    const gap = Math.round((total - subtotal) * 100) / 100;
    const rate = gap / subtotal;
    if (rate >= 0.04 && rate <= 0.16) { hstAmount = gap; hstInferred = true; }
  }

  // Date
  const dateFound = findDate(raw, now);
  const purchaseDate = (dateFound ?? now).toISOString();

  // Store
  const header = squashed(lines.slice(0, 8).join(' '));
  const brand = BRANDS.find(b => b.match.test(lower)) ?? BRANDS.find(b => brandKey(b).length >= 5 && header.includes(brandKey(b)));
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
  if (strong != null || totalFixed) confidence += 0.2; else confidence += 0.1;
  if (storeName) confidence += brand ? 0.15 : 0.1;
  if (dateFound) confidence += 0.1;
  if (hstAmount != null) confidence += hstInferred ? 0.05 : 0.1;
  if (subtotal != null && hstAmount != null && Math.abs(subtotal + hstAmount - total) <= 0.02) confidence += 0.15;
  else if (subtotal != null && hstAmount == null && Math.abs(subtotal - total) <= 0.02) confidence += 0.05;
  confidence = Math.min(0.97, confidence);

  return { storeName, purchaseDate, totalAmount: total, subtotal, hstAmount, hstPercent, hstInferred: hstInferred || undefined, items, category, subcategory, confidence: Math.round(confidence * 100) / 100 };
}
