/** Canadian provinces and territories (ISO 3166-2:CA subdivision codes). */
export const canadianProvinceCodeMapping: Record<string, string> = {
  Alberta: "AB",
  "British Columbia": "BC",
  Manitoba: "MB",
  "New Brunswick": "NB",
  "Newfoundland and Labrador": "NL",
  "Northwest Territories": "NT",
  "Nova Scotia": "NS",
  Nunavut: "NU",
  Ontario: "ON",
  "Prince Edward Island": "PE",
  Quebec: "QC",
  Saskatchewan: "SK",
  Yukon: "YT",
};

export const CANADIAN_PROVINCE_CODES = Object.values(canadianProvinceCodeMapping);

export function getCanadianProvinceName(code: string): string | undefined {
  const normalized = code.trim().toUpperCase();
  return Object.entries(canadianProvinceCodeMapping).find(([, c]) => c === normalized)?.[0];
}

/** Resolve a province code from free-text state/region (e.g. "Ontario", "ON", "Quebec"). */
export function getCanadianProvinceCodeFromState(state: string | null | undefined): string | null {
  const raw = String(state ?? "").trim();
  if (!raw) return null;

  const upper = raw.toUpperCase();
  if (CANADIAN_PROVINCE_CODES.includes(upper)) return upper;

  const normalizedName = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  for (const [name, code] of Object.entries(canadianProvinceCodeMapping)) {
    const normalizedEntry = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    if (normalizedEntry === normalizedName) return code;
  }

  return null;
}
