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
    <div style={{ overflowX: "auto", marginLeft: "-4px", marginRight: "-4px", paddingBottom: "4px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content", padding: "4px 4px 8px" }}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const c = CIRCLE_COLOR[step.color] ?? CIRCLE_COLOR.blue;
          const Icon = step.icon;

          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start" }}>
              {/* ── 스텝 카드 ── */}
              <div style={{ width: "172px", display: "flex", flexDirection: "column", alignItems: "center" }}>
                {/* 원 + 아이콘 */}
                <div
                  style={{
                    width: "44px", height: "44px", borderRadius: "50%",
                    background: c.bg,
                    boxShadow: `0 4px 14px ${c.shadow}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} strokeWidth={2} style={{ color: "#fff" }} />
                </div>

                {/* 단계 번호 */}
                <span
                  style={{
                    fontSize: "10px", fontWeight: 700,
                    color: c.bg, marginTop: "8px", letterSpacing: "0.06em",
                  }}
                >
                  STEP {step.number}
                </span>

                {/* 제목 */}
                <p
                  style={{
                    fontSize: "12.5px", fontWeight: 700, color: "#1d1d1f",
                    textAlign: "center", marginTop: "4px", lineHeight: 1.35,
                    padding: "0 6px",
                  }}
                >
                  {step.title}
                </p>

                {/* 설명 */}
                <p
                  style={{
                    fontSize: "11px", color: "#6e6e73", textAlign: "center",
                    lineHeight: 1.55, marginTop: "5px", padding: "0 4px",
                  }}
                >
                  {step.description}
                </p>

                {/* 태그 (소요시간 / 장소) */}
                {(step.duration || step.location) && (
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px", marginTop: "7px" }}>
                    {step.duration && (
                      <span
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "3px",
                          padding: "2px 8px", borderRadius: "20px",
                          fontSize: "10px", color: "#6e6e73",
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
                          fontSize: "10px", color: "#6e6e73",
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
                  <ul style={{ marginTop: "8px", padding: "0 6px", listStyle: "none", width: "100%" }}>
                    {step.subSteps.map((sub, j) => (
                      <li
                        key={j}
                        style={{
                          display: "flex", alignItems: "flex-start", gap: "5px",
                          fontSize: "10.5px", color: "#6e6e73", lineHeight: 1.5, marginBottom: "3px",
                        }}
                      >
                        <CheckCircle2 size={11} strokeWidth={1.5} style={{ color: "#30d158", flexShrink: 0, marginTop: "1px" }} />
                        {sub}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ── 연결선 ── */}
              {!isLast && (
                <div
                  style={{
                    display: "flex", alignItems: "center", height: "44px",
                    padding: "0 4px", flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: "32px", height: "2px",
                      background: "linear-gradient(90deg, rgba(0,113,227,0.40) 0%, rgba(0,113,227,0.15) 100%)",
                      borderRadius: "2px",
                      position: "relative",
                    }}
                  >
                    {/* 화살 끝 */}
                    <div
                      style={{
                        position: "absolute", right: "-4px", top: "50%",
                        transform: "translateY(-50%)",
                        width: 0, height: 0,
                        borderTop: "4px solid transparent",
                        borderBottom: "4px solid transparent",
                        borderLeft: "5px solid rgba(0,113,227,0.35)",
                      }}
                    />
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
