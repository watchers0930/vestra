"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type SetStateAction,
  type MutableRefObject,
} from "react";
import type {
  GuestPropertyDto,
  GuestCalendarResponse,
  GuestOrderStateResponse,
} from "@/types/guest-monitoring";
import { createOrder, getOrderState, paymentCallback } from "../guest/guestApi";
import {
  applyResume,
  classifyOrderState,
  orderTarget,
  GUEST_STATUS_PATH,
} from "../guest/guestProvider";
import {
  runPayment,
  resendOrderCallback,
  rememberCallback,
  recallCallback,
  forgetCallback,
} from "../guest/guestPayment";
import { classifyApiFailure, failureMessage } from "../guest/applyFailure";

/**
 * 비회원 현황 화면의 "연장 결제 상태머신"(설계 §5.2/§4.8). `useGuestStatus`에서 분리해 파일을 500줄
 * 이하로 유지한다(절대규칙 §1, 설계 §1.2·§3 분리 선행). 현황 조회(세션/목록/달력/로그아웃)는 부모 훅이,
 * "연장 주문 생성→결제→콜백→상태 확정"과 모바일 복귀 재조정은 이 훅이 담당한다(단일 책임).
 *
 * 핵심 불변식:
 *  - done 판정은 서버 주문 상태(paid && applied)가 유일 근거(SDK 반환만으로 전환 금지).
 *  - 결제창(SDK)은 명시 연장에서만 띄운다. 복구(재조회·콜백 재전송)는 SDK를 다시 띄우지 않는다.
 *  - 콜백의 영구 거부(payment_failed/403/404/409)는 pending 재조회로 숨기지 않고 보존한다(§4.8).
 */
interface RenewParams {
  selectedId: string | null;
  calendar: GuestCalendarResponse | null;
  month: string;
  /** 이중 클릭 시 결제창 중복 실행 방지(중복 청구). */
  renewingRef: MutableRefObject<boolean>;
  /** buyer_tel 폴백용 메모리 전화(연장은 보통 비어 있어 서버 buyerTel 사용, §5.1). */
  lastPhoneRef: MutableRefObject<string>;
  setError: Dispatch<SetStateAction<string>>;
  setNotice: Dispatch<SetStateAction<string>>;
  setBusy: Dispatch<SetStateAction<boolean>>;
  refreshProperties: () => Promise<GuestPropertyDto[]>;
  loadCalendar: (id: string, m: string) => Promise<void>;
  /** 세션 만료 처리. `preserveOrders`면 미완료 주문·멱등키 참조를 지우지 않고 재인증으로 전환한다(§4.8). */
  handleSessionExpired: (opts?: { preserveOrders?: boolean }) => void;
}

export function useGuestRenew(p: RenewParams) {
  const {
    selectedId,
    calendar,
    month,
    renewingRef,
    lastPhoneRef,
    setError,
    setNotice,
    setBusy,
    refreshProperties,
    loadCalendar,
    handleSessionExpired,
  } = p;

  // 연장 결제창 실행 취소용 세대. 화면 이탈(언마운트) 시 증가시켜 로더 await 중이던 결제창이 뒤늦게
  // 열리거나(§4.7 실행 취소), 늦게 완료된 응답이 상태를 전이시키지 못하게 한다(§4.6 비동기 세대 관리).
  const renewGenRef = useRef(0);
  useEffect(() => () => {
    renewGenRef.current += 1;
  }, []);

  // 직전 연장 시도가 "출금 없음"(결제창 미실행·사용자 취소·mock)으로 끝난 대상 집합. 이 경우에만 재클릭 시
  // 같은 주문에 SDK 재실행을 허용한다(§4.7). confirm/error(출금 가능) 이후에는 비워, 승인 불명확 주문에서
  // 재클릭이 결제창을 다시 띄우지 못하게 한다(§4.8, 버그②). 새로고침 시 집합이 사라지면 안전측(재조회)으로 수렴.
  const sdkSafeRef = useRef<Set<string>>(new Set());

  /**
   * 연장 주문 상태 확정. `resend`면 SDK 재실행 없이 동일 문맥 콜백을 재전송해 pending을 전진시키고
   * (PortOne V1 인라인/복귀), 아니면 상태 조회만 한다(mock 기존 동작 보존). done 판정은 서버 상태가 유일 근거.
   * 메모리에 보존된 콜백 문맥(imp_uid 포함)이 있으면 우선 재전송한다(버그①/§4.6).
   */
  const finalizeRenew = useCallback(
    async (target: string, orderId: string, id: string, resend: boolean) => {
      let data: GuestOrderStateResponse | null = null;
      if (resend) {
        const idempotencyKey = applyResume.ensureIdempotencyKey(target);
        const callback = recallCallback(orderId); // 승인 후 콜백 유실 복구 — imp_uid 포함 문맥 우선(§4.6)
        const result = await resendOrderCallback({
          purpose: "renewal",
          guestMonitoringId: id,
          idempotencyKey,
          orderId,
          callback,
        });
        if (result.kind === "reauth") {
          // 콜백 중 세션 만료 — 기존 주문·멱등키를 보존해 재인증 후 이어서 복구할 수 있게 한다(§4.8).
          handleSessionExpired({ preserveOrders: true });
          return;
        }
        if (result.kind === "api_error") {
          setBusy(false);
          // 영구 거부(payment_failed/403/404/409)·조회 실패를 분류해 안내(§4.8). 승인 대기로 숨기지 않는다.
          setError(failureMessage(classifyApiFailure(result.status, result.code)));
          return;
        }
        data = result.data;
      } else {
        const st = await getOrderState(orderId);
        if (!st.ok) {
          setBusy(false);
          if (st.status === 401) {
            handleSessionExpired({ preserveOrders: true });
            return;
          }
          setError(st.error || "연장 결제 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
        data = st.data;
      }
      setBusy(false);
      const kind = classifyOrderState(data);
      if (kind === "applied") {
        setNotice("연장 결제가 완료되었습니다.");
        applyResume.clearOrder(target);
        forgetCallback(orderId);
        sdkSafeRef.current.delete(target);
        await refreshProperties();
        void loadCalendar(id, month);
      } else if (kind === "settling") {
        setNotice("결제 승인을 확인하고 있습니다. 잠시 후 새로고침해 주세요.");
      } else {
        // 서버 확정 실패/취소/환불 — 참조·메모리 정리. 다음 클릭에서 새 결제(명시 동작)로 진행된다(§4.8).
        applyResume.clearOrder(target);
        forgetCallback(orderId);
        sdkSafeRef.current.delete(target);
        setError("연장 결제가 완료되지 않았습니다. 다시 시도해 주세요.");
      }
    },
    [refreshProperties, loadCalendar, month, handleSessionExpired, setBusy, setError, setNotice]
  );

  /**
   * 새 연장 주문 생성 → 결제창 실행(공용 runPayment) → 콜백·상태 확정. PortOne V1은 SDK 실행 후 콜백,
   * mock은 상태 조회로 복구한다. 복귀 경로는 현황 화면(GUEST_STATUS_PATH). 결제창을 실제로 띄우는 유일한
   * 경로이며, 호출부가 "출금 가능성이 없는 미확정 주문"에 대해서만 진입시킨다(§4.7/§4.8).
   */
  const runRenewPayment = useCallback(
    async (id: string, target: string) => {
      const idempotencyKey = applyResume.ensureIdempotencyKey(target);
      // 동일 멱등키 → 기존 pending 주문 재사용(중복 주문 생성 없음, §3.2). 미생성 시 같은 키로 재시도 가능.
      const res = await createOrder({ purpose: "renewal", guestMonitoringId: id, idempotencyKey });
      if (!res.ok) {
        setBusy(false);
        if (res.status === 401) {
          // 주문 생성 중 세션 만료 — 기존 주문·멱등키 참조 보존(§4.8).
          handleSessionExpired({ preserveOrders: true });
          return;
        }
        setError(res.error);
        return;
      }
      applyResume.setOrderId(target, res.data.orderId);
      const orderId = res.data.orderId;
      const gen = renewGenRef.current;
      // buyer_tel 폴백으로 메모리 전화 전달(없으면 서버 buyerTel, 저장소·URL 저장 금지 §5.1).
      // shouldCancel: 로더 await 중 화면 이탈이면 결제창을 열지 않는다(§4.7).
      const outcome = await runPayment(
        res.data.payment,
        GUEST_STATUS_PATH,
        lastPhoneRef.current || undefined,
        () => gen !== renewGenRef.current
      );
      if (gen !== renewGenRef.current) return; // 화면 이탈 등 — 상태 전이 차단(§4.6)
      switch (outcome.kind) {
        case "redirected":
          return; // 모바일 이탈 → 복귀 시 마운트 effect가 재개
        case "aborted":
          return; // 로더 대기 중 이탈 — 결제창 미실행, 상태 전이 없음(§4.7)
        case "confirm": {
          // V1 인라인 성공 → 출금 발생 가능. SDK 재실행 금지 집합에서 제거하고, 콜백 유실 복구용 문맥을 메모리에
          // 보존한 뒤 콜백 POST. 영구 거부는 보존, 일시 실패는 재조회·동일 문맥 재전송으로 수렴(§4.8).
          sdkSafeRef.current.delete(target);
          rememberCallback(orderId, outcome.callback);
          const cb = await paymentCallback(outcome.callback);
          if (!cb.ok) {
            if (cb.status === 401) {
              // 승인 후 콜백 중 세션 만료 — 메모리 문맥은 이미 보존됨. 주문·멱등키도 보존해 재인증 후 재전송(§4.8).
              setBusy(false);
              handleSessionExpired({ preserveOrders: true });
              return;
            }
            const action = classifyApiFailure(cb.status, cb.code);
            if (action.kind === "blocked" || action.kind === "reparse" || action.kind === "conflict") {
              // 영구 거부(payment_failed 400 / 403 / 404 / 409) — 승인 대기로 숨기지 않고 오류 보존, 자동 재결제 금지.
              // 주문 참조는 유지 → 재클릭 시 reconcile 경로에서 서버 상태로 판정(SDK 재실행 아님).
              setBusy(false);
              setError(failureMessage(action));
              return;
            }
            // 일시 실패(payment_pending/429/503/network) → 아래 finalizeRenew가 보존 문맥 재전송으로 수렴.
          }
          await finalizeRenew(target, orderId, id, true);
          return;
        }
        case "unavailable":
          // 결제창 미실행(script/실행정보/금액) — 출금 전. 오류 유지 + 같은 주문 SDK 재실행 허용(§4.7).
          sdkSafeRef.current.add(target);
          setBusy(false);
          setError(outcome.message);
          return;
        case "error":
          // request_pay 이후 예외/실패 — 출금 발생 가능 → SDK 재실행 금지. 서버 상태가 판정.
          sdkSafeRef.current.delete(target);
          setError(outcome.message);
          await finalizeRenew(target, orderId, id, true);
          return;
        case "recover":
          // mock: 결제창 없음(출금 없음) → 상태 조회만(기존 동작 보존, 콜백 재전송 없음).
          sdkSafeRef.current.add(target);
          await finalizeRenew(target, orderId, id, false);
          return;
        case "canceled":
        default:
          // 사용자 닫기/취소 — 출금 없음 → 같은 주문 SDK 재실행 허용. 상태는 재조회로 수렴(승인 불명확 아님).
          sdkSafeRef.current.add(target);
          await finalizeRenew(target, orderId, id, true);
          return;
      }
    },
    [lastPhoneRef, finalizeRenew, handleSessionExpired, setError, setBusy]
  );

  /**
   * 연장 진입점(§4.7/§4.8 상태 우선 확인). 결제창을 띄우기 전에 "미확정 주문"을 먼저 본다.
   *  - 미확정 주문이 있고 직전 시도가 "출금 가능"(confirm/error)이었거나 메모리 정보가 없으면(새로고침 등):
   *    SDK를 다시 띄우지 않고 상태 확인·보존 문맥 콜백 재전송만 한다(중복 청구 방지, 버그②). 서버가 확정
   *    실패로 판정하면 참조를 정리해 다음 클릭에서 새 결제를 진행한다.
   *  - 그 외(미확정 주문 없음 / 출금 없이 끝난 재시도): 새 결제창 실행(runRenewPayment).
   */
  const startRenew = useCallback(async () => {
    if (!selectedId) return;
    if (renewingRef.current) return; // 이중 클릭 시 결제창 중복 실행 방지(중복 청구)
    // 표시 대상과 연장 대상이 일치할 때만 연장(§3).
    if (calendar && calendar.property.id !== selectedId) {
      setError("선택한 물건 정보를 다시 불러온 후 연장해 주세요.");
      return;
    }
    renewingRef.current = true;
    const id = selectedId;
    try {
      setError("");
      setBusy(true);
      const target = orderTarget("renewal", id);
      const existingOrderId = applyResume.getOrderId(target);
      if (existingOrderId && !sdkSafeRef.current.has(target)) {
        // 승인 불명확 미확정 주문 — SDK 재실행 없이 상태 확인·콜백 재전송만(§4.8, 버그②).
        await finalizeRenew(target, existingOrderId, id, true);
        return;
      }
      await runRenewPayment(id, target);
    } finally {
      renewingRef.current = false;
    }
  }, [selectedId, calendar, renewingRef, finalizeRenew, runRenewPayment, setError, setBusy]);

  /**
   * 마운트 복귀 재조정(§4.6·§7·§8): 저장된 미완료 주문을 상태 확인 후 정리한다. 연장 주문은 SDK 재실행
   * 없이 동일 멱등키로 문맥을 재발급해 콜백을 재전송하고, 모바일 리다이렉트 복귀면 쿼리 imp_uid를 결합한다.
   * 어느 쪽도 새 주문을 만들거나 결제창을 다시 띄우지 않는다. 반환값은 "적용된 주문이 있었는지"(목록 갱신용).
   */
  const reconcilePendingOrders = useCallback(
    async (redirectImpUid: string | null, redirectMerchantUid: string | null): Promise<boolean> => {
      const pending = applyResume.listPendingOrders();
      let appliedAny = false;
      let settlingSeen = false;
      let errorMsg = ""; // 영구 거부/조회 실패 — 복귀 경로에서도 보존해 안내한다(§4.8).
      let reauthNeeded = false; // 콜백 단계 401 — 참조 보존하며 재인증 전환.
      for (const { target, orderId } of pending) {
        const sep = target.indexOf(":");
        const purpose = sep >= 0 ? target.slice(0, sep) : "";
        const id = sep >= 0 ? target.slice(sep + 1) : "";
        let data: GuestOrderStateResponse | null = null;
        if (purpose === "renewal" && id) {
          const idempotencyKey = applyResume.ensureIdempotencyKey(target);
          // 리다이렉트 복귀 merchant_uid가 이 주문과 일치할 때만 쿼리 imp_uid를 결합. 메모리 콜백 문맥(있으면)을
          // 우선 재전송한다(§4.6). 어느 쪽도 SDK를 다시 띄우거나 새 주문을 만들지 않는다.
          const impUid = redirectMerchantUid === orderId ? redirectImpUid : null;
          const callback = recallCallback(orderId);
          const result = await resendOrderCallback({
            purpose: "renewal",
            guestMonitoringId: id,
            idempotencyKey,
            orderId,
            callback,
            impUid,
          });
          if (result.kind === "reauth") {
            // 세션 만료 — 주문·멱등키 참조를 지우지 않고 재인증으로 전환(§4.8). 복귀 쿼리는 이미 제거됐으므로
            // 사용자가 이유를 알 수 있게 한다. 다른 주문 처리보다 우선해 즉시 중단한다.
            reauthNeeded = true;
            break;
          }
          if (result.kind === "api_error") {
            const action = classifyApiFailure(result.status, result.code);
            if (action.kind === "reauth") {
              reauthNeeded = true;
              break;
            }
            // 영구 거부(payment_failed/403/404/409)는 pending 안내로 덮지 않고 보존한다(§4.8). 주문 참조는
            // 유지해 재클릭 시 서버 상태로 판정. 일시 실패(retry_same/recheck)는 다음 조회·cron이 수렴.
            if (action.kind === "blocked" || action.kind === "reparse" || action.kind === "conflict") {
              errorMsg = failureMessage(action);
            }
            continue;
          }
          data = result.data;
        } else {
          const res = await getOrderState(orderId);
          if (!res.ok) {
            if (res.status === 401) {
              reauthNeeded = true;
              break;
            }
            continue; // 네트워크/일시 오류 등 — 무조건 삭제하지 않고 유지(§7)
          }
          data = res.data;
        }
        const kind = classifyOrderState(data);
        if (kind === "applied") {
          appliedAny = true;
          applyResume.clearOrder(target);
          forgetCallback(orderId);
          sdkSafeRef.current.delete(target);
        } else if (kind === "settling") {
          settlingSeen = true;
        } else {
          applyResume.clearOrder(target); // 확정 실패/취소 — 참조 정리
          forgetCallback(orderId);
          sdkSafeRef.current.delete(target);
        }
      }
      if (reauthNeeded) {
        handleSessionExpired({ preserveOrders: true });
        return false;
      }
      // 복귀 안내는 전부 notice 슬롯에 모은다. 단건 물건 자동 선택(selectProperty)이 error를 지워도 유지되어,
      // 영구 거부 안내가 사라지지 않도록 한다(§4.8). 성공과 거부가 함께면 둘 다 보여 서로 가리지 않는다.
      const messages: string[] = [];
      if (appliedAny) messages.push("연장 결제가 완료되어 감시 기간이 반영되었습니다.");
      if (errorMsg) messages.push(errorMsg);
      if (!messages.length && settlingSeen) {
        messages.push("결제 승인을 확인하고 있습니다. 잠시 후 새로고침해 주세요.");
      }
      if (messages.length) setNotice(messages.join(" "));
      return appliedAny;
    },
    [setNotice, handleSessionExpired]
  );

  return { startRenew, reconcilePendingOrders };
}
