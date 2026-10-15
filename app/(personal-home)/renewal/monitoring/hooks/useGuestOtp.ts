"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { GuestOtpVerifyResponse } from "@/types/guest-monitoring";
import { verifyOtp as apiVerifyOtp } from "../guest/guestApi";

/**
 * 비회원 등기감시 SMS OTP 대기·검증 공통 훅 (설계 §1.2 F3 / §5.1).
 *
 * 책임: OTP 대기 상태(verificationId·expiresAt) 보관, 인증번호 검증 호출, 요청 세대(generation)
 * 관리. status·apply 두 흐름이 공유하여 중복 로직을 만들지 않는다(설계 §1.2 분리 트리거).
 *
 * 설계 경계: "다음 단계"(status=목록 갱신 / apply=주문 생성)는 흐름별로 다르므로 이 훅에 두지
 * 않는다. `submitOtp`는 성공 시 응답 DTO를, 실패/구형(stale) 응답이면 null을 반환하고, 호출한
 * 흐름 훅이 후속을 결정한다.
 *
 * 저장 정책(§5.3): 코드·대기 상태는 이 훅 메모리로만 관리한다. URL·localStorage·sessionStorage에
 * 남기지 않으며 성공·취소 시 비운다.
 *
 * 경합 방어(§5.3/§5.4): beginOtp·resetOtp·새 submitOtp는 세대 번호를 올려, 이전 검증의 지연
 * 응답이 새 세션의 후속(주문 생성 등)을 트리거하지 못하게 한다.
 */
export type OtpStatus = "idle" | "pending";

export function useGuestOtp() {
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState("");
  // 요청 세대: 대기 전환·초기화·새 검증마다 증가 → 이전 비동기 응답 무효화.
  const genRef = useRef(0);
  // 동기 재진입 잠금: 같은 렌더에서 submitOtp가 연속 호출돼도 검증 요청은 1개만 보낸다(§5.1 중복
  // 제출 차단, §6 1회 소비). busy 기반 버튼 비활성화는 다음 렌더 이후의 UI 입력만 막으므로 훅 자체의
  // 동기 재진입은 이 ref로 막는다.
  const submitLockRef = useRef(false);

  // 언마운트 시 세대를 무효화해, 검증 중 화면을 떠나도 지연 성공 응답이 후속(주문 생성·목록 갱신)을
  // 트리거하지 못하게 한다(§5.3 비동기 세대 관리). in-flight submitOtp는 gen 불일치로 null을 반환한다.
  useEffect(() => {
    return () => {
      // 의도적으로 언마운트 시점의 '최신' 세대를 증가시킨다(스냅샷 복사 아님) → in-flight 응답 무효화.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      genRef.current++;
    };
  }, []);

  /** 발송 성공 응답으로 OTP 대기 진입(이전 in-flight 검증 무효화). */
  const beginOtp = useCallback((vId: string, exp: string) => {
    genRef.current++;
    setStatus("pending");
    setVerificationId(vId);
    setExpiresAt(exp);
    setOtpBusy(false);
    setOtpError("");
  }, []);

  /** 대기 상태·코드 흔적 정리(성공 후·취소·전화변경·리셋 시). */
  const resetOtp = useCallback(() => {
    genRef.current++;
    setStatus("idle");
    setVerificationId(null);
    setExpiresAt(null);
    setOtpBusy(false);
    setOtpError("");
  }, []);

  /**
   * 인증번호 검증. 성공 시 응답 DTO, 실패/구형 응답이면 null(오류는 otpError에 반영).
   * 성공 시 otpBusy를 유지하여(해제하지 않음) 후속(목록 갱신/주문 생성) 동안 폼이 잠긴 채로
   * 전이되게 한다 — 호출 흐름이 완료 후 resetOtp로 정리한다.
   */
  const submitOtp = useCallback(
    async (code: string): Promise<GuestOtpVerifyResponse | null> => {
      if (!verificationId) return null;
      // 클라이언트 형식 가드(최종 판정은 서버): ASCII 숫자 6자리.
      if (!/^[0-9]{6}$/.test(code)) {
        setOtpError("인증번호 6자리를 입력해 주세요.");
        return null;
      }
      // 동기 재진입 차단: 이미 검증 요청이 진행 중이면 두 번째 호출은 아무것도 하지 않는다.
      // (세대 증가·요청 발송을 하지 않아, 먼저 간 요청의 성공 응답이 유실되지 않는다, §5.1/§6)
      if (submitLockRef.current) return null;
      submitLockRef.current = true;
      const gen = ++genRef.current;
      setOtpBusy(true);
      setOtpError("");
      try {
        const res = await apiVerifyOtp({ verificationId, code });
        // 검증 중 재요청·취소·초기화·언마운트가 일어났으면 이 응답은 버린다(후속 트리거 금지).
        if (gen !== genRef.current) return null;
        if (!res.ok) {
          setOtpBusy(false);
          setOtpError(res.error);
          return null;
        }
        return res.data; // otpBusy 유지 — 호출부가 후속 후 resetOtp
      } finally {
        submitLockRef.current = false;
      }
    },
    [verificationId]
  );

  return {
    otpStatus: status,
    verificationId,
    expiresAt,
    otpBusy,
    otpError,
    beginOtp,
    submitOtp,
    resetOtp,
  };
}
