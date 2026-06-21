"use client";

import { type LucideIcon, Clock, MapPin, CheckCircle2 } from "lucide-react";

export interface FlowStepData {
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  color: "blue" | "emerald" | "amber" | "red" | "purple";
  subSteps?: string[];
  duration?: string;
  location?: string;
}

const CIRCLE_COLOR: Record<string, { bg: string; shadow: string }> = {
  blue:    { bg: "#0071e3", shadow: "rgba(0,113,227,0.30)" },
  emerald: { bg: "#0071e3", shadow: "rgba(0,113,227,0.30)" },
  amber:   { bg: "#ff9f0a", shadow: "rgba(255,159,10,0.30)" },
  red:     { bg: "#ff3b30", shadow: "rgba(255,59,48,0.30)" },
  purple:  { bg: "#30d158", shadow: "rgba(48,209,88,0.30)" },
};

export default function FlowChart({ steps }: { steps: FlowStepData[]; className?: string }) {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        const c = CIRCLE_COLOR[step.color] ?? CIRCLE_COLOR.blue;
        const Icon = step.icon;

        return (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
            {/* ── 왼쪽: 원 + 세로 연결선 ── */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
              <div
                style={{
                  width: "44px", height: "44px", borderRadius: "50%",
                  background: c.bg,
                  boxShadow: `0 4px 14px ${c.shadow}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon size={18} strokeWidth={2} style={{ color: "#fff" }} />
              </div>
              {!isLast && (
                <div
                  style={{
                    width: "2px",
                    flex: 1,
                    minHeight: "24px",
                    background: "linear-gradient(180deg, rgba(0,113,227,0.35) 0%, rgba(0,113,227,0.12) 100%)",
                    borderRadius: "2px",
                    margin: "4px 0",
                  }}
                />
              )}
            </div>

            {/* ── 오른쪽: 내용 ── */}
            <div style={{ flex: 1, paddingBottom: isLast ? "0" : "20px" }}>
              {/* 단계 번호 */}
              <span
                style={{
                  fontSize: "12px", fontWeight: 700,
                  color: c.bg, letterSpacing: "0.06em",
                  display: "block", marginBottom: "4px", marginTop: "10px",
                }}
              >
                STEP {step.number}
              </span>

              {/* 제목 */}
              <p
                style={{
                  fontSize: "15px", fontWeight: 700, color: "#1d1d1f",
                  lineHeight: 1.35, marginBottom: "5px",
                }}
              >
                {step.title}
              </p>

              {/* 설명 */}
              <p
                style={{
                  fontSize: "13.5px", color: "#6e6e73",
                  lineHeight: 1.6, marginBottom: "7px",
                }}
              >
                {step.description}
              </p>

              {/* 태그 (소요시간 / 장소) */}
              {(step.duration || step.location) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "7px" }}>
                  {step.duration && (
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "3px",
                        padding: "2px 8px", borderRadius: "20px",
                        fontSize: "11px", color: "#6e6e73",
                        background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <Clock size={9} strokeWidth={1.5} /> {step.duration}
                    </span>
                  )}
                  {step.location && (
                    <span
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "3px",
                        padding: "2px 8px", borderRadius: "20px",
                        fontSize: "11px", color: "#6e6e73",
                        background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <MapPin size={9} strokeWidth={1.5} /> {step.location}
                    </span>
                  )}
                </div>
              )}

              {/* 서브스텝 */}
              {step.subSteps && step.subSteps.length > 0 && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {step.subSteps.map((sub, j) => (
                    <li
                      key={j}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "5px",
                        fontSize: "12.5px", color: "#6e6e73", lineHeight: 1.5, marginBottom: "3px",
                      }}
                    >
                      <CheckCircle2 size={11} strokeWidth={1.5} style={{ color: "#30d158", flexShrink: 0, marginTop: "2px" }} />
                      {sub}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
