"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageCircle, ChevronRight } from "lucide-react";

const TYPE_LABEL: Record<string, string> = { JEONSE: "전세", SALE: "매매" };
const STATUS_LABEL: Record<string, string> = {
  PENDING: "검토 중", ACCEPTED: "수락됨", REJECTED: "거절됨", WITHDRAWN: "철회됨",
};

interface Chat {
  applicationId: string;
  status: string;
  address: string;
  listingType: string;
  partner: { id: string; name: string | null };
  lastMessage: { content: string; createdAt: string } | null;
  unreadCount: number;
  updatedAt: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default function ChatListPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages/chats")
      .then((r) => r.json())
      .then((d) => setChats(d.chats ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ width: "100%", paddingBottom: 48 }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, color: "#1d1d1f", marginBottom: 20, letterSpacing: "-0.02em" }}>
        채팅
      </h1>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 76, borderRadius: 16, background: "#f5f5f7" }} />
          ))}
        </div>
      ) : chats.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#aeaeb2" }}>
          <MessageCircle size={40} strokeWidth={1} style={{ margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "#6e6e73" }}>진행 중인 채팅이 없습니다</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>계약의향서를 주고받으면 채팅이 시작됩니다</p>
          <Link
            href="/listings"
            style={{
              display: "inline-block", marginTop: 20, padding: "10px 24px",
              borderRadius: 100, background: "#0071e3", color: "#fff",
              fontSize: 14, fontWeight: 600, textDecoration: "none",
            }}
          >
            매물 보러 가기
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {chats.map((chat) => (
            <Link
              key={chat.applicationId}
              href={`/chat/${chat.applicationId}`}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "16px 4px", borderBottom: "1px solid #f2f2f7",
                textDecoration: "none", position: "relative",
              }}
            >
              {/* 아바타 */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "#0071e3",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: 16, fontWeight: 700, flexShrink: 0,
                position: "relative",
              }}>
                {(chat.partner.name ?? "?")[0]}
                {chat.unreadCount > 0 && (
                  <span style={{
                    position: "absolute", top: -2, right: -2,
                    background: "#ff3b30", color: "#fff",
                    fontSize: 10, fontWeight: 700,
                    width: 16, height: 16, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {chat.unreadCount}
                  </span>
                )}
              </div>

              {/* 내용 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>
                    {chat.partner.name ?? "상대방"}
                  </span>
                  <span style={{ fontSize: 11, color: "#aeaeb2", flexShrink: 0 }}>
                    {chat.lastMessage ? timeAgo(chat.lastMessage.createdAt) : timeAgo(chat.updatedAt)}
                  </span>
                </div>
                <p style={{
                  fontSize: 13, color: "#6e6e73", margin: 0,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {chat.lastMessage?.content ?? `${TYPE_LABEL[chat.listingType] ?? chat.listingType} · ${chat.address}`}
                </p>
                <p style={{ fontSize: 11, color: "#aeaeb2", margin: "2px 0 0" }}>
                  {chat.address} · {STATUS_LABEL[chat.status] ?? chat.status}
                </p>
              </div>

              <ChevronRight size={16} strokeWidth={2} style={{ color: "#d2d2d7", flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
