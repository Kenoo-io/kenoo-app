"use client";

import * as React from "react";
import { ArrowUp, Check, LoaderCircle, Plus, Sparkles } from "lucide-react";

import { cn } from "@walls/utils";

type Thread = {
  id: string;
  title: string | null;
  status: "active" | "archived";
  context: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  parts: unknown[];
  status: "pending" | "streaming" | "completed" | "failed";
  created_at: string;
};

const starterPrompts = [
  "Help me shape this email",
  "Write a stronger subject line",
  "Make this feel more on-brand",
];

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body?.error === "string" ? body.error : "Something went wrong");
  return body as T;
}

export function KenooAIPanel() {
  const [thread, setThread] = React.useState<Thread | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const composerRef = React.useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const loadThread = React.useCallback(async (nextThread: Thread | null) => {
    if (!nextThread) {
      setMessages([]);
      return;
    }
    const payload = await readJson<{ messages: Message[] }>(await fetch(`/api/ai/threads/${nextThread.id}/messages`));
    setMessages(payload.messages ?? []);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const payload = await readJson<{ threads: Thread[] }>(await fetch("/api/ai/threads"));
        if (cancelled) return;
        const latest = payload.threads?.find((item) => item.status === "active") ?? null;
        setThread(latest);
        await loadThread(latest);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Unable to load Kenoo AI");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [loadThread]);

  React.useEffect(() => {
    if (messages.length) scrollToBottom();
  }, [messages.length, scrollToBottom]);

  async function startThread() {
    const payload = await readJson<{ thread: Thread }>(await fetch("/api/ai/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Kenoo AI chat", context: { surface: "email_template_builder" } }),
    }));
    setThread(payload.thread);
    setMessages([]);
    return payload.thread;
  }

  async function sendMessage(rawValue = draft) {
    const content = rawValue.trim();
    if (!content || sending) return;
    setSending(true);
    setError(null);
    setDraft("");
    try {
      const activeThread = thread ?? await startThread();
      const payload = await readJson<{ message: Message }>(await fetch(`/api/ai/threads/${activeThread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content }),
      }));
      setMessages((current) => [...current, payload.message, {
        id: `preview-assistant-${Date.now()}`,
        role: "assistant",
        content: "I’m connected to this conversation. AI responses will land here next.",
        parts: [],
        status: "completed",
        created_at: new Date().toISOString(),
      }]);
      composerRef.current?.focus();
    } catch (caught) {
      setDraft(content);
      setError(caught instanceof Error ? caught.message : "Unable to send message");
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function startNewConversation() {
    setThread(null);
    setMessages([]);
    setDraft("");
    setError(null);
    composerRef.current?.focus();
  }

  return <div className="flex h-full min-h-0 flex-col bg-[#fbfbfc] text-[#222]">
    <div className="flex items-center justify-between border-b border-[#eceef0] px-5 py-4">
      <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eaf7f8] text-[#4d9eae]"><Sparkles className="h-4 w-4" /></span><div><p className="text-[13px] font-semibold tracking-[-0.02em]">Kenoo AI</p><p className="mt-0.5 text-[10px] text-[#9a9da1]">Your creative copilot</p></div></div>
      <button type="button" onClick={startNewConversation} className="flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-[10px] font-medium text-[#7c8388] transition hover:bg-white hover:text-[#4d9eae]" title="Start a new conversation"><Plus className="h-3.5 w-3.5" /> New chat</button>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {loading ? <div className="flex items-center gap-2 py-4 text-[11px] text-[#9a9da1]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Loading conversation…</div> : null}
      {!loading && messages.length === 0 ? <div className="flex min-h-full flex-col justify-center pb-10"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-[18px] bg-white text-[#6eadc0] shadow-[0_8px_22px_rgba(15,23,42,0.06)]"><Sparkles className="h-5 w-5" /></div><p className="text-[20px] font-semibold tracking-[-0.04em] text-[#242628]">Let’s make something<br />people remember.</p><p className="mt-3 max-w-[270px] text-[12px] leading-5 text-[#858b8f]">Ask Kenoo AI for ideas, copy, or a fresh direction for your email.</p><div className="mt-6 space-y-2">{starterPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => void sendMessage(prompt)} className="flex w-full items-center justify-between rounded-2xl border border-[#e8eaed] bg-white px-3.5 py-3 text-left text-[11px] text-[#656b70] transition hover:border-[#b9dfe4] hover:bg-[#f5fbfc] hover:text-[#4d9eae]"><span>{prompt}</span><ArrowUp className="h-3.5 w-3.5 rotate-45" /></button>)}</div></div> : null}
      <div className="space-y-5">{messages.map((message) => message.role === "user" ? <div key={message.id} className="flex justify-end"><div className="max-w-[88%] rounded-[20px] rounded-br-md bg-[#eeeeef] px-3.5 py-2.5 text-[12px] leading-5 text-[#252729]">{message.content}</div></div> : <div key={message.id} className="flex gap-2.5"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#eaf7f8] text-[#5babb9]"><Sparkles className="h-3 w-3" /></span><div className="pt-0.5 text-[12px] leading-5 text-[#5e6569]">{message.content || (message.status === "pending" ? "Thinking…" : "")}</div></div>)}</div>
      <div ref={messagesEndRef} />
    </div>
    {error ? <div className="mx-5 mb-2 rounded-xl bg-[#fff4f3] px-3 py-2 text-[10px] text-[#c06059]">{error}</div> : null}
    <div className="border-t border-[#eceef0] bg-white/70 p-4"><div className="rounded-[21px] border border-[#e4e7e9] bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.06)] focus-within:border-[#b7dce2] focus-within:ring-4 focus-within:ring-[#eaf7f8]"><textarea ref={composerRef} rows={1} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleComposerKeyDown} placeholder="Ask Kenoo AI" className="max-h-24 min-h-9 w-full resize-none bg-transparent px-2 py-2 text-[12px] leading-5 text-[#333] outline-none placeholder:text-[#a2a6aa]" /><div className="flex items-center justify-between px-1"><span className="text-[10px] text-[#b0b3b6]">Enter to send · Shift + Enter for a new line</span><button type="button" onClick={() => void sendMessage()} disabled={!draft.trim() || sending} aria-label="Send message" className={cn("flex h-8 w-8 items-center justify-center rounded-full transition", draft.trim() && !sending ? "bg-[#303436] text-white hover:bg-[#4d9eae]" : "bg-[#f0f1f2] text-[#b4b8ba]")}>{sending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</button></div></div><p className="mt-2 flex items-center justify-center gap-1 text-center text-[10px] text-[#b0b3b6]"><Check className="h-3 w-3" /> Conversation saved to this workspace</p></div>
  </div>;
}
