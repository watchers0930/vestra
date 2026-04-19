"use client";

import { XCircle, AlertTriangle, CheckCircle } from "lucide-react";
import type { AnalyzedClause } from "../types";

const RISK_CONFIG = {
  high:    { color: "#ff3b30", bg: "rgba(255,59,48,0.06)",   border: "rgba(255,59,48,0.25)",  accent: "#ff3b30", icon: XCircle,       label: "위험"  },
  warning: { color: "#b86f00", bg: "rgba(255,159,10,0.06)",  border: "rgba(255,159,10,0.25)", accent: "#ff9f0a", icon: AlertTriangle, label: "주의"  },
  safe:    { color: "#1a9e45", bg: "rgba(48,209,88,0.05)",   border: "rgba(48,209,88,0.22)",  accent: "#30d158", icon: CheckCircle,   label: "안전"  },
} as const;

interface Props { clauses: AnalyzedClause[] }

export function ClauseAnalysisCard({ clauses }: Props) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: "20px",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        padding: "24px",
      }}
    >
      <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#1d1d1f", marginBottom: "18px", letterSpacing: "-0.02em" }}>
        조항별 분석 결과
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {clauses.map((clause, idx) => {
          const cfg = RISK_CONFIG[clause.riskLevel] ?? RISK_CONFIG.safe;
          const Icon = cfg.icon;
          return (
            <div
              key={idx}
              style={{
                borderRadius: "14px",
                border: `1px solid ${cfg.border}`,
                borderLeft: `4px solid ${cfg.accent}`,
                background: cfg.bg,
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "13.5px", fontWeight: 600, color: "#1d1d1f", flex: 1 }}>{clause.title}</h3>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "3px 10px",
                    borderRadius: "20px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: cfg.color,
                    background: "#fff",
                    border: `1px solid ${cfg.border}`,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={11} />
                  {cfg.label}
                </span>
              </div>
              {clause.content && (
                <p
                  style={{
                    padding: "8px 12px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    fontSize: "11.5px",
                    lineHeight: 1.65,
                    color: "#6e6e73",
                    marginBottom: "8px",
                  }}
                >
                  {clause.content}
                </p>
              )}
              <p style={{ fontSize: "13px", lineHeight: 1.65, color: "#1d1d1f" }}>{clause.analysis}</p>
              {clause.relatedLaw && (
                <p style={{ marginTop: "8px", fontSize: "11.5px", color: "#aeaeb2" }}>
                  <span style={{ fontWeight: 600 }}>관련 법규:</span> {clause.relatedLaw}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
