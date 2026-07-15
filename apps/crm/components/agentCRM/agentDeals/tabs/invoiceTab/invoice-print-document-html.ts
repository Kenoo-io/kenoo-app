/**
 * Single source of truth for the invoice **print / PDF** HTML (same layout as the
 * browser print window used by Download). Used by `invoice-preview` and `/api/invoice/pdf`.
 */

import {
  getPaymentInstructionsForCurrency,
  paymentInstructionsToPrintHtml,
} from "./invoice-payment-instructions";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type NormalizedInvoicePrintLine = {
  title: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  currency: string;
  /** Basis points (e.g. 500 = 5%). Used only for invoice totals, not per-line display. */
  tax_rate_bps?: number;
  tax_name?: string | null;
};

export function formatMoney(cents: number, currency: string = "USD"): string {
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Narrow symbol only (e.g. `$` for CAD in en-US). Pair with a separate ISO suffix when needed. */
export function formatMoneyNarrowSymbol(cents: number, currency: string = "USD"): string {
  const cur = (currency || "USD").trim().toUpperCase();
  const amount = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: cur,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** When the amount is followed by an ISO code (e.g. sidebar total), avoid `CA$… CAD` / `A$… AUD` from en-US disambiguation symbols. */
export function formatMoneyWithIsoSuffix(cents: number, currency: string = "USD"): string {
  const cur = (currency || "USD").trim().toUpperCase();
  return `${formatMoneyNarrowSymbol(cents, cur)} ${cur}`;
}

export function lineTotalCents(qty: number, unitCents: number): number {
  return Math.round((Number(qty) || 0) * (Number(unitCents) || 0));
}

export function lineTaxCentsFromPrintLine(d: NormalizedInvoicePrintLine): number {
  const qty = Number(d.quantity) || 0;
  const unitCents = Number(d.unit_price_cents) || 0;
  const subtotal =
    d.total_cents != null && !Number.isNaN(Number(d.total_cents))
      ? Number(d.total_cents)
      : lineTotalCents(qty, unitCents);
  const bps = Math.max(0, Number(d.tax_rate_bps) || 0);
  return Math.round((subtotal * bps) / 10000);
}

export function totalTaxCentsFromPrintLines(lines: NormalizedInvoicePrintLine[]): number {
  return lines.reduce((sum, d) => sum + lineTaxCentsFromPrintLine(d), 0);
}

export function taxTotalsLabelFromPrintLines(lines: NormalizedInvoicePrintLine[]): string {
  const withTax = lines.find((d) => (Number(d.tax_rate_bps) || 0) > 0);
  if (!withTax) return "Tax";
  const name = withTax.tax_name != null ? String(withTax.tax_name).trim() : "";
  const bps = Number(withTax.tax_rate_bps) || 0;
  const pct = (bps / 100).toFixed(2).replace(/\.00$/, "");
  if (name) return `Tax (${name} ${pct}%)`;
  return `Tax (${pct}%)`;
}

/** Same basis as `taxTotalsLabelFromPrintLines`, for compact labels e.g. `Total + 5% GST`. */
export function taxSummaryFragmentFromPrintLines(lines: NormalizedInvoicePrintLine[]): string | null {
  const withTax = lines.find((d) => (Number(d.tax_rate_bps) || 0) > 0);
  if (!withTax) return null;
  const name = withTax.tax_name != null ? String(withTax.tax_name).trim() : "";
  const bps = Number(withTax.tax_rate_bps) || 0;
  const pct = (bps / 100).toFixed(2).replace(/\.00$/, "");
  if (name) return `${pct}% ${name}`;
  return `${pct}%`;
}

export function formatIsoDate(iso?: string | null): string | undefined {
  if (iso == null || String(iso).trim() === "") return undefined;
  const s = String(iso).trim();
  const d = new Date(s.length <= 10 ? `${s}T12:00:00` : s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export const INVOICE_PRINT_STYLES = `
  @page { size: A4; margin: 28px; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; background: #fff; padding: 32px 20px 40px; font-size: 13px; }
  .container { max-width: 720px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 52px; }
  .brand { max-width: 50%; }
  .brand img { width: 76px; height: auto; margin-bottom: 12px; display: block; }
  .brand small { display: block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #777; margin-bottom: 5px; }
  .brand p { margin: 1px 0; font-size: 12px; color: #555; }
  .meta { text-align: right; padding-top: 14px; }
  .meta h2 { margin: 0 0 8px 0; font-size: 28px; font-weight: 600; letter-spacing: 2px; }
  .meta p { margin: 3px 0; font-size: 12px; color: #555; }
  .billing { display: flex; justify-content: space-between; margin-bottom: 38px; }
  .block h3 { display: block; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #777; margin-bottom: 5px; }
  .block p { margin: 1px 0; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
  thead th { text-align: left; font-size: 10px; color: #777; padding-bottom: 8px; border-bottom: 1px solid #ddd; text-transform: uppercase; letter-spacing: 0.04em; }
  thead th.right { text-align: right; }
  tbody td { padding: 11px 0; border-bottom: 1px solid #eee; font-size: 12px; }
  tbody td.right { text-align: right; }
  tbody td .line-item-desc { font-size: 10px; color: #888; margin-top: 2px; }
  .totals { width: 260px; margin-left: auto; }
  .totals-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px; }
  .totals-row.total { font-size: 17px; font-weight: 600; margin-top: 12px; border-top: 2px solid #111; padding-top: 10px; }
  .payment { margin-top: 44px; padding-top: 16px; border-top: 1px solid #ddd; }
  .payment h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #777; margin-bottom: 10px; }
  .payment p { margin: 3px 0; font-size: 12px; }
  .footer { margin-top: 56px; font-size: 10px; color: #888; text-align: center; }
`;

export const INVOICE_PRINT_LOGO_URL = "https://assets.wallsentertainment.com/logo-variations/black-logo.png";

export function formatDealNameForFile(dealName: string): string {
  const base = (dealName ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return base || "invoice";
}

export type InvoicePrintClientPdfMode = "download" | "postMessage";

/**
 * Full HTML document for the invoice print template.
 * @param clientPdf - `false` = static document for Playwright `page.pdf()` (text-selectable PDF).
 *                     `"download"` / `"postMessage"` = include legacy html2canvas + jsPDF script (browser only).
 */
export function buildInvoicePrintHtml(
  billToLines: string[],
  dealName: string,
  lines: NormalizedInvoicePrintLine[],
  subtotalCents: number,
  currency: string,
  invoiceNumber: string,
  issueDate: string,
  dueDate: string,
  logoDataUrl: string | null | undefined,
  netTerm: string | null | undefined,
  vendorEmail: string | null | undefined,
  pdfFileName: string | undefined,
  clientPdf: false | InvoicePrintClientPdfMode
): string {
  const baseName = pdfFileName ?? formatDealNameForFile(dealName);
  const safePdfName = (baseName === "invoice" ? "invoice" : baseName + "_invoice") + ".pdf";
  const safePdfNameForJs = safePdfName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const logoSrc = logoDataUrl || INVOICE_PRINT_LOGO_URL;
  const rows = lines.length
    ? lines
        .map((d) => {
          const qty = Number(d.quantity) || 0;
          const unitCents = Number(d.unit_price_cents) || 0;
          const amountCents =
            d.total_cents != null && !Number.isNaN(Number(d.total_cents))
              ? Number(d.total_cents)
              : lineTotalCents(qty, unitCents);
          const descHtml =
            d.description && String(d.description).trim()
              ? `<div class="line-item-desc">${escapeHtml(String(d.description).trim())}</div>`
              : "";
          return `<tr>
            <td><div>${escapeHtml(d.title || "—")}</div>${descHtml}</td>
            <td class="right">${qty}</td>
            <td class="right">${escapeHtml(formatMoney(unitCents, d.currency))}</td>
            <td class="right">${escapeHtml(formatMoney(amountCents, d.currency))}</td>
          </tr>`;
        })
        .join("")
    : `<tr><td colspan="4" class="right" style="color:#777">No line items</td></tr>`;

  const billToHtml =
    billToLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("") +
    (vendorEmail && String(vendorEmail).trim()
      ? `<p><a href="mailto:${escapeHtml(String(vendorEmail).trim())}" style="color:#6eadc0;text-decoration:none;">${escapeHtml(String(vendorEmail).trim())}</a></p>`
      : "");

  const paymentInnerHtml = paymentInstructionsToPrintHtml(getPaymentInstructionsForCurrency(currency));

  const taxCents = totalTaxCentsFromPrintLines(lines);
  const taxLabel = taxTotalsLabelFromPrintLines(lines);
  const grandTotalCents = subtotalCents + taxCents;
  const taxRegistrationHtml =
    taxCents > 0
      ? `<div style="margin-bottom:8px;">GST/HST Registration No.: 772171302RT0001</div>`
      : "";

  const body = `
  <div class="container">
    <div class="header">
      <div class="brand">
        <img src="${logoSrc}" alt="WALLS Logo" width="76" height="24" />
        <small>Registered Office</small>
        <p>67 Walden Road SE</p>
        <p>Calgary, AB, T2X 0N6</p>
        <p>Canada</p>
        <p><a href="mailto:ar@wallsentertainment.com" style="color:#6eadc0;text-decoration:none;">ar@wallsentertainment.com</a></p>
      </div>
      <div class="meta">
        <h2>INVOICE</h2>
        <p><strong>${escapeHtml(invoiceNumber)}</strong></p>
        <p>Issue Date: ${escapeHtml(issueDate)}</p>
        <p>Due Date: ${escapeHtml(dueDate)}</p>
        <p>NET Term: ${escapeHtml(netTerm ?? "—")}</p>
      </div>
    </div>
    <div class="billing">
      <div class="block">
        <h3>Bill To</h3>
        ${billToHtml}
      </div>
      <div class="block">
        <h3>Project</h3>
        <p>${escapeHtml(dealName || "—")}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="right">Qty</th>
          <th class="right">Unit Price</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>Subtotal</span><span>${escapeHtml(formatMoney(subtotalCents, currency))}</span></div>
      <div class="totals-row"><span>${escapeHtml(taxLabel)}</span><span>${escapeHtml(formatMoney(taxCents, currency))}</span></div>
      <div class="totals-row total"><span>Total</span><span>${escapeHtml(formatMoney(grandTotalCents, currency))} ${escapeHtml(currency)}</span></div>
    </div>
    <div class="payment">
      <h3>Payment Instructions (${escapeHtml(currency)})</h3>
      ${paymentInnerHtml}
    </div>
    <div class="footer">${taxRegistrationHtml}WALLS Entertainment Group Inc.</div>
  </div>`;

  if (clientPdf === false) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice</title>
  <style>${INVOICE_PRINT_STYLES}</style>
</head>
<body>
${body}
</body>
</html>`;
  }

  const outputModeForJs = clientPdf;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice</title>
  <style>${INVOICE_PRINT_STYLES}</style>
</head>
<body>
${body}
  <script>
  (function() {
    function loadScript(src) {
      return new Promise(function(resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
    Promise.all([
      loadScript('https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'),
      loadScript('https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js')
    ]).then(function() {
      return html2canvas(document.body, { scale: 3, useCORS: true, logging: false });
    }).then(function(canvas) {
      var imgData = canvas.toDataURL('image/jpeg', 0.95);
      var imgW = canvas.width;
      var imgH = canvas.height;
      var pdf = new jspdf.jsPDF('p', 'mm', 'a4');
      var pdfPageW = 210;
      var pdfPageH = 297;
      var isAttachmentMode = '${outputModeForJs}' === 'postMessage';
      var visualScale = 1.4;
      var pdfImgW = pdfPageW * visualScale;
      var pdfImgH = imgH * (pdfImgW / imgW);
      var offsetX = (pdfPageW - pdfImgW) / 2;
      var pageEpsilon = 0.5;

      if (isAttachmentMode && pdfImgH > pdfPageH) {
        var fitRatio = pdfPageH / pdfImgH;
        pdfImgW = pdfImgW * fitRatio;
        pdfImgH = pdfPageH;
        offsetX = (pdfPageW - pdfImgW) / 2;
      }

      var numPages = isAttachmentMode
        ? 1
        : Math.max(1, Math.ceil((pdfImgH - pageEpsilon) / pdfPageH));
      for (var i = 0; i < numPages; i++) {
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', offsetX, -i * pdfPageH, pdfImgW, pdfImgH);
      }
      var targetWindow = window.opener || (window.parent !== window ? window.parent : null);
      if ('${outputModeForJs}' === 'postMessage' && targetWindow) {
        try {
          var dataUri = pdf.output('datauristring');
          targetWindow.postMessage({ type: 'invoice-pdf-ready', name: '${safePdfNameForJs}', dataUrl: dataUri }, '*');
        } catch (err) {
          targetWindow.postMessage({ type: 'invoice-pdf-error' }, '*');
        }
      } else {
        pdf.save('${safePdfNameForJs}');
      }
      window.close();
    }).catch(function(err) {
      console.error(err);
      var errorTarget = window.opener || (window.parent !== window ? window.parent : null);
      if ('${outputModeForJs}' === 'postMessage' && errorTarget) {
        try { errorTarget.postMessage({ type: 'invoice-pdf-error' }, '*'); } catch (e) {}
      }
      window.close();
    });
  })();
  <\/script>
</body>
</html>`;
}

export function getInvoicePdfFileName(dealName: string): string {
  const baseName = formatDealNameForFile(dealName);
  return (baseName === "invoice" ? "invoice" : baseName + "_invoice") + ".pdf";
}
