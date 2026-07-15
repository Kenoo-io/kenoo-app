/** Shared Apollo person/contact/email enrichment used by Create Person and ContactSearch "+ add". */

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

function isValidEmail(raw: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(raw.trim());
}

/** Parse Apollo URL/ID or email; only accepts people or contacts from Apollo. */
export function parseApolloPersonUrl(
  raw: string
): { type: "person"; cleanId: string } | { type: "contact"; cleanId: string } | { type: "email"; email: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (isValidEmail(trimmed)) {
    return { type: "email", email: trimmed.toLowerCase() };
  }

  const url = trimmed.split("?")[0].trim();
  if (!isApolloDomainOrRelative(raw)) return null;
  const lower = url.toLowerCase();
  if (/\/(organizations?|accounts?)(\/|$)/.test(lower)) return null;
  const cleanId = (id: string) => id.trim().replace(/[^\w-]/g, "");
  const peopleMatch = url.match(/(?:#\/)?people\/([^\/\?]+)/);
  const personMatch = url.match(/(?:#\/)?person\/([^\/\?]+)/);
  const contactsMatch = url.match(/(?:#\/)?contacts\/([^\/\?]+)/);
  const contactMatch = url.match(/(?:#\/)?contact\/([^\/\?]+)/);
  if (peopleMatch?.[1]) return { type: "person", cleanId: cleanId(peopleMatch[1]) };
  if (personMatch?.[1]) return { type: "person", cleanId: cleanId(personMatch[1]) };
  if (contactsMatch?.[1]) return { type: "contact", cleanId: cleanId(contactsMatch[1]) };
  if (contactMatch?.[1]) return { type: "contact", cleanId: cleanId(contactMatch[1]) };
  const possibleId = url.split("/").pop()?.trim() ?? raw.trim();
  if (possibleId) {
    const id = cleanId(possibleId);
    if (id) return { type: "contact", cleanId: id };
  }
  return null;
}

export type PersonSyncPreview = {
  mode: "apollo-person" | "apollo-contact" | "email";
  label: "person" | "contact" | "email";
  value: string;
};

export function getApolloPersonPreview(raw: string): PersonSyncPreview | null {
  const parsed = parseApolloPersonUrl(raw);
  if (!parsed) return null;
  if (parsed.type === "email") {
    return { mode: "email", label: "email", value: parsed.email };
  }
  if (parsed.type === "person") {
    return { mode: "apollo-person", label: "person", value: parsed.cleanId };
  }
  return { mode: "apollo-contact", label: "contact", value: parsed.cleanId };
}

export type PersonSyncSuccess = { ok: true; personName?: string; personId?: string; message: string };

export type PersonSyncFailure = { ok: false; error: string };

export type PersonSyncResult = PersonSyncSuccess | PersonSyncFailure;

export async function runApolloPersonSync(rawInput: string): Promise<PersonSyncResult> {
  const parsed = parseApolloPersonUrl(rawInput);
  if (!parsed) {
    return { ok: false, error: "Please enter a valid Apollo URL, person ID, contact ID, or email" };
  }

  let url: string;
  let body: string;

  if (parsed.type === "email") {
    url = "/api/apollo/custom/apollo-person-id-supabase-sync";
    body = JSON.stringify({ email: parsed.email });
  } else if (parsed.type === "person") {
    url = "/api/apollo/custom/apollo-person-id-supabase-sync";
    body = JSON.stringify({ personId: parsed.cleanId });
  } else {
    url = "/api/apollo/custom/apollo-contact-id-supabase-sync";
    body = JSON.stringify({ contactId: parsed.cleanId });
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const responseText = await response.text();
    let data: {
      personName?: string;
      personId?: string;
      message?: string;
      error?: string;
      details?: string;
    };
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      console.error("[Apollo person sync] Response was not JSON", {
        status: response.status,
        url,
        type: parsed.type,
        bodyPreview: responseText.slice(0, 200),
      });
      return {
        ok: false,
        error:
          response.status === 404 ? "Sync endpoint not found." : `Server error (${response.status}). Check console.`,
      };
    }

    if (!response.ok) {
      console.error("[Apollo person sync] API error", {
        status: response.status,
        url,
        type: parsed.type,
        error: data.error,
        details: data.details,
      });
      return {
        ok: false,
        error: data.error || data.details || "Failed to sync from Apollo",
      };
    }

    const personName = data.personName;
    const personId = typeof data.personId === "string" ? data.personId : undefined;
    const successMessage = data.message === "Person created" ? "Person created" : "Person updated";
    return { ok: true, personName, personId, message: successMessage };
  } catch (error) {
    console.error("[Apollo person sync] Error", error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to sync from Apollo",
    };
  }
}
