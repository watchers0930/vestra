"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, ExternalLink, MessageSquare, CheckSquare, Square } from "lucide-react";
import {
  EMERGENCY_CHECKLIST,
  VICTIM_SUPPORT_PORTAL_URL,
} from "@/lib/emergency-checklist";
import type { ChecklistState } from "@/lib/emergency-checklist";

export type EmergencyResponseModalProps = {
  open: boolean;
  onClose: () => void;
  alertId: string;
  changeType: string;
  summary: string;
  riskLevel: string;
  createdAt: string;
  propertyAddress: string;
};

const CHANGE_TYPE_LABEL: Record<string, string> = {
  mortgage_added: "근저당 설정",
  seizure_added: "압류 설정",
  ownership_changed: "소유권 변동",
  lien_added: "가압류 설정",
  provisional_registration: "가등기 설정",
};

function loadChecklist(alertId: string): ChecklistState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`vestra_emergency_checklist_${alertId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecklist(alertId: string, state: ChecklistState) {
  try {
    localStorage.setItem(
      `vestra_emergency_checklist_${alertId}`,
      JSON.stringify(state)
    );
  } catch {
    // localStorage 쓰기 실패는 무시
  }
}

export function EmergencyResponseModal({
  open,
  onClose,
  alertId,
  changeType,
  summary,
  riskLevel,
  createdAt,
  propertyAddress,
}: EmergencyResponseModalProps) {
  const router = useRouter();
  const [checks, setChecks] = useState<ChecklistState>({});
  const firstBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = `emergency-modal-title-${alertId}`;

  // 모달 열릴 때마다 localStorage에서 체크 상태 복원
  // open/alertId가 바뀔 때 외부 시스템(localStorage)과 동기화 — queueMicrotask로 동기 setState 회피
  useEffect(() => {
    if (!open) return;
    const saved = loadChecklist(alertId);
    queueMicrotask(() => setChecks(saved));
  }, [open, alertId]);

  // 모달 오픈 시 첫 버튼으로 포커스 (rAF: 렌더 완료 후 실행 보장 + cleanup으로 언마운트 레이스 방지)
  useEffect(() => {
    if (!open) return;
    const rafId = requestAnimationFrame(() => firstBtnRef.current?.focus());
    return () => cancelAnimationFrame(rafId);
  }, [open]);

  // ESC 키
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // 포커스 트랩
  const containerRef = useRef<HTMLDivElement>(null);
  const handleTabKey = useCallback((e: React.KeyboardEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const focusable = Array.from(
      el.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input,textarea,select,[tabindex]:not([tabindex="-1"])'
      )
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  const toggleCheck = (itemId: string) => {
    setChecks((prev) => {
      const next = { ...prev, [itemId]: !prev[itemId] };
      saveChecklist(alertId, next);
      return next;
    });
  };

  const checkedCount = Object.values(checks).filter(Boolean).length;
  const totalCount = EMERGENCY_CHECKLIST.flatMap((s) => s.items).length;

  const handleExpertConnect = () => {
    onClose();
    router.push("/expert-connect");
  };

  if (!open) return null;

  const createdDate = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    /* 오버레이 */
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
      aria-hidden="false"
    >
      {/* 모달 */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Tab" && handleTabKey(e)}
        style={{
          background: "#fff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "520px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "20px 20px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.07)",
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "6px",
                  background: riskLevel === "critical" ? "rgba(255,59,48,0.10)" : "rgba(255,149,0,0.10)",
                  color: riskLevel === "critical" ? "#ff3b30" : "#ff9500",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {riskLevel === "critical" ? "⚠️ 긴급" : "⚡ 위험"}
              </span>
              <span style={{ fontSize: "12px", color: "#aeaeb2" }}>{createdDate}</span>
            </div>
            <h2
              id={titleId}
              style={{ fontSize: "16px", fontWeight: 800, color: "#1d1d1f", margin: 0, lineHeight: 1.3 }}
            >
              긴급 대응 가이드
            </h2>
            <p style={{ fontSize: "12.5px", color: "#6e6e73", marginTop: "4px" }}>
              {CHANGE_TYPE_LABEL[changeType] || changeType} — {propertyAddress}
            </p>
            <p style={{ fontSize: "12px", color: "#3c3c43", marginTop: "4px", lineHeight: 1.5 }}>
              {summary}
            </p>
          </div>
          <button
            ref={firstBtnRef}
            onClick={onClose}
            aria-label="닫기"
            style={{
              flexShrink: 0,
              marginLeft: "12px",
              padding: "6px",
              borderRadius: "8px",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#aeaeb2",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 진행률 */}
        <div style={{ padding: "12px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "11.5px", color: "#6e6e73" }}>체크리스트 진행</span>
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: checkedCount === totalCount ? "#30d158" : "#1d1d1f" }}>
              {checkedCount} / {totalCount}
            </span>
          </div>
          <div style={{ height: "4px", background: "#f0f0f2", borderRadius: "2px" }}>
            <div
              style={{
                height: "100%",
                borderRadius: "2px",
                background: checkedCount === totalCount ? "#30d158" : "var(--brand-primary)",
                width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%`,
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        {/* 체크리스트 */}
        <div style={{ padding: "16px 20px", flex: 1, overflowY: "auto" }}>
          {EMERGENCY_CHECKLIST.map((step) => (
            <div key={step.stepNumber} style={{ marginBottom: "20px" }}>
              <p
                style={{
                  fontSize: "11.5px",
                  fontWeight: 700,
                  color: "#aeaeb2",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                STEP {step.stepNumber} · {step.stepLabel}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {step.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCheck(item.id)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "10px 12px",
                      borderRadius: "10px",
                      border: `1px solid ${checks[item.id] ? "rgba(48,209,88,0.25)" : "rgba(0,0,0,0.08)"}`,
                      background: checks[item.id] ? "rgba(48,209,88,0.05)" : "#f9f9fb",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                      transition: "all 0.15s",
                    }}
                  >
                    {checks[item.id]
                      ? <CheckSquare size={15} style={{ color: "#30d158", flexShrink: 0, marginTop: "1px" }} />
                      : <Square size={15} style={{ color: "#aeaeb2", flexShrink: 0, marginTop: "1px" }} />
                    }
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: checks[item.id] ? "#6e6e73" : "#1d1d1f",
                        textDecoration: checks[item.id] ? "line-through" : "none",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 액션 */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(0,0,0,0.07)",
            display: "flex",
            gap: "8px",
            flexShrink: 0,
          }}
        >
          <a
            href={VICTIM_SUPPORT_PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "11px 0",
              borderRadius: "12px",
              border: "1.5px solid rgba(0,113,227,0.25)",
              background: "rgba(0,113,227,0.05)",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "var(--brand-primary)",
              textDecoration: "none",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <ExternalLink size={13} />
            전세사기피해지원 포털
          </a>
          <button
            type="button"
            onClick={handleExpertConnect}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "11px 0",
              borderRadius: "12px",
              border: "none",
              background: "#1d1d1f",
              fontSize: "12.5px",
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            <MessageSquare size={13} />
            전문가 상담
          </button>
        </div>
      </div>
    </div>
  );
}
