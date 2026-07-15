export type InvoiceTaxStatus = "out_of_scope" | "taxable" | "exempt" | "zero_rated";

export type CanadianTaxOption = {
  key: string;
  name: string;
  rateBps: number;
};

/** Common Canadian indirect tax choices (federal + provincial). */
export const CANADIAN_TAX_OPTIONS: CanadianTaxOption[] = [
  { key: "gst_5", name: "GST", rateBps: 500 },
  { key: "hst_13", name: "HST", rateBps: 1300 },
  { key: "hst_15", name: "HST", rateBps: 1500 },
  { key: "qst_9975", name: "QST", rateBps: 998 },
  { key: "pst_bc_7", name: "PST (BC)", rateBps: 700 },
  { key: "pst_sk_6", name: "PST (SK)", rateBps: 600 },
  { key: "pst_mb_7", name: "PST (MB)", rateBps: 700 },
  { key: "rst_mb_7", name: "RST (MB)", rateBps: 700 },
];

export type TaxDropdownOption =
  | { value: "out_of_scope" | "exempt" | "zero_rated"; label: string; taxStatus: InvoiceTaxStatus; taxName: null; taxRateBps: 0 }
  | { value: `taxable:${string}`; label: string; taxStatus: "taxable"; taxName: string; taxRateBps: number };

export const TAX_DROPDOWN_OPTIONS: TaxDropdownOption[] = [
  { value: "out_of_scope", label: "Out of Scope", taxStatus: "out_of_scope", taxName: null, taxRateBps: 0 },
  { value: "exempt", label: "Exempt", taxStatus: "exempt", taxName: null, taxRateBps: 0 },
  { value: "zero_rated", label: "Zero Rate", taxStatus: "zero_rated", taxName: null, taxRateBps: 0 },
  ...CANADIAN_TAX_OPTIONS.map((t) => ({
    value: `taxable:${t.key}` as const,
    label: `${t.name} (${(t.rateBps / 100).toFixed(2).replace(/\.00$/, "")}%)`,
    taxStatus: "taxable" as const,
    taxName: t.name,
    taxRateBps: t.rateBps,
  })),
];

