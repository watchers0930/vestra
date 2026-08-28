"use client";

import { useState } from "react";
import s from "../keepzip-renewal.module.css";

interface Props {
  /** 데모: 결제 임의승인 → 변호사 검증 단계로. 실서비스는 토스 결제 confirm 연동 예정. */
  onPaid: () => void;
}

const METHODS = ["카카오페이", "신용카드", "토스페이"];
const INCLUDED = ["AI 초안 작성 포함", "변호사 검토·전자날인 포함", "우체국 등기 발송 포함"];

/** Step 3(결제) — mock. 선결제: 결제 후 변호사 검증·직인 → 발송. 노쉐어: 9,900원 = 변호사 서비스료 전액 + 우체국 실비. */
export function Step4Payment({ onPaid }: Props) {
  const [method, setMethod] = useState(METHODS[0]);
  const [paying, setPaying] = useState(false);

  const pay = () => {
    setPaying(true);
    // mock: 결제 임의승인. 실연동 시 /api/keepzip/payment/confirm 호출로 교체.
    onPaid();
  };

  return (
    <div className={s.centerCol}>
      <div className={s.panel}>
        <div className={s.docTitle}>결제하고 변호사에게 보내기</div>
        <ul className={s.checkList}>
          {INCLUDED.map((c) => (
            <li key={c} className={`${s.checkItem} ${s.checkDone}`}><span className={s.checkMark}>✓</span>{c}</li>
          ))}
        </ul>

        <div className={s.payMethods}>
          {METHODS.map((m) => (
            <button key={m} type="button"
              className={`${s.payMethod} ${method === m ? s.payMethodOn : ""}`}
              onClick={() => setMethod(m)}>{m}</button>
          ))}
        </div>

        <div className={s.payTotal}>
          <span>총 결제금액</span>
          <strong>9,900원</strong>
        </div>
        <p className={s.note}>변호사 서비스료 9,900원 + 우체국 등기 실비 포함. 서비스료 전액은 담당 변호사에게 지급됩니다. 결제 후 변호사 검증·직인을 거쳐 발송됩니다.</p>

        <button className={s.submitBtn} style={{ marginTop: 12 }} disabled={paying} onClick={pay}>
          {paying ? "처리 중..." : "9,900원 결제하고 변호사에게 보내기"}
        </button>
        <p className={s.demoInline}>※ 현재 결제는 데모(임의승인)입니다. 실제 카드 결제는 발생하지 않습니다.</p>
      </div>
    </div>
  );
}
