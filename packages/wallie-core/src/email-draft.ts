export interface WallieEmailDraftRecipients {
  to?: string[];
  cc?: string[];
  bcc?: string[];
}

export interface WallieEmailDraft {
  recipients?: string | string[] | WallieEmailDraftRecipients;
  subject?: string | null;
  body?: string | null;
  displayVariant?: "reply" | "new";
  isDraft?: boolean;
  threadId?: string | null;
  draftId?: string | null;
}

function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

export function parseWallieEmailDraft(
  value: unknown,
): WallieEmailDraft | undefined {
  if (!value || typeof value !== "object") return undefined;
  const draft = value as Record<string, unknown>;
  if (!draft.subject && !draft.body && !draft.recipients) return undefined;
  return {
    recipients: draft.recipients as WallieEmailDraft["recipients"],
    subject: draft.subject != null ? String(draft.subject) : undefined,
    body: draft.body != null ? String(draft.body) : undefined,
    displayVariant:
      draft.displayVariant === "reply" ? "reply" : ("new" as const),
    isDraft: draft.isDraft !== false,
    threadId: draft.threadId != null ? String(draft.threadId) : undefined,
    draftId: draft.draftId != null ? String(draft.draftId) : undefined,
  };
}

export function extractEmailDraftIntro(
  content: string,
  draft: WallieEmailDraft,
): string {
  const body = draft.body?.trim() ?? "";
  if (!body || !content.includes(body)) return content.trim();
  return content.replace(body, "").trim();
}
