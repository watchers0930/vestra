"use client";

import { CheckCircle, Loader2, FileText, ImageIcon, Building2, Database as DatabaseIcon, ShieldCheck, Zap, Brain } from "lucide-react";
import type { AnalysisStep } from "../types";

interface Props {
  step: AnalysisStep;
  showExtract?: boolean;
  showTilko?: boolean;
  fileType?: "pdf" | "image" | null;
}

export function AnalysisStepIndicator({ step, showExtract, showTilko, fileType }: Props) {
  const baseSteps = [
    { key: "parsing",    icon: DatabaseIcon, label: "파싱"     },
    { key: "validating", icon: ShieldCheck,  label: "검증"     },
    { key: "scoring",    icon: Zap,          label: "스코어링" },
    { key: "molit",      icon: DatabaseIcon, label: "실거래"   },
    { key: "ai",         icon: Brain,        label: "AI 분석"  },
  ];

  const extractStep = fileType === "image"
    ? { key: "extracting", icon: ImageIcon, label: "OCR" }
    : { key: "extracting", icon: FileText,  label: "PDF 추출" };

  const tilkoStep = { key: "tilko-fetch", icon: Building2, label: "등기 조회" };

  let steps = baseSteps;
  if (showTilko) steps = [tilkoStep, ...baseSteps];
  else if (showExtract) steps = [extractStep, ...baseSteps];

  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "16px 0" }}>
      {steps.map((s, i) => {
        const isActive = s.key === step;
        const isDone   = step === "done" || currentIdx > i;
        return (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                  background: isDone
                    ? "#0071e3"
                    : isActive
                    ? "rgba(0,113,227,0.12)"
                    : "rgba(0,0,0,0.05)",
                  border: isActive ? "2px solid #0071e3" : "2px solid transparent",
                }}
              >
                {isDone ? (
                  <CheckCircle size={16} style={{ color: "#fff" }} />
                ) : isActive ? (
                  <Loader2 size={16} className="animate-spin" style={{ color: "#0071e3" }} />
                ) : (
                  <s.icon size={16} style={{ color: "#aeaeb2" }} />
                )}
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: isActive || isDone ? 600 : 400,
                  color: isActive || isDone ? "#0071e3" : "#aeaeb2",
                  whiteSpace: "nowrap",
                }}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  width: "32px",
                  height: "2px",
                  borderRadius: "1px",
                  marginBottom: "18px",
                  background: isDone ? "#0071e3" : "rgba(0,0,0,0.08)",
                  transition: "background 0.3s",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
