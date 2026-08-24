"use client";

import { useState } from "react";
import s from "../keepzip-renewal.module.css";
import { UpsellOptions } from "./UpsellOptions";
import type { Delivery } from "./Step5Tracking";

interface Props {
  delivery: Delivery;
  onSelectUpsell: (key: string) => void;
  onReset: () => void;
}

type Response = "waiting" | "responded" | "unresponded";

/** Step 6 — 이행기한 관리 및 사후 분기(해결 / 지급명령·소송 / 공시송달). */
export function Step6AfterCare({ delivery, onSelectUpsell, onReset }: Props) {
  const [resp, setResp] = useState<Response>("waiting");

  // 반송(수령거부·폐문부재) → 공시송달 경로
  if (delivery === "returned") {
    return (
      <div className={s.centerCol}>
        <div className={s.panel}>
          <div className={s.docTitle}>📪 등기가 반송되었습니다</div>
          <p className={s.note} style={{ textAlign: "center" }}>
            임대인이 등기를 수령하지 않아 반송 처리되었습니다. 내용증명 도달이 인정되지 않아 별도 송달 절차가 필요합니다.
          </p>
          <UpsellOptions variant="returned" onSelect={onSelectUpsell} />
          <button className={s.proceedBtn} onClick={onReset}>새 사건 접수하기</button>
        </div>
      </div>
    );
  }

  // 배달완료 → 이행기한 관리
  return (
    <div className={s.centerCol}>
      <div className={s.panel}>
        {resp === "waiting" && (
          <>
            <div className={s.ddayRow}>
              <div className={s.docTitle} style={{ margin: 0 }}>보증금 반환 이행기한</div>
              <span className={s.dday}>D-7</span>
            </div>
            <p className={s.note}>내용증명이 임대인에게 도달했습니다. 이행기한(7일) 내 대응 여부를 확인합니다.</p>
            <div className={s.demoBox}>
              🎮 데모 컨트롤 — 이행기한 경과 전후 임대인 대응을 시뮬레이션합니다.
              <div className={s.demoRow}>
                <button className={s.demoBtn} onClick={() => setResp("responded")}>임대인 대응함 (보증금 반환) →</button>
                <button className={s.demoBtnAlt} onClick={() => setResp("unresponded")}>기한 경과 · 미대응 →</button>
              </div>
            </div>
          </>
        )}

        {resp === "responded" && (
          <>
            <div className={s.resolveMark}>✓</div>
            <div className={s.docTitle}>사건이 해결되었습니다</div>
            <p className={s.note} style={{ textAlign: "center" }}>
              임대인이 이행기한 내 보증금을 반환하여 사건이 정상 종결되었습니다. 수고하셨습니다.
            </p>
            <button className={s.proceedBtn} onClick={onReset}>새 사건 접수하기</button>
          </>
        )}

        {resp === "unresponded" && (
          <>
            <div className={s.docTitle}>⚠ 임대인이 이행기한 내 대응하지 않았습니다</div>
            <p className={s.note}>
              내용증명만으로는 법적 강제력이 없습니다. 아래 절차로 보증금 반환을 강제할 수 있습니다.
            </p>
            <UpsellOptions variant="unresponded" onSelect={onSelectUpsell} />
            <button className={s.proceedBtn} onClick={onReset}>새 사건 접수하기</button>
          </>
        )}
      </div>
    </div>
  );
}
