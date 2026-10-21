"use client";

/**
 * RightsScoreCard — 독립 안전점수 카드 (설계 §4.2 ⑤)
 *
 * 권리분석 안전점수(높을수록 안전)와 선순위 비율 지표를 표시 전용으로 보여준다.
 * 점수·등급·비율은 서버 산식(lib/risk-scoring·claims-policy)이 단일 소스이며
 * 이 컴포넌트는 재계산하지 않고 내려받은 값만 표시한다.
 *
 * analyzable === false 보호 분기는 RightsResult 상위에서 처리하므로
 * 이 카드는 산정 가능한 경우에만 렌더된다.
 */
import { ScoreGauge } from "@/components/results";
import { Card } from "@/components/common";
import { getScoreLabel } from "./rights-result-styles";
import type { UnifiedResult } from "./rights-result-types";

/** 비율 표시: 미확인(null)은 "미확인"으로, 0%로 채우지 않는다(설계 §4.1). */
function fmtPct(v: number | null | undefined): string {
  return v === null || v === undefined || !Number.isFinite(v) ? "미확인" : `${v.toFixed(1)}%`;
}
/** 양수만 유효한 참고 비율. 0·음수·비수치는 "미확인"(시장 데이터 부재를 0%로 오인시키지 않음). */
function fmtPctPositive(v: number | null | undefined): string {
  return v !== null && v !== undefined && Number.isFinite(v) && v > 0 ? `${v.toFixed(1)}%` : "미확인";
}

interface Props {
  result: UnifiedResult;
}

export function RightsScoreCard({ result }: Props) {
  const safetyScore = result.riskAnalysis.safetyScore;
  const claims = result.riskScore?.claimRatios;

  // 전세가율 (D/V): 실제 계약 보증금/시세. claimRatios.jeonseRatio만 사용하며
  // 미입력(null)이면 시장 지표로 대체하지 않는다 — 입력 안 한 개인 계약 비율을 지어내지 않음(설계 §4.1).
  const contractJeonseRatio = claims?.jeonseRatio ?? null;
  // 시장 전세가율은 별도 참고치. 서버 산식값 우선, 없으면 화면 지표/시장 데이터. 양수만 유효로 표시.
  const marketJeonseRatio =
    claims?.marketJeonseRatio ?? result.marketData?.jeonseRatio ?? result.riskAnalysis.jeonseRatio ?? null;

  const indicators: Array<{ label: string; value: string }> = [
    { label: "근저당비율", value: fmtPct(result.riskAnalysis.mortgageRatio) },
    { label: "선순위/시세 (C/V)", value: fmtPct(claims?.ratioToMarket) },
    { label: "선순위/보증금 (C/D)", value: fmtPct(claims?.ratioToDeposit) },
    { label: "전세가율 (D/V)", value: fmtPct(contractJeonseRatio) },
    { label: "시장 전세가율", value: fmtPctPositive(marketJeonseRatio) },
  ];

  return (
    <Card className="p-6">
      <div className="flex flex-col items-center">
        <h3 className="text-sm font-semibold text-gray-900">권리분석 안전점수</h3>
        <p className="text-xs text-gray-400 mb-4">높을수록 안전 · 분석 시점 기준</p>
        <ScoreGauge
          score={safetyScore}
          size="lg"
          grade={getScoreLabel(safetyScore)}
          showLabel={false}
          colorPolicy="grade"
        />
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <span className="px-2 py-0.5 text-[9px] rounded-full bg-emerald-100 text-emerald-700">
            등기부등본 실제 데이터
          </span>
          {result.dataSource?.molitAvailable && (
            <span className="px-2 py-0.5 text-[9px] rounded-full bg-blue-100 text-blue-700">
              MOLIT 실거래
            </span>
          )}
          {claims?.claimBasis === "maxClaim" && (
            <span className="px-2 py-0.5 text-[9px] rounded-full bg-amber-100 text-amber-700">
              채권최고액 기준
            </span>
          )}
        </div>
      </div>

      {/* 선순위 비율 지표 — 분모를 라벨에 명시. 미확인은 "미확인"으로 표시(0% 아님) */}
      <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-gray-100 pt-4">
        {indicators.map((it) => (
          <div key={it.label} className="text-center">
            <p className="text-[11px] text-gray-400">{it.label}</p>
            <p className="text-base font-bold text-gray-900">{it.value}</p>
          </div>
        ))}
      </div>

      {/* 확인 범위 한정 안내 — 순위 미확정·미확인 권리 존재 시 */}
      {claims && (claims.priorityConfirmed === false || claims.uncertainClaims) && (
        <p className="mt-3 text-[11px] leading-relaxed text-amber-700">
          {claims.priorityConfirmed === false &&
            "확인된 현행 채권 기준이며 순위는 확정되지 않았습니다. "}
          {claims.uncertainClaims &&
            "금액·순위가 확인되지 않은 권리가 있어 실제 부담이 더 클 수 있습니다."}
        </p>
      )}
    </Card>
  );
}
