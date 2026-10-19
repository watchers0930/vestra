"use client";

import { useCallback, type Dispatch, type SetStateAction, type MutableRefObject } from "react";
import type { GuestOrderStateResponse } from "@/types/guest-monitoring";
import type { GuestDraft } from "../guest/guestTypes";
import { createOrder, getOrderState, paymentCallback } from "../guest/guestApi";
import { applyResume, classifyOrderState, orderTarget, GUEST_APPLY_PATH } from "../guest/guestProvider";
import {
  runPayment,
  resendOrderCallback,
  rememberCallback,
  recallCallback,
  forgetCallback,
  type ResumeResult,
} from "../guest/guestPayment";
import { classifyApiFailure, failureMessage, type FailureAction } from "../guest/applyFailure";
import type { useGuestOtp } from "./useGuestOtp";

/**
 * 비회원 신청의 주문 생성·결제 실행·복구 상태머신(설계 §5.2/§6). `useGuestApply`에서 분리해 파일을
 * 500줄 이하로 유지한다(절대규칙 §1, 설계 §1.2 분리 트리거). 입력 단계·OTP·복귀 effect는 부모 훅이,
 * "주문 생성→결제→콜백→상태 확정"과 실패 분기는 이 훅이 담당한다(단일 책임).
 *
 * 핵심 불변식:
 *  - done 판정은 서버 주문 상태(paid && applied)가 유일 근거(SDK 반환만으로 전환 금지).
 *  - 결제창(SDK)은 명시 실행에서만 띄운다. 복구(재조회·콜백 재전송)는 SDK를 다시 띄우지 않는다.
 *  - 요청 세대(genRef)로 reset·초안 교체·재인증·언마운트 이후 지연 응답을 무효화한다.
 */
export type ApplyPhase =
  | "input"
  | "ready"
  | "verifying"
  | "otp"
  | "ordering"
  | "paying"
  | "recovering"
  | "done"
  | "failed";

interface OrderFlowParams {
  genRef: MutableRefObject<number>;
  payingRef: MutableRefObject<boolean>;
  draft: GuestDraft | null;
  otp: ReturnType<typeof useGuestOtp>;
  otpNameRef: MutableRefObject<string>;
  otpPhoneRef: MutableRefObject<string>;
  otpDraftIdRef: MutableRefObject<string>;
  /** 초안 폐기(만료·재파싱·입력 복귀) 시 역할 선택·잠금 초기화(리뷰 지적 2). 부모 훅이 주입. */
  resetRole: () => void;
  setPhase: Dispatch<SetStateAction<ApplyPhase>>;
  setError: Dispatch<SetStateAction<string>>;
  setRecovery: Dispatch<SetStateAction<FailureAction | null>>;
  setOrderState: Dispatch<SetStateAction<GuestOrderStateResponse | null>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  setDraft: Dispatch<SetStateAction<GuestDraft | null>>;
}

export function useGuestOrderFlow(p: OrderFlowParams) {
  const {
    genRef,
    payingRef,
    draft,
    otp,
    otpNameRef,
    otpPhoneRef,
    otpDraftIdRef,
    resetRole,
    setPhase,
    setError,
    setRecovery,
    setOrderState,
    setBusy,
    setDraft,
  } = p;

  // 401 재인증(§6.1): 결제 실패가 아님(새 결제·startOrder 금지, 주문·키 유지). 유효 초안 + 메모리의
  // 이름·전화가 있을 때만 ready(잠긴 빈 폼 방지), 없으면 input으로 안내.
  const handleReauth = useCallback(() => {
    genRef.current += 1; // 이 401을 유발한 요청 외 다른 in-flight 응답도 무효화
    setBusy(false);
    otp.resetOtp();
    otpDraftIdRef.current = ""; // 다음 startIdentity에서 재설정
    applyResume.clearPendingIdentity();
    setRecovery({ kind: "reauth" });
    setError(failureMessage({ kind: "reauth" }));
    if (draft?.extractionOk && otpNameRef.current && otpPhoneRef.current) {
      // 같은 초안으로 재인증 — 역할 잠금 유지(서버에 이미 확정된 역할).
      setPhase("ready");
    } else {
      // 초안 참조를 버리고 입력부터 → 역할도 초기화(리뷰 지적 2).
      resetRole();
      setDraft(null);
      setPhase("input");
    }
  }, [genRef, draft, otp, otpNameRef, otpPhoneRef, otpDraftIdRef, resetRole, setBusy, setRecovery, setError, setPhase, setDraft]);

  /** API 실패 → 분류(§6.3)에 따라 phase/error/recovery 설정. 401은 handleReauth로 위임. */
  const applyFailureOutcome = useCallback(
    (status: number, code: string) => {
      const action = classifyApiFailure(status, code);
      if (action.kind === "reauth") {
        handleReauth();
        return;
      }
      setBusy(false);
      setRecovery(action);
      setError(failureMessage(action));
      if (action.kind === "reparse") {
        // 404·draft_expired(§6.3·버그⑦): 만료된 초안과 "그 대상"의 주문·멱등키 재개 참조를 즉시 폐기한다.
        // 새로고침해도 effect가 폐기된 주문을 다시 GET·404로 조회하지 않도록, 그리고 다른 진행 중 응답을
        // 무효화하도록 세대를 올린다. 다른 대상(연장 등)의 주문 참조는 대상 단위로 보존(전체 clear 금지).
        genRef.current += 1;
        const expiredDraftId = draft?.draftId ?? applyResume.getDraftId();
        if (expiredDraftId) applyResume.clearOrder(orderTarget("initial", expiredDraftId));
        applyResume.clearDraftId();
        applyResume.clearPendingIdentity();
        otp.resetOtp();
        otpDraftIdRef.current = "";
        resetRole(); // 만료 초안 폐기 → 이전 역할이 새 초안의 기본 선택으로 남지 않게(리뷰 지적 2)
        setDraft(null);
        setOrderState(null);
        setPhase("input");
      } else if (action.kind === "recheck") {
        setPhase("recovering");
      } else {
        setPhase("failed");
      }
    },
    [handleReauth, genRef, draft, otp, otpDraftIdRef, resetRole, setBusy, setRecovery, setError, setDraft, setOrderState, setPhase]
  );

  /**
   * 서버 주문 상태 → UI 전이(§4.1/§6.3). 완료(done)의 유일 근거는 서버 상태(paid && applied).
   *  - applied            → done
   *  - pending            → resend_callback(콜백 유실 가능 → 재시도에서 동일 문맥 콜백 재전송, 버그②③)
   *  - paid미적용/needs_review → recheck(재조회만, 콜백 재전송·새 결제 금지)
   *  - failed/canceled/refunded → fresh_payment(clearOrder 후 새 멱등키)
   */
  const applyFinalState = useCallback(
    (data: GuestOrderStateResponse) => {
      setOrderState(data);
      const kind = classifyOrderState(data);
      if (kind === "applied") {
        setRecovery(null);
        setError("");
        setPhase("done");
        applyResume.clear();
        return;
      }
      if (kind === "settling") {
        if (data.status === "pending") {
          setRecovery({ kind: "resend_callback" });
          setError("결제 승인을 확인하고 있습니다. 잠시 후 다시 확인해 주세요.");
        } else {
          setRecovery({ kind: "recheck" });
          setError("결제가 확인되어 감시를 적용하고 있습니다. 잠시 후 다시 확인해 주세요.");
        }
        setPhase("recovering");
        return;
      }
      const action: FailureAction = { kind: "fresh_payment" }; // 확정 실패/취소/환불
      setRecovery(action);
      setError(failureMessage(action));
      setPhase("failed");
    },
    [setOrderState, setRecovery, setError, setPhase]
  );

  /**
   * 복귀/복구 공통 진입점. `draftId`가 주어지면 "승인됐으나 콜백 유실로 pending" 주문을 SDK 재실행
   * 없이 동일 문맥 콜백 재전송으로 전진시킨다(모바일 복귀·콜백 일시 실패, 버그②③). 없으면 상태 조회만
   * 한다. 어느 쪽도 새 주문을 만들지 않고 결제창을 다시 띄우지 않는다(멱등키 유지).
   */
  const advanceOrder = useCallback(
    async (orderId: string, draftId?: string, impUid?: string) => {
      const gen = genRef.current;
      setPhase("recovering");
      setBusy(true);
      setError("");
      let result: ResumeResult;
      if (draftId) {
        const target = orderTarget("initial", draftId);
        const idempotencyKey = applyResume.ensureIdempotencyKey(target);
        // 승인 후 콜백 유실 복구(버그①/§4.6): 메모리에 보존된 콜백 문맥(imp_uid + 서명)이 있으면 그대로
        // 재전송한다. 없을 때만 동일 멱등키로 문맥을 재발급하며, impUid(모바일 복귀 쿼리의 미신뢰 거래 ID)가
        // 있으면 재발급 문맥과 결합한다. 어느 쪽도 SDK를 다시 실행하거나 새 주문을 만들지 않는다.
        const callback = recallCallback(orderId);
        result = await resendOrderCallback({ purpose: "initial", draftId, idempotencyKey, orderId, callback, impUid });
      } else {
        const res = await getOrderState(orderId);
        result = res.ok
          ? ({ kind: "state", data: res.data } as const)
          : res.status === 401
            ? ({ kind: "reauth" } as const)
            : ({ kind: "api_error", status: res.status, code: res.code } as const);
      }
      if (gen !== genRef.current) return;
      setBusy(false);
      if (result.kind === "reauth") {
        handleReauth();
        return;
      }
      if (result.kind === "api_error") {
        applyFailureOutcome(result.status, result.code);
        return;
      }
      applyFinalState(result.data);
      // 메모리 콜백 수명주기(§4.6): pending을 벗어나면(승인확정/완료/실패) 재전송이 불필요하므로 제거한다.
      if (result.data.status !== "pending") forgetCallback(orderId);
    },
    [genRef, setPhase, setBusy, setError, handleReauth, applyFailureOutcome, applyFinalState]
  );

  /** 3단계: 주문 생성(initial) → 결제 실행 → (성공 시)콜백 → 주문 상태 재조회로 확정. */
  const startOrder = useCallback(
    async (draftId: string) => {
      // 이중 클릭 등으로 결제창(SDK)이 두 번 실행되지 않도록 동기 재진입을 막는다(중복 청구 방지).
      if (payingRef.current) return;
      payingRef.current = true;
      const gen = genRef.current;
      try {
        setError("");
        setRecovery(null);
        setBusy(true);
        setPhase("ordering");
        const target = orderTarget("initial", draftId);
        const idempotencyKey = applyResume.ensureIdempotencyKey(target);
        // 동일 멱등키 → 기존 pending 주문 재사용 시 새 문맥만 재발급(중복 주문 생성 없음, §3.2).
        const res = await createOrder({ purpose: "initial", draftId, idempotencyKey });
        if (gen !== genRef.current) return;
        if (!res.ok) {
          applyFailureOutcome(res.status, res.code);
          return;
        }
        applyResume.setOrderId(target, res.data.orderId);
        const orderId = res.data.orderId;
        setPhase("paying");
        // buyer_tel 폴백으로 OTP 흐름의 메모리 전화를 전달(저장소·URL 저장 금지, §5.1).
        // shouldCancel: 로더 await 중 reset·초안 교체·재인증·언마운트로 세대가 바뀌면 결제창을 열지 않는다(§4.7).
        const outcome = await runPayment(
          res.data.payment,
          GUEST_APPLY_PATH,
          otpPhoneRef.current || undefined,
          () => gen !== genRef.current
        );
        if (gen !== genRef.current) return;
        switch (outcome.kind) {
          case "redirected":
            return; // 페이지 이탈 → 복귀 시 useEffect가 재개
          case "aborted":
            return; // 로더 대기 중 이탈/reset — 결제창 미실행, 상태 전이 없음(§4.7)
          case "confirm": {
            // 콜백 유실 복구용으로 imp_uid 포함 문맥을 메모리에 보존한다(저장소 금지, §4.6). 최초 POST가 일시
            // 실패해도 재시도에서 동일 문맥을 다시 보낼 수 있다(버그①/③). 완료·실패 확정 시 advanceOrder가 제거.
            rememberCallback(orderId, outcome.callback);
            const cb = await paymentCallback(outcome.callback);
            if (gen !== genRef.current) return;
            if (cb.ok) {
              void advanceOrder(orderId); // 서버 상태로 done 판정(여전히 pending이면 메모리 문맥 보존)
              return;
            }
            if (cb.status === 401) {
              handleReauth();
              return;
            }
            // 콜백 일시 실패(payment_pending/503/429/네트워크) → 보존된 문맥으로 재전송 후 상태 확정(버그①/③).
            // draftId를 넘겨 resend 경로(동일 문맥 콜백 재전송)를 타게 한다 — 단순 재조회는 pending에서 못 벗어난다.
            if (cb.code === "payment_pending" || cb.status === 0 || cb.status === 429 || cb.status === 503) {
              void advanceOrder(orderId, draftId);
              return;
            }
            // 영구 거부(payment_failed 400 / 403 / 404) → 분류 차단. 재조회로 "승인 대기"처럼 숨기지 않는다(버그③).
            forgetCallback(orderId);
            applyFailureOutcome(cb.status, cb.code);
            return;
          }
          case "unavailable":
            // 결제창 미실행(모듈/실행정보/금액). 출금 전이므로 같은 주문에 재실행 가능(버그①).
            // 승인 대기로 덮지 않고 오류를 유지한다.
            setBusy(false);
            setError(outcome.message);
            setRecovery({ kind: "retry_payment" });
            setPhase("failed");
            return;
          case "error":
            setError(outcome.message);
            void advanceOrder(orderId); // 승인 불명확 → 서버 상태가 판정
            return;
          case "recover":
          case "canceled":
          default:
            void advanceOrder(orderId);
            return;
        }
      } finally {
        payingRef.current = false;
      }
    },
    [payingRef, genRef, otpPhoneRef, setError, setRecovery, setBusy, setPhase, applyFailureOutcome, handleReauth, advanceOrder]
  );

  return { handleReauth, advanceOrder, startOrder };
}
