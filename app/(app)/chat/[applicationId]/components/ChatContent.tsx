"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Send, Loader2 } from "lucide-react";
import { useChat } from "../hooks/useChat";

function formatTime(iso: string) {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
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

  // 새 메시지 오면 스크롤 하단
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const text = input;
    setInput("");
    await send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // 날짜 구분선 표시용
  let lastDate = "";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 60px)", maxWidth: 680 }}>
      {/* 헤더 */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 0 12px",
        borderBottom: "1px solid #e5e5ea", flexShrink: 0,
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#6e6e73", display: "flex", padding: 4 }}
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>{partnerName}</p>
          <p style={{ fontSize: 11, color: "#aeaeb2", margin: 0, marginTop: 1 }}>{address}</p>
        </div>
      </div>

      {/* 메시지 목록 */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 0" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
            <Loader2 size={24} strokeWidth={1.5} style={{ animation: "spin 1s linear infinite", color: "#aeaeb2" }} />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60, color: "#aeaeb2", fontSize: 14 }}>
            <p>아직 메시지가 없습니다.</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>계약 조건에 대해 자유롭게 문의해 보세요.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.senderId === session?.user?.id;
            const dateStr = formatDate(msg.createdAt);
            const showDate = dateStr !== lastDate;
            lastDate = dateStr;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0" }}>
                    <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
                    <span style={{ fontSize: 11, color: "#aeaeb2", whiteSpace: "nowrap" }}>{dateStr}</span>
                    <div style={{ flex: 1, height: 1, background: "#e5e5ea" }} />
                  </div>
                )}
                <div style={{
                  display: "flex", flexDirection: isMine ? "row-reverse" : "row",
                  alignItems: "flex-end", gap: 6, marginBottom: 8,
                }}>
                  {/* 상대방 아바타 */}
                  {!isMine && (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", background: "#0071e3",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(msg.sender.name ?? "?")[0]}
                    </div>
                  )}
                  <div style={{ maxWidth: "70%", display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", gap: 2 }}>
                    {!isMine && (
                      <span style={{ fontSize: 11, color: "#6e6e73", marginLeft: 2 }}>{msg.sender.name ?? "상대방"}</span>
                    )}
                    <div style={{
                      padding: "10px 14px", borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      background: isMine ? "#0071e3" : "#f2f2f7",
                      color: isMine ? "#fff" : "#1d1d1f",
                      fontSize: 14, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "pre-wrap",
                    }}>
                      {msg.content}
                    </div>
                    <span style={{ fontSize: 10, color: "#aeaeb2" }}>{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 에러 */}
      {error && (
        <p style={{ fontSize: 12, color: "#c0392b", padding: "4px 0", flexShrink: 0 }}>{error}</p>
      )}

      {/* 입력창 */}
      <div style={{
        display: "flex", gap: 8, alignItems: "flex-end",
        borderTop: "1px solid #e5e5ea", paddingTop: 12, flexShrink: 0, paddingBottom: 8,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요 (Enter로 전송)"
          rows={1}
          style={{
            flex: 1, border: "1px solid #d2d2d7", borderRadius: 20,
            padding: "10px 14px", fontSize: 14, outline: "none", resize: "none",
            background: "#f5f5f7", lineHeight: 1.5, maxHeight: 100, overflowY: "auto",
            fontFamily: "inherit",
          }}
          onInput={(e) => {
            const t = e.currentTarget;
            t.style.height = "auto";
            t.style.height = `${Math.min(t.scrollHeight, 100)}px`;
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: sending || !input.trim() ? "#d2d2d7" : "#0071e3",
            border: "none", cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", flexShrink: 0, transition: "background 0.15s",
          }}
        >
          {sending
            ? <Loader2 size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
            : <Send size={16} strokeWidth={2} />
          }
        </button>
      </div>
    </div>
  );
}
