"use client";

import s from "../keepzip-renewal.module.css";

export type Delivery = "sending" | "delivered" | "returned";

interface Props {
  delivery: Delivery;
  trackingNo: string;
  busy?: boolean;
  /** 데모: 우체국 배달결과 시뮬(서버 DB 반영). 실서비스는 우체국 종적조회 API가 자동 수신. */
  onDeliver: () => void;
  onReturn: () => void;
}

/** Step 5 — 등기 발송 현황 추적. */
export function Step5Tracking({ delivery, trackingNo, busy, onDeliver, onReturn }: Props) {
  const nodes = [
    { label: "내용증명 접수완료", state: "done" },
    { label: "우체국 발송처리", state: "done" },
    {
      label: "배달 중",
      state: delivery === "sending" ? "active" : "done",
    },
    {
      label: delivery === "returned" ? "반송 (수령거부·폐문부재)" : "배달완료",
      state: delivery === "delivered" ? "done" : delivery === "returned" ? "err" : "pending",
    },
  ];

  return (
    <div className={s.centerCol}>
      <div className={s.panel}>
        <div className={s.docHead}>
          <span className={s.panelTitle}>발송 현황</span>
          <span className={s.trackNo}>등기 {trackingNo}</span>
        </div>

        <ul className={s.trackList}>
          {nodes.map((n) => (
            <li key={n.label} className={`${s.trackNode} ${s[`track_${n.state}`] ?? ""}`}>
              <span className={s.trackDot}>{n.state === "done" ? "✓" : n.state === "err" ? "!" : ""}</span>
              {n.label}
            </li>
          ))}
        </ul>

        {delivery === "sending" && (
          <div className={s.demoBox}>
            🎮 데모 컨트롤 — 실서비스에서는 우체국 API가 배달결과를 자동 수신합니다.
            <div className={s.demoRow}>
              <button className={s.demoBtn} disabled={busy} onClick={onDeliver}>수령완료로 진행 →</button>
              <button className={s.demoBtnAlt} disabled={busy} onClick={onReturn}>수령거부·폐문부재 →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
