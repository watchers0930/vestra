"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Send, Loader2, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useChat, type ChatMessage } from "../../../chat/[applicationId]/hooks/useChat";

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
}

interface ChatModalProps {
  listingId: string;
  partnerName: string;
  address: string;
  onClose: () => void;
}

export function ChatModal({ listingId, partnerName, address, onClose }: ChatModalProps) {
  const { data: session } = useSession();
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [channelLoading, setChannelLoading] = useState(true);
  const [channelError, setChannelError] = useState("");

  // 채팅 채널(의향서) 확보
  useEffect(() => {
    fetch(`/api/listings/${listingId}/chat-channel`)
      .then((r) => r.json())
      .then((d) => {
        if (d.applicationId) setApplicationId(d.applicationId);
        else setChannelError(d.error ?? "채널을 열 수 없습니다.");
      })
      .catch(() => setChannelError("네트워크 오류가 발생했습니다."))
      .finally(() => setChannelLoading(false));
  }, [listingId]);

  return createPortal(
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "flex-end", pointerEvents: "none" }}
    >
      {/* 모달 카드 */}
      <div
        style={{
          pointerEvents: "auto",
          width: 380,
          height: 520,
          marginRight: 24,
          marginBottom: 24,
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 8px 48px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid rgba(0,0,0,0.07)",
        }}
      >
        {/* 헤더 */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid #f2f2f7", flexShrink: 0, background: "#fff" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#0071e3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <MessageCircle size={16} strokeWidth={2} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>{partnerName}</p>
            <p style={{ fontSize: 11, color: "#aeaeb2", margin: 0, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{address}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8e8e93", display: "flex", padding: 4, borderRadius: 8 }}>
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* 본문 */}
        {channelLoading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 size={24} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", color: "#aeaeb2" }} />
          </div>
        ) : channelError ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
            <p style={{ fontSize: 13, color: "#c0392b", textAlign: "center" }}>{channelError}</p>
          </div>
        ) : applicationId ? (
          <ChatBody applicationId={applicationId} myId={session?.user?.id ?? ""} />
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function ChatBody({ applicationId, myId }: { applicationId: string; myId: string }) {
  const { messages, loading, sending, error, send } = useChat(applicationId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  let lastDate = "";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 32 }}>
            <Loader2 size={20} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", color: "#aeaeb2" }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 48, color: "#aeaeb2" }}>
            <p style={{ fontSize: 13 }}>아직 메시지가 없습니다.</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>계약 조건에 대해 자유롭게 문의해 보세요.</p>
          </div>
        ) : (
          messages.map((msg: ChatMessage) => {
            const isMine = msg.senderId === myId;
            const dateStr = formatDate(msg.createdAt);
            const showDate = dateStr !== lastDate;
            lastDate = dateStr;
            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "8px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "#f2f2f7" }} />
                    <span style={{ fontSize: 10, color: "#c7c7cc" }}>{dateStr}</span>
                    <div style={{ flex: 1, height: 1, background: "#f2f2f7" }} />
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", alignItems: "flex-end", gap: 5, marginBottom: 6 }}>
                  {!isMine && (
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#0071e3", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                      {(msg.sender.name ?? "?")[0]}
                    </div>
                  )}
                  <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", gap: 2 }}>
                    <div style={{ padding: "8px 12px", borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isMine ? "#0071e3" : "#f2f2f7", color: isMine ? "#fff" : "#1d1d1f", fontSize: 13, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap" }}>
                      {msg.content}
                    </div>
                    <span style={{ fontSize: 10, color: "#c7c7cc" }}>{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 오류 */}
      {error && <p style={{ fontSize: 11, color: "#c0392b", padding: "2px 14px", flexShrink: 0 }}>{error}</p>}

      {/* 입력창 */}
      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", borderTop: "1px solid #f2f2f7", padding: "10px 12px", flexShrink: 0 }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지 입력 (Enter 전송)"
          rows={1}
          style={{ flex: 1, border: "1px solid #e5e5ea", borderRadius: 16, padding: "8px 12px", fontSize: 13, outline: "none", resize: "none", background: "#f9f9fb", lineHeight: 1.5, maxHeight: 80, overflowY: "auto", fontFamily: "inherit" }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = `${Math.min(t.scrollHeight, 80)}px`;
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{ width: 36, height: 36, borderRadius: "50%", background: sending || !input.trim() ? "#e5e5ea" : "#0071e3", border: "none", cursor: sending || !input.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0, transition: "background 0.15s" }}
        >
          {sending
            ? <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
            : <Send size={14} strokeWidth={2} />
          }
        </button>
      </div>
    </>
  );
}
