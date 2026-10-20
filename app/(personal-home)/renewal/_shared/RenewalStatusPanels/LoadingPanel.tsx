"use client";

/** 로딩/Suspense 패널(설계 §1.2). 상태 확정 전 공통 로딩 표시 — 같은 셸 톤 유지. */

import { Loader2 } from "lucide-react";
import { SIGNUP_THEME } from "../signup-theme";

export function LoadingPanel({ message = "불러오는 중…" }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "64px 0",
        fontSize: 14,
        color: SIGNUP_THEME.faint,
      }}
    >
      <Loader2 size={18} className="animate-spin" style={{ color: SIGNUP_THEME.accent }} aria-hidden />
      {message}
    </div>
  );
}
