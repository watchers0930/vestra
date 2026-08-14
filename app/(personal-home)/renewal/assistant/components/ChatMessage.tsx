"use client";

import Link from "next/link";
import s from "../assistant.module.css";
import type { Message } from "@/app/(app)/assistant/hooks/useAssistantData";

// 분석 페이지 바로가기 패턴 → renewal 라우트로 연결
const ANALYSIS_LINKS: { pattern: RegExp; href: string; label: string }[] = [
  { pattern: /전세\s*보호|전세\s*분석|전세분석|보증보험|전세가율/i, href: "/renewal/jeonse", label: "전세보호" },
  { pattern: /권리\s*분석|권리분석|근저당|선순위/i, href: "/renewal/rights", label: "권리분석" },
  { pattern: /계약서|계약\s*검토|특약|독소조항/i, href: "/renewal/contract", label: "계약검토" },
  { pattern: /세금\s*계산|세금계산|취득세|양도세|보험료/i, href: "/renewal/tax", label: "세금계산" },
  { pattern: /시세|시세지도|매매가/i, href: "/renewal/price-map", label: "시세지도" },
];

function getLinkedPages(content: string): { href: string; label: string }[] {
  const found: { href: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const { pattern, href, label } of ANALYSIS_LINKS) {
    if (pattern.test(content) && !seen.has(href)) {
      seen.add(href);
      found.push({ href, label });
    }
  }
  return found;
}

function ChipIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function AiAvatar() {
  return (
    <div className={s.msgAvatar}>
      <svg viewBox="0 0 24 24">
        <path d="M12 3a2 2 0 0 1 2 2v1h1a3 3 0 0 1 3 3v1a2 2 0 0 1 0 4v1a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-1a2 2 0 0 1 0-4V9a3 3 0 0 1 3-3h1V5a2 2 0 0 1 2-2z" />
        <path d="M9.5 12h.01M14.5 12h.01" />
      </svg>
    </div>
  );
}

function UserAvatar() {
  return (
    <div className={s.msgAvatar}>
      <svg viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    </div>
  );
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export function ChatMessage({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  const links = isUser ? [] : getLinkedPages(msg.content);

  return (
    <div className={`${s.msg} ${isUser ? s.msgUser : s.msgAi}`}>
      {isUser ? <UserAvatar /> : <AiAvatar />}
      <div className={s.msgCol}>
        <div className={s.bubble}>{msg.content}</div>
        {links.length > 0 && (
          <div className={s.linkChips}>
            {links.map(({ href, label }) => (
              <Link key={href} href={href} className={s.linkChip}>
                <ChipIcon />
                {label} 바로가기
              </Link>
            ))}
          </div>
        )}
        <div className={s.msgTime}>{formatTime(msg.timestamp)}</div>
      </div>
    </div>
  );
}

// 스트리밍 중 임시 AI 말풍선 (커서 포함)
export function StreamingMessage({ content }: { content: string }) {
  return (
    <div className={`${s.msg} ${s.msgAi}`}>
      <AiAvatar />
      <div className={s.msgCol}>
        <div className={s.bubble}>
          {content}
          <span className={s.cursor} />
        </div>
      </div>
    </div>
  );
}

// 응답 대기(스트리밍 시작 전) 타이핑 인디케이터
export function TypingIndicator() {
  return (
    <div className={`${s.msg} ${s.msgAi}`} aria-busy="true">
      <AiAvatar />
      <div className={s.msgCol}>
        <div className={s.bubble}>
          <div className={s.typing}>
            <span style={{ animationDelay: "0ms" }} />
            <span style={{ animationDelay: "180ms" }} />
            <span style={{ animationDelay: "360ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
