"use client";

import { useState } from "react";
import { X, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  listingId: string;
  deposit: string;
  listingType: "JEONSE" | "SALE";
  onClose: () => void;
  onSuccess: () => void;
}

function formatCommas(val: string) {
  const d = val.replace(/\D/g, "");
  if (!d) return "";
  return parseInt(d, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function toKorean(val: string) {
  const n = parseInt(val.replace(/,/g, ""), 10);
  if (!n || isNaN(n)) return "";
  const 억 = Math.floor(n / 100_000_000);
  const 만 = Math.floor((n % 100_000_000) / 10_000);
  let r = "";
  if (억 > 0) r += `${억}억 `;
  if (만 > 0) r += `${만.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}만`;
  return r.trim() + "원";
}

const DURATIONS = [6, 12, 18, 24, 36];

const inputStyle: React.CSSProperties = {
  width: "100%", border: "1px solid #d2d2d7", borderRadius: 10,
  padding: "10px 12px", fontSize: 14, outline: "none", boxSizing: "border-box",
  background: "#fff", color: "#1d1d1f",
};

export function ApplicationModal({ listingId, deposit, listingType, onClose, onSuccess }: Props) {
  const today = new Date().toISOString().split("T")[0];
  const [moveInDate, setMoveInDate] = useState("");
  const [duration, setDuration] = useState("12");
  const [proposedDeposit, setProposedDeposit] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!moveInDate) { setError("입주 희망일을 선택해주세요."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/contract-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          moveInDate: new Date(moveInDate).toISOString(),
          duration: listingType === "JEONSE" ? Number(duration) : undefined,
          proposedDeposit: proposedDeposit ? Number(proposedDeposit.replace(/,/g, "")) : undefined,
          memo: memo.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "신청에 실패했습니다.");
      }
      setSubmitted(true);
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)", padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 20, width: "100%", maxWidth: 460,
          maxHeight: "90vh", overflow: "auto", padding: 28, position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* 닫기 */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16, background: "#f5f5f7",
            border: "none", borderRadius: "50%", width: 30, height: 30,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <X size={15} strokeWidth={2.5} style={{ color: "#3d3d3f" }} />
        </button>

        {submitted ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0", textAlign: "center" }}>
            <CheckCircle2 size={52} strokeWidth={1.5} style={{ color: "#34c759", marginBottom: 16 }} />
            <p style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f", marginBottom: 8 }}>계약의향서가 전달되었습니다</p>
            <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 24 }}>임대인이 검토 후 수락 또는 거절 결정을 내립니다.</p>
            <button
              onClick={onClose}
              style={{
                padding: "10px 24px", borderRadius: 12, background: "#0071e3",
                color: "#fff", fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer",
              }}
            >
              확인
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f", marginBottom: 6, letterSpacing: "-0.02em" }}>
              계약 의향서
            </h2>
            <p style={{ fontSize: 12, color: "#6e6e73", marginBottom: 20 }}>
              임대인에게 계약 의향을 전달합니다
            </p>

            {/* 매물 보증금 (읽기전용) */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6 }}>
                {listingType === "SALE" ? "매매가" : "보증금"} (원)
              </label>
              <div
                style={{
                  border: "1px solid #e5e5ea", borderRadius: 10, padding: "10px 12px",
                  fontSize: 14, color: "#6e6e73", background: "#f5f5f7",
                }}
              >
                {deposit} {deposit && <span style={{ fontSize: 11, color: "#aeaeb2" }}>({toKorean(deposit)})</span>}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* 입주 희망일 */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6 }}>
                  입주 희망일 <span style={{ color: "#0071e3" }}>*</span>
                </label>
                <input
                  type="date"
                  style={inputStyle}
                  min={today}
                  value={moveInDate}
                  onChange={(e) => setMoveInDate(e.target.value)}
                  required
                />
              </div>

              {/* 계약 기간 (전세만) */}
              {listingType === "JEONSE" && (
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6 }}>
                    계약 기간
                  </label>
                  <select
                    style={{ ...inputStyle, appearance: "none" }}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  >
                    {DURATIONS.map((m) => <option key={m} value={m}>{m}개월</option>)}
                  </select>
                </div>
              )}

              {/* 희망 금액 (선택) */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6 }}>
                  제안 금액 (선택, 원)
                </label>
                <input
                  style={inputStyle}
                  placeholder="다른 금액을 제안할 경우 입력"
                  value={proposedDeposit}
                  onChange={(e) => setProposedDeposit(formatCommas(e.target.value))}
                />
                {proposedDeposit && (
                  <p style={{ fontSize: 11, color: "#0071e3", marginTop: 4 }}>{toKorean(proposedDeposit)}</p>
                )}
              </div>

              {/* 메모 */}
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3d3d3f", marginBottom: 6 }}>
                  메모 (선택)
                </label>
                <textarea
                  style={{ ...inputStyle, height: 80, resize: "none" }}
                  placeholder="전달할 내용을 입력하세요 (최대 500자)"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  maxLength={500}
                />
              </div>

              {error && (
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,59,48,0.06)", fontSize: 13, color: "#c0392b" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #d2d2d7",
                    background: "#fff", fontSize: 14, fontWeight: 600, color: "#3d3d3f", cursor: "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting || !moveInDate}
                  style={{
                    flex: 2, padding: "12px 0", borderRadius: 12, border: "none",
                    background: submitting || !moveInDate ? "#aeaeb2" : "#0071e3",
                    fontSize: 14, fontWeight: 600, color: "#fff", cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.15s",
                  }}
                >
                  {submitting && <Loader2 size={14} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />}
                  {submitting ? "전달 중..." : "의향서 전달하기"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
