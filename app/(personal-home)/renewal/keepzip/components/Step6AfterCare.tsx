"use client";

import { useState } from "react";
import s from "../keepzip-renewal.module.css";
import { UpsellOptions } from "./UpsellOptions";
import { FollowUpFlow, type FollowUpVariant } from "./FollowUpFlow";

interface Props {
  caseStatus: string;
  deliveredAt: string | null;
  busy?: boolean;
  onResolve: () => void;
  onUnrespond: () => void;
  onFollowUp: (v: FollowUpVariant) => void;
  onReset: () => void;
}

/** 이행기한(발송일+7일)까지 남은 일수 라벨 */
function ddayLabel(deliveredAt: string | null): string {
  if (!deliveredAt) return "D-7";
  const due = new Date(deliveredAt).getTime() + 7 * 86_400_000;
  const diff = Math.ceil((due - Date.now()) / 86_400_000);
  return diff >= 0 ? `D-${diff}` : `D+${-diff}`;
}

/** Step 6 — 발송 후 사후관리(이행기한 → 해결 / 지급명령·소송 / 공시송달). DB 상태 기반. */
export function Step6AfterCare({
  caseStatus, deliveredAt, busy, onResolve, onUnrespond, onFollowUp, onReset,
}: Props) {
  const [active, setActive] = useState<FollowUpVariant | null>(null);

  // 후속 절차 완료 상태
  if (caseStatus === "payment_order") return <FollowUpFlow variant="payment_order" done busy={busy} onConfirm={() => {}} onReset={onReset} />;
  if (caseStatus === "litigation") return <FollowUpFlow variant="litigation" done busy={busy} onConfirm={() => {}} onReset={onReset} />;
  if (caseStatus === "public_notice") return <FollowUpFlow variant="public_notice" done busy={busy} onConfirm={() => {}} onReset={onReset} />;

  // 종결(임대인 대응)
  if (caseStatus === "closed") {
    return (
      <div className={s.centerCol}>
        <div className={s.panel}>
          <div className={s.resolveMark}>✓</div>
          <div className={s.docTitle}>사건이 해결되었습니다</div>
          <p className={s.note} style={{ textAlign: "center" }}>
            임대인이 이행기한 내 보증금을 반환하여 사건이 정상 종결되었습니다. 수고하셨습니다.
          </p>
          <button className={s.proceedBtn} onClick={onReset}>새 사건 접수하기</button>
        </div>
      </div>
    );
  }

  // 반송 → 공시송달
  if (caseStatus === "returned") {
    if (active === "public_notice") {
      return <FollowUpFlow variant="public_notice" done={false} busy={busy}
        onConfirm={() => onFollowUp("public_notice")} onBack={() => setActive(null)} onReset={onReset} />;
    }
    return (
      <div className={s.centerCol}>
        <div className={s.panel}>
          <div className={s.docTitle}>📪 등기가 반송되었습니다</div>
          <p className={s.note} style={{ textAlign: "center" }}>
            임대인이 등기를 수령하지 않아 반송 처리되었습니다. 내용증명 도달이 인정되지 않아 별도 송달 절차가 필요합니다.
          </p>
          <UpsellOptions variant="returned" onSelect={(k) => setActive(k as FollowUpVariant)} />
          <button className={s.proceedBtn} onClick={onReset}>새 사건 접수하기</button>
        </div>
      </div>
    );
  }

  // 미대응 → 지급명령 / 소송
  if (caseStatus === "unresponded") {
    if (active === "payment_order" || active === "litigation") {
      return <FollowUpFlow variant={active} done={false} busy={busy}
        onConfirm={() => onFollowUp(active)} onBack={() => setActive(null)} onReset={onReset} />;
    }
    return (
      <div className={s.centerCol}>
        <div className={s.panel}>
          <div className={s.docTitle}>⚠ 임대인이 이행기한 내 대응하지 않았습니다</div>
          <p className={s.note}>
            내용증명만으로는 법적 강제력이 없습니다. 아래 절차로 보증금 반환을 강제할 수 있습니다.
          </p>
          <UpsellOptions variant="unresponded" onSelect={(k) => setActive(k as FollowUpVariant)} />
          <button className={s.proceedBtn} onClick={onReset}>새 사건 접수하기</button>
        </div>
      </div>
    );
  }

  // 배달완료 → 이행기한 관리 (caseStatus === "delivered")
  return (
    <div className={s.centerCol}>
      <div className={s.panel}>
        <div className={s.ddayRow}>
          <div className={s.docTitle} style={{ margin: 0 }}>보증금 반환 이행기한</div>
          <span className={s.dday}>{ddayLabel(deliveredAt)}</span>
        </div>
        <p className={s.note}>내용증명이 임대인에게 도달했습니다. 이행기한(도달일+7일) 내 대응 여부를 확인합니다.</p>
        <div className={s.demoBox}>
          🎮 데모 컨트롤 — 이행기한 경과 전후 임대인 대응을 시뮬레이션합니다.
          <div className={s.demoRow}>
            <button className={s.demoBtn} disabled={busy} onClick={onResolve}>임대인 대응함 (보증금 반환) →</button>
            <button className={s.demoBtnAlt} disabled={busy} onClick={onUnrespond}>기한 경과 · 미대응 →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
