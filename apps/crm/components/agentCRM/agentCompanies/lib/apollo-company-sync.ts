/** Shared Apollo / domain enrichment used by Create Company popup and CompanySearch "+ add". */

/** Returns false if input is a full URL (has ://) and the host is not Apollo. */
export function isApolloDomainOrRelative(raw: string): boolean {
  const s = raw.trim().split("?")[0].trim();
  if (!s.includes("://")) return true;
  try {
    const u = new URL(s);
    return u.hostname.toLowerCase().includes("apollo");
  } catch {
    return false;
  }
}

/** Parse Apollo URL/ID; only accepts organization or account from Apollo. */
export function parseApolloCompanyUrl(
  raw: string
): { type: "organization"; cleanId: string } | { type: "account"; cleanId: string } | null {
  const url = raw.trim().split("?")[0].trim();
  if (!url) return null;
  if (!isApolloDomainOrRelative(raw)) return null;
  const lower = url.toLowerCase();
  if (/\/(people|person|contacts?|contact)(\/|$)/.test(lower)) return null;
  const cleanId = (id: string) => id.trim().replace(/[^\w-]/g, "");
  const orgMatch = url.match(/(?:#\/)?organizations?\/([^\/\?]+)/);
  const accountMatch = url.match(/(?:#\/)?accounts?\/([^\/\?]+)/);
  if (orgMatch?.[1]) return { type: "organization", cleanId: cleanId(orgMatch[1]) };
  if (accountMatch?.[1]) return { type: "account", cleanId: cleanId(accountMatch[1]) };
  const possibleId = url.split("/").pop()?.trim() ?? raw.trim();
  if (possibleId && !possibleId.includes(".")) {
    const id = cleanId(possibleId);
    if (id) return { type: "account", cleanId: id };
  }
  return null;
}

/** Extract a non-Apollo domain from a URL or bare host. */
export function parseNonApolloDomain(raw: string): string | null {
  const input = raw.trim().split(/\s/)[0];
  if (!input) return null;

  const normalizeHost = (host: string) =>
    host.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].trim();

  const lowerInput = input.toLowerCase();
  if (lowerInput.includes("apollo")) return null;

  try {
    const url = input.includes("://") ? new URL(input) : new URL(`https://${input}`);
    const host = normalizeHost(url.hostname);
    if (!host || host.includes("apollo")) return null;
    return host;
  } catch {
    const host = normalizeHost(input);
    if (!host || host.includes("apollo")) return null;
    return host;
  }
}

export type CompanySyncPreview = {
  mode: "apollo-organization" | "apollo-account" | "domain";
  label: "organization" | "account" | "domain";
  value: string;
};

export function getApolloCompanyPreview(apolloUrl: string): CompanySyncPreview | null {
  const trimmed = apolloUrl.trim();
  const apollo = parseApolloCompanyUrl(trimmed);
  if (apollo) {
    return {
      mode: apollo.type === "organization" ? "apollo-organization" : "apollo-account",
      label: apollo.type,
      value: apollo.cleanId,
    };
  }
  const domain = parseNonApolloDomain(trimmed);
  if (domain) {
    return {
      mode: "domain",
      label: "domain",
      value: domain,
    };
  }
  return null;
}

export type CompanySyncSuccess = { ok: true; companyName?: string; message: string };

export type CompanySyncFailure = { ok: false; error: string };

export type CompanySyncResult = CompanySyncSuccess | CompanySyncFailure;

export async function runApolloCompanySync(rawInput: string): Promise<CompanySyncResult> {
  const preview = getApolloCompanyPreview(rawInput);

  if (!preview) {
    return { ok: false, error: "Please enter a valid Apollo URL or company domain" };
  }

  // Apollo organization / account
  if (preview.mode === "apollo-organization" || preview.mode === "apollo-account") {
    const parsed = parseApolloCompanyUrl(rawInput);
    if (!parsed) {
      return { ok: false, error: "Please enter a valid Apollo organization or account URL" };
    }

    const { type, cleanId: id } = parsed;
    const url =
      type === "organization"
        ? "/api/apollo/custom/apollo-organization-id-supabase-sync"
        : "/api/apollo/custom/apollo-account-id-supabase-sync";
    const body =
      type === "organization"
        ? JSON.stringify({ organizationId: id })
        : JSON.stringify({ accountId: id });

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      const responseText = await response.text();
      let data: { companyName?: string; message?: string; error?: string; details?: string };
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        console.error("[Apollo company sync] Response was not JSON", {
          status: response.status,
          url,
          type,
          id,
          bodyPreview: responseText.slice(0, 200),
        });
        return {
          ok: false,
          error:
            response.status === 404 ? "Sync endpoint not found." : `Server error (${response.status}). Check console.`,
        };
      }

      if (!response.ok) {
        console.error("[Apollo company sync] API error", {
          status: response.status,
          url,
          type,
          id,
          error: data.error,
          details: data.details,
        });
        return {
          ok: false,
          error: data.error || data.details || "Failed to sync from Apollo URL",
        };
      }

      const companyName = data.companyName;
      const successMessage = data.message === "Company created" ? "Company created" : "Company updated";
      return { ok: true, companyName, message: successMessage };
    } catch (error) {
      console.error("[Apollo company sync] Error", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to sync from Apollo URL",
      };
    }
  }

  // Domain
  const domain = parseNonApolloDomain(rawInput.trim());
  if (!domain) {
    return { ok: false, error: "Please enter a valid company domain" };
  }

  try {
    const url = "/api/apollo/custom/apollo-domain-supabase-sync";
    const body = JSON.stringify({ domain });

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const responseText = await response.text();
    let data: { companyName?: string; message?: string; error?: string; details?: string };
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      console.error("[Apollo domain sync] Response was not JSON", {
        status: response.status,
        url,
        domain,
        bodyPreview: responseText.slice(0, 200),
      });
      return {
        ok: false,
        error:
          response.status === 404 ? "Domain sync endpoint not found." : `Server error (${response.status}). Check console.`,
      };
    }

    if (!response.ok) {
      console.error("[Apollo domain sync] API error", {
        status: response.status,
        url,
        domain,
        error: data.error,
        details: data.details,
      });
      return { ok: false, error: data.error || data.details || "Failed to sync from domain" };
    }

    const companyName = data.companyName;
    const successMessage = data.message === "Company created" ? "Company created" : "Company updated";
    return { ok: true, companyName, message: successMessage };
  } catch (error) {
    console.error("[Apollo domain sync] Error", error);
    return { ok: false, error: error instanceof Error ? error.message : "Failed to sync from domain" };
  }
}
