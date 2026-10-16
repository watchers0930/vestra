"use client";

import { useState } from "react";
import s from "../../monitoring-renewal.module.css";
import g from "../../guest/guest.module.css";
import { formatMobile } from "@/lib/phone-format";
import type { GuestDraft, GuestMonitoringRole } from "../../guest/guestTypes";
import type { ApplyInput } from "../../hooks/useGuestApply";
import GuestPdfDropField from "./GuestPdfDropField";
import GuestExtractionPanel from "./GuestExtractionPanel";
import GuestRoleSelect from "./GuestRoleSelect";

interface Props {
  draft: GuestDraft | null;
  busy: boolean;
  error: string;
  /** OTP 취소·재발송·재마운트 시 복원할 이름·전화(설계 §4.4) */
  initialName?: string;
  initialPhone?: string;
  /** 선택 역할 — 훅이 초안 수명주기에 결합해 단일 관리하므로 controlled로 받는다(리뷰 지적 1·2). */
  role: GuestMonitoringRole | null;
  onRoleChange: (role: GuestMonitoringRole) => void;
  /** 인증 시작으로 서버에 확정된 역할. true면 같은 초안에서 역할 변경 불가("다시 입력"으로만). */
  roleLocked: boolean;
  onParse: (input: ApplyInput) => void;
  onProceed: (guestName: string, guestPhone: string, role: GuestMonitoringRole) => void;
  /** 추출 결과 "다시 입력" — 초안을 무효화하고 재분석(설계 §4.2) */
  onEdit: () => void;
}

/**
 * 비회원 신청 입력 폼 — 조합·진입 역할만 담당 (설계 §4.1·§4.2 / §1.2).
 * 흐름: 이름·전화·PDF 입력 → parse-pdf → (추출 성공 시) 추출 확인(GuestExtractionPanel) →
 *       역할 선택(GuestRoleSelect) → 필수 동의 → 본인인증 후 결제.
 * 물건 식별은 PDF 하나로 통합되어 **주소 입력란이 없다**. 분석 완료 후 입력을 잠가, PDF/이름/전화를 바꾼
 * 채 이전 초안으로 결제되는 것을 막는다(정정은 "다시 입력"으로 재분석). 서버가 추출한 고유번호/소유자는
 * 마스킹 표기만 노출한다(원문·평문 미노출).
 */
export default function GuestApplyForm({
  draft,
  busy,
  error,
  initialName = "",
  initialPhone = "",
  role,
  onRoleChange,
  roleLocked,
  onParse,
  onProceed,
  onEdit,
}: Props) {
  const [guestName, setGuestName] = useState(initialName);
  // 표시는 하이픈 포맷(formatMobile), 서버 정규화·해시는 normalizeGuestPhone이 담당(설계 §4.1-2).
  const [guestPhone, setGuestPhone] = useState(formatMobile(initialPhone));
  const [file, setFile] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);

  const parsed = draft?.extractionOk ? draft : null;
  const locked = !!parsed; // 분석 완료 → 입력 잠금(설계 §4.1-4)
  const inputsDisabled = busy || locked;

  const handleEdit = () => {
    // 재분석 시 동의도 무효화. 역할 초기화는 훅(onEdit→reset)이 초안 폐기와 함께 처리한다(리뷰 지적 2).
    setAgree(false);
    onEdit();
  };

  return (
    <div className={g.card}>
      <p className={g.cardTitle}>비회원 등기감시 신청</p>
      <p className={g.cardSub}>
        이름·전화번호를 입력하고 등기부등본 PDF를 올리면, 주소·동/호·소유자를 자동으로 확인합니다.
        결제 전에 휴대폰 본인인증으로 신청자 본인임을 확인합니다.
      </p>

      <div className={g.field}>
        <label className={s.mLabel} htmlFor="guest-apply-name">이름</label>
        <input
          id="guest-apply-name"
          className={s.mInput}
          type="text"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="신청자 본인 이름"
          disabled={inputsDisabled}
        />
      </div>

      <div className={g.field}>
        <label className={s.mLabel} htmlFor="guest-apply-phone">전화번호</label>
        <input
          id="guest-apply-phone"
          className={s.mInput}
          type="tel"
          value={guestPhone}
          onChange={(e) => setGuestPhone(formatMobile(e.target.value))}
          placeholder="예: 010-1234-5678"
          disabled={inputsDisabled}
          inputMode="tel"
          autoComplete="tel"
        />
      </div>

      <div className={g.field}>
        <div className={s.mLabel} id="guest-apply-pdf-label">등기부등본 PDF</div>
        <GuestPdfDropField file={file} disabled={inputsDisabled} onFile={setFile} />
      </div>

      {parsed && <GuestExtractionPanel draft={parsed} busy={busy} onEdit={handleEdit} />}

      {parsed && (
        <GuestRoleSelect value={role} disabled={busy} locked={roleLocked} onChange={onRoleChange} />
      )}

      {error && (
        <p className={g.errorText} role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {!parsed ? (
        <button
          className={g.btnPrimary}
          onClick={() => onParse({ guestName, guestPhone, file })}
          disabled={busy}
          style={{ marginTop: 8 }}
        >
          {busy ? "등기부 분석 중..." : "등기부 분석하기"}
        </button>
      ) : (
        <>
          <label className={g.agreeRow}>
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={busy}
            />
            <span>서비스 이용약관 및 개인정보 처리(본인인증·감시 목적)에 동의합니다. (필수)</span>
          </label>
          <button
            className={g.btnPrimary}
            onClick={() => role && onProceed(guestName, guestPhone, role)}
            disabled={busy || !agree || !role}
          >
            {busy ? "진행 중..." : "본인인증 후 결제 (10,000원)"}
          </button>
        </>
      )}
    </div>
  );
}
