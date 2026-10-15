"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GuestPropertyDto, GuestCalendarResponse } from "@/types/guest-monitoring";
import {
  listProperties,
  getCalendar,
  identityStart,
  createOrder,
  getOrderState,
  deleteSession,
} from "../guest/guestApi";
import { launchProvider, applyResume, classifyOrderState, orderTarget } from "../guest/guestProvider";
import { useGuestOtp } from "./useGuestOtp";

/** 현재 월(KST, YYYY-MM). 서버는 month 파라미터를 KST 기준으로 해석한다(설계 §3.4). */
export function currentKstMonth(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  // en-CA → "2026-10"
  return parts.slice(0, 7);
}

type AuthState = "checking" | "unauthenticated" | "authenticated" | "error";

/**
 * 비회원 현황 조회 흐름 (설계 §4.2 / step 6·8).
 * 권한 근거는 조회 세션 쿠키뿐 → 마운트 시 /properties 로 세션 유효성을 탐지한다(쿼리 불필요).
 * 인증 전에는 신청 존재/주소/건수/기간을 노출하지 않는다.
 *
 * 견고성: 모든 응답에서 checking 을 종료(§4)하고, 달력/연장 오류·세션 만료를 화면에
 * 전달(§5)하며, 최신 요청만 상태에 반영한다(§3). 로그아웃은 서버 폐기 확인 후 완료(§6).
 */
export function useGuestStatus() {
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [properties, setProperties] = useState<GuestPropertyDto[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [month, setMonth] = useState<string>(currentKstMonth());
  const [calendar, setCalendar] = useState<GuestCalendarResponse | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [probeError, setProbeError] = useState("");
  const [logoutFailed, setLogoutFailed] = useState(false);
  const probedRef = useRef(false);
  // 달력 요청 세대 번호 — 역순 완료 시 최신 요청만 반영(경합 방지, §3).
  const calSeqRef = useRef(0);
  // SMS OTP 대기·검증 공통 훅(설계 §5.2). 다날 모드에서는 쓰이지 않는다.
  const otp = useGuestOtp();
  // 재요청(§5.4) 시 재사용할 입력. 훅 메모리로만 보관하고 성공·취소 시 비운다(§5.3).
  const lastNameRef = useRef("");
  const lastPhoneRef = useRef("");

  /** 세션 만료(401) 공통 처리: 조회 데이터 비우고 재인증 화면으로(§5). */
  const handleSessionExpired = useCallback(() => {
    calSeqRef.current++; // in-flight 달력 응답 무시
    applyResume.clear();
    setBusy(false); // in-flight 요청이 stale 로 조기 반환되어도 버튼 잠금 해제
    setProperties([]);
    setSelectedId(null);
    setCalendar(null);
    setNotice("");
    setProbeError("");
    setLogoutFailed(false);
    setAuthState("unauthenticated");
    setError("조회 세션이 만료되었습니다. 다시 본인인증 후 조회해 주세요.");
  }, []);

  const loadCalendar = useCallback(
    async (id: string, m: string) => {
      const seq = ++calSeqRef.current;
      setBusy(true);
      setError("");
      setCalendar(null); // 선택/월 변경 시 이전 물건 데이터 즉시 제거(§3)
      const res = await getCalendar(id, m);
      if (seq !== calSeqRef.current) return; // 최신 요청만 반영
      setBusy(false);
      if (!res.ok) {
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        setCalendar(null);
        setError(res.error || "감시 기록을 불러오지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      // 응답이 현재 선택 물건과 일치할 때만 반영(역순 완료 방어, §3)
      if (res.data.property.id !== id) return;
      setCalendar(res.data);
    },
    [handleSessionExpired]
  );

  const selectProperty = useCallback(
    (id: string) => {
      calSeqRef.current++; // 이전 선택의 in-flight 응답 무시
      setSelectedId(id);
      setCalendar(null);
      setError("");
      const m = currentKstMonth();
      setMonth(m);
      void loadCalendar(id, m);
    },
    [loadCalendar]
  );

  const changeMonth = useCallback(
    (m: string) => {
      setMonth(m);
      if (selectedId) void loadCalendar(selectedId, m);
    },
    [selectedId, loadCalendar]
  );

  // authState 를 비동기 콜백에서 읽기 위한 ref(세션 만료 분기)
  const authStateRef = useRef<AuthState>("checking");
  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  const refreshProperties = useCallback(
    async (): Promise<GuestPropertyDto[]> => {
      const res = await listProperties();
      if (!res.ok) {
        if (res.status === 401) {
          // 이미 인증 상태였다면 세션 만료(데이터 비우고 재인증 안내), 최초 탐지면 단순 미인증.
          if (authStateRef.current === "authenticated") handleSessionExpired();
          else setAuthState("unauthenticated");
          return [];
        }
        // 네트워크/404/429/503/500 → 일시 오류 화면(재시도 가능), checking 종료(§4)
        setProbeError(
          res.status === 404
            ? "현재 비회원 조회 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요."
            : "조회 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요."
        );
        setAuthState("error");
        return [];
      }
      setProbeError("");
      setAuthState("authenticated");
      setProperties(res.data.properties);
      return res.data.properties;
    },
    [handleSessionExpired]
  );

  // 마운트: 세션 탐지 + 연장/신청 결제 복귀 처리.
  useEffect(() => {
    if (probedRef.current) return;
    probedRef.current = true;
    (async () => {
      let list = await refreshProperties();
      // 저장된 미완료 주문이 있으면 상태 확인 후 정리(대상별, §7·§8).
      const pending = applyResume.listPendingOrders();
      let appliedAny = false;
      for (const { target, orderId } of pending) {
        const res = await getOrderState(orderId);
        if (!res.ok) continue; // 세션/권한 불일치 등 — 무조건 삭제하지 않고 유지(§7)
        const kind = classifyOrderState(res.data);
        if (kind === "applied") {
          appliedAny = true;
          applyResume.clearOrder(target);
          setNotice("연장 결제가 완료되어 감시 기간이 반영되었습니다.");
        } else if (kind === "settling") {
          setNotice("결제 승인을 확인하고 있습니다. 잠시 후 새로고침해 주세요.");
        } else {
          applyResume.clearOrder(target); // 확정 실패/취소 — 참조 정리
        }
      }
      if (appliedAny) list = await refreshProperties();
      // 단건이면 자동 선택.
      if (list.length === 1) selectProperty(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 일시 오류(error) 상태에서 재시도 — 세션 탐지를 다시 수행(§4). */
  const retryProbe = useCallback(async () => {
    setAuthState("checking");
    setProbeError("");
    const list = await refreshProperties();
    if (list.length === 1) selectProperty(list[0].id);
  }, [refreshProperties, selectProperty]);

  /**
   * 본인인증 시작(purpose=status).
   * - 다날 모드: launch에 url/action 존재 → launchProvider가 리다이렉트(기존 동작, true 반환).
   * - OTP 모드: launch.mode==="sms_otp"(이동 필드 없음) → OTP 대기 진입. 목록 갱신·인증완료
   *   표시를 하지 않는다(§5.2).
   */
  const startAuth = useCallback(
    async (guestName: string, guestPhone: string) => {
      setError("");
      if (!guestName.trim() || !guestPhone.trim()) {
        setError("이름과 전화번호를 입력해 주세요.");
        return;
      }
      setBusy(true);
      const name = guestName.trim();
      const phone = guestPhone.trim();
      const res = await identityStart({ purpose: "status", guestName: name, guestPhone: phone });
      if (!res.ok) {
        setBusy(false);
        setError(res.error);
        return;
      }
      // 런타임 launch는 Record<string,string>(설계 §2.4). 다날은 여기서 리다이렉트된다.
      const launched = launchProvider(res.data.launch as Record<string, string>);
      if (launched) return; // 다날 리다이렉트 — 페이지 이탈
      if (res.data.launch.mode === "sms_otp") {
        // OTP 대기. 재요청용 입력을 훅 메모리에 보관(§5.3).
        lastNameRef.current = name;
        lastPhoneRef.current = phone;
        setBusy(false);
        otp.beginOtp(res.data.verificationId, res.data.expiresAt);
        return;
      }
      // 이동 필드도 OTP 모드도 아님(다날 목 즉시완료 등) — 세션 발급 재탐지(기존 동작).
      setBusy(false);
      await refreshProperties();
    },
    [refreshProperties, otp]
  );

  /** OTP 코드 확인 → 성공 시 목록 갱신 + 단건 자동 선택(§5.2). */
  const verifyStatusOtp = useCallback(
    async (code: string) => {
      const result = await otp.submitOtp(code);
      if (!result) return; // 실패(otpError 반영) 또는 구형 응답 — 미인증 유지
      // 서버가 조회 세션 쿠키를 발급했다 → 목록 갱신으로 인증 전환.
      const list = await refreshProperties();
      otp.resetOtp();
      lastNameRef.current = "";
      lastPhoneRef.current = "";
      if (list.length === 1) selectProperty(list[0].id);
    },
    [otp, refreshProperties, selectProperty]
  );

  /** 재요청(§5.4): 새 세션·코드. 기존 대기 폐기 후 동일 입력으로 재시작. */
  const resendStatusOtp = useCallback(() => {
    otp.resetOtp();
    void startAuth(lastNameRef.current, lastPhoneRef.current);
  }, [otp, startAuth]);

  /** 취소: 대기·코드·입력 정리 후 입력 단계 복귀(§5.3). */
  const cancelStatusOtp = useCallback(() => {
    otp.resetOtp();
    lastNameRef.current = "";
    lastPhoneRef.current = "";
    setError("");
  }, [otp]);

  /** 연장 주문(renewal) → 결제창 리다이렉트 */
  const startRenew = useCallback(async () => {
    if (!selectedId) return;
    // 표시 대상과 연장 대상이 일치할 때만 연장(§3).
    if (calendar && calendar.property.id !== selectedId) {
      setError("선택한 물건 정보를 다시 불러온 후 연장해 주세요.");
      return;
    }
    setError("");
    setBusy(true);
    const target = orderTarget("renewal", selectedId);
    const idempotencyKey = applyResume.ensureIdempotencyKey(target);
    const res = await createOrder({
      purpose: "renewal",
      guestMonitoringId: selectedId,
      idempotencyKey,
    });
    if (!res.ok) {
      setBusy(false);
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      // 주문 미생성 — 같은 멱등키로 재시도 가능하므로 키 유지.
      setError(res.error);
      return;
    }
    applyResume.setOrderId(target, res.data.orderId);
    const launched = launchProvider(res.data.payment);
    if (!launched) {
      // 목: 결제창 없음 → 상태 확인 후 분류별 처리(§8).
      const st = await getOrderState(res.data.orderId);
      setBusy(false);
      if (!st.ok) {
        if (st.status === 401) {
          handleSessionExpired();
          return;
        }
        setError(st.error || "연장 결제 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const kind = classifyOrderState(st.data);
      if (kind === "applied") {
        setNotice("연장 결제가 완료되었습니다.");
        applyResume.clearOrder(target);
        await refreshProperties();
        void loadCalendar(selectedId, month);
      } else if (kind === "settling") {
        setNotice("결제 승인을 확인하고 있습니다. 잠시 후 새로고침해 주세요.");
      } else {
        applyResume.clearOrder(target);
        setError("연장 결제가 완료되지 않았습니다. 다시 시도해 주세요.");
      }
    }
  }, [selectedId, calendar, month, refreshProperties, loadCalendar, handleSessionExpired]);

  const logout = useCallback(async () => {
    setBusy(true);
    const res = await deleteSession();
    setBusy(false);
    if (res.ok || res.status === 401) {
      // 서버 폐기 성공 또는 이미 만료된 세션 — 종료 완료(§6).
      applyResume.clear();
      setLogoutFailed(false);
      setAuthState("unauthenticated");
      setProperties([]);
      setSelectedId(null);
      setCalendar(null);
      setNotice("");
      setError("");
    } else {
      // 서버 폐기 실패(네트워크/서버 오류) — 민감 화면은 가리되 종료 미완료 안내+재시도(§6).
      calSeqRef.current++;
      setProperties([]);
      setSelectedId(null);
      setCalendar(null);
      setLogoutFailed(true);
    }
  }, []);

  const backToList = useCallback(() => {
    calSeqRef.current++; // in-flight 달력 응답 무시(§3)
    setBusy(false); // 조기 반환된 stale 요청으로 busy 가 남지 않도록
    setSelectedId(null);
    setCalendar(null);
    setError("");
  }, []);

  return {
    authState,
    properties,
    selectedId,
    selected:
      properties.find((p) => p.id === selectedId) ||
      (calendar?.property.id === selectedId ? calendar.property : null),
    month,
    calendar,
    error,
    notice,
    busy,
    probeError,
    logoutFailed,
    startAuth,
    // SMS OTP 대기·검증(§5.2). otpStatus==="pending"이면 조회 폼 대신 코드 입력 폼을 보인다.
    otpStatus: otp.otpStatus,
    otpVerificationId: otp.verificationId,
    otpExpiresAt: otp.expiresAt,
    otpBusy: otp.otpBusy,
    otpError: otp.otpError,
    verifyStatusOtp,
    resendStatusOtp,
    cancelStatusOtp,
    selectProperty,
    changeMonth,
    startRenew,
    logout,
    backToList,
    retryProbe,
  };
}
