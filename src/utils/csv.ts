import type { ReceiptTax } from './tax.ts';
import { formatCents, toCents } from './tax.ts';

const escapeCSV = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  let str = String(val);
  // A cell that starts with = + - @ would be run as a formula by Excel, so it gets a leading apostrophe.
  if (/^[=+\-@]/.test(str) && !/^-?\d+(\.\d+)?$/.test(str)) str = `'${str}`;
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const money = (cents: number) => (cents / 100).toFixed(2);

export const CSV_HEADERS = [
  'Date', 'Store', 'Category', 'Subcategory', 'Subtotal', 'Tax rate %', 'HST/Tax', 'Total', 'Tax status', 'Payment method', 'Notes', 'Receipt ID',
];

const STATUS_LABEL = { taxed: 'Taxed', noTax: 'No tax', needsReview: 'Needs review' } as const;

/** One row per receipt, readable in Excel or Numbers. A receipt whose tax was not read leaves the tax cell empty instead of showing $0.00. */
export function buildCsv(rows: ReceiptTax[]): string {
  const lines = rows.map(t => {
    const r = t.receipt;
    const total = toCents(r.totalAmount);
    const hasTax = t.status !== 'needsReview';
    const subtotal = r.subtotal != null && r.subtotal > 0 ? toCents(r.subtotal) : total - t.hstCents;
    return [
      localDay(r.purchaseDate), r.storeName, r.category, r.subcategory ?? '',
      hasTax ? money(subtotal) : '',
      hasTax && t.percent != null ? t.percent : '',
      hasTax ? money(t.hstCents) : '',
      money(total), STATUS_LABEL[t.status], r.paymentMethod ?? '', r.notes ?? '', r.id,
    ].map(escapeCSV).join(',');
  });
  // The leading BOM makes Excel read accents and curly quotes correctly.
  return `﻿${[CSV_HEADERS.join(','), ...lines].join('\r\n')}\r\n`;
}

export { formatCents };
