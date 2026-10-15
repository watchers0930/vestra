"use client";

import g from "../guest.module.css";
import { useGuestApply } from "../../hooks/useGuestApply";
import GuestApplyForm from "../../components/guest/GuestApplyForm";
import GuestApplyResult from "../../components/guest/GuestApplyResult";

const PHASE_STEP: Record<string, number> = {
  input: 1,
  ready: 1,
  verifying: 2,
  ordering: 2,
  paying: 2,
  recovering: 2,
  done: 3,
  failed: 2,
};

function Steps({ current }: { current: number }) {
  const items = [
    { n: 1, label: "신청 입력" },
    { n: 2, label: "인증·결제" },
    { n: 3, label: "완료" },
  ];
  return (
    <div className={g.steps}>
      {items.map((it, i) => {
        const on = current >= it.n;
        const done = current > it.n;
        return (
          <div key={it.n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div className={`${g.stepDot} ${on ? g.stepDotOn : ""}`}>
              <span className={`${g.stepNum} ${done ? g.stepNumDone : on ? g.stepNumOn : ""}`}>
                {it.n}
              </span>
              {it.label}
            </div>
            {i < items.length - 1 && <span className={g.stepBar} />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * 비회원 신청 흐름 오케스트레이션. 랜딩 섹션과 /guest/apply 라우트에서 공용으로 쓴다.
 * 리다이렉트 복귀 재개는 useGuestApply 내부(window.location 기반)에서 처리한다.
 */
export default function GuestApplyClient({ initialAddress = "" }: { initialAddress?: string }) {
  const { phase, draft, orderState, error, busy, submitParse, startIdentity, retry, reset } =
    useGuestApply();

  const step = PHASE_STEP[phase] ?? 1;

  if (phase === "done" && orderState) {
    return (
      <div className={`${g.wrap} ${g.narrow}`}>
        <Steps current={3} />
        <GuestApplyResult order={orderState} />
      </div>
    );
  }

  // 리다이렉트 복귀 직후 주문 생성/결제창 진입 — 폼 대신 전이 화면(복귀 시 draft가 없을 수 있음)
  if (phase === "ordering" || phase === "paying") {
    return (
      <div className={`${g.wrap} ${g.narrow}`}>
        <Steps current={2} />
        <div className={g.card}>
          <div className={g.centerBox}>
            <div className={g.spinner} />
            {phase === "paying" ? "결제창으로 이동하고 있습니다..." : "주문을 생성하고 있습니다..."}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "recovering") {
    return (
      <div className={`${g.wrap} ${g.narrow}`}>
        <Steps current={2} />
        <div className={g.card}>
          <div className={g.centerBox}>
            <div className={g.spinner} />
            {error || "결제 결과를 확인하고 있습니다..."}
          </div>
          {error && (
            <div className={g.btnRow}>
              <button className={g.btnGhost} onClick={retry} disabled={busy}>
                다시 확인
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className={`${g.wrap} ${g.narrow}`}>
        <Steps current={2} />
        <div className={g.card}>
          <div className={g.centerBox} style={{ color: "#b91c1c" }}>
            {error || "신청을 완료하지 못했습니다."}
          </div>
          <div className={g.btnRow}>
            <button className={g.btnPrimary} style={{ maxWidth: 200 }} onClick={retry} disabled={busy}>
              다시 시도
            </button>
            <button className={g.btnGhost} onClick={reset} disabled={busy}>
              처음부터
            </button>
          </div>
        </div>
      </div>
    );
  }

  // input | ready | verifying
  return (
    <div className={`${g.wrap} ${g.narrow}`}>
      <Steps current={step} />
      <GuestApplyForm
        draft={draft}
        busy={busy}
        error={error}
        initialAddress={initialAddress}
        onParse={submitParse}
        onProceed={startIdentity}
        onEdit={reset}
      />
    </div>
  );
}
