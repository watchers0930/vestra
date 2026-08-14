"use client";

import { useEffect } from "react";
import { useAssistantData } from "@/app/(app)/assistant/hooks/useAssistantData";
import s from "./assistant.module.css";
import RenewalGnb from "../_shared/RenewalGnb";
import {
  AssistantSubHero,
  AssistantIntro,
  AssistantLinkBanner,
  AssistantFooter,
} from "./components/AssistantChrome";
import { ChatMessage, StreamingMessage, TypingIndicator } from "./components/ChatMessage";

// 빠른 시작 — 자주 묻는 질문 (시안 그대로)
const QUICK_STARTS: { icon: React.ReactNode; text: string }[] = [
  { icon: <svg className={s.qsIco} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, text: "전세 계약 시 주의할 점은?" },
  { icon: <svg className={s.qsIco} viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="14" x2="10" y2="14" /><line x1="14" y1="14" x2="16" y2="14" /><line x1="8" y1="18" x2="10" y2="18" /></svg>, text: "이 매물 취득세는 얼마인가요?" },
  { icon: <svg className={s.qsIco} viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>, text: "이 지역 시세는 어떤가요?" },
  { icon: <svg className={s.qsIco} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>, text: "계약서에 꼭 넣어야 할 특약은?" },
  { icon: <svg className={s.qsIco} viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, text: "전세보증보험 가입 요건은?" },
  { icon: <svg className={s.qsIco} viewBox="0 0 24 24"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>, text: "근저당 70% 초과면 위험한가요?" },
];

export default function AssistantClient() {
  const {
    messages, input, setInput, loading, streamingContent, messagesEndRef,
    sendMessage, isGuest, guestRemaining,
  } = useAssistantData();

  // 새 메시지/스트리밍 시 하단으로 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent, loading, messagesEndRef]);

  return (
    <div className={s.page}>
      <RenewalGnb active="assistant" />
      <AssistantSubHero />

      <div className={s.pageWrap}>
        <AssistantIntro />

        {/* QUICK START */}
        <p className={s.qsTitle}>빠른 시작 — 자주 묻는 질문</p>
        <div className={s.qsGrid}>
          {QUICK_STARTS.map(({ icon, text }) => (
            <button
              key={text}
              type="button"
              className={s.qsBtn}
              onClick={() => sendMessage(text)}
              disabled={loading}
            >
              {icon}
              {text}
            </button>
          ))}
        </div>

        {/* CHAT SHELL */}
        <div className={s.chatShell}>
          <div className={s.chatHead}>
            <span className={s.chatHeadDot} />
            <span className={s.chatHeadT}>VESTRA AI 어시스턴트</span>
            <span className={s.chatHeadS}>GPT 기반 · 부동산 특화</span>
          </div>

          <div className={s.chatBody} role="log" aria-live="polite" aria-label="채팅 메시지">
            {messages.map((msg, i) => (
              <ChatMessage key={i} msg={msg} />
            ))}

            {loading && streamingContent && <StreamingMessage content={streamingContent} />}
            {loading && !streamingContent && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT BAR */}
          <div className={s.chatInputWrap}>
            <div className={s.chatInputRow}>
              <input
                className={s.chatInput}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="부동산에 관해 무엇이든 물어보세요…"
                aria-label="메시지 입력"
                disabled={loading}
              />
              <button
                className={s.sendBtn}
                type="button"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                aria-label="메시지 전송"
              >
                <svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
            <div className={s.inputFoot}>
              <p>AI 답변은 참고용이며 전문가 상담을 대체하지 않습니다.</p>
              {isGuest ? (
                <span className={`${s.freeTag} ${guestRemaining <= 1 ? s.freeTagWarn : ""}`}>
                  무료 {guestRemaining}회 남음
                </span>
              ) : (
                <span className={s.freeTag}>권리분석 결과 연동 중</span>
              )}
            </div>
          </div>
        </div>

        <AssistantLinkBanner />
      </div>

      <AssistantFooter />
    </div>
  );
}
