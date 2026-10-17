"use client";

/**
 * 회원 구독 현황 훅(설계 §1.1 `useMemberSubscription`, §3.6 GET /status).
 *
 * `GET /api/member-subscription/status`를 유일 근거로 현황(구독/체험/grace/잠금/영수증·재구독 후보)을
 * 표시 상태로 노출한다. 서버가 요청 시점 현재 시각으로 유효 권한·만료·grace·잠금을 계산하므로
 * 클라이언트는 판정하지 않고 표시만 한다(§4.5). 7일 무료체험 시작도 서버가 1회 소비를 보장한다(§3.5).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { MemberPlan, MemberSubscriptionStatus } from "@/types/member-subscription";
import { getStatus, startTrial } from "../member/memberApi";

export interface TrialResult {
  ok: boolean;
  message?: string;
  /** 서버 응답 HTTP status(화면이 401 재인증·409 현황갱신·일시 장애를 구분). */
  status?: number;
}

export interface UseMemberSubscription {
  status: MemberSubscriptionStatus | null;
  loading: boolean;
  error: string | null;
  /** 세션 미로그인 여부(화면이 로그인 유도 분기에 사용) */
  unauthenticated: boolean;
  /** NextAuth는 authenticated인데 서버가 401 — 세션 쿠키 만료 등. 로그인 유도 분기에 사용. */
  reauthRequired: boolean;
  refresh: () => Promise<void>;
  /** 7일 무료체험 시작. 성공 시 현황을 재조회한다. 실패 사유/HTTP status는 반환값으로 전달. */
  beginTrial: (plan: MemberPlan) => Promise<TrialResult>;
  trialBusy: boolean;
}

export function useMemberSubscription(): UseMemberSubscription {
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id ?? null;

  const [status, setStatus] = useState<MemberSubscriptionStatus | null>(null);
  // 조회 진행 상태. 미로그인/세션로딩은 effect에서 setState하지 않고 파생 loading으로 처리한다
  // (effect 내 동기 setState 지양 — cascading render 방지).
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reauthRequired, setReauthRequired] = useState(false);
  const [trialBusy, setTrialBusy] = useState(false);
  // 언마운트 이후 늦게 도착한 응답이 상태를 덮어쓰지 못하게 한다(§0-5 비정상 경로).
  const mountedRef = useRef(true);
  // 요청 세대 — 늦게 도착한 이전 요청(수동 refresh/계정 전환 포함)이 최신 응답을 덮지 못하게 한다(순서 역전 방지).
  const reqGenRef = useRef(0);
  // 체험 시작 이중 실행 방지(요청 단위).
  const trialBusyRef = useRef(false);
  // 현재 보관 중인 status가 어느 사용자 것인지 — userId와 다르면(계정 전환·초기) stale로 노출을 가린다.
  // 렌더 중 비교해야 하므로 ref가 아닌 state로 둔다.
  const [statusOwner, setStatusOwner] = useState<string | null>(null);
  // effect가 조회할 때 기준 userId(수동 refresh가 참조).
  const userIdRef = useRef<string | null>(userId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // 공통 조회. await **이후**에만 setState해 effect 내 동기 setState(cascading render)를 피한다.
  // 최신 세대 응답만 반영하고, 서버 401은 재인증 필요로 명시한다(미로그인 분기로 뭉개지 않음, §4.9).
  const runFetch = useCallback(async (forUser: string | null) => {
    const gen = ++reqGenRef.current;
    const res = await getStatus();
    if (!mountedRef.current || gen !== reqGenRef.current) return;
    if (res.ok) {
      setStatusOwner(forUser);
      setStatus(res.data);
      setReauthRequired(false);
      setError(null);
    } else if (res.status === 401) {
      // NextAuth authenticated인데 서버가 401 → 세션 만료. 현황을 비우고 재로그인 유도.
      setStatusOwner(forUser);
      setStatus(null);
      setReauthRequired(true);
      setError(null);
    } else {
      setError(res.error);
    }
    setFetchLoading(false);
  }, []);

  // 수동 재조회(이벤트 핸들러 경로 — beginTrial·결제 완료 후 등). effect에서 직접 호출하지 않는다.
  const refresh = useCallback(async () => {
    setFetchLoading(true);
    setError(null);
    await runFetch(userIdRef.current);
  }, [runFetch]);

  // 세션 상태/사용자별 조회. 미로그인/로딩은 setState 없이 파생값으로 가린다(로그아웃 시 이전 계정 잔상 제거).
  // 계정 전환(userId 변경)은 statusOwnerRef 불일치로 stale 처리되어 새 조회 전까지 이전 데이터를 노출하지 않는다.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    userIdRef.current = userId;
    // await 경계 이후에만 조회/ setState가 일어나도록 IIFE로 감싼다(effect 내 동기 setState 금지).
    void (async () => {
      await Promise.resolve();
      await runFetch(userId);
    })();
  }, [sessionStatus, userId, runFetch]);

  const authed = sessionStatus === "authenticated";
  // 보관 중인 status가 현재 사용자 것이 아니면(초기/계정 전환) 아직 로딩으로 간주하고 노출을 가린다.
  const stale = authed && statusOwner !== userId;
  const exposedStatus = authed && !stale ? status : null;
  const exposedError = authed && !stale ? error : null;
  const exposedReauth = authed && !stale ? reauthRequired : false;
  const loading =
    sessionStatus === "loading" || (authed && (fetchLoading || stale));

  const beginTrial = useCallback(
    async (plan: MemberPlan): Promise<TrialResult> => {
      if (trialBusyRef.current) return { ok: false };
      trialBusyRef.current = true;
      setTrialBusy(true);
      const res = await startTrial(plan);
      if (!mountedRef.current) {
        trialBusyRef.current = false;
        return { ok: res.ok };
      }
      trialBusyRef.current = false;
      setTrialBusy(false);
      if (res.ok) {
        await refresh();
        return { ok: true };
      }
      if (res.status === 401) setReauthRequired(true);
      return { ok: false, message: res.error, status: res.status };
    },
    [refresh]
  );

  return {
    status: exposedStatus,
    loading,
    error: exposedError,
    unauthenticated: sessionStatus === "unauthenticated",
    reauthRequired: exposedReauth,
    refresh,
    beginTrial,
    trialBusy,
  };
}
