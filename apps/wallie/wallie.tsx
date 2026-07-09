"use client";


import { wallsToast } from "@/components/ui/walls-toast";
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from "@/lib/utils";
import { DeepQuerySidebarProvider, useDeepQuerySidebar } from "./walliSidebarContext";
import { DeepQuerySidebar } from "./sidebar/wallie-sidebar";
import { DeepQueryChat } from "./chat/wallie-chat";
import { DeepQueryInput } from "./input/wallie-input";
import { DeepQueryEmptyState, Mention } from "./empty-state/wallie-empty-state";
import { Message, ApolloLead, WallieToolResults } from "./types";
import { parseWallieEmailDraft, extractEmailDraftIntro } from "@/lib/wallie/email-draft";
import { useAuth, getSupabaseClient } from "@walls/auth";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Menu } from "lucide-react";
import { WallieVoiceProvider } from "./voice/wallie-voice-context";
import { WallieVoiceShell } from "./voice/wallie-voice-overlay";
import UserProfileButton from "@/components/user-profile-button";

interface Thread {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
}

function DeepQueryContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  /** When loading: 'searching' = Serper, 'people_search' = Apollo contacts, 'thinking' = generating reply, null = generic */
  const [loadingStatus, setLoadingStatus] = useState<'searching' | 'people_search' | 'thinking' | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const currentThreadIdRef = useRef<string | null>(null); // Sync ref for thread ID
  const sendingThreadIdRef = useRef<string | null>(null); // Thread the in-flight request belongs to (so response doesn't apply to wrong thread if user switches)
  const [loadingThreadId, setLoadingThreadId] = useState<string | null>(null); // Which thread is showing "Thinking" (only when viewing that thread)
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const { isCollapsed, setIsMobileMenuOpen } = useDeepQuerySidebar();
  const [selectedModel, setSelectedModel] = useState<string>("gpt-4o");

  const aiModels = [
    // OpenAI - Primary reasoning model
    { value: "gpt-4o", provider: "OpenAI", model: "GPT-4o" },
    // OpenAI - Fast classification/extraction model
    { value: "gpt-4o-mini", provider: "OpenAI", model: "GPT-4o Mini" },
    // Anthropic - Best pick (long context, document synthesis)
    { value: "claude-sonnet-4-6", provider: "Anthropic", model: "Claude Sonnet" },
    // Anthropic - Premium (complex reasoning, agents)
    { value: "claude-opus-4-6", provider: "Anthropic", model: "Claude Opus" },
    // Perplexity - Advanced search with grounding
    { value: "sonar-pro", provider: "Perplexity", model: "Sonar Pro" },
    // Perplexity - Deep research mode (exhaustive searches and comprehensive reports)
    { value: "sonar-deep-research", provider: "Perplexity", model: "Sonar Deep Research" },
  ];

  const getSelectedModelInfo = () => {
    return aiModels.find(m => m.value === selectedModel) || aiModels[0];
  };

  // Load threads from database
  useEffect(() => {
    const loadThreads = async () => {
      if (!user?.id) return;

      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('wallie_threads')
          .select('id, title, created_at, updated_at, is_pinned')
          .eq('user_id', user.id)
          .eq('is_archived', false)
          .order('is_pinned', { ascending: false })
          .order('updated_at', { ascending: false });

        if (error) {
          console.error("Error loading threads:", error);
          return;
        }

        if (data) {
          setThreads(data);
        }
      } catch (error) {
        console.error("Error loading threads:", error);
      }
    };

    loadThreads();
  }, [user?.id]);

  // Load thread from URL search params on mount or when URL changes
  useEffect(() => {
    const threadIdFromUrl = searchParams.get('thread');
    if (threadIdFromUrl && threadIdFromUrl !== currentThreadId && user?.id && threads.length > 0) {
      // Check if thread exists in loaded threads
      const threadExists = threads.some(t => t.id === threadIdFromUrl);
      if (threadExists) {
        // Load the thread from URL
        handleSelectThread(threadIdFromUrl);
      }
    }
  }, [searchParams, threads.length, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear messages when thread is cleared (new chat)
  useEffect(() => {
    if (!currentThreadId) {
      setMessages([]);
    }
  }, [currentThreadId]);

  const handleNewChat = () => {
    setMessages([]);
    setInputValue('');
    setMentions([]);
    currentThreadIdRef.current = null; // Clear ref synchronously
    setCurrentThreadId(null);
    setIsMobileMenuOpen(false);
    // Clear thread from URL
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.delete('thread');
    router.replace(`/?${newSearchParams.toString()}`);
  };

  const handleSelectThread = async (threadId: string) => {
    currentThreadIdRef.current = threadId; // Set ref synchronously
    setCurrentThreadId(threadId);
    setIsMobileMenuOpen(false);

    // Update URL with thread ID
    const newSearchParams = new URLSearchParams(searchParams.toString());
    newSearchParams.set('thread', threadId);
    router.replace(`/?${newSearchParams.toString()}`);

    // Explicitly load messages for the selected thread
    if (!user?.id) return;
    
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('wallie_chats')
        .select('raw_text, mentions, created_at, tool_results')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        return;
      }

      if (data) {
        // Normalize apollo_people from DB (may be camelCase already or snake_case)
        const toApolloLead = (p: Record<string, unknown>): ApolloLead => ({
          id: String(p.id ?? ''),
          firstName: String(p.firstName ?? p.first_name ?? ''),
          lastName: String(p.lastName ?? p.last_name ?? ''),
          title: p.title != null ? String(p.title) : undefined,
          companyName: p.companyName != null ? String(p.companyName) : (p.company_name != null ? String(p.company_name) : undefined),
          email: p.email != null ? String(p.email) : undefined,
          linkedinUrl: p.linkedinUrl != null ? String(p.linkedinUrl) : (p.linkedin_url != null ? String(p.linkedin_url) : undefined),
          photo: p.photo != null ? String(p.photo) : (p.photo_url != null ? String(p.photo_url) : undefined),
        });

        // Convert database messages to Message format
        const loadedMessages: Message[] = data.map((msg: { raw_text: string; mentions: unknown; created_at: string; tool_results?: { apollo_people?: unknown[] } | null }, index: number) => {
          const hasMentions = msg.mentions && Array.isArray(msg.mentions) && msg.mentions.length > 0;
          const isAi = hasMentions ? false : index % 2 === 1;
          const toolResults = msg.tool_results as { apollo_people?: unknown[]; email_draft?: unknown } | null | undefined;
          const apolloPeople: ApolloLead[] | undefined =
            isAi && toolResults?.apollo_people?.length
              ? (toolResults.apollo_people as Record<string, unknown>[]).map(toApolloLead).filter((p) => p.id)
              : undefined;
          const emailDraft = isAi ? parseWallieEmailDraft(toolResults?.email_draft) : undefined;

          if (hasMentions) {
            return {
              id: `${threadId}-${index}`,
              content: msg.raw_text,
              sender: 'user' as const,
              timestamp: new Date(msg.created_at),
            };
          }

          return {
            id: `${threadId}-${index}`,
            content: msg.raw_text,
            sender: (index % 2 === 0 ? 'user' : 'ai') as 'user' | 'ai',
            timestamp: new Date(msg.created_at),
            ...(apolloPeople?.length ? { apolloPeople } : {}),
            ...(emailDraft ? { emailDraft } : {}),
          };
        });
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const handleArchiveThread = async (threadId: string) => {
    if (!user?.id) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('wallie_threads')
        .update({ is_archived: true })
        .eq('id', threadId)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error archiving thread:", error);
        wallsToast.error("Error", "Failed to archive thread.");
        return;
      }

      // Remove from local state
      setThreads(prev => prev.filter(t => t.id !== threadId));
      
      if (currentThreadId === threadId) {
        handleNewChat();
      }

      wallsToast.negative("Thread archived", "The conversation has been archived.");
    } catch (error) {
      console.error("Error archiving thread:", error);
      wallsToast.error("Error", "Failed to archive thread.");
    }
  };

  const handleDeleteThread = async (threadId: string) => {
    if (!user?.id) return;

    try {
      const supabase = getSupabaseClient();
      
      // First delete all messages in the thread
      const { error: messagesError } = await supabase
        .from('wallie_chats')
        .delete()
        .eq('thread_id', threadId);

      if (messagesError) {
        console.error("Error deleting messages:", messagesError);
      }

      // Then delete the thread itself
      const { error } = await supabase
        .from('wallie_threads')
        .delete()
        .eq('id', threadId)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error deleting thread:", error);
        wallsToast.error("Error", "Failed to delete thread.");
        return;
      }

      // Remove from local state
      setThreads(prev => prev.filter(t => t.id !== threadId));
      
      if (currentThreadId === threadId) {
        handleNewChat();
      }

      wallsToast.negative("Thread deleted", "The conversation has been permanently deleted.");
    } catch (error) {
      console.error("Error deleting thread:", error);
      wallsToast.error("Error", "Failed to delete thread.");
    }
  };

  const togglePinThread = async (threadId: string) => {
    if (!user?.id) return;

    const thread = threads.find(t => t.id === threadId);
    if (!thread) return;

    const nextPinned = !thread.is_pinned;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('wallie_threads')
        .update({
          is_pinned: nextPinned,
          updated_at: new Date().toISOString(),
        })
        .eq('id', threadId)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error toggling pin:", error);
        wallsToast.error("Error", "Failed to update pin.");
        return;
      }

      setThreads(prev => {
        const updated = prev.map(t =>
          t.id === threadId ? { ...t, is_pinned: nextPinned, updated_at: new Date().toISOString() } : t
        );
        return updated.sort((a, b) => {
          if (a.is_pinned && !b.is_pinned) return -1;
          if (!a.is_pinned && b.is_pinned) return 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        });
      });
    } catch (error) {
      console.error("Error toggling pin:", error);
      wallsToast.error("Error", "Failed to update pin.");
    }
  };

  const generateThreadTitle = async (firstMessage: string): Promise<string | null> => {
    try {
      const response = await fetch('/api/walli/thread-title-gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: firstMessage,
        }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.title || null;
    } catch (error) {
      console.error("Error generating thread title:", error);
    }
    return null;
  };

  const createOrGetThread = async (): Promise<string | null> => {
    if (!user?.id) {
      console.error("No user ID available for creating thread");
      return null;
    }

    // Check ref first (synchronous) - this prevents race conditions
    if (currentThreadIdRef.current) {
      return currentThreadIdRef.current;
    }

    // Also check state as fallback
    if (currentThreadId) {
      currentThreadIdRef.current = currentThreadId;
      return currentThreadId;
    }

    try {
      const supabase = getSupabaseClient();
      
      // Create a new thread
      const { data, error } = await supabase
        .from('wallie_threads')
        .insert({
          user_id: user.id,
          title: null, // Will be set after first message
        })
        .select('id')
        .single();

      if (error) {
        console.error("Error creating thread:", error);
        return null;
      }

      const threadId = data?.id;
      if (threadId) {
        // Set ref immediately (synchronous) to prevent race conditions
        currentThreadIdRef.current = threadId;
        setCurrentThreadId(threadId);
        // Update URL with thread ID
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('thread', threadId);
        router.replace(`/?${newSearchParams.toString()}`);
        // Add to local threads list (check if it doesn't already exist to prevent duplicates)
        setThreads(prev => {
          const exists = prev.some(t => t.id === threadId);
          if (exists) return prev;
          return [{
            id: threadId,
            title: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, ...prev];
        });
      }

      return threadId;
    } catch (error) {
      console.error("Error creating thread:", error);
      return null;
    }
  };

  const updateThreadTitle = async (threadId: string, title: string) => {
    if (!user?.id) return;

    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('wallie_threads')
        .update({ 
          title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', threadId)
        .eq('user_id', user.id);

      if (error) {
        console.error("Error updating thread title:", error);
        return;
      }

      // Update local state
      setThreads(prev => prev.map(t => 
        t.id === threadId ? { ...t, title, updated_at: new Date().toISOString() } : t
      ));
    } catch (error) {
      console.error("Error updating thread title:", error);
    }
  };

  const saveMessageToDb = async (
    rawText: string,
    mentionsData: Array<{
      type: string;
      id: string;
      name?: string;
      first_name?: string | null;
      last_name?: string | null;
      country?: string | null;
      bio_short?: string | null;
      category?: string | null;
    }>,
    status: string = 'completed',
    errorMessage: string | null = null,
    toolResults: WallieToolResults | null = null,
    overrideThreadId?: string | null
  ): Promise<string | null> => {
    if (!user?.id) {
      console.error("No user ID available for saving message");
      return null;
    }

    try {
      const supabase = getSupabaseClient();

      // Use override when saving into a specific thread (e.g. in-flight response); otherwise get/create
      const threadId = overrideThreadId ?? (await createOrGetThread());
      if (!threadId) {
        console.error("Failed to get or create thread");
        return null;
      }

      const insertPayload: Record<string, unknown> = {
        thread_id: threadId,
        raw_text: rawText,
        mentions: mentionsData,
        status: status,
        error_message: errorMessage,
      };
      if (toolResults != null) {
        insertPayload.tool_results = toolResults;
      }

      const { data, error } = await supabase
        .from('wallie_chats')
        .insert(insertPayload)
        .select('id')
        .single();

      if (error) {
        console.error("Error saving message to database:", error);
        return null;
      }

      // Update thread's updated_at timestamp
      await supabase
        .from('wallie_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);

      return data?.id || null;
    } catch (error) {
      console.error("Error saving message to database:", error);
      return null;
    }
  };

  const sendMessage = useCallback(async (
    text?: string,
    onDelta?: (deltaText: string) => void
  ): Promise<string | null> => {
    const messageText = (text ?? inputValue).trim();
    if (!messageText || isLoading) return null;

    setIsSendingMessage(true);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    // Prepare structured mentions for backend (include talent fields and rates when type is talent)
    const structuredMentions = mentions.map(m => ({
      type: m.type,
      id: m.id,
      name: m.name,
      ...(m.type === 'talent' && {
        first_name: m.first_name,
        last_name: m.last_name,
        country: m.country,
        bio_short: m.bio_short,
        category: m.category,
        rates: m.rates ?? [],
      }),
    }));

    // When WALLIE_API_URL is set, the Next.js /api/walli routes proxy to the remote backend.
    // NEXT_PUBLIC_WALLIE_API_URL is only a client flag for remote save behavior (not the fetch URL).
    const useRemoteBackend =
      !!process.env.NEXT_PUBLIC_WALLIE_API_URL?.trim() ||
      process.env.NEXT_PUBLIC_WALLIE_USE_REMOTE_API === "true";

    const isNewThread = !currentThreadIdRef.current;

    // Resolve thread for this request once; all saves and UI updates for this send use this id (so switching threads mid-response doesn't mix data)
    const threadIdForSend = await createOrGetThread();
    if (!threadIdForSend) {
      setIsSendingMessage(false);
      return null;
    }
    sendingThreadIdRef.current = threadIdForSend;
    setLoadingThreadId(threadIdForSend);

    if (!useRemoteBackend) {
      await saveMessageToDb(
        userMessage.content,
        structuredMentions,
        'completed',
        null,
        null,
        threadIdForSend
      );

      if (isNewThread) {
        generateThreadTitle(userMessage.content).then(title => {
          if (title && threadIdForSend) {
            updateThreadTitle(threadIdForSend, title);
          }
        }).catch(err => {
          console.error("Error generating thread title:", err);
        });
      }
    }

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setMentions([]);
    setIsLoading(true);
    setLoadingStatus(null);

    try {
      // Format conversation history for context
      const conversationHistory = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      // Add current message to history
      conversationHistory.push({
        role: 'user',
        content: userMessage.content
      });

      const chatPayload: Record<string, unknown> = {
        message: userMessage.content,
        mentions: structuredMentions,
        conversationHistory,
        model: selectedModel,
      };
      if (useRemoteBackend && user?.id) {
        chatPayload.userId = user.id;
        chatPayload.threadId = threadIdForSend;
      }

      const chatUrl = '/api/walli/chat/conversational';

      if (useRemoteBackend) {
        console.log('[Wallie] Using proxied remote backend:', {
          messageLength: userMessage.content.length,
          hasUserId: !!user?.id,
          threadId: currentThreadIdRef.current ?? null,
          conversationHistoryLength: conversationHistory.length,
        });
      }

      let response: Response;
      try {
        response = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatPayload),
        });
      } catch (fetchErr) {
        if (useRemoteBackend) {
          console.error('[Wallie] Chat proxy request failed:', {
            error: fetchErr instanceof Error ? fetchErr.message : String(fetchErr),
          });
        }
        throw fetchErr;
      }

      if (useRemoteBackend) {
        console.log('[Wallie] Chat response:', { status: response.status, ok: response.ok });
      }

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        if (useRemoteBackend) {
          console.error('[Wallie] Chat proxy returned non-OK:', { status: response.status, body: bodyText.slice(0, 500) });
        }
        throw new Error(`API responded with status: ${response.status}${bodyText ? `: ${bodyText.slice(0, 200)}` : ''}`);
      }

      // Handle streaming response: newline-delimited JSON (status lines then final response)
      const reader = response.body?.getReader();
      if (reader) {
        let buffer = '';
        const decoder = new TextDecoder();
        let lastData: {
          status?: string;
          response?: string;
          delta?: string;
          error?: string;
          apolloPeople?: import('./types').ApolloLead[];
          emailDraft?: unknown;
          threadId?: string;
        } = {};

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line) as {
                status?: string;
                response?: string;
                delta?: string;
                error?: string;
                apolloPeople?: import('./types').ApolloLead[];
                emailDraft?: unknown;
                threadId?: string;
              };
              if (data.delta) {
                onDelta?.(data.delta);
                continue;
              }
              lastData = data;
              if (data.status === 'searching') setLoadingStatus('searching');
              else if (data.status === 'people_search') setLoadingStatus('people_search');
              else if (data.status === 'thinking') setLoadingStatus('thinking');
              if (data.error) throw new Error(data.error);
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer) as {
              status?: string;
              response?: string;
              delta?: string;
              error?: string;
              apolloPeople?: import('./types').ApolloLead[];
              emailDraft?: unknown;
              threadId?: string;
            };
            if (data.delta) {
              onDelta?.(data.delta);
            } else {
              lastData = data;
              if (data.status === 'searching') setLoadingStatus('searching');
              else if (data.status === 'people_search') setLoadingStatus('people_search');
              else if (data.status === 'thinking') setLoadingStatus('thinking');
              if (data.error) throw new Error(data.error);
            }
          } catch (e) {
            if (!(e instanceof SyntaxError)) throw e;
          }
        }

        const data = lastData;

        if (useRemoteBackend) {
          console.log('[Wallie] Chat stream complete:', {
            hasResponse: !!data.response,
            responseLength: data.response?.length ?? 0,
            apolloPeopleCount: data.apolloPeople?.length ?? 0,
            hasEmailDraft: !!parseWallieEmailDraft(data.emailDraft),
            threadId: data.threadId ?? null,
            hasError: !!data.error,
          });
        }

        if (data.error) {
          if (useRemoteBackend) console.error('[Wallie] Remote backend sent error in stream:', data.error);
          throw new Error(data.error);
        }

        const emailDraft = parseWallieEmailDraft(data.emailDraft);
        const emailIntro = emailDraft
          ? extractEmailDraftIntro(data.response || "", emailDraft)
          : "";

        const aiMessage: Message = {
          id: Date.now().toString(),
          content: data.response || "I'm sorry, I couldn't generate a response.",
          sender: 'ai',
          timestamp: new Date(),
          renderedContent: emailDraft && emailIntro ? "" : emailDraft ? undefined : "",
          isTyping: emailDraft ? !!emailIntro : true,
          apolloPeople: data.apolloPeople?.length ? data.apolloPeople : undefined,
          emailDraft,
        };

        const responseThreadId = sendingThreadIdRef.current;

        // When using external API (Hetzner), server already saved messages; only save from client when using Next.js route
        if (!useRemoteBackend && responseThreadId) {
          await saveMessageToDb(
            aiMessage.content,
            [],
            'completed',
            null,
            {
              apollo_people: data.apolloPeople ?? [],
              ...(emailDraft ? { email_draft: emailDraft } : {}),
            },
            responseThreadId
          );
        }
        if (data.threadId) {
          const threadId = data.threadId;
          if (useRemoteBackend) console.log('[Wallie] Remote backend returned threadId, syncing client:', threadId);
          // Only switch view/URL if user is still on the thread we sent from (otherwise they switched away and we shouldn't change their view)
          const stillViewingSendingThread = currentThreadIdRef.current === responseThreadId;
          if (stillViewingSendingThread) {
            currentThreadIdRef.current = threadId;
            setCurrentThreadId(threadId);
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.set('thread', threadId);
            router.replace(`/?${newSearchParams.toString()}`);
          }
          setThreads(prev => {
            const exists = prev.some(t => t.id === threadId);
            if (exists) return prev;
            return [{ id: threadId, title: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev];
          });
          if (isNewThread && threadId) {
            generateThreadTitle(userMessage.content).then(title => {
              if (title) updateThreadTitle(threadId, title);
            }).catch(() => {});
          }
        }

        // Only append to UI if we're still viewing the thread this response belongs to (otherwise it's saved in DB and will show when they open that thread)
        if (currentThreadIdRef.current === responseThreadId) {
          setMessages(prev => [...prev, aiMessage]);
        }
        return aiMessage.content;
      } else {
        // Fallback: Create a placeholder response
        const aiMessage: Message = {
          id: Date.now().toString(),
          content: "This is a placeholder response. The backend API endpoint will be implemented soon.",
          sender: 'ai',
          timestamp: new Date(),
          renderedContent: "",
          isTyping: true,
        };

        const responseThreadId = sendingThreadIdRef.current;
        if (responseThreadId) {
          await saveMessageToDb(
            aiMessage.content,
            [],
            'completed',
            null,
            null,
            responseThreadId
          );
        }
        if (currentThreadIdRef.current === responseThreadId) {
          setMessages(prev => [...prev, aiMessage]);
        }
        return aiMessage.content;
      }
      return null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      if (useRemoteBackend) {
        console.error('[Wallie] Deep query failed (remote backend):', {
          error: errorMsg,
        });
      } else {
        console.error('Error in deep query:', error);
      }
      
      // Save error to database (into the thread we sent from)
      const responseThreadId = sendingThreadIdRef.current;
      if (responseThreadId) {
        await saveMessageToDb(
          userMessage.content,
          structuredMentions,
          'error',
          errorMsg,
          null,
          responseThreadId
        );
      }
      
      wallsToast.error("Error", "Failed to get AI response. Please try again.");
      return null;
    } finally {
      setLoadingThreadId(null);
      setIsLoading(false);
      setLoadingStatus(null);
      setIsSendingMessage(false);
    }
  }, [
    inputValue,
    isLoading,
    mentions,
    messages,
    selectedModel,
    user?.id,
    searchParams,
    router,
  ]);

  const handleSendMessage = () => {
    void sendMessage();
  };

  // Only show "Thinking" / loading in the thread that the in-flight request belongs to (not in the thread user switched to)
  const showLoadingInThisThread = isLoading && currentThreadId === loadingThreadId;
  const showLoadingStatusInThisThread = currentThreadId === loadingThreadId ? loadingStatus : null;

  return (
    <div className="flex h-full w-full bg-gray-50">
      {/* Sidebar */}
      <DeepQuerySidebar
        threads={threads}
        currentThreadId={currentThreadId}
        onNewChat={handleNewChat}
        onSelectThread={handleSelectThread}
        onRenameThread={updateThreadTitle}
        onPinThread={togglePinThread}
        onArchiveThread={handleArchiveThread}
        onDeleteThread={handleDeleteThread}
      />

      <WallieVoiceProvider
        onSend={sendMessage}
        disabled={showLoadingInThisThread}
      >
      {/* Main Chat Area */}
      <div
        className={cn(
          "flex flex-col h-full min-h-0 transition-all duration-300 ease-in-out relative bg-gray-50",
          "ml-0 pt-14 md:pt-0",
          isCollapsed ? "md:ml-16" : "md:ml-[260px]",
          "w-full"
        )}
      >
        <WallieVoiceShell loadingStatus={showLoadingStatusInThisThread}>
        {/* Mobile header - hamburger + model select (ChatGPT-style) */}
        <header className="flex md:hidden fixed top-0 left-0 right-0 z-30 h-14 items-center gap-3 px-3 bg-gray-50 border-b border-neutral-200/50">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-black hover:bg-neutral-100"
            aria-label="Open menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 min-w-0 flex items-center justify-end min-h-[44px] -my-1">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger
                className={cn(
                  "h-auto min-h-0 border-0 bg-transparent shadow-none rounded-none",
                  "px-2 py-1.5 text-lg font-normal",
                  "flex items-center gap-2 w-auto max-w-full",
                  "focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                  "hover:bg-transparent [&>svg]:text-gray-400 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0"
                )}
              >
                <SelectValue>
                  <span className="flex items-center gap-2 max-w-[220px] truncate text-lg">
                    <span className="text-black shrink-0">
                      {getSelectedModelInfo().provider}
                    </span>
                    <span className="text-neutral-400 truncate">
                      {getSelectedModelInfo().model}
                    </span>
                  </span>
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {aiModels.map((model) => (
                  <SelectItem
                    key={model.value}
                    value={model.value}
                    className="pl-2 pr-8 cursor-pointer data-[highlighted]:bg-neutral-100 focus:bg-neutral-700 [&>span:first-child]:left-auto [&>span:first-child]:right-2 [&>span:first-child]:!left-auto"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-black">{model.provider}</span>
                      <span className="text-neutral-400">{model.model}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-shrink-0 ml-2">
            <UserProfileButton />
          </div>
        </header>

        {/* Profile - Desktop only, top right */}
        <div className="absolute top-4 right-4 z-10 hidden md:block">
          <UserProfileButton />
        </div>

        {/* Model Selector - Desktop only, top left */}
        <div className="absolute top-4 left-4 z-10 hidden md:block">
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger
              className={cn(
                "h-auto border-0 bg-transparent shadow-none",
                "px-2 py-1 text-base font-normal",
                "flex items-center gap-2",
                "focus:ring-0 focus:ring-offset-0",
                "[&>svg]:text-gray-400 [&>svg]:h-4 [&>svg]:w-4"
              )}
            >
              <SelectValue>
                <span className="flex items-center gap-2 max-w-[220px] truncate">
                  <span className="text-black shrink-0">
                    {getSelectedModelInfo().provider}
                  </span>
                  <span className="text-neutral-400 truncate">
                    {getSelectedModelInfo().model}
                  </span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {aiModels.map((model) => (
                <SelectItem 
                  key={model.value} 
                  value={model.value}
                  className="pl-2 pr-8 cursor-pointer data-[highlighted]:bg-neutral-100 focus:bg-neutral-700 [&>span:first-child]:left-auto [&>span:first-child]:right-2 [&>span:first-child]:!left-auto"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-black">{model.provider}</span>
                    <span className="text-neutral-400">{model.model}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages area - takes remaining space */}
        {messages.length > 0 && (
          <div className="flex-1 min-h-0">
            <motion.div
              key="chat-messages"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="h-full"
            >
              <DeepQueryChat messages={messages} isLoading={showLoadingInThisThread} loadingStatus={showLoadingStatusInThisThread} setMessages={setMessages} />
            </motion.div>
          </div>
        )}

        {/* Input Container */}
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-3xl px-4">
              <DeepQueryEmptyState
                inputValue={inputValue}
                onInputChange={setInputValue}
                onSend={handleSendMessage}
                isLoading={showLoadingInThisThread}
                onMentionsChange={setMentions}
                voiceEnabled
                voiceDisabled={showLoadingInThisThread}
              />
            </div>
          </div>
        ) : (
          <div className="shrink-0 px-4 pb-4">
            <DeepQueryInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              isLoading={showLoadingInThisThread}
              className="max-w-4xl mx-auto"
              mentions={mentions}
              onMentionsChange={setMentions}
              voiceEnabled
              voiceDisabled={showLoadingInThisThread}
            />
            <p className="text-xs text-gray-400 text-center mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        )}
        </WallieVoiceShell>
      </div>
      </WallieVoiceProvider>
    </div>
  );
}

export default function DeepQuery() {
  return (
    <DeepQuerySidebarProvider>
      <DeepQueryContent />
    </DeepQuerySidebarProvider>
  );
}
