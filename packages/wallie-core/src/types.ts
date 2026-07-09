import type { WallieEmailDraft } from "./email-draft";

export interface ApolloLead {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  companyName?: string;
  email?: string;
  linkedinUrl?: string;
  photo?: string;
}

export interface WallieToolResults {
  apollo_people?: ApolloLead[];
  web_search?: unknown;
  email_draft?: WallieEmailDraft;
}

export interface WallieMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  renderedContent?: string;
  isTyping?: boolean;
  apolloPeople?: ApolloLead[];
  emailDraft?: WallieEmailDraft;
}

export interface WallieThread {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
}

export type WallieLoadingStatus =
  | "searching"
  | "people_search"
  | "thinking"
  | null;

export interface WallieStreamLine {
  status?: string;
  response?: string;
  delta?: string;
  error?: string;
  apolloPeople?: ApolloLead[];
  emailDraft?: unknown;
  threadId?: string;
}

export interface WallieChatPayload {
  message: string;
  mentions?: Array<Record<string, unknown>>;
  conversationHistory: Array<{ role: string; content: string }>;
  model: string;
  userId?: string;
  threadId?: string;
}
