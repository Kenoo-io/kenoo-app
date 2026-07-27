import path from "path";
import {
  buildInvoicePrintHtml,
  formatDealNameForFile,
  formatIsoDate,
  getInvoicePdfFileName,
  INVOICE_PRINT_LOGO_URL,
  lineTotalCents,
  type NormalizedInvoicePrintLine,
} from "@/components/agentCRM/agentDeals/tabs/invoiceTab/invoice-print-document-html";

export type InvoicePdfLineItemInput = {
  title?: string;
  description?: string | null;
  quantity?: number;
  unit_price_cents?: number;
  total_cents?: number;
  tax_rate_bps?: number;
  tax_name?: string | null;
};

export type InvoicePdfDeliverableInput = {
  name?: string;
  description?: string | null;
  quantity?: number;
  unit_price_cents?: number;
  currency?: string;
};

export type InvoicePdfRequestPayload = {
  dealName?: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  currency?: string;
  netTerm?: number;
  totalAmountCents?: number;
  vendor?: {
    legal_name?: string;
    address?: string;
    city?: string;
    state?: string;
    post_code?: string;
    country?: string;
    vendor_email?: string;
  };
  lineItems?: InvoicePdfLineItemInput[];
  deliverables?: InvoicePdfDeliverableInput[];
};

async function fetchInvoiceLogoAsDataUrl(): Promise<string | null> {
  try {
    const res = await fetch(INVOICE_PRINT_LOGO_URL, {
      headers: { Accept: "image/*" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${base64}`;
  } catch (e) {
    console.warn("Invoice PDF: could not inline logo, using remote URL fallback.", e);
    return null;
  }
}

function ensurePlaywrightBrowsersPathForPdf(): void {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH != null && String(process.env.PLAYWRIGHT_BROWSERS_PATH).trim() !== "") {
    return;
  }
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.cwd(), ".playwright-browsers");
}

function isServerlessPdfRuntime(): boolean {
  // Do not key off AWS_REGION — it is often set locally for SES/S3 clients and is not Lambda-specific.
  return process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME != null;
}

async function launchLocalPdfBrowser() {
  ensurePlaywrightBrowsersPathForPdf();
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}

async function launchServerlessPdfBrowser() {
  const [{ chromium }, { default: sparticuzChromium }] = await Promise.all([
    import("playwright"),
    import("@sparticuz/chromium"),
  ]);
  const executablePath = await sparticuzChromium.executablePath();
  return chromium.launch({
    args: sparticuzChromium.args,
    executablePath,
    headless: true,
  });
}

async function launchPdfBrowser() {
  if (isServerlessPdfRuntime()) {
    return launchServerlessPdfBrowser();
  }
  return launchLocalPdfBrowser();
}

function normalizeLines(payload: InvoicePdfRequestPayload): NormalizedInvoicePrintLine[] {
  const invCurrency = (payload.currency ?? "USD").trim().toUpperCase() || "USD";
  const rows = payload.lineItems ?? [];
  if (rows.length > 0) {
    return rows.map((r) => ({
      title: (r.title ?? "").trim() || "—",
      description: r.description ?? null,
      quantity: Number(r.quantity) || 0,
      unit_price_cents: Number(r.unit_price_cents) || 0,
      total_cents:
        r.total_cents != null && !Number.isNaN(Number(r.total_cents))
          ? Number(r.total_cents)
          : lineTotalCents(Number(r.quantity) || 0, Number(r.unit_price_cents) || 0),
      currency: invCurrency,
      tax_rate_bps: Math.max(0, Math.round(Number(r.tax_rate_bps) || 0)),
      tax_name: r.tax_name != null && String(r.tax_name).trim() ? String(r.tax_name).trim() : null,
    }));
  }
  return (payload.deliverables ?? []).map((d) => {
    const qty = Number(d.quantity) || 0;
    const unit = Number(d.unit_price_cents) || 0;
    return {
      title: (d.name ?? "").trim() || "—",
      description: d.description ?? null,
      quantity: qty,
      unit_price_cents: unit,
      total_cents: lineTotalCents(qty, unit),
      currency: (d.currency ?? invCurrency).trim().toUpperCase() || invCurrency,
    };
  });
}

function subtotalFromLines(lines: NormalizedInvoicePrintLine[], fallbackTotalCents: number | undefined): number {
  if (lines.length > 0) {
    return lines.reduce((sum, row) => {
      const t =
        row.total_cents != null && !Number.isNaN(Number(row.total_cents))
          ? Number(row.total_cents)
          : lineTotalCents(row.quantity, row.unit_price_cents);
      return sum + t;
    }, 0);
  }
  const t = fallbackTotalCents;
  if (t != null && !Number.isNaN(Number(t))) return Math.round(Number(t));
  return 0;
}

function billToLinesFromVendor(v: InvoicePdfRequestPayload["vendor"]): string[] {
  const lines: string[] = [];
  if (!v) return ["—"];
  if (v.legal_name?.trim()) lines.push(v.legal_name.trim());
  if (v.address?.trim()) lines.push(v.address.trim());
  const cityLine = [v.city, v.state, v.post_code]
    .filter(Boolean)
    .map((s) => String(s).trim())
    .join(", ");
  if (cityLine) lines.push(cityLine);
  if (v.country?.trim()) lines.push(v.country.trim());
  return lines.length ? lines : ["—"];
}

export type InvoicePdfJsonResponse = {
  name: string;
  type: string;
  data: number[];
};

/**
 * Builds the same JSON shape as POST `/api/invoice/pdf` (byte array for client download).
 */
export async function generateInvoicePdfJson(payload: InvoicePdfRequestPayload): Promise<InvoicePdfJsonResponse> {
  const currency = (payload.currency ?? "USD").trim().toUpperCase() || "USD";
  const lines = normalizeLines(payload);
  const subtotalCents = subtotalFromLines(lines, payload.totalAmountCents);

  const invNumber = (payload.invoiceNumber ?? "").trim() || "—";
  const issueDisplay = formatIsoDate(payload.issueDate) ?? "—";
  const dueDisplay = formatIsoDate(payload.dueDate) ?? "—";
  const netTermStr =
    payload.netTerm != null && !Number.isNaN(Number(payload.netTerm)) ? `Net ${payload.netTerm}` : "—";

  const billToLines = billToLinesFromVendor(payload.vendor);
  const dealName = (payload.dealName ?? "").trim();
  const vendorEmail = payload.vendor?.vendor_email?.trim() ?? null;

  const logoDataUrl = await fetchInvoiceLogoAsDataUrl();

  const html = buildInvoicePrintHtml(
    billToLines,
    dealName,
    lines,
    subtotalCents,
    currency,
    invNumber,
    issueDisplay,
    dueDisplay,
    logoDataUrl,
    netTermStr,
    vendorEmail,
    formatDealNameForFile(dealName),
    false
  );

  const browser = await launchPdfBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    try {
      await page.locator('img[alt="WALLS Logo"]').first().evaluate((el: HTMLImageElement) => {
        if (el.complete && el.naturalWidth > 0) return;
        return new Promise<void>((resolve, reject) => {
          el.onload = () => resolve();
          el.onerror = () => reject(new Error("Logo failed to load"));
        });
      });
    } catch {
      /* Remote logo URL may be blocked in PDF context; PDF still generates */
    }
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    await page.close();
    const fileName = getInvoicePdfFileName(dealName);
    return {
      name: fileName,
      type: "application/pdf",
      data: Array.from(pdfBytes),
    };
  } finally {
    await browser.close();
  }
}
