"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GuestDraftResponse, GuestOrderStateResponse } from "@/types/guest-monitoring";
import {
  parsePdf,
  identityStart,
  createOrder,
  getOrderState,
} from "../guest/guestApi";
import { launchProvider, applyResume, classifyOrderState, orderTarget } from "../guest/guestProvider";
import { useGuestOtp } from "./useGuestOtp";

/**
 * 비회원 신청 흐름 상태머신 (설계 §4.1 / 구현순서 step 4).
 *
 *   input → (parse-pdf) → ready → (identity/start → 리다이렉트) → [프로바이더]
 *     → 복귀 → ordering → (orders → 리다이렉트) → [결제] → 복귀 → recovering → done
 *
 * 본인인증·결제는 전체 페이지 리다이렉트이므로, 복귀 시 window.location + sessionStorage로
 * 흐름을 재개한다. draftId/orderId/멱등키만 보관하고 이름·전화·토큰은 저장하지 않는다.
 *
 * 인증 완료 신호는 (a)서버가 복귀 URL에 심은 verified/ok/orderId 쿼리, 또는 (b)인증창으로
 * 떠나기 직전 심어둔 pendingIdentity 마커로만 판단한다. 실행 URL 부재(목)를 인증 완료로
 * 취급하지 않는다(교차검수 §1). 미인증 주문은 서버가 거부한다.
 */
export type ApplyPhase =
  | "input" // 폼 입력/파싱 전
  | "ready" // 파싱 완료(결제 진입 가능)
  | "verifying" // 본인인증 시작(리다이렉트/OTP 발송 직전)
  | "otp" // SMS OTP 대기(코드 입력) — "인증·결제" 단계에 속함(§5.2)
  | "ordering" // 주문 생성 중
  | "paying" // 결제창 진입(리다이렉트 직전)
  | "recovering" // 복귀 후 주문 상태 확인 중
  | "done" // 활성화 완료
  | "failed"; // 실패/취소(재시도 안내)

export interface ApplyInput {
  guestName: string;
  guestPhone: string;
  address: string;
  file: File | null;
}

export function useGuestApply() {
  const [phase, setPhase] = useState<ApplyPhase>("input");
  const [draft, setDraft] = useState<GuestDraftResponse | null>(null);
  const [orderState, setOrderState] = useState<GuestOrderStateResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // 확정 실패(failed/canceled/refunded) 주문이라 "다시 시도" 시 새 결제(새 멱등키)가 필요한지
  const [needsFreshPayment, setNeedsFreshPayment] = useState(false);
  const resumedRef = useRef(false);
  // SMS OTP 대기·검증 공통 훅(§5.2). 다날 모드에서는 쓰이지 않는다.
  const otp = useGuestOtp();
  // 재요청(§5.4)용 입력과 "현재 인증에 결합된 초안"(§5.2). 훅 메모리로만 보관, 정리 시 비운다.
  const otpNameRef = useRef("");
  const otpPhoneRef = useRef("");
  const otpDraftIdRef = useRef("");

  /** 1단계: PDF 파싱 + 초안 생성 */
  const submitParse = useCallback(async (input: ApplyInput) => {
    setError("");
    if (!input.file) {
      setError("등기부등본 PDF를 업로드해 주세요.");
      return;
    }
    if (!input.guestName.trim() || !input.guestPhone.trim() || !input.address.trim()) {
      setError("이름·전화번호·주소를 모두 입력해 주세요.");
      return;
    }
    // 새 초안을 만들기 전에 이전 흐름 참조를 비운다(입력 변경 → 이전 draft/주문으로 결제 방지, §2).
    applyResume.clear();
    // 이전 OTP 대기·결합 초안도 폐기(초안 변경 시 이전 인증으로 주문 금지, §5.2/§5.3).
    otp.resetOtp();
    otpNameRef.current = "";
    otpPhoneRef.current = "";
    otpDraftIdRef.current = "";
    setOrderState(null);
    setNeedsFreshPayment(false);
    setBusy(true);
    const res = await parsePdf({
      file: input.file,
      guestName: input.guestName.trim(),
      guestPhone: input.guestPhone.trim(),
      address: input.address.trim(),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDraft(res.data);
    applyResume.setDraftId(res.data.draftId);
    if (!res.data.extractionOk) {
      setError(
        "등기부에서 고유번호 또는 소유자 정보를 확인하지 못했습니다. 인터넷등기소에서 발급한 PDF인지 확인 후 다시 업로드해 주세요."
      );
      setPhase("input");
      return;
    }
    setPhase("ready");
  }, [otp]);

  /** 복귀/복구: 주문 상태 조회 → 분류에 따라 done / 재조회 대기 / 실패 */
  const recoverOrder = useCallback(
    async (orderId: string) => {
      setPhase("recovering");
      setBusy(true);
      const res = await getOrderState(orderId);
      setBusy(false);
      if (!res.ok) {
        // 401: 세션 만료 → 재인증 필요. 확정 실패와 구분해 안내.
        if (res.status === 401) {
          setError("인증이 만료되었습니다. 처음부터 다시 신청해 주세요.");
        } else {
          setError(res.error);
        }
        setPhase("failed");
        setNeedsFreshPayment(res.status === 401);
        return;
      }
      setOrderState(res.data);
      const kind = classifyOrderState(res.data);
      if (kind === "applied") {
        setError("");
        setNeedsFreshPayment(false);
        setPhase("done");
        applyResume.clear();
      } else if (kind === "settling") {
        // 승인/적용 대기 — 즉시 재결제 유도하지 않고 재조회를 안내(설계 §3.3·§4.1).
        setNeedsFreshPayment(false);
        setError(
          res.data.status === "pending"
            ? "결제 승인을 확인하고 있습니다. 잠시 후 다시 확인해 주세요."
            : "결제가 확인되어 감시를 적용하고 있습니다. 잠시 후 다시 확인해 주세요."
        );
        setPhase("recovering");
      } else {
        // 확정 실패/취소/환불 — 같은 주문 재조회로는 복구 불가. 새 결제(새 멱등키)로 유도.
        setNeedsFreshPayment(true);
        setError("결제가 완료되지 않았습니다. 다시 결제를 진행해 주세요.");
        setPhase("failed");
      }
    },
    []
  );

  /** 3단계: 주문 생성(initial) → 결제창 리다이렉트 */
  const startOrder = useCallback(
    async (draftId: string) => {
      setError("");
      setBusy(true);
      setPhase("ordering");
      const target = orderTarget("initial", draftId);
      const idempotencyKey = applyResume.ensureIdempotencyKey(target);
      const res = await createOrder({ purpose: "initial", draftId, idempotencyKey });
      if (!res.ok) {
        setBusy(false);
        setError(res.error);
        setPhase("failed");
        // 세션/권한 실패는 재인증 필요, 그 외는 같은 주문 재시도 가능.
        setNeedsFreshPayment(res.status === 401 || res.status === 404);
        return;
      }
      applyResume.setOrderId(target, res.data.orderId);
      setPhase("paying");
      const launched = launchProvider(res.data.payment);
      if (!launched) {
        // 결제 실행 정보가 없으면(목) 주문 상태 조회로 복구(주문은 실제 생성됨).
        void recoverOrder(res.data.orderId);
      }
    },
    [recoverOrder]
  );

  /**
   * 2단계: 본인인증 시작(결제 전).
   * - 다날 모드: launch에 url/action → 리다이렉트, 복귀 마커로 주문 재개(기존 동작).
   * - OTP 모드: launch.mode==="sms_otp" → OTP 대기(phase="otp"). 리다이렉트 복귀 마커를
   *   남기지 않는다(인증 전 새로고침을 주문 재개로 오인 금지, §5.2). 성공(verifyApplyOtp)
   *   이후에만 startOrder한다.
   */
  const startIdentity = useCallback(
    async (guestName: string, guestPhone: string) => {
      if (!draft) return;
      setError("");
      const name = guestName.trim();
      const phone = guestPhone.trim();
      // 빈 이름·전화로 인증 API를 호출하지 않는다(취소·재발송 복귀 시 입력 소실 방어, §5.3 P0).
      if (!name || !phone) {
        setError("이름과 전화번호를 입력해 주세요.");
        setPhase("ready");
        return;
      }
      setBusy(true);
      setPhase("verifying");
      const res = await identityStart({
        purpose: "apply",
        guestName: name,
        guestPhone: phone,
        draftId: draft.draftId,
      });
      if (!res.ok) {
        setBusy(false);
        setError(res.error);
        setPhase("ready");
        return;
      }
      if (res.data.launch.mode === "sms_otp") {
        // OTP 대기. 복귀 마커는 남기지 않고, 혹시 남아있다면 즉시 정리(§5.2).
        applyResume.clearPendingIdentity();
        otpNameRef.current = name;
        otpPhoneRef.current = phone;
        otpDraftIdRef.current = draft.draftId; // 현재 인증에 결합된 초안
        setBusy(false);
        otp.beginOtp(res.data.verificationId, res.data.expiresAt);
        setPhase("otp");
        return;
      }
      // 다날: 인증창으로 떠나기 직전 복귀 식별 마커를 심는다(복귀 시 주문 재개 트리거, §1).
      applyResume.setPendingIdentity(orderTarget("initial", draft.draftId));
      const launched = launchProvider(res.data.launch as Record<string, string>);
      if (!launched) {
        // 실행 URL이 없으면 인증이 완료된 것이 아니다 — 주문을 생성하지 않는다(§1).
        applyResume.clearPendingIdentity();
        setBusy(false);
        setError("본인인증 창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.");
        setPhase("ready");
      }
      // launched=true 이면 페이지를 떠남(복귀 시 useEffect가 재개).
    },
    [draft, otp]
  );

  /**
   * OTP 코드 확인 → 성공 시 "현재 인증에 결합된 초안"으로만 startOrder(§5.2).
   * 단순 launch 부재나 클라이언트 상태만으로 주문하지 않는다.
   */
  const verifyApplyOtp = useCallback(
    async (code: string) => {
      const result = await otp.submitOtp(code);
      if (!result) return; // 실패(otpError 반영) 또는 구형 응답 — 미인증 유지
      const draftId = otpDraftIdRef.current;
      otp.resetOtp();
      otpNameRef.current = "";
      otpPhoneRef.current = "";
      otpDraftIdRef.current = "";
      if (!draftId) {
        setError("인증 정보가 만료되었습니다. 다시 시도해 주세요.");
        setPhase("ready");
        return;
      }
      void startOrder(draftId);
    },
    [otp, startOrder]
  );

  /** 재요청(§5.4): 새 세션·코드. 기존 대기 폐기 후 동일 입력으로 재시작. */
  const resendApplyOtp = useCallback(() => {
    otp.resetOtp();
    void startIdentity(otpNameRef.current, otpPhoneRef.current);
  }, [otp, startIdentity]);

  /**
   * 취소: 대기·코드 정리 후 입력(ready) 복귀(§5.3).
   * 이름·전화(otpNameRef/otpPhoneRef)는 비우지 않는다 — 같은 초안으로 돌아온 신청 폼이 잠긴 채
   * 빈 값이 되어 재인증을 막는 HIGH 결함을 방지한다(복귀 시 입력 유지, P0). 초안 결합(otpDraftIdRef)은
   * 다음 startIdentity에서 다시 설정되므로 정리한다.
   */
  const cancelApplyOtp = useCallback(() => {
    otp.resetOtp();
    otpDraftIdRef.current = "";
    setError("");
    setPhase("ready");
  }, [otp]);

  // 복귀(리다이렉트 반환) 처리 — 클라이언트에서만, 1회.
  // 프로바이더가 어느 경로로 되돌아오든(랜딩/전용 라우트) 재개할 수 있도록, 경로가 아니라
  // "복귀 신호"(쿼리 파라미터·저장된 주문·인증 복귀 마커)가 있을 때만 흐름을 이어간다.
  // 신호가 없으면(신규 방문/단순 새로고침) 입력 폼을 그대로 보여준다.
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    if (typeof window === "undefined") return;

    const q = new URLSearchParams(window.location.search);
    const hasError = !!q.get("error");
    const queryOrderId = q.get("orderId");
    const verified = q.get("verified") === "1" || q.get("ok") === "1";
    const draftId = applyResume.getDraftId();
    const target = orderTarget("initial", draftId);
    const storedOrderId = draftId ? applyResume.getOrderId(target) : null;
    const pendingIdentity = applyResume.getPendingIdentity();

    if (hasError) {
      applyResume.clearPendingIdentity();
      setError("본인인증 또는 결제가 완료되지 않았습니다. 다시 시도해 주세요.");
      setNeedsFreshPayment(true);
      setPhase("failed");
      return;
    }
    const orderId = queryOrderId || storedOrderId;
    if (orderId) {
      if (draftId) applyResume.setOrderId(target, orderId);
      applyResume.clearPendingIdentity();
      void recoverOrder(orderId);
      return;
    }
    // 본인인증만 끝나고 주문 전 단계로 돌아온 경우: 명시 신호(verified) 또는 우리가 심은 마커가 있을 때만.
    if (draftId && (verified || pendingIdentity === target)) {
      applyResume.clearPendingIdentity();
      void startOrder(draftId);
    }
    // 그 외: 신호 없음 → 입력 폼 유지(단순 새로고침을 인증 완료로 오인하지 않음).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => {
    setError("");
    const draftId = draft?.draftId ?? applyResume.getDraftId();
    const target = orderTarget("initial", draftId);
    // 확정 실패 주문: 같은 주문 재조회로는 복구 불가 → 키를 비우고 새 결제 시도(§8).
    if (needsFreshPayment) {
      applyResume.clearOrder(target);
      setNeedsFreshPayment(false);
      if (draftId && draft?.extractionOk) {
        void startOrder(draftId);
        return;
      }
      applyResume.clear();
      setDraft(null);
      setOrderState(null);
      setPhase("input");
      return;
    }
    // 미완료(승인/적용 대기) 주문: 같은 주문 상태 재조회.
    const orderId = draftId ? applyResume.getOrderId(target) : null;
    if (orderId) {
      void recoverOrder(orderId);
      return;
    }
    if (draftId && draft?.extractionOk) {
      setPhase("ready");
      return;
    }
    applyResume.clear();
    setDraft(null);
    setOrderState(null);
    setPhase("input");
  }, [draft, needsFreshPayment, recoverOrder, startOrder]);

  const reset = useCallback(() => {
    applyResume.clear();
    otp.resetOtp();
    otpNameRef.current = "";
    otpPhoneRef.current = "";
    otpDraftIdRef.current = "";
    setDraft(null);
    setOrderState(null);
    setNeedsFreshPayment(false);
    setError("");
    setPhase("input");
  }, [otp]);

  return {
    phase,
    draft,
    orderState,
    error,
    busy,
    submitParse,
    startIdentity,
    recoverOrder,
    retry,
    reset,
    // 취소·재발송 실패로 신청 폼이 다시 마운트될 때 복원할 이름·전화(§5.3 P0). OTP 진입 시점에
    // 저장해 둔 값으로, 폼 remount 시 입력 초기값으로 되돌린다. 신규 입력 단계에서는 빈 문자열.
    restoreName: otpNameRef.current,
    restorePhone: otpPhoneRef.current,
    // SMS OTP 대기·검증(§5.2). phase==="otp"일 때 GuestOtpForm을 보인다.
    otpVerificationId: otp.verificationId,
    otpExpiresAt: otp.expiresAt,
    otpBusy: otp.otpBusy,
    otpError: otp.otpError,
    verifyApplyOtp,
    resendApplyOtp,
    cancelApplyOtp,
  };
}
