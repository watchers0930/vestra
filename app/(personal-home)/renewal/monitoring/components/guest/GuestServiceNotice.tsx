"use client";

import { Info } from "lucide-react";
import g from "../../guest/guest.module.css";

/**
 * 비회원 등기감시 유료 공지 (설계 §4.1-2 / 기획 2p).
 * 1건·1개월·10,000원 / 하루 2회 정기 점검 / 자동결제 없음 / 미연장 종료 / 조회 시 본인인증.
 * 프리체크의 의미(신청사건 징후 확인 ≠ 등기 변경 확정/PDF 진위)를 함께 고지한다.
 */
export default function GuestServiceNotice() {
  return (
    <div className={g.notice}>
      <div className={g.noticeTitle}>
        <Info size={16} /> 비회원 등기감시 안내
      </div>
      <ul className={g.noticeList}>
        <li>물건 1건을 1개월 동안 감시합니다. 결제 총액 10,000원(자동결제 없음).</li>
        <li>하루 2회 등기신청사건을 정기 점검해 변동 조짐을 조기에 포착합니다.</li>
        <li>1개월 만료 시 연장 안내 문자를 보내며, 연장하지 않으면 감시는 자동 종료됩니다.</li>
        <li>현황(감시 기록) 조회 시 휴대폰 본인인증이 필요합니다.</li>
      </ul>
      <p className={g.noticeSub}>
        프리체크는 등기신청사건 접수 징후를 확인하는 것으로, 등기 변경의 확정이나 제출하신 PDF의 진위
        확인을 의미하지 않습니다.
      </p>
    </div>
  );
}
