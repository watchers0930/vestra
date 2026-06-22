"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Send, Bot, User, Sparkles, Trash2, Copy, Check, TrendingUp, FileText, Shield, Calculator, ArrowRight, X } from "lucide-react";
import { CategoryHero } from "@/components/common/CategoryHero";
import { DashboardPageTopbar } from "@/components/common/DashboardPageChrome";
import { useAssistantData } from "./hooks/useAssistantData";

const EXAMPLE_QUESTIONS = [
  { icon: Shield,     text: "전세 계약 시 주의할 점은?" },
  { icon: Calculator, text: "1세대 1주택 양도세 비과세 요건" },
  { icon: FileText,   text: "계약서에 꼭 넣어야 할 특약은?" },
  { icon: TrendingUp, text: "2026년 부동산 시장 전망" },
  { icon: Shield,     text: "전세 보증보험 가입 요건은?" },
  { icon: FileText,   text: "근저당 70% 초과 시 위험도는?" },
];

// 분석 페이지 바로가기 패턴
const ANALYSIS_LINKS: { pattern: RegExp; href: string; label: string }[] = [
  { pattern: /전세\s*분석|전세분석|\/jeonse\/analysis/i, href: "/jeonse/analysis", label: "전세분석" },
  { pattern: /계약서\s*분석|계약\s*분석|\/contract/i,     href: "/contract",        label: "계약검토" },
  { pattern: /권리\s*분석|권리분석|\/rights/i,            href: "/rights",          label: "권리분석" },
  { pattern: /세금\s*계산|세금계산기|\/tax/i,             href: "/tax",             label: "세금계산" },
  { pattern: /시세\s*전망|시세전망|\/prediction/i,        href: "/prediction",      label: "시세전망" },
];

function getLinkedPages(content: string): { href: string; label: string }[] {
  const found: { href: string; label: string }[] = [];
  for (const { pattern, href, label } of ANALYSIS_LINKS) {
    if (pattern.test(content)) {
      found.push({ href, label });
    }
  }
  return found;
}

export default function AssistantPage() {
  const {
    messages, input, setInput, loading, copiedIdx,
    streamingContent, messagesEndRef, clearConversation, handleCopy, sendMessage,
    showSignupModal, setShowSignupModal, isGuest, guestRemaining,
  } = useAssistantData();

  return (
    <>
    <div>
      <DashboardPageTopbar current="AI 어시스턴트" primaryHref="/contract" primaryLabel="계약검토" />
      <div className="flex min-h-[calc(100vh-72px)] flex-col pb-20 pt-[52px]">
        <CategoryHero
          badge="✨ AI 어시스턴트"
          title="부동산 전문 AI 상담"
          description={<>권리분석, 세무, 투자, 계약, 전세보호 질문을<br />하나의 대화 흐름에서 확인합니다.</>}
          actions={messages.length > 0 ? (
            <button
              onClick={clearConversation}
              className="inline-flex items-center gap-[6px] rounded-full px-[18px] py-[11px] text-[13px] font-semibold transition-colors"
              style={{
                background: "rgba(255,59,48,0.10)",
                border: "1px solid rgba(255,59,48,0.18)",
                color: "#ff7b73",
              }}
            >
              <Trash2 size={14} strokeWidth={2} />
              초기화
            </button>
          ) : undefined}
        />

      {/* ── 채팅 영역 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden", minHeight: "560px" }}>

        {/* 메시지 목록 */}
        <div
          role="log"
          aria-label="채팅 메시지"
          aria-live="polite"
          style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}
        >
          {/* 빈 상태 */}
          {messages.length === 0 && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "32px 16px" }}>
              <div style={{ width: "60px", height: "60px", borderRadius: "18px", background: "linear-gradient(148deg, #0c1527, #141820)", border: "1px solid rgba(0,113,227,0.20)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px", boxShadow: "0 4px 20px rgba(0,113,227,0.15)" }}>
                <Sparkles size={26} strokeWidth={1.5} style={{ color: "#2997ff" }} />
              </div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 6px" }}>VESTRA AI 어시스턴트</h3>
              <p style={{ fontSize: "13px", color: "#6e6e73", margin: "0 0 24px", lineHeight: 1.6 }}>
                부동산 권리분석, 세무, 투자, 계약, 전세 보호 등<br />
                부동산에 관한 모든 질문에 답변해 드립니다.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", maxWidth: "480px", width: "100%" }}>
                {EXAMPLE_QUESTIONS.map(({ icon: Icon, text }, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(text)}
                    style={{ display: "flex", alignItems: "center", gap: "8px", textAlign: "left", padding: "10px 14px", borderRadius: "12px", background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.07)", cursor: "pointer", fontSize: "12px", fontWeight: 500, color: "#3d3d3f", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#ebebed"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,113,227,0.20)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f7"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,0,0,0.07)"; }}
                  >
                    <Icon size={13} strokeWidth={1.5} style={{ color: "#0071e3", flexShrink: 0 }} />
                    {text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 메시지 */}
          {messages.map((msg, i) => {
            const linkedPages = msg.role === "assistant" ? getLinkedPages(msg.content) : [];
            return (
              <div key={i} style={{ display: "flex", gap: "10px", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(148deg, #0c1527, #141820)", border: "1px solid rgba(0,113,227,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,113,227,0.12)" }}>
                    <Bot size={16} strokeWidth={1.5} style={{ color: "#2997ff" }} />
                  </div>
                )}

                <div style={{ maxWidth: "78%", position: "relative" }} className="group/msg">
                  <div style={{
                    padding: "12px 16px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                    background: msg.role === "user"
                      ? "linear-gradient(148deg, #0071e3, #0058b0)"
                      : "#f5f5f7",
                    border: msg.role === "user" ? "none" : "1px solid rgba(0,0,0,0.07)",
                    boxShadow: msg.role === "user"
                      ? "0 4px 16px rgba(0,113,227,0.25)"
                      : "0 1px 4px rgba(0,0,0,0.05)",
                    fontSize: "13.5px",
                    lineHeight: "1.65",
                    color: msg.role === "user" ? "#fff" : "#1d1d1f",
                    whiteSpace: "pre-wrap",
                  }}>
                    {msg.content}
                  </div>

                  {/* 분석 페이지 바로가기 버튼 */}
                  {linkedPages.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                      {linkedPages.map(({ href, label }) => (
                        <Link
                          key={href}
                          href={href}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            padding: "6px 12px", borderRadius: "10px",
                            background: "rgba(0,113,227,0.06)", border: "1px solid rgba(0,113,227,0.15)",
                            fontSize: "11.5px", fontWeight: 600, color: "#0071e3",
                            textDecoration: "none", transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,113,227,0.12)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(0,113,227,0.06)"; }}
                        >
                          {label} 바로가기
                          <ArrowRight size={11} strokeWidth={2} />
                        </Link>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", paddingLeft: msg.role === "user" ? 0 : "2px", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                    <span style={{ fontSize: "10px", color: "#aeaeb2" }}>
                      {new Date(msg.timestamp).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {msg.role === "assistant" && (
                      <button
                        onClick={() => handleCopy(msg.content, i)}
                        aria-label="메시지 복사"
                        style={{ display: "flex", alignItems: "center", padding: "2px 6px", borderRadius: "6px", background: "rgba(0,0,0,0.05)", border: "none", cursor: "pointer", opacity: 0, transition: "opacity 0.15s" }}
                        className="group-hover/msg:opacity-100"
                      >
                        {copiedIdx === i
                          ? <Check size={11} strokeWidth={2} style={{ color: "#1a9e45" }} />
                          : <Copy size={11} strokeWidth={1.5} style={{ color: "#aeaeb2" }} />}
                      </button>
                    )}
                  </div>
                </div>

                {msg.role === "user" && (
                  <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "#e5e5e7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <User size={16} strokeWidth={1.5} style={{ color: "#6e6e73" }} />
                  </div>
                )}
              </div>
            );
          })}

          {/* 스트리밍 중 */}
          {loading && streamingContent && (
            <div style={{ display: "flex", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(148deg, #0c1527, #141820)", border: "1px solid rgba(0,113,227,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bot size={16} strokeWidth={1.5} style={{ color: "#2997ff" }} />
              </div>
              <div style={{ maxWidth: "78%" }}>
                <div style={{
                  padding: "12px 16px",
                  borderRadius: "4px 18px 18px 18px",
                  background: "#f5f5f7",
                  border: "1px solid rgba(0,0,0,0.07)",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  fontSize: "13.5px", lineHeight: "1.65", color: "#1d1d1f",
                  whiteSpace: "pre-wrap",
                }}>
                  {streamingContent}
                  <span style={{ display: "inline-block", width: "6px", height: "16px", background: "#0071e3", marginLeft: "2px", animation: "blink 0.8s step-end infinite", verticalAlign: "text-bottom" }} />
                </div>
              </div>
            </div>
          )}

          {/* 로딩 (아직 스트리밍 시작 전) */}
          {loading && !streamingContent && (
            <div aria-busy="true" style={{ display: "flex", gap: "10px" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "10px", background: "linear-gradient(148deg, #0c1527, #141820)", border: "1px solid rgba(0,113,227,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bot size={16} strokeWidth={1.5} style={{ color: "#2997ff" }} />
              </div>
              <div style={{ padding: "14px 18px", borderRadius: "4px 18px 18px 18px", background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.07)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#0071e3", opacity: 0.5, animation: "bounce 1.2s ease-in-out infinite", animationDelay: `${i * 180}ms`, display: "inline-block" }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── 입력창 ── */}
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", background: "rgba(245,245,247,0.60)", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="부동산에 관해 무엇이든 물어보세요..."
              aria-label="메시지 입력"
              disabled={loading}
              style={{ flex: 1, padding: "12px 16px", borderRadius: "14px", border: "1px solid rgba(0,0,0,0.12)", background: "#fff", fontSize: "13.5px", color: "#1d1d1f", outline: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "border-color 0.15s, box-shadow 0.15s" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(0,113,227,0.40)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,113,227,0.08)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="메시지 전송"
              style={{ width: "44px", height: "44px", borderRadius: "14px", background: loading || !input.trim() ? "#e5e5e7" : "linear-gradient(148deg, #0071e3, #0058b0)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: loading || !input.trim() ? "not-allowed" : "pointer", flexShrink: 0, boxShadow: loading || !input.trim() ? "none" : "0 4px 12px rgba(0,113,227,0.30)", transition: "all 0.15s" }}
            >
              <Send size={17} strokeWidth={2} style={{ color: loading || !input.trim() ? "#aeaeb2" : "#fff" }} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "8px 0 0" }}>
            <p style={{ fontSize: "10.5px", color: "#aeaeb2", lineHeight: 1.5 }}>
              AI 답변은 참고용이며 전문가 상담을 대체하지 않습니다.
            </p>
            {isGuest && (
              <span
                onClick={() => setShowSignupModal(true)}
                style={{
                  fontSize: "10.5px", fontWeight: 600, cursor: "pointer",
                  color: guestRemaining <= 1 ? "#ff3b30" : "#0071e3",
                  background: guestRemaining <= 1 ? "rgba(255,59,48,0.08)" : "rgba(0,113,227,0.08)",
                  padding: "2px 8px", borderRadius: "6px",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                무료 {guestRemaining}회 남음
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        .group\\/msg:hover .group-hover\\/msg\\:opacity-100 { opacity: 1 !important; }
      `}</style>
      </div>
    </div>

    {/* 회원가입 유도 모달 */}

    {showSignupModal && (
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowSignupModal(false); }}
      >
        <div style={{ width: "100%", maxWidth: "360px", background: "#fff", borderRadius: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.20)", padding: "32px 28px", position: "relative" }}>
          <button
            onClick={() => setShowSignupModal(false)}
            style={{ position: "absolute", top: "16px", right: "16px", width: "28px", height: "28px", borderRadius: "50%", background: "#f5f5f7", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={14} strokeWidth={2} style={{ color: "#6e6e73" }} />
          </button>

          <div style={{ textAlign: "center", marginBottom: "24px" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "18px", background: "linear-gradient(148deg, #0c1527, #141820)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 4px 20px rgba(0,113,227,0.2)" }}>
              <Sparkles size={24} strokeWidth={1.5} style={{ color: "#2997ff" }} />
            </div>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>무료 체험 3회를 모두 사용했습니다</h3>
            <p style={{ fontSize: "13px", color: "#6e6e73", lineHeight: 1.65, margin: 0 }}>
              회원가입하면 AI 상담을 <strong style={{ color: "#1d1d1f" }}>무제한</strong>으로 이용하고<br />
              전세분석, 권리분석 등 모든 기능을 사용할 수 있습니다.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              onClick={() => signIn("google", { callbackUrl: "/assistant" })}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%", padding: "13px 16px", borderRadius: "14px", border: "1px solid #e5e5e7", background: "#fff", fontSize: "14px", fontWeight: 500, color: "#1d1d1f", cursor: "pointer" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google로 무료 가입
            </button>
            <button
              onClick={() => signIn("naver", { callbackUrl: "/assistant" })}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", width: "100%", padding: "13px 16px", borderRadius: "14px", border: "none", background: "#03C75A", fontSize: "14px", fontWeight: 500, color: "#fff", cursor: "pointer" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M16.27 3H7.73A4.73 4.73 0 003 7.73v8.54A4.73 4.73 0 007.73 21h8.54A4.73 4.73 0 0021 16.27V7.73A4.73 4.73 0 0016.27 3zm-2.15 12.38l-2.6-3.71v3.71H9.06V8.62h2.46l2.6 3.71V8.62h2.46v6.76h-2.46z" fill="white" />
              </svg>
              네이버로 무료 가입
            </button>
            <Link
              href="/signup"
              style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: "14px", background: "#f5f5f7", fontSize: "13px", fontWeight: 500, color: "#3d3d3f", textDecoration: "none" }}
            >
              이메일로 회원가입
            </Link>
          </div>

          <p style={{ fontSize: "11px", color: "#aeaeb2", textAlign: "center", marginTop: "16px" }}>
            이미 계정이 있으신가요?{" "}
            <span onClick={() => signIn(undefined, { callbackUrl: "/assistant" })} style={{ color: "#0071e3", cursor: "pointer", fontWeight: 500 }}>로그인</span>
          </p>
        </div>
      </div>
    )}
    </>
  );
}
