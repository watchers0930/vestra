"use client";

import { Send, CheckCircle2, Phone, Mail } from "lucide-react";
import { CONSULT_TYPES } from "../constants";
import type { Expert } from "@/components/expert/ExpertCard";
import type { ConsultFormState } from "../hooks/useExpertConsult";

interface Props {
  selectedExpert: Expert | null;
  formState: ConsultFormState;
  setFormState: React.Dispatch<React.SetStateAction<ConsultFormState>>;
  submitting: boolean;
  submitted: boolean;
  error: string;
  onSubmit: (e: React.FormEvent) => void;
  onReset: () => void;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: "12px",
  border: "1px solid rgba(0,0,0,0.12)", background: "#fff",
  fontSize: "13.5px", color: "#1d1d1f", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "13px", fontWeight: 600, color: "#1d1d1f", marginBottom: "6px",
};

export function ConsultForm({ selectedExpert, formState, setFormState, submitting, submitted, error, onSubmit, onReset }: Props) {
  return (
    <div id="consult-form" style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", padding: "24px", marginBottom: "24px" }}>
      <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 4px" }}>상담 요청</h2>
      <p style={{ fontSize: "12px", color: "#6e6e73", margin: "0 0 20px" }}>
        {selectedExpert
          ? `${selectedExpert.name} ${selectedExpert.category}에게 상담을 요청합니다`
          : "전문가를 선택하거나 아래 양식을 직접 작성해주세요"}
      </p>

      {submitted ? (
        <div style={{ textAlign: "center", padding: "48px 16px" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "20px", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.20)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <CheckCircle2 size={32} strokeWidth={1.5} style={{ color: "#10b981" }} />
          </div>
          <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#1d1d1f", margin: "0 0 8px" }}>상담 요청이 접수되었습니다</h3>
          <p style={{ fontSize: "12px", color: "#6e6e73", lineHeight: 1.7, margin: "0 0 20px", maxWidth: "320px", marginLeft: "auto", marginRight: "auto" }}>
            전문가 배정 후 24시간 내 연락드립니다. 빠른 답변을 위해 연락처를 확인해주세요.
          </p>
          <button onClick={onReset} style={{ fontSize: "13px", color: "#0071e3", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: "3px" }}>새 상담 요청</button>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {/* 상담 유형 */}
          <div>
            <label style={labelStyle}>상담 유형 <span style={{ color: "#ff3b30" }}>*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONSULT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormState((p) => ({ ...p, type }))}
                  style={{
                    padding: "9px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: 600,
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: formState.type === type ? "linear-gradient(148deg, #0071e3, #0058b0)" : "#f5f5f7",
                    color: formState.type === type ? "#fff" : "#3d3d3f",
                    boxShadow: formState.type === type ? "0 4px 12px rgba(0,113,227,0.25)" : "none",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 물건 주소 */}
          <div>
            <label style={labelStyle}>물건 주소 <span style={{ color: "#ff3b30" }}>*</span></label>
            <input type="text" value={formState.address} onChange={(e) => setFormState((p) => ({ ...p, address: e.target.value }))} placeholder="예: 서울특별시 강남구 테헤란로 123, 101동 1001호" style={inputStyle} />
          </div>

          {/* 문의 내용 */}
          <div>
            <label style={labelStyle}>문의 내용 <span style={{ color: "#ff3b30" }}>*</span></label>
            <textarea value={formState.content} onChange={(e) => setFormState((p) => ({ ...p, content: e.target.value }))} rows={4} placeholder="궁금하신 점이나 검토가 필요한 사항을 자세히 적어주세요" style={{ ...inputStyle, resize: "none" }} />
          </div>

          {/* AI 결과 첨부 */}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <div onClick={() => setFormState((p) => ({ ...p, attachAiResult: !p.attachAiResult }))}
              style={{ width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, background: formState.attachAiResult ? "#0071e3" : "#f5f5f7", border: formState.attachAiResult ? "none" : "1px solid rgba(0,0,0,0.20)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              {formState.attachAiResult && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            </div>
            <span style={{ fontSize: "13px", color: "#3d3d3f" }}>AI 분석 결과를 전문가에게 함께 전달</span>
          </label>

          {/* 연락처 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label style={labelStyle}><Phone size={12} style={{ display: "inline", marginRight: "4px" }} />연락처 (전화번호)</label>
              <input type="tel" value={formState.contactPhone} onChange={(e) => setFormState((p) => ({ ...p, contactPhone: e.target.value }))} placeholder="010-0000-0000" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}><Mail size={12} style={{ display: "inline", marginRight: "4px" }} />연락처 (이메일)</label>
              <input type="email" value={formState.contactEmail} onChange={(e) => setFormState((p) => ({ ...p, contactEmail: e.target.value }))} placeholder="example@email.com" style={inputStyle} />
            </div>
          </div>

          {error && (
            <div style={{ padding: "10px 14px", borderRadius: "10px", background: "rgba(255,59,48,0.06)", border: "1px solid rgba(255,59,48,0.18)" }}>
              <p style={{ fontSize: "12px", color: "#c0392b", margin: 0 }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%", padding: "13px", borderRadius: "13px", border: "none",
              background: submitting ? "#e5e5e7" : "linear-gradient(148deg, #0071e3, #0058b0)",
              color: submitting ? "#aeaeb2" : "#fff", fontSize: "14px", fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              boxShadow: submitting ? "none" : "0 4px 16px rgba(0,113,227,0.30)",
            }}
          >
            {submitting
              ? <><span style={{ width: "16px", height: "16px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} /> 전송 중...</>
              : <><Send size={15} strokeWidth={2} /> 상담 요청하기</>}
          </button>
        </form>
      )}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
