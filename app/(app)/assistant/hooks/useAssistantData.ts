"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AnalysisHistoryEntry {
  type: "contract" | "rights" | "jeonse" | "tax";
  timestamp: string;
  summary: string;
  safetyScore?: number;
  address?: string;
}

// ---------------------------------------------------------------------------
// Helpers (localStorage utils — no side effects at module level)
// ---------------------------------------------------------------------------
const STORAGE_KEY = "vestra_assistant_messages";
const HISTORY_KEY = "vestra_analysis_history";
const MAX_STORED_MESSAGES = 100;
const MAX_HISTORY_ENTRIES = 3;
const GUEST_LIMIT = 3;
const GUEST_COUNT_KEY = "vestra_guest_chat_count";

function loadMessages(): Message[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as Message[];
  } catch {
    return [];
  }
}

function saveMessages(messages: Message[]) {
  try {
    const trimmed = messages.slice(-MAX_STORED_MESSAGES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full or unavailable
  }
}

function loadAnalysisHistory(): AnalysisHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    return (JSON.parse(stored) as AnalysisHistoryEntry[]).slice(-MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

function getContextPrefix(): string {
  if (typeof window === "undefined") return "";
  const parts: string[] = [];

  // 최근 분석 주소
  try {
    const lastAddress = localStorage.getItem("vestra_last_address");
    if (lastAddress) {
      parts.push(`최근 분석한 주소: ${lastAddress}`);
    }
  } catch {
    // ignore
  }

  // 분석 히스토리
  const history = loadAnalysisHistory();
  if (history.length > 0) {
    const typeLabels: Record<string, string> = {
      contract: "계약검토", rights: "권리분석", jeonse: "전세분석", tax: "세금계산",
    };
    const summaries = history.map((h) => {
      const label = typeLabels[h.type] || h.type;
      const score = h.safetyScore !== undefined ? ` (안전점수 ${h.safetyScore}점)` : "";
      const addr = h.address ? ` - ${h.address}` : "";
      return `${label}${addr}${score}: ${h.summary}`;
    });
    parts.push(`최근 분석 이력:\n${summaries.join("\n")}`);
  }

  if (parts.length === 0) return "";
  return `[사용자 컨텍스트]\n${parts.join("\n")}\n\n`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAssistantData() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore messages and guest count from localStorage on mount
  useEffect(() => {
    setMessages(loadMessages());
    if (typeof window !== "undefined") {
      const count = parseInt(localStorage.getItem(GUEST_COUNT_KEY) || "0", 10);
      setGuestCount(count);
    }
    setHydrated(true);
  }, []);

  // Persist messages whenever they change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveMessages(messages);
    }
  }, [messages, hydrated]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleCopy = useCallback(async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    // 비회원 횟수 제한
    if (!session?.user) {
      const currentCount = parseInt(localStorage.getItem(GUEST_COUNT_KEY) || "0", 10);
      if (currentCount >= GUEST_LIMIT) {
        setShowSignupModal(true);
        return;
      }
    }

    const userMessage: Message = {
      role: "user",
      content: messageText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    try {
      const contextPrefix = getContextPrefix();
      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Prepend context to the first user message if available
      if (contextPrefix && allMessages.length > 0) {
        const firstUserIdx = allMessages.findIndex((m) => m.role === "user");
        if (firstUserIdx >= 0) {
          allMessages[firstUserIdx] = {
            ...allMessages[firstUserIdx],
            content: contextPrefix + allMessages[firstUserIdx].content,
          };
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages, stream: true }),
      });

      // 스트리밍 응답 처리
      if (res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamingContent(fullContent);
              }
            } catch {
              // 개별 청크 파싱 실패 무시
            }
          }
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: fullContent || "응답을 받지 못했습니다.",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingContent("");
      } else {
        // 일반 JSON 응답 (폴백)
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const assistantMessage: Message = {
          role: "assistant",
          content: data.content,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }

      // 비회원 사용 횟수 증가
      if (!session?.user) {
        const newCount = parseInt(localStorage.getItem(GUEST_COUNT_KEY) || "0", 10) + 1;
        localStorage.setItem(GUEST_COUNT_KEY, String(newCount));
        setGuestCount(newCount);
      }
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "죄송합니다. 응답 생성 중 오류가 발생했습니다. API 키 설정을 확인해주세요.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setStreamingContent("");
    } finally {
      setLoading(false);
    }
  };

  const isGuest = !session?.user;
  const guestRemaining = Math.max(0, GUEST_LIMIT - guestCount);

  return {
    messages,
    input,
    setInput,
    loading,
    copiedIdx,
    streamingContent,
    messagesEndRef,
    clearConversation,
    handleCopy,
    sendMessage,
    showSignupModal,
    setShowSignupModal,
    isGuest,
    guestRemaining,
  };
}
