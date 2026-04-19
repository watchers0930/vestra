"use client";

import { AlertTriangle } from "lucide-react";
import type { MissingClause } from "../types";

interface Props { missingClauses: MissingClause[] }

export function MissingClausesCard({ missingClauses }: Props) {
  if (missingClauses.length === 0) return null;

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
      <h2
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "16px",
          fontWeight: 700,
          color: "#1d1d1f",
          marginBottom: "18px",
          letterSpacing: "-0.02em",
        }}
      >
        <AlertTriangle size={17} style={{ color: "#ff9f0a" }} />
        누락된 중요 조항
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "10px",
        }}
      >
        {missingClauses.map((mc, idx) => {
          const isHigh = mc.importance === "high";
          return (
            <div
              key={idx}
              style={{
                borderRadius: "14px",
                border: `1px solid ${isHigh ? "rgba(255,59,48,0.22)" : "rgba(255,159,10,0.22)"}`,
                background: isHigh ? "rgba(255,59,48,0.04)" : "rgba(255,159,10,0.04)",
                padding: "14px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                <h3 style={{ fontSize: "13px", fontWeight: 600, color: "#1d1d1f", flex: 1 }}>{mc.title}</h3>
                <span
                  style={{
                    fontSize: "10.5px",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "20px",
                    color: isHigh ? "#ff3b30" : "#b86f00",
                    background: isHigh ? "rgba(255,59,48,0.10)" : "rgba(255,159,10,0.10)",
                    flexShrink: 0,
                  }}
                >
                  {isHigh ? "필수" : "권장"}
                </span>
              </div>
              <p style={{ fontSize: "12px", lineHeight: 1.6, color: "#6e6e73" }}>{mc.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
