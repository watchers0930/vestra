"use client";

/**
 * renewal 가입 상위 5단계 진행바(설계 renewal.design §1.2·§1.4 TR-01·TR-03).
 *
 * 표시 전용 — "접근 가능(reachable)"과 "완료 체크(completed)"를 **분리**해서 받는다. 완료 체크는
 * maxStep이 아니라 실제 사실 기준(§2.4)이며, 미래 단계가 선택 가능하다는 이유만으로 체크를 표시하지 않는다.
 * pending은 색상 외에 문구·현재 단계 강조로 구분한다(§8.2). 기존 공용 `WizardProgress`는 그대로 두고,
 * 가입 전용 표현이 필요한 이 흐름에서만 사용한다(소비자 회귀 방지, §1.2).
 */

import { Check } from "lucide-react";
import { SIGNUP_THEME } from "./signup-theme";
import { SIGNUP_STAGES, type SignupStage } from "./signup-stage";

interface RenewalStageBarProps {
  /** 현재 진행 중인 단계(강조). */
  current: SignupStage;
  /** 실제 사실 기준 완료된 단계(체크). */
  completed: SignupStage[];
  /** 이동 허용 상한. 이 단계 이하만 클릭 가능. */
  reachable: SignupStage;
  /** 완료(도달 가능) 단계 클릭 시 이동. 없으면 비클릭 표시. */
  onStageClick?: (stage: SignupStage) => void;
}

export function RenewalStageBar({ current, completed, reachable, onStageClick }: RenewalStageBarProps) {
  const done = new Set(completed);

  return (
    <ol
      style={{ display: "flex", alignItems: "flex-start", listStyle: "none", margin: 0, padding: 0 }}
      aria-label="가입 진행 단계"
    >
      {SIGNUP_STAGES.map((s, i) => {
        const isCurrent = s.stage === current;
        const isDone = done.has(s.stage) && !isCurrent;
        const reachableStage = s.stage <= reachable;
        const clickable = reachableStage && !!onStageClick;

        const circleBg = isCurrent
          ? SIGNUP_THEME.accent
          : isDone
            ? SIGNUP_THEME.successIcon
            : SIGNUP_THEME.border;
        const circleColor = isCurrent || isDone ? "#fff" : SIGNUP_THEME.faint;

        return (
          <li key={s.stage} style={{ display: "flex", flex: 1, alignItems: "center", minWidth: 0 }}>
            <button
              type="button"
              disabled={!clickable}
              aria-current={isCurrent ? "step" : undefined}
              onClick={() => clickable && onStageClick?.(s.stage)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                flex: "0 0 auto",
                width: "100%",
                minWidth: 0,
                border: "none",
                background: "transparent",
                padding: 0,
                cursor: clickable ? "pointer" : "default",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  background: circleBg,
                  color: circleColor,
                  transition: "background-color 0.15s",
                }}
              >
                {isDone ? <Check size={15} strokeWidth={3} aria-hidden /> : s.stage}
              </span>
              <span
                style={{
                  fontSize: 11,
                  lineHeight: 1.2,
                  textAlign: "center",
                  wordBreak: "keep-all",
                  color: isCurrent ? SIGNUP_THEME.text : SIGNUP_THEME.faint,
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {s.label}
              </span>
            </button>
            {i < SIGNUP_STAGES.length - 1 && (
              <span
                aria-hidden
                style={{
                  flex: 1,
                  height: 2,
                  margin: "0 2px",
                  marginTop: -17,
                  // 왼쪽 단계가 **완료 체크**된 경우에만 녹색. 현재 진행 중(isDone=false)인 단계 뒤 연결선은
                  // 회색으로 둔다 — 체크되지 않은 현재 단계 다음을 녹색으로 앞서 칠하지 않는다(§8.2).
                  background: isDone ? SIGNUP_THEME.successIcon : SIGNUP_THEME.border,
                }}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
