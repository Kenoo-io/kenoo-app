/**
 * Wallie email-draft helpers.
 *
 * These mirror the payload the wallie-api backend emits from `formatDraftRow()`
 * (see the backend README section "Chat UI: email compose cards"). The backend
 * sends two parallel signals for a draft:
 *   1. `{emailStart} … {emailEnd}` markers wrapping a preview inside the response
 *      text. The frontend must strip that region and render a card instead.
 *   2. A structured `emailDraft` object with `contentType === "email_draft"`.
 */

export const EMAIL_DRAFT_CONTENT_TYPE = "email_draft";
export const EMAIL_DRAFT_MARKER_START = "{emailStart}";
export const EMAIL_DRAFT_MARKER_END = "{emailEnd}";

export interface WallieEmailDraftRecipient {
  type: "to" | "cc" | "bcc";
  email: string;
  name?: string | null;
}

export interface WallieEmailDraftMarkers {
  start: string;
  end: string;
}

/**
 * Shape emitted by the backend `formatDraftRow()`. Every field is optional so we
 * can also accept partial/legacy payloads without crashing.
 */
export interface WallieEmailDraft {
  contentType?: string;
  displayVariant?: "compose" | "reply" | "new";
  source?: string;
  markers?: WallieEmailDraftMarkers;
  markedPreview?: string | null;
  markedBody?: string | null;
  preview?: string | null;
  messageId?: string | null;
  draftId?: string | null;
  emailThreadId?: string | null;
  wallieThreadId?: string | null;
  replyThreadId?: string | null;
  status?: string | null;
  isDraft?: boolean;
  isReply?: boolean;
  from?: string | null;
  fromName?: string | null;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  recipients?:
    | WallieEmailDraftRecipient[]
    | string
    | string[]
    | { to?: unknown; cc?: unknown; bcc?: unknown };
  subject?: string | null;
  /** Full body including the server-appended signature. */
  bodyText?: string | null;
  /** Body with the signature stripped (user-authored words only). */
  bodyTextCore?: string | null;
  bodyHtml?: string | null;
  /** Legacy single-field body (older payloads). */
  body?: string | null;
  threadId?: string | null;
}

export interface WallieEmailComposerPrefill {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  threadId?: string | null;
  draftId?: string | null;
}

function extractEmailFromItem(item: unknown): string {
  if (typeof item === "string") return item.trim();
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const candidate =
      record.email ?? record.address ?? record.value ?? record.mail ?? "";
    if (typeof candidate === "string") return candidate.trim();
  }
  return "";
}

function asStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map(extractEmailFromItem).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  const single = extractEmailFromItem(value);
  return single ? [single] : [];
}

function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>(?=\s*)/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Recipients can arrive as top-level `to`/`cc`/`bcc` arrays (preferred), as a
 * structured `recipients` list of `{ type, email }`, or as a legacy
 * string/array/object. This handles all of them.
 */
export function splitRecipientEmails(draft: WallieEmailDraft): {
  to: string[];
  cc: string[];
  bcc: string[];
} {
  const to = asStringArray(draft.to);
  const cc = asStringArray(draft.cc);
  const bcc = asStringArray(draft.bcc);
  if (to.length || cc.length || bcc.length) {
    return { to, cc, bcc };
  }

  const recipients = draft.recipients;
  if (Array.isArray(recipients)) {
    const grouped = { to: [] as string[], cc: [] as string[], bcc: [] as string[] };
    for (const entry of recipients) {
      if (entry && typeof entry === "object" && "type" in entry) {
        const typed = entry as WallieEmailDraftRecipient;
        const email = extractEmailFromItem(typed);
        if (!email) continue;
        if (typed.type === "cc") grouped.cc.push(email);
        else if (typed.type === "bcc") grouped.bcc.push(email);
        else grouped.to.push(email);
      } else {
        const email = extractEmailFromItem(entry);
        if (email) grouped.to.push(email);
      }
    }
    return grouped;
  }

  if (recipients && typeof recipients === "object") {
    const container = recipients as { to?: unknown; cc?: unknown; bcc?: unknown };
    return {
      to: asStringArray(container.to),
      cc: asStringArray(container.cc),
      bcc: asStringArray(container.bcc),
    };
  }

  return { to: asStringArray(recipients), cc: [], bcc: [] };
}

export function parseWallieEmailDraft(
  value: unknown,
): WallieEmailDraft | undefined {
  if (!value || typeof value !== "object") return undefined;
  const draft = value as Record<string, unknown>;

  const isEmailDraft = draft.contentType === EMAIL_DRAFT_CONTENT_TYPE;
  const hasContent =
    draft.subject ||
    draft.body ||
    draft.bodyText ||
    draft.bodyTextCore ||
    draft.bodyHtml ||
    draft.recipients ||
    draft.to;
  if (!isEmailDraft && !hasContent) return undefined;

  const variant =
    draft.displayVariant === "reply"
      ? "reply"
      : draft.displayVariant === "compose"
        ? "compose"
        : draft.displayVariant === "new"
          ? "compose"
          : draft.isReply === true
            ? "reply"
            : "compose";

  return {
    contentType: EMAIL_DRAFT_CONTENT_TYPE,
    displayVariant: variant,
    source: typeof draft.source === "string" ? draft.source : "wallie",
    markers:
      draft.markers && typeof draft.markers === "object"
        ? (draft.markers as WallieEmailDraftMarkers)
        : { start: EMAIL_DRAFT_MARKER_START, end: EMAIL_DRAFT_MARKER_END },
    markedPreview: draft.markedPreview != null ? String(draft.markedPreview) : undefined,
    markedBody: draft.markedBody != null ? String(draft.markedBody) : undefined,
    preview: draft.preview != null ? String(draft.preview) : undefined,
    messageId: draft.messageId != null ? String(draft.messageId) : undefined,
    draftId:
      draft.draftId != null
        ? String(draft.draftId)
        : draft.messageId != null
          ? String(draft.messageId)
          : undefined,
    emailThreadId: draft.emailThreadId != null ? String(draft.emailThreadId) : undefined,
    wallieThreadId: draft.wallieThreadId != null ? String(draft.wallieThreadId) : undefined,
    replyThreadId: draft.replyThreadId != null ? String(draft.replyThreadId) : undefined,
    status: draft.status != null ? String(draft.status) : undefined,
    isDraft: draft.isDraft !== false,
    isReply: variant === "reply",
    from: draft.from != null ? String(draft.from) : undefined,
    fromName: draft.fromName != null ? String(draft.fromName) : undefined,
    to: asStringArray(draft.to),
    cc: asStringArray(draft.cc),
    bcc: asStringArray(draft.bcc),
    recipients: draft.recipients as WallieEmailDraft["recipients"],
    subject: draft.subject != null ? String(draft.subject) : undefined,
    bodyText: draft.bodyText != null ? String(draft.bodyText) : undefined,
    bodyTextCore: draft.bodyTextCore != null ? String(draft.bodyTextCore) : undefined,
    bodyHtml: draft.bodyHtml != null ? String(draft.bodyHtml) : undefined,
    body: draft.body != null ? String(draft.body) : undefined,
    threadId: draft.threadId != null ? String(draft.threadId) : undefined,
  };
}

/** Full body as it will be sent (includes the server-appended signature). */
function resolveDraftBody(draft: WallieEmailDraft): string {
  return (
    draft.bodyText?.trim() ||
    draft.body?.trim() ||
    stripHtml(draft.bodyHtml) ||
    ""
  );
}

/** Body for the editable composer (signature stripped; server re-appends it). */
function resolveEditableBody(draft: WallieEmailDraft): string {
  return (
    draft.bodyTextCore?.trim() ||
    draft.bodyText?.trim() ||
    draft.body?.trim() ||
    stripHtml(draft.bodyHtml) ||
    ""
  );
}

export function emailDraftBodyPreview(
  draft: WallieEmailDraft,
  maxLength = 1200,
): string {
  const body = resolveDraftBody(draft);
  if (body.length <= maxLength) return body;
  return `${body.slice(0, maxLength).trimEnd()}…`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns the assistant prose with the `{emailStart} … {emailEnd}` block removed
 * (that region is rendered as a compose card instead). Falls back to stripping a
 * legacy inline body when no markers are present.
 */
export function extractEmailDraftIntro(
  content: string,
  draft: WallieEmailDraft,
): string {
  const raw = content ?? "";
  const start = draft.markers?.start || EMAIL_DRAFT_MARKER_START;
  const end = draft.markers?.end || EMAIL_DRAFT_MARKER_END;

  const startIdx = raw.indexOf(start);
  const endIdx = raw.indexOf(end);
  if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
    const before = raw.slice(0, startIdx).trim();
    const after = raw.slice(endIdx + end.length).trim();
    return [before, after].filter(Boolean).join("\n\n").trim();
  }

  // No markers present: strip any stray marker tokens, then the legacy body.
  let text = raw
    .replace(new RegExp(escapeRegExp(start), "g"), "")
    .replace(new RegExp(escapeRegExp(end), "g"), "")
    .trim();
  const body = resolveDraftBody(draft);
  if (body && text.includes(body)) {
    text = text.replace(body, "").trim();
  }
  return text;
}

export function emailDraftToComposerPrefill(
  draft: WallieEmailDraft,
): WallieEmailComposerPrefill {
  const { to, cc, bcc } = splitRecipientEmails(draft);
  return {
    to,
    cc,
    bcc,
    subject: draft.subject?.trim() ?? "",
    body: resolveEditableBody(draft),
    threadId: draft.emailThreadId ?? draft.replyThreadId ?? draft.threadId ?? null,
    draftId: draft.draftId ?? draft.messageId ?? null,
  };
}
