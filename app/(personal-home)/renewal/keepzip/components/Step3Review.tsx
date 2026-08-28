"use client";

import s from "../keepzip-renewal.module.css";

interface Props {
  lawyerName?: string;
  approved: boolean;
  busy?: boolean;
  /** 데모: 변호사 승인 시뮬레이션 (실서비스는 변호사가 대시보드에서 승인·직인) */
  onApprove: () => void;
  /** 검증·직인 완료 후 우체국 등기 발송 */
  onSend: () => void;
}

const CHECKS = ["AI 초안 수령 확인", "법률 조항 및 사실관계 검토", "전자 날인 및 승인"];

/** Step 4 — 변호사 검증·직인 대기/완료(결제 후). 승인 시 발송. */
export function Step3Review({ lawyerName, approved, busy, onApprove, onSend }: Props) {
  const name = lawyerName ?? "제휴 변호사";
  return (
    <div className={s.centerCol}>
      <div className={s.panel}>
        <div className={s.reviewHead}>
          <div className={s.reviewAvatar}>{name.charAt(0)}</div>
          <div>
            <div className={s.reviewName}>{name}</div>
            <div className={s.reviewSub}>집키퍼 제휴 변호사 · 임대차 전문</div>
          </div>
        </div>

        <ul className={s.checkList}>
          {CHECKS.map((c, i) => (
            <li key={c} className={`${s.checkItem} ${approved || i === 0 ? s.checkDone : ""}`}>
              <span className={s.checkMark}>{approved || i === 0 ? "✓" : i + 1}</span>{c}
            </li>
          ))}
        </ul>

        {approved ? (
          <>
            <div className={s.assignBadge} style={{ marginTop: 16, marginBottom: 0, textAlign: "center" }}>
              ✓ 변호사 검토·직인이 완료되었습니다. 우체국 등기로 발송할 수 있습니다.
            </div>
            <button className={s.submitBtn} style={{ marginTop: 12 }} disabled={busy} onClick={onSend}>
              {busy ? "처리 중..." : "우체국 등기로 발송하기"}
            </button>
          </>
        ) : (
          <>
            <div className={s.loadWrap} style={{ minHeight: 100 }}>
              <div className={s.spinner} />변호사가 초안을 검토하고 있습니다…
            </div>
            <div className={s.demoBox}>
              🎮 데모 컨트롤 — 실서비스에서는 변호사가 대시보드에서 승인·직인합니다.
              <button className={s.demoBtn} onClick={onApprove}>변호사 승인 처리 →</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
