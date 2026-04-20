"use client";

import { Send, Bot, User, Sparkles, Trash2, Copy, Check, MessageSquare, TrendingUp, FileText, Shield, Calculator } from "lucide-react";
import { useAssistantData } from "./hooks/useAssistantData";

const EXAMPLE_QUESTIONS = [
  { icon: Shield,     text: "전세 계약 시 주의할 점은?" },
  { icon: Calculator, text: "1세대 1주택 양도세 비과세 요건" },
  { icon: FileText,   text: "근저당 70% 초과 시 위험도는?" },
  { icon: TrendingUp, text: "2026년 부동산 시장 전망" },
  { icon: Calculator, text: "종합부동산세 계산 방법" },
  { icon: Shield,     text: "전세 보증보험 가입 요건은?" },
];

export default function AssistantPage() {
  const {
    messages, input, setInput, loading, copiedIdx,
    messagesEndRef, clearConversation, handleCopy, sendMessage,
  } = useAssistantData();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 3rem)", gap: 0 }}>

      {/* ── 다크 히어로 배너 ── */}
      <section style={{ position: "relative", overflow: "hidden", borderRadius: "24px", background: "linear-gradient(148deg, #141820 0%, #0c1527 50%, #0a1020 100%)", flexShrink: 0, marginTop: "10px", marginBottom: "16px" }}>
        <div style={{ pointerEvents: "none", position: "absolute", top: "-60px", right: "-20px", width: "220px", height: "220px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,113,227,0.20) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", bottom: "-40px", left: "30%", width: "160px", height: "160px", borderRadius: "50%", background: "radial-gradient(circle, rgba(41,151,255,0.10) 0%, transparent 65%)" }} />
        <div style={{ pointerEvents: "none", position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

        <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(0,113,227,0.20)", border: "1px solid rgba(0,113,227,0.30)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MessageSquare size={20} strokeWidth={1.5} style={{ color: "#2997ff" }} />
            </div>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "20px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#2997ff", background: "rgba(41,151,255,0.10)", border: "1px solid rgba(41,151,255,0.20)", marginBottom: "5px" }}>
                <Sparkles size={8} strokeWidth={2} /> AI 어시스턴트
              </div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1.2, letterSpacing: "-0.02em" }}>부동산 전문 AI</h2>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)", margin: "3px 0 0", lineHeight: 1.4 }}>권리분석 · 세무 · 투자 · 계약 · 전세보호</p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={clearConversation}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", background: "rgba(255,59,48,0.10)", border: "1px solid rgba(255,59,48,0.20)", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "#ff3b30" }}
            >
              <Trash2 size={13} strokeWidth={2} />
              초기화
            </button>
          )}
        </div>
      </section>

      {/* ── 채팅 영역 ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", overflow: "hidden", minHeight: 0 }}>

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
          {messages.map((msg, i) => (
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
          ))}

          {/* 로딩 */}
          {loading && (
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
        .group\\/msg:hover .group-hover\\/msg\\:opacity-100 { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
