"use client";

/**
 * VScoreExplainPanel — V-Score 5축 설명 패널 (설계 §4.4 ②)
 *
 * 서버 VScoreResult.sources를 표시 전용으로 보여준다. 산식을 재구현하지 않는다.
 * - 축별 score·weight·weightedScore·contribution·details·dataAvailable 표시
 * - weight ≠ contribution 구분, "높을수록 안전" 명시
 * - 미확보 축(dataAvailable=false)은 "미확보/기본값 반영" 표시
 * - 전체 산정 순서(가중합 → 상호작용 보정 → 신뢰도 50점 방향 보정 → 반올림)는 펼침 설명
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

import { Card } from "@/components/common";
import type { VScoreResult } from "@/lib/patent-types";

interface Props {
  vScore: VScoreResult;
}

function pct(n: number): string {
  return `${Math.round(n * 1000) / 10}%`;
}

export function VScoreExplainPanel({ vScore }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const sources = vScore.sources ?? [];

  if (sources.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-base font-semibold text-gray-900">V-Score 세부 평가</h3>
        <p className="mt-2 text-sm text-gray-500">해당 분석에서 제공되지 않습니다.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">V-Score 세부 평가</h3>
        <span className="text-sm font-bold text-gray-900">
          {vScore.score}점 <span className="text-xs font-medium text-gray-400">({vScore.gradeLabel})</span>
        </span>
      </div>
      <p className="mb-4 text-xs text-gray-400">
        5개 축을 가중 합산한 종합 점수 · <span className="font-medium text-gray-500">높을수록 안전</span>
      </p>

      <div className="space-y-3">
        {sources.map((s) => (
          <div key={s.id} className="rounded-lg border border-gray-100 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{s.name}</span>
                {!s.dataAvailable && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    미확보/기본값 반영
                  </span>
                )}
              </div>
              <span className="text-sm font-bold text-gray-900">{s.score}점</span>
            </div>

            {/* 점수 막대 (높을수록 안전) */}
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-800"
                style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }}
              />
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-400">가중치</p>
                <p className="text-xs font-semibold text-gray-700">{pct(s.weight)}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">가중점수</p>
                <p className="text-xs font-semibold text-gray-700">{Math.round(s.weightedScore * 10) / 10}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400">위험 기여도</p>
                <p className="text-xs font-semibold text-gray-700">{Math.round(s.contribution * 10) / 10}%</p>
              </div>
            </div>

            {s.details && <p className="mt-2 text-xs leading-relaxed text-gray-500">{s.details}</p>}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
        ※ 가중치는 각 축의 비중, 위험 기여도는 그 축이 종합 점수를 깎은 비율입니다. 축 점수가 높을(안전할)수록 위험 기여도는 0%에 가깝습니다.
      </p>

      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
        aria-expanded={showDetail}
      >
        <Info size={13} aria-hidden />
        산정 방식 자세히
        {showDetail ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />}
      </button>

      {showDetail && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
          <p className="font-medium text-gray-700">산정 순서</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>5개 축 점수를 가중치로 합산</li>
            <li>축 간 상호작용 보정</li>
            <li>신뢰도(confidenceLevel {vScore.metadata?.confidenceLevel ?? "-"})에 따른 50점 방향 보정</li>
            <li>반올림하여 최종 점수 산출</li>
          </ol>
          <p className="mt-2 text-[11px] text-gray-400">
            confidenceLevel은 자료 확보 수준을 뜻하며 보증금 반환 확률이 아닙니다. 미확보 축은 제외 재정규화가 아니라 반환된 실제 값으로 반영됩니다.
          </p>
        </div>
      )}
    </Card>
  );
}
