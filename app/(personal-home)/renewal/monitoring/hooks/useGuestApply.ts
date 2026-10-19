"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GuestOrderStateResponse } from "@/types/guest-monitoring";
import type { GuestDraft, GuestMonitoringRole } from "../guest/guestTypes";
import { parsePdf, identityStart, deleteSession } from "../guest/guestApi";
import { launchProvider, applyResume, orderTarget } from "../guest/guestProvider";
import { readV1RedirectReturn } from "../guest/guestPayment";
import type { FailureAction } from "../guest/applyFailure";
import { useGuestOtp } from "./useGuestOtp";
import { useGuestOrderFlow, type ApplyPhase } from "./useGuestOrderFlow";

export type { ApplyPhase };

/**
 * 비회원 신청 흐름 상태머신 (설계 §5.2 / §6).
 *   input → ready → otp → (verify) → ordering → paying → runPayment → (callback) → recovering → done
 *
 * 견고성(§6): 401은 결제 실패가 아니라 재인증(reauth)으로 분리(새 결제·startOrder 금지, 주문/키 유지).
 * OTP 성공 후에도 이름·전화 유지(폼 복원). 실패는 FailureAction으로 분류(applyFailure.ts)해 retry가 해당
 * 동작만 수행. done은 서버 주문 상태(paid && applied)가 유일 근거(SDK 반환만으로 전환 금지). reset·초안
 * 교체·재인증 이후 이전 비동기 응답이 덮어쓰지 못하도록 요청 세대(generation)로 가드한다.
 *
 * 주문 생성·결제 실행·복구 상태머신은 파일 500줄 제한(절대규칙 §1)과 단일 책임을 위해
 * `useGuestOrderFlow`로 분리했다(설계 §1.2). 이 훅은 입력·파싱·OTP·복귀 effect·retry를 담당한다.
 */
export interface ApplyInput {
  guestName: string;
  guestPhone: string;
  file: File | null;
}

export function useGuestApply() {
  const [phase, setPhase] = useState<ApplyPhase>("input");
  const [draft, setDraft] = useState<GuestDraft | null>(null);
  const [orderState, setOrderState] = useState<GuestOrderStateResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // 선택 역할(owner|tenant) — 폼 로컬이 아니라 훅이 초안 수명주기에 결합해 단일 상태로 관리한다
  // (설계 §4.2·§4.4, 리뷰 지적 1·2). 새 초안·만료·재파싱에서 null로 초기화하고, 같은 초안의 OTP
  // 취소·재발송·복귀에서는 보존한다.
  const [role, setRole] = useState<GuestMonitoringRole | null>(null);
  // 인증 시작으로 서버 초안에 역할이 확정(bindDraftRole)된 뒤에는 같은 역할로만 재시도 가능하다.
  // 서버는 같은 초안의 다른 역할을 not_found로 거부하므로(draft-role.ts), 역할 변경은 "다시 입력"
  // (새 초안)으로만 안내한다. OTP 취소·재발송·발송 실패·소유자 불일치 복귀에서도 잠금을 유지한다.
  const [roleLocked, setRoleLocked] = useState(false);
  // 현재 실패의 권장 동작(§6.3). retry는 이 분류에 따라 "해당 동작만" 수행한다.
  const [recovery, setRecovery] = useState<FailureAction | null>(null);
  const resumedRef = useRef(false);
  // SMS OTP 대기·검증 공통 훅(§5.2).
  const otp = useGuestOtp();
  // 재요청(§6.2)용 입력과 "현재 인증에 결합된 초안". 훅 메모리로만 보관(저장소/URL 금지).
  const otpNameRef = useRef("");
  const otpPhoneRef = useRef("");
  const otpDraftIdRef = useRef("");
  // 선택한 역할(owner|tenant) — OTP 취소·재발송·폼 재마운트 시 복원용(설계 §4.4). 서버가 초안에 저장·확정.
  const otpRoleRef = useRef<GuestMonitoringRole | null>(null);
  // 요청 세대: reset·초안 교체·재인증 시 증가. 이전 비동기 응답이 최신 상태를 덮어쓰지 못하게 한다(§6.1).
  const genRef = useRef(0);
  // 결제창(SDK) 실행 재진입 잠금: 같은 틱의 이중 클릭으로 startOrder가 두 번 들어와도 결제 실행은 1회만
  // (중복 청구 방지, §6.1 경합). busy 비활성화는 다음 렌더 UI만 막으므로 동기 재진입은 ref로 막는다.
  const payingRef = useRef(false);

  // 초안이 폐기되는 경로(만료·재파싱·입력 복귀)에서 역할 선택·잠금을 함께 초기화한다(리뷰 지적 2).
  // 같은 초안을 유지하는 경로(OTP 취소·재발송, 재인증 후 ready)에서는 호출하지 않아 잠금을 보존한다.
  const resetRole = useCallback(() => {
    otpRoleRef.current = null;
    setRole(null);
    setRoleLocked(false);
  }, []);

  // 주문 생성·결제·복구 상태머신(§5.2/§6). 상태 setter·ref를 주입해 단일 상태를 공유한다.
  const { handleReauth, advanceOrder, startOrder } = useGuestOrderFlow({
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
  });

  // 언마운트 시 세대 무효화: 결제·복구 중 화면을 떠나도 지연 응답이 runPayment(SDK)/상태 전이를
  // 트리거하지 못하게 한다(§6.1 비동기 세대 관리). in-flight 요청은 gen 불일치로 조기 반환된다.
  useEffect(() => {
    return () => {
      genRef.current++;
    };
  }, []);

  // 신청 완료(done) 직후 apply 세션 즉시 폐기(로그아웃 정책): 결과(orderState)는 이미 메모리에 있어 완료
  // 화면 표시에 영향 없고, done은 종단 상태라 이후 인증요청이 없다. 서버 revoke+세션 쿠키 삭제, 1회만.
  const sessionRevokedRef = useRef(false);
  useEffect(() => {
    if (phase === "done" && !sessionRevokedRef.current) {
      sessionRevokedRef.current = true;
      void deleteSession();
    }
  }, [phase]);

  /** 1단계: PDF 파싱 + 초안 생성 */
  const submitParse = useCallback(async (input: ApplyInput) => {
    setError("");
    if (!input.file) {
      setError("등기부등본 PDF를 업로드해 주세요.");
      return;
    }
    if (!input.guestName.trim() || !input.guestPhone.trim()) {
      setError("이름과 전화번호를 입력해 주세요.");
      return;
    }
    // 새 초안 → 이전 흐름 참조/세대 무효화(입력 변경 시 이전 draft/주문으로 결제 방지, §2).
    genRef.current += 1;
    const gen = genRef.current; // 이 파싱 요청의 세대 — 응답 뒤 최신 세대와 비교(경합 방지, §6.1)
    applyResume.clear();
    otp.resetOtp();
    otpNameRef.current = "";
    otpPhoneRef.current = "";
    otpDraftIdRef.current = "";
    resetRole(); // 새 초안 → 이전 역할 선택·잠금 폐기(설계 §4.2, 리뷰 지적 2)
    setOrderState(null);
    setRecovery(null);
    setBusy(true);
    const res = await parsePdf({
      file: input.file,
      guestName: input.guestName.trim(),
      guestPhone: input.guestPhone.trim(),
    });
    // reset·새 초안·언마운트가 끼어들었으면 이 응답으로 draft/저장소/상태를 되살리지 않는다(§6.1).
    // busy는 현재 세대의 흐름이 관리하므로 stale 응답은 건드리지 않는다.
    if (gen !== genRef.current) return;
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
  }, [otp, resetRole]);

  /** 흐름 완전 초기화(입력 단계로). reset·재파싱·막다름 해소 공용. */
  const goInput = useCallback(() => {
    genRef.current += 1;
    applyResume.clear();
    otp.resetOtp();
    otpNameRef.current = "";
    otpPhoneRef.current = "";
    otpDraftIdRef.current = "";
    resetRole();
    setDraft(null);
    setOrderState(null);
    setRecovery(null);
    setError("");
    // 진행 중 흐름을 초기화할 때 busy가 남지 않도록 명시 해제(세대 가드로 stale 응답은 이미 무시, §6.1).
    setBusy(false);
    setPhase("input");
  }, [otp, resetRole]);

  /**
   * 2단계: 본인인증 시작(결제 전). 다날 모드는 리다이렉트+복귀 마커로 주문 재개(기존 동작).
   * OTP 모드(launch.mode==="sms_otp")는 복귀 마커 없이 OTP 대기 후 성공 시에만 startOrder(§5.2).
   */
  const startIdentity = useCallback(
    async (guestName: string, guestPhone: string, role: GuestMonitoringRole) => {
      if (!draft) return;
      setError("");
      const name = guestName.trim();
      const phone = guestPhone.trim();
      if (!name || !phone) {
        setError("이름과 전화번호를 입력해 주세요.");
        setPhase("ready");
        return;
      }
      if (role !== "owner" && role !== "tenant") {
        // 역할 미선택/비정상값은 진행 차단(서버도 §3.4-B에서 거부).
        setError("신청 역할(소유자/임차인)을 선택해 주세요.");
        setPhase("ready");
        return;
      }
      otpRoleRef.current = role; // 복원·재발송용으로 보관(설계 §4.4)
      // 인증 시작 = 서버가 이 역할로 초안을 확정(bindDraftRole). 발송/네트워크 실패로 ready로 돌아와도
      // 서버에 이미 역할이 저장됐을 수 있으므로, 같은 초안에서는 역할을 잠가 같은 역할로만 재시도한다
      // (리뷰 지적 1). 역할 변경은 "다시 입력"(새 초안)으로만.
      setRole(role);
      setRoleLocked(true);
      // 이 인증 시작 요청의 세대. reset·새 초안·재인증·언마운트가 끼어들면 응답을 버린다(§6.1 경합).
      const gen = genRef.current;
      setBusy(true);
      setPhase("verifying");
      const res = await identityStart({
        purpose: "apply",
        guestName: name,
        guestPhone: phone,
        draftId: draft.draftId,
        role,
      });
      // 오래된 응답이 새 초안의 OTP 대기로 전환하거나 옛 마커를 심지 못하게 한다(§6.1).
      if (gen !== genRef.current) return;
      if (!res.ok) {
        setBusy(false);
        // 401 등 세션 실패도 재인증 분기로 일관 처리(§6.1).
        if (res.status === 401) {
          handleReauth();
          return;
        }
        setError(res.error);
        setPhase("ready");
        return;
      }
      if (res.data.launch.mode === "sms_otp") {
        applyResume.clearPendingIdentity();
        otpNameRef.current = name;
        otpPhoneRef.current = phone;
        otpDraftIdRef.current = draft.draftId; // 현재 인증에 결합된 초안
        setBusy(false);
        otp.beginOtp(res.data.verificationId, res.data.expiresAt);
        setPhase("otp");
        return;
      }
      // 다날: 인증창으로 떠나기 직전 복귀 식별 마커를 심는다(복귀 시 주문 재개 트리거).
      applyResume.setPendingIdentity(orderTarget("initial", draft.draftId));
      const launched = launchProvider(res.data.launch as Record<string, string>);
      if (!launched) {
        applyResume.clearPendingIdentity();
        setBusy(false);
        setError("본인인증 창을 열 수 없습니다. 잠시 후 다시 시도해 주세요.");
        setPhase("ready");
      }
    },
    [draft, otp, handleReauth]
  );

  /**
   * OTP 확인 → 성공 시 "현재 인증 결합 초안"으로만 주문 진행(§5.2). §6.2: 성공 후에도 이름·전화는
   * 비우지 않는다(전송 실패 시 폼 복원). OTP 코드·대기·otpDraftIdRef만 정리하되 draftId는 먼저 확보.
   */
  const verifyApplyOtp = useCallback(
    async (code: string) => {
      const result = await otp.submitOtp(code);
      if (!result) return; // 실패(otpError 반영) 또는 구형 응답 — 미인증 유지
      const draftId = otpDraftIdRef.current; // 정리 전에 확보
      otp.resetOtp();
      otpDraftIdRef.current = "";
      if (!draftId) {
        setError("인증 정보가 만료되었습니다. 다시 시도해 주세요.");
        setPhase("ready");
        return;
      }
      // 재인증(401) 후 OTP 성공처럼 "기존 주문이 이미 있는" 경우, SDK를 다시 띄우지 않는다(버그⑤).
      // 기존 주문이 있으면 상태부터 확인·콜백 재전송(§6.1), 없을 때만 새 주문·결제창 실행.
      const existingOrderId = applyResume.getOrderId(orderTarget("initial", draftId));
      if (existingOrderId) {
        void advanceOrder(existingOrderId, draftId);
        return;
      }
      void startOrder(draftId);
    },
    [otp, startOrder, advanceOrder]
  );

  /** 재요청(§6.2): 새 세션·코드. 기존 대기 폐기 후 동일 입력·역할로 재시작. */
  const resendApplyOtp = useCallback(() => {
    const role = otpRoleRef.current;
    if (!role) {
      // 역할 유실(비정상) — 폼으로 돌려보내 역할을 다시 선택하게 한다.
      setError("신청 역할을 다시 선택해 주세요.");
      setPhase("ready");
      return;
    }
    otp.resetOtp();
    void startIdentity(otpNameRef.current, otpPhoneRef.current, role);
  }, [otp, startIdentity]);

  /**
   * 취소: 대기·코드 정리 후 입력(ready) 복귀(§6.2).
   * 이름·전화(otpNameRef/otpPhoneRef)는 비우지 않는다 — 잠긴 빈 폼으로 재인증이 막히는 결함 방지.
   */
  const cancelApplyOtp = useCallback(() => {
    otp.resetOtp();
    otpDraftIdRef.current = "";
    setError("");
    setPhase("ready");
  }, [otp]);

  // 복귀(리다이렉트 반환) 처리 — 클라이언트 1회. "복귀 신호"(쿼리·저장 주문·인증 마커)가 있을 때만
  // 재개하고, 없으면 입력 폼 유지. 주문이 있으면 서버 상태(SSOT)가 성공/에러를 판정한다.
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    if (typeof window === "undefined") return;

    // V1 모바일 리다이렉트 복귀 쿼리(미신뢰). 읽은 뒤 URL에서 식별자를 제거한다(§4.6).
    const { impUid, merchantUid } = readV1RedirectReturn();
    const q = new URLSearchParams(window.location.search);
    const hasError = !!q.get("error");
    const queryOrderId = q.get("orderId");
    const verified = q.get("verified") === "1" || q.get("ok") === "1";
    const draftId = applyResume.getDraftId();
    const target = orderTarget("initial", draftId);
    const storedOrderId = draftId ? applyResume.getOrderId(target) : null;
    const pendingIdentity = applyResume.getPendingIdentity();
    const orderId = queryOrderId || merchantUid || storedOrderId;
    // imp_uid는 복귀 merchant_uid가 대상 주문과 일치할 때만 결합(불일치/부재면 무시, 서버가 최종 검증 §4.6).
    const impUidForOrder = impUid && (!merchantUid || merchantUid === orderId) ? impUid : undefined;

    if (orderId) {
      // 주문이 있으면 에러 쿼리 여부와 무관하게 서버 상태로 판정한다(브라우저 신호 불신, §5.2).
      applyResume.clearPendingIdentity();
      if (draftId) {
        applyResume.setOrderId(target, orderId);
        // 모바일 리다이렉트 복귀: 메모리 콜백 문맥이 사라졌으므로 동일 멱등키로 재발급해(+쿼리 imp_uid 결합)
        // 콜백을 재전송한 뒤 상태로 확정한다(SDK 재실행·새 주문 없음, §4.6).
        void advanceOrder(orderId, draftId, impUidForOrder);
      } else {
        // 초안 참조가 없어 문맥 재발급 불가 → 재조회만 수행(서버 상태가 판정).
        void advanceOrder(orderId);
      }
      return;
    }
    if (hasError) {
      // 주문 참조 없이 에러로만 복귀 — 자동 재결제 금지, 사용자 재시도 안내.
      applyResume.clearPendingIdentity();
      setRecovery({ kind: "blocked" });
      setError("본인인증 또는 결제가 완료되지 않았습니다. 다시 시도해 주세요.");
      setPhase("failed");
      return;
    }
    // 본인인증만 끝나고 주문 전 단계로 돌아온 경우: 명시 신호(verified) 또는 우리가 심은 마커가 있을 때만.
    if (draftId && (verified || pendingIdentity === target)) {
      applyResume.clearPendingIdentity();
      void startOrder(draftId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 재시도: recovery 분류에 따라 "해당 동작만" 수행(§6.3). 새 결제는 확정 실패(fresh_payment)만. */
  const retry = useCallback(() => {
    setError("");
    const draftId = draft?.draftId ?? applyResume.getDraftId();
    const target = orderTarget("initial", draftId);
    const orderId = draftId ? applyResume.getOrderId(target) : null;
    const action = recovery;

    const hasValidDraft = !!(draftId && draft?.extractionOk);
    if (action?.kind === "reparse") {
      goInput();
      return;
    }
    if (action?.kind === "reauth") {
      // 유효 초안이면 ready(폼에서 재인증), 아니면 입력부터.
      if (draft?.extractionOk) {
        setRecovery(null);
        setPhase("ready");
      } else {
        goInput();
      }
      return;
    }
    if (action?.kind === "fresh_payment") {
      // 확정 실패 주문: 키를 비우고 새 결제(새 멱등키). 초안 만료면 재파싱.
      if (hasValidDraft && draftId) {
        applyResume.clearOrder(target);
        setRecovery(null);
        void startOrder(draftId);
      } else {
        goInput();
      }
      return;
    }
    if (action?.kind === "retry_payment") {
      // 결제창 미실행 중단(모듈/실행정보/금액, 버그①): 같은 주문에 결제창 재실행(출금 전이라 안전).
      if (hasValidDraft && draftId) {
        setRecovery(null);
        void startOrder(draftId);
      } else {
        goInput();
      }
      return;
    }
    if (action?.kind === "resend_callback") {
      // 승인됐으나 콜백 유실로 pending(버그②③): SDK 재실행 없이 동일 문맥 콜백 재전송.
      setRecovery(null);
      if (orderId && draftId) {
        void advanceOrder(orderId, draftId);
      } else if (orderId) {
        void advanceOrder(orderId);
      } else if (draft?.extractionOk) {
        setPhase("ready");
      } else {
        goInput();
      }
      return;
    }
    if (action?.kind === "retry_same") {
      // network(status=0)·429·503. 주문이 이미 있으면(결제 실행 이후일 수 있음) 결제창을 다시 띄우지
      // 않고 재조회/콜백 재전송만 한다(버그⑤). 주문 전송 자체가 실패해 주문이 없을 때만 재전송(SDK 실행).
      setRecovery(null);
      if (orderId && draftId) {
        void advanceOrder(orderId, draftId);
      } else if (orderId) {
        void advanceOrder(orderId);
      } else if (hasValidDraft && draftId) {
        void startOrder(draftId);
      } else {
        goInput();
      }
      return;
    }
    // recheck·blocked·conflict·null: 주문 있으면 재조회만(새 결제·콜백 재전송 금지), 없으면 ready/input.
    if (orderId) {
      void advanceOrder(orderId);
      return;
    }
    if (draftId && draft?.extractionOk) {
      setPhase("ready");
      return;
    }
    goInput();
  }, [draft, recovery, advanceOrder, startOrder, goInput]);

  const reset = useCallback(() => {
    goInput();
  }, [goInput]);

  return {
    phase,
    draft,
    orderState,
    error,
    busy,
    submitParse,
    startIdentity,
    retry,
    reset,
    // 선택 역할·잠금 — 훅이 초안 수명주기에 결합해 단일 관리(리뷰 지적 1·2). 폼은 controlled로 쓴다.
    role,
    setRole,
    roleLocked,
    // OTP 취소·재발송·전송 실패로 신청 폼이 다시 마운트될 때 복원할 이름·전화(§6.2). OTP 진입 시점에
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
