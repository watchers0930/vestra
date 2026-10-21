"use client";

/**
 * useAnalysisDetail — 분석 이력 상세·직전 비교 조회 훅 (설계 §4.3 ③)
 *
 * - 모달 열 때만 GET /api/user/analyses/[id]?includePrevious=1 (경량 목록은 그대로)
 * - 재분석·AI 호출·횟수 차감 없음(저장 스냅샷만)
 * - 지연 응답 역전 방지: 요청 토큰으로 최신 요청만 반영
 * - useSession 계정 변경 시 캐시·지연 응답 무효화·상태 초기화
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export interface AnalysisMetrics {
  safetyScore: number | null;
  grade: string | null;
  ratioToMarket: number | null;
  jeonseRatio: number | null;
  marketValue: number | null;
  userDeposit: number | null;
  depositSource: string | null;
  vScore: number | null;
  vScoreGrade: string | null;
  riskFactors: Array<{ id: string; description: string; severity: string }> | null;
}

export interface AnalysisRecordDetail {
  id: string;
  type: string;
  typeLabel: string;
  address: string;
  unitNumber: string;
  createdAt: string;
  metrics: AnalysisMetrics;
  scoreRuleVersion: string | null;
}

export interface AnalysisDiff {
  safetyScore: { delta: number; direction: "improved" | "worse" | "unchanged" } | null;
  jeonseRatio: { deltaPp: number } | null;
  addedRiskFactors: string[] | null;
  resolvedRiskFactors: string[] | null;
  changedRiskFactors: { id: string; description: string; from: string; to: string }[] | null;
  ruleVersionChanged: boolean;
}

export interface AnalysisDetailResponse {
  current: AnalysisRecordDetail;
  previous: AnalysisRecordDetail | null;
  diff: AnalysisDiff | null;
}

export function useAnalysisDetail() {
  const { data: session } = useSession();
  const userId = session?.user?.id ?? null;

  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AnalysisDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    tokenRef.current += 1; // 진행 중/지연 응답 무효화
    abortRef.current?.abort();
    abortRef.current = null;
    setOpenId(null);
    setDetail(null);
    setError(null);
    setLoading(false);
  }, []);

  const open = useCallback((id: string) => {
    const token = ++tokenRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOpenId(id);
    setDetail(null);
    setError(null);
    setLoading(true);

    fetch(`/api/user/analyses/${encodeURIComponent(id)}?includePrevious=1`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (token !== tokenRef.current) return; // 최신 요청이 아니면 무시
        if (!res.ok) {
          setError(body?.error || "분석 기록을 불러오지 못했습니다.");
          setLoading(false);
          return;
        }
        setDetail(body as AnalysisDetailResponse);
        setLoading(false);
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (token !== tokenRef.current) return;
        setError("분석 기록을 불러오지 못했습니다.");
        setLoading(false);
      });
  }, []);

  const close = useCallback(() => reset(), [reset]);

  // 계정 변경 시 상세/비교 캐시·지연 응답 무효화 (세션이라는 외부 상태 변화에 동기화)
  const prevUserRef = useRef(userId);
  useEffect(() => {
    if (prevUserRef.current === userId) return; // 최초 마운트·동일 계정이면 초기화 불필요
    prevUserRef.current = userId;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reset();
  }, [userId, reset]);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  return { openId, detail, loading, error, open, close };
}
