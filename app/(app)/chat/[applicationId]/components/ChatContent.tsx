"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Send, Loader2, MapPin } from "lucide-react";
import { useChat } from "../hooks/useChat";

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 || 12;
  return `${ampm} ${h12}:${m}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

interface Props {
  applicationId: string;
  partnerName: string;
  address: string;
}

export function ChatContent({ applicationId, partnerName, address }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const { messages, loading, sending, error, send } = useChat(applicationId);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    inputRef.current!.style.height = "auto";
    await send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // 이니셜 색상 — 이름 첫 글자 기반으로 고정 색상
  const AVATAR_COLORS = ["var(--brand-primary)", "#34c759", "#ff9500", "#af52de", "#ff3b30", "#5856d6"];
  const avatarColor = AVATAR_COLORS[(partnerName.charCodeAt(0) || 0) % AVATAR_COLORS.length];

  let lastDate = "";

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 96px)",
      maxWidth: 720,
      margin: "0 auto",
    }}>
      {/* ── 헤더 ── */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
        flexShrink: 0,
        marginBottom: 12,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: "#f5f5f7", border: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          <ChevronLeft size={18} strokeWidth={2.5} style={{ color: "#3d3d3f" }} />
        </button>

        {/* 아바타 */}
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: avatarColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 16, fontWeight: 800, flexShrink: 0,
          letterSpacing: "-0.02em",
        }}>
          {(partnerName ?? "?")[0]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", margin: 0, lineHeight: 1.3 }}>
            {partnerName}
          </p>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 11, color: "#6e6e73", marginTop: 2,
          }}>
            <MapPin size={10} strokeWidth={2} style={{ color: "#aeaeb2" }} />
            {address}
          </span>
        </div>
      </div>

      {/* ── 메시지 목록 ── */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "4px 4px 8px",
        display: "flex",
        flexDirection: "column",
      }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
            <Loader2 size={22} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", color: "#aeaeb2" }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "0 24px", textAlign: "center",
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18,
              background: "#f0f5ff", display: "flex",
              alignItems: "center", justifyContent: "center",
              marginBottom: 14,
            }}>
              <Send size={24} strokeWidth={1.5} style={{ color: "var(--brand-primary)" }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", marginBottom: 6 }}>
              첫 메시지를 보내보세요
            </p>
            <p style={{ fontSize: 13, color: "#aeaeb2", lineHeight: 1.6 }}>
              계약 조건이나 매물에 관해<br />자유롭게 문의하세요.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === session?.user?.id;
            const dateStr = formatDate(msg.createdAt);
            const showDate = dateStr !== lastDate;
            lastDate = dateStr;

            return (
              <div key={msg.id}>
                {/* 날짜 구분선 */}
                {showDate && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 10,
                    margin: "16px 0 12px",
                  }}>
                    <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
                    <span style={{
                      fontSize: 11, color: "#aeaeb2", fontWeight: 500,
                      padding: "3px 10px", borderRadius: 20,
                      background: "#f5f5f7", whiteSpace: "nowrap",
                    }}>
                      {dateStr}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
                  </div>
                )}

                {/* 메시지 행 */}
                <div style={{
                  display: "flex",
                  flexDirection: isMine ? "row-reverse" : "row",
                  alignItems: "flex-end",
                  gap: 8,
                  marginBottom: 6,
                  padding: "0 4px",
                }}>
                  {/* 상대방 아바타 */}
                  {!isMine && (
                    <div style={{
                      width: 34, height: 34, borderRadius: 11,
                      background: avatarColor,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(msg.sender.name ?? "?")[0]}
                    </div>
                  )}

                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isMine ? "flex-end" : "flex-start",
                    gap: 3,
                    maxWidth: "72%",
                  }}>
                    {!isMine && (
                      <span style={{ fontSize: 11, color: "#6e6e73", fontWeight: 600, paddingLeft: 4 }}>
                        {msg.sender.name ?? "상대방"}
                      </span>
                    )}

                    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, flexDirection: isMine ? "row-reverse" : "row" }}>
                      <div style={{
                        padding: "10px 14px",
                        borderRadius: isMine
                          ? "18px 4px 18px 18px"
                          : "4px 18px 18px 18px",
                        background: isMine ? "var(--brand-primary)" : "#f2f2f7",
                        color: isMine ? "#fff" : "#1d1d1f",
                        fontSize: 14, lineHeight: 1.55,
                        wordBreak: "break-word", whiteSpace: "pre-wrap",
                        boxShadow: isMine
                          ? "0 2px 8px rgba(0,113,227,0.25)"
                          : "0 1px 4px rgba(0,0,0,0.07)",
                      }}>
                        {msg.content}
                      </div>
                      <span style={{ fontSize: 10, color: "#aeaeb2", whiteSpace: "nowrap", paddingBottom: 2 }}>
                        {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── 에러 ── */}
      {error && (
        <div style={{
          padding: "8px 14px", borderRadius: 10, fontSize: 12, color: "#c0392b",
          background: "rgba(255,59,48,0.06)", margin: "4px 0", flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* ── 입력창 ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 10,
        padding: "10px 14px",
        background: "#fff",
        borderRadius: 16,
        border: "1px solid rgba(0,0,0,0.09)",
        boxShadow: "0 -1px 8px rgba(0,0,0,0.05)",
        flexShrink: 0,
        marginTop: 8,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
          rows={1}
          style={{
            flex: 1,
            border: "1px solid #e5e5ea",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 14,
            outline: "none",
            resize: "none",
            background: "#f9f9f9",
            lineHeight: 1.55,
            maxHeight: 120,
            overflowY: "auto",
            fontFamily: "inherit",
            color: "#1d1d1f",
            transition: "border-color 0.15s, background 0.15s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--brand-primary)";
            e.currentTarget.style.background = "#fff";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "#e5e5ea";
            e.currentTarget.style.background = "#f9f9f9";
          }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            width: 42, height: 42,
            borderRadius: 13,
            background: sending || !input.trim() ? "#e5e5ea" : "var(--brand-primary)",
            border: "none",
            cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flexShrink: 0,
            transition: "background 0.15s, transform 0.1s",
            boxShadow: sending || !input.trim() ? "none" : "0 2px 8px rgba(0,113,227,0.3)",
          }}
          onMouseDown={(e) => { if (!sending && input.trim()) e.currentTarget.style.transform = "scale(0.93)"; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          {sending
            ? <Loader2 size={17} strokeWidth={2.2} style={{ animation: "spin 1s linear infinite" }} />
            : <Send size={17} strokeWidth={2.2} style={{ marginLeft: 1 }} />
          }
        </button>
      </div>
    </div>
  );
}
