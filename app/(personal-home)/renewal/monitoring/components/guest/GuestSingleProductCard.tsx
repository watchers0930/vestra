"use client";

import { GUEST_SINGLE_MONITORING } from "@/lib/pricing-plans";
import g from "../../guest/guest.module.css";

/**
 * 비회원 단건 상품 카드 (설계 §2.3 / §5.1).
 * 표시 값은 요금제 SSOT(GUEST_SINGLE_MONITORING) 를 그대로 참조한다.
 * 실제 과금 금액/기간은 서버가 주문 생성 시 SSOT로 결정하며, 이 카드는 안내 표시용이다.
 */
export default function GuestSingleProductCard() {
  const p = GUEST_SINGLE_MONITORING;
  const priceLabel = p.amount.toLocaleString("ko-KR");
  return (
    <div className={g.productCard}>
      <div className={g.productInfo}>
        <span className={g.productBadge}>비회원 단건</span>
        <p className={g.productName}>등기감시 1건 · {p.months}개월</p>
        <p className={g.productMeta}>
          회원가입 없이 신청 · 하루 2회 정기 점검 · 자동결제 없음
        </p>
      </div>
      <div className={g.productPriceBox}>
        <div>
          <span className={g.productPrice}>{priceLabel}</span>
          <span className={g.productPriceUnit}>원</span>
        </div>
        <div className={g.productPriceSub}>물건 {p.propertyCount}건 / {p.months}개월 총액</div>
      </div>
    </div>
  );
}
