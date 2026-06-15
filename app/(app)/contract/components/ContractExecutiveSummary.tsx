"use client";

import { AlertTriangle, CalendarDays, CircleDollarSign, FileCheck2, Home, UserRound } from "lucide-react";
import type { ContractExtractedInfo, ContractReviewIssue } from "../types";

interface Props {
  extractedInfo?: ContractExtractedInfo;
  reviewIssues?: ContractReviewIssue[];
}

const SEVERITY_STYLE: Record<ContractReviewIssue["severity"], { label: string; color: string; bg: string; border: string }> = {
  critical: { label: "긴급", color: "#ff3b30", bg: "rgba(255,59,48,0.07)", border: "rgba(255,59,48,0.22)" },
  high: { label: "중요", color: "#ff9500", bg: "rgba(255,149,0,0.07)", border: "rgba(255,149,0,0.22)" },
  warning: { label: "확인", color: "#0071e3", bg: "rgba(0,113,227,0.06)", border: "rgba(0,113,227,0.18)" },
  info: { label: "참고", color: "#6e6e73", bg: "rgba(0,0,0,0.04)", border: "rgba(0,0,0,0.10)" },
};

function formatWon(amount?: number) {
  if (!amount) return "미확인";
  if (amount >= 100_000_000) {
    const eok = Math.floor(amount / 100_000_000);
    const man = Math.round((amount % 100_000_000) / 10_000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${Math.round(amount / 10_000).toLocaleString()}만원`;
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Home; label: string; value: string }) {
  return (
    <div style={{ border: "1px solid rgba(0,0,0,0.07)", borderRadius: "14px", padding: "14px", background: "#fafafa" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", color: "#6e6e73", fontSize: "11px", fontWeight: 700, marginBottom: "7px" }}>
        <Icon size={14} strokeWidth={1.6} />
        {label}
      </div>
      <p style={{ fontSize: "13px", fontWeight: 400, color: "#1d1d1f", lineHeight: 1.45 }}>{value || "미확인"}</p>
    </div>
  );
}

export function ContractExecutiveSummary({ extractedInfo, reviewIssues = [] }: Props) {
  if (!extractedInfo && reviewIssues.length === 0) return null;

  const period = extractedInfo?.contractStartDate && extractedInfo.contractEndDate
    ? `${extractedInfo.contractStartDate} ~ ${extractedInfo.contractEndDate}${extractedInfo.durationMonths ? ` (${extractedInfo.durationMonths}개월)` : ""}`
    : "미확인";

  const topIssues = reviewIssues.slice(0, 6);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "16px" }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "20px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          padding: "24px",
        }}
      >
        <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: 800, color: "#1d1d1f", marginBottom: "16px" }}>
          <FileCheck2 size={18} strokeWidth={1.7} style={{ color: "#0071e3" }} />
          계약 핵심정보
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "10px" }}>
          <InfoTile icon={Home} label="목적물" value={extractedInfo?.propertyAddress || "미확인"} />
          <InfoTile icon={CircleDollarSign} label="보증금" value={formatWon(extractedInfo?.depositAmount)} />
          <InfoTile icon={CalendarDays} label="계약기간" value={period} />
          <InfoTile
            icon={UserRound}
            label="당사자"
            value={`임대인 ${extractedInfo?.landlordName || "미확인"} / 임차인 ${extractedInfo?.tenantName || "미확인"}`}
          />
        </div>
        {!!extractedInfo?.paymentSchedule?.length && (
          <div style={{ marginTop: "14px", borderTop: "1px solid rgba(0,0,0,0.06)", paddingTop: "14px" }}>
            <p style={{ fontSize: "12px", fontWeight: 800, color: "#6e6e73", marginBottom: "8px" }}>지급 일정</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {extractedInfo.paymentSchedule.map((item, idx) => (
                <span
                  key={`${item.label}-${idx}`}
                  style={{
                    display: "inline-flex",
                    gap: "6px",
                    alignItems: "center",
                    borderRadius: "999px",
                    border: "1px solid rgba(0,113,227,0.16)",
                    background: "rgba(0,113,227,0.05)",
                    padding: "6px 10px",
                    fontSize: "11.5px",
                    color: "#004ab3",
                    fontWeight: 700,
                  }}
                >
                  {item.label} {formatWon(item.amount)}{item.dueDate ? ` · ${item.dueDate}` : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {topIssues.length > 0 && (
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(255,149,0,0.20)",
            borderRadius: "20px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            padding: "24px",
          }}
        >
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "16px", fontWeight: 800, color: "#1d1d1f", marginBottom: "14px" }}>
            <AlertTriangle size={18} strokeWidth={1.7} style={{ color: "#ff9500" }} />
            우선 검토 이슈
          </h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {topIssues.map((issue) => {
              const style = SEVERITY_STYLE[issue.severity];
              return (
                <div key={issue.id} style={{ border: `1px solid ${style.border}`, borderRadius: "14px", background: style.bg, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                    <span style={{ borderRadius: "999px", background: "#fff", border: `1px solid ${style.border}`, padding: "2px 7px", fontSize: "10.5px", fontWeight: 800, color: style.color }}>
                      {style.label}
                    </span>
                    <p style={{ fontSize: "13px", fontWeight: 800, color: "#1d1d1f" }}>{issue.title}</p>
                  </div>
                  <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#424245" }}>{issue.description}</p>
                  <p style={{ marginTop: "6px", fontSize: "12px", lineHeight: 1.6, color: style.color, fontWeight: 700 }}>{issue.recommendation}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
