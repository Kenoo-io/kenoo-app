import { TAX_DROPDOWN_OPTIONS } from "@/components/agentCRM/agentDeals/tabs/invoiceTab/canadian-tax-options";
import { countryCodeMapping } from "@/types/country.types";
import {
  getCanadianProvinceCodeFromState,
  getCanadianProvinceName,
} from "@/types/canadian-province.types";

export type InvoiceTaxRecommendationContext = {
  vendorCountry?: string | null;
  vendorState?: string | null;
  talentCountry?: string | null;
  talentTaxRegion?: string | null;
};

export type InvoiceTaxRecommendation = {
  /** Value from `TAX_DROPDOWN_OPTIONS` (e.g. `taxable:hst_13`, `out_of_scope`). */
  dropdownValue: string;
  /** Human-readable tax label (e.g. "HST (13%)"). */
  label: string;
  /** Short explanation for the UI. */
  reason: string;
  /** False when no Canadian tax should apply. */
  applies: boolean;
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(countryCodeMapping).map(([name, code]) => [name.toLowerCase(), code])
);

/** Tax key used in `taxable:<key>` when vendor and talent provinces match. */
const VENDOR_PROVINCE_TAX_KEY: Record<string, string> = {
  ON: "hst_13",
  NB: "hst_15",
  NL: "hst_15",
  NS: "hst_15",
  PE: "hst_15",
  BC: "pst_bc_7",
  SK: "pst_sk_6",
  MB: "pst_mb_7",
  QC: "qst_9975",
  AB: "gst_5",
  NT: "gst_5",
  NU: "gst_5",
  YT: "gst_5",
};

function normalizeCountryCode(country: string | null | undefined): string | null {
  const raw = String(country ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (upper.length === 2) return upper;

  const fromName = COUNTRY_NAME_TO_CODE[raw.toLowerCase()];
  if (fromName) return fromName;

  if (raw.toLowerCase() === "united states of america") return "US";

  return null;
}

function normalizeProvinceCode(value: string | null | undefined): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (upper.length === 2) return upper;
  return getCanadianProvinceCodeFromState(raw);
}

function findDropdownOption(value: string) {
  return TAX_DROPDOWN_OPTIONS.find((opt) => opt.value === value) ?? null;
}

function recommendationFromValue(
  dropdownValue: string,
  reason: string,
  applies: boolean
): InvoiceTaxRecommendation {
  const option = findDropdownOption(dropdownValue);
  return {
    dropdownValue,
    label: option?.label ?? dropdownValue,
    reason,
    applies,
  };
}

/**
 * Recommend invoice tax based on vendor (customer) location and talent tax registration.
 *
 * Rules:
 * - US / non-Canadian vendor → no Canadian tax.
 * - Non-Canadian talent → no Canadian tax.
 * - Both in Canada → at least GST; full provincial/HST rate when talent is registered in the vendor's province.
 * - Cross-province (talent not registered in vendor province) → GST only.
 */
export function recommendInvoiceTax(
  ctx: InvoiceTaxRecommendationContext
): InvoiceTaxRecommendation {
  const vendorCountry = normalizeCountryCode(ctx.vendorCountry);
  const talentCountry = normalizeCountryCode(ctx.talentCountry);
  const vendorProvince = normalizeProvinceCode(ctx.vendorState);
  const talentTaxRegion = normalizeProvinceCode(ctx.talentTaxRegion);

  if (!vendorCountry || vendorCountry !== "CA") {
    return recommendationFromValue(
      "out_of_scope",
      "Vendor is not based in Canada. Canadian sales tax does not apply.",
      false
    );
  }

  if (!talentCountry || talentCountry !== "CA") {
    return recommendationFromValue(
      "out_of_scope",
      "Talent is not based in Canada. Canadian sales tax does not apply.",
      false
    );
  }

  const vendorProvinceLabel = vendorProvince
    ? getCanadianProvinceName(vendorProvince) ?? vendorProvince
    : null;
  const talentProvinceLabel = talentTaxRegion
    ? getCanadianProvinceName(talentTaxRegion) ?? talentTaxRegion
    : null;

  if (!talentTaxRegion) {
    return recommendationFromValue(
      "taxable:gst_5",
      "Canadian vendor and talent. Charge federal GST. Talent has no provincial tax registration on file.",
      true
    );
  }

  if (!vendorProvince) {
    return recommendationFromValue(
      "taxable:gst_5",
      "Canadian vendor and talent. Charge federal GST. Add vendor province in billing details for a provincial rate.",
      true
    );
  }

  if (talentTaxRegion === vendorProvince) {
    const taxKey = VENDOR_PROVINCE_TAX_KEY[vendorProvince] ?? "gst_5";
    const dropdownValue = `taxable:${taxKey}`;
    const option = findDropdownOption(dropdownValue);
    const taxLabel = option?.label ?? "Provincial tax";
    return recommendationFromValue(
      dropdownValue,
      `Vendor and talent are both in ${vendorProvinceLabel}. Talent is registered there. Charge ${taxLabel}.`,
      true
    );
  }

  return recommendationFromValue(
    "taxable:gst_5",
    talentProvinceLabel && vendorProvinceLabel
      ? `Vendor is in ${vendorProvinceLabel} but talent is only registered in ${talentProvinceLabel}. Charge federal GST only. No ${vendorProvinceLabel} provincial tax.`
      : "Canadian vendor in a different province than talent's registration. Charge federal GST only.",
    true
  );
}
