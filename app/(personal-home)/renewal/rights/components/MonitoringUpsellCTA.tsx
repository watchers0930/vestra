"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Check, Loader2, ShieldCheck, X } from "lucide-react";

interface Props {
  /** 분석 대상 주소 (result.propertyInfo?.address) */
  address?: string | null;
}

type State = "idle" | "loading" | "done" | "exists" | "error";
type Modal = null | "subscribe" | "login";

/** GA4 전환 이벤트 (gtag 있을 때만) */
function track(event: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && typeof (window as unknown as { gtag?: unknown }).gtag === "function") {
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", event, { feature: "monitoring_upsell", ...params });
  }
}

/**
 * 권리분석 결과 → 등기감시 전환 CTA (R-1).
 * 클릭 시 서버 응답으로 분기: 200=등록완료 / 409=이미감시 / 403=구독 업셀 / 401=로그인·단건 안내.
 * 상태를 미리 판별하지 않고 서버가 권한을 판정한다(추측 없음).
 */
type SingleState = "idle" | "loading" | "ok" | "limit" | "unavailable" | "error";

export default function MonitoringUpsellCTA({ address }: Props) {
  const [state, setState] = useState<State>("idle");
  const [modal, setModal] = useState<Modal>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [single, setSingle] = useState<SingleState>("idle");

  if (!address) return null;

  // 무료회원 단건 감시 주문 생성 (1건·1개월·1만원). 실결제창(다날) 연동은 후속 — 현재는 주문 생성까지.
  async function handleSingle() {
    if (single === "loading") return;
    setSingle("loading");
    track("monitoring_single_click");
    try {
      const res = await fetch("/api/monitoring/single/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, idempotencyKey: crypto.randomUUID() }),
      });
      if (res.ok) { setSingle("ok"); track("monitoring_single_order_created"); return; }
      if (res.status === 409) { setSingle("limit"); return; }
      if (res.status === 503) { setSingle("unavailable"); return; }
      setSingle("error");
    } catch { setSingle("error"); }
  }

  async function handleRegister() {
    if (state === "loading" || state === "done") return;
    setState("loading");
    track("monitoring_cta_click");
    try {
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.status === 200 || res.ok) { setState("done"); track("monitoring_register_success"); return; }
      if (res.status === 409) { setState("exists"); return; }
      if (res.status === 403) { setState("idle"); setModal("subscribe"); track("monitoring_upsell_subscribe_shown"); return; }
      if (res.status === 401) { setState("idle"); setModal("login"); track("monitoring_upsell_login_shown"); return; }
      const data = await res.json().catch(() => ({}));
      setErrorMsg(data.error || "등록에 실패했습니다.");
      setState("error");
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다.");
      setState("error");
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      {/* 전환 배너 */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
          padding: "18px 20px", borderRadius: 16,
          border: "1px solid rgba(0,113,227,0.18)", background: "rgba(0,113,227,0.04)",
        }}
      >
        <ShieldCheck size={22} style={{ color: "var(--brand-primary)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, color: "#1d1d1f" }}>계약 후에도 이 집, 안전할까요?</div>
          <div style={{ fontSize: 12.5, color: "#6e6e73", marginTop: 2 }}>
            등기 변동(근저당·소유권 등)을 하루 2회 자동 감시하고 이상 시 바로 알려드립니다.
          </div>
        </div>
        {state === "done" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12, background: "rgba(52,199,89,0.08)", color: "#34c759", fontSize: 13, fontWeight: 600 }}>
            <Check size={15} /> 감시 등록 완료
          </span>
        ) : state === "exists" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 12, background: "rgba(0,113,227,0.06)", color: "var(--brand-primary)", fontSize: 13, fontWeight: 600 }}>
            <Eye size={15} /> 이미 감시 중
          </span>
        ) : (
          <button
            onClick={handleRegister}
            disabled={state === "loading"}
            title={state === "error" ? errorMsg : undefined}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "11px 20px", borderRadius: 12,
              border: "none", background: "var(--brand-primary)", color: "#fff", fontSize: 13.5, fontWeight: 600,
              cursor: state === "loading" ? "wait" : "pointer", flexShrink: 0,
            }}
          >
            {state === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
            {state === "error" ? "재시도" : "이 집 계속 감시하기"}
          </button>
        )}
      </div>

      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "#fff", borderRadius: 18, padding: "30px 28px", maxWidth: 440, width: "100%", textAlign: "center" }}>
            <button onClick={() => setModal(null)} aria-label="닫기" style={{ position: "absolute", top: 14, right: 14, border: "none", background: "transparent", cursor: "pointer", color: "#9ca3af" }}>
              <X size={18} />
            </button>
            <ShieldCheck size={34} style={{ color: "var(--brand-primary)", margin: "0 auto 12px" }} />
            {modal === "subscribe" ? (
              <>
                <p style={{ fontSize: 17, fontWeight: 800, color: "#1d1d1f", marginBottom: 8 }}>이 집, 계속 감시할까요?</p>
                <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.65, marginBottom: 20 }}>
                  이 집만 가볍게 감시하려면 <b>단건</b>(1건·1개월·1만원), 여러 집을 지속 감시하려면<br />
                  <b>구독</b>(PRO 5건·PREMIUM 20건)을 선택하세요. 모두 하루 2회 자동 감시합니다.
                </p>
                {single === "ok" ? (
                  <p style={{ fontSize: 13, color: "#34c759", fontWeight: 600, marginBottom: 18 }}>단건 신청이 접수되었습니다. 결제 안내를 준비 중입니다.</p>
                ) : single === "limit" ? (
                  <p style={{ fontSize: 13, color: "#ff9500", fontWeight: 600, marginBottom: 18 }}>이미 단건 감시 중인 물건이 있습니다(동시 1건).</p>
                ) : single === "unavailable" ? (
                  <p style={{ fontSize: 13, color: "#6e6e73", marginBottom: 18 }}>단건 결제는 현재 준비 중입니다. 구독을 이용하시거나 잠시 후 다시 시도해주세요.</p>
                ) : single === "error" ? (
                  <p style={{ fontSize: 13, color: "#ff3b30", marginBottom: 18 }}>요청에 실패했습니다. 다시 시도해주세요.</p>
                ) : null}
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <button onClick={handleSingle} disabled={single === "loading"} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fff", color: "#1d1d1f", border: "1px solid rgba(0,0,0,0.12)", padding: "11px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: single === "loading" ? "wait" : "pointer" }}>
                    {single === "loading" ? <Loader2 size={14} className="animate-spin" /> : null}
                    이 집만 단건 (1만원)
                  </button>
                  <Link href="/renewal/pricing" onClick={() => track("monitoring_upsell_to_pricing")} style={{ display: "inline-block", background: "var(--brand-primary)", color: "#fff", padding: "11px 20px", borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                    구독 안내 보기
                  </Link>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: 17, fontWeight: 800, color: "#1d1d1f", marginBottom: 8 }}>로그인하고 이 집을 감시하세요</p>
                <p style={{ fontSize: 13, color: "#6e6e73", lineHeight: 1.65, marginBottom: 22 }}>
                  회원은 PRO·PREMIUM 구독으로 여러 집을 감시할 수 있습니다.<br />
                  회원가입 없이 먼저 써보려면 <b>비회원 단건</b>(1건·1개월·1만원)도 가능합니다.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                  <Link href="/home?auth=login" onClick={() => track("monitoring_upsell_to_login")} style={{ display: "inline-block", background: "var(--brand-primary)", color: "#fff", padding: "11px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                    로그인
                  </Link>
                  <Link href="/renewal/monitoring" onClick={() => track("monitoring_upsell_to_guest")} style={{ display: "inline-block", background: "#fff", color: "#1d1d1f", border: "1px solid rgba(0,0,0,0.12)", padding: "11px 22px", borderRadius: 12, fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                    비회원 단건 보기
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
