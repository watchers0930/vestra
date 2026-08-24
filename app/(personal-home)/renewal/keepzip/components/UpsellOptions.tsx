"use client";

import s from "../keepzip-renewal.module.css";

export type UpsellVariant = "unresponded" | "returned";

interface UpsellItem {
  key: string;
  title: string;
  price: string;
  desc: string;
  points: string[];
  cta: string;
}

const ITEMS: Record<UpsellVariant, UpsellItem[]> = {
  unresponded: [
    {
      key: "payment_order",
      title: "지급명령 패키지",
      price: "99,000원",
      desc: "법원에 지급명령을 신청해 임대인에게 보증금 반환을 강제하는 절차입니다. 서류는 AI가 자동 생성하고 변호사가 검토 후 제출합니다.",
      points: ["이의신청 없으면 확정판결과 동일한 효력", "서류 작성부터 법원 제출까지 원스톱", "처리 기간 약 2~4주"],
      cta: "지급명령 패키지 신청하기 →",
    },
    {
      key: "litigation",
      title: "변호사 선임 (정식 소송)",
      price: "별도 상담",
      desc: "지급명령에 불응하거나 이의신청 시, 제휴 변호사를 선임해 보증금반환청구 소송으로 진행합니다.",
      points: ["임대차 전문 제휴 변호사 매칭", "임차권등기명령 병행 가능", "착수금·성공보수는 개별 상담 후 결정"],
      cta: "변호사 상담 신청하기 →",
    },
  ],
  returned: [
    {
      key: "public_notice",
      title: "공시송달 자동 전환",
      price: "안내",
      desc: "임대인이 등기를 수령하지 않아 반송되었습니다. 법원 공시송달로 전환하면 상대방이 수령하지 않아도 법적으로 송달된 것과 동일한 효력이 발생합니다.",
      points: ["법원 게시 후 2주 경과 시 송달 효력 발생", "이후 지급명령·소송 절차 연계 가능"],
      cta: "공시송달 자동 신청하기 →",
    },
  ],
};

/** 미대응/반송 시 다음 절차 카드. (버튼은 데모 — 실 흐름은 결제·상담 연동 예정) */
export function UpsellOptions({ variant, onSelect }: { variant: UpsellVariant; onSelect: (key: string) => void }) {
  return (
    <div className={s.upsellGrid}>
      {ITEMS[variant].map((it) => (
        <div key={it.key} className={s.upsellCard}>
          <div className={s.upsellHead}>
            <span className={s.upsellTitle}>{it.title}</span>
            <span className={s.upsellPrice}>{it.price}</span>
          </div>
          <p className={s.upsellDesc}>{it.desc}</p>
          <ul className={s.upsellPoints}>
            {it.points.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <button className={s.submitBtn} onClick={() => onSelect(it.key)}>{it.cta}</button>
        </div>
      ))}
    </div>
  );
}
