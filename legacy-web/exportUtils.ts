
import { Receipt, ReceiptItem } from './types';
import { normalizeStoreName } from './constants';

// --- Types ---
type ExportFormat = 'csv' | 'json';

// --- Helpers ---
const escapeCSV = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const formatDateISO = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

// --- CSV Builder ---
export const generateCSV = (receipts: Receipt[]): string => {
  // 1. Define Headers (Accountable-ready + Receiptfy specifics)
  const headers = [
    'id',
    'storeName',
    'purchaseDate',
    'category',
    'subcategory',
    'currency',
    'subtotal',
    'taxPercent',
    'taxAmount',
    'totalAmount',
    'paymentMethod',
    'notes',
    'lineItems', // JSON string
    'brand' // Normalized brand key
  ];

  // 2. Build Rows
  const rows = receipts.map(r => {
    // Logic for missing fields
    const safeTaxAmount = r.hstAmount || 0;
    const safeTotal = r.totalAmount || 0;
    const safeSubtotal = r.subtotal || (safeTotal - safeTaxAmount);
    
    // Mask payment method if present (basic heuristic)
    let safePayment = r.paymentMethod || '';
    if (safePayment.length > 4 && /\d/.test(safePayment)) {
        // If it looks like "VISA 1234", keep last 4
        const last4 = safePayment.slice(-4);
        // If it has a brand name, keep it
        const brand = safePayment.replace(/\d/g, '').replace(/\*/g, '').trim();
        safePayment = `${brand} ••${last4}`.trim();
    }

    // Compact JSON for line items
    const lineItemsJson = r.items ? JSON.stringify(r.items.map(i => ({
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        lineTotal: i.amount
    }))) : '[]';

    return [
      r.id,
      r.storeName,
      formatDateISO(r.purchaseDate),
      r.category,
      r.subcategory || 'Uncategorized',
      r.currency || 'CAD',
      safeSubtotal.toFixed(2),
      r.hstPercent || '', // Empty if unknown, don't assume 0
      safeTaxAmount.toFixed(2),
      safeTotal.toFixed(2),
      safePayment,
      r.notes || '',
      lineItemsJson.replace(/"/g, '""'), // Special escaping for JSON inside CSV
      normalizeStoreName(r.storeName)
    ].map(escapeCSV).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

// --- Download Triggers ---
export const downloadFile = (content: string, filename: string, type: 'text/csv' | 'application/json') => {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const shareText = async (text: string, title: string) => {
    if (navigator.share) {
        try {
            await navigator.share({
                title,
                text,
            });
        } catch (err) {
            console.error('Share failed', err);
        }
    } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard');
    }
};

export const generateReceiptSummary = (r: Receipt): string => {
    const date = r.purchaseDate.toLocaleDateString();
    return `Receipt: ${r.storeName}\nDate: ${date}\nTotal: $${r.totalAmount.toFixed(2)}\nCategory: ${r.category}`;
};
