"use client";

import { useState, useCallback } from "react";
import { ShieldPlus, ChevronDown, ChevronUp, Copy, Check, Download, AlertTriangle, AlertCircle, Info } from "lucide-react";
import type { RecommendedTermsResult } from "../types";

// ─── 상수 ───

const PRIORITY_CONFIG = {
  critical: { label: "필수", color: "#ff3b30", bg: "rgba(255,59,48,0.08)", border: "rgba(255,59,48,0.18)", icon: AlertTriangle },
  high:     { label: "권장", color: "#ff9500", bg: "rgba(255,149,0,0.08)", border: "rgba(255,149,0,0.18)", icon: AlertCircle },
  medium:   { label: "선택", color: "#0071e3", bg: "rgba(0,113,227,0.08)", border: "rgba(0,113,227,0.18)", icon: Info },
} as const;

const CATEGORY_COLORS: Record<string, string> = {
  "보증금": "#ff3b30",
  "등기": "#af52de",
  "임차인": "#0071e3",
  "임대인": "#ff9500",
  "기타": "#6e6e73",
};

// ─── 컴포넌트 ───

interface Props {
  recommendedTerms: RecommendedTermsResult;
}

export function RecommendedTermsCard({ recommendedTerms }: Props) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const copyAllTerms = useCallback(async () => {
    const lines = recommendedTerms.terms.map((t, i) => {
      const badge = PRIORITY_CONFIG[t.template.priority].label;
      return `[${badge}] ${i + 1}. ${t.template.title}\n${t.template.template}`;
    });
    await navigator.clipboard.writeText(lines.join("\n\n"));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2000);
  }, [recommendedTerms]);

  const downloadAllTerms = useCallback(() => {
    const lines = [
      "═══════════════════════════════════════",
      "  VESTRA 맞춤 특약 추천 목록",
      "═══════════════════════════════════════",
      "",
      ...recommendedTerms.terms.map((t, i) => {
        const badge = PRIORITY_CONFIG[t.template.priority].label;
        return [
          `[${badge}] ${i + 1}. ${t.template.title} (${t.template.category})`,
          "───────────────────────────────────────",
          t.template.template,
          "",
          `※ 근거: ${t.rationale}`,
          `※ 발동 조건: ${t.matchedTriggers.join(", ")}`,
          "",
        ].join("\n");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "vestra-recommended-terms.txt";
    a.click();
    URL.revokeObjectURL(url);
  }, [recommendedTerms]);

  if (!recommendedTerms.terms.length) return null;

  const criticalCount = recommendedTerms.terms.filter((t) => t.template.priority === "critical").length;
  const highCount = recommendedTerms.terms.filter((t) => t.template.priority === "high").length;

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${recommendedTerms.riskLevel === "critical" ? "rgba(255,59,48,0.18)" : "rgba(0,0,0,0.08)"}`,
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      {/* 헤더 */}
      <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px", height: "36px", borderRadius: "10px",
                background: "linear-gradient(148deg, #0c1527, #141820)",
                border: "1px solid rgba(0,113,227,0.20)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,113,227,0.12)",
              }}
            >
              <ShieldPlus size={18} strokeWidth={1.5} style={{ color: "#2997ff" }} />
            </div>
            <div>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "#1d1d1f", margin: 0 }}>
                맞춤 특약 추천
              </h2>
              <p style={{ fontSize: "11.5px", color: "#6e6e73", margin: "2px 0 0" }}>
                {criticalCount > 0 && <span style={{ color: "#ff3b30", fontWeight: 600 }}>필수 {criticalCount}건</span>}
                {criticalCount > 0 && highCount > 0 && " · "}
                {highCount > 0 && <span style={{ color: "#ff9500", fontWeight: 600 }}>권장 {highCount}건</span>}
                {(criticalCount > 0 || highCount > 0) && " · "}
                총 {recommendedTerms.terms.length}건
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={copyAllTerms}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "7px 12px", borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.09)", background: "#fff",
                fontSize: "11.5px", fontWeight: 500, color: "#1d1d1f", cursor: "pointer",
              }}
            >
              {allCopied ? <Check size={12} style={{ color: "#30d158" }} /> : <Copy size={12} />}
              {allCopied ? "복사됨" : "전체 복사"}
            </button>
            <button
              onClick={downloadAllTerms}
              style={{
                display: "inline-flex", alignItems: "center", gap: "5px",
                padding: "7px 12px", borderRadius: "10px",
                border: "1px solid rgba(0,0,0,0.09)", background: "#fff",
                fontSize: "11.5px", fontWeight: 500, color: "#1d1d1f", cursor: "pointer",
              }}
            >
              <Download size={12} />
              다운로드
            </button>
          </div>
        </div>
      </div>

      {/* 특약 목록 */}
      <div style={{ padding: "8px 12px 12px" }}>
        {recommendedTerms.terms.map((term) => {
          const config = PRIORITY_CONFIG[term.template.priority];
          const PriorityIcon = config.icon;
          const isExpanded = expandedIds.has(term.template.id);
          const isCopied = copiedId === term.template.id;
          const catColor = CATEGORY_COLORS[term.template.category] || "#6e6e73";

          return (
            <div
              key={term.template.id}
              style={{
                margin: "8px 0",
                borderRadius: "14px",
                border: `1px solid ${config.border}`,
                background: config.bg,
                overflow: "hidden",
              }}
            >
              {/* 카드 헤더 */}
              <button
                onClick={() => toggleExpand(term.template.id)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", border: "none", background: "transparent",
                  cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
                  <PriorityIcon size={16} strokeWidth={2} style={{ color: config.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "10px", fontWeight: 700, color: config.color,
                          background: "#fff", borderRadius: "4px", padding: "2px 6px",
                          border: `1px solid ${config.border}`,
                        }}
                      >
                        {config.label}
                      </span>
                      <span
                        style={{
                          fontSize: "10px", fontWeight: 600, color: catColor,
                          background: "rgba(255,255,255,0.8)", borderRadius: "4px", padding: "2px 6px",
                        }}
                      >
                        {term.template.category}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f" }}>
                        {term.template.title}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#6e6e73", marginTop: "4px" }}>
                      {term.matchedTriggers.join(" · ")}
                    </div>
                  </div>
                </div>
                {isExpanded ? (
                  <ChevronUp size={16} style={{ color: "#6e6e73", flexShrink: 0 }} />
                ) : (
                  <ChevronDown size={16} style={{ color: "#6e6e73", flexShrink: 0 }} />
                )}
              </button>

              {/* 펼쳐진 내용 */}
              {isExpanded && (
                <div style={{ padding: "0 16px 16px" }}>
                  {/* 특약 문구 */}
                  <div
                    style={{
                      background: "#fff", borderRadius: "10px",
                      border: "1px solid rgba(0,0,0,0.08)",
                      padding: "14px 16px", marginBottom: "10px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "10.5px", fontWeight: 600, color: "#6e6e73", letterSpacing: "0.04em" }}>
                        특약 문구
                      </span>
                      <button
                        onClick={() => copyToClipboard(term.template.template, term.template.id)}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "4px 10px", borderRadius: "8px",
                          border: "1px solid rgba(0,0,0,0.08)", background: "#f5f5f7",
                          fontSize: "11px", fontWeight: 500, color: "#1d1d1f", cursor: "pointer",
                        }}
                      >
                        {isCopied ? <Check size={11} style={{ color: "#30d158" }} /> : <Copy size={11} />}
                        {isCopied ? "복사됨" : "복사"}
                      </button>
                    </div>
                    <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#1d1d1f", margin: 0, whiteSpace: "pre-line" }}>
                      {term.template.template}
                    </p>
                  </div>

                  {/* 근거 */}
                  <div
                    style={{
                      background: "rgba(255,255,255,0.6)", borderRadius: "10px",
                      padding: "12px 14px",
                      fontSize: "12px", lineHeight: 1.65, color: "#6e6e73",
                    }}
                  >
                    <strong style={{ color: "#3d3d3f" }}>추천 근거:</strong> {term.rationale}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
