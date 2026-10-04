import type { Receipt } from '../types';

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
};

/** Sample receipts so a fresh prototype install has something to show. */
export const buildDemoReceipts = (): Receipt[] => [
  {
    id: 'demo_1', imageName: '', storeName: 'Tim Hortons', purchaseDate: daysAgo(0), totalAmount: 8.45,
    subtotal: 7.48, hstAmount: 0.97, hstPercent: 13, category: 'Restaurant', subcategory: 'Cafe',
    items: [
      { name: 'Large Double Double', qty: 1, unitPrice: 2.15, amount: 2.15 },
      { name: 'Boston Cream', qty: 2, unitPrice: 1.59, amount: 3.18 },
      { name: 'Everything Bagel', qty: 1, unitPrice: 2.15, amount: 2.15 },
    ],
  },
  { id: 'demo_2', imageName: '', storeName: 'Loblaws', purchaseDate: daysAgo(1), totalAmount: 89.5, hstAmount: 0, category: 'Groceries', subcategory: 'Food Retail' },
  {
    id: 'demo_3', imageName: '', storeName: 'Best Buy', purchaseDate: daysAgo(2), totalAmount: 249.99, subtotal: 221.23,
    hstAmount: 28.76, hstPercent: 13, category: 'Electronics', subcategory: 'Gadgets', paymentMethod: 'VISA •••• 4242',
    items: [{ name: 'Sony Headphones', qty: 1, unitPrice: 221.23, amount: 221.23 }], notes: 'Noise cancelling headphones.',
    returnBy: daysAgo(2 - 30),
  },
  {
    id: 'demo_4', imageName: '', storeName: 'Dollarama', purchaseDate: daysAgo(3), totalAmount: 14.5, hstAmount: 1.89,
    category: 'Household', subcategory: 'Supplies', returnBy: daysAgo(3 - 7),
    items: [{ name: 'Cleaning Wipes', qty: 2, unitPrice: 4, amount: 8 }, { name: 'Notebook', qty: 1, unitPrice: 3.5, amount: 3.5 }],
  },
  { id: 'demo_5', imageName: '', storeName: 'Costco', purchaseDate: daysAgo(4), totalAmount: 215.97, category: 'Groceries', subcategory: 'Food Retail' },
  {
    id: 'demo_6', imageName: '', storeName: 'Farm Boy', purchaseDate: daysAgo(5), totalAmount: 54.5, hstAmount: 0,
    category: 'Groceries', subcategory: 'Produce', notes: 'Weekly fresh produce.',
  },
  { id: 'demo_7', imageName: '', storeName: 'No Frills', purchaseDate: daysAgo(6), totalAmount: 42.15, category: 'Groceries', subcategory: 'Food Retail' },
  {
    id: 'demo_8', imageName: '', storeName: 'Uber', purchaseDate: daysAgo(8), totalAmount: 24.9, hstAmount: 3.24,
    category: 'Transport', subcategory: 'Rideshare', notes: 'Ride home from airport.',
  },
  { id: 'demo_9', imageName: '', storeName: 'Esso', purchaseDate: daysAgo(12), totalAmount: 65, category: 'Gas/Fuel', subcategory: 'Gasoline' },
  { id: 'demo_10', imageName: '', storeName: 'Walmart', purchaseDate: daysAgo(15), totalAmount: 142.2, category: 'Groceries', subcategory: 'Food Retail' },
  { id: 'demo_11', imageName: '', storeName: 'Netflix', purchaseDate: daysAgo(20), totalAmount: 16.99, category: 'Entertainment', subcategory: 'Movies' },
];
