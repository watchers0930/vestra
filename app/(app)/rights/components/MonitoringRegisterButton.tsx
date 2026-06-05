"use client";

import { useState } from "react";
import { Eye, Check, Loader2 } from "lucide-react";

interface Props {
  address: string;
}

export function MonitoringRegisterButton({ address }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error" | "exists">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleRegister() {
    if (!address || state === "loading" || state === "done") return;
    setState("loading");

    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setState("exists");
        return;
      }
      if (!res.ok) {
        setErrorMsg(data.error || "등록에 실패했습니다.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "9px 16px",
          borderRadius: "12px",
          border: "1px solid rgba(52,199,89,0.3)",
          background: "rgba(52,199,89,0.06)",
          fontSize: "13px",
          fontWeight: 500,
          color: "#34c759",
        }}
      >
        <Check size={15} strokeWidth={2} />
        감시 등록 완료
      </span>
    );
  }

  if (state === "exists") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "9px 16px",
          borderRadius: "12px",
          border: "1px solid rgba(0,113,227,0.15)",
          background: "rgba(0,113,227,0.04)",
          fontSize: "13px",
          fontWeight: 500,
          color: "#0071e3",
        }}
      >
        <Eye size={15} strokeWidth={1.5} />
        이미 감시 중
      </span>
    );
  }

  return (
    <button
      onClick={handleRegister}
      disabled={state === "loading"}
      title={state === "error" ? errorMsg : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "9px 16px",
        borderRadius: "12px",
        border: state === "error" ? "1px solid rgba(255,59,48,0.2)" : "1px solid rgba(0,0,0,0.08)",
        background: state === "error" ? "rgba(255,59,48,0.04)" : "#fff",
        fontSize: "13px",
        fontWeight: 500,
        color: state === "error" ? "#ff3b30" : "#1d1d1f",
        cursor: state === "loading" ? "wait" : "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={(e) => {
        if (state !== "loading") {
          e.currentTarget.style.background = state === "error" ? "rgba(255,59,48,0.08)" : "#f5f5f7";
          e.currentTarget.style.borderColor = state === "error" ? "rgba(255,59,48,0.3)" : "rgba(0,113,227,0.20)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = state === "error" ? "rgba(255,59,48,0.04)" : "#fff";
        e.currentTarget.style.borderColor = state === "error" ? "rgba(255,59,48,0.2)" : "rgba(0,0,0,0.08)";
      }}
    >
      {state === "loading" ? (
        <Loader2 size={15} strokeWidth={1.5} className="animate-spin" />
      ) : (
        <Eye size={15} strokeWidth={1.5} />
      )}
      {state === "error" ? "재시도" : "등기감시 등록"}
    </button>
  );
}
