export const PEOPLE_ENRICHMENT_SLUG = "people-enrichment";
export const PEOPLE_ENRICHMENT_JOB_TYPE = "people-enrichment";

export type PeopleEnrichmentLocation = {
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  post_code?: string;
  country?: string;
};

export type PeopleEnrichmentBody = {
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  organization?: string;
  company?: string;
  notes?: string;
  location?: PeopleEnrichmentLocation;
  also_known_as?: string[] | string;
  aliases?: string[] | string;
  addresses?: string[] | string;
};

function trimText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  return text || undefined;
}

function asStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? [text] : [];
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function parsePeopleEnrichmentInput(
  body: PeopleEnrichmentBody,
): { error: string } | { input: Record<string, unknown> } {
  const location = body.location ?? {};
  const name =
    trimText(body.name) ||
    trimText(body.full_name) ||
    [trimText(body.first_name), trimText(body.last_name)]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    undefined;
  const email = trimText(body.email)?.toLowerCase();

  if (!name && !email) {
    return { error: "name or email is required" };
  }

  return {
    input: {
      name: name ?? null,
      email: email ?? null,
      phone: trimText(body.phone) ?? null,
      organization: trimText(body.organization) || trimText(body.company) || null,
      notes: trimText(body.notes) ?? null,
      location: {
        address_line_1: trimText(location.address_line_1) ?? null,
        address_line_2: trimText(location.address_line_2) ?? null,
        city: trimText(location.city) ?? null,
        state: trimText(location.state) ?? null,
        post_code: trimText(location.post_code) ?? null,
        country: trimText(location.country) ?? null,
      },
      also_known_as: asStringList(body.also_known_as ?? body.aliases),
      addresses: asStringList(body.addresses),
    },
  };
}
