/** Bank / Wise payment copy for invoice preview & PDF, keyed by invoice currency (ISO 4217). */

export type PaymentInstructionRow = {
  /** When empty, `value` is shown as a plain line (e.g. address under Bank). */
  label: string;
  value: string;
};

export type PaymentInstructions = {
  rows: PaymentInstructionRow[];
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function normalizeInvoiceCurrency(currency: string | undefined | null): string {
  const c = String(currency ?? "USD").trim().toUpperCase().slice(0, 3);
  return c || "USD";
}

const USD_INSTRUCTIONS: PaymentInstructions = {
  rows: [
    { label: "Account Name", value: "WALLS Entertainment Group Inc." },
    { label: "Account Number", value: "8314615168" },
    { label: "Account Type", value: "Checking (Domestic US transfers)" },
    { label: "Routing Number (Wire & ACH)", value: "026073150" },
    { label: "SWIFT/BIC", value: "CMFGUS33 (International transfers)" },
    { label: "Bank", value: "Community Federal Savings Bank" },
    { label: "", value: "89-16 Jamaica Ave, Woodhaven, NY, 11421, United States" },
  ],
};

const AUD_INSTRUCTIONS: PaymentInstructions = {
  rows: [
    { label: "Name", value: "WALLS Entertainment Group Inc." },
    { label: "Account number", value: "226429351" },
    { label: "BSB code", value: "774-001" },
    { label: "Swift/BIC", value: "TRWIAUS1XXX" },
    {
      label: "Bank name and address",
      value: "Wise Australia Pty Ltd, Suite 1, Level 11, 66 Goulburn Street, Sydney, NSW, 2000, Australia",
    },
  ],
};

const CAD_INSTRUCTIONS: PaymentInstructions = {
  rows: [
    { label: "Name", value: "WALLS Entertainment Group Inc." },
    { label: "Account number", value: "200116305910" },
    { label: "Institution number", value: "621" },
    { label: "Transit number", value: "16001" },
    { label: "Swift/BIC", value: "TRWICAW1XXX" },
    {
      label: "Bank name and address",
      value: "Wise Payments Canada Inc., 99 Bank Street, Suite 1420, Ottawa, ON, K1P 1H4, Canada",
    },
    { label: "", value: "Alternatively, you may send payment via Interac e-Transfer:" },
    { label: "Interac e-Transfer", value: "ar@wallsentertainment.com" },
  ],
};

const EUR_INSTRUCTIONS: PaymentInstructions = {
  rows: [
    { label: "Name", value: "WALLS Entertainment Group Inc." },
    { label: "IBAN", value: "BE87 9675 1088 2794" },
    { label: "Swift/BIC", value: "TRWIBEB1XXX" },
    {
      label: "Bank name and address",
      value: "Wise, Rue du Trône 100, 3rd floor, Brussels, 1050, Belgium",
    },
  ],
};

const GBP_INSTRUCTIONS: PaymentInstructions = {
  rows: [
    { label: "Name", value: "WALLS Entertainment Group Inc." },
    { label: "Account number", value: "30910941" },
    { label: "Sort code", value: "23-08-01" },
    { label: "IBAN", value: "GB12 TRWI 2308 0130 9109 41" },
    { label: "Swift/BIC", value: "TRWIGB2LXXX" },
    {
      label: "Bank name and address",
      value:
        "Wise Payments Limited, 1st Floor, Worship Square, 65 Clifton Street, London, EC2A 4JE, United Kingdom",
    },
  ],
};

export function getPaymentInstructionsForCurrency(currency: string | undefined | null): PaymentInstructions {
  const c = normalizeInvoiceCurrency(currency);
  switch (c) {
    case "AUD":
      return AUD_INSTRUCTIONS;
    case "CAD":
      return CAD_INSTRUCTIONS;
    case "EUR":
      return EUR_INSTRUCTIONS;
    case "GBP":
      return GBP_INSTRUCTIONS;
    case "USD":
    default:
      return USD_INSTRUCTIONS;
  }
}

/** Inner HTML for the payment block (no outer wrapper). */
export function paymentInstructionsToPrintHtml(instr: PaymentInstructions): string {
  return instr.rows
    .map((row) => {
      const main =
        row.label.trim() === ""
          ? `<p style="margin:3px 0;font-size:12px;line-height:1.45;">${escapeHtml(row.value)}</p>`
          : `<p style="margin:3px 0;font-size:12px;line-height:1.45;"><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</p>`;
      return main;
    })
    .join("");
}
