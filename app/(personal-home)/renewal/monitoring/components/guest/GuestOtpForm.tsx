"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import s from "../../monitoring-renewal.module.css";
import g from "../../guest/guest.module.css";

/**
 * 비회원 등기감시 SMS OTP 코드 입력 폼 (설계 §5.1 props 계약).
 * status·apply 공용. 표시·입력만 담당하고 검증·세션 소비는 서버가 한다.
 *
 * 저장 정책(§5.3): 코드는 컴포넌트 메모리로만 관리하며 URL·localStorage·sessionStorage에
 * 저장하지 않는다. verificationId가 바뀌면(재요청) 입력을 비운다.
 * 카운트다운·버튼 비활성화는 안내용이며, 만료·시도횟수·권한의 최종 판정은 서버가 담당한다.
 */
interface GuestOtpFormProps {
  verificationId: string;
  expiresAt: string; // 카운트다운 표시용(최종 판정은 서버)
  busy: boolean; // 제출 중 중복 클릭 차단
  error: string; // verification_failed/rate_limited 사용자 메시지
  onSubmit: (code: string) => void; // 6자리 코드 문자열
  onResend: () => void; // 재요청(새 세션·코드)
  onCancel: () => void; // 입력 단계 복귀·상태 정리
}

/** 남은 초. 만료/미래 아님이면 0. 서버 시각이 최종이므로 표시 보조용으로만 쓴다. */
function remainingSeconds(expiresAt: string): number {
  const ms = new Date(expiresAt).getTime() - Date.now();
  return ms > 0 ? Math.floor(ms / 1000) : 0;
}

export default function GuestOtpForm({
  verificationId,
  expiresAt,
  busy,
  error,
  onSubmit,
  onResend,
  onCancel,
}: GuestOtpFormProps) {
  const [code, setCode] = useState("");
  // 1초마다 리렌더만 유발하는 틱. 남은 시간은 렌더 시 현재 시각으로 파생한다(effect 내 setState 회피).
  const [, setTick] = useState(0);

  // 새 세션(재요청)으로 verificationId가 바뀌면 이전 코드 입력을 비운다(§5.3).
  // 렌더 중 이전 값 비교 패턴(effect 불필요).
  const [prevVid, setPrevVid] = useState(verificationId);
  if (prevVid !== verificationId) {
    setPrevVid(verificationId);
    setCode("");
  }

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = remainingSeconds(expiresAt); // expiresAt·틱 변화 시 렌더에서 재계산
  const expired = remaining <= 0;
  const canSubmit = code.length === 6 && !busy;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  // 만료 여부와 무관하게 6자리면 제출 허용(최종 판정은 서버, §5.1).
  const submit = () => {
    if (canSubmit) onSubmit(code);
  };

  return (
    <div className={`${g.wrap} ${g.narrow}`}>
      <div className={g.card}>
        <div className={g.resultIcon}>
          <ShieldCheck size={30} />
        </div>
        <p className={g.cardTitle} style={{ textAlign: "center" }}>
          인증번호 입력
        </p>
        <p className={g.cardSub} style={{ textAlign: "center" }}>
          입력하신 전화번호로 받은 6자리 인증번호를 입력해 주세요. 인증번호는 5분간 유효합니다.
        </p>

        <div className={g.field}>
          <label className={s.mLabel} htmlFor="guest-otp-code">
            인증번호 6자리
          </label>
          <input
            id="guest-otp-code"
            className={s.mInput}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="숫자 6자리"
            disabled={busy}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            aria-describedby="guest-otp-timer"
          />
        </div>

        <p
          id="guest-otp-timer"
          className={g.cardSub}
          style={{ textAlign: "center", margin: "2px 0 0" }}
          aria-live="polite"
        >
          {expired
            ? "인증번호가 만료되었습니다. 아래에서 재요청해 주세요."
            : `남은 시간 ${mm}:${String(ss).padStart(2, "0")}`}
        </p>

        {error && (
          <p className={g.errorText} role="alert" aria-live="assertive">
            {error}
          </p>
        )}

        <button className={g.btnPrimary} onClick={submit} disabled={!canSubmit} style={{ marginTop: 12 }}>
          {busy ? "확인 중..." : "인증번호 확인"}
        </button>

        <div className={g.btnRow} style={{ marginTop: 10 }}>
          <button type="button" className={g.btnGhost} onClick={onResend} disabled={busy}>
            인증번호 재요청
          </button>
          <button type="button" className={g.btnGhost} onClick={onCancel} disabled={busy}>
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
