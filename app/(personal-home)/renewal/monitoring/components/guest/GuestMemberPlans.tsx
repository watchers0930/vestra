"use client";

import Link from "next/link";
import { PRICING_PLANS } from "@/lib/pricing-plans";
import g from "../../guest/guest.module.css";

/**
 * 회원 요금제 미니 카드 (설계 §5.1 — 기존 PRICING_PLANS SSOT 재사용).
 * 비회원 신청 화면에서 "회원이면 더 저렴/다건 가능"을 함께 안내한다. 가격·기능은 전부 SSOT에서 온다.
 */
export default function GuestMemberPlans() {
  return (
    <>
      <div className={g.planGrid}>
        {PRICING_PLANS.map((plan) => (
          <div key={plan.key} className={`${g.planCard} ${plan.highlight ? g.planCardHi : ""}`}>
            {plan.highlight && <span className={g.planHiTag}>인기</span>}
            <p className={g.planName}>{plan.name}</p>
            <p className={g.planPrice}>
              {plan.monthlyLabel}
              {plan.period && <span className={g.planPeriod}>{plan.period}</span>}
            </p>
            <p className={g.planDesc}>{plan.description}</p>
            <ul className={g.planFeat}>
              {plan.features.slice(0, 4).map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className={g.planLoginNote}>
        여러 물건을 계속 감시하시려면 <Link href="/renewal/pricing">회원 요금제</Link>가 더 유리합니다.
      </p>
    </>
  );
}
