"use client";

import { useRef, useState } from "react";
import { MapPin, Upload } from "lucide-react";
import s from "../../monitoring-renewal.module.css";
import g from "../../guest/guest.module.css";
import type { GuestDraftResponse } from "@/types/guest-monitoring";
import type { ApplyInput } from "../../hooks/useGuestApply";

interface Props {
  draft: GuestDraftResponse | null;
  busy: boolean;
  error: string;
  initialAddress?: string;
  /** OTP 취소·재발송 실패로 폼이 다시 마운트될 때 복원할 이름·전화(§5.3 P0) */
  initialName?: string;
  initialPhone?: string;
  onParse: (input: ApplyInput) => void;
  onProceed: (guestName: string, guestPhone: string) => void;
  /** 분석 완료 후 입력을 다시 열어 초안을 무효화(§2) */
  onEdit: () => void;
}

/**
 * 비회원 신청 입력 폼 (설계 §4.1-3~7).
 * 이름·전화·주소·PDF 입력 → parse-pdf → (추출 성공 시) 본인인증·결제 진입.
 * 서버가 추출한 고유번호/소유자는 마스킹 표기만 노출한다(원문·평문 미노출).
 *
 * 견고성: 분석 완료 후 입력을 잠가, 주소/PDF/이름/전화를 바꾼 채 이전 초안으로 결제되는 것을
 * 막는다(§2). 수정하려면 "다시 입력"으로 초안을 무효화한 뒤 재분석한다.
 * PDF 선택은 네이티브 button 으로 키보드 접근을 보장한다(§12).
 */
export default function GuestApplyForm({
  draft,
  busy,
  error,
  initialAddress = "",
  initialName = "",
  initialPhone = "",
  onParse,
  onProceed,
  onEdit,
}: Props) {
  // OTP 취소·재발송 실패로 이 폼이 다시 마운트될 때, 분석에 사용했던 이름·전화·주소를 초기값으로
  // 복원한다. 초안이 잠긴 채 빈 값이 되어 onProceed("","")로 인증 API를 호출하는 것을 막는다(P0).
  // 신규 입력 단계에서는 모두 빈 문자열/initialAddress이므로 기존 동작과 동일하다.
  const [guestName, setGuestName] = useState(initialName);
  const [guestPhone, setGuestPhone] = useState(initialPhone);
  const [address, setAddress] = useState(draft?.address ?? initialAddress);
  const [file, setFile] = useState<File | null>(null);
  const [agree, setAgree] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = draft?.extractionOk ? draft : null;
  const locked = !!parsed; // 분석 완료 → 입력 잠금(§2)
  const inputsDisabled = busy || locked;

  const handleEdit = () => {
    setAgree(false); // 동의 상태 무효화(§2)
    onEdit();
  };

  return (
    <div className={g.card}>
      <p className={g.cardTitle}>비회원 등기감시 신청</p>
      <p className={g.cardSub}>
        이름·전화번호·주소를 입력하고 등기부등본 PDF를 올리면, 결제 전에 휴대폰 본인인증을 거쳐
        신청자 본인임을 확인합니다.
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
          onChange={(e) => setGuestPhone(e.target.value)}
          placeholder="예: 010-1234-5678"
          disabled={inputsDisabled}
          inputMode="tel"
          autoComplete="tel"
        />
      </div>

      <div className={g.field}>
        <label className={s.mLabel} htmlFor="guest-apply-address">주소</label>
        <input
          id="guest-apply-address"
          className={s.mInput}
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="감시할 물건의 주소"
          disabled={inputsDisabled}
        />
      </div>

      <div className={g.field}>
        <div className={s.mLabel} id="guest-apply-pdf-label">등기부등본 PDF</div>
        <button
          type="button"
          className={`${s.mDropZone} ${file ? g.dropState : ""}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={inputsDisabled}
          aria-labelledby="guest-apply-pdf-label"
          aria-describedby="guest-apply-pdf-name"
        >
          <div className={s.mDropIco}>
            <Upload size={26} />
          </div>
          <div className={s.mDropT} id="guest-apply-pdf-name">
            {file ? file.name : "PDF 파일을 선택하세요"}
          </div>
          <div className={s.mDropS}>인터넷등기소(iros.go.kr) 발급 PDF · 최대 10MB</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: "none" }}
            tabIndex={-1}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={inputsDisabled}
          />
        </button>
      </div>

      {parsed && (
        <div className={g.confirmBox}>
          <div className={g.confirmRow}>
            <span className={g.confirmKey}>
              <MapPin size={12} style={{ verticalAlign: "-1px", marginRight: 4 }} />
              확인된 주소
            </span>
            <span className={g.confirmVal}>{parsed.address}</span>
          </div>
          <div className={g.confirmRow}>
            <span className={g.confirmKey}>부동산 고유번호</span>
            <span className={g.confirmVal}>{parsed.commUniqueNoMasked}</span>
          </div>
          <div className={g.confirmRow}>
            <span className={g.confirmKey}>등기부상 소유자</span>
            <span className={g.confirmVal}>{parsed.ownerNameMasked}</span>
          </div>
        </div>
      )}

      {error && (
        <p className={g.errorText} role="alert" aria-live="assertive">
          {error}
        </p>
      )}

      {!parsed ? (
        <button
          className={g.btnPrimary}
          onClick={() => onParse({ guestName, guestPhone, address, file })}
          disabled={busy}
          style={{ marginTop: 8 }}
        >
          {busy ? "등기부 분석 중..." : "등기부 분석하기"}
        </button>
      ) : (
        <>
          <p className={g.cardSub} style={{ margin: "4px 0 0", fontSize: 12.5 }}>
            위 내용으로 신청합니다. 주소·PDF·이름·전화를 바꾸려면 아래 “다시 입력”으로 수정 후
            다시 분석해 주세요.
          </p>
          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              fontSize: 12.5,
              color: "#6e6e73",
              margin: "10px 0 12px",
              lineHeight: 1.6,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              disabled={busy}
              style={{ marginTop: 2 }}
            />
            <span>서비스 이용약관 및 개인정보 처리(본인인증·감시 목적)에 동의합니다. (필수)</span>
          </label>
          <button
            className={g.btnPrimary}
            onClick={() => onProceed(guestName, guestPhone)}
            disabled={busy || !agree}
          >
            {busy ? "진행 중..." : "본인인증 후 결제 (10,000원)"}
          </button>
          <button
            type="button"
            className={g.btnGhost}
            onClick={handleEdit}
            disabled={busy}
            style={{ marginTop: 8 }}
          >
            다시 입력
          </button>
        </>
      )}
    </div>
  );
}
