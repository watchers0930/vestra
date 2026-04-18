"use client";

import { CheckCircle, Loader2, FileText, ImageIcon, Building2, Database as DatabaseIcon, ShieldCheck, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AnalysisStep } from "../types";

interface Props {
  step: AnalysisStep;
  showExtract?: boolean;
  showCodef?: boolean;
  fileType?: "pdf" | "image" | null;
}

export function AnalysisStepIndicator({ step, showExtract, showCodef, fileType }: Props) {
  const baseSteps = [
    { key: "parsing", icon: DatabaseIcon, label: "파싱 엔진" },
    { key: "validating", icon: ShieldCheck, label: "검증 엔진" },
    { key: "scoring", icon: Zap, label: "스코어링" },
    { key: "molit", icon: DatabaseIcon, label: "실거래 조회" },
    { key: "ai", icon: Brain, label: "AI 종합" },
  ];

  const extractStep = fileType === "image"
    ? { key: "extracting", icon: ImageIcon, label: "이미지 OCR" }
    : { key: "extracting", icon: FileText, label: "PDF 추출" };

  const codefStep = { key: "codef-fetch", icon: Building2, label: "등기부 조회" };

  let steps = baseSteps;
  if (showCodef) steps = [codefStep, ...baseSteps];
  else if (showExtract) steps = [extractStep, ...baseSteps];
  const currentIdx = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-4">
      {steps.map((s, i) => {
        const isActive = s.key === step;
        const isDone = step === "done" || currentIdx > i;
        return (
          <div key={s.key} className="flex items-center gap-2 sm:gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-all",
                isDone ? "bg-primary text-white" : isActive ? "bg-primary/20 text-primary animate-pulse" : "bg-[#e5e5e7] text-[#6e6e73]"
              )}>
                {isDone ? <CheckCircle size={18} /> : isActive ? <Loader2 size={18} className="animate-spin" /> : <s.icon size={18} />}
              </div>
              <div className={cn("text-[10px] font-medium", isActive || isDone ? "text-primary" : "text-[#6e6e73]")}>{s.label}</div>
            </div>
            {i < steps.length - 1 && <div className={cn("w-6 sm:w-10 h-0.5 mb-5", isDone ? "bg-primary" : "bg-[#e5e5e7]")} />}
          </div>
        );
      })}
    </div>
  );
}
