import type { ReceiptItem } from '../types';

export interface OcrResult {
  storeName: string;
  purchaseDate: string; // ISO
  totalAmount: number;
  subtotal?: number;
  hstAmount?: number;
  hstPercent?: number;
  items: ReceiptItem[];
  category: string;
  subcategory?: string;
  /** 0–1: how sure the reader is about the key values. */
  confidence: number;
}

/**
 * Turns a receipt photo into structured data. The app only depends on this
 * interface; the production version should call your server, which calls the
 * OCR / LLM provider, so no API key ships inside the app.
 */
export interface OcrService {
  scanReceipt(imageUri: string): Promise<OcrResult>;
}

export class OcrError extends Error {}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Rotates through realistic cases so every result state can be demoed:
// a clean read, a gas receipt whose tax is included but not printed, and a
// receipt whose numbers don't add up.
const SAMPLES: Omit<OcrResult, 'purchaseDate'>[] = [
  {
    storeName: 'Tim Hortons', totalAmount: 8.45, subtotal: 7.48, hstAmount: 0.97, hstPercent: 13,
    category: 'Restaurant', subcategory: 'Cafe', confidence: 0.94,
    items: [
      { name: 'Large Double Double', qty: 1, unitPrice: 2.15, amount: 2.15 },
      { name: 'Boston Cream', qty: 2, unitPrice: 1.59, amount: 3.18 },
      { name: 'Everything Bagel', qty: 1, unitPrice: 2.15, amount: 2.15 },
    ],
  },
  {
    storeName: 'Esso', totalAmount: 65.0, category: 'Gas/Fuel', subcategory: 'Gasoline', confidence: 0.81,
    items: [{ name: 'Regular 87 · 50 L', qty: 1, unitPrice: 65.0, amount: 65.0 }],
  },
  {
    storeName: 'Canadian Tire', totalAmount: 45.19, subtotal: 39.99, hstAmount: 4.52, hstPercent: 13,
    category: 'Household', subcategory: 'Supplies', confidence: 0.72,
    items: [{ name: 'Storage Bins (3)', qty: 1, unitPrice: 39.99, amount: 39.99 }],
  },
];
let next = 0;

const mockOcrService: OcrService = {
  async scanReceipt() {
    await delay(1800);
    const sample = SAMPLES[next % SAMPLES.length];
    next += 1;
    return { ...sample, items: sample.items.map(i => ({ ...i })), purchaseDate: new Date().toISOString() };
  },
};

// TODO(ocr): replace with a client for your OCR endpoint.
export const ocr: OcrService = mockOcrService;
