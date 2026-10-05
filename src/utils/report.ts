import type { ReceiptTax } from './tax.ts';
import { formatCents, toCents } from './tax.ts';

const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const day = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });

export interface ReportOptions {
  title: string;
  /** e.g. "Jan 1, 2026 to Dec 31, 2026" */
  periodLabel: string;
  preparedFor?: string;
  lineItems: boolean;
  /** Receipt id → data URI of the original photo. */
  images?: Record<string, string>;
}

const sumBy = (rows: ReceiptTax[], key: (t: ReceiptTax) => string) => {
  const map = new Map<string, { count: number; spend: number; hst: number }>();
  for (const t of rows) {
    const e = map.get(key(t)) ?? { count: 0, spend: 0, hst: 0 };
    e.count += 1; e.spend += toCents(t.receipt.totalAmount); e.hst += t.hstCents;
    map.set(key(t), e);
  }
  return [...map.entries()];
};

/** HTML for the accountant's PDF: totals, HST by category and by month, then every receipt. */
export function buildReportHtml(rows: ReceiptTax[], o: ReportOptions): string {
  const sorted = [...rows].sort((a, b) => new Date(a.receipt.purchaseDate).getTime() - new Date(b.receipt.purchaseDate).getTime());
  const spend = sorted.reduce((s, t) => s + toCents(t.receipt.totalAmount), 0);
  const hst = sorted.reduce((s, t) => s + t.hstCents, 0);
  const review = sorted.filter(t => t.status === 'needsReview').length;
  const byCat = sumBy(sorted, t => t.receipt.category).sort((a, b) => b[1].hst - a[1].hst);
  const byMonth = sumBy(sorted, t => new Date(t.receipt.purchaseDate).toLocaleDateString('en-CA', { year: 'numeric', month: 'long' }));
  const group = (title: string, list: [string, { count: number; spend: number; hst: number }][]) => `
    <h2>${title}</h2>
    <table><thead><tr><th>${title.replace('HST by ', '')}</th><th class="n">Receipts</th><th class="n">Spent</th><th class="n">HST</th></tr></thead><tbody>
    ${list.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${v.count}</td><td class="n">${formatCents(v.spend)}</td><td class="n">${formatCents(v.hst)}</td></tr>`).join('')}
    </tbody></table>`;
  const hstCell = (t: ReceiptTax) => (t.status === 'needsReview' ? 'To review' : formatCents(t.hstCents));
  const reviewRows = sorted.filter(t => t.status === 'needsReview');
  const reviewTable = reviewRows.length ? `
    <h2>Receipts to review</h2>
    <table><thead><tr><th>Date</th><th>Store</th><th class="n">Total</th><th class="n">HST if ${reviewRows.length === 1 ? 'it was' : 'they were'} taxed</th></tr></thead><tbody>
    ${reviewRows.map(t => `<tr><td>${day(t.receipt.purchaseDate)}</td><td>${esc(t.receipt.storeName)}</td><td class="n">${formatCents(toCents(t.receipt.totalAmount))}</td><td class="n">${t.suggestedHstCents != null ? `about ${formatCents(t.suggestedHstCents)}` : ''}</td></tr>`).join('')}
    </tbody></table>
    <p class="muted">These receipts have no tax amount yet, so they are not in the HST total above. The last column is only an estimate.</p>` : '';
  const photos = sorted.filter(t => o.images?.[t.receipt.id]);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(o.title)}</title><style>
    body{font-family:-apple-system,Helvetica,Arial,sans-serif;color:#111113;font-size:11px;margin:28px}
    h1{font-size:22px;margin:0 0 2px} h2{font-size:14px;margin:22px 0 6px} .muted{color:#6C6C70}
    .totals{display:flex;gap:28px;margin:14px 0 4px} .totals b{display:block;font-size:20px} .hst{color:#B35C00}
    table{width:100%;border-collapse:collapse} th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #E0E0E5;vertical-align:top}
    th{font-size:10px;text-transform:uppercase;color:#6C6C70} .n{text-align:right;font-variant-numeric:tabular-nums} .items{color:#6C6C70}
    .photo{page-break-before:always} .photo img{max-width:100%;max-height:880px}
  </style></head><body>
    <h1>${esc(o.title)}</h1>
    <div class="muted">${esc(o.periodLabel)}${o.preparedFor ? ` · ${esc(o.preparedFor)}` : ''}</div>
    <div class="totals">
      <div><span class="muted">Total HST paid</span><b class="hst">${formatCents(hst)}</b></div>
      <div><span class="muted">Total spent</span><b>${formatCents(spend)}</b></div>
      <div><span class="muted">Receipts</span><b>${sorted.length}</b></div>
    </div>
    ${review ? `<div class="hst">${review} ${review === 1 ? 'receipt has' : 'receipts have'} no tax amount yet and ${review === 1 ? 'is' : 'are'} not in the HST total.</div>` : ''}
    ${group('HST by category', byCat)}
    ${group('HST by month', byMonth)}
    ${reviewTable}
    <h2>Receipts</h2>
    <table><thead><tr><th>Date</th><th>Store</th><th>Category</th><th class="n">Subtotal</th><th class="n">HST</th><th class="n">Total</th></tr></thead><tbody>
    ${sorted.map(t => {
      const r = t.receipt;
      const total = toCents(r.totalAmount);
      const items = o.lineItems && r.items?.length
        ? `<div class="items">${r.items.map(i => `${i.qty > 1 ? `${i.qty} × ` : ''}${esc(i.name)} ${formatCents(toCents(i.amount))}`).join('<br>')}</div>` : '';
      return `<tr><td>${day(r.purchaseDate)}</td><td>${esc(r.storeName)}${items}${r.notes ? `<div class="items">Note: ${esc(r.notes)}</div>` : ''}</td>
        <td>${esc(r.category)}${r.subcategory ? ` / ${esc(r.subcategory)}` : ''}</td>
        <td class="n">${formatCents(total - t.hstCents)}</td><td class="n">${hstCell(t)}</td><td class="n">${formatCents(total)}</td></tr>`;
    }).join('')}
    </tbody></table>
    <p class="muted">Totals come from the tax read on each receipt. Check with your accountant before filing.</p>
    ${photos.map(t => `<div class="photo"><h2>${esc(t.receipt.storeName)} · ${day(t.receipt.purchaseDate)} · ${formatCents(toCents(t.receipt.totalAmount))}</h2><img src="${o.images![t.receipt.id]}"></div>`).join('')}
  </body></html>`;
}
