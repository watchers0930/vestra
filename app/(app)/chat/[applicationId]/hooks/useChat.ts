"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender: { id: string; name: string | null };
}

export function useChat(applicationId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const latestRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async (after?: string) => {
    try {
      const url = after
        ? `/api/messages?applicationId=${applicationId}&after=${encodeURIComponent(after)}`
        : `/api/messages?applicationId=${applicationId}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data: { messages: ChatMessage[] } = await res.json();
      if (data.messages.length === 0) return;

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const fresh = data.messages.filter((m) => !existingIds.has(m.id));
        if (fresh.length === 0) return prev;
        return [...prev, ...fresh];
      });
      latestRef.current = data.messages[data.messages.length - 1].createdAt;
    } catch {
      // 네트워크 오류 무시 (polling 재시도)
    }
  }, [applicationId]);

  // 초기 로드
  useEffect(() => {
    fetchMessages().finally(() => setLoading(false));
  }, [fetchMessages]);

  // 3초 polling
  useEffect(() => {
    const timer = setInterval(() => {
      fetchMessages(latestRef.current ?? undefined);
    }, 3000);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  async function send(content: string) {
    if (!content.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, content: content.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "전송에 실패했습니다.");
      }
      const { message }: { message: ChatMessage } = await res.json();
      setMessages((prev) => [...prev, message]);
      latestRef.current = message.createdAt;
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송 오류");
    } finally {
      setSending(false);
    }
  }

  return { messages, loading, sending, error, send };
}
