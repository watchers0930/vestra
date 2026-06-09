"use client";

import Link from "next/link";
import { Send, Bot, User, Sparkles, Trash2, Copy, Check, TrendingUp, FileText, Shield, Calculator, ArrowRight } from "lucide-react";
import { AuthGuard } from "@/components/auth/AuthGuard";
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
  } = useAssistantData();

  return (
    <AuthGuard featureName="AI 어시스턴트">
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
          <p style={{ fontSize: "10.5px", color: "#aeaeb2", textAlign: "center", margin: "8px 0 0", lineHeight: 1.5 }}>
            AI 답변은 참고용이며 전문가 상담을 대체하지 않습니다.
          </p>
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
    </AuthGuard>
  );
}
