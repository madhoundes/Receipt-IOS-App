import type { Receipt, ReceiptItem } from '../types';

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

/** `t`: HST 13% is on the receipt. `z`: zero-rated, no HST. `r`: no tax line was read, so the receipt waits for review. */
type Tax = 't' | 'z' | 'r';
type Row = [store: string, category: string, subcategory: string, total: number, tax: Tax, daysAgo: number, payment?: string, items?: [string, number, number][]];

const VISA = 'VISA •••• 4242', MC = 'MASTERCARD •••• 8443', DEBIT = 'DEBIT •••• 1023', CASH = 'CASH';

// Spread over the last three months. Every category and every store logo in the app appears at least once.
const ROWS: Row[] = [
  // Restaurant
  ['Tim Hortons', 'Restaurant', 'Cafe', 8.45, 't', 0, DEBIT, [['Large Double Double', 1, 2.15], ['Boston Cream', 2, 1.59], ['Everything Bagel', 1, 2.15]]],
  ['Starbucks', 'Restaurant', 'Cafe', 12.83, 't', 2, VISA, [['Caffe Latte Grande', 1, 5.75], ['Butter Croissant', 1, 3.95], ['Bottled Water', 1, 1.65]]],
  ['McDonald’s', 'Restaurant', 'Fast Food', 14.22, 't', 4, DEBIT],
  ['A&W', 'Restaurant', 'Fast Food', 17.5, 't', 9, MC],
  ['KFC', 'Restaurant', 'Fast Food', 26.4, 't', 13, VISA],
  ['Popeyes', 'Restaurant', 'Fast Food', 19.76, 't', 21, DEBIT],
  ['Taco Bell', 'Restaurant', 'Fast Food', 13.1, 't', 27, CASH],
  ['Chick-fil-A', 'Restaurant', 'Fast Food', 21.35, 't', 34, VISA],
  ['Uber Eats', 'Restaurant', 'Dine-In', 38.9, 't', 6, VISA],
  ['DoorDash', 'Restaurant', 'Dine-In', 44.15, 'r', 17, MC],
  ['Skip The Dishes', 'Restaurant', 'Dine-In', 31.6, 't', 48, VISA],
  // Groceries (basic groceries are zero-rated)
  ['Loblaws', 'Groceries', 'Food Retail', 89.5, 'z', 1, DEBIT],
  ['Costco', 'Groceries', 'Food Retail', 215.97, 't', 5, MC, [['Kirkland Paper Towels', 1, 24.99], ['Laundry Detergent', 1, 21.49], ['Rotisserie Chicken', 2, 7.99], ['Mixed Nuts 1.13kg', 1, 18.99]]],
  ['Walmart', 'Groceries', 'Food Retail', 142.2, 't', 8, VISA],
  ['No Frills', 'Groceries', 'Food Retail', 42.15, 'z', 11, DEBIT],
  ['Farm Boy', 'Groceries', 'Produce', 54.5, 'z', 15, DEBIT],
  ['Food Basics', 'Groceries', 'Food Retail', 61.3, 'z', 23, CASH],
  ['FreshCo', 'Groceries', 'Food Retail', 37.84, 'z', 30, DEBIT],
  ['Metro', 'Groceries', 'Bakery', 28.6, 'z', 39, VISA],
  ['Real Canadian Superstore', 'Groceries', 'Food Retail', 118.75, 'r', 44, MC],
  ['Adonis', 'Groceries', 'Produce', 47.2, 'z', 58, DEBIT],
  // Gas/Fuel
  ['Esso', 'Gas/Fuel', 'Gasoline', 65, 't', 3, VISA],
  ['Shell', 'Gas/Fuel', 'Gasoline', 72.4, 't', 19, MC],
  ['Mobil', 'Gas/Fuel', 'Gasoline', 58.15, 't', 36, VISA],
  ['Pioneer', 'Gas/Fuel', 'Gasoline', 49.9, 'r', 62, DEBIT],
  // Pharmacy/Health
  ['Shoppers Drug Mart', 'Pharmacy/Health', 'Personal Care', 33.87, 't', 7, DEBIT],
  ['Rexall', 'Pharmacy/Health', 'Medication', 18.25, 'z', 41, CASH],
  // Household
  ['Dollarama', 'Household', 'Supplies', 14.5, 't', 2, MC, [['Cleaning Wipes', 2, 4], ['Notebook', 1, 3.5]]],
  ['Canadian Tire', 'Household', 'Supplies', 96.03, 't', 14, VISA],
  ['Giant Tiger', 'Household', 'Decor', 52.4, 't', 52, DEBIT],
  // Electronics
  ['Best Buy', 'Electronics', 'Gadgets', 249.99, 't', 10, VISA, [['Sony Headphones', 1, 221.23]]],
  ['Amazon', 'Electronics', 'Accessories', 39.54, 't', 26, MC],
  // Clothing
  ['H&M', 'Clothing', 'Apparel', 84.7, 't', 12, VISA],
  ['Nike', 'Clothing', 'Footwear', 158.19, 't', 46, MC],
  // Utilities
  ['Bell', 'Utilities', 'Internet', 101.7, 't', 16, VISA],
  ['Rogers', 'Utilities', 'Mobile', 73.45, 't', 22, VISA],
  ['London Hydro', 'Utilities', 'Electricity', 128.6, 't', 33, DEBIT],
  ['Enbridge', 'Utilities', 'Water', 94.2, 't', 64, DEBIT],
  // Transport
  ['Uber', 'Transport', 'Rideshare', 24.9, 't', 5, VISA],
  ['LTC Transit', 'Transport', 'Transit', 12, 'z', 29, DEBIT],
  ['Impark Parking', 'Transport', 'Parking', 9.04, 't', 55, MC],
  // Entertainment
  ['Cineplex', 'Entertainment', 'Movies', 31.64, 't', 18, VISA],
  ['Netflix', 'Entertainment', 'Movies', 18.07, 't', 20, VISA],
  // Services
  ['Anthropic', 'Services', 'Professional', 28.25, 't', 24, VISA],
  ['OpenAI', 'Services', 'Professional', 28.25, 't', 54, VISA],
  ['TD Bank', 'Services', 'Professional', 16.95, 'z', 31, DEBIT],
  // Other
  ['Canada Post', 'Other', 'General', 22.6, 't', 37, CASH],
  ['Home Hardware', 'Other', 'General', 46.33, 'r', 71, DEBIT],
  // Subscriptions, online shops and more places to eat
  ['Amazon Prime', 'Entertainment', 'Movies', 11.29, 't', 7, VISA],
  ['Apple Store', 'Electronics', 'Gadgets', 44.07, 't', 13, VISA],
  ['Chipotle', 'Restaurant', 'Fast Food', 18.65, 't', 16, DEBIT],
  ['Disney+', 'Entertainment', 'Movies', 13.55, 't', 25, VISA],
  ['Goodwill', 'Clothing', 'Apparel', 23.73, 't', 28, CASH],
  ['Hulu', 'Entertainment', 'Movies', 11.29, 't', 35, VISA],
  ['Indigo', 'Other', 'General', 36.74, 't', 42, MC],
  ['Osmow’s', 'Restaurant', 'Fast Food', 16.94, 't', 10, DEBIT],
  ['Pizza Hut', 'Restaurant', 'Fast Food', 29.37, 't', 32, MC],
  ['Pizza Pizza', 'Restaurant', 'Fast Food', 22.59, 't', 45, DEBIT],
  ['Shein', 'Clothing', 'Apparel', 61.02, 'r', 50, VISA],
  ['Shopify', 'Services', 'Professional', 44.07, 't', 38, VISA],
  ['Spotify', 'Entertainment', 'Movies', 13.55, 't', 22, VISA],
  ['Temu', 'Other', 'General', 27.12, 't', 57, MC],
  ['WordPress', 'Services', 'Professional', 33.9, 't', 66, VISA],
  // Older months, so the year and the monthly charts have something to show
  ['Costco', 'Groceries', 'Food Retail', 187.42, 't', 68, MC],
  ['Tim Hortons', 'Restaurant', 'Cafe', 6.2, 't', 74, CASH],
  ['Esso', 'Gas/Fuel', 'Gasoline', 61.75, 't', 80, VISA],
  ['Walmart', 'Household', 'Supplies', 73.18, 't', 84, DEBIT],
];

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Ids of the sample receipts all start with this, so they can be told apart from the user's own. */
export const DEMO_PREFIX = 'demo_';
export const isDemoReceipt = (r: Receipt) => r.id.startsWith(DEMO_PREFIX);

/** Sample receipts so a fresh install (while developing) has something on every screen. */
export const buildDemoReceipts = (): Receipt[] => ROWS.map(([storeName, category, subcategory, totalAmount, tax, ago, paymentMethod, lines], i) => {
  const base: Receipt = {
    id: `${DEMO_PREFIX}${i + 1}`, imageName: '', storeName, purchaseDate: daysAgo(ago), totalAmount, category, subcategory, paymentMethod,
  };
  if (lines) base.items = lines.map(([name, qty, unitPrice]): ReceiptItem => ({ name, qty, unitPrice, amount: round2(qty * unitPrice) }));
  if (tax === 'z') return { ...base, subtotal: totalAmount, hstAmount: 0, hstPercent: 0 };
  if (tax === 'r') return base;
  const subtotal = round2(totalAmount / 1.13);
  return { ...base, subtotal, hstAmount: round2(totalAmount - subtotal), hstPercent: 13 };
});
