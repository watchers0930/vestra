"use client";

import g from "../../guest/guest.module.css";
import type { GuestPropertyDto } from "@/types/guest-monitoring";

// 이용기간은 KST 기준 표기(설계 §4.5)
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

interface Props {
  properties: GuestPropertyDto[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * 본인 신청 물건 선택 목록 (설계 §3.4 /properties).
 * 최소 식별 정보(짧은 주소·상태·이용기간)만 노출. 고유번호·소유자·PII는 포함하지 않는다.
 */
export default function GuestPropertyPicker({ properties, selectedId, onSelect }: Props) {
  if (properties.length === 0) {
    return (
      <div className={g.centerBox}>
        조회 가능한 신청 물건이 없습니다. 신청하신 이름·전화번호가 맞는지 확인해 주세요.
      </div>
    );
  }

  return (
    <div className={g.propList}>
      {properties.map((p) => (
        <button
          key={p.id}
          className={`${g.propItem} ${selectedId === p.id ? g.propItemSel : ""}`}
          onClick={() => onSelect(p.id)}
        >
          <div>
            <div className={g.propItemAddr}>{p.addressShort}</div>
            <div className={g.propItemMeta}>
              {fmtDate(p.startedAt)} ~ {fmtDate(p.paidUntil)}
            </div>
          </div>
          <span className={p.status === "active" ? g.badgeActive : g.badgeExpired}>
            {p.status === "active" ? "감시 중" : "만료"}
          </span>
        </button>
      ))}
    </div>
  );
}
