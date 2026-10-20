"use client";

/**
 * 온보딩 상태 조회 훅(설계 pro.design §5.1 `GET /api/signup/onboarding-status`).
 *
 * 가입 위저드의 **서버 권위 라우팅/렌더 근거**다. 서버가 로그인 사용자 ID에 귀속된 DB 상태로
 * `stage`·`complete`·`allowedPlans`·`freeAllowed` 등을 산출하며(클라이언트가 보낸 role/plan/step/completed를
 * 신뢰하지 않음), 프론트는 그 값을 라우팅·카드 필터에만 쓴다(§4.3·§7.1·§7.2).
 *
 * 조회 실패/역할 미확정 중에는 구매·무료 완료를 실행하지 않도록 상태를 노출만 하고, 호출부가 로딩/재시도를
 * 표시한다(§7.2). GET이므로 변이 없음 — 세션 쿠키만 권한 근거(credentials: same-origin).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import type { OnboardingState } from "@/types/member-subscription";

const ENDPOINT = "/api/signup/onboarding-status";

// 수동·자동(포커스 복귀) 백그라운드 갱신 공통 최소 간격. 이벤트 훅이 아니라 요청을 소유한 이 훅에서
// 단일 기준으로 제한한다(중복 fetch·읽기 폭주 방지, §5.1).
const BG_MIN_INTERVAL_MS = 10_000;
// 백그라운드 갱신 실패(429/5xx/네트워크) 후 재시도를 늦추는 백오프.
const BG_BACKOFF_MS = 30_000;

/** refresh 결과. 호출부(수동 재확인 등)가 성공/실패/재인증을 구분해 안내할 수 있게 한다. */
export interface RefreshResult {
  ok: boolean;
  /** HTTP 상태(성공=200, 네트워크 오류=0). */
  status: number;
  /** 실패 메시지(성공이면 null). */
  error: string | null;
  /** 서버 401(세션 만료) 여부. */
  reauth: boolean;
}

export interface UseOnboardingStatus {
  state: OnboardingState | null;
  loading: boolean;
  error: string | null;
  /** 세션 미로그인 여부(화면이 로그인 유도 분기에 사용) */
  unauthenticated: boolean;
  /** NextAuth는 authenticated인데 서버가 401 — 세션 만료. 재로그인 유도 분기에 사용. */
  reauthRequired: boolean;
  /**
   * 상태를 재조회하고 결과를 반환한다.
   * - 기본(foreground): 로딩을 노출해 셸이 로딩/오류/재시도를 표시한다(최초 진입·수동 전체 재시도).
   * - `{ background: true }`: 공유 로딩을 켜지 않고 조용히 갱신한다. 유효한 기존 화면(결제 완료·대기 화면)을
   *   언마운트/오류화면 전환 없이 유지한다(§7.1·§7.3). 진행 중 요청이 있으면 **공유**하고(중복 fetch 방지),
   *   공통 최소 간격/백오프 내에는 요청을 생략한다. 실패/재인증은 **상태를 바꾸지 않고 반환값으로만** 알린다.
   * - `{ background: true, force: true }`: 사용자가 누른 "상태 다시 확인" — 최소 간격 제한을 건너뛰되
   *   진행 중 요청과는 여전히 합쳐, 실패/재인증을 반환값으로 패널 안에 표시할 수 있게 한다(§5.1).
   */
  refresh: (opts?: { background?: boolean; force?: boolean }) => Promise<RefreshResult>;
}

function toResult(
  res: { ok: true; data: OnboardingState } | { ok: false; status: number; error: string }
): RefreshResult {
  if (res.ok) return { ok: true, status: 200, error: null, reauth: false };
  return { ok: false, status: res.status, error: res.error, reauth: res.status === 401 };
}

async function fetchOnboarding(): Promise<
  | { ok: true; data: OnboardingState }
  | { ok: false; status: number; error: string }
> {
  try {
    const res = await fetch(ENDPOINT, { method: "GET", credentials: "same-origin", cache: "no-store" });
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (res.ok) return { ok: true, data: (body ?? {}) as OnboardingState };
    const b = (body ?? {}) as { error?: string };
    return { ok: false, status: res.status, error: b.error || "가입 상태를 확인하지 못했습니다." };
  } catch {
    return { ok: false, status: 0, error: "네트워크 오류가 발생했습니다." };
  }
}

/**
 * 온보딩 상태를 조회한다. 계정 전환(userId 변경)·언마운트 이후 늦은 응답이 최신 상태를 덮지 못하게
 * 세대/소유자 가드를 둔다(useMemberSubscription과 동일 원칙).
 */
export function useOnboardingStatus(): UseOnboardingStatus {
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id ?? null;

  const [state, setState] = useState<OnboardingState | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reauthRequired, setReauthRequired] = useState(false);
  // 데이터 소유자: state(성공/401)를 채운(비운) 계정. 실패는 데이터를 바꾸지 않아 이전 계정 데이터를 계속 가린다.
  const [dataOwner, setDataOwner] = useState<string | null>(null);
  // 요청 소유자: 가장 최근 "완료"된 요청(성공·401·실패 공통)의 계정. 오류/재인증 노출·로딩 종료의 기준이다.
  // 실패 시에도 기록해야 비401 실패가 무한 로딩으로 숨지 않는다(이전 버그: 실패에 소유자 미기록 → stale 영구).
  const [reqOwner, setReqOwner] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const reqGenRef = useRef(0);
  const userIdRef = useRef<string | null>(userId);
  // 백그라운드 갱신의 단일 조정기: 진행 중 요청(공유), 마지막 완료 시각(최소 간격), 백오프 해제 시각.
  const inFlightRef = useRef<Promise<RefreshResult> | null>(null);
  const lastBgAtRef = useRef(0);
  const backoffUntilRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const runFetch = useCallback(async (forUser: string | null, background: boolean): Promise<RefreshResult> => {
    const gen = ++reqGenRef.current;
    const res = await fetchOnboarding();
    // 늦은/무효 응답(언마운트·계정 전환·세대 역전): 상태를 덮지 않고 결과만 반환한다.
    if (!mountedRef.current || gen !== reqGenRef.current) return toResult(res);
    if (res.ok) {
      setDataOwner(forUser);
      setState(res.data);
      setReauthRequired(false);
      setError(null);
    } else if (background) {
      // 백그라운드 갱신 실패(401 포함): 기존 상태를 유지하고 화면을 깨지 않는다. 오류/재인증을 상태로
      // 노출하지 않아 유효 화면(결제 완료·승인 대기)이 오류/주문 화면으로 되돌아가지 않게 한다(§7.1·§7.3).
      // 대신 실패/재인증은 반환값으로 알려, 수동 재확인 호출부가 패널 안에서 구분 표시한다(§5.1).
    } else if (res.status === 401) {
      setDataOwner(forUser);
      setState(null);
      setReauthRequired(true);
      setError(null);
    } else {
      // 실패: 데이터 소유자는 그대로 둬 이전 계정 데이터를 계속 가리되, 현재 계정의 오류·재시도는 노출한다.
      setError(res.error);
    }
    // 성공·실패 공통으로 요청 소유자를 기록해야 현재 계정의 결과(오류 포함)가 노출되고 로딩이 종료된다.
    setReqOwner(forUser);
    setFetchLoading(false);
    return toResult(res);
  }, []);

  const refresh = useCallback(
    async (opts?: { background?: boolean; force?: boolean }): Promise<RefreshResult> => {
      const background = opts?.background === true;
      const force = opts?.force === true;

      if (background) {
        // 진행 중인 백그라운드 요청이 있으면 그대로 공유한다 — 수동 재확인과 포커스 복귀가 겹쳐도 같은 GET을
        // 중복 실행하지 않는다(이벤트 훅이 상태를 따로 복제하지 않고 이 공유에 의존한다, §5.1).
        if (inFlightRef.current) return inFlightRef.current;
        if (!force) {
          // 사용자가 직접 누른 것이 아니면(자동 포커스 갱신) 공통 최소 간격·백오프 내에는 요청을 생략한다.
          const now = Date.now();
          if (now < backoffUntilRef.current || now - lastBgAtRef.current < BG_MIN_INTERVAL_MS) {
            return { ok: true, status: 0, error: null, reauth: false };
          }
        }
        const p = (async () => {
          const r = await runFetch(userIdRef.current, true);
          lastBgAtRef.current = Date.now();
          // 실패(429/5xx/네트워크)면 백오프 — 지속 장애 시 재조회 폭주를 막는다.
          backoffUntilRef.current = r.ok ? 0 : Date.now() + BG_BACKOFF_MS;
          return r;
        })();
        inFlightRef.current = p;
        try {
          return await p;
        } finally {
          inFlightRef.current = null;
        }
      }

      // foreground(최초 진입·수동 전체 재시도): 공유 로딩을 켜 셸이 로딩/오류/재시도를 표시한다.
      setFetchLoading(true);
      setError(null);
      return runFetch(userIdRef.current, false);
    },
    [runFetch]
  );

  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    userIdRef.current = userId;
    void (async () => {
      await Promise.resolve();
      await runFetch(userId, false);
    })();
  }, [sessionStatus, userId, runFetch]);

  const authed = sessionStatus === "authenticated";
  // 데이터 staleness: 이전 계정 데이터를 가린다(계정 전환·실패 후 미갱신).
  const dataStale = authed && dataOwner !== userId;
  // 요청 staleness: 현재 계정의 요청이 아직 완료되지 않음 → 로딩. 완료되면(성공·실패 무관) 결과를 노출한다.
  const reqStale = authed && reqOwner !== userId;
  // 세션 재갱신(결제 후 update({}) → sessionStatus "loading") 중에는 이미 확정된 state를 유지한다.
  // 그렇지 않으면 onboarding이 null로 노출돼 maxStep=1이 되고 결제 완료 화면이 언마운트된다(High-B).
  // 최초 로딩(아직 조회 전: dataOwner/state 없음)에는 유지할 상태가 없어 null로 남아 가드가 유효하다.
  const keepDuringRefresh = sessionStatus === "loading" && dataOwner != null && state != null;
  const exposedState = (authed && !dataStale) || keepDuringRefresh ? state : null;
  const exposedError = authed && !reqStale ? error : null;
  const exposedReauth = authed && !reqStale ? reauthRequired : false;
  const loading = (sessionStatus === "loading" && !keepDuringRefresh) || (authed && (fetchLoading || reqStale));

  return {
    state: exposedState,
    loading,
    error: exposedError,
    unauthenticated: sessionStatus === "unauthenticated",
    reauthRequired: exposedReauth,
    refresh,
  };
}
