"use client";

import { MapPin } from "lucide-react";
import g from "../../guest/guest.module.css";
import type { GuestDraft } from "../../guest/guestTypes";

interface Props {
  draft: GuestDraft;
  busy: boolean;
  /** "다시 입력(PDF 교체)" — 기존 초안·인증·동의를 무효화하고 재분석(설계 §4.2) */
  onEdit: () => void;
}

/**
 * 추출 결과 확인 패널 (설계 §4.2 / §1.2).
 * 서버가 PDF에서 추출한 주소·동/호·부동산 고유번호·소유자를 **읽기전용**으로 표시한다.
 * 핵심 식별자(소유자/고유번호/주소)를 자유 텍스트로 수정하는 입력은 두지 않는다. 정정은
 * "다시 입력"으로 PDF를 교체해 재분석(새 초안)하는 경로로만 한다(설계 §6 결정).
 * 고유번호·소유자는 인증 전 마스킹 값만 노출한다(원문·평문 미노출).
 */
export default function GuestExtractionPanel({ draft, busy, onEdit }: Props) {
  const unit = draft.unitNumber;
  // 집합건물 전유부분이 있을 때만 동/호를 보인다. 비집합건물은 동/호 "해당 없음"(설계 §2.6).
  const showUnit = !!unit?.isAggregate && (!!unit.buildingDong || !!unit.unitHo);

  return (
    <div className={g.confirmBox}>
      <div className={g.panelHead}>
        <span className={g.panelTitle}>등기부에서 확인된 물건 정보</span>
        <button type="button" className={g.panelEdit} onClick={onEdit} disabled={busy}>
          다시 입력
        </button>
      </div>

      <div className={g.confirmRow}>
        <span className={g.confirmKey}>
          <MapPin size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
          확인된 주소
        </span>
        <span className={g.confirmVal}>{draft.address}</span>
      </div>

      {showUnit && (
        <div className={g.confirmRow}>
          <span className={g.confirmKey}>동/호수</span>
          <span className={g.confirmVal}>
            {[unit.buildingDong ? `${unit.buildingDong}동` : "", unit.unitHo ? `${unit.unitHo}호` : ""]
              .filter(Boolean)
              .join(" ") || "-"}
          </span>
        </div>
      )}

      <div className={g.confirmRow}>
        <span className={g.confirmKey}>부동산 고유번호</span>
        <span className={g.confirmVal}>{draft.commUniqueNoMasked}</span>
      </div>
      <div className={g.confirmRow}>
        <span className={g.confirmKey}>등기부상 소유자</span>
        <span className={g.confirmVal}>{draft.ownerNameMasked}</span>
      </div>

      <p className={g.panelNote}>
        주소·소유자·고유번호는 올리신 등기부 PDF에서 자동으로 확인한 값입니다. 내용이 다르면
        &ldquo;다시 입력&rdquo;으로 올바른 PDF를 다시 올려 주세요.
      </p>
    </div>
  );
}
