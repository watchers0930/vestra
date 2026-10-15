"use client";

import Link from "next/link";
import g from "../../guest/guest.module.css";
import { GUEST_STATUS_PATH } from "../../guest/guestProvider";
import GuestServiceNotice from "./GuestServiceNotice";
import GuestSingleProductCard from "./GuestSingleProductCard";
import GuestMemberPlans from "./GuestMemberPlans";
import GuestApplyClient from "../../guest/apply/GuestApplyClient";

/**
 * 비회원 등기감시 진입 섹션 (설계 §4.1-1 / step 4).
 * 로그인 강제 없이 유료 공지 + 회원 요금제(SSOT) + 단건 상품 카드 + 신청폼을 한 화면에 노출한다.
 */
export default function GuestEntrySection({ initialAddress = "" }: { initialAddress?: string }) {
  return (
    <div className={g.wrap}>
      <GuestServiceNotice />

      <GuestSingleProductCard />

      <h2 className={g.sectionTitle}>회원이라면 더 많은 물건을 감시할 수 있어요</h2>
      <p className={g.sectionSub}>비회원은 1건·1개월 단건으로, 회원은 구독으로 여러 물건을 계속 감시합니다.</p>
      <GuestMemberPlans />

      <h2 className={g.sectionTitle}>지금 신청하기</h2>
      <p className={g.sectionSub}>
        이미 신청하셨다면 <Link href={GUEST_STATUS_PATH} style={{ color: "#2e4bd8", fontWeight: 600 }}>감시 현황 조회</Link>에서 본인인증 후 기록을 확인하세요.
      </p>
      <GuestApplyClient initialAddress={initialAddress} />
    </div>
  );
}
