"use client";

/**
 * 회원 구독 주문·결제 상태머신(설계 §5.2 `useMemberOrderFlow`).
 *
 * 흐름: `createOrder → runPayment → (confirm)paymentCallback(imp_uid) → GET /orders/[id] 재조회`.
 *  - done 판정의 유일 근거는 **서버 주문 상태(`status==="paid" && applied===true`)**다(§3.2). SDK 반환만으로
 *    완료 화면을 띄우지 않는다.
 *  - 승인 불명확(canceled/error/일시 실패)은 **새 결제·콜백 재전송 없이 먼저 재조회**한다(§4.9).
 *  - `unavailable`(SDK 미실행)은 같은 주문·멱등키로 결제창을 다시 연다(retry_payment, 출금 없음).
 *  - 영구 거부(payment_failed 400/403/404)는 재조회로 덮지 않고 안내를 보존한다(blocked).
 *  - 모바일 리다이렉트 복귀는 미신뢰 쿼리(imp_uid/merchant_uid)를 읽고 URL에서 제거한 뒤 본인 주문으로
 *    recover·재검증한다(§4.9).
 *
 * 세대 가드(genRef)로 reset/언마운트 이후 늦은 응답이 상태를 덮어쓰지 못하게 하고, payingRef로 이중 실행을 막는다.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { MemberOrderRequest, MemberOrderStatus, MemberProductView } from "@/types/member-subscription";
import { createOrder, getOrderState, paymentCallback, recoverOrder } from "../member/memberApi";
import {
  forgetCallback,
  forgetPendingOrderId,
  peekV1RedirectReturn,
  readV1RedirectReturn,
  recallCallback,
  recallPendingOrderId,
  rememberCallback,
  rememberPendingOrderId,
  runPayment,
} from "../member/memberPayment";
import { classifyApiFailure, failureMessage, type FailureKind } from "../member/paymentFailure";

/** 확정 종료(취소/실패/환불) 주문의 상태별 안내 — 재시도 불가, 새 구매로만 진행(§4.9). */
function terminalMessage(status: MemberOrderStatus["status"]): string {
  switch (status) {
    case "canceled":
      return "결제가 취소되었습니다. 새로 구매를 진행해 주세요.";
    case "refunded":
      return "환불된 주문입니다. 다시 이용하시려면 새로 구매를 진행해 주세요.";
    case "failed":
    default:
      return "결제가 완료되지 않았습니다. 새로 구매를 진행해 주세요.";
  }
}

/**
 * 멱등키용 UUID v4 생성. 서버 orderSchema가 UUID v4 형식을 strict 검증하므로(§3.1) 폴백도 반드시
 * 유효한 v4여야 한다. secure context가 아니어서 crypto.randomUUID가 없으면 getRandomValues로 직접 생성한다.
 */
function makeUuidV4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(b);
  } else {
    for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  }
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0"));
  return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
}

export type OrderPhase =
  | "idle"
  | "ordering"
  | "paying"
  | "verifying"
  | "checking"
  | "done"
  | "failed";

export interface PurchaseOptions {
  purpose?: "initial" | "renewal";
}

interface ActiveOrder {
  orderId: string;
  idempotencyKey: string;
  request: MemberOrderRequest;
}

export interface UseMemberOrderFlow {
  phase: OrderPhase;
  message: string | null;
  busy: boolean;
  failure: FailureKind | null;
  /** 상품 선택 후 결제 시작 */
  purchase: (product: MemberProductView, options?: PurchaseOptions) => Promise<void>;
  /** 마지막 실패에 맞는 재시도(retry_payment=결제창 재실행 / 그 외=재조회) */
  retry: () => Promise<void>;
  /** 성공/실패 화면 종료 후 초기화 */
  reset: () => void;
}

export interface OrderFlowCallbacks {
  /** 주문이 적용(active/trialing)되어 완료된 직후 — 부모가 현황 재조회에 사용 */
  onApplied?: () => void;
  /** 401(세션 만료) 감지 — 부모가 재로그인 유도 */
  onReauth?: () => void;
}

export function useMemberOrderFlow(callbacks: OrderFlowCallbacks = {}): UseMemberOrderFlow {
  const [phase, setPhase] = useState<OrderPhase>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<FailureKind | null>(null);

  const { status: sessionStatus } = useSession();
  const genRef = useRef(0);
  const payingRef = useRef(false);
  const activeRef = useRef<ActiveOrder | null>(null);
  // 모바일 복귀를 merchant_uid당 1회만 처리(effect 재실행·세션 전이로 중복 recover 방지).
  const mobileHandledRef = useRef<string | null>(null);
  // 세션 스토리지 보존 orderId 복구를 orderId당 1회만 처리(재인증 복귀, 중복 recover 방지).
  const storageHandledRef = useRef<string | null>(null);
  const { onApplied, onReauth } = callbacks;

  const alive = (gen: number) => genRef.current === gen;

  useEffect(() => {
    return () => {
      // 언마운트 시 세대를 올려 진행 중 비동기 응답을 무효화한다.
      genRef.current += 1;
    };
  }, []);

  /** 서버 주문 상태를 재조회해 done/failed/checking을 확정(완료 판정의 유일 근거). */
  const checkOrder = useCallback(
    async (orderId: string, gen: number): Promise<void> => {
      setPhase("checking");
      const res = await getOrderState(orderId);
      if (!alive(gen)) return;
      if (res.ok) {
        const st = res.data.status;
        if (st === "paid" && res.data.applied) {
          forgetCallback(orderId);
          forgetPendingOrderId();
          setFailure(null);
          setMessage(null);
          setPhase("done");
          onApplied?.();
          return;
        }
        // needs_review: 수동 큐 대기 — 콜백·복구 재전송으로 해제되지 않으므로 메모리 정리 후 검토 안내(§4.4).
        if (st === "needs_review") {
          forgetCallback(orderId);
          forgetPendingOrderId();
          setFailure("review");
          setMessage(failureMessage({ kind: "review" }));
          setPhase("failed");
          return;
        }
        // 확정 종료(failed/canceled/refunded): 재시도 대상 아님. 메모리 정리 후 상태별 안내, 재구매는 명시적 새 구매로(§4.9).
        if (st === "failed" || st === "canceled" || st === "refunded") {
          forgetCallback(orderId);
          forgetPendingOrderId();
          setFailure("terminal");
          setMessage(terminalMessage(st));
          setPhase("failed");
          return;
        }
        // pending·paid 미적용 → 승인 대기(복구 가능). 콜백 메모리는 유지(재전송 아닌 recover 대상), 영구 거부로 덮지 않음(§4.9).
        setFailure("recheck");
        setMessage(failureMessage({ kind: "recheck" }));
        setPhase("failed");
        return;
      }
      const action = classifyApiFailure(res.status, res.code);
      if (action.kind === "reauth") onReauth?.();
      setFailure(action.kind);
      setMessage(failureMessage(action, res.error));
      setPhase("failed");
    },
    [onApplied, onReauth]
  );

  /**
   * 승인 불명확 주문의 실제 복구(§3.4·§4.9). 같은 orderId로 POST /recover를 보내 공급자 재검증·적용을
   * 요청한 뒤 GET으로 `paid && applied`를 확인한다. 새 주문·새 결제창을 만들지 않는다.
   */
  const recoverAndCheck = useCallback(
    async (orderId: string, gen: number): Promise<void> => {
      setPhase("checking");
      const rec = await recoverOrder(orderId);
      if (!alive(gen)) return;
      if (rec.ok) {
        await checkOrder(orderId, gen);
        return;
      }
      const action = classifyApiFailure(rec.status, rec.code);
      if (action.kind === "reauth") onReauth?.();
      setFailure(action.kind);
      setMessage(failureMessage(action, rec.error));
      setPhase("failed");
    },
    [checkOrder, onReauth]
  );

  /** confirm 콜백 전송 후 결과에 따라 재조회/안내 분기. */
  const sendCallback = useCallback(
    async (orderId: string, gen: number): Promise<void> => {
      const callback = recallCallback(orderId);
      if (!callback) {
        // 콜백 문맥 유실 → recover로 복구(merchant_uid 후보 탐색·재검증, 새 결제 아님).
        const rec = await recoverOrder(orderId);
        if (!alive(gen)) return;
        if (rec.ok) {
          await checkOrder(orderId, gen);
          return;
        }
        const action = classifyApiFailure(rec.status, rec.code);
        if (action.kind === "reauth") onReauth?.();
        setFailure(action.kind);
        setMessage(failureMessage(action, rec.error));
        setPhase("failed");
        return;
      }
      setPhase("verifying");
      const res = await paymentCallback(callback);
      if (!alive(gen)) return;
      if (res.ok) {
        await checkOrder(orderId, gen);
        return;
      }
      const action = classifyApiFailure(res.status, res.code);
      if (action.kind === "reauth") {
        onReauth?.();
        setFailure("reauth");
        setMessage(failureMessage(action, res.error));
        setPhase("failed");
        return;
      }
      // 일시 실패(recheck/retry_same)는 주문 재조회로 수렴. 영구 거부(blocked/conflict)는 안내 보존.
      if (action.kind === "recheck" || action.kind === "retry_same") {
        await checkOrder(orderId, gen);
        return;
      }
      setFailure(action.kind);
      setMessage(failureMessage(action, res.error));
      setPhase("failed");
    },
    [checkOrder, onReauth]
  );

  /** 결제창 실행(또는 재실행) → outcome 분기. order는 이미 생성된 상태. */
  const runAndHandle = useCallback(
    async (gen: number): Promise<void> => {
      const active = activeRef.current;
      if (!active) return;
      setPhase("paying");
      const ordered = await createOrder({ ...active.request }); // 멱등키 동일 → 미완료 pending 재사용
      if (!alive(gen)) return;
      if (!ordered.ok) {
        const action = classifyApiFailure(ordered.status, ordered.code);
        if (action.kind === "reauth") onReauth?.();
        setFailure(action.kind);
        setMessage(failureMessage(action, ordered.error));
        setPhase("failed");
        return;
      }
      activeRef.current = { ...active, orderId: ordered.data.orderId };
      // 401 재인증 등으로 모듈 메모리가 사라져도 복귀 후 서버 멱등 복구를 이어가도록 orderId만 보존(§5.1).
      rememberPendingOrderId(ordered.data.orderId);
      const outcome = await runPayment(ordered.data.payment, () => !alive(gen));
      if (!alive(gen)) return;

      switch (outcome.kind) {
        case "confirm":
          rememberCallback(ordered.data.orderId, outcome.callback);
          await sendCallback(ordered.data.orderId, gen);
          return;
        case "redirected":
          // 모바일 이탈 — 복귀 effect가 재개. 현재 세대 상태는 그대로 둔다.
          return;
        case "canceled":
        case "error":
          // 승인 불명확 → 재조회 먼저(새 결제 금지).
          await checkOrder(ordered.data.orderId, gen);
          return;
        case "unavailable":
          setFailure("retry_payment");
          setMessage(outcome.message);
          setPhase("failed");
          return;
        case "recover":
          await checkOrder(ordered.data.orderId, gen);
          return;
        case "aborted":
        default:
          return;
      }
    },
    [checkOrder, sendCallback, onReauth]
  );

  const purchase = useCallback(
    async (product: MemberProductView, options: PurchaseOptions = {}): Promise<void> => {
      if (payingRef.current) return;
      if (!product.eligibleForCurrentRole) {
        setFailure("blocked");
        setMessage(product.disabledReason || "선택할 수 없는 상품입니다.");
        setPhase("failed");
        return;
      }
      payingRef.current = true;
      const gen = ++genRef.current;
      setFailure(null);
      setMessage(null);
      setPhase("ordering");

      const idempotencyKey = makeUuidV4();
      const request: MemberOrderRequest = {
        purpose: options.purpose ?? "initial",
        plan: product.plan,
        durationMonths: product.durationMonths,
        productKind: product.productKind,
        idempotencyKey,
      };
      activeRef.current = { orderId: "", idempotencyKey, request };
      try {
        await runAndHandle(gen);
      } finally {
        payingRef.current = false;
      }
    },
    [runAndHandle]
  );

  const retry = useCallback(async (): Promise<void> => {
    const active = activeRef.current;
    if (!active || payingRef.current) return;
    // 1) SDK 미실행(retry_payment) 또는 주문 생성 전 일시 실패(retry_same & orderId 미발급)
    //    → 같은 요청·멱등키로 주문 생성부터 재전송하고 결제창을 재실행한다(새 UUID 생성 금지, 출금 없음).
    if (failure === "retry_payment" || (failure === "retry_same" && !active.orderId)) {
      const gen = ++genRef.current;
      setMessage(null);
      payingRef.current = true;
      try {
        await runAndHandle(gen);
      } finally {
        payingRef.current = false;
      }
      return;
    }
    // 2) 승인 불명확(recheck / retry_same & orderId 발급됨) → 같은 주문의 POST /recover로 공급자 재검증·적용을
    //    요청하고 GET으로 완료를 확인한다. GET 단독 반복(조회만)으로 끝내지 않는다(§4.9).
    if (active.orderId && (failure === "recheck" || failure === "retry_same")) {
      const gen = ++genRef.current;
      setMessage(null);
      payingRef.current = true;
      try {
        await recoverAndCheck(active.orderId, gen);
      } finally {
        payingRef.current = false;
      }
      return;
    }
    // 3) reauth/blocked/conflict/review/terminal → 자동 복구 대상 아님(무동작). 안내·초기화는 호출부가 처리.
  }, [failure, runAndHandle, recoverAndCheck]);

  const reset = useCallback(() => {
    genRef.current += 1;
    payingRef.current = false;
    if (activeRef.current?.orderId) forgetCallback(activeRef.current.orderId);
    forgetPendingOrderId();
    activeRef.current = null;
    setFailure(null);
    setMessage(null);
    setPhase("idle");
  }, []);

  // 모바일 리다이렉트 복귀(§4.9): 세션 복구가 끝난 뒤에만 본인 주문을 recover·재검증한다.
  //  - 세션 로딩 중: 아무것도 하지 않는다(식별자 보존).
  //  - 미인증(세션 만료/미복구): 식별자 쿼리를 **지우지 않고** 재로그인을 유도한다. 재로그인 후 같은 URL로
  //    돌아오면 authenticated 전이로 이 effect가 다시 실행돼 복구를 수행한다(401로 단서 유실 방지).
  //  - 인증 완료: 이제 쿼리를 읽어 URL에서 제거하고 merchant_uid당 1회 recover·재검증한다.
  useEffect(() => {
    if (sessionStatus === "loading") return;
    const peeked = peekV1RedirectReturn();
    if (!peeked.merchantUid && !peeked.impUid) return;

    if (sessionStatus === "unauthenticated") {
      onReauth?.();
      return;
    }
    // authenticated
    if (!peeked.merchantUid) return;
    if (mobileHandledRef.current === peeked.merchantUid) return;
    mobileHandledRef.current = peeked.merchantUid;

    const { impUid, merchantUid } = readV1RedirectReturn();
    if (!merchantUid) return;
    const gen = ++genRef.current;
    const orderId = merchantUid;
    activeRef.current = activeRef.current ?? {
      orderId,
      idempotencyKey: "",
      request: {} as MemberOrderRequest,
    };
    activeRef.current.orderId = orderId;
    setPhase("checking");
    void (async () => {
      const rec = await recoverOrder(orderId, impUid);
      if (!alive(gen)) return;
      if (rec.ok) {
        await checkOrder(orderId, gen);
        return;
      }
      const action = classifyApiFailure(rec.status, rec.code);
      if (action.kind === "reauth") onReauth?.();
      setFailure(action.kind);
      setMessage(failureMessage(action, rec.error));
      setPhase("failed");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  // 비-모바일 재인증 복귀(§4.9): 401로 화면을 떠났다 돌아오면 모듈 메모리는 사라지지만, 보존된
  // orderId(§5.1 비민감)로 서버 멱등 복구를 1회 이어간다. 모바일 복귀(URL 쿼리)는 위 effect가 처리하므로
  // 쿼리가 없을 때만 동작해 중복을 피한다. recoverOrder는 서버가 merchant_uid로 imp_uid를 재조회·재검증하며
  // settle은 멱등이라 이중 적용/이중 과금이 없다. 완료·종료 판정 시 orderId 보존은 checkOrder가 정리한다.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    const peeked = peekV1RedirectReturn();
    if (peeked.merchantUid || peeked.impUid) return; // 모바일 복귀는 위 effect 담당
    const orderId = recallPendingOrderId();
    if (!orderId || storageHandledRef.current === orderId) return;
    storageHandledRef.current = orderId;
    const gen = ++genRef.current;
    activeRef.current = activeRef.current ?? { orderId, idempotencyKey: "", request: {} as MemberOrderRequest };
    activeRef.current.orderId = orderId;
    setPhase("checking");
    void (async () => {
      const rec = await recoverOrder(orderId);
      if (!alive(gen)) return;
      if (rec.ok) { await checkOrder(orderId, gen); return; }
      const action = classifyApiFailure(rec.status, rec.code);
      if (action.kind === "reauth") { onReauth?.(); return; } // 세션 여전히 무효 → 안내만, orderId 보존
      setFailure(action.kind);
      setMessage(failureMessage(action, rec.error));
      setPhase("failed");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus]);

  return {
    phase,
    message,
    busy: phase === "ordering" || phase === "paying" || phase === "verifying" || phase === "checking",
    failure,
    purchase,
    retry,
    reset,
  };
}
