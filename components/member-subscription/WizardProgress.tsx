"use client";

/**
 * 사업자 4단계 진행바(설계 §4.2). 완료/현재/잠금 단계를 표시한다(UI 전용).
 * 완료된(≤serverStep) 단계만 클릭 이동 가능 — 건너뛰기 방어는 부모 훅(useBusinessWizard)이 담당한다.
 */

import { Check } from "lucide-react";

export interface WizardStepItem {
  step: number;
  label: string;
}

interface WizardProgressProps {
  steps: WizardStepItem[];
  /** 현재 표시 중인 단계 */
  viewStep: number;
  /** 서버 상태 기준 진입 가능한 최대 단계(이하만 이동 가능) */
  maxStep: number;
  onStepClick?: (step: number) => void;
}

export function WizardProgress({ steps, viewStep, maxStep, onStepClick }: WizardProgressProps) {
  return (
    <ol className="flex items-center">
      {steps.map((s, i) => {
        const done = s.step < maxStep;
        const current = s.step === viewStep;
        const reachable = s.step <= maxStep;
        return (
          <li key={s.step} className="flex flex-1 items-center">
            <button
              type="button"
              disabled={!reachable || !onStepClick}
              onClick={() => reachable && onStepClick?.(s.step)}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                  current
                    ? "bg-primary text-white"
                    : done
                      ? "bg-[#30d158] text-white"
                      : "bg-[#e5e5e7] text-[#8e8e93]",
                ].join(" ")}
              >
                {done ? <Check size={16} strokeWidth={3} /> : s.step}
              </span>
              <span
                className={[
                  "text-[11px]",
                  current ? "font-semibold text-[#1d1d1f]" : "text-[#8e8e93]",
                ].join(" ")}
              >
                {s.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <span className={["mx-1 h-[2px] flex-1", s.step < maxStep ? "bg-[#30d158]" : "bg-[#e5e5e7]"].join(" ")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
