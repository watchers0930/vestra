"use client";

import g from "../../guest/guest.module.css";
import type { GuestMonitoringRole } from "../../guest/guestTypes";

interface Props {
  value: GuestMonitoringRole | null;
  disabled: boolean;
  /** 인증 시작으로 서버에 확정된 역할. true면 같은 초안에서 변경 불가("다시 입력"으로만, 리뷰 지적 1). */
  locked?: boolean;
  onChange: (role: GuestMonitoringRole) => void;
}

const OPTIONS: { value: GuestMonitoringRole; title: string; desc: string }[] = [
  { value: "owner", title: "소유자 (내 물건)", desc: "등기부상 소유자가 본인입니다." },
  { value: "tenant", title: "임차인 (세입자)", desc: "전·월세로 거주·계약한 물건입니다." },
];

/**
 * 신청 역할 선택 (설계 §4.2 / §1.2).
 * 접근 가능한 radio group — 기본 선택 없음, owner/tenant 동일 비중. 미선택 시 상위에서 인증·결제 진입을
 * 막고 서버도 거부한다(설계 §3.4-B). 선택값은 identity/start(apply)로 전송돼 서버가 enum으로 확정한다.
 * 인증을 시작하면 서버가 역할을 초안에 확정하므로(bindDraftRole), locked에서는 변경을 막고 "다시 입력"
 * 으로만 바꾸도록 안내한다(리뷰 지적 1).
 */
export default function GuestRoleSelect({ value, disabled, locked = false, onChange }: Props) {
  return (
    <div className={g.field}>
      <div className={g.cardTitle} style={{ fontSize: 13, margin: "0 0 8px" }} id="guest-role-label">
        신청 역할
      </div>
      <div className={g.roleGroup} role="radiogroup" aria-labelledby="guest-role-label">
        {OPTIONS.map((opt) => {
          const selected = value === opt.value;
          return (
            <label
              key={opt.value}
              className={`${g.roleOption} ${selected ? g.roleOptionSel : ""} ${locked ? g.roleOptionLocked : ""}`}
            >
              <input
                type="radio"
                name="guest-apply-role"
                value={opt.value}
                checked={selected}
                onChange={() => onChange(opt.value)}
                disabled={disabled || locked}
              />
              <span className={g.roleText}>
                <span className={g.roleTitle}>{opt.title}</span>
                <span className={g.roleDesc}>{opt.desc}</span>
              </span>
            </label>
          );
        })}
      </div>
      {locked && (
        <p className={g.roleLockNote}>
          본인인증을 시작해 신청 역할이 확정되었습니다. 역할을 바꾸려면 위 &ldquo;다시 입력&rdquo;으로
          등기부 PDF를 다시 올려 주세요.
        </p>
      )}
    </div>
  );
}
